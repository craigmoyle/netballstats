#!/usr/bin/env Rscript

# Exploration of netballR package capabilities

suppressPackageStartupMessages({
  library(netballR)
  library(dplyr)
})

message("=== netballR Package Exploration ===")

# List all competitions
message("\n1. Listing available competitions...")
competitions <- tryCatch({
  netballR::listCompetitionsNetballAus()
}, error = function(e) {
  message(sprintf("Error fetching competitions: %s", conditionMessage(e)))
  NULL
})

if (!is.null(competitions)) {
  message(sprintf("Found %d total competitions", nrow(competitions)))
  message("Column names in competitions data:")
  print(names(competitions))
  
  # Show first few competitions
  print(head(competitions))
  
  # Look for Diamonds competitions
  diamonds_mask <- grepl("Diamonds", competitions$competition_name, ignore.case = TRUE)
  diamonds_comps <- competitions[diamonds_mask, ]
  
  if (nrow(diamonds_comps) > 0) {
    message(sprintf("\\nFound %d Australian Diamonds competitions:", nrow(diamonds_comps)))
    print(diamonds_comps)
    
    # Try different functions on the first Diamonds competition
    first_comp_id <- diamonds_comps$comp_id[1]
    message(sprintf("\\n2. Exploring functions for competition ID: %s", first_comp_id))
    
    # Try downloading fixture
    message("\\na) Downloading fixture...")
    tryCatch({
      fixture <- netballR::downloadFixture(first_comp_id)
      if (!is.null(fixture)) {
        message(sprintf("Fixture downloaded successfully, dimensions: %d rows x %d columns", nrow(fixture), ncol(fixture)))
        message("Fixture column names:")
        print(names(fixture))
        if (nrow(fixture) > 0) {
          print(head(fixture))
        }
      } else {
        message("Fixture download returned NULL")
      }
    }, error = function(e) {
      message(sprintf("Error downloading fixture: %s", conditionMessage(e)))
    })
    
    # Try match results
    message("\\nb) Fetching match results...")
    tryCatch({
      results <- netballR::matchResults(first_comp_id)
      if (!is.null(results)) {
        message(sprintf("Match results fetched successfully, dimensions: %d rows x %d columns", nrow(results), ncol(results)))
        message("Results column names:")
        print(names(results))
        if (nrow(results) > 0) {
          print(head(results))
        }
      } else {
        message("Match results fetch returned NULL")
      }
    }, error = function(e) {
      message(sprintf("Error fetching match results: %s", conditionMessage(e)))
    })
    
  } else {
    message("\\nNo Australian Diamonds competitions found")
    
    # Show some other interesting competitions
    world_cup_mask <- grepl("World Cup|WC", competitions$competition_name, ignore.case = TRUE)
    world_cup_comps <- competitions[world_cup_mask, ]
    if (nrow(world_cup_comps) > 0) {
      message(sprintf("\\nFound %d World Cup competitions:", nrow(world_cup_comps)))
      print(world_cup_comps)
    }
  }
} else {
  message("Failed to fetch competitions data")
}

# Try some sample data functions
message("\\n3. Exploring sample data functions...")
tryCatch({
  # Try players data
  message("\\na) Checking players data...")
  if (exists("players_2017", asNamespace("netballR"))) {
    players_data <- netballR::players_2017
    message(sprintf("Players 2017 data: %d rows x %d columns", nrow(players_data), ncol(players_data)))
    print(head(players_data))
  } else {
    message("players_2017 data not available")
  }
}, error = function(e) {
  message(sprintf("Error exploring sample data: %s", conditionMessage(e)))
})

message("\\n=== Exploration Complete ===")