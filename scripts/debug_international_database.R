#!/usr/bin/env Rscript

# Debug version of the international database build script with enhanced logging

message("=== INTERNATIONAL NETBALL DATABASE BUILD - DEBUG MODE ===")
message(sprintf("Timestamp: %s", Sys.time()))

suppressPackageStartupMessages({
  library(DBI)
  library(dplyr)
  library(purrr)
  library(netballR)
  library(RPostgres)
})

# Simple connection for debugging
debug_connect_db <- function() {
  db_host <- Sys.getenv("NETBALL_STATS_DB_HOST", "localhost")
  db_port <- Sys.getenv("NETBALL_STATS_DB_PORT", "5432")
  db_name <- Sys.getenv("NETBALL_STATS_DB_NAME", "netballstats")
  db_user <- Sys.getenv("NETBALL_STATS_DB_USER", "netballstatsadmin")
  db_password <- Sys.getenv("NETBALL_STATS_DB_PASSWORD", "")
  
  if (nchar(db_password) == 0) {
    message("❌ No database password provided.")
    return(NULL)
  }
  
  message("🔄 Attempting database connection...")
  
  tryCatch({
    con <- dbConnect(
      RPostgres::Postgres(),
      host = db_host,
      port = as.integer(db_port),
      dbname = db_name,
      user = db_user,
      password = db_password,
      bigint = "integer",
      timezone = "UTC"
    )
    message("✅ Database connection SUCCESSFUL")
    return(con)
  }, error = function(e) {
    message(sprintf("❌ Database connection FAILED: %s", conditionMessage(e)))
    return(NULL)
  })
}

# Check if international tables exist
check_international_tables <- function(conn) {
  message("🔍 Checking international table existence...")
  
  tables <- c("international_matches", "international_teams", "international_players", "international_player_match_stats")
  
  for (table in tables) {
    exists <- dbExistsTable(conn, table)
    message(sprintf("  Table '%s': %s", table, ifelse(exists, "✅ EXISTS", "❌ MISSING")))
    
    if (exists) {
      count_query <- paste("SELECT COUNT(*) as count FROM", table)
      result <- tryCatch({
        dbGetQuery(conn, count_query)
      }, error = function(e) {
        message(sprintf("    ❌ Error counting rows in %s: %s", table, conditionMessage(e)))
        return(data.frame(count = NA))
      })
      
      if (!is.na(result$count)) {
        message(sprintf("    Row count: %d", result$count))
      }
    }
  }
}

# Show sample data from tables
show_sample_data <- function(conn) {
  message("📋 Showing sample international data...")
  
  # Sample matches
  message("\n--- Sample Matches ---")
  matches_sample <- tryCatch({
    dbGetQuery(conn, "SELECT match_id, season, home_squad_name, away_squad_name, home_score, away_score FROM international_matches LIMIT 3")
  }, error = function(e) {
    message(sprintf("❌ Error querying matches: %s", conditionMessage(e)))
    return(NULL)
  })
  
  if (!is.null(matches_sample) && nrow(matches_sample) > 0) {
    print(matches_sample)
  } else {
    message("No match data found")
  }
  
  # Sample teams
  message("\n--- Sample Teams ---")
  teams_sample <- tryCatch({
    dbGetQuery(conn, "SELECT squad_id, squad_name FROM international_teams LIMIT 5")
  }, error = function(e) {
    message(sprintf("❌ Error querying teams: %s", conditionMessage(e)))
    return(NULL)
  })
  
  if (!is.null(teams_sample) && nrow(teams_sample) > 0) {
    print(teams_sample)
  } else {
    message("No team data found")
  }
}

# Show table schemas
show_table_schemas <- function(conn) {
  message("🔍 Showing international table schemas...")
  
  tables <- c("international_matches", "international_teams", "international_players", "international_player_match_stats")
  
  for (table in tables) {
    message(sprintf("\n--- Schema for %s ---", table))
    schema_query <- paste("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '", table, "' ORDER BY ordinal_position")
    result <- tryCatch({
      dbGetQuery(conn, schema_query)
    }, error = function(e) {
      message(sprintf("❌ Error getting schema for %s: %s", table, conditionMessage(e)))
      return(NULL)
    })
    
    if (!is.null(result) && nrow(result) > 0) {
      print(result)
    }
  }
}

# Main debug execution
main <- function() {
  # Connect to database
  conn <- debug_connect_db()
  if (is.null(conn)) {
    message("Cannot proceed without database connection")
    return(1)
  }
  
  # Check table existence and data
  check_international_tables(conn)
  
  # Show schemas
  show_table_schemas(conn)
  
  # Show sample data
  show_sample_data(conn)
  
  # Close connection
  dbDisconnect(conn)
  message("✅ Debug session completed")
}

main()