#!/usr/bin/env Rscript

message("=== SIMPLE DEBUG START ===")
message(sprintf("Current working directory: %s", getwd()))
message(sprintf("Files in current directory: %s", paste(list.files(), collapse=", ")))
message(sprintf("NETBALL_STATS_DB_PASSWORD set: %s", ifelse(nzchar(Sys.getenv("NETBALL_STATS_DB_PASSWORD", "")), "YES", "NO")))

# Try to load required libraries
libs <- c("DBI", "dplyr", "purrr", "netballR", "RPostgres")
for (lib in libs) {
  message(sprintf("Checking library %s...", lib))
  if (requireNamespace(lib, quietly = TRUE)) {
    message(sprintf("✅ %s: LOADED", lib))
  } else {
    message(sprintf("❌ %s: NOT AVAILABLE", lib))
  }
}

message("=== SIMPLE DEBUG END ===")