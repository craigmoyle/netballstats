#!/usr/bin/env Rscript

message("=== INTERNATIONAL NETBALL DATABASE BUILD ===")
message(sprintf("Timestamp: %s", Sys.time()))
message(sprintf("Process ID: %s", Sys.getpid()))
message(sprintf("Working directory: %s", getwd()))
message(sprintf("R version: %s", R.version.string))

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

# Database connection function
connect_db <- function() {
  db_host <- Sys.getenv("NETBALL_STATS_DB_HOST", "localhost")
  db_port <- Sys.getenv("NETBALL_STATS_DB_PORT", "5432")
  db_name <- Sys.getenv("NETBALL_STATS_DB_NAME", "netballstats")
  db_user <- Sys.getenv("NETBALL_STATS_DB_USER", "netballstatsadmin")
  db_password <- Sys.getenv("NETBALL_STATS_DB_PASSWORD", "")
  
  message(sprintf("== DATABASE CONNECTION ATTEMPT =="))
  message(sprintf("Host: %s", db_host))
  message(sprintf("Port: %s", db_port))
  message(sprintf("Database: %s", db_name))
  message(sprintf("User: %s", db_user))
  message(sprintf("Password provided: %s", ifelse(nzchar(db_password), "YES", "NO")))
  
  # For demonstration purposes, return NULL if no password is provided
  if (nchar(db_password) == 0) {
    message("❌ No database password provided. Running in demonstration mode.")
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
    
    # Apply statement timeout if set
    statement_timeout_ms <- Sys.getenv("NETBALL_STATS_DB_STATEMENT_TIMEOUT_MS", "")
    if (nzchar(statement_timeout_ms)) {
      dbExecute(con, sprintf("SET statement_timeout = %s", statement_timeout_ms))
    }
    
    # Test the connection with a simple query
    test_result <- dbGetQuery(con, "SELECT current_database(), current_user")
    message(sprintf("Connected to database: %s", test_result[1,1]))
    message(sprintf("Connected as user: %s", test_result[1,2]))
    
    return(con)
  }, error = function(e) {
    message(sprintf("❌ Database connection FAILED: %s", conditionMessage(e)))
    return(NULL)
  })
}

