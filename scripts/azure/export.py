#!/usr/bin/env python3
""":"
exec "${PYTHON_BIN:-python3}" "$0" "$@"
"""

from __future__ import annotations

import argparse
import difflib
import ipaddress
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from typing import Any, Dict, List, Optional, Sequence, Tuple
import xml.etree.ElementTree as ET

DEFAULT_API_VERSION = "2024-05-01"
NETWORK_API_VERSION = "2023-11-01"
DEFAULT_RESOURCE_GROUP = "ccl-pronunciation-trainer-rg"
DEFAULT_LOCATION = "australiaeast"
OPERATIONS = (
    ("get-premium-tts", "GET", "original-get.xml"),
    ("post-premium-tts", "POST", "original-post.xml"),
)

COMMON_DEBUG_HEADERS: Tuple[Tuple[str, str], ...] = (
    ("X-Audio-Debug-Ip", "@(context.Request.IpAddress)"),
    ("X-Audio-Debug-Socket-Ip", '@(context.Request.Headers.GetValueOrDefault("X-Azure-SocketIP", ""))'),
    ("X-Audio-Debug-Client-Ip", '@(context.Request.Headers.GetValueOrDefault("X-Azure-ClientIP", ""))'),
    (
        "X-Audio-Debug-Xff",
        '@(context.Request.Headers.ContainsKey("X-Forwarded-For") ? string.Join(",", context.Request.Headers["X-Forwarded-For"]) : "")',
    ),
    ("X-Audio-Debug-Forwarded", '@(context.Request.Headers.GetValueOrDefault("Forwarded", ""))'),
    ("X-Audio-Debug-Fdid", '@(context.Request.Headers.GetValueOrDefault("X-Azure-FDID", ""))'),
    (
        "X-Audio-Debug-Key",
        '@(context.Variables.ContainsKey("guest-ip") ? Convert.ToString(context.Variables["guest-ip"]) : context.Request.IpAddress)',
    ),
)

ERROR_DEBUG_HEADERS: Tuple[Tuple[str, str], ...] = COMMON_DEBUG_HEADERS + (
    ("X-Audio-Debug-Rule", '@(context.LastError == null ? "" : (context.LastError.PolicyId ?? context.LastError.Source ?? ""))'),
    ("X-Audio-Debug-Reason", '@(context.LastError == null ? "" : (context.LastError.Reason ?? context.LastError.Message ?? ""))'),
)


def fail(msg: str) -> "NoReturn":  # type: ignore[name-defined]
    sys.stderr.write(f"ERROR: {msg}\n")
    raise SystemExit(1)


def info(msg: str) -> None:
    sys.stdout.write(f"[export] {msg}\n")


def run_az(cmd: Sequence[str]) -> str:
    proc = subprocess.run(list(cmd), capture_output=True, text=True, timeout=60, check=False)
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or f"exit {proc.returncode}").strip()
        fail(f"Azure CLI command failed: {detail}")
    return proc.stdout


def az_rest_get(az_bin: str, sub_id: str, url: str) -> str:
    return run_az([az_bin, "rest", "--method", "GET", "--url", url, "--subscription", sub_id, "--only-show-errors"])


