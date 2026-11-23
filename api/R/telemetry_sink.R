telemetry_db_configured <- function() {
  required <- c(
    "NETBALL_STATS_TELEMETRY_DB_HOST",
    "NETBALL_STATS_TELEMETRY_DB_PORT",
    "NETBALL_STATS_TELEMETRY_DB_NAME",
    "NETBALL_STATS_TELEMETRY_DB_USER",
    "NETBALL_STATS_TELEMETRY_DB_PASSWORD"
  )
  all(nzchar(trimws(Sys.getenv(required, ""))))
}

telemetry_sink_mode <- function() {
  if (telemetry_db_configured()) return("postgres")
  "none"
}

telemetry_db_connect <- function(user = Sys.getenv("NETBALL_STATS_TELEMETRY_DB_USER", ""),
                                 password = Sys.getenv("NETBALL_STATS_TELEMETRY_DB_PASSWORD", "")) {
  DBI::dbConnect(
    RPostgres::Postgres(),
    host = Sys.getenv("NETBALL_STATS_TELEMETRY_DB_HOST"),
    port = as.integer(Sys.getenv("NETBALL_STATS_TELEMETRY_DB_PORT", "5432")),
    dbname = Sys.getenv("NETBALL_STATS_TELEMETRY_DB_NAME"),
    user = user,
    password = password,
    sslmode = Sys.getenv("NETBALL_STATS_TELEMETRY_DB_SSLMODE", "disable")
  )
}

telemetry_optional_value <- function(value) {
  if (is.null(value) || !length(value) || !nzchar(as.character(value[[1]]))) NA_character_ else as.character(value[[1]])
}

build_stored_telemetry_record <- function(kind, payload, req) {
  context <- telemetry_sanitise_context(payload$context)
  properties <- utils::modifyList(
    telemetry_sanitise_properties(payload$properties),
    Filter(
      nzchar,
      list(
        viewport_bucket = context$viewport_bucket %||% "",
        browser_language = context$browser_language %||% "",
        referrer_host = context$referrer_host %||% "",
        timezone = context$timezone %||% "",
        device_type = context$device_type %||% "",
        device_os = context$device_os %||% "",
        device_os_version = context$device_os_version %||% "",
        traffic_class = context$traffic_class %||% "",
        site_mode = context$site_mode %||% "",
        visit_hour_local = context$visit_hour_local %||% ""
      )
    )
  )

  list(
    kind = kind,
    name = telemetry_trim_string(payload$name, 80L),
    uri = telemetry_trim_string(payload$uri, 200L),
    context = context,
    site_mode = telemetry_normalise_site_mode(context$site_mode %||% properties$site_mode %||% ""),
    properties = properties,
    client_ip = telemetry_trim_string(resolve_telemetry_client_ip(req), 80L)
  )
}

store_browser_telemetry <- function(record) {
  connection <- telemetry_db_connect()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)
  context <- record$context
  properties <- jsonlite::toJSON(record$properties, auto_unbox = TRUE, null = "null")

  DBI::dbExecute(connection, paste(
    "INSERT INTO telemetry.events",
    "(kind, name, uri, traffic_class, site_mode, session_id, user_id, client_ip, referrer_host, timezone, visit_hour_local, properties)",
    "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)"
  ), params = list(
    record$kind,
    record$name,
    record$uri,
    telemetry_optional_value(context$traffic_class),
    telemetry_optional_value(record$site_mode),
    telemetry_optional_value(context$session_id),
    telemetry_optional_value(context$user_id),
    telemetry_optional_value(record$client_ip),
    telemetry_optional_value(context$referrer_host),
    telemetry_optional_value(context$timezone),
    telemetry_optional_value(context$visit_hour_local),
    as.character(properties)
  ))

  invisible(TRUE)
}

store_feedback_submission <- function(category, message, req) {
  connection <- telemetry_db_connect()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  DBI::dbExecute(connection, paste(
    "INSERT INTO telemetry.feedback (category, message, traffic_class, client_ip)",
    "VALUES ($1, $2, $3, $4)"
  ), params = list(
    category,
    feedback_normalise_message(message),
    telemetry_optional_value(telemetry_default_traffic_class(req)),
    telemetry_optional_value(resolve_telemetry_client_ip(req))
  ))

  invisible(TRUE)
}
