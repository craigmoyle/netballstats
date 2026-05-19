#!/bin/bash

# Get the necessary values from our environment
RESOURCE_GROUP="rg-netballstats-audljf"
LOCATION="australiaeast"
IMAGE="netballstatswr5i2lacr.azurecr.io/netballstats/api-nbs:azd-deploy-1779168096"
KEY_VAULT_NAME="netballstats-wr5i2l-kv"
POSTGRES_HOST="netballstats-wr5i2l-pg.postgres.database.azure.com"
POSTGRES_DATABASE="netballstats"
POSTGRES_ADMIN_USER="netballstatsadmin"

# Create a temporary container instance for debugging
echo "Creating temporary debug container..."

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name netballstatswr5i2lacr --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name netballstatswr5i2lacr --query passwords[0].value -o tsv)

az container create \
  --resource-group $RESOURCE_GROUP \
  --name debug-international-job \
  --image $IMAGE \
  --command-line "Rscript scripts/debug_international_job.R" \
  --environment-variables \
    NETBALL_STATS_REPO_ROOT="/app" \
    NETBALL_STATS_DB_BACKEND="postgres" \
    NETBALL_STATS_DB_HOST="$POSTGRES_HOST" \
    NETBALL_STATS_DB_PORT="5432" \
    NETBALL_STATS_DB_NAME="$POSTGRES_DATABASE" \
    NETBALL_STATS_DB_USER="$POSTGRES_ADMIN_USER" \
    NETBALL_STATS_DB_SSLMODE="verify-full" \
    NETBALL_STATS_DB_SSLROOTCERT="system" \
    NETBALL_STATS_DB_STATEMENT_TIMEOUT_MS="0" \
    NETBALL_STATS_API_DB_USERNAME="netballstats_api" \
  --secure-environment-variables \
    NETBALL_STATS_DB_PASSWORD="$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name postgres-admin-password --query value -o tsv)" \
    NETBALL_STATS_API_DB_PASSWORD="$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name postgres-api-password --query value -o tsv)" \
  --cpu 1 \
  --memory 2 \
  --restart-policy Never \
  --registry-login-server netballstatswr5i2lacr.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --no-wait

echo "Debug container created. Check logs with:"
echo "az container logs --resource-group $RESOURCE_GROUP --name debug-international-job"