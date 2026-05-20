#!/usr/bin/env Rscript

message("=== DETAILED INTERNATIONAL DEBUG ===")
message(sprintf("Start time: %s", Sys.time()))
message(sprintf("Working directory: %s", getwd()))

suppressPackageStartupMessages({
  library(DBI)
  library(dplyr)
  library(purrr)
  library(netballR)
  library(RPostgres)
})

# Enhanced netballR test
message("\\n1. Detailed netballR testing...")
tryCatch({
  message("Loading netballR package...")
  if (!requireNamespace("netballR", quietly = TRUE)) {
    stop("netballR package not available")
  }
  message("✅ netballR package loaded")
  
  # Show package version
  desc <- packageDescription("netballR")
  message(sprintf("netballR version: %s", desc$Version))
  
  # List competitions
  message("\\nListing all competitions...")
  all_comps <- netballR::listCompetitionsNetballAus()
  message(sprintf("✅ Retrieved %d total competitions", nrow(all_comps)))
  
  # Show competition structure
  message("Competition data structure:")
  str(all_comps)
  
  # Look for Australian competitions
  message("\\nSearching for Australian competitions...")
  aus_comps <- subset(all_comps, grepl("Australia", competition_name, ignore.case = TRUE))
  diamonds_comps <- subset(all_comps, grepl("Diamonds", competition_name, ignore.case = TRUE))
  
  message(sprintf("Found %d Australia-related competitions", nrow(aus_comps)))
  message(sprintf("Found %d Diamonds-specific competitions", nrow(diamonds_comps)))
  
  if (nrow(aus_comps) > 0) {
    message("\\nAustralian competitions:")
    print(aus_comps[, c("comp_id", "competition_name", "season")])
  }
  
  combined_comps <- rbind(aus_comps, diamonds_comps)
  if (nrow(combined_comps) > 0) {
    # Test downloading fixture for first competition
    first_comp_id <- combined_comps$comp_id[1]
    first_comp_name <- combined_comps$competition_name[1]
    message(sprintf("\\nTesting fixture download for %s (ID: %s)...", first_comp_name, first_comp_id))
    
    fixture <- tryCatch({
      netballR::downloadFixture(first_comp_id)
    }, error = function(e) {
      message(sprintf("❌ Fixture download failed: %s", conditionMessage(e)))
      return(NULL)
    })
    
    if (!is.null(fixture)) {
      message(sprintf("✅ Successfully downloaded fixture with %d matches", nrow(fixture)))
      message("Fixture structure:")
      str(fixture)
      
      if (nrow(fixture) > 0) {
        message("\\nSample fixture data:")
        sample_cols <- intersect(c("matchId", "round", "game", "homeSquadName", "awaySquadName", "homeSquadScore", "awaySquadScore", "utcStartTime", "matchStatus"), names(fixture))
        print(head(fixture[sample_cols], 3))
        
        # Test data types
        message("\\nData type verification:")
        for(col in sample_cols) {
          if (col %in% names(fixture)) {
            message(sprintf("  %s: %s", col, class(fixture[[col]])))
          }
        }
      }
    } else {
      message("❌ Failed to download fixture")
    }
  } else {
    message("❌ No Australian/Diamonds competitions found")
  }
}, error = function(e) {
  message(sprintf("❌ netballR testing failed: %s", conditionMessage(e)))
  traceback()
})

# Enhanced database connection test
message("\\n\\n2. Detailed database connection testing...")
tryCatch({
  db_host <- Sys.getenv("NETBALL_STATS_DB_HOST", "localhost")
  db_port <- Sys.getenv("NETBALL_STATS_DB_PORT", "5432")
  db_name <- Sys.getenv("NETBALL_STATS_DB_NAME", "netballstats")
  db_user <- Sys.getenv("NETBALL_STATS_DB_USER", "netballstatsadmin")
  db_password <- Sys.getenv("NETBALL_STATS_DB_PASSWORD", "")
  
  message(sprintf("Database connection info:"))
  message(sprintf("  Host: %s", db_host))
  message(sprintf("  Port: %s", db_port))
  message(sprintf("  Database: %s", db_name))
  message(sprintf("  User: %s", db_user))
  message(sprintf("  Password provided: %s", ifelse(nchar(db_password) > 0, "YES", "NO")))
  
  if (nchar(db_password) == 0) {
    message("❌ No database password provided - skipping database tests")
  } else {
    message("Attempting database connection...")
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
    message("✅ Database connection successful")
    
    # Test basic query
    message("Testing basic query...")
    result <- dbGetQuery(con, "SELECT current_database(), current_user")
    message(sprintf("Connected to: %s as %s", result[1,1], result[1,2]))
    
    # Test table existence
    message("Testing international tables...")
    tables_exist <- dbExistsTable(con, "international_matches")
    message(sprintf("international_matches table exists: %s", ifelse(tables_exist, "YES", "NO")))
    
    if (tables_exist) {
      # Test simple insert
      message("Testing simple insert to international_matches...")
      dbExecute(con, "DELETE FROM international_matches WHERE match_id = -999999")  # Clean up any test data
      
      test_data <- data.frame(
        match_id = -999999,
        season = 2026,
        round_number = 1,
        game_number = 1,
        match_type = "test",
        match_status = "test",
        home_squad_id = 1,
        home_squad_name = "Test Home",
        away_squad_id = 2,
        away_squad_name = "Test Away", 
        home_score = 50,
        away_score = 45,
        local_start_time = "2026-01-01T10:00:00Z",
        utc_start_time = "2026-01-01T10:00:00Z"
      )
      
      tryCatch({
        # Insert test data with parameters
        dbExecute(con, "
          INSERT INTO international_matches (
            match_id, season, round_number, game_number, match_type, match_status,
            home_squad_id, home_squad_name, away_squad_id, away_squad_name,
            home_score, away_score, local_start_time, utc_start_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ", list(
          test_data$match_id, test_data$season, test_data$round_number, test_data$game_number,
          test_data$match_type, test_data$match_status, test_data$home_squad_id, test_data$home_squad_name,
          test_data$away_squad_id, test_data$away_squad_name, test_data$home_score, test_data$away_score,
          test_data$local_start_time, test_data$utc_start_time
        ))
        message("✅ Simple insert test successful")
        
        # Verify insert
        verify_result <- dbGetQuery(con, "SELECT COUNT(*) FROM international_matches WHERE match_id = -999999")
        message(sprintf("Verified %d rows inserted", verify_result[1,1]))
        
        # Clean up
        dbExecute(con, "DELETE FROM international_matches WHERE match_id = -999999")
        
      }, error = function(e) {
        message(sprintf("❌ Database insert failed: %s", conditionMessage(e)))
      })
    }
    
    dbDisconnect(con)
    message("✅ Database connection tests completed")
  }
}, error = function(e) {
  message(sprintf("❌ Database testing failed: %s", conditionMessage(e)))
  traceback()
})

message("\\n=== DEBUG COMPLETE ===")
message(sprintf("End time: %s", Sys.time()))