#!/usr/bin/env Rscript

message("=== SIMPLE COMPONENTS TEST ===")

suppressPackageStartupMessages({
  library(netballR)
  library(DBI)
  library(RPostgres)
})

message("\\n1. Testing netballR package...")
success <- FALSE
tryCatch({
  comps <- netballR::listCompetitionsNetballAus()
  message(sprintf("✅ netballR available, found %d competitions", nrow(comps)))
  diamonds <- subset(comps, grepl("Diamonds", competition_name, ignore.case = TRUE))
  message(sprintf("✅ Found %d Australian Diamonds competitions", nrow(diamonds)))
  if (nrow(diamonds) > 0) {
    message("First Diamonds competition:")
    print(diamonds[1, c("comp_id", "competition_name", "year")])
  }
  success <- TRUE
}, error = function(e) {
  message(sprintf("❌ netballR test failed: %s", conditionMessage(e)))
})

message("\\n2. Testing RPostgres...")
tryCatch({
  message("✅ RPostgres package loaded")
}, error = function(e) {
  message(sprintf("❌ RPostgres test failed: %s", conditionMessage(e)))
  success <- FALSE
})

message("\\n3. Testing environment variables...")
db_host <- Sys.getenv("NETBALL_STATS_DB_HOST", "")
db_user <- Sys.getenv("NETBALL_STATS_DB_USER", "")
has_vars <- nchar(db_host) > 0 && nchar(db_user) > 0
message(sprintf("Database host set: %s (%s)", ifelse(has_vars, "YES", "NO"), ifelse(has_vars, db_host, "not set")))
message(sprintf("Database user set: %s (%s)", ifelse(nchar(db_user) > 0, "YES", "NO"), ifelse(nchar(db_user) > 0, db_user, "not set")))

if (success && has_vars) {
  message("\\n🎉 Basic components test PASSED")
  quit(status = 0)
} else {
  message("\\n❌ Basic components test FAILED")
  quit(status = 1)
}