first_fixture_value <- function(value) {
  if (is.null(value) || !length(value) || all(is.na(value))) {
    return(NULL)
  }

  value[[1]]
}

normalize_fixture_round_number <- function(value) {
  raw_value <- first_fixture_value(value)
  normalized <- if (is.null(raw_value)) "" else trimws(as.character(raw_value))
  parsed <- suppressWarnings(as.integer(sub("^[Rr]", "", normalized)))

  if (is.na(parsed) || parsed < 1L) {
    stop("Fixture round number must be numeric or R-prefixed numeric.", call. = FALSE)
  }

  parsed
}

normalize_fixture_match_number <- function(match_number = NULL, game_number = NULL) {
  for (candidate in list(match_number, game_number)) {
    raw_value <- first_fixture_value(candidate)
    if (is.null(raw_value)) {
      next
    }
    parsed <- suppressWarnings(as.integer(raw_value))
    if (length(parsed) == 1L && !is.na(parsed) && parsed >= 1L) {
      return(parsed)
    }
  }

  1L
}

normalize_fixture_competition_phase <- function(competition_id, finals_type = NULL, competitions = NULL) {
  comp_id <- suppressWarnings(as.integer(first_fixture_value(competition_id)))
  if (!is.null(competitions) && nrow(competitions)) {
    matched <- competitions[competitions$competition_id == comp_id, , drop = FALSE]
    if (nrow(matched)) {
      return(as.character(matched$phase[[1]]))
    }
  }

  finals_label <- toupper(trimws(as.character(first_fixture_value(finals_type) %||% "")))
  if (nzchar(finals_label)) {
    return("finals")
  }

  "regular"
}

normalize_fixture_season_round_number <- function(
  competition_phase,
  finals_type = NULL,
  round_number = NULL,
  max_regular_round = NULL
) {
  phase <- trimws(as.character(competition_phase %||% ""))
  if (!identical(phase, "finals")) {
    return(normalize_fixture_round_number(round_number))
  }

  finals_label <- toupper(trimws(as.character(first_fixture_value(finals_type) %||% "")))
  offset <- switch(
    finals_label,
    SEMI = 1L,
    PRELIM = 2L,
    PRELIMINARY = 2L,
    GRAND = 3L,
    NA_integer_
  )
  max_regular <- suppressWarnings(as.integer(first_fixture_value(max_regular_round)))
  if (!is.na(offset) && !is.na(max_regular) && max_regular >= 1L) {
    return(max_regular + offset)
  }

  normalize_fixture_round_number(round_number)
}

normalize_fixture_team_name <- function(value) {
  team_map <- c(
    "Swifts" = "NSW Swifts",
    "GIANTS" = "GIANTS Netball",
    "Thunderbirds" = "Adelaide Thunderbirds",
    "Lightning" = "Sunshine Coast Lightning",
    "Firebirds" = "Queensland Firebirds",
    "Mavericks" = "Melbourne Mavericks",
    "Fever" = "West Coast Fever",
    "Vixens" = "Melbourne Vixens"
  )

  raw_value <- first_fixture_value(value)
  normalized <- as.character(raw_value %||% "")
  mapped <- unname(team_map[[normalized]])
  if (!is.null(mapped) && nzchar(mapped)) {
    return(mapped)
  }

  normalized
}
