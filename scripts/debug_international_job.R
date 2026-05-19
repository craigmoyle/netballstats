#!/usr/bin/env Rscript

message("=== International Database Build Debug Script ===")

# Load required libraries
suppressPackageStartupMessages({
  library(DBI)
  library(dplyr)
  library(purrr)
  library(netballR)
  library(RPostgres)
})

# Show environment variables
message("Environment variables:")
env_vars <- c(
  "NETBALL_STATS_DB_HOST",
  "NETBALL_STATS_DB_PORT", 
  "NETBALL_STATS_DB_NAME",
  "NETBALL_STATS_DB_USER",
  "NETBALL_STATS_DB_PASSWORD",
  "NETBALL_STATS_API_DB_USERNAME",
  "NETBALL_STATS_API_DB_PASSWORD"
)

for (var in env_vars) {
  value <- Sys.getenv(var, unset = "<not set>")
  # Don't print passwords
  if (grepl("PASSWORD", var)) {
    message(sprintf("  %s: %s", var, ifelse(nzchar(value), "<set>", "<not set>")))
  } else {
    message(sprintf("  %s: %s", var, value))
  }
}

# Try database connection
message("\nTesting database connection...")
tryCatch({
  conn <- dbConnect(
    RPostgres::Postgres(),
    host = Sys.getenv("NETBALL_STATS_DB_HOST"),
    port = as.integer(Sys.getenv("NETBALL_STATS_DB_PORT")),
    dbname = Sys.getenv("NETBALL_STATS_DB_NAME"),
    user = Sys.getenv("NETBALL_STATS_DB_USER"),
    password = Sys.getenv("NETBALL_STATS_DB_PASSWORD"),
    bigint = "integer",
    timezone = "UTC"
  )
  message("✅ Database connection successful")
  
  # Test simple query
  result <- dbGetQuery(conn, "SELECT version()")
  message(sprintf("PostgreSQL version: %s", result[1,1]))
  
  dbDisconnect(conn)
}, error = function(e) {
  message(sprintf("❌ Database connection failed: %s", conditionMessage(e)))
})

# Test netballR package
message("\nTesting netballR package...")
tryCatch({
  comps <- netballR::listCompetitionsNetballAus()
  message(sprintf("✅ netballR package loaded successfully"))
  message(sprintf("Found %d competitions", nrow(comps)))
  
  # Look for Diamonds competitions
  diamonds <- subset(comps, grepl("Diamonds", competition_name, ignore.case = TRUE))
  message(sprintf("Found %d Australian Diamonds competitions", nrow(diamonds)))
  
  if (nrow(diamonds) > 0) {
    print(head(diamonds[, c("comp_id", "competition_name", "year")], 3))
    
    # Try downloading fixture for first competition
    first_comp_id <- diamonds$comp_id[1]
    message(sprintf("\nAttempting to download fixture for competition %s...", first_comp_id))
    
    fixture <- netballR::downloadFixture(first_comp_id)
    message(sprintf("✅ Fixture download successful: %d matches", nrow(fixture)))
    
    if (nrow(fixture) > 0) {
      print(head(fixture[, c("matchId", "homeSquadName", "awaySquadName", "homeSquadScore", "awaySquadScore")], 3))
    }
  }
}, error = function(e) {
  message(sprintf("❌ netballR package test failed: %s", conditionMessage(e)))
})

message("\n=== Debug Script Complete ===")