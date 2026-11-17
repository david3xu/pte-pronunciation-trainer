#!/usr/bin/env bash
# Apply an APIM XML policy to the staging audio gateway (get-premium-tts / post-premium-tts).
# Usage: bash scripts/azure/apply.sh FILE [operation]

set -euo pipefail

AZ_BIN="${AZ_BIN:-az}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
API_VERSION="${APIM_API_VERSION:-2024-05-01}"
API_ID="${API_ID:-${APIM_API_ID:-trainer-api}}"
API_ID="${API_ID##*/apis/}"
API_ID="${API_ID%%/*}"

APIM_ID_RAW="${APIM_ID:-}"
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-${AZURE_RESOURCE_GROUP_NAME:-ccl-pronunciation-trainer-rg}}"
APIM_SERVICE="${APIM_SERVICE_NAME:-}"

POLICY_FILE=""
OP_ARG=""

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
info() { printf '[apply] %s\n' "$*"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--file|--policy) POLICY_FILE="${2:-}"; shift 2 ;;
    -o|--operation|--method) OP_ARG="${2:-}"; shift 2 ;;
    --get|--get-only) OP_ARG="get"; shift ;;
    --post|--post-only) OP_ARG="post"; shift ;;
    --apim-id) APIM_ID_RAW="${2:-}"; shift 2 ;;
    --service|--apim-name) APIM_SERVICE="${2:-}"; shift 2 ;;
    --api|--api-id) API_ID="${2:-}"; shift 2 ;;
    -s|--subscription) SUBSCRIPTION_ID="${2:-}"; shift 2 ;;
    -g|--resource-group) RESOURCE_GROUP="${2:-}"; shift 2 ;;
    -h|--help)
      printf 'Usage: bash %s FILE [get|post|both]\n' "$0"
      exit 0
      ;;
    -*) fail "Unknown option: $1" ;;
    *)
      if [[ -z "$POLICY_FILE" ]]; then POLICY_FILE="$1"
      elif [[ -z "$OP_ARG" ]]; then OP_ARG="$1"
      else fail "Unexpected argument: $1"
      fi
      shift
      ;;
  esac
done

[[ -n "$POLICY_FILE" ]] || fail "Usage: bash apply.sh FILE [operation]"
[[ -f "$POLICY_FILE" && -r "$POLICY_FILE" && -s "$POLICY_FILE" ]] || fail "Policy XML file is missing, unreadable, or empty: $POLICY_FILE"

OPS=()
for tok in ${OP_ARG//,/ }; do
  case "$tok" in
    get|GET|get-premium-tts) OPS+=("get-premium-tts:GET") ;;
    post|POST|post-premium-tts) OPS+=("post-premium-tts:POST") ;;
    both|BOTH|all|ALL) OPS=("get-premium-tts:GET" "post-premium-tts:POST") ;;
    *) fail "Unsupported operation '$tok' (expected get, post, or both)." ;;
  esac
