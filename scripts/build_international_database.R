#!/usr/bin/env Rscript

api_log("INFO", "=== INTERNATIONAL NETBALL DATABASE BUILD ===")
api_log("INFO", sprintf("Timestamp: %s", Sys.time()))
api_log("INFO", sprintf("Process ID: %s", Sys.getpid()))
api_log("INFO", sprintf("Working directory: %s", getwd()))
api_log("INFO", sprintf("R version: %s", R.version.string))

# International Netball Database Builder
#
# This script builds the international netball database using the netballR package
# to fetch data from Champion Data for Australian Diamonds and other international
# competitions.

suppressPackageStartupMessages({
  library(DBI)
  library(dplyr)
  library(purrr)
  library(netballR)
  library(RPostgres)
  library(httr)
  library(jsonlite)
})

script_path <- function() {
  file_arg <- grep("^--file=", commandArgs(), value = TRUE)
  if (!length(file_arg)) {
    return(normalizePath(".", mustWork = FALSE))
  }

  normalizePath(sub("^--file=", "", file_arg[[1]]), mustWork = FALSE)
}

repo_root_path <- normalizePath(file.path(dirname(script_path()), ".."), mustWork = FALSE)
source(file.path(repo_root_path, "R", "database.R"), local = TRUE)
source(file.path(repo_root_path, "R", "bootstrap_fixtures.R"), local = TRUE)
source(file.path(repo_root_path, "R", "player_reference.R"), local = TRUE)
source(file.path(repo_root_path, "api", "R", "helpers.R"), local = TRUE)
config_path <- file.path(repo_root_path, "config", "international_competitions.csv")
sample_mode <- identical(tolower(Sys.getenv("NETBALL_STATS_INTERNATIONAL_SAMPLE", "false")), "true")

if (!nzchar(Sys.getenv("NETBALL_STATS_DB_STATEMENT_TIMEOUT_MS", ""))) {
  Sys.setenv(NETBALL_STATS_DB_STATEMENT_TIMEOUT_MS = "0")
}

# Logging helper with severity levels
api_log <- function(level = "INFO", msg) {
  timestamp <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  cat(sprintf("[%s] %s: %s\n", timestamp, level, msg))
}

# Database connection function
connect_db <- function() {
  db_host <- Sys.getenv("NETBALL_STATS_DB_HOST", "localhost")
  db_port <- Sys.getenv("NETBALL_STATS_DB_PORT", "5432")
  db_name <- Sys.getenv("NETBALL_STATS_DB_NAME", "netballstats")
  db_user <- Sys.getenv("NETBALL_STATS_DB_USER", "netballstatsadmin")
  db_password <- Sys.getenv("NETBALL_STATS_DB_PASSWORD", "")
  require_db_connection <- identical(tolower(Sys.getenv("NETBALL_STATS_REQUIRE_DB_CONNECTION", "false")), "true")
  
  api_log("INFO", "== DATABASE CONNECTION ATTEMPT ==")
  api_log("INFO", sprintf("Host: %s", db_host))
  api_log("INFO", sprintf("Port: %s", db_port))
  api_log("INFO", sprintf("Database: %s", db_name))
  api_log("INFO", sprintf("User: %s", db_user))
  api_log("INFO", sprintf("Password provided: %s", ifelse(nzchar(db_password), "YES", "NO")))
  
  # Check if DB connection is required in production mode
  if (nchar(db_password) == 0) {
    if (require_db_connection) {
      api_log("ERROR", "No database password provided. NETBALL_STATS_REQUIRE_DB_CONNECTION is true; exiting.")
      stop("Database connection required but password not provided.", call. = FALSE)
    } else {
      api_log("INFO", "No database password provided. Running in demonstration mode.")
      return(NULL)
    }
  }
  
  api_log("INFO", "Attempting database connection...")
  
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
    api_log("INFO", "Database connection SUCCESSFUL")
    
    # Apply statement timeout if set
    statement_timeout_ms <- Sys.getenv("NETBALL_STATS_DB_STATEMENT_TIMEOUT_MS", "")
    if (nzchar(statement_timeout_ms)) {
      dbExecute(con, sprintf("SET statement_timeout = %s", statement_timeout_ms))
    }
    
    # Test the connection with a simple query
    test_result <- dbGetQuery(con, "SELECT current_database(), current_user")
    api_log("INFO", sprintf("Connected to database: %s", test_result[1,1]))
    api_log("INFO", sprintf("Connected as user: %s", test_result[1,2]))
    
    return(con)
  }, error = function(e) {
    error_msg <- sprintf("Database connection FAILED: %s", conditionMessage(e))
    api_log("ERROR", error_msg)
    if (require_db_connection) {
      stop(error_msg, call. = FALSE)
    }
    return(NULL)
  })
}

# Wrapper for netballR API calls with consistent error handling
# Returns list(success=TRUE, data=result) or list(success=FALSE, error=msg)
wrap_netball_api_call <- function(fn, ..., operation = "API call") {
  tryCatch({
    result <- fn(...)
    list(success = TRUE, data = result)
  }, error = function(e) {
    api_log("ERROR", sprintf("%s failed: %s", operation, conditionMessage(e)))
    list(success = FALSE, error = conditionMessage(e), data = NULL)
  }, warning = function(w) {
    api_log("WARN", sprintf("%s warning: %s", operation, conditionMessage(w)))
    # Don't stop on warning, allow caller to decide
    invokeRestart("muffleWarning")
  })
}

