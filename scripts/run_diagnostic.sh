#!/bin/bash

echo "=== RUNNING COMPREHENSIVE DIAGNOSTIC TEST ==="

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name netballstatswr5i2lacr --query username -o tsv 2>/dev/null)
ACR_PASSWORD=$(az acr credential show --name netballstatswr5i2lacr --query passwords[0].value -o tsv 2>/dev/null)

# Get database connection info from environment
RESOURCE_GROUP="rg-netballstats-audljf"
LOCATION="australiaeast"
IMAGE="netballstatswr5i2lacr.azurecr.io/netballstats/api-nbs:azd-deploy-1779172726"
KEY_VAULT_NAME="netballstats-wr5i2l-kv"
POSTGRES_HOST="netballstats-wr5i2l-pg.postgres.database.azure.com"
POSTGRES_DATABASE="netballstats"
POSTGRES_ADMIN_USER="netballstatsadmin"

echo "Creating diagnostic container instance..."

# Create container instance with comprehensive diagnostic test
az container create \
  --resource-group $RESOURCE_GROUP \
  --name diagnostic-test-$(date +%s) \
  --image $IMAGE \
  --command-line "Rscript scripts/comprehensive_diagnostic_test.R" \
  --environment-variables \
    NETBALL_STATS_REPO_ROOT="/app" \
    NETBALL_STATS_DB_BACKEND="postgres" \
    NETBALL_STATS_DB_HOST="$POSTGRES_HOST" \
    NETBALL_STATS_DB_PORT="5432" \
    NETBALL_STATS_DB_NAME="$POSTGRES_DATABASE" \
    NETBALL_STATS_DB_USER="$POSTGRES_ADMIN_USER" \
    NETBALL_STATS_DB_SSLMODE="verify-full" \
    NETBALL_STATS_DB_SSLROOTCERT="system" \
    NETBALL_STATS_DB_STATEMENT_TIMEOUT_MS="30000" \
  --secure-environment-variables \
    NETBALL_STATS_DB_PASSWORD="$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name postgres-admin-password --query value -o tsv 2>/dev/null)" \
  --cpu 1 \
  --memory 2 \
  --restart-policy Never \
  --registry-login-server netballstatswr5i2lacr.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --no-wait

echo "Diagnostic container created. Check logs with:"
echo "az container logs --resource-group $RESOURCE_GROUP --name diagnostic-test-*"