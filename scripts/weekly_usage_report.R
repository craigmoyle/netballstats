#!/usr/bin/env Rscript

suppressPackageStartupMessages(library(DBI))

render_weekly_usage_report <- function(events, feedback, generated_at = Sys.time()) {
  generated_at <- as.POSIXct(generated_at, tz = "UTC")
  period_start <- generated_at - 7 * 86400
  prior_start <- generated_at - 14 * 86400
  is_public <- function(value) is.na(value) | !nzchar(value) | value == "public"
  non_empty <- function(value) !is.na(value) & nzchar(value)
  distinct_count <- function(value) length(unique(value[non_empty(value)]))
  events$received_at <- as.POSIXct(events$received_at, tz = "UTC")
  feedback$received_at <- as.POSIXct(feedback$received_at, tz = "UTC")
  current_window <- events[events$received_at >= period_start & events$received_at <= generated_at, , drop = FALSE]
  public_events <- events[is_public(events$traffic_class), , drop = FALSE]
  current <- public_events[public_events$received_at >= period_start & public_events$received_at <= generated_at, , drop = FALSE]
  non_public_events <- current_window[!is_public(current_window$traffic_class), , drop = FALSE]
  non_public_feedback <- feedback[
    !is_public(feedback$traffic_class) & feedback$received_at >= period_start & feedback$received_at <= generated_at,
    , drop = FALSE
  ]
  prior <- public_events[public_events$received_at >= prior_start & public_events$received_at < period_start, , drop = FALSE]
  page_views <- current[current$kind == "pageView", , drop = FALSE]
  prior_views <- prior[prior$kind == "pageView", , drop = FALSE]
  current_visitors <- unique(page_views$user_id[non_empty(page_views$user_id)])
  prior_visitors <- unique(prior_views$user_id[non_empty(prior_views$user_id)])
  current_sessions <- unique(page_views$session_id[non_empty(page_views$session_id)])
  returning <- intersect(current_visitors, prior_visitors)
  ideas <- feedback[
    feedback$received_at >= period_start & feedback$received_at <= generated_at,
    , drop = FALSE
  ]
  ideas <- head(ideas[order(ideas$received_at, decreasing = TRUE), , drop = FALSE], 25L)
  page_counts <- sort(table(page_views$name), decreasing = TRUE)
  event_counts <- sort(table(current$name[current$kind == "event"]), decreasing = TRUE)
  delta <- nrow(page_views) - nrow(prior_views)
  trend <- if (delta > 0) paste("Up", delta, "views from the prior week.") else if (delta < 0) paste("Down", abs(delta), "views from the prior week.") else "Level with the prior week."
  fmt_time <- function(value) format(value, "%Y-%m-%d %H:%M UTC", tz = "UTC")
  escape_line <- function(value) {
    value <- gsub("\\|", " ", as.character(value))
    gsub("[\r\n]+", " ", value)
  }
  top_counts <- function(value, n = 3L) {
    counts <- sort(table(value[non_empty(value)]), decreasing = TRUE)
    head(counts, n)
  }
  modes <- c(
    paste0("Super Netball ", distinct_count(page_views$user_id[page_views$site_mode == "domestic"])),
    paste0("International ", distinct_count(page_views$user_id[page_views$site_mode == "international"]))
  )
  referrer <- ifelse(!non_empty(page_views$referrer_host), "Direct / bookmark", page_views$referrer_host)
  referrer[referrer == "statsball.net"] <- "In-site navigation"
  referrer <- sub("^www\\.", "", referrer)
  busiest_hour <- sort(table(format(page_views$received_at, "%Y-%m-%d %H:00", tz = "UTC")), decreasing = TRUE)

  lines <- c(
    "# Netball Stats weekly usage",
    "",
    paste0("Window: ", fmt_time(period_start), " to ", fmt_time(generated_at)),
    "",
    "## Public traffic",
    "",
    paste0("- Page views: ", nrow(page_views), " (", trend, ")"),
    paste0("- Visitors: ", length(current_visitors)),
    paste0("- Sessions: ", length(current_sessions)),
    paste0("- Returning visitors: ", length(returning)),
    paste0("- Archive mode visitors: ", paste(modes, collapse = " · ")),
    paste0("- Non-public/testing activity excluded: ", nrow(non_public_events), " events and ", nrow(non_public_feedback), " feedback items"),
    "",
    "## Top pages",
    ""
  )
  if (length(page_counts)) lines <- c(lines, paste0("- ", names(page_counts)[seq_len(min(5L, length(page_counts)))], ": ", as.integer(page_counts[seq_len(min(5L, length(page_counts)))]))) else lines <- c(lines, "- No public page views recorded.")
  lines <- c(lines, "", "## Top interactions", "")
  if (length(event_counts)) lines <- c(lines, paste0("- ", names(event_counts)[seq_len(min(4L, length(event_counts)))], ": ", as.integer(event_counts[seq_len(min(4L, length(event_counts)))]))) else lines <- c(lines, "- No public interactions recorded.")
  lines <- c(lines, "", "## Audience and referrals", "")
  timezones <- top_counts(page_views$timezone)
  referrers <- top_counts(referrer, 4L)
  if (length(timezones)) lines <- c(lines, paste0("- Timezone ", names(timezones), ": ", as.integer(timezones), " visitors"))
  if (length(referrers)) lines <- c(lines, paste0("- Referrer ", names(referrers), ": ", as.integer(referrers), " views"))
  if (length(busiest_hour)) lines <- c(lines, paste0("- Busiest hour (UTC): ", names(busiest_hour)[[1]], " (", as.integer(busiest_hour[[1]]), " views)"))
  lines <- c(lines, "- Country-level geo is not retained by the private VPS sink.", "", "## Ideas inbox", "", paste0("Submissions: ", nrow(ideas)))
  if (nrow(ideas)) {
    idea_lines <- vapply(seq_len(nrow(ideas)), function(index) {
      traffic_class <- ideas$traffic_class[[index]]
      class_label <- if (!is.na(traffic_class) && nzchar(traffic_class) && traffic_class != "public") paste0(" [", escape_line(traffic_class), "]") else ""
      paste0("- **", escape_line(ideas$category[[index]]), class_label, "** · ", fmt_time(ideas$received_at[[index]]), " · ", escape_line(substr(ideas$message[[index]], 1L, 280L)))
    }, character(1))
    lines <- c(lines, idea_lines)
  } else {
    lines <- c(lines, "- No public Ideas submissions in this period.")
  }
  lines <- c(lines, "", "Internal and testing traffic is excluded from public totals. Ideas inbox entries from all traffic classes are included and labeled. Records older than 90 days are pruned by the weekly job.")
  paste(lines, collapse = "\n")
}