def resolve_apim_target(args: argparse.Namespace, env: Dict[str, str], az_bin: str) -> Tuple[str, str, str, str]:
    api_id = (args.api_id or env.get("API_ID") or env.get("APIM_API_ID") or "trainer-api").strip()
    if "/apis/" in api_id:
        api_id = api_id.split("/apis/", 1)[1]
    api_id = api_id.strip("/").split("/", 1)[0]

    apim_id_raw = (args.apim_id or env.get("APIM_ID") or "").strip()
    sub_id = (args.subscription or env.get("AZURE_SUBSCRIPTION_ID") or "").strip()
    rg = (args.resource_group or env.get("AZURE_RESOURCE_GROUP") or env.get("AZURE_RESOURCE_GROUP_NAME") or DEFAULT_RESOURCE_GROUP).strip()
    service = (args.service or env.get("APIM_SERVICE_NAME") or "").strip()

    if apim_id_raw.startswith("/subscriptions/"):
        m = re.match(
            r"^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/Microsoft\.ApiManagement/service/([^/]+)",
            apim_id_raw,
            flags=re.IGNORECASE,
        )
        if not m:
            fail(f"Invalid APIM_ID resource ID: {apim_id_raw}")
        sub_id = sub_id or m.group(1)
        rg = m.group(2)
        service = m.group(3)
    elif apim_id_raw and not service:
        service = apim_id_raw

    if not sub_id:
        proc = subprocess.run(
            [az_bin, "account", "show", "--only-show-errors", "--output", "tsv", "--query", "id"],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
        if proc.returncode == 0:
            sub_id = proc.stdout.strip()

    if not sub_id or not rg or not service:
        fail("APIM target unresolved. Set APIM_ID (or AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, APIM_SERVICE_NAME).")

    return sub_id, rg, service, api_id


def clean_policy_expr(xml_text: str) -> str:
    return re.sub(
        r"@(\{[^{}]*\}|\([^()]*\))",
        lambda m: m.group(0).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"),
        xml_text,
    )


def parse_policy_root(xml_text: str) -> ET.Element:
    cleaned = xml_text.lstrip("\ufeff").strip()
    try:
        root = ET.fromstring(cleaned)
    except ET.ParseError:
        root = ET.fromstring(clean_policy_expr(cleaned))
    if root.tag != "policies":
        fail(f"Root tag must be <policies>, got <{root.tag}>")
    for sec in ("inbound", "backend", "outbound", "on-error"):
        el = root.find(sec)
        if el is None or el.find("base") is None:
            fail(f"Missing <{sec}> or <base /> in exported policy XML")
    return root


def normalize_tree(root: ET.Element) -> Any:
    def _norm(node: ET.Element) -> Any:
        attrs = sorted((k.strip(), " ".join(v.split())) for k, v in node.attrib.items())
        children = [_norm(c) for c in list(node) if isinstance(c.tag, str)]
        return (node.tag.strip(), attrs, " ".join((node.text or "").split()), children)

    return _norm(root)


def unwrap_policy_response(raw_resp: str, op_id: str) -> str:
    resp = raw_resp.lstrip("\ufeff").strip()
    if resp.startswith("<"):
        xml_str = resp
    else:
        try:
            doc = json.loads(resp)
        except Exception as exc:
            fail(f"Cannot parse policy response on {op_id}: {exc}")
        xml_str = doc if isinstance(doc, str) else ((doc.get("properties") or {}).get("value") or doc.get("value") or "")
    if not isinstance(xml_str, str) or not xml_str.strip():
        fail(f"Empty policy returned for {op_id}.")
    parse_policy_root(xml_str)
    return xml_str.lstrip("\ufeff").strip() + "\n"


def _set_debug_headers(section: ET.Element, headers: Sequence[Tuple[str, str]]) -> None:
    wanted_names = {name.lower() for name, _ in headers}
    for child in list(section):
        if child.tag == "set-header" and (child.get("name") or "").strip().lower() in wanted_names:
            section.remove(child)
    for name, expr in headers:
        sh = ET.SubElement(section, "set-header", {"name": name, "exists-action": "override"})
        val = ET.SubElement(sh, "value")
        val.text = expr


def build_instrumented_policy(get_xml: str) -> str:
    root = parse_policy_root(get_xml)
    inbound = root.find("inbound")
    outbound = root.find("outbound")
    on_error = root.find("on-error")
    assert inbound is not None and outbound is not None and on_error is not None

    for rl in inbound.iter("rate-limit-by-key"):
        rl.set("id", "audio-rate")
    for qt in inbound.iter("quota-by-key"):
        qt.set("id", "audio-quota")

    _set_debug_headers(outbound, COMMON_DEBUG_HEADERS)
    _set_debug_headers(on_error, ERROR_DEBUG_HEADERS)

    ET.indent(root, space="  ")
    return ET.tostring(root, encoding="unicode").strip() + "\n"


def fetch_front_door_ipv4_ranges(az_bin: str, sub_id: str, location: str) -> List[Tuple[str, str]]:
    loc = re.sub(r"\s+", "", (location or DEFAULT_LOCATION)).lower()
    url = (
        f"https://management.azure.com/subscriptions/{sub_id}"
        f"/providers/Microsoft.Network/locations/{loc}/serviceTags?api-version={NETWORK_API_VERSION}"
    )
    proc = subprocess.run(
        [az_bin, "rest", "--method", "GET", "--url", url, "--subscription", sub_id, "--only-show-errors"],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if proc.returncode == 0 and proc.stdout.strip():
        raw_json = proc.stdout
    else:
        raw_json = run_az(
            [az_bin, "network", "list-service-tags", "--location", loc, "--subscription", sub_id, "--only-show-errors", "--output", "json"]
        )

    try:
        doc = json.loads(raw_json)
    except Exception as exc:
        fail(f"Cannot parse service tags response: {exc}")

    prefixes: List[str] = []
    if isinstance(doc, dict):
        if (doc.get("name") or doc.get("id") or "").lower() == "azurefrontdoor.backend":
            prefixes = list((doc.get("properties") or {}).get("addressPrefixes") or doc.get("addressPrefixes") or [])
        else:
            for item in doc.get("values") or doc.get("value") or []:
                if isinstance(item, dict) and (item.get("name") or item.get("id") or "").lower() == "azurefrontdoor.backend":
                    prefixes = list((item.get("properties") or {}).get("addressPrefixes") or item.get("addressPrefixes") or [])
                    break

    if not prefixes:
        fail("Service tag 'AzureFrontDoor.Backend' not found or contains no addressPrefixes.")

    ranges: List[Tuple[str, str]] = []
    seen = set()
    for pfx in prefixes:
        net = ipaddress.ip_network(str(pfx).strip(), strict=False)
        if isinstance(net, ipaddress.IPv4Network):
            pair = (str(net.network_address), str(net.broadcast_address))
            if pair not in seen:
                seen.add(pair)
                ranges.append(pair)

    if not ranges:
        fail("Service tag 'AzureFrontDoor.Backend' contained no IPv4 ranges.")
    return ranges


def build_front_door_ranges_xml(ranges: Sequence[Tuple[str, str]]) -> str:
    lines = ['<ip-filter action="allow" id="audio-source">']
    for start_ip, end_ip in ranges:
        lines.append(f'  <address-range from="{start_ip}" to="{end_ip}" />')
    lines.append("</ip-filter>")
    return "\n".join(lines) + "\n"


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Export APIM audio policies and generate diagnostic/Front Door XML files.")
    p.add_argument("out_dir", nargs="?", default=None, metavar="OUT_DIR", help="Output folder for generated XML files")
    p.add_argument("-o", "-d", "--out", "--out-dir", "--output", dest="out_flag", default=None, help="Output folder")
    p.add_argument("--apim-id", default=None)
    p.add_argument("--api-id", "--api", dest="api_id", default=None)
    p.add_argument("-s", "--subscription", default=None)
    p.add_argument("-g", "--resource-group", default=None)
    p.add_argument("--service", "--apim-name", dest="service", default=None)
    p.add_argument("-l", "--location", default=None)
    return p


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)
    env = dict(os.environ)

    out_raw = args.out_dir or args.out_flag or env.get("OUT_DIR")
    if not out_raw:
        fail("Usage: python3 scripts/azure/export.py OUT_DIR")
    out_dir = Path(out_raw)

    az_bin = env.get("AZ_BIN", "az")
    api_version = env.get("APIM_API_VERSION", DEFAULT_API_VERSION)
    sub_id, rg, service, api_id = resolve_apim_target(args, env, az_bin)

    base_url = (
        f"https://management.azure.com/subscriptions/{sub_id}"
        f"/resourceGroups/{rg}/providers/Microsoft.ApiManagement/service/{service}"
    )

    # 1. Verify gateway deploymentStage=staging and target API/operations before writing files
    svc_raw = az_rest_get(az_bin, sub_id, f"{base_url}?api-version={api_version}")
    try:
        svc = json.loads(svc_raw)
    except Exception as exc:
        fail(f"Invalid APIM service JSON for '{service}': {exc}")

    tags = svc.get("tags") if isinstance(svc, dict) else None
    stage = tags.get("deploymentStage") if isinstance(tags, dict) else None
    if stage != "staging":
        fail(f"Refusing export: gateway '{service}' requires tag deploymentStage=staging (found '{stage}').")
    state = (svc.get("properties") or {}).get("provisioningState")
    if state and state != "Succeeded":
        fail(f"Gateway '{service}' provisioningState is '{state}', expected 'Succeeded'.")

    api_raw = az_rest_get(az_bin, sub_id, f"{base_url}/apis/{api_id}?api-version={api_version}")
    api_doc = json.loads(api_raw or "{}")
    if ((api_doc.get("properties") or {}).get("path") or "api").strip("/") != "api":
        fail(f"Target API '{api_id}' path is not 'api'.")

    exported: Dict[str, str] = {}
    for op_id, expected_method, filename in OPERATIONS:
        op_raw = az_rest_get(az_bin, sub_id, f"{base_url}/apis/{api_id}/operations/{op_id}?api-version={api_version}")
        op_props = (json.loads(op_raw or "{}").get("properties") or {})
        if (op_props.get("method") or "").upper() != expected_method or op_props.get("urlTemplate") != "/premium-tts":
            fail(f"Operation '{op_id}' does not match {expected_method} /premium-tts.")

        pol_url = f"{base_url}/apis/{api_id}/operations/{op_id}/policies/policy?api-version={api_version}&format=rawxml"
        pol_raw = az_rest_get(az_bin, sub_id, pol_url)
        exported[filename] = unwrap_policy_response(pol_raw, op_id)

    # 2. Fetch AzureFrontDoor.Backend IPv4 ranges
    location = args.location or env.get("AZURE_LOCATION") or str(svc.get("location") or DEFAULT_LOCATION)
    fd_ranges = fetch_front_door_ipv4_ranges(az_bin, sub_id, location)

    # 3. Write original-get.xml and original-post.xml intact
    out_dir.mkdir(parents=True, exist_ok=True)
    get_xml = exported["original-get.xml"]
    post_xml = exported["original-post.xml"]
    (out_dir / "original-get.xml").write_text(get_xml, encoding="utf-8")
    (out_dir / "original-post.xml").write_text(post_xml, encoding="utf-8")
    info("Wrote original-get.xml and original-post.xml.")

    # 4. Report any difference between GET and POST policies before creating shared starting copy
    if get_xml.strip() != post_xml.strip() or normalize_tree(parse_policy_root(get_xml)) != normalize_tree(parse_policy_root(post_xml)):
        info("Policies for get-premium-tts and post-premium-tts differ:")
        diff_lines = list(
            difflib.unified_diff(
                get_xml.splitlines(keepends=True),
                post_xml.splitlines(keepends=True),
                fromfile="original-get.xml",
                tofile="original-post.xml",
            )
        )
        sys.stdout.writelines(diff_lines)
    else:
        info("original-get.xml and original-post.xml are identical.")

    # 5. Generate policy.xml and exact copy policy-before.xml from GET export
    policy_xml = build_instrumented_policy(get_xml)
    policy_path = out_dir / "policy.xml"
    policy_before_path = out_dir / "policy-before.xml"
    policy_path.write_text(policy_xml, encoding="utf-8")
    shutil.copyfile(policy_path, policy_before_path)
    info("Wrote policy.xml and policy-before.xml.")

    # 6. Write front-door-ranges.xml
    fd_xml = build_front_door_ranges_xml(fd_ranges)
    (out_dir / "front-door-ranges.xml").write_text(fd_xml, encoding="utf-8")
    info(f"Wrote front-door-ranges.xml ({len(fd_ranges)} IPv4 ranges).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
