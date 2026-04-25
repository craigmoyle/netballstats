# Test suite for parse_natural_language_question()
# Run with: Rscript api/R/test_parse_question.R

source("api/R/parse_question.R")

# Helper function to run a single test
test_parser <- function(question, expected) {
  result <- parse_natural_language_question(question)

  if (!result$success) {
    cat(sprintf("FAIL: %s\n  Error: %s\n", question, result$error))
    return(FALSE)
  }

  parsed <- result$parsed
  all_pass <- TRUE

  for (field in names(expected)) {
    actual <- parsed[[field]]
    exp_val <- expected[[field]]

    # Compare values, handling NULL cases
    if (is.null(exp_val) && is.null(actual)) {
      # Both NULL - pass
      next
    } else if (is.null(exp_val) || is.null(actual)) {
      # One is NULL, other is not - fail
      cat(sprintf("FAIL: %s\n  Field '%s': expected %s, got %s\n",
                  question, field, deparse(exp_val), deparse(actual)))
      all_pass <- FALSE
    } else if (actual != exp_val) {
      # Values don't match - fail
      cat(sprintf("FAIL: %s\n  Field '%s': expected %s, got %s\n",
                  question, field, exp_val, actual))
      all_pass <- FALSE
    }
  }

  if (all_pass) {
    cat(sprintf("PASS: %s\n", question))
  }

  return(all_pass)
}

# Test suite
cat("\n=== Testing threshold extraction ===\n")

test_parser(
  "How many times has nikki osbourne scored 50 goals or more?",
  list(
    operator = "count_threshold",
    stat = "goals",
    subject = "nikki osbourne",
    threshold = 50,
    opponent_name = NULL,
    season = NULL
  )
)

test_parser(
  "How many matches did Caitlin Bassett have 5+ intercepts?",
  list(
    operator = "count_threshold",
    stat = "intercepts",
    subject = "caitlin bassett",
    threshold = 5,
    opponent_name = NULL,
    season = NULL
  )
)

test_parser(
  "At least 10 goal assists in a match?",
  list(
    operator = "count_threshold",
    stat = "goalAssists",
    threshold = 10,
    opponent_name = NULL,
    season = NULL
  )
)

cat("\n=== Testing team names (correct Super Netball 2025 teams) ===\n")

test_parser(
  "Adelaide Thunderbirds highest scoring game?",
  list(
    operator = "highest",
    stat = "goals",
    subject = "adelaide thunderbirds"
  )
)

test_parser(
  "Melbourne Vixens vs NSW Swifts head to head?",
  list(
    operator = "head_to_head",
    subject = "melbourne vixens",
    opponent_name = "nsw swifts"
  )
)

test_parser(
  "GWS Giants lowest penalty game?",
  list(
    operator = "lowest",
    stat = "penalties",
    subject = "gws giants"
  )
)

test_parser(
  "Queensland Firebirds against Sunshine Coast Lightning gains?",
  list(
    operator = "count_threshold",
    stat = "gain",
    subject = "queensland firebirds",
    opponent_name = "sunshine coast lightning"
  )
)

test_parser(
  "West Coast Fever deflection record?",
  list(
    operator = "highest",
    stat = "deflections",
    subject = "west coast fever"
  )
)

cat("\n=== Testing stat aliases ===\n")

test_parser(
  "Liz Watson ga record?",
  list(
    operator = "highest",
    stat = "goalAssists",
    subject = "liz watson"
  )
)

test_parser(
  "Which players recorded the most int?",
  list(
    operator = "list",
    stat = "intercepts",
    subject = "players"
  )
)

test_parser(
  "Highest gpt by a team in 2023?",
  list(
    operator = "highest",
    stat = "generalPlayTurnovers",
    subject = "teams",
    season = 2023
  )
)

test_parser(
  "Collingwood Magpies pts per game?",
  list(
    operator = "highest",
    stat = "points",
    subject = "collingwood magpies"
  )
)

cat("\n=== Testing operators ===\n")

test_parser(
  "Which players had the most intercepts in 2022?",
  list(
    operator = "list",
    stat = "intercepts",
    subject = "players",
    season = 2022
  )
)

test_parser(
  "Which teams had the lowest defensive gains?",
  list(
    operator = "list",
    stat = "gain",
    subject = "teams"
  )
)

test_parser(
  "Paige Van Der Schaaf feeds record 2024?",
  list(
    operator = "highest",
    stat = "feeds",
    subject = "paige van der schaaf",
    season = 2024
  )
)

cat("\n=== Testing parse failures ===\n")

# Invalid stat should fail
result <- parse_natural_language_question("How many xyz did someone do?")
if (!result$success) {
  cat("PASS: Invalid stat detected (returns error)\n")
} else {
  cat("FAIL: Should reject invalid stat\n")
}

# Empty question should fail
result <- parse_natural_language_question("")
if (!result$success) {
  cat("PASS: Empty question rejected\n")
} else {
  cat("FAIL: Should reject empty question\n")
}

# No subject should fail
result <- parse_natural_language_question("How many goals were scored?")
if (!result$success) {
  cat("PASS: No subject detected (returns error)\n")
} else {
  cat("FAIL: Should reject question with no subject\n")
}

cat("\n=== All tests completed ===\n")