write_weekly_usage_report <- function() {
  source(file.path(Sys.getenv("NETBALL_STATS_REPO_ROOT", "."), "api", "R", "telemetry_sink.R"), local = TRUE)
  connection <- telemetry_db_connect(
    user = Sys.getenv("NETBALL_STATS_TELEMETRY_REPORT_USER", "netballstats_telemetry_reporter"),
    password = Sys.getenv("NETBALL_STATS_TELEMETRY_REPORT_PASSWORD", "")
  )
  on.exit(DBI::dbDisconnect(connection), add = TRUE)
  DBI::dbExecute(connection, "DELETE FROM telemetry.events WHERE received_at < now() - interval '90 days'")
  DBI::dbExecute(connection, "DELETE FROM telemetry.feedback WHERE received_at < now() - interval '90 days'")
  events <- DBI::dbGetQuery(connection, "SELECT received_at, kind, name, traffic_class, site_mode, session_id, user_id, referrer_host, timezone FROM telemetry.events WHERE received_at >= now() - interval '14 days'")
  feedback <- DBI::dbGetQuery(connection, "SELECT received_at, category, message, traffic_class FROM telemetry.feedback WHERE received_at >= now() - interval '7 days'")

  output_dir <- Sys.getenv("NETBALL_STATS_TELEMETRY_REPORT_DIR", "/reports")
  if (!dir.exists(output_dir)) dir.create(output_dir, recursive = TRUE, mode = "0700")
  Sys.chmod(output_dir, "0700")
  generated_at <- Sys.time()
  output <- file.path(output_dir, paste0("weekly-usage-", format(generated_at, "%Y%m%d", tz = "UTC"), ".md"))
  temporary <- tempfile("weekly-usage-", tmpdir = output_dir)
  writeLines(render_weekly_usage_report(events, feedback, generated_at), temporary, useBytes = TRUE)
  Sys.chmod(temporary, "0600")
  if (!file.rename(temporary, output)) stop("Could not publish the weekly report.", call. = FALSE)
  Sys.chmod(output, "0600")

  old_reports <- list.files(output_dir, pattern = "^weekly-usage-[0-9]{8}\\.md$", full.names = TRUE)
  old_reports <- old_reports[file.info(old_reports)$mtime < Sys.time() - 90 * 86400]
  if (length(old_reports)) unlink(old_reports)
  cat("Weekly report written to ", output, "\n", sep = "")
}

if (sys.nframe() == 0L) write_weekly_usage_report()