# Get competition IDs for Australian Diamonds
get_diamonds_competitions <- function() {
  message("🔍 Discovering Australian Diamonds competitions by team participation...")
  
  # Log netballR package info
  if (requireNamespace("netballR", quietly = TRUE)) {
    message("✅ netballR package loaded successfully")
    desc <- packageDescription("netballR")
    message(sprintf("netballR version: %s", desc$Version))
  } else {
    message("❌ netballR package NOT FOUND")
    return(data.frame())
  }
  
  competitions_data <- tryCatch({
    message("🔄 Calling netballR::listCompetitionsNetballAus()...")
    result <- netballR::listCompetitionsNetballAus()
    message(sprintf("✅ Got %d total competitions from netballR", nrow(result)))
    result
  }, error = function(e) {
    message(sprintf("❌ Error calling listCompetitionsNetballAus: %s", conditionMessage(e)))
    return(data.frame())
  })
  
  if (nrow(competitions_data) == 0) {
    message("❌ No competitions returned from netballR")
    return(data.frame())
  }
  
  message(sprintf("Analyzing %d competitions for Diamonds participation...", nrow(competitions_data)))
  
  # Filter competitions by checking if Diamonds participate 
  diamonds_competitions <- data.frame()
  processed_count <- 0
  diamonds_found_count <- 0
  
  # Prioritize competitions more likely to involve Diamonds
  # Sort competitions by likelihood of being international/Diamonds-related
  priority_indices <- c(
    which(grepl("Diamonds|International|Series|Tour|Test|Friendly", competitions_data$competition_name, ignore.case = TRUE)),
    which(!grepl("Diamonds|International|Series|Tour|Test|Friendly", competitions_data$competition_name, ignore.case = TRUE))
  )
  prioritized_competitions <- competitions_data[priority_indices, ]
  
  # Process more competitions to ensure we catch all Diamonds games
  total_to_check <- min(100, nrow(prioritized_competitions))  # Check more competitions
  
  for (i in 1:total_to_check) {  
    comp_row <- prioritized_competitions[i, ]
    comp_id <- comp_row$comp_id
    comp_name <- comp_row$competition_name
    
    processed_count <- processed_count + 1
    message(sprintf("  [%d/%d] Checking %s (%s)...", processed_count, total_to_check, comp_name, comp_id))
    
    # Skip if it's likely a domestic-only competition
    if (!grepl("International|Test|Series|Tour|Friendly|vs|v\\s", comp_name, ignore.case = TRUE) &&
        !grepl("Diamonds|Roses|Silver Ferns|Firebirds|Ferns|Magic|Tactix|Pulse|Steel|Lightning|Swifts|Mavericks|Thunderbirds|Fever|Giants|Vixens", comp_name, ignore.case = TRUE)) {
      message("    ⏭️  Skipping likely domestic competition")
      if (processed_count > 20) {  # Stop early if we've gone past priority competitions
        break
      }
      next
    }
    
    # Download fixture to check teams
    fixture_data <- tryCatch({
      netballR::downloadFixture(comp_id)
    }, error = function(e) {
      message(sprintf("    ❌ Failed to download fixture for %s: %s", comp_id, substr(conditionMessage(e), 1, 50)))
      return(NULL)
    })
    
    if (is.null(fixture_data) || nrow(fixture_data) == 0) {
      next
    }
    
    # Check if Diamonds appear in any team names
    has_diamonds <- any(grepl("Diamonds", c(fixture_data$homeSquadName, fixture_data$awaySquadName), ignore.case = TRUE))
    
    if (has_diamonds) {
      diamonds_found_count <- diamonds_found_count + 1
      message(sprintf("    ✅ Diamonds found in competition! (%d found so far)", diamonds_found_count))
      diamonds_competitions <- rbind(diamonds_competitions, comp_row)
    } else {
      # Check if this is still worth processing (has strong indicators)
      if (processed_count > 60 && diamonds_found_count == 0) {
        message("    ⏹️  Stopping early - no Diamonds found in first 60+ priority competitions")
        break
      }
    }
  }
  
  if (nrow(diamonds_competitions) > 0) {
    message(sprintf("✅ Found %d competitions featuring Australian Diamonds (checked %d total)", nrow(diamonds_competitions), min(total_to_check, processed_count)))
    # Remove squad_id column for cleaner display
    display_comps <- diamonds_competitions %>% select(comp_id, competition_name, season, competition_type)
    message("Diamonds competitions:")
    print(display_comps)
    diamonds_competitions$competition_id <- as.integer(diamonds_competitions$comp_id)
    return(diamonds_competitions)
  } else {
    message(sprintf("❌ No competitions with Australian Diamonds found (processed %d competitions).", processed_count))
    message("First few competitions checked:")
    all_comps_display <- if (nrow(prioritized_competitions) > 0) {
      prioritized_competitions[1:min(10, nrow(prioritized_competitions)), ] %>% 
        select(comp_id, competition_name, season, competition_type)
    } else {
      data.frame()
    }
    print(all_comps_display)
    return(data.frame())
  }
}

# Safe number conversion
safe_convert_number <- function(x) {
  result <- suppressWarnings(as.numeric(as.character(x)))
  ifelse(is.na(result), 0, result)
}

