#!/bin/bash

echo "=== COMPARING WORKING VS NON-WORKING JOBS ==="

echo -e "\\nWORKING TUESDAY JOB (db-tue):"
echo "============================"
az containerapp job show --resource-group rg-netballstats-audljf --name netballstats-db-tue-wr5i2l --query "properties.environmentId" -o tsv

echo -e "\\nNON-WORKING INTERNATIONAL TUESDAY JOB (db-intl-tue):"
echo "================================================="
az containerapp job show --resource-group rg-netballstats-audljf --name netballstats-db-intl-tue-wr5i2l --query "properties.environmentId" -o tsv

echo -e "\\nContainer Apps Environment:"
echo "=========================="
az containerapp env show --resource-group rg-netballstats-audljf --name netballstats-aca-env-wr5i2l --query "id" -o tsv