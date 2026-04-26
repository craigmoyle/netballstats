source("api/R/helpers.R")

question <- "Which teams had the lowest general play turnovers in 2025?"
parsed_question <- parse_query_question(question)
normalized_text <- normalize_query_phrase(parsed_question, keep_spaces = TRUE)

resolved_stat <- resolve_query_stat(normalized_text)
if (!identical(resolved_stat, "generalPlayTurnovers")) {
  stop(sprintf(
    "Expected resolve_query_stat() to map '%s' to generalPlayTurnovers, got %s",
    normalized_text,
    if (is.null(resolved_stat)) "NULL" else resolved_stat
  ))
}

fake_conn <- structure(list(), class = "test-conn")
resolve_query_team <- function(conn, phrase) {
  if (is.null(phrase)) return(NULL)
  if (identical(phrase, "teams")) {
    return(list(status = "supported", subject_type = "teams"))
  }
  NULL
}
resolve_query_subject <- function(conn, phrase) {
  stop("resolve_query_subject should not be called for plural team list questions")
}

intent <- parse_query_intent(fake_conn, question, limit = 12L)
if (!identical(intent$status, "supported")) {
  stop(sprintf("Expected parse_query_intent() to support question, got status %s", intent$status %||% "NULL"))
}
if (!identical(intent$stat, "generalPlayTurnovers")) {
  stop(sprintf("Expected parse_query_intent() stat generalPlayTurnovers, got %s", intent$stat %||% "NULL"))
}
if (!identical(intent$subject_type, "teams")) {
  stop(sprintf("Expected parse_query_intent() subject_type teams, got %s", intent$subject_type %||% "NULL"))
}

cat("Query stat alias checks passed.\n")