# Get competitions across all supported international sources
get_all_international_competitions <- function() {
  api_log("INFO", "Discovering all international netball competitions...")

  if (!requireNamespace("netballR", quietly = TRUE)) {
    api_log("ERROR", "netballR package NOT FOUND")
    return(data.frame())
  }
  desc <- packageDescription("netballR")
  api_log("INFO", sprintf("netballR version: %s", desc$Version))

  # All 5 international sources plus netball_aus for Diamonds
  sources <- c("netball_aus", "netball_nz", "england_netball", "nwc2015", "nwc2019", "nwc2023")

  api_log("INFO", sprintf("Fetching competitions from %d sources...", length(sources)))
  comp_result <- wrap_netball_api_call(
    netballR::listAllCompetitions,
    sources = sources,
    deduplicate = TRUE,
    on_error = "warn",
    operation = "listAllCompetitions"
  )

  if (!comp_result$success) {
    api_log("ERROR", "Failed to fetch competitions; gracefully degrading")
    return(data.frame())
  }

  all_comps <- comp_result$data
  if (nrow(all_comps) == 0) {
    api_log("WARN", "No competitions returned")
    return(data.frame())
  }

  api_log("INFO", sprintf("Got %d unique competitions across all sources", nrow(all_comps)))

  # Exclude men's and youth competitions
  filtered <- all_comps %>%
    dplyr::filter(!grepl("Men's|Mens|U19|U-19|Under.19|Boys", competition_name, ignore.case = TRUE))

  api_log("INFO", sprintf("After filtering: %d competitions to process", nrow(filtered)))
  api_log("INFO", "Competitions list:")
  print(filtered %>% dplyr::select(comp_id, competition_name, application_source, season))

  filtered$competition_id <- as.integer(filtered$comp_id)
  filtered
}

# Safe number conversion
safe_convert_number <- function(x) {
  result <- suppressWarnings(as.numeric(as.character(x)))
  ifelse(is.na(result), 0, result)
}

# Process match data for international competitions
process_match_data <- function(fixture_data) {
  api_log("INFO", "Processing match data...")
  
  # Validate input data
  if (is.null(fixture_data) || nrow(fixture_data) == 0) {
    api_log("WARN", "⚠️  No fixture data to process")
    return(data.frame())
  }
  
  # Check required columns
  required_columns <- c("matchId", "utcStartTime", "round", "game", "homeSquadId", "awaySquadId", "homeSquadScore", "awaySquadScore", "matchStatus", "homeSquadName", "awaySquadName")
  missing_columns <- required_columns[!required_columns %in% names(fixture_data)]
  if (length(missing_columns) > 0) {
    api_log("ERROR", sprintf("❌ Missing required columns: %s", paste(missing_columns, collapse = ", ")))
    api_log("INFO", "Available columns:")
    print(names(fixture_data))
    return(data.frame())
  }
  
  matches_df <- fixture_data %>%
    mutate(
      match_id = as.integer(matchId),
      season = as.integer(format(as.POSIXct(utcStartTime), "%Y")),
      round_number = as.integer(round),
      game_number = as.integer(game),
      home_squad_id = as.integer(homeSquadId),
      away_squad_id = as.integer(awaySquadId),
      home_score = safe_convert_number(homeSquadScore),
      away_score = safe_convert_number(awaySquadScore),
      local_start_time = utcStartTime,
      utc_start_time = utcStartTime,
      match_status = matchStatus,
      match_type = "international"
    ) %>%
    select(
      match_id, season, round_number, game_number, match_type, match_status,
      home_squad_id, home_squad_name = homeSquadName, away_squad_id, away_squad_name = awaySquadName,
      home_score, away_score, local_start_time, utc_start_time
    )
  
  api_log("INFO", sprintf("Processed %d matches", nrow(matches_df)))
  return(matches_df)
}

# Extract unique teams from match data
extract_teams <- function(matches_df) {
  api_log("INFO", "Extracting teams...")
  
  home_teams <- matches_df %>%
    select(squad_id = home_squad_id, squad_name = home_squad_name) %>%
    distinct()
  
  away_teams <- matches_df %>%
    select(squad_id = away_squad_id, squad_name = away_squad_name) %>%
    distinct()
  
  teams_df <- bind_rows(home_teams, away_teams) %>%
    distinct(squad_id, squad_name)
  
  api_log("INFO", sprintf("Extracted %d unique teams", nrow(teams_df)))
  return(teams_df)
}

