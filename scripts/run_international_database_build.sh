#!/bin/bash

# Script to run the international database build with proper environment variables

echo "Setting up environment for international database build..."

# In a real scenario, you would retrieve these from Azure Key Vault:
# ADMIN_PASSWORD=$(az keyvault secret show --vault-name netballstats-wr5i2l-kv --name postgres-admin-password --query value -o tsv)

# For demonstration, we'll use placeholder values:
export NETBALL_STATS_DB_HOST="netballstats-wr5i2l-pg.postgres.database.azure.com"
export NETBALL_STATS_DB_PORT="5432"
export NETBALL_STATS_DB_NAME="netballstats"
export NETBALL_STATS_DB_USER="netballstatsadmin"
export NETBALL_STATS_DB_PASSWORD="YOUR_ADMIN_PASSWORD_HERE"
export NETBALL_STATS_API_DB_USERNAME="netballstats_api"
export NETBALL_STATS_API_DB_PASSWORD="YOUR_API_PASSWORD_HERE"
export NETBALL_STATS_DB_SSLMODE="verify-full"
export NETBALL_STATS_DB_SSLROOTCERT="system"
export NETBALL_STATS_DB_STATEMENT_TIMEOUT_MS="0"

echo "Running international database build script..."
Rscript scripts/build_international_database.R

echo "International database build completed."