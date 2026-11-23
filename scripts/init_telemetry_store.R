#!/usr/bin/env Rscript

suppressPackageStartupMessages(library(DBI))

initialize_telemetry_store <- function() {
  required_env <- c("POSTGRES_ADMIN_PASSWORD", "STATS_TELEMETRY_WRITER_PASSWORD", "STATS_TELEMETRY_REPORT_PASSWORD")
  if (any(!nzchar(Sys.getenv(required_env, "")))) stop("Telemetry database credentials are required.", call. = FALSE)

  admin_connection <- dbConnect(
    RPostgres::Postgres(),
    host = Sys.getenv("NETBALL_STATS_DB_HOST", "db"),
    port = as.integer(Sys.getenv("NETBALL_STATS_DB_PORT", "5432")),
    dbname = "postgres",
    user = "netball_host_admin",
    password = Sys.getenv("POSTGRES_ADMIN_PASSWORD"),
    sslmode = "disable"
  )
  on.exit(dbDisconnect(admin_connection), add = TRUE)

  set_role_password <- function(role, password) {
    exists <- dbGetQuery(admin_connection, "SELECT 1 FROM pg_roles WHERE rolname = $1", params = list(role))
    if (!nrow(exists)) dbExecute(admin_connection, paste("CREATE ROLE", role, "LOGIN"))
    dbExecute(admin_connection, paste("ALTER ROLE", role, "LOGIN PASSWORD", dbQuoteLiteral(admin_connection, password)))
  }

  set_role_password("netballstats_telemetry_writer", Sys.getenv("STATS_TELEMETRY_WRITER_PASSWORD"))
  set_role_password("netballstats_telemetry_reporter", Sys.getenv("STATS_TELEMETRY_REPORT_PASSWORD"))
  dbExecute(admin_connection, "GRANT CONNECT ON DATABASE netballstats TO netballstats_telemetry_writer, netballstats_telemetry_reporter")

  connection <- dbConnect(
    RPostgres::Postgres(),
    host = Sys.getenv("NETBALL_STATS_DB_HOST", "db"),
    port = as.integer(Sys.getenv("NETBALL_STATS_DB_PORT", "5432")),
    dbname = "netballstats",
    user = "netball_host_admin",
    password = Sys.getenv("POSTGRES_ADMIN_PASSWORD"),
    sslmode = "disable"
  )
  on.exit(dbDisconnect(connection), add = TRUE)

  dbExecute(connection, "CREATE SCHEMA IF NOT EXISTS telemetry AUTHORIZATION netball_host_admin")
  dbExecute(connection, "REVOKE ALL ON SCHEMA telemetry FROM PUBLIC")
  dbExecute(connection, "CREATE TABLE IF NOT EXISTS telemetry.events (event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now(), kind text NOT NULL CHECK (kind IN ('pageView', 'event')), name varchar(80) NOT NULL, uri varchar(200) NOT NULL DEFAULT '', traffic_class text CHECK (traffic_class IS NULL OR traffic_class IN ('public', 'internal', 'testing')), site_mode text CHECK (site_mode IS NULL OR site_mode IN ('domestic', 'international')), session_id varchar(80), user_id varchar(80), client_ip varchar(80), referrer_host varchar(80), timezone varchar(60), visit_hour_local varchar(20), properties jsonb NOT NULL DEFAULT '{}'::jsonb)")
  dbExecute(connection, "ALTER TABLE telemetry.events ADD COLUMN IF NOT EXISTS referrer_host varchar(80), ADD COLUMN IF NOT EXISTS timezone varchar(60), ADD COLUMN IF NOT EXISTS visit_hour_local varchar(20)")
  dbExecute(connection, "CREATE TABLE IF NOT EXISTS telemetry.feedback (feedback_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now(), category text NOT NULL CHECK (category IN ('idea', 'bug', 'data_question')), message varchar(1000) NOT NULL, traffic_class text CHECK (traffic_class IS NULL OR traffic_class IN ('public', 'internal', 'testing')), client_ip varchar(80))")
  dbExecute(connection, "CREATE INDEX IF NOT EXISTS telemetry_events_received_at_idx ON telemetry.events (received_at)")
  dbExecute(connection, "CREATE INDEX IF NOT EXISTS telemetry_events_public_name_idx ON telemetry.events (traffic_class, kind, name)")
  dbExecute(connection, "CREATE INDEX IF NOT EXISTS telemetry_feedback_received_at_idx ON telemetry.feedback (received_at)")
  dbExecute(connection, "GRANT USAGE ON SCHEMA telemetry TO netballstats_telemetry_writer, netballstats_telemetry_reporter")
  dbExecute(connection, "GRANT INSERT ON telemetry.events, telemetry.feedback TO netballstats_telemetry_writer")
  dbExecute(connection, "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA telemetry TO netballstats_telemetry_writer")
  dbExecute(connection, "GRANT SELECT, DELETE ON telemetry.events, telemetry.feedback TO netballstats_telemetry_reporter")
  dbExecute(connection, "ALTER DEFAULT PRIVILEGES FOR ROLE netball_host_admin IN SCHEMA telemetry GRANT INSERT ON TABLES TO netballstats_telemetry_writer")
  dbExecute(connection, "ALTER DEFAULT PRIVILEGES FOR ROLE netball_host_admin IN SCHEMA telemetry GRANT SELECT, DELETE ON TABLES TO netballstats_telemetry_reporter")
  dbExecute(connection, "ALTER DEFAULT PRIVILEGES FOR ROLE netball_host_admin IN SCHEMA telemetry GRANT USAGE, SELECT ON SEQUENCES TO netballstats_telemetry_writer")

  cat("Telemetry schema and restricted roles are ready.\n")
}

initialize_telemetry_store()
