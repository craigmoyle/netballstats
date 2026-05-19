#!/usr/bin/env Rscript

message("=== DEBUG INTERNATIONAL DATABASE BUILD ===")
message(sprintf("Starting at: %s", Sys.time()))

suppressPackageStartupMessages({
  library(DBI)
  library(dplyr)
  library(purrr)
  library(netballR)
  library(RPostgres)
})

# Connect to database
connect_db <- function() {
  db_host <- Sys.getenv("NETBALL_STATS_DB_HOST", "localhost")
  db_port <- Sys.getenv("NETBALL_STATS_DB_PORT", "5432")
  db_name <- Sys.getenv("NETBALL_STATS_DB_NAME", "netballstats")
  db_user <- Sys.getenv("NETBALL_STATS_DB_USER", "netballstatsadmin")
  db_password <- Sys.getenv("NETBALL_STATS_DB_PASSWORD", "")
  
  message(sprintf("Attempting connection to %s:%s/%s as %s", db_host, db_port, db_name, db_user))
  
  if (nchar(db_password) == 0) {
    message("❌ No password provided")
    return(NULL)
  }
  
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
    message("✅ Database connection successful")
    return(con)
  }, error = function(e) {
    message(sprintf("❌ Database connection failed: %s", conditionMessage(e)))
    return(NULL)
  })
}

# Test netballR functionality
test_netballr <- function() {
  message("\\n=== Testing netballR Package ===")
  
  # Test 1: Check if package loads
  if (!requireNamespace("netballR", quietly = TRUE)) {
    message("❌ netballR package not available")
    return(FALSE)
  }
  message("✅ netballR package loaded")
  
  # Test 2: List competitions
  message("\\nAttempting to list competitions...")
  competitions <- tryCatch({
    result <- netballR::listCompetitionsNetballAus()
    message(sprintf("✅ Got %d competitions", nrow(result)))
    if (nrow(result) > 0) {
      message("First few competitions:")
      print(head(result[, c("comp_id", "competition_name", "year")], 3))
    }
    result
  }, error = function(e) {
    message(sprintf("❌ Failed to list competitions: %s", conditionMessage(e)))
    return(NULL)
  })
  
  if (is.null(competitions) || nrow(competitions) == 0) {
    message("❌ No competitions found")
    return(FALSE)
  }
  
  # Look for Diamonds competitions
  diamonds_comps <- subset(competitions, grepl("Diamonds", competition_name, ignore.case = TRUE))
  if (nrow(diamonds_comps) == 0) {
    message("❌ No Australian Diamonds competitions found")
    message("Available competitions:")
    print(head(competitions[, c("comp_id", "competition_name", "year")], 10))
    return(FALSE)
  }
  
  message(sprintf("✅ Found %d Australian Diamonds competitions", nrow(diamonds_comps)))
  
  # Test 3: Download fixture for first competition
  first_comp_id <- diamonds_comps$comp_id[1]
  message(sprintf("\\nAttempting to download fixture for competition %s...", first_comp_id))
  
  fixture <- tryCatch({
    result <- netballR::downloadFixture(first_comp_id)
    message(sprintf("✅ Fixture download successful: %d matches", nrow(result)))
    if (nrow(result) > 0) {
      message("Sample columns:")
      print(names(result))
      message("Sample data:")
      print(head(result, 2))
    }
    result
  }, error = function(e) {
    message(sprintf("❌ Fixture download failed: %s", conditionMessage(e)))
    return(NULL)
  })
  
  if (is.null(fixture)) {
    return(FALSE)
  }
  
  message("✅ All netballR tests passed")
  return(TRUE)
}

# Test database operations
test_database <- function() {
  message("\\n=== Testing Database Operations ===")
  
  conn <- connect_db()
  if (is.null(conn)) {
    return(FALSE)
  }
  
  # Test basic query
  message("Testing basic database query...")
  tryCatch({
    result <- dbGetQuery(conn, "SELECT current_database(), current_user")
    message(sprintf("✅ Connected to database: %s as user: %s", result[1,1], result[1,2]))
  }, error = function(e) {
    message(sprintf("❌ Basic query failed: %s", conditionMessage(e)))
    dbDisconnect(conn)
    return(FALSE)
  })
  
  # Test table creation
  message("Testing international table creation...")
  tryCatch({
    dbExecute(conn, "DROP TABLE IF EXISTS test_intl_temp")
    dbExecute(conn, "
      CREATE TABLE test_intl_temp (
        id SERIAL PRIMARY KEY,
        test_value VARCHAR(50)
      )
    ")
    dbExecute(conn, "INSERT INTO test_intl_temp (test_value) VALUES ('test')")
    result <- dbGetQuery(conn, "SELECT COUNT(*) FROM test_intl_temp")
    message(sprintf("✅ Table creation and insert successful: %d rows", result[1,1]))
    dbExecute(conn, "DROP TABLE IF EXISTS test_intl_temp")
  }, error = function(e) {
    message(sprintf("❌ Table operations failed: %s", conditionMessage(e)))
    dbDisconnect(conn)
    return(FALSE)
  })
  
  dbDisconnect(conn)
  message("✅ All database tests passed")
  return(TRUE)
}

# Main execution
main <- function() {
  message("=== STARTING DEBUG EXECUTION ===")
  
  # Show environment
  message(sprintf("NETBALL_STATS_DB_HOST: %s", Sys.getenv("NETBALL_STATS_DB_HOST", "<not set>")))
  message(sprintf("NETBALL_STATS_DB_USER: %s", Sys.getenv("NETBALL_STATS_DB_USER", "<not set>")))
  
  # Test components
  netballr_ok <- test_netballr()
  database_ok <- test_database()
  
  message("\\n=== DEBUG SUMMARY ===")
  message(sprintf("netballR functionality: %s", ifelse(netballr_ok, "✅ PASS", "❌ FAIL")))
  message(sprintf("Database operations: %s", ifelse(database_ok, "✅ PASS", "❌ FAIL")))
  
  if (netballr_ok && database_ok) {
    message("🎉 All systems operational!")
    return(0)
  } else {
    message("❌ Some components failed")
    return(1)
  }
}

# Run main function
exit_code <- main()
message(sprintf("\\nExiting with code: %d", exit_code))
quit(status = exit_code)