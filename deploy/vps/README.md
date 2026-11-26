# Netball Stats on the VPS

Stats runs at `https://statsball.net` from this directory. It is deployed separately from Trials: its own Compose project (`netball-stats`), its own images, its own env file and its own systemd timers. The shared PostgreSQL and TLS edge come from the `netball-vps` platform repo, which must be running first.

## Host layout

- `/opt/netball/netballstats` – checkout of `main`
- `/opt/netball/stats.env` – Stats secrets (mode `0600`, root-only); template in `stats.env.example`
- `/opt/netball/reports` – weekly telemetry reports

## Deploy

Deploy only from merged `main`:

```sh
cd /opt/netball/netballstats/deploy/vps
sudo ./deploy.sh
```

`deploy.sh` validates the Compose file, builds `stats-api` and `stats-web`, recreates those two containers, and installs the systemd units.

## Request path

Client → edge (TLS, `netball-vps`) → `stats-web` (static files, headers, API proxy) → `stats-api`. `stats-web` trusts only the edge subnet (`172.30.50.0/24`) and forwards the real client IP to the API, which trusts only `stats-web` (`172.30.10.2`).

## Jobs and timers

- `netball-stats-full` (weekly) and `netball-stats-international` rebuild the archive with `stats-full-refresh` and `stats-international-refresh`. They share a lock.
- `netball-stats-telemetry-report` writes the weekly usage report.

Run a job manually with `sudo docker compose --env-file /opt/netball/stats.env -f compose.yaml --profile jobs run --rm --no-deps <service>`.

## Rules

- PostgreSQL is private; Stats uses its own roles. The API role is read-only for archive tables.
- Never run `docker compose down -v` in this project.
- Keep provider and analytics credentials out of the repo and out of this file.
