#!/usr/bin/env bash
# Build and roll Stats web and API from this checkout (run on the VPS from main).
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=${NETBALL_STATS_ENV_FILE:-/opt/netball/stats.env}
COMPOSE=(docker compose --env-file "$ENV_FILE" -f compose.yaml)

"${COMPOSE[@]}" config -q
"${COMPOSE[@]}" build stats-api stats-web
"${COMPOSE[@]}" up -d --no-deps stats-api stats-web

install -m 0644 systemd/netball-stats-* /etc/systemd/system/
systemctl daemon-reload
echo "Stats deployed. Check: docker ps --filter name=netball-stats"
