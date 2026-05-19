#!/usr/bin/env Rscript

# Demonstration of fetching data with netballR package

suppressPackageStartupMessages({
  library(netballR)
  library(dplyr)
})

message("=== netballR Data Fetching Demo ===")

# List all competitions
message("\n1. Listing all available competitions...")
competitions <- tryCatch({
  netballR::listCompetitionsNetballAus()
}, error = function(e) {
  message(sprintf("Error fetching competitions: %s", conditionMessage(e)))
  NULL
})

if (!is.null(competitions)) {
  message(sprintf("Found %d total competitions", nrow(competitions)))
  
  # Show first few competitions
  print(head(competitions[, c("comp_id", "competition_name", "season", "competition_type")]))
  
  # Filter for Diamonds competitions
  diamonds_comps <- subset(competitions, grepl("Diamonds", competition_name, ignore.case = TRUE))
  if (nrow(diamonds_comps) > 0) {
    message(sprintf("\nFound %d Australian Diamonds competitions:", nrow(diamonds_comps)))
    print(diamonds_comps[, c("comp_id", "competition_name", "season", "competition_type")])
    
    # Try to fetch results for the first Diamonds competition
    first_diamonds_comp <- diamonds_comps$comp_id[1]
    message(sprintf("\n2. Attempting to fetch match results for competition %s...", first_diamonds_comp))
    
    tryCatch({
      results <- netballR::matchResults(first_diamonds_comp)
      if (!is.null(results) && nrow(results) > 0) {
        message(sprintf("Successfully fetched %d match results", nrow(results)))
        # Show first few results
        print(head(results[, c("match_id", "home_team", "away_team", "home_score", "away_score", "match_date")]))
      } else {
        message("No match results found for this competition")
      }
    }, error = function(e) {
      message(sprintf("Error fetching match results: %s", conditionMessage(e)))
    })
  } else {
    message("\nNo Australian Diamonds competitions found")
  }
} else {
  message("Failed to fetch competitions data")
}

message("\n=== Demo Complete ===")