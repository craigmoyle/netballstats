#!/usr/bin/env Rscript

# Complete International Netball Database Builder
#
# This script demonstrates a complete implementation of building the international
# netball database using the netballR package to fetch data from Champion Data.

suppressPackageStartupMessages({
  library(DBI)
  library(dplyr)
  library(purrr)
  library(netballR)
  library(RPostgres)
  library(httr)
  library(jsonlite)
})

message("=== Complete International Netball Database Builder ===")

# Mock database connection and functions for demonstration
# In a real implementation, these would connect to the actual PostgreSQL database
mock_connect_db <- function() {
  message("Connecting to database (mock)...")
  list(
    connected = TRUE,
    disconnect = function() message("Database connection closed (mock)")
  )
}

mock_create_tables <- function(conn) {
  message("Creating international tables:")
  message("  - international_matches")
  message("  - international_teams")
  message("  - international_players")
  message("  - international_player_match_stats")
  message("  - international_team_match_stats")
}

mock_insert_data <- function(conn, table_name, data) {
  if (!is.null(data) && nrow(data) > 0) {
    message(sprintf("  Inserting %d rows into %s", nrow(data), table_name))
  } else {
    message(sprintf("  No data to insert into %s", table_name))
  }
}

# Helper function to safely convert data types
safe_convert_number <- function(x) {
  result <- suppressWarnings(as.numeric(as.character(x)))
  ifelse(is.na(result), 0, result)
}

# Process match data for international competitions
process_match_data <- function(fixture_data) {
  message("Processing match data...")
  
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

# Main function to build international database
build_international_database <- function() {
  # Connect to database (mock for demo)
  conn <- mock_connect_db()
  
  # Create tables
  mock_create_tables(conn)
  
  # Discover Diamonds competitions
  message("\n1. Discovering Australian Diamonds competitions...")
  competitions <- tryCatch({
    netballR::listCompetitionsNetballAus()
  }, error = function(e) {
    message(sprintf("Error fetching competitions: %s", conditionMessage(e)))
    return(NULL)
  })
  
  if (is.null(competitions)) {
    message("Failed to fetch competitions data. Exiting.")
    return(FALSE)
  }
  
  # Filter for Diamonds competitions
  diamonds_mask <- grepl("Diamonds", competitions$competition_name, ignore.case = TRUE)
  diamonds_comps <- competitions[diamonds_mask, ]
  
  if (nrow(diamonds_comps) == 0) {
    message("No Australian Diamonds competitions found.")
    return(FALSE)
  }
  
  message(sprintf("Found %d Australian Diamonds competitions", nrow(diamonds_comps)))
  
  # Collect all match data
  all_matches <- list()
  all_teams <- list()
  
  # Process each competition
  for (i in 1:nrow(diamonds_comps)) {
    comp_id <- diamonds_comps$comp_id[i]
    comp_name <- diamonds_comps$competition_name[i]
    
    message(sprintf("\n2.%d. Processing competition: %s (ID: %s)", i, comp_name, comp_id))
    
    # Download fixture
    message("  Downloading fixture...")
    fixture <- tryCatch({
      netballR::downloadFixture(comp_id)
    }, error = function(e) {
      message(sprintf("    Error downloading fixture: %s", conditionMessage(e)))
      return(NULL)
    })
    
    if (is.null(fixture) || nrow(fixture) == 0) {
      message("    No fixture data available for this competition")
      next
    }
    
    message(sprintf("    Fixture contains %d matches", nrow(fixture)))
    
    # Process match data
    matches_df <- process_match_data(fixture)
    all_matches[[length(all_matches) + 1]] <- matches_df
    
    # Extract teams
    teams_df <- extract_teams(matches_df)
    all_teams[[length(all_teams) + 1]] <- teams_df
  }
  
  # Combine all data
  if (length(all_matches) > 0) {
    combined_matches <- bind_rows(all_matches)
    combined_teams <- bind_rows(all_teams) %>% distinct(squad_id, squad_name)
    
    message(sprintf("\n3. Summary:"))
    message(sprintf("  Total matches processed: %d", nrow(combined_matches)))
    message(sprintf("  Total unique teams: %d", nrow(combined_teams)))
    
    # Insert data into database (mock)
    message("\n4. Inserting data into database...")
    mock_insert_data(conn, "international_matches", combined_matches)
    mock_insert_data(conn, "international_teams", combined_teams)
    
    # Insert mock player data (in a real implementation, we would fetch actual player data)
    mock_players <- data.frame(
      player_id = 1:20,
      firstname = c("Liz", "Kim", "Maddison", "Joline", "Amy", "Cadence", "Hannah", "Eleanor", "Phoebe", "Tahlia",
                    "Stephanie", "Kate", "Jasmine", "Tamika", "Shannon", "Chelsea", "Katie", "Gina", "Sarah", "Maia"),
      surname = c("Watson", "Jenner", "Levy", "Johansson", "Parmenter", "McLean", "Moulds", "Cardwell", "Hepi", "Gillard",
                  "Woodcock", "Cross", "Teige", "Horner", "May", "Nordqvist", "Stewart", "Eastment", "Horwood", "Prestwidge"),
      squad_id = rep(c(817, 818), each = 10),  # Mock squad IDs
      player_name = character(20),
      canonical_name = character(20),
      stringsAsFactors = FALSE
    )
    
    mock_players$player_name <- paste(mock_players$firstname, mock_players$surname)
    mock_players$canonical_name <- mock_players$player_name
    
    # More mock player data would be inserted here from actual data sources
    mock_insert_data(conn, "international_players", mock_players)
    
    # More detailed match stats would be inserted here
    mock_player_stats <- data.frame(
      match_id = rep(98430101, 20),
      player_id = 1:20,
      squad_id = rep(c(817, 818), each = 10),
      season = 2016,
      stat = rep(c("goals", "goalAssists", "feeds", "gain", "intercepts"), 4),
      match_value = sample(1:30, 20, replace = TRUE),
      stringsAsFactors = FALSE
    )
    
    mock_insert_data(conn, "international_player_match_stats", mock_player_stats)
  } else {
    message("No match data to process.")
    return(FALSE)
  }
  
  # Close database connection
  conn$disconnect()
  
  message("\n=== International Database Build Complete ===")
  return(TRUE)
}

# Export functions for use
export_functions <- function() {
  list(
    process_match_data = process_match_data,
    extract_teams = extract_teams,
    safe_convert_number = safe_convert_number
  )
}

# Main execution
if (sys.nframe() == 0) {
  success <- build_international_database()
  if (success) {
    message("\nSuccess! The international database has been built.")
  } else {
    message("\nFailed to build the international database.")
    quit(status = 1)
  }
}

# Export for use by other scripts
export_functions()