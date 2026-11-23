#!/usr/bin/env Rscript

repo_root <- normalizePath(".", winslash = "/", mustWork = TRUE)
Sys.setenv(
  NETBALL_STATS_REPO_ROOT = repo_root,
  NETBALL_STATS_BROWSER_APPINSIGHTS_CONNECTION_STRING = "",
  NETBALL_STATS_TELEMETRY_DB_HOST = "db",
  NETBALL_STATS_TELEMETRY_DB_PORT = "5432",
  NETBALL_STATS_TELEMETRY_DB_NAME = "netballstats",
  NETBALL_STATS_TELEMETRY_DB_USER = "telemetry_writer",
  NETBALL_STATS_TELEMETRY_DB_PASSWORD = "test-only-password",
  NETBALL_STATS_TESTING_HOSTS = "stats-staging.example.test"
)
source(file.path(repo_root, "api", "plumber.R"), local = TRUE)

assert_true <- function(condition, message) {
  if (!isTRUE(condition)) stop(message, call. = FALSE)
}

assert_true(identical(telemetry_sink_mode(), "postgres"), "Expected configured PostgreSQL telemetry sink mode.")
assert_true(browser_telemetry_enabled(), "Expected browser telemetry to be enabled with the PostgreSQL sink.")

request <- list(
  postBody = jsonlite::toJSON(list(
    kind = "event",
    payload = list(
      name = "compare_completed",
      uri = "https://example.test/compare/",
      context = list(session_id = "s-123", user_id = "u-123", traffic_class = "public"),
      properties = list(page_type = "compare", message = "private feedback", prompt = "private question", safe_metric = "42")
    )
  ), auto_unbox = TRUE),
  REMOTE_ADDR = "203.0.113.44",
  HTTP_USER_AGENT = "test-agent",
  HTTP_HOST = "stats-staging.example.test"
)
parsed <- parse_browser_telemetry_request(request)
record <- build_stored_telemetry_record(parsed$kind, parsed$payload, request)

assert_true(identical(record$kind, "event"), "Expected event kind to be stored.")
assert_true(identical(record$name, "compare_completed"), "Expected event name to be stored.")
assert_true(identical(record$context$traffic_class, "testing"), "Expected the staging hostname to be tagged as testing server-side.")
assert_true(identical(telemetry_default_traffic_class(request), "testing"), "Expected staging feedback to be tagged as testing.")
production_request <- request
production_request$HTTP_HOST <- "statsball.net"
production_payload <- parse_browser_telemetry_request(production_request)$payload
assert_true(identical(production_payload$context$traffic_class, "public"), "Expected public traffic to preserve the browser's public class.")
assert_true(identical(telemetry_default_traffic_class(production_request), ""), "Expected production feedback to use the normal public default.")
assert_true(identical(record$properties$safe_metric, "42"), "Expected safe properties to be retained.")
assert_true(is.null(record$properties$message) && is.null(record$properties$prompt), "Expected free-text telemetry properties to be dropped.")
assert_true(identical(record$client_ip, "203.0.113.0"), "Expected client IP anonymization before storage.")

Sys.setenv(NETBALL_STATS_BROWSER_APPINSIGHTS_CONNECTION_STRING = "InstrumentationKey=test")
assert_true(identical(telemetry_sink_mode(), "appinsights"), "Expected Azure telemetry to remain selected when its connection string is configured.")

cat("Telemetry sink checks passed.\n")
