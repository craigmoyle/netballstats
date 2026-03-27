# AGENTS.md

This file captures the repo-specific context, decisions, and operating guidance that future agents should keep in mind when working in `netballstats`.

## Product and UX intent

- This product is for netball fans, writers, analysts, and curious supporters exploring Super Netball history.
- The experience should feel editorial, confident, and distinctive: more like a sports almanac or data-journalism feature than a SaaS dashboard.
- Keep the warm amber and teal palette unless there is a strong reason to change it.
- Support both dark and light themes.
- Preserve the typography system: `Fraunces` for body/editorial voice and `Teko` for display emphasis.
- Accessibility is part of the product quality bar: WCAG AA contrast, strong keyboard support, and respectful reduced-motion behaviour are non-negotiable.

## System shape

- Frontend: static HTML and vanilla JS, built into `dist/` and deployed to Azure Static Web Apps.
- API: read-only R Plumber service in `api/plumber.R`, deployed to Azure Container Apps.
- Database: Azure Database for PostgreSQL Flexible Server.
- Data refresh: scheduled Azure Container Apps jobs rebuild the database from Champion Data via `superNetballR`.
- Infra and deploy: `azure.yaml` plus Bicep under `infra/`.

## Operating model decisions

- Azure plus PostgreSQL is the primary supported deployment path.
- Render/Cloudflare notes in the README are legacy alternatives, not the default operating model.
- The API is intentionally read-only. Do not introduce public write endpoints without an explicit product decision.
- Keep validation and result caps strict. The current posture favours trustworthy, bounded queries over permissive behaviour.
- Continue using parameterized SQL and explicit request validation across the API surface.
- Avoid broad try/catch wrappers or silent fallbacks. Surface or log errors in the same explicit style already used in the repo.

## Telemetry decisions

- Browser usage telemetry is enabled and should stay privacy-safe.
- Browser telemetry loads runtime config from `/meta`, posts same-origin to `/api/telemetry`, and the API forwards sanitized events to Application Insights.
- Do not enable automatic fetch/XHR capture for browser telemetry; this was intentionally disabled to avoid collecting raw Ask the Stats URLs and question text.
- Do not log raw Ask the Stats free-text prompts in telemetry.
- Browser page views land in `AppPageViews`; custom interactions land in `AppEvents`.
- Existing page view names include `archive-home`, `compare`, and `player-profile`.
- Player URLs are sanitized to `/player/:id/` in telemetry.
- `scripts/usage-telemetry.kql` is the starter report file and its query blocks are intentionally self-contained so they can be run independently.

## Frontend conventions

- Reuse the shared UI helpers in `assets/config.js` instead of adding page-specific one-off behaviour where a shared helper already exists.
- Use `window.NetballStatsUI.showStatusBanner` and `cycleStatusBanner` for rotating loading copy and ephemeral success states.
- Use `window.NetballStatsUI.syncResponsiveTable` for dynamic stackable tables so mobile card layouts stay labelled correctly.
- `theme.js` owns the reveal-animation observer logic. Do not reintroduce a second `IntersectionObserver` setup elsewhere.
- Keep major pages visually distinct, but within the same editorial system. The product should feel cohesive without every page feeling templated.

## Backend and data conventions

- `api/R/helpers.R` contains much of the validation, query-building, and transformation logic; prefer extending existing helpers over duplicating logic.
- The natural-language query flow now supports a parsed `seasons` array for multi-season filters. Preserve that shape when extending query parsing.
- The API should continue logging structured request and error telemetry without dumping raw internal database errors into normal logs.
- Keep the API conservative about privacy and high-cardinality fields.

## Azure and deployment notes

- Build the static site with `npm run build`.
- The repo does not currently provide an `npm test` script.
- The practical validation commands used in this repo are:
  - `node --check assets/*.js`
  - `Rscript -e "parse(file='api/R/helpers.R'); parse(file='api/plumber.R')"`
  - `npm run build`
  - `Rscript scripts/test_api_regression.R` against a running environment when API behaviour changes
- For frontend-only changes, prefer `azd deploy web`.
- `azure.yaml` has a `postdeploy` hook that syncs the database refresh jobs to the current API image and triggers an immediate rebuild job. Keep that relationship intact.
- Pushes to `main` only deploy the Static Web App through GitHub Actions. The database refresh jobs are not automatically updated by that workflow; they are synchronized during `azd` deploys.
- Container images must keep the `renv` cache outside `/root` because the app runs as a non-root user and the library symlinks must remain traversable at runtime.
- On Apple Silicon, keep the Azure API build targeting `linux/amd64` as configured in `azure.yaml`.

## Registry cleanup workflow decisions

- `.github/workflows/cleanup-registry.yml` uses GitHub OIDC with a federated Azure app registration.
- The workflow requires:
  - GitHub secret `AZURE_CLIENT_ID`
  - GitHub secret `AZURE_TENANT_ID`
  - GitHub variable `AZURE_SUBSCRIPTION_ID`
  - GitHub variable `AZURE_REGISTRY_NAME`
- The federated service principal needs both `AcrPull` and `AcrDelete` on the registry. `AcrDelete` alone is not enough because the workflow must enumerate repositories and tags before pruning.
- The workflow intentionally skips cleanly when its Azure configuration is incomplete.

## Repo map

- `assets/`: frontend scripts and shared UI helpers
- `query/`, `compare/`, `players/`, `player/`: major frontend pages
- `api/plumber.R`: API entry point and telemetry forwarding endpoint
- `api/R/helpers.R`: query parsing, validation, and response helpers
- `scripts/test_api_regression.R`: endpoint smoke/regression coverage
- `scripts/usage-telemetry.kql`: starter usage and product analytics queries
- `azure.yaml` and `infra/`: Azure deployment definitions
- `Dockerfile.azure`: Azure runtime image for the API

## Preferred change style

- Make surgical changes that preserve the existing product tone and operating model.
- Prefer extending existing helpers and utilities over adding parallel systems.
- Keep telemetry privacy-safe and low-cardinality.
- Keep docs aligned with Azure-first deployment and the current production architecture.

## Known pitfalls

- `scripts/usage-telemetry.kql` blocks should stay self-contained. Query tabs in the portal are often run individually, so shared `let` bindings across sections break easily.
- Browser telemetry should keep using the `/meta` bootstrap plus `/api/telemetry` proxy path. Direct browser-to-App-Insights changes risk losing sanitization and privacy guarantees.
- Do not re-enable fetch/XHR auto-tracking in telemetry. It can capture raw Ask the Stats URLs and undo the current privacy posture.
- `theme.js` already owns reveal-observer behaviour. Reintroducing observer setup in `config.js` or page scripts creates duplication and drift.
- `assets/query.js` has historically been sensitive to missing DOM hooks. Guard page-specific selectors instead of assuming every element exists.
- `azure.yaml` postdeploy keeps the database refresh jobs aligned with the API image. Frontend-only GitHub Actions deploys do not update those jobs.
- If the API image/runtime changes, keep the `renv` cache outside `/root` or the non-root Container App user will hit broken library symlinks at runtime.
- The registry cleanup workflow can authenticate successfully and still fail functionally if the service principal lacks `AcrPull`; it needs both `AcrPull` and `AcrDelete`.
