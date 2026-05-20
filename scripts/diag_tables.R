#!/usr/bin/env Rscript
suppressPackageStartupMessages({
  library(DBI)
  library(RPostgres)
})

conn <- DBI::dbConnect(
  RPostgres::Postgres(),
  host     = Sys.getenv("NETBALL_STATS_DB_HOST"),
  port     = 5432L,
  dbname   = Sys.getenv("NETBALL_STATS_DB_NAME"),
  user     = Sys.getenv("NETBALL_STATS_DB_USER"),
  password = Sys.getenv("NETBALL_STATS_DB_PASSWORD"),
  sslmode      = "verify-full",
  sslrootcert  = "system"
)

tabs <- sort(DBI::dbListTables(conn))
cat("=== ALL TABLES ===\n")
cat(paste(tabs, collapse = "\n"), "\n\n")

intl_tabs <- tabs[grep("^international", tabs)]
cat("=== INTERNATIONAL TABLE ROW COUNTS ===\n")
for (t in intl_tabs) {
  n <- tryCatch(
    DBI::dbGetQuery(conn, paste("SELECT COUNT(*) AS n FROM", t))$n,
    error = function(e) paste("ERROR:", conditionMessage(e))
  )
  cat(sprintf("  %-50s %s\n", t, n))
}

DBI::dbDisconnect(conn)
cat("Done.\n")
