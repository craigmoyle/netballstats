# Netball Stats Website

`netballstats` is an editorial Super Netball archive. Its only public site is `https://statsball.net`, hosted on the self-managed VPS. Caddy serves the static site and same-origin API; PostgreSQL is private, refreshes run on local systemd timers, and the archive database is rebuilt from Champion Data. Browser telemetry and feedback use a private PostgreSQL schema and are the only public write paths. The weekly usage report is a root-only Markdown file available over SSH.

## What’s in the app

- multi-season leaderboard and comparison views from 2017 onward
- team and player leaderboard charts plus season trend lines
- natural-language “Ask the stats” queries with parsed query explanations
- player directory and player profile pages with career and season summaries
- international section for Australian Diamonds and other international netball statistics
- read-only API endpoints with validation, rate limiting, security headers, and parameterized SQL
- scheduled database refresh jobs that rebuild the archive from Champion Data via `superNetballR`
- separate international database refresh jobs using `netballR`

## International Netball Features

The site now includes a separate section for international netball statistics, focusing on Australian Diamonds matches and other international competitions. This section provides:

- Player profiles for international netball athletes
- Career statistics and season-by-season breakdowns
- Leaderboards for players and teams
- Natural language query interface ("Ask the Stats")
- Player comparison tool

International data is sourced from Champion Data via the `netballR` package and stored in separate database tables with an `international_` prefix to maintain clear separation from Super Netball data.

### International API Endpoints

- `/api/international/meta` - Metadata about international data
- `/api/international/players` - Player listings
- `/api/international/player-profile` - Individual player profiles
- `/api/international/leaders` - Leaderboards
- `/api/international/matches` - Match listings

### Database Refresh

International data is refreshed using the `scripts/build_international_database.R` script, which uses the `netballR` package to fetch data from Champion Data. The script creates separate tables with an `international_` prefix to keep data isolated from the main Super Netball dataset.

## Repository layout

- `index.html` + `assets/`: static frontend
- `query/`, `compare/`, `players/`, `player/`: page shells for the major frontend flows
- `league-composition/`: season-by-season youth break-in, league age/experience, and import-share analysis backed by the maintained `config/player_reference.csv` reference file
- `api/plumber.R`: read-only API entry point
- `api/R/helpers.R`: validation, query-building, and response helpers
- `R/database.R`: PostgreSQL connection helpers and runtime DB config
- `scripts/build_database.R`: PostgreSQL ingestion / rebuild script
- `scripts/run_api.R`: local API runner
- `scripts/test_api_regression.R`: endpoint smoke/regression checks
- `config/competitions.csv`: season-to-competition manifest
- `renv.lock` + `renv/`: reproducible R dependency management

## Agent guidance

Operating guidance for coding agents lives in standard repo-root files rather than harness-specific config:

- **[AGENTS.md](./AGENTS.md)** — architecture, validation, deployment, API/frontend conventions
- **[CLAUDE.md](./CLAUDE.md)** — product voice and UX principles
- **[DESIGN.md](./DESIGN.md)** — design tokens and component rules

## Local development

### Restore R dependencies

Install `renv` once, then restore the pinned package set for this repo:

```sh
cd /Users/craig/Git/netballstats
Rscript -e "install.packages('renv', repos = 'https://cloud.r-project.org')"
Rscript -e "renv::restore(prompt = FALSE)"
```

### Start a local PostgreSQL instance

The app now runs against PostgreSQL only. For quick local work, a disposable Docker container is the simplest option:

```sh
docker run --rm --name netballstats-postgres \
  -e POSTGRES_DB=netballstats \
  -e POSTGRES_USER=netballstatsadmin \
  -e POSTGRES_PASSWORD=netballstatsadmin \
  -p 127.0.0.1:5432:5432 \
  postgres:16
```

In a second shell, export the connection settings used by the build and API scripts:

```sh
export NETBALL_STATS_DB_HOST=127.0.0.1
export NETBALL_STATS_DB_PORT=5432
export NETBALL_STATS_DB_NAME=netballstats
export NETBALL_STATS_DB_USER=netballstatsadmin
export NETBALL_STATS_DB_PASSWORD=netballstatsadmin
export NETBALL_STATS_DB_SSLMODE=disable
export NETBALL_STATS_API_DB_USERNAME=netballstats_api
export NETBALL_STATS_API_DB_PASSWORD=netballstats_api_password
```

### Build a sample database

Use the bundled `superNetballR` example data when you want to validate the app without calling Champion Data:

```sh
cd /Users/craig/Git/netballstats
NETBALL_STATS_SAMPLE=true Rscript scripts/build_database.R
```

### Build the full database from Champion Data

When you have outbound access and valid Champion Data credentials, run:

```sh
cd /Users/craig/Git/netballstats
Rscript scripts/build_database.R
```

The build script writes directly to PostgreSQL and, when `NETBALL_STATS_API_DB_USERNAME` / `NETBALL_STATS_API_DB_PASSWORD` are set, rotates the read-only API role used at runtime.

### Run the API locally

```sh
cd /Users/craig/Git/netballstats
NETBALL_STATS_ALLOWED_ORIGINS=http://127.0.0.1:4173,http://localhost:4173 \
Rscript scripts/run_api.R
```

If you prefer the inline form, keep the single quotes so your shell does not expand `pr$run(...)`:

```sh
Rscript -e 'pr <- plumber::plumb("api/plumber.R"); pr$run(host = "127.0.0.1", port = 8000)'
```

### Serve the frontend locally

```sh
cd /Users/craig/Git/netballstats
python3 -m http.server 4173
```

For the hosted site the frontend defaults to `/api`, which Caddy proxies to the same-origin API.

### Run the API regression suite

With the API running locally:

```sh
cd /Users/craig/Git/netballstats
Rscript scripts/test_api_regression.R
```

To target another environment, pass a base URL or set `NETBALL_STATS_API_BASE_URL`:

```sh
Rscript scripts/test_api_regression.R --base-url=https://your-api.example.com
```

## Security model

The application is intentionally conservative:

- **No public write endpoints**: the API is read-only.
- **Prepared SQL**: every endpoint queries through parameterized SQL.
- **Strict validation**: seasons, limits, player IDs, team IDs, stats, and query text are validated before use.
- **Result caps**: list endpoints enforce hard maximum limits.
- **Explicit CORS allow-list**: only configured origins can call the API cross-origin.
- **Security headers**: HSTS, frame busting, content-type hardening, referrer policy, and permissions policy are all set in the API.
- **Rate limiting**: the API applies a simple request-per-minute guard.
- **Secrets out of source control**: deployment credentials stay in root-only host configuration, not repo files.
- **Structured request telemetry**: the API logs request path, status, latency, and slow/failing requests without dumping raw database errors into normal logs.
- **Privacy-safe usage telemetry**: the public VPS uses a private PostgreSQL sink and SSH-readable weekly report without logging raw Ask the Stats question text or auto-capturing fetch/XHR URLs.

## Frontend build

Build the static site with:

```sh
npm run build
```

That writes the deployable frontend into `dist/`.

## Operational suggestions

- Revisit `config/competitions.csv` at the start of each season because Champion Data competition IDs change year to year.
- Keep the API and refresh jobs on separate credentials: read-only for the API, write-capable for ingestion.
- Use the request telemetry logs to identify true hot endpoints before introducing caching or Redis.
- Keep PostgreSQL private and preserve separate read-only API and write-capable refresh roles.
