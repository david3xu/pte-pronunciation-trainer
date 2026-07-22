#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCATION="${AZURE_LOCATION:-australiaeast}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-ccl-pronunciation-trainer-rg}"
SPEECH_ACCOUNT_NAME="${AZURE_SPEECH_ACCOUNT_NAME:-ccl-pronunciation-speech-david}"
SPEECH_SKU="${AZURE_SPEECH_SKU:-F0}"
VERCEL_ENVIRONMENT="${VERCEL_ENVIRONMENT:-production}"
DEPLOY_VERCEL="${DEPLOY_VERCEL:-false}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

add_or_replace_vercel_env() {
  local name="$1"
  local value="$2"

  vercel env rm "$name" "$VERCEL_ENVIRONMENT" --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$name" "$VERCEL_ENVIRONMENT" >/dev/null
}

require_command az
require_command vercel

ACCOUNT_JSON="$(az account show --query '{user:user.name,subscription:name,subscriptionId:id,tenantId:tenantId}' -o json)"
echo "Deploying Azure Speech infrastructure with account:"
echo "$ACCOUNT_JSON"

az deployment sub create \
  --name "ccl-pronunciation-speech" \
  --location "$LOCATION" \
  --template-file "$ROOT_DIR/infra/azure/main.bicep" \
  --parameters \
    location="$LOCATION" \
    resourceGroupName="$RESOURCE_GROUP" \
    speechAccountName="$SPEECH_ACCOUNT_NAME" \
    speechSku="$SPEECH_SKU" \
  --query 'properties.outputs' \
  -o json

SPEECH_KEY="$(az cognitiveservices account keys list \
  --name "$SPEECH_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query key1 \
  -o tsv)"

add_or_replace_vercel_env AZURE_SPEECH_KEY "$SPEECH_KEY"
add_or_replace_vercel_env AZURE_SPEECH_REGION "$LOCATION"
add_or_replace_vercel_env VITE_PREMIUM_TTS_ENABLED "true"

echo "Configured Vercel $VERCEL_ENVIRONMENT environment for Azure Speech account $SPEECH_ACCOUNT_NAME in $LOCATION."

if [[ "$DEPLOY_VERCEL" == "true" ]]; then
  if [[ "$VERCEL_ENVIRONMENT" != "production" ]]; then
    echo "DEPLOY_VERCEL=true only supports production deploys." >&2
    exit 1
  fi

  vercel --prod --yes
fi