# Process match data for international competitions
process_match_data <- function(fixture_data) {
  message("Processing match data...")
  
  # Validate input data
  if (is.null(fixture_data) || nrow(fixture_data) == 0) {
    message("⚠️  No fixture data to process")
    return(data.frame())
  }
  
  # Check required columns
  required_columns <- c("matchId", "utcStartTime", "round", "game", "homeSquadId", "awaySquadId", "homeSquadScore", "awaySquadScore", "matchStatus", "homeSquadName", "awaySquadName")
  missing_columns <- required_columns[!required_columns %in% names(fixture_data)]
  if (length(missing_columns) > 0) {
    message(sprintf("❌ Missing required columns: %s", paste(missing_columns, collapse = ", ")))
    message("Available columns:")
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
  
  message(sprintf("Processed %d matches", nrow(matches_df)))
  return(matches_df)
}

# Extract unique teams from match data
extract_teams <- function(matches_df) {
  message("Extracting teams...")
  
  home_teams <- matches_df %>%
    select(squad_id = home_squad_id, squad_name = home_squad_name) %>%
    distinct()
  
  away_teams <- matches_df %>%
    select(squad_id = away_squad_id, squad_name = away_squad_name) %>%
    distinct()
  
  teams_df <- bind_rows(home_teams, away_teams) %>%
    distinct(squad_id, squad_name)
  
  message(sprintf("Extracted %d unique teams", nrow(teams_df)))
  return(teams_df)
}

# Create international tables
create_international_tables <- function(conn) {
  if (is.null(conn)) {
    message("Demonstration mode: Would create international tables")
    return()
  }
  
  message("Creating international tables...")
  
  # Create international_matches table
  dbExecute(conn, "
    CREATE TABLE IF NOT EXISTS international_matches (
      match_id INTEGER PRIMARY KEY,
      season INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      game_number INTEGER NOT NULL,
      match_type VARCHAR(50) NOT NULL,
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
  
  # Create indexes for better query performance
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_matches_season ON international_matches(season)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_player_stats_player ON international_player_match_stats(player_id)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_player_stats_match ON international_player_match_stats(match_id)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_player_stats_stat ON international_player_match_stats(stat)")
  dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_players_search_name ON international_players(search_name)")
  
  # pg_trgm GIN index for search_name matching Super Netball behavior, wrapped in tryCatch for SQLite compatibility
  tryCatch({
    dbExecute(conn, "CREATE INDEX IF NOT EXISTS idx_intl_players_search_trgm ON international_players USING gin(search_name gin_trgm_ops)")
  }, error = function(e) {
    message("⚠️ Could not create trigram index (expected if running on SQLite): ", conditionMessage(e))
  })
  
  message("International tables created successfully")
}

# Insert matches data
insert_matches <- function(conn, matches_df) {
  if (is.null(conn) || nrow(matches_df) == 0) {
    return()
  }
  
  message(sprintf("Inserting %d matches...", nrow(matches_df)))
  
  # Delete existing matches for these match_ids to avoid duplicates
  match_ids <- matches_df$match_id
  if (length(match_ids) > 0) {
    param_placeholders <- paste(paste0("$", seq_along(match_ids)), collapse = ",")
    delete_sql <- paste("DELETE FROM international_matches WHERE match_id IN (", param_placeholders, ")")
    tryCatch({
      dbExecute(conn, delete_sql, as.list(match_ids))
      message(sprintf("Deleted %d existing matches", length(match_ids)))
    }, error = function(e) {
      message(sprintf("⚠️  Warning: Failed to delete existing matches: %s", conditionMessage(e)))
    })
  }
  
  # Insert new matches with error handling
  success_count <- 0
  for (i in 1:nrow(matches_df)) {
    row <- matches_df[i, ]
    tryCatch({
      dbExecute(conn, "
        INSERT INTO international_matches (
          match_id, season, round_number, game_number, match_type, match_status,
          home_squad_id, home_squad_name, away_squad_id, away_squad_name,
          home_score, away_score, local_start_time, utc_start_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ", list(
        row$match_id, row$season, row$round_number, row$game_number, row$match_type, row$match_status,
        row$home_squad_id, row$home_squad_name, row$away_squad_id, row$away_squad_name,
        row$home_score, row$away_score, row$local_start_time, row$utc_start_time
      ))
      success_count <- success_count + 1
    }, error = function(e) {
      message(sprintf("❌ Failed to insert match %d: %s", row$match_id, conditionMessage(e)))
      message("Row data:")
      print(row)
    })
  }
  
  message(sprintf("✅ Successfully inserted %d out of %d matches", success_count, nrow(matches_df)))
}

# Insert teams data
insert_teams <- function(conn, teams_df) {
  if (is.null(conn) || nrow(teams_df) == 0) {
    return()
  }
  
  message(sprintf("Inserting %d teams...", nrow(teams_df)))
  
  # Insert or update teams with error handling
  success_count <- 0
  for (i in 1:nrow(teams_df)) {
    row <- teams_df[i, ]
    tryCatch({
      dbExecute(conn, "
        INSERT INTO international_teams (squad_id, squad_name)
        VALUES ($1, $2)
        ON CONFLICT (squad_id) DO UPDATE SET
          squad_name = EXCLUDED.squad_name
      ", list(row$squad_id, row$squad_name))
      success_count <- success_count + 1
    }, error = function(e) {
      message(sprintf("❌ Failed to insert/update team %d: %s", row$squad_id, conditionMessage(e)))
      message("Row data:")
      print(row)
    })
  }
  
  message(sprintf("✅ Successfully inserted/updated %d out of %d teams", success_count, nrow(teams_df)))
}

# Insert players data (placeholder - would need actual player data)
insert_players <- function(conn, players_df) {
  if (is.null(conn) || nrow(players_df) == 0) {
    return()
  }
  
  message(sprintf("Inserting %d players...", nrow(players_df)))
  
  # Insert or update players with error handling
  success_count <- 0
  for (i in 1:nrow(players_df)) {
    row <- players_df[i, ]
    tryCatch({
      dbExecute(conn, "
        INSERT INTO international_players (
          player_id, firstname, surname, short_display_name, player_name, canonical_name
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (player_id) DO UPDATE SET
          firstname = EXCLUDED.firstname,
          surname = EXCLUDED.surname,
          short_display_name = EXCLUDED.short_display_name,
          player_name = EXCLUDED.player_name,
          canonical_name = EXCLUDED.canonical_name
      ", list(
        row$player_id, row$firstname, row$surname, row$short_display_name, row$player_name, row$canonical_name
      ))
      success_count <- success_count + 1
    }, error = function(e) {
      message(sprintf("❌ Failed to insert/update player %d: %s", row$player_id, conditionMessage(e)))
      message("Row data:")
      print(row)
    })
  }
  
  message(sprintf("✅ Successfully inserted/updated %d out of %d players", success_count, nrow(players_df)))
}

# Insert player stats data using bulk insert for performance
insert_player_stats <- function(conn, stats_df) {
  if (is.null(conn) || nrow(stats_df) == 0) {
    return()
  }

  message(sprintf("Inserting %d player stats rows...", nrow(stats_df)))

  match_ids <- unique(stats_df$match_id)
  if (length(match_ids) > 0) {
    param_placeholders <- paste(paste0("$", seq_along(match_ids)), collapse = ",")
    delete_sql <- paste("DELETE FROM international_player_match_stats WHERE match_id IN (", param_placeholders, ")")
    tryCatch(
      dbExecute(conn, delete_sql, as.list(match_ids)),
      error = function(e) message(sprintf("⚠️  Warning: Failed to delete existing stats: %s", conditionMessage(e)))
    )
  }

  tryCatch({
    DBI::dbWriteTable(conn, "international_player_match_stats", stats_df, append = TRUE, row.names = FALSE)
    message(sprintf("✅ Inserted %d player stat rows", nrow(stats_df)))
  }, error = function(e) {
    message(sprintf("⚠️ Bulk insert failed, falling back to row-by-row: %s", substr(conditionMessage(e), 1, 100)))
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
        message(sprintf("  ❌ Row %d: %s", i, substr(conditionMessage(e2), 1, 60)))
      })
    }
    message(sprintf("✅ Row-by-row: inserted %d/%d", success_count, nrow(stats_df)))
  })
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
      message(sprintf("    ⚠️ Missing player info columns: %s", paste(missing, collapse = ", ")))
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
    message(sprintf("    ⚠️ extract_player_info_from_payload failed: %s", substr(conditionMessage(e), 1, 80)))
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
      message(sprintf("    ⚠️ tidyPlayers failed: %s", substr(conditionMessage(e), 1, 100)))
      NULL
    }
  )
  if (is.null(raw) || nrow(raw) == 0) return(data.frame())

  message(sprintf("    Columns from tidyPlayers: %s", paste(names(raw), collapse = ", ")))

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
    message("    ❌ Cannot identify value column in tidyPlayers output")
    return(data.frame())
  }

  missing <- setdiff(c("player_id", "squad_id", "squad_name", "stat"), names(raw))
  if (length(missing) > 0) {
    message(sprintf("    ❌ Missing required columns: %s", paste(missing, collapse = ", ")))
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

  message(sprintf("    ✅ %d stat rows for %d players", nrow(result), length(unique(result$player_id))))
  result
}

