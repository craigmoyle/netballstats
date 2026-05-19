#!/usr/bin/env Rscript

message("=== COMPREHENSIVE DIAGNOSTIC TEST ===")
message(sprintf("Test started at: %s", Sys.time()))

# Load libraries with explicit error checking
message("\n1. Testing library loading...")

required_packages <- c("DBI", "dplyr", "purrr", "netballR", "RPostgres")
missing_packages <- c()

for (pkg in required_packages) {
  message(sprintf("  Checking %s...", pkg))
  if (requireNamespace(pkg, quietly = TRUE)) {
    library(pkg, character.only = TRUE)
    message(sprintf("    ✅ %s: LOADED", pkg))
  } else {
    message(sprintf("    ❌ %s: MISSING", pkg))
    missing_packages <- c(missing_packages, pkg)
  }
}

if (length(missing_packages) > 0) {
  message(sprintf("FATAL: Missing required packages: %s", paste(missing_packages, collapse = ", ")))
  quit(status = 1)
}

message("\n2. Testing environment variables...")
env_vars <- c(
  "NETBALL_STATS_DB_HOST",
  "NETBALL_STATS_DB_PORT", 
  "NETBALL_STATS_DB_NAME",
  "NETBALL_STATS_DB_USER",
  "NETBALL_STATS_DB_PASSWORD"
)

all_env_set <- TRUE
for (var in env_vars) {
  value <- Sys.getenv(var, unset = "")
  if (nzchar(value)) {
    message(sprintf("  ✅ %s: SET", var))
    # Don't print the password value for security
    if (!grepl("PASSWORD", var)) {
      message(sprintf("     Value: %s", value))
    }
  } else {
    message(sprintf("  ❌ %s: NOT SET", var))
    all_env_set <- FALSE
  }
}

if (!all_env_set) {
  message("FATAL: Some required environment variables are not set")
  quit(status = 1)
}

message("\n3. Testing database connection...")
db_host <- Sys.getenv("NETBALL_STATS_DB_HOST")
db_port <- as.integer(Sys.getenv("NETBALL_STATS_DB_PORT"))
db_name <- Sys.getenv("NETBALL_STATS_DB_NAME")
db_user <- Sys.getenv("NETBALL_STATS_DB_USER")
db_password <- Sys.getenv("NETBALL_STATS_DB_PASSWORD")

conn <- tryCatch({
  message(sprintf("  Connecting to %s:%s/%s as %s...", db_host, db_port, db_name, db_user))
  con <- dbConnect(
    RPostgres::Postgres(),
    host = db_host,
    port = db_port,
    dbname = db_name,
    user = db_user,
    password = db_password,
    bigint = "integer",
    timezone = "UTC"
  )
  message("  ✅ Database connection successful!")
  con
}, error = function(e) {
  message(sprintf("  ❌ Database connection failed: %s", conditionMessage(e)))
  NULL
})

if (is.null(conn)) {
  message("FATAL: Could not connect to database")
  quit(status = 1)
}

# Test simple query
message("\n4. Testing database query...")
test_query <- tryCatch({
  result <- dbGetQuery(conn, "SELECT current_database(), current_user, version()")
  message("  ✅ Query execution successful!")
  message(sprintf("     Database: %s", result[1,1]))
  message(sprintf("     User: %s", result[1,2]))
  message(sprintf("     Version: %s", substr(result[1,3], 1, 50))) # Truncate long version string
  TRUE
}, error = function(e) {
  message(sprintf("  ❌ Query execution failed: %s", conditionMessage(e)))
  FALSE
})

if (!test_query) {
  dbDisconnect(conn)
  quit(status = 1)
}

message("\n5. Testing netballR package functionality...")

# Test listing competitions
message("  Testing listCompetitionsNetballAus()...")
competitions <- tryCatch({
  comps <- netballR::listCompetitionsNetballAus()
  message(sprintf("    ✅ Got %d competitions from netballR", nrow(comps)))
  comps
}, error = function(e) {
  message(sprintf("    ❌ Error calling listCompetitionsNetballAus: %s", conditionMessage(e)))
  NULL
})

if (is.null(competitions)) {
  message("FATAL: Cannot access netballR competitions data")
  dbDisconnect(conn)
  quit(status = 1)
}

# Look for Diamonds competitions
diamonds_comps <- subset(competitions, grepl("Diamonds", competition_name, ignore.case = TRUE))
message(sprintf("  Found %d Australian Diamonds competitions", nrow(diamonds_comps)))

if (nrow(diamonds_comps) == 0) {
  message("  Available competitions:")
  print(head(competitions[, c("comp_id", "competition_name", "year")], 10))
  message("FATAL: No Australian Diamonds competitions found")
  dbDisconnect(conn)
  quit(status = 1)
}

# Test downloading fixture for first competition
first_diamonds_comp <- diamonds_comps[1,]
message(sprintf("  Testing downloadFixture() for competition %s...", first_diamonds_comp$comp_id))
fixture <- tryCatch({
  fixt <- netballR::downloadFixture(first_diamonds_comp$comp_id)
  message(sprintf("    ✅ Downloaded %d matches", nrow(fixt)))
  if (nrow(fixt) > 0) {
    message("    Sample data:")
    print(head(fixt[, c("matchId", "homeSquadName", "awaySquadName", "homeSquadScore", "awaySquadScore")], 3))
  }
  fixt
}, error = function(e) {
  message(sprintf("    ❌ Error downloading fixture: %s", conditionMessage(e)))
  NULL
})

if (is.null(fixture)) {
  message("FATAL: Cannot download fixture data")
  dbDisconnect(conn)
  quit(status = 1)
}

message("\n6. Testing database write operations...")

# Test creating a temporary test table
test_table_name <- "temp_diagnostic_test_table"
message(sprintf("  Creating test table '%s'...", test_table_name))

create_result <- tryCatch({
  # Drop table if exists
  dbExecute(conn, sprintf("DROP TABLE IF EXISTS %s", test_table_name))
  
  # Create test table
  dbExecute(conn, sprintf("
    CREATE TABLE %s (
      id SERIAL PRIMARY KEY,
      test_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      test_data TEXT
    )", test_table_name))
  message("    ✅ Test table created successfully")
  TRUE
}, error = function(e) {
  message(sprintf("    ❌ Failed to create test table: %s", conditionMessage(e)))
  FALSE
})

if (!create_result) {
  message("WARNING: Cannot create test table (may lack permissions)")
} else {
  # Test inserting data
  insert_result <- tryCatch({
    dbExecute(conn, sprintf("
      INSERT INTO %s (test_data) VALUES ($1)
    ", test_table_name), params = list("Diagnostic test successful"))
    message("    ✅ Test data inserted successfully")
    
    # Test querying data
    query_result <- dbGetQuery(conn, sprintf("SELECT COUNT(*) as count FROM %s", test_table_name))
    message(sprintf("    ✅ Test table contains %d rows", query_result[1,1]))
    
    # Clean up
    dbExecute(conn, sprintf("DROP TABLE %s", test_table_name))
    message("    ✅ Test table cleaned up")
    
    TRUE
  }, error = function(e) {
    message(sprintf("    ❌ Failed to insert/query test data: %s", conditionMessage(e)))
    FALSE
  })
  
  if (!insert_result) {
    message("WARNING: Cannot perform write operations")
  }
}

# Clean up connection
dbDisconnect(conn)

message("\n=== COMPREHENSIVE DIAGNOSTIC TEST COMPLETE ===")
message("✅ All critical systems are functioning properly!")
message(sprintf("Test completed at: %s", Sys.time()))