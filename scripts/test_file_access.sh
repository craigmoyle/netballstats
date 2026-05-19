#!/bin/bash

# Test to see what's in the container

RESOURCE_GROUP="rg-netballstats-audljf"
LOCATION="australiaeast"
IMAGE="netballstatswr5i2lacr.azurecr.io/netballstats/api-nbs:azd-deploy-1779174986"
ACR_USERNAME=$(az acr credential show --name netballstatswr5i2lacr --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name netballstatswr5i2lacr --query passwords[0].value -o tsv)

# Create a test container that just lists files
az container create \
  --resource-group $RESOURCE_GROUP \
  --name file-test-$(date +%s) \
  --image $IMAGE \
  --command-line "Rscript scripts/container_file_check.R" \
  --cpu 1 \
  --memory 1 \
  --os-type Linux \
  --restart-policy Never \
  --registry-login-server netballstatswr5i2lacr.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --no-wait

echo "File test container created. Check logs shortly."