# Create international tables
create_international_tables <- function(conn) {
  if (is.null(conn)) {
    api_log("INFO", "Demonstration mode: Would create international tables")
    return()
  }
  
  api_log("INFO", "Creating international tables...")
  
  # Create international_matches table
  dbExecute(conn, "
    CREATE TABLE IF NOT EXISTS international_matches (
      match_id INTEGER PRIMARY KEY,
      season INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      game_number INTEGER NOT NULL,
      match_type VARCHAR(50) NOT NULL,
      competition_name TEXT,
      match_status VARCHAR(50) NOT NULL,
      home_squad_id INTEGER NOT NULL,
      home_squad_name VARCHAR(100) NOT NULL,
      away_squad_id INTEGER NOT NULL,
      away_squad_name VARCHAR(100) NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      local_start_time TEXT NOT NULL,
      utc_start_time TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ")
  
  # Create international_teams table
  dbExecute(conn, "
    CREATE TABLE IF NOT EXISTS international_teams (
      squad_id INTEGER PRIMARY KEY,
      squad_name VARCHAR(100) NOT NULL,
      squad_nickname VARCHAR(100),
      squad_code VARCHAR(10),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ")
  
  # Create international_players table
  dbExecute(conn, "
    CREATE TABLE IF NOT EXISTS international_players (
      player_id INTEGER PRIMARY KEY,
      firstname VARCHAR(50) NOT NULL,
      surname VARCHAR(50) NOT NULL,
      short_display_name VARCHAR(100),
      player_name VARCHAR(100) NOT NULL,
      canonical_name VARCHAR(100) NOT NULL,
      search_name VARCHAR(100),
      squad_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ")
  
  # Create international_player_match_stats table
  dbExecute(conn, "
    CREATE TABLE IF NOT EXISTS international_player_match_stats (
      player_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      squad_id INTEGER NOT NULL,
      season INTEGER NOT NULL,
      squad_name VARCHAR(100) NOT NULL,
      stat VARCHAR(50) NOT NULL,
      match_value NUMERIC,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, match_id, stat)
    )
  ")

  # Create international_player_match_participation table
  dbExecute(conn, "
    CREATE TABLE IF NOT EXISTS international_player_match_participation (
      player_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      squad_id INTEGER NOT NULL,
      season INTEGER NOT NULL,
      starting_position_code VARCHAR(5),
      current_position_code VARCHAR(5),
      quarters_played INTEGER,
      minutes_played NUMERIC,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, match_id)
    )
  ")

  # Create international_team_match_stats table
  dbExecute(conn, "
    CREATE TABLE IF NOT EXISTS international_team_match_stats (
      squad_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      season INTEGER NOT NULL,
      squad_name VARCHAR(100) NOT NULL,
      stat VARCHAR(50) NOT NULL,
      match_value NUMERIC,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (squad_id, match_id, stat)
    )
  ")

  # Create international_player_reference table
  dbExecute(conn, "
    CREATE TABLE IF NOT EXISTS international_player_reference (
      player_id INTEGER PRIMARY KEY,
      date_of_birth TEXT,
      nationality TEXT,
      debut_season INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ")
  
  # Create indexes for better query performance
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_matches_season ON international_matches(season)")

  # Migration: add competition_name column to existing tables
  tryCatch({
    dbExecute(conn, "ALTER TABLE international_matches ADD COLUMN IF NOT EXISTS competition_name TEXT")
    api_log("INFO", "  ✅ competition_name column ensured on international_matches")
  }, error = function(e) {
    api_log("INFO", sprintf("  ℹ️ competition_name migration skipped: %s", conditionMessage(e)))
  })
  tryCatch({
    dbExecute(conn, "ALTER TABLE international_matches ADD COLUMN IF NOT EXISTS application_source TEXT")
    api_log("INFO", "  ✅ application_source column ensured on international_matches")
  }, error = function(e) {
    api_log("INFO", sprintf("  ℹ️ application_source migration skipped: %s", conditionMessage(e)))
  })
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_player_stats_player ON international_player_match_stats(player_id)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_player_stats_match ON international_player_match_stats(match_id)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_player_stats_stat ON international_player_match_stats(stat)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_participation_player ON international_player_match_participation(player_id)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_participation_match ON international_player_match_participation(match_id)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_team_stats_match ON international_team_match_stats(match_id)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_team_stats_stat ON international_team_match_stats(stat)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_players_search_name ON international_players(search_name)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_pms_stat_season_player ON international_player_match_stats(stat, season, player_id)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_pms_player_stat_value ON international_player_match_stats(player_id, stat, match_value DESC)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_matches_comp_season ON international_matches(competition_name, season)")
  tryCatch({
    dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_matches_complete_start ON international_matches(utc_start_time DESC) WHERE match_status = 'complete'")
  }, error = function(e) {
    api_log("WARN", sprintf("Could not create partial match index: %s", conditionMessage(e)))
  })
  
  # pg_trgm GIN index for search_name matching Super Netball behavior, wrapped in tryCatch for SQLite compatibility
  tryCatch({
    dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_players_search_trgm ON international_players USING gin(search_name gin_trgm_ops)")
  }, error = function(e) {
    api_log("WARN", sprintf("Could not create trigram index (expected if running on SQLite): %s", conditionMessage(e)))
  })
  
  api_log("INFO", "International tables created successfully")
}

# Insert matches data
insert_matches <- function(conn, matches_df) {
  if (is.null(conn) || nrow(matches_df) == 0) {
    return()
  }
  
  api_log("INFO", sprintf("Inserting %d matches...", nrow(matches_df)))
  
  match_ids <- matches_df$match_id
  if (length(match_ids) > 0) {
    param_placeholders <- paste(paste0("$", seq_along(match_ids)), collapse = ",")
    delete_sql <- paste("DELETE FROM international_matches WHERE match_id IN (", param_placeholders, ")")
    tryCatch({
      dbExecute(conn, delete_sql, as.list(match_ids))
      api_log("INFO", sprintf("Deleted %d existing matches", length(match_ids)))
    }, error = function(e) {
      api_log("WARN", sprintf("Warning: Failed to delete existing matches: %s", conditionMessage(e)))
    })
  }

  output <- as.data.frame(matches_df, stringsAsFactors = FALSE)
  if (!"competition_name" %in% names(output)) {
    output$competition_name <- NA_character_
  }
  if (!"application_source" %in% names(output)) {
    output$application_source <- NA_character_
  }

  cols <- c(
    "match_id", "season", "round_number", "game_number", "match_type", "competition_name",
    "match_status", "home_squad_id", "home_squad_name", "away_squad_id", "away_squad_name",
    "home_score", "away_score", "local_start_time", "utc_start_time", "application_source"
  )
  output <- output[, cols, drop = FALSE]

  tryCatch({
    DBI::dbWriteTable(conn, DBI::Id(table = "international_matches"), output, append = TRUE, row.names = FALSE)
    api_log("INFO", sprintf("Successfully inserted %d matches", nrow(output)))
  }, error = function(e) {
    api_log("ERROR", sprintf("Failed to bulk insert matches: %s", conditionMessage(e)))
  })
}

# Insert teams data
insert_teams <- function(conn, teams_df) {
  if (is.null(conn) || nrow(teams_df) == 0) {
    return()
  }
  
  api_log("INFO", sprintf("Inserting %d teams...", nrow(teams_df)))

  output <- unique(as.data.frame(
    teams_df[, c("squad_id", "squad_name"), drop = FALSE],
    stringsAsFactors = FALSE
  ))

  tryCatch({
    DBI::dbWriteTable(conn, DBI::Id(table = "temp_intl_teams"), output, temporary = TRUE, overwrite = TRUE, row.names = FALSE)
    dbExecute(conn, "
      INSERT INTO international_teams (squad_id, squad_name)
      SELECT squad_id, squad_name FROM temp_intl_teams
      ON CONFLICT (squad_id) DO UPDATE SET squad_name = EXCLUDED.squad_name
    ")
    api_log("INFO", sprintf("Successfully upserted %d teams", nrow(output)))
  }, error = function(e) {
    api_log("ERROR", sprintf("Failed to bulk upsert teams: %s", conditionMessage(e)))
  })
}

# Insert players data (placeholder - would need actual player data)
insert_players <- function(conn, players_df) {
  if (is.null(conn) || nrow(players_df) == 0) {
    return()
  }
  
  api_log("INFO", sprintf("Inserting %d players...", nrow(players_df)))

  output <- as.data.frame(players_df, stringsAsFactors = FALSE)
  output$search_name <- vapply(output$canonical_name, normalize_player_search_name, character(1))
  cols <- c(
    "player_id", "firstname", "surname", "short_display_name",
    "player_name", "canonical_name", "search_name"
  )
  output <- output[, cols, drop = FALSE]

  tryCatch({
    DBI::dbWriteTable(conn, DBI::Id(table = "temp_intl_players"), output, temporary = TRUE, overwrite = TRUE, row.names = FALSE)
    dbExecute(conn, "
      INSERT INTO international_players (
        player_id, firstname, surname, short_display_name, player_name, canonical_name, search_name
      )
      SELECT player_id, firstname, surname, short_display_name, player_name, canonical_name, search_name
      FROM temp_intl_players
      ON CONFLICT (player_id) DO UPDATE SET
        firstname = EXCLUDED.firstname,
        surname = EXCLUDED.surname,
        short_display_name = EXCLUDED.short_display_name,
        player_name = EXCLUDED.player_name,
        canonical_name = EXCLUDED.canonical_name,
        search_name = EXCLUDED.search_name
    ")
    api_log("INFO", sprintf("Successfully upserted %d players", nrow(output)))
  }, error = function(e) {
    api_log("ERROR", sprintf("Failed to bulk upsert players: %s", conditionMessage(e)))
  })
}

# Insert player stats data using bulk insert for performance
insert_player_stats <- function(conn, stats_df) {
  if (is.null(conn) || nrow(stats_df) == 0) {
    return()
  }

  api_log("INFO", sprintf("Inserting %d player stats rows...", nrow(stats_df)))

  match_ids <- unique(stats_df$match_id)
  if (length(match_ids) > 0) {
    param_placeholders <- paste(paste0("$", seq_along(match_ids)), collapse = ",")
    delete_sql <- paste("DELETE FROM international_player_match_stats WHERE match_id IN (", param_placeholders, ")")
    tryCatch(
      dbExecute(conn, delete_sql, as.list(match_ids)),
      error = function(e) api_log("WARN", sprintf("⚠️  Warning: Failed to delete existing stats: %s", conditionMessage(e)))
    )
  }

  tryCatch({
    DBI::dbWriteTable(conn, "international_player_match_stats", stats_df, append = TRUE, row.names = FALSE)
    api_log("INFO", sprintf("✅ Inserted %d player stat rows", nrow(stats_df)))
  }, error = function(e) {
    api_log("WARN", sprintf("⚠️ Bulk insert failed, falling back to row-by-row: %s", substr(conditionMessage(e), 1, 100)))
    success_count <- 0L
    for (i in seq_len(nrow(stats_df))) {
      row <- stats_df[i, ]
      tryCatch({
        dbExecute(conn, "
          INSERT INTO international_player_match_stats (
            player_id, match_id, squad_id, season, squad_name, stat, match_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ", list(row$player_id, row$match_id, row$squad_id, row$season, row$squad_name, row$stat, row$match_value))
        success_count <- success_count + 1L
      }, error = function(e2) {
        api_log("INFO", sprintf("  ❌ Row %d: %s", i, substr(conditionMessage(e2), 1, 60)))
      })
    }
    api_log("INFO", sprintf("✅ Row-by-row: inserted %d/%d", success_count, nrow(stats_df)))
  })
}

# Insert player participation data using bulk insert for performance
insert_player_participation <- function(conn, participation_df) {
  if (is.null(conn) || nrow(participation_df) == 0) {
    return()
  }

  api_log("INFO", sprintf("Inserting %d participation rows...", nrow(participation_df)))

  match_ids <- unique(participation_df$match_id)
  if (length(match_ids) > 0) {
    param_placeholders <- paste(paste0("$", seq_along(match_ids)), collapse = ",")
    delete_sql <- paste("DELETE FROM international_player_match_participation WHERE match_id IN (", param_placeholders, ")")
    tryCatch(
      dbExecute(conn, delete_sql, as.list(match_ids)),
      error = function(e) api_log("WARN", sprintf("⚠️  Warning: Failed to delete existing participation: %s", conditionMessage(e)))
    )
  }

  tryCatch({
    DBI::dbWriteTable(conn, "international_player_match_participation", participation_df, append = TRUE, row.names = FALSE)
    api_log("INFO", sprintf("✅ Inserted %d participation rows", nrow(participation_df)))
  }, error = function(e) {
    api_log("WARN", sprintf("⚠️ Bulk insert failed, falling back to row-by-row: %s", substr(conditionMessage(e), 1, 100)))
    success_count <- 0L
    for (i in seq_len(nrow(participation_df))) {
      row <- participation_df[i, ]
      tryCatch({
        dbExecute(conn, "
          INSERT INTO international_player_match_participation (
            player_id, match_id, squad_id, season, starting_position_code, current_position_code,
            quarters_played, minutes_played
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ", list(
          row$player_id, row$match_id, row$squad_id, row$season, row$starting_position_code,
          row$current_position_code, row$quarters_played, row$minutes_played
        ))
        success_count <- success_count + 1L
      }, error = function(e2) {
        api_log("INFO", sprintf("  ❌ Row %d: %s", i, substr(conditionMessage(e2), 1, 60)))
      })
    }
    api_log("INFO", sprintf("✅ Row-by-row: inserted %d/%d", success_count, nrow(participation_df)))
  })
}

# Insert team stats data using bulk insert for performance
insert_team_stats <- function(conn, team_stats_df) {
  if (is.null(conn) || nrow(team_stats_df) == 0) {
    return()
  }

  api_log("INFO", sprintf("Inserting %d team stats rows...", nrow(team_stats_df)))

  match_ids <- unique(team_stats_df$match_id)
  if (length(match_ids) > 0) {
    param_placeholders <- paste(paste0("$", seq_along(match_ids)), collapse = ",")
    delete_sql <- paste("DELETE FROM international_team_match_stats WHERE match_id IN (", param_placeholders, ")")
    tryCatch(
      dbExecute(conn, delete_sql, as.list(match_ids)),
      error = function(e) api_log("WARN", sprintf("⚠️  Warning: Failed to delete existing team stats: %s", conditionMessage(e)))
    )
  }

  tryCatch({
    DBI::dbWriteTable(conn, "international_team_match_stats", team_stats_df, append = TRUE, row.names = FALSE)
    api_log("INFO", sprintf("✅ Inserted %d team stats rows", nrow(team_stats_df)))
  }, error = function(e) {
    api_log("WARN", sprintf("⚠️ Bulk insert failed, falling back to row-by-row: %s", substr(conditionMessage(e), 1, 100)))
    success_count <- 0L
    for (i in seq_len(nrow(team_stats_df))) {
      row <- team_stats_df[i, ]
      tryCatch({
        dbExecute(conn, "
          INSERT INTO international_team_match_stats (
            squad_id, match_id, season, squad_name, stat, match_value
          ) VALUES ($1, $2, $3, $4, $5, $6)
        ", list(row$squad_id, row$match_id, row$season, row$squad_name, row$stat, row$match_value))
        success_count <- success_count + 1L
      }, error = function(e2) {
        api_log("INFO", sprintf("  ❌ Row %d: %s", i, substr(conditionMessage(e2), 1, 60)))
      })
    }
    api_log("INFO", sprintf("✅ Row-by-row: inserted %d/%d", success_count, nrow(team_stats_df)))
  })
}

# Safe optional column extraction helper
# Extracts a column from a data frame with type coercion and NA defaults
# @param df Data frame to extract from
# @param col_name Column name (string)
# @param type Type to coerce to: "character", "integer", "numeric"
# @param default Default value if column missing
# @return Coerced vector or default
safe_extract_col <- function(df, col_name, type = "character", default = NA) {
  if (!col_name %in% names(df)) {
    return(default)
  }
  
  col_data <- df[[col_name]]
  switch(type,
    integer = suppressWarnings(as.integer(col_data)),
    numeric = suppressWarnings(as.numeric(as.character(col_data))),
    character = as.character(col_data),
    default
  )
}

# Extract player identity rows from a match payload (payload$playerInfo$player)
extract_player_info_from_payload <- function(payload) {
  if (is.null(payload) || is.null(payload$playerInfo) || is.null(payload$playerInfo$player)) {
    return(data.frame())
  }
  tryCatch({
    raw <- dplyr::bind_rows(payload$playerInfo$player)
    if (nrow(raw) == 0) return(data.frame())

    if ("playerId"         %in% names(raw)) names(raw)[names(raw) == "playerId"]         <- "player_id"
    if ("shortDisplayName" %in% names(raw)) names(raw)[names(raw) == "shortDisplayName"] <- "short_display_name"
    if (!"short_display_name" %in% names(raw)) raw$short_display_name <- NA_character_

    missing <- setdiff(c("player_id", "firstname", "surname"), names(raw))
    if (length(missing) > 0) {
      api_log("INFO", sprintf("    ⚠️ Missing player info columns: %s", paste(missing, collapse = ", ")))
      return(data.frame())
    }

    raw %>%
      dplyr::transmute(
        player_id          = as.integer(player_id),
        firstname          = as.character(firstname),
        surname            = as.character(surname),
        short_display_name = as.character(short_display_name),
        player_name        = trimws(paste(firstname, surname)),
        canonical_name     = trimws(paste(firstname, surname))
      ) %>%
      dplyr::distinct(player_id, .keep_all = TRUE) %>%
      dplyr::filter(!is.na(player_id))
  }, error = function(e) {
    api_log("INFO", sprintf("    ⚠️ extract_player_info_from_payload failed: %s", substr(conditionMessage(e), 1, 80)))
    data.frame()
  })
}

# Extract per-match player stats from a match payload using netballR::tidyPlayers.
# Sums across periods to produce one row per (player, match, stat).
extract_player_stats_from_payload <- function(payload, match_id_val, season_val) {
  if (is.null(payload)) return(data.frame())

  raw <- tryCatch(
    netballR::tidyPlayers(payload),
    error = function(e) {
      api_log("INFO", sprintf("    ⚠️ tidyPlayers failed: %s", substr(conditionMessage(e), 1, 100)))
      NULL
    }
  )
  if (is.null(raw) || nrow(raw) == 0) return(data.frame())

  api_log("INFO", sprintf("    Columns from tidyPlayers: %s", paste(names(raw), collapse = ", ")))

  # Normalise column names to snake_case equivalents
  rename_col <- function(df, from, to) {
    if (from %in% names(df) && !to %in% names(df)) names(df)[names(df) == from] <- to
    df
  }
  raw <- rename_col(raw, "playerId",  "player_id")
  raw <- rename_col(raw, "squadId",   "squad_id")
  raw <- rename_col(raw, "squadName", "squad_name")

  val_col <- intersect(c("value", "periodValue", "statValue", "stat_value"), names(raw))[1]
  if (is.na(val_col)) {
    api_log("INFO", "    ❌ Cannot identify value column in tidyPlayers output")
    return(data.frame())
  }

  missing <- setdiff(c("player_id", "squad_id", "squad_name", "stat"), names(raw))
  if (length(missing) > 0) {
    api_log("INFO", sprintf("    ❌ Missing required columns: %s", paste(missing, collapse = ", ")))
    return(data.frame())
  }

  raw$value_num <- suppressWarnings(as.numeric(as.character(raw[[val_col]])))
  raw$value_num <- ifelse(is.na(raw$value_num), 0, raw$value_num)

  result <- raw %>%
    dplyr::group_by(
      player_id  = as.integer(player_id),
      squad_id   = as.integer(squad_id),
      squad_name = as.character(squad_name),
      stat       = as.character(stat)
    ) %>%
    dplyr::summarise(match_value = sum(value_num, na.rm = TRUE), .groups = "drop") %>%
    dplyr::mutate(
      match_id = as.integer(match_id_val),
      season   = as.integer(season_val)
    ) %>%
    dplyr::select(player_id, match_id, squad_id, season, squad_name, stat, match_value) %>%
    dplyr::filter(!is.na(player_id))

  api_log("INFO", sprintf("    ✅ %d stat rows for %d players", nrow(result), length(unique(result$player_id))))
  result
}

extract_player_participation_from_payload <- function(payload, match_id_val, season_val) {
  if (is.null(payload) || is.null(payload$playerStats) || is.null(payload$playerStats$player)) {
    return(data.frame())
  }

  tryCatch({
    raw <- dplyr::bind_rows(payload$playerStats$player)
    if (nrow(raw) == 0) return(data.frame())

    rename_col <- function(df, from, to) {
      if (from %in% names(df) && !to %in% names(df)) names(df)[names(df) == from] <- to
      df
    }
    raw <- rename_col(raw, "playerId", "player_id")
    raw <- rename_col(raw, "squadId", "squad_id")
    raw <- rename_col(raw, "startingPositionCode", "starting_position_code")
    raw <- rename_col(raw, "currentPositionCode", "current_position_code")
    raw <- rename_col(raw, "quartersPlayed", "quarters_played")
    raw <- rename_col(raw, "minutesPlayed", "minutes_played")

    missing <- setdiff(c("player_id", "squad_id"), names(raw))
    if (length(missing) > 0) {
      api_log("WARN", sprintf("Missing participation columns: %s", paste(missing, collapse = ", ")))
      return(data.frame())
    }

    result <- raw %>%
      dplyr::transmute(
        player_id = as.integer(player_id),
        match_id = as.integer(match_id_val),
        squad_id = as.integer(squad_id),
        season = as.integer(season_val),
        starting_position_code = safe_extract_col(raw, "starting_position_code", type = "character", default = NA_character_),
        current_position_code = safe_extract_col(raw, "current_position_code", type = "character", default = NA_character_),
        quarters_played = safe_extract_col(raw, "quarters_played", type = "integer", default = NA_integer_),
        minutes_played = safe_extract_col(raw, "minutes_played", type = "numeric", default = NA_real_)
      ) %>%
      dplyr::distinct(player_id, match_id, .keep_all = TRUE) %>%
      dplyr::filter(!is.na(player_id), !is.na(squad_id))

    api_log("INFO", sprintf("Extracted %d participation rows for %d players", nrow(result), length(unique(result$player_id))))
    result
  }, error = function(e) {
    api_log("WARN", sprintf("extract_player_participation_from_payload failed: %s", substr(conditionMessage(e), 1, 80)))
    data.frame()
  })
}

extract_team_stats_from_payload <- function(payload, match_id_val, season_val) {
  if (is.null(payload) || is.null(payload$playerStats) || is.null(payload$playerStats$player)) {
    return(data.frame())
  }

  tryCatch({
    raw <- dplyr::bind_rows(payload$playerStats$player)
    if (nrow(raw) == 0) return(data.frame())

    rename_col <- function(df, from, to) {
      if (from %in% names(df) && !to %in% names(df)) names(df)[names(df) == from] <- to
      df
    }
    raw <- rename_col(raw, "playerId", "player_id")
    raw <- rename_col(raw, "squadId", "squad_id")
    raw <- rename_col(raw, "quartersPlayed", "quarters_played")
    raw <- rename_col(raw, "minutesPlayed", "minutes_played")
    raw <- rename_col(raw, "startingPositionCode", "starting_position_code")
    raw <- rename_col(raw, "currentPositionCode", "current_position_code")

    if (!"squad_id" %in% names(raw)) {
      api_log("INFO", "    ⚠️ Missing team stats column: squad_id")
      return(data.frame())
    }

    team_lookup <- data.frame(squad_id = integer(), squad_name = character(), stringsAsFactors = FALSE)
    if (!is.null(payload$teamInfo) && !is.null(payload$teamInfo$team)) {
      team_lookup <- dplyr::bind_rows(payload$teamInfo$team)
      if (nrow(team_lookup) > 0) {
        team_lookup <- rename_col(team_lookup, "squadId", "squad_id")
        team_lookup <- rename_col(team_lookup, "squadName", "squad_name")
        if (!"squad_name" %in% names(team_lookup)) team_lookup$squad_name <- NA_character_
        team_lookup <- team_lookup %>%
          dplyr::transmute(
            squad_id = as.integer(squad_id),
            squad_name = as.character(squad_name)
          ) %>%
          dplyr::distinct(squad_id, .keep_all = TRUE)
      }
    }

    excluded_cols <- c("player_id", "squad_id", "quarters_played", "minutes_played", "starting_position_code", "current_position_code")
    candidate_cols <- setdiff(names(raw), excluded_cols)
    stat_cols <- candidate_cols[vapply(candidate_cols, function(col) {
      values <- raw[[col]]
      if (is.list(values)) return(FALSE)
      coerced <- suppressWarnings(as.numeric(as.character(values)))
      any(!is.na(coerced)) || all(is.na(values))
    }, logical(1))]

    if (length(stat_cols) == 0) {
      api_log("INFO", "    ⚠️ No team stats columns found in playerStats payload")
      return(data.frame())
    }

    long_stats <- purrr::map_dfr(stat_cols, function(stat_col) {
      data.frame(
        squad_id = suppressWarnings(as.integer(raw$squad_id)),
        stat = stat_col,
        value = suppressWarnings(as.numeric(as.character(raw[[stat_col]]))),
        stringsAsFactors = FALSE
      )
    })

    result <- long_stats %>%
      dplyr::filter(!is.na(squad_id)) %>%
      dplyr::group_by(squad_id, stat) %>%
      dplyr::summarise(match_value = sum(value, na.rm = TRUE), .groups = "drop") %>%
      dplyr::left_join(team_lookup, by = "squad_id") %>%
      dplyr::mutate(
        match_id = as.integer(match_id_val),
        season = as.integer(season_val),
        squad_name = as.character(squad_name)
      ) %>%
      dplyr::select(squad_id, match_id, season, squad_name, stat, match_value)

    api_log("INFO", sprintf("    ✅ %d team stat rows for %d squads", nrow(result), length(unique(result$squad_id))))
    result
  }, error = function(e) {
    api_log("INFO", sprintf("    ⚠️ extract_team_stats_from_payload failed: %s", substr(conditionMessage(e), 1, 80)))
    data.frame()
  })
}

# Main execution
main <- function() {
  api_log("INFO", "=== Starting International Database Build Process ===")
  
  # Show environment for debugging
  api_log("INFO", sprintf("Database host: %s", Sys.getenv("NETBALL_STATS_DB_HOST", "<not set>")))
  api_log("INFO", sprintf("Database name: %s", Sys.getenv("NETBALL_STATS_DB_NAME", "<not set>")))
  api_log("INFO", sprintf("Database user: %s", Sys.getenv("NETBALL_STATS_DB_USER", "<not set>")))
  api_log("INFO", sprintf("API user: %s", Sys.getenv("NETBALL_STATS_API_DB_USERNAME", "<not set>")))
  api_log("INFO", sprintf("Sample mode: %s", ifelse(sample_mode, "YES", "NO")))
  
  api_log("INFO", "Connecting to database...")
  
  # Try to connect to database
  conn <- tryCatch({
    connect_db()
  }, error = function(e) {
    api_log("INFO", sprintf("Could not connect to database: %s", conditionMessage(e)))
    api_log("INFO", "Proceeding in demonstration mode.")
    NULL
  })
  
  # Log connection status
  if (is.null(conn)) {
    api_log("WARN", "⚠️  Database connection: NONE (running in demo mode)")
    api_log("INFO", "🛑 DEMO MODE: No real database operations will occur")
  } else {
    api_log("INFO", "✅ Database connection: ESTABLISHED")
    api_log("INFO", "🟢 REAL MODE: Will attempt real database operations")
  }
  
  # Discover competitions
  diamonds_comps <- get_all_international_competitions()
  
  if (nrow(diamonds_comps) == 0) {
    api_log("ERROR", "❌ FATAL: No competitions to process. Script ending early.")
    return(invisible(0))
  }
  
  api_log("INFO", sprintf("Found %d international competitions to process", nrow(diamonds_comps)))
  api_log("INFO", "🔍 Competition list:")
  print(diamonds_comps[, c("comp_id", "competition_name", "season")])
  
  # Save to config file if it doesn't exist or is empty
  if (!file.exists(config_path) || file.size(config_path) == 0) {
    api_log("INFO", sprintf("Creating config file: %s", config_path))
    # Extract competition IDs and save
    config_data <- diamonds_comps %>%
      select(competition_id = comp_id) %>%
      mutate(
        season = as.integer(format(Sys.Date(), "%Y")),
        phase = "regular"
      ) %>%
      select(season, phase, competition_id)
    
    write.csv(config_data, config_path, row.names = FALSE)
    api_log("INFO", sprintf("Config file created with %d competitions", nrow(config_data)))
  }
  
  # Create international tables
  create_international_tables(conn)

  # Process competitions most-recent-first (higher comp_id = newer competition)
  diamonds_comps <- diamonds_comps[order(diamonds_comps$comp_id, decreasing = TRUE), ]
  total_comps <- nrow(diamonds_comps)

  processed_count           <- 0L
  total_matches             <- 0L
  total_players             <- 0L
  total_stats_rows          <- 0L
  total_participation_rows  <- 0L
  total_team_stats_rows     <- 0L

  for (i in seq_len(total_comps)) {
    comp_row  <- diamonds_comps[i, , drop = FALSE]
    comp_id   <- comp_row$competition_id[[1]]
    comp_name <- comp_row$competition_name[[1]]
    api_log("INFO", sprintf("\n=== Competition %d/%d: %s (ID: %s) ===", i, total_comps, comp_name, comp_id))

    fixture <- tryCatch({
      api_log("INFO", "  Downloading fixture...")
      result <- netballR::downloadFixture(comp_id)
      api_log("INFO", sprintf("  ✅ %d matches in fixture", nrow(result)))
      result
    }, error = function(e) {
      api_log("INFO", sprintf("  ❌ Fixture download failed: %s", conditionMessage(e)))
      NULL
    })

    if (is.null(fixture) || nrow(fixture) == 0) {
      api_log("INFO", "  ⏭️  No fixture data, skipping competition")
      next
    }

    # Insert match results and team records
    matches_df <- process_match_data(fixture)
    if (nrow(matches_df) > 0 && !is.null(conn)) {
      matches_df$competition_name <- comp_name
      matches_df$application_source <- if ("application_source" %in% names(comp_row)) comp_row$application_source else NA_character_
      insert_matches(conn, matches_df)
      insert_teams(conn, extract_teams(matches_df))
      total_matches <- total_matches + nrow(matches_df)
    }

    # Download per-match stats for every completed match
    all_player_stats         <- list()
    all_player_participation <- list()
    all_team_stats           <- list()
    all_player_info          <- list()

    for (j in seq_len(nrow(fixture))) {
      match_row  <- fixture[j, ]
      match_id_v <- as.integer(match_row$matchId)
      round_v    <- as.integer(match_row$round)
      game_v     <- as.integer(match_row$game)
      status_v   <- tolower(trimws(as.character(match_row$matchStatus)))
      season_v   <- suppressWarnings(as.integer(format(as.POSIXct(match_row$utcStartTime, tz = "UTC"), "%Y")))
      if (is.na(season_v)) season_v <- as.integer(format(Sys.Date(), "%Y"))

      # Only fetch stats for completed matches
      if (status_v %in% c("scheduled", "pre-match", "prematch", "")) {
        api_log("INFO", sprintf("  [%d/%d] Match %d: scheduled — skipping stats", j, nrow(fixture), match_id_v))
        next
      }

      api_log("INFO", sprintf("  [%d/%d] Match %d r%d g%d (%d) — fetching stats...",
        j, nrow(fixture), match_id_v, round_v, game_v, season_v))

      payload <- tryCatch(
        netballR::downloadMatch(as.character(comp_id), round_v, game_v),
        error = function(e) {
          api_log("INFO", sprintf("    ⚠️ downloadMatch failed: %s", substr(conditionMessage(e), 1, 80)))
          NULL
        }
      )

      if (is.null(payload)) next

      stats_df <- extract_player_stats_from_payload(payload, match_id_v, season_v)
      if (nrow(stats_df) > 0) all_player_stats[[length(all_player_stats) + 1]] <- stats_df

      participation_df <- extract_player_participation_from_payload(payload, match_id_v, season_v)
      if (nrow(participation_df) > 0) all_player_participation[[length(all_player_participation) + 1]] <- participation_df

      team_stats_df <- extract_team_stats_from_payload(payload, match_id_v, season_v)
      if (nrow(team_stats_df) > 0) all_team_stats[[length(all_team_stats) + 1]] <- team_stats_df

      player_df <- extract_player_info_from_payload(payload)
      if (nrow(player_df) > 0) all_player_info[[length(all_player_info) + 1]] <- player_df
    }

    # Bulk-insert players and stats for this competition
    if (!is.null(conn)) {
      if (length(all_player_info) > 0) {
        combined_players <- dplyr::bind_rows(all_player_info) %>%
          dplyr::distinct(player_id, .keep_all = TRUE)
        insert_players(conn, combined_players)
        total_players <- total_players + nrow(combined_players)
      }

      if (length(all_player_stats) > 0) {
        combined_stats <- dplyr::bind_rows(all_player_stats)
        insert_player_stats(conn, combined_stats)
        total_stats_rows <- total_stats_rows + nrow(combined_stats)
      }

      if (length(all_player_participation) > 0) {
        combined_participation <- dplyr::bind_rows(all_player_participation)
        insert_player_participation(conn, combined_participation)
        total_participation_rows <- total_participation_rows + nrow(combined_participation)
      }

      if (length(all_team_stats) > 0) {
        combined_team_stats <- dplyr::bind_rows(all_team_stats)
        insert_team_stats(conn, combined_team_stats)
        total_team_stats_rows <- total_team_stats_rows + nrow(combined_team_stats)
      }
    }

    processed_count <- processed_count + 1L
  }

  api_log("INFO", sprintf("\n=== Processing Summary ==="))
  api_log("INFO", sprintf("Competitions found:     %d", total_comps))
  api_log("INFO", sprintf("Competitions processed: %d", processed_count))
  api_log("INFO", sprintf("Matches inserted:       %d", total_matches))
  api_log("INFO", sprintf("Players upserted:       %d", total_players))
  api_log("INFO", sprintf("Player stat rows:       %d", total_stats_rows))
  api_log("INFO", sprintf("Participation rows:     %d", total_participation_rows))
  api_log("INFO", sprintf("Team stat rows:         %d", total_team_stats_rows))

  if (!is.null(conn)) {
    for (tbl in c(
      "international_matches", "international_teams", "international_players",
      "international_player_match_stats", "international_player_match_participation",
      "international_team_match_stats", "international_player_reference"
    )) {
      tryCatch(
        dbExecute(conn, paste0("ANALYZE ", DBI::dbQuoteIdentifier(conn, tbl))),
        error = function(e) {
          api_log("WARN", sprintf("ANALYZE skipped for %s: %s", tbl, conditionMessage(e)))
        }
      )
    }
  }
  
  # Close database connection
  if (!is.null(conn)) {
    dbDisconnect(conn)
    api_log("INFO", "Database connection closed.")
  }

  api_log("INFO", "\n=== International Database Build Complete ===")
}

# Run main function
main()
