#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(DBI)
  library(RPostgres)
})

source("R/database.R")
source("api/R/helpers.R")

test_conn <- NULL

setup_test_db <- function() {
  tryCatch(
    {
      test_conn <<- open_database_connection()
      cat("✓ Connected to test database\n")
      TRUE
    },
    error = function(e) {
      cat("Note: Database connection not available (",
          conditionMessage(e),
          "). Continuing with function existence check.\n", sep = "")
      FALSE
    }
  )
}

test_comparison_query_exists <- function() {
  if (!exists("build_comparison_query", mode = "function")) {
    cat("✗ build_comparison_query function not found\n")
    return(FALSE)
  }
  cat("✓ build_comparison_query function exists\n")
  TRUE
}

test_trend_query_exists <- function() {
  if (!exists("build_trend_query", mode = "function")) {
    cat("✗ build_trend_query function not found\n")
    return(FALSE)
  }
  cat("✓ build_trend_query function exists\n")
  TRUE
}

test_combination_query_exists <- function() {
  if (!exists("build_combination_query", mode = "function")) {
    cat("✗ build_combination_query function not found\n")
    return(FALSE)
  }
  cat("✓ build_combination_query function exists\n")
  TRUE
}

test_comparison_query <- function() {
  if (is.null(test_conn)) {
    cat("⊘ Skipping comparison query database test (no connection)\n")
    return(TRUE)
  }

  tryCatch(
    {
      result <- build_comparison_query(
        subjects = c("Vixens", "Swifts"),
        stat = "goalAssists",
        season = 2025,
        conn = test_conn
      )

      stopifnot(
        !is.null(result),
        result$status == "supported",
        result$intent_type == "comparison",
        length(result$results) == 2,
        result$results[[1]]$subject == "Vixens" || result$results[[1]]$subject == "Swifts",
        !is.null(result$comparison),
        !is.null(result$comparison$leader)
      )
      cat("✓ Comparison query test passed\n")
      TRUE
    },
    error = function(e) {
      cat("✗ Comparison query test failed:", conditionMessage(e), "\n")
      FALSE
    }
  )
}

test_trend_query <- function() {
  if (is.null(test_conn)) {
    cat("✗ No database connection for trend query test\n")
    return(FALSE)
  }

  tryCatch(
    {
      result <- build_trend_query(
        subject = "Grace Nweke",
        stat = "goalAssists",
        seasons = c(2023, 2024, 2025),
        conn = test_conn
      )

      stopifnot(
        !is.null(result),
        result$status == "supported",
        result$intent_type == "trend",
        result$subject == "Grace Nweke",
        result$subject_type == "player",
        result$stat == "goalAssists",
        !is.null(result$stat_label),
        length(result$seasons) == 3,
        length(result$results) > 0
      )

      for (i in seq_along(result$results)) {
        r <- result$results[[i]]
        stopifnot(
          !is.null(r$season),
          !is.null(r$total),
          !is.null(r$games),
          !is.null(r$average),
          is.numeric(r$average),
          is.numeric(r$total),
          is.numeric(r$games)
        )
        if (i > 1) {
          stopifnot(
            !is.null(r$yoy_change),
            !is.null(r$yoy_change_label),
            is.numeric(r$yoy_change)
          )
        }
      }
      cat("✓ Trend query test passed\n")
      TRUE
    },
    error = function(e) {
      cat("✗ Trend query test failed:", conditionMessage(e), "\n")
      FALSE
    }
  )
}

test_record_query <- function() {
  if (is.null(test_conn)) {
    cat("✗ No database connection for record query test\n")
    return(FALSE)
  }

  tryCatch(
    {
      result <- build_record_query(
        stat = "intercepts",
        subject_type = "player",
        conn = test_conn
      )

      stopifnot(
        !is.null(result),
        result$status == "supported",
        result$intent_type == "record",
        result$stat == "intercepts",
        result$scope == "all_time",
        !is.null(result$record),
        !is.null(result$record$value),
        !is.null(result$record$all_time_rank),
        !is.null(result$context),
        length(result$context) > 0
      )
      cat("✓ Record query test passed\n")
      TRUE
    },
    error = function(e) {
      cat("✗ Record query test failed:", conditionMessage(e), "\n")
      FALSE
    }
  )
}

test_combination_query <- function() {
  if (is.null(test_conn)) {
    cat("✗ No database connection for combination query test\n")
    return(FALSE)
  }

  tryCatch(
    {
      result <- build_combination_query(
        filters = list(
          list(stat = "goals", operator = ">=", threshold = 40),
          list(stat = "gain", operator = ">=", threshold = 5)
        ),
        logical_operator = "AND",
        season = 2024,
        conn = test_conn
      )

      stopifnot(
        !is.null(result),
        result$status == "supported",
        result$intent_type == "combination",
        length(result$filters) == 2,
        result$logical_operator == "AND",
        result$season == 2024,
        result$total_matches >= 0
      )

      if (length(result$results) > 0) {
        stopifnot(
          !is.null(result$results[[1]]$player),
          !is.null(result$results[[1]]$goals),
          !is.null(result$results[[1]]$gain)
        )
      }

      cat("✓ Combination query test passed\n")
      TRUE
    },
    error = function(e) {
      cat("✗ Combination query test failed:", conditionMessage(e), "\n")
      FALSE
    }
  )
}

run_tests <- function() {
  cat("Running query expansion tests...\n\n")

  success <- TRUE
  success <- test_comparison_query_exists() && success
  success <- test_trend_query_exists() && success
  success <- test_combination_query_exists() && success

  if (!setup_test_db()) {
    cat("\nDatabase connection unavailable; skipping database-dependent tests.\n")
  } else {
    success <- test_comparison_query() && success
    success <- test_trend_query() && success
    success <- test_record_query() && success
    success <- test_combination_query() && success
  }

  if (success) {
    cat("\n✓ All tests passed\n")
  } else {
    cat("\n✗ Some tests failed\n")
  }

  if (!is.null(test_conn)) {
    tryCatch(DBI::dbDisconnect(test_conn), error = function(e) NULL)
  }

  invisible(success)
}

if (!interactive()) {
  success <- run_tests()
  quit(status = if (success) 0 else 1)
}
