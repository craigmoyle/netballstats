#!/usr/bin/env Rscript

assert_true <- function(condition, message) {
  if (!isTRUE(condition)) {
    stop(message, call. = FALSE)
  }
}

script_text <- paste(readLines("scripts/build_database.R", warn = FALSE), collapse = "\n")

assert_true(
  grepl("entries\\[\\[index\\]\\](\\$payload)?\\s*<-\\s*NULL", script_text),
  "Expected prepare_match_tables() to clear processed raw entries so the rebuild does not retain every match payload in memory."
)

assert_true(
  grepl("gc\\(", script_text),
  "Expected build_database.R to trigger garbage collection during or immediately after raw payload processing."
)

cat("build_database.R releases processed payload memory during ETL.\n")