# Main execution
main <- function() {
  message("=== Starting International Database Build Process ===")
  
  # Show environment for debugging
  message(sprintf("Database host: %s", Sys.getenv("NETBALL_STATS_DB_HOST", "<not set>")))
  message(sprintf("Database name: %s", Sys.getenv("NETBALL_STATS_DB_NAME", "<not set>")))
  message(sprintf("Database user: %s", Sys.getenv("NETBALL_STATS_DB_USER", "<not set>")))
  message(sprintf("API user: %s", Sys.getenv("NETBALL_STATS_API_DB_USERNAME", "<not set>")))
  message(sprintf("Sample mode: %s", ifelse(sample_mode, "YES", "NO")))
  
  message("Connecting to database...")
  
  # Try to connect to database
  conn <- tryCatch({
    connect_db()
  }, error = function(e) {
    message(sprintf("Could not connect to database: %s", conditionMessage(e)))
    message("Proceeding in demonstration mode.")
    NULL
  })
  
  # Log connection status
  if (is.null(conn)) {
    message("⚠️  Database connection: NONE (running in demo mode)")
    message("🛑 DEMO MODE: No real database operations will occur")
  } else {
    message("✅ Database connection: ESTABLISHED")
    message("🟢 REAL MODE: Will attempt real database operations")
  }
  
  # Discover competitions
  diamonds_comps <- get_diamonds_competitions()
  
  if (nrow(diamonds_comps) == 0) {
    message("❌ FATAL: No competitions to process. Script ending early.")
    return(invisible(0))
  }
  
  message(sprintf("Found %d Australian Diamonds competitions to process", nrow(diamonds_comps)))
  message("🔍 Competition list:")
  print(diamonds_comps[, c("comp_id", "competition_name", "season")])
  
  # Save to config file if it doesn't exist or is empty
  if (!file.exists(config_path) || file.size(config_path) == 0) {
    message(sprintf("Creating config file: %s", config_path))
    # Extract competition IDs and save
    config_data <- diamonds_comps %>%
      select(competition_id = comp_id) %>%
      mutate(
        season = as.integer(format(Sys.Date(), "%Y")),
        phase = "regular"
      ) %>%
      select(season, phase, competition_id)
    
    write.csv(config_data, config_path, row.names = FALSE)
    message(sprintf("Config file created with %d competitions", nrow(config_data)))
  }
  
  # Create international tables
  create_international_tables(conn)

  # Process competitions most-recent-first (higher comp_id = newer competition)
  diamonds_comps <- diamonds_comps[order(diamonds_comps$comp_id, decreasing = TRUE), ]
  total_comps <- nrow(diamonds_comps)

  processed_count  <- 0L
  total_matches    <- 0L
  total_players    <- 0L
  total_stats_rows <- 0L

  for (i in seq_len(total_comps)) {
    comp_id   <- diamonds_comps$competition_id[i]
    comp_name <- diamonds_comps$competition_name[i]
    message(sprintf("\n=== Competition %d/%d: %s (ID: %s) ===", i, total_comps, comp_name, comp_id))

    fixture <- tryCatch({
      message("  Downloading fixture...")
      result <- netballR::downloadFixture(comp_id)
      message(sprintf("  ✅ %d matches in fixture", nrow(result)))
      result
    }, error = function(e) {
      message(sprintf("  ❌ Fixture download failed: %s", conditionMessage(e)))
      NULL
    })

    if (is.null(fixture) || nrow(fixture) == 0) {
      message("  ⏭️  No fixture data, skipping competition")
      next
    }

    # Insert match results and team records
    matches_df <- process_match_data(fixture)
    if (nrow(matches_df) > 0 && !is.null(conn)) {
      insert_matches(conn, matches_df)
      insert_teams(conn, extract_teams(matches_df))
      total_matches <- total_matches + nrow(matches_df)
    }

    # Download per-match stats for every completed match
    all_player_stats <- list()
    all_player_info  <- list()

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
        message(sprintf("  [%d/%d] Match %d: scheduled — skipping stats", j, nrow(fixture), match_id_v))
        next
      }

      message(sprintf("  [%d/%d] Match %d r%d g%d (%d) — fetching stats...",
        j, nrow(fixture), match_id_v, round_v, game_v, season_v))

      payload <- tryCatch(
        netballR::downloadMatch(as.character(comp_id), round_v, game_v),
        error = function(e) {
          message(sprintf("    ⚠️ downloadMatch failed: %s", substr(conditionMessage(e), 1, 80)))
          NULL
        }
      )

      if (is.null(payload)) next

      stats_df <- extract_player_stats_from_payload(payload, match_id_v, season_v)
      if (nrow(stats_df) > 0) all_player_stats[[length(all_player_stats) + 1]] <- stats_df

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
    }

    processed_count <- processed_count + 1L
  }

  message(sprintf("\n=== Processing Summary ==="))
  message(sprintf("Competitions found:     %d", total_comps))
  message(sprintf("Competitions processed: %d", processed_count))
  message(sprintf("Matches inserted:       %d", total_matches))
  message(sprintf("Players upserted:       %d", total_players))
  message(sprintf("Player stat rows:       %d", total_stats_rows))
  
  # Close database connection
  if (!is.null(conn)) {
    dbDisconnect(conn)
    message("Database connection closed.")
  }

  message("\n=== International Database Build Complete ===")
}

# Run main function
main()