#!/usr/bin/env Rscript

# Debug script to check why config file isn't being populated

suppressPackageStartupMessages({
  library(netballR)
  library(dplyr)
})

message("=== Debug International Config Creation ===")

# Discover competitions
message("Discovering Australian Diamonds competitions...")
competitions_data <- netballR::listCompetitionsNetballAus()
diamonds_competitions <- subset(competitions_data, grepl("Diamonds", competition_name, ignore.case = TRUE))

message(sprintf("Found %d Australian Diamonds competitions", nrow(diamonds_competitions)))

if (nrow(diamonds_competitions) > 0) {
  # Show what we found
  message("Competition data:")
  print(diamonds_competitions)
  
  # Try to create config data
  message("Creating config data...")
  config_data <- diamonds_competitions %>%
    select(competition_id = comp_id) %>%
    mutate(
      season = as.integer(format(Sys.Date(), "%Y")),
      phase = "regular"
    ) %>%
    select(season, phase, competition_id)
  
  message("Config data to write:")
  print(config_data)
  message(sprintf("Config data has %d rows", nrow(config_data)))
  
  # Write to config file
  config_path <- "config/international_competitions.csv"
  message(sprintf("Writing to %s", config_path))
  write.csv(config_data, config_path, row.names = FALSE)
  message("Write completed")
  
  # Check what was written
  message("Checking written file:")
  written_data <- read.csv(config_path)
  print(written_data)
} else {
  message("No competitions found")
}