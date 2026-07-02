#!/usr/bin/env sh
set -eu

RG="${AZURE_RESOURCE_GROUP:-rg-netballstats-audljf}"
WORKSPACE_NAME="${NETBALL_STATS_LOG_WORKSPACE:-netballstats-logs-wr5i2l}"
REPORT_EMAIL="${NETBALL_STATS_WEEKLY_REPORT_EMAIL:-cmoyle@gmail.com}"
DEPLOYMENT_NAME="${NETBALL_STATS_WEEKLY_REPORT_DEPLOYMENT:-netballstats-weekly-usage-report}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_FILE="${REPO_ROOT}/infra/weekly-usage-report.json"
QUERY_FILE="${SCRIPT_DIR}/weekly-usage-report.kql"
PARAMS_FILE="$(mktemp "${TMPDIR:-/tmp}/weekly-usage-report-params.XXXXXX.json")"

cleanup() {
  rm -f "$PARAMS_FILE"
}
trap cleanup EXIT

if [ ! -f "$QUERY_FILE" ]; then
  echo "Missing query file: $QUERY_FILE" >&2
  exit 1
fi

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
MONITOR_READER_ROLE="43d0d8ad-25c7-4714-9337-8ba259a9fe05"

export REPORT_EMAIL WORKSPACE_NAME QUERY_FILE
python3 - <<'PY' > "$PARAMS_FILE"
import json
import os
from pathlib import Path

query_lines = []
for line in Path(os.environ["QUERY_FILE"]).read_text(encoding="utf-8").splitlines():
    stripped = line.strip()
    if not stripped or stripped.startswith("//"):
        continue
    query_lines.append(stripped)

payload = {
    "reportEmail": {"value": os.environ["REPORT_EMAIL"]},
    "logAnalyticsWorkspaceName": {"value": os.environ["WORKSPACE_NAME"]},
    "weeklyUsageQuery": {"value": " ".join(query_lines)},
}
print(json.dumps(payload))
PY

echo "Deploying weekly usage report resources to ${RG}..."
az deployment group create \
  -g "$RG" \
  -n "$DEPLOYMENT_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --parameters "@${PARAMS_FILE}" \
  --only-show-errors \
  >/dev/null

LOGIC_APP_NAME="netballstats-weekly-usage-report"
PRINCIPAL_ID="$(az logic workflow show -g "$RG" -n "$LOGIC_APP_NAME" --query identity.principalId -o tsv)"
WORKSPACE_ID="$(az monitor log-analytics workspace show -g "$RG" -n "$WORKSPACE_NAME" --query id -o tsv)"

if ! az role assignment list \
  --assignee "$PRINCIPAL_ID" \
  --scope "$WORKSPACE_ID" \
  --role "$MONITOR_READER_ROLE" \
  --query '[0].id' -o tsv | grep -q .; then
  az role assignment create \
    --assignee-object-id "$PRINCIPAL_ID" \
    --assignee-principal-type ServicePrincipal \
    --role "$MONITOR_READER_ROLE" \
    --scope "$WORKSPACE_ID" \
    --only-show-errors \
    >/dev/null
  echo "Granted Monitoring Reader on ${WORKSPACE_NAME} to ${LOGIC_APP_NAME}."
else
  echo "Monitoring Reader assignment already exists for ${LOGIC_APP_NAME}."
fi

echo
echo "Weekly usage report configured."
echo "  Logic App: ${LOGIC_APP_NAME}"
echo "  Email: ${REPORT_EMAIL}"
echo "  Schedule: Mondays at 08:00 AUS Eastern Standard Time"
echo "  Data window: last 7 days of public browser telemetry"
echo
echo "One-time setup required in Azure Portal:"
echo "  1. Open Logic App > ${LOGIC_APP_NAME}"
echo "  2. Open API connections > office365-weekly-report"
echo "  3. Sign in with the mailbox that should send the report"
echo "  4. Save, then run the Logic App once to verify delivery"
echo
echo "Portal link:"
echo "  https://portal.azure.com/#resource/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/Microsoft.Logic/workflows/${LOGIC_APP_NAME}/overview"
