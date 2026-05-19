#!/usr/bin/env Rscript
message("=== CONTAINER FILE CHECK ===")
message(sprintf("Working directory: %s", getwd()))
message(sprintf("Directory contents:"))

# List all files recursively
files <- list.files(recursive = TRUE)
for (file in files) {
  message(sprintf("  %s", file))
}

message(sprintf("\nScripts directory exists: %s", ifelse(dir.exists("scripts"), "YES", "NO")))
if (dir.exists("scripts")) {
  scripts_files <- list.files("scripts")
  message(sprintf("Scripts directory contents: %s", paste(scripts_files, collapse = ", ")))
}

message(sprintf("\nAbsolute path check:"))
message(sprintf("Full path to scripts dir: %s", file.path(getwd(), "scripts")))
message(sprintf("scripts dir exists (absolute): %s", ifelse(dir.exists(file.path(getwd(), "scripts")), "YES", "NO")))