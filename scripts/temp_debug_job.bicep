param location string = 'australiaeast'
param resourceGroupName string
param jobName string
param containerAppName string
param keyVaultName string
param postgresHost string
param postgresDatabase string
param postgresAdminUser string
param image string

resource job 'Microsoft.App/jobs@2025-02-02-preview' = {
  name: jobName
  location: location
  properties: {
    environmentId: containerAppName
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: 3600
      replicaRetryLimit: 0
      registries: []
      secrets: [
        {
          name: 'postgres-admin-password'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/postgres-admin-password'
        }
        {
          name: 'postgres-api-password'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/postgres-api-password'
        }
      ]
      containers: [
        {
          name: 'debug-container'
          image: image
          command: [
            'Rscript'
            'scripts/debug_international_job.R'
          ]
          env: [
            {
              name: 'NETBALL_STATS_REPO_ROOT'
              value: '/app'
            }
            {
              name: 'NETBALL_STATS_DB_BACKEND'
              value: 'postgres'
            }
            {
              name: 'NETBALL_STATS_DB_HOST'
              value: postgresHost
            }
            {
              name: 'NETBALL_STATS_DB_PORT'
              value: '5432'
            }
            {
              name: 'NETBALL_STATS_DB_NAME'
              value: postgresDatabase
            }
            {
              name: 'NETBALL_STATS_DB_USER'
              value: postgresAdminUser
            }
            {
              name: 'NETBALL_STATS_DB_PASSWORD'
              secretRef: 'postgres-admin-password'
            }
            {
              name: 'NETBALL_STATS_DB_SSLMODE'
              value: 'verify-full'
            }
            {
              name: 'NETBALL_STATS_DB_SSLROOTCERT'
              value: 'system'
            }
            {
              name: 'NETBALL_STATS_DB_STATEMENT_TIMEOUT_MS'
              value: '0'
            }
            {
              name: 'NETBALL_STATS_API_DB_USERNAME'
              value: 'netballstats_api'
            }
            {
              name: 'NETBALL_STATS_API_DB_PASSWORD'
              secretRef: 'postgres-api-password'
            }
          ]
          resources: {
            cpu: 1
            memory: '2Gi'
          }
        }
      ]
    }
  }
}