done
[[ ${#OPS[@]} -gt 0 ]] || OPS=("get-premium-tts:GET" "post-premium-tts:POST")

if [[ "$APIM_ID_RAW" == /subscriptions/* ]]; then
  if [[ "$APIM_ID_RAW" =~ ^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/Microsoft\.ApiManagement/service/([^/]+) ]]; then
    SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-${BASH_REMATCH[1]}}"
    RESOURCE_GROUP="${BASH_REMATCH[2]}"
    APIM_SERVICE="${BASH_REMATCH[3]}"
  else
    fail "Invalid APIM_ID resource ID: $APIM_ID_RAW"
  fi
elif [[ -n "$APIM_ID_RAW" && -z "$APIM_SERVICE" ]]; then
  APIM_SERVICE="$APIM_ID_RAW"
fi

[[ -n "$SUBSCRIPTION_ID" ]] || SUBSCRIPTION_ID="$("$AZ_BIN" account show --only-show-errors --output tsv --query id 2>/dev/null || true)"
[[ -n "$SUBSCRIPTION_ID" && -n "$RESOURCE_GROUP" && -n "$APIM_SERVICE" ]] || fail "APIM target unresolved. Set APIM_ID (or AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, APIM_SERVICE_NAME)."

BASE_URL="https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.ApiManagement/service/${APIM_SERVICE}"

az_rest() {
  local method="$1" url="$2" body="${3:-}"
  shift 3 || true
  local cmd=("$AZ_BIN" rest --method "$method" --url "$url" --subscription "$SUBSCRIPTION_ID" --only-show-errors)
  [[ $# -gt 0 ]] && cmd+=(--headers "$@")
  [[ -n "$body" ]] && cmd+=(--body "@${body}")
  "${cmd[@]}"
}

# 1. Verify XML locally before touching Azure
"$PYTHON_BIN" - "$POLICY_FILE" <<'PY' || fail "Invalid policy XML: $POLICY_FILE"
import re, sys, xml.etree.ElementTree as ET
raw = open(sys.argv[1], "r", encoding="utf-8-sig").read()
def clean_expr(s: str) -> str:
    return re.sub(r"@(\{[^{}]*\}|\([^()]*\))", lambda m: m.group(0).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), s)
try:
    root = ET.fromstring(raw)
except ET.ParseError:
    root = ET.fromstring(clean_expr(raw))
if root.tag != "policies":
    raise SystemExit(f"Root tag must be <policies>, got <{root.tag}>")
for sec in ("inbound", "backend", "outbound", "on-error"):
    el = root.find(sec)
    if el is None or el.find("base") is None:
        raise SystemExit(f"Missing <{sec}> or <base /> in {sys.argv[1]}")
PY

# 2. Verify gateway tag deploymentStage=staging, API, and operations
SERVICE_JSON="$(az_rest GET "${BASE_URL}?api-version=${API_VERSION}")" || fail "Cannot read APIM service '$APIM_SERVICE'."
API_JSON="$(az_rest GET "${BASE_URL}/apis/${API_ID}?api-version=${API_VERSION}")" || fail "Cannot read API '$API_ID'."

"$PYTHON_BIN" - "$APIM_SERVICE" "$SERVICE_JSON" "$API_JSON" <<'PY' || fail "Gateway target verification failed."
import json, sys
svc_name, svc_raw, api_raw = sys.argv[1], sys.argv[2], sys.argv[3]
svc = json.loads(svc_raw)
tags = svc.get("tags") if isinstance(svc, dict) else None
stage = tags.get("deploymentStage") if isinstance(tags, dict) else None
if stage != "staging":
    sys.stderr.write(f"Refusing write: gateway '{svc_name}' requires tag deploymentStage=staging (found '{stage}').\n")
    sys.exit(1)
state = (svc.get("properties") or {}).get("provisioningState")
if state and state != "Succeeded":
    sys.stderr.write(f"Gateway '{svc_name}' provisioningState is '{state}', expected 'Succeeded'.\n")
    sys.exit(1)
api = json.loads(api_raw)
if ((api.get("properties") or {}).get("path") or "api").strip("/") != "api":
    sys.stderr.write("Target API path is not 'api'.\n")
    sys.exit(1)
PY

for entry in "${OPS[@]}"; do
  op_id="${entry%%:*}"
  op_method="${entry##*:}"
  op_json="$(az_rest GET "${BASE_URL}/apis/${API_ID}/operations/${op_id}?api-version=${API_VERSION}")" || fail "Operation '$op_id' not found."
  "$PYTHON_BIN" - "$op_id" "$op_method" "$op_json" <<'PY' || fail "Operation '$op_id' verification failed."
import json, sys
op_id, expected_method, raw = sys.argv[1], sys.argv[2], sys.argv[3]
props = (json.loads(raw) or {}).get("properties") or {}
if (props.get("method") or "").upper() != expected_method or props.get("urlTemplate") != "/premium-tts":
    sys.stderr.write(f"Operation '{op_id}' does not match {expected_method} /premium-tts.\n")
    sys.exit(1)
PY
done

# 3. Apply policy with If-Match=* and compare read-back (raw XML or JSON-wrapped XML)
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT
"$PYTHON_BIN" -c 'import json, sys; xml = open(sys.argv[1], encoding="utf-8-sig").read(); open(sys.argv[2], "w", encoding="utf-8").write(json.dumps({"properties": {"format": "rawxml", "value": xml}}))' "$POLICY_FILE" "$BODY_FILE"

for entry in "${OPS[@]}"; do
  op_id="${entry%%:*}"
  pol_url="${BASE_URL}/apis/${API_ID}/operations/${op_id}/policies/policy?api-version=${API_VERSION}"
  info "Applying policy to ${op_id}..."
  az_rest PUT "$pol_url" "$BODY_FILE" "Content-Type=application/json" "If-Match=*" >/dev/null || fail "PUT failed on ${op_id}."
  readback="$(az_rest GET "${pol_url}&format=rawxml")" || fail "Read-back GET failed on ${op_id}."

  "$PYTHON_BIN" - "$POLICY_FILE" "$op_id" "$readback" <<'PY' || fail "Read-back XML mismatch on ${op_id}."
import json, re, sys, xml.etree.ElementTree as ET
expected_raw = open(sys.argv[1], encoding="utf-8-sig").read()
op_id, resp = sys.argv[2], sys.argv[3].lstrip("\ufeff").strip()
if resp.startswith("<"):
    actual_raw = resp
else:
    doc = json.loads(resp)
    actual_raw = doc if isinstance(doc, str) else ((doc.get("properties") or {}).get("value") or doc.get("value") or "")
if not isinstance(actual_raw, str) or not actual_raw.strip():
    sys.stderr.write(f"Empty read-back policy on {op_id}.\n")
    sys.exit(1)
def clean_expr(s: str) -> str:
    return re.sub(r"@(\{[^{}]*\}|\([^()]*\))", lambda m: m.group(0).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), s)
def parse_tree(text: str):
    cleaned = text.lstrip("\ufeff").strip()
    try:
        root = ET.fromstring(cleaned)
    except ET.ParseError:
        root = ET.fromstring(clean_expr(cleaned))
    def norm(node):
        attrs = sorted((k.strip(), " ".join(v.split())) for k, v in node.attrib.items())
        children = [norm(c) for c in list(node) if isinstance(c.tag, str)]
        return (node.tag.strip(), attrs, " ".join((node.text or "").split()), children)
    return norm(root)
if parse_tree(expected_raw) != parse_tree(actual_raw):
    sys.stderr.write(f"Read-back policy mismatch on {op_id}.\n")
    sys.exit(1)
PY
  info "Confirmed ${op_id} policy matches."
done
