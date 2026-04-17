#!/usr/bin/env Rscript

script_path <- function() {
  file_arg <- grep("^--file=", commandArgs(), value = TRUE)
  if (!length(file_arg)) {
    return(normalizePath(".", mustWork = FALSE))
  }
  normalizePath(sub("^--file=", "", file_arg[[1]]), mustWork = FALSE)
}

repo_root <- normalizePath(file.path(dirname(script_path()), ".."), mustWork = FALSE)
source(file.path(repo_root, "R", "player_reference.R"), local = TRUE)

reference_path <- file.path(repo_root, "config", "player_reference.csv")
reference_rows <- read_player_reference_csv(reference_path)
invalid_reference_path <- file.path(repo_root, "config", ".player_reference_invalid_test.csv")
writeLines(
  c(
    "player_id,date_of_birth,nationality,import_status,source_label,source_url,verified_at,notes",
    "1.5,2000-01-01,Australia,local,Manual,https://example.com,2026-04-17,"
  ),
  invalid_reference_path
)
on.exit(unlink(invalid_reference_path), add = TRUE)

stopifnot(
  identical(
    names(reference_rows),
    c("player_id", "date_of_birth", "nationality", "import_status", "source_label", "source_url", "verified_at", "notes")
  )
)
stopifnot(nrow(reference_rows) >= 0)
stopifnot(identical(normalize_import_status("Import"), "import"))
stopifnot(identical(normalize_import_status("LOCAL"), "local"))
stopifnot(identical(debut_age_band(19.9), "19 and under"))
stopifnot(identical(debut_age_band(20.0), "20 to 22"))
stopifnot(identical(debut_age_band(26.0), "26 and over"))
invalid_player_id_error <- tryCatch(
  {
    read_player_reference_csv(invalid_reference_path)
    NULL
  },
  error = function(error) error$message
)
stopifnot(identical(invalid_player_id_error, "player_id must be an integer in every maintained row."))

cat("Player reference contract checks passed\n")
