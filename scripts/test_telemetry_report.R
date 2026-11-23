#!/usr/bin/env Rscript

source("scripts/weekly_usage_report.R")
now <- as.POSIXct("2026-11-23 00:00:00", tz = "UTC")
events <- data.frame(
  received_at = as.POSIXct(c("2026-11-22 12:00:00", "2026-11-15 12:00:00", "2026-11-22 13:00:00"), tz = "UTC"),
  kind = c("pageView", "pageView", "pageView"),
  name = c("compare", "archive-home", "testing-only"),
  traffic_class = c("public", "public", "testing"),
  session_id = c("s-current", "s-prior", "s-test"),
  user_id = c("u-returning", "u-returning", "u-test"),
  stringsAsFactors = FALSE
)
feedback <- data.frame(
  received_at = as.POSIXct(c("2026-11-22 14:00:00", "2026-11-22 15:00:00"), tz = "UTC"),
  category = c("idea", "bug"),
  message = c("Public idea", "Testing feedback is still visible to the admin"),
  traffic_class = c("public", "testing"),
  stringsAsFactors = FALSE
)
report <- render_weekly_usage_report(events, feedback, now)
stopifnot(grepl("Page views: 1", report, fixed = TRUE))
stopifnot(grepl("Returning visitors: 1", report, fixed = TRUE))
stopifnot(grepl("compare: 1", report, fixed = TRUE))
stopifnot(grepl("Public idea", report, fixed = TRUE))
stopifnot(grepl("Testing feedback is still visible", report, fixed = TRUE))
stopifnot(grepl("[testing]", report, fixed = TRUE))
stopifnot(!grepl("testing-only", report, fixed = TRUE))
cat("Telemetry report checks passed.\n")
