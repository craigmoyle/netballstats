# Copilot Instructions for `netballstats`

## Product intent

- Treat the site as an editorial Super Netball archive, not a generic dashboard.
- Optimize for trustworthy evidence, scanability, and strong information hierarchy.
- Preserve the warm amber and teal direction, both dark and light themes, and the existing `Fraunces` plus `Teko` typography system.
- Maintain WCAG AA contrast, keyboard usability, and reduced-motion support.

## Architecture and runtime

- Frontend: static HTML plus vanilla JS deployed to Azure Static Web Apps.
- API: read-only R Plumber service on Azure Container Apps.
- Database: Azure PostgreSQL Flexible Server.
- Data refresh: scheduled Container Apps jobs rebuild the database from Champion Data via `superNetballR`.
- Azure plus PostgreSQL is the primary operating model. Keep docs and changes aligned with that path.

## Coding guidance

- Reuse existing helpers before adding new ones.
- On the frontend, prefer shared utilities in `assets/config.js` and the existing page modules in `assets/`.
- Use `window.NetballStatsUI.showStatusBanner` / `cycleStatusBanner` for loading and success states.
- Use `window.NetballStatsUI.syncResponsiveTable` when changing dynamic or stacked table layouts.
- Do not duplicate reveal-observer logic; `theme.js` owns that behaviour.
- On the backend, keep explicit validation, parameterized SQL, hard result caps, and conservative error handling.
- Avoid broad catches, silent fallbacks, and high-cardinality telemetry.

## Telemetry rules

- Browser telemetry is intentionally proxied through `/api/telemetry`.
- Do not re-enable automatic fetch/XHR tracking.
- Do not log raw Ask the Stats question text.
- Preserve sanitized page naming and URL handling, including the `/player/:id/` path normalization.
- Use `scripts/usage-telemetry.kql` as the source of truth for starter reporting queries.

## Deployment and validation

- Build with `npm run build`.
- There is no repo `npm test` script today.
- Validate JS and R syntax with:
  - `node --check assets/*.js`
  - `Rscript -e "parse(file='api/R/helpers.R'); parse(file='api/plumber.R')"`
- Run `Rscript scripts/test_api_regression.R` when API behaviour changes.
- For frontend-only deploys, prefer `azd deploy web`.
- Keep `azure.yaml` postdeploy behaviour intact so refresh jobs stay on the same image as the API.
- Keep the Azure API image compatible with non-root `renv` usage and `linux/amd64` remote builds.
- After a successful repository change, commit it, push it, and deploy the relevant Azure service once validation passes.

## Operational notes

- The registry cleanup workflow at `.github/workflows/cleanup-registry.yml` uses federated GitHub OIDC auth.
- It depends on `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, and `AZURE_REGISTRY_NAME`.
- The cleanup principal must have both `AcrPull` and `AcrDelete`.

## Documentation bias

- When updating docs, keep Azure-first guidance clear and explicit.
- When explaining the product, emphasize trusted historical stats, comparisons, and player/team context.

## Known pitfalls

- Keep `scripts/usage-telemetry.kql` query blocks independent; portal users often run one section at a time.
- Do not bypass the `/meta` plus `/api/telemetry` flow or re-enable browser fetch/XHR auto-tracking.
- Do not duplicate reveal animation observers; `theme.js` is the owner.
- Guard page-specific DOM lookups, especially on the query page, rather than assuming elements always exist.
- Remember that `azure.yaml` postdeploy syncs DB refresh jobs to the API image; static-site deploys alone do not.
- Preserve the non-root `renv` runtime setup in Azure images.
- For ACR cleanup, `AcrDelete` alone is insufficient; the principal also needs `AcrPull`.
