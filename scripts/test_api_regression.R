#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(httr)
  library(jsonlite)
})

`%||%` <- function(x, y) {
  if (is.null(x) || length(x) == 0 || all(is.na(x))) {
    return(y)
  }

  if (is.character(x) && !nzchar(x[[1]])) {
    return(y)
  }

  x
}

build_base_url <- function(args) {
  cli_value <- grep('^--base-url=', args, value = TRUE)
  base_url <- if (length(cli_value)) {
    sub('^--base-url=', '', cli_value[[1]])
  } else {
    Sys.getenv('NETBALL_STATS_API_BASE_URL', 'http://127.0.0.1:8000')
  }

  sub('/+$', '', trimws(base_url))
}

build_endpoint_url <- function(base_url, path, query = list()) {
  parsed <- httr::parse_url(base_url)
  base_path <- sub('/+$', '', parsed$path %||% '')
  suffix <- sub('^/+', '', path)
  parsed$path <- if (nzchar(base_path)) {
    paste0(base_path, '/', suffix)
  } else {
    paste0('/', suffix)
  }
  parsed$query <- query
  httr::build_url(parsed)
}

assert_true <- function(condition, message) {
  if (!isTRUE(condition)) {
    stop(message, call. = FALSE)
  }
}

scalar_value <- function(value) {
  if (is.list(value) && length(value) == 1L) {
    return(scalar_value(value[[1]]))
  }

  if (length(value) == 1L) {
    return(value[[1]])
  }

  value
}

check_step <- function(label) {
  cat(sprintf('✓ %s\n', label))
}

normalize_sql <- function(query) {
  gsub("\\s+", " ", trimws(query))
}

assert_contains <- function(text, needle, message) {
  assert_true(grepl(needle, text, fixed = TRUE), message)
}

request_json <- function(base_url, path, query = list(), expected_status = 200L) {
  url <- build_endpoint_url(base_url, path, query)
  response <- httr::GET(url, httr::timeout(30))
  status <- httr::status_code(response)
  body_text <- httr::content(response, as = 'text', encoding = 'UTF-8')

  if (!identical(status, expected_status)) {
    stop(
      sprintf('Expected HTTP %s from %s, got %s. Body: %s', expected_status, url, status, body_text),
      call. = FALSE
    )
  }

  if (!nzchar(body_text)) {
    return(list())
  }

  jsonlite::fromJSON(body_text, simplifyVector = FALSE)
}

first_record <- function(records) {
  assert_true(is.list(records) && length(records) >= 1, 'Expected at least one record.')
  records[[1]]
}

args <- commandArgs(trailingOnly = TRUE)
base_url <- build_base_url(args)
cat(sprintf('Running API regression checks against %s\n', base_url))

live <- request_json(base_url, '/live')
assert_true(identical(as.character(scalar_value(live$status)), 'ok'), 'Expected /live to report ok status.')
check_step('live endpoint reports ok')

ready <- request_json(base_url, '/ready')
assert_true(identical(as.character(scalar_value(ready$status)), 'ok'), 'Expected /ready to report ok status.')
assert_true(identical(as.character(scalar_value(ready$database)), 'ok'), 'Expected /ready to report database ok.')
check_step('readiness endpoint reports database availability')

meta <- request_json(base_url, '/meta')
assert_true(is.list(meta$seasons) && length(meta$seasons) >= 1, 'Expected /meta to expose at least one season.')
assert_true(is.list(meta$teams) && length(meta$teams) >= 1, 'Expected /meta to expose at least one team.')
assert_true(is.list(meta$team_stats) && length(meta$team_stats) >= 1, 'Expected /meta to expose team stats.')
assert_true(is.list(meta$player_stats) && length(meta$player_stats) >= 1, 'Expected /meta to expose player stats.')
check_step('metadata endpoint returns seasons, teams, and stat catalogs')

default_season <- as.integer(scalar_value(meta$default_season %||% meta$seasons[[1]]))
summary_payload <- request_json(base_url, '/summary', query = list(season = default_season))
assert_true(!is.null(summary_payload$total_matches), 'Expected /summary to return total_matches.')
assert_true(as.numeric(scalar_value(summary_payload$total_matches)) >= 1, 'Expected /summary to report at least one match.')
check_step('summary endpoint returns season totals')

players_payload <- request_json(base_url, '/players', query = list(limit = 1))
player_record <- first_record(players_payload$data)
player_id <- as.integer(scalar_value(player_record$player_id %||% NA_integer_))
assert_true(!is.na(player_id), 'Expected /players to return a player_id.')
check_step('players endpoint returns at least one player')

profile_payload <- request_json(base_url, '/player-profile', query = list(player_id = player_id))
assert_true(as.integer(scalar_value(profile_payload$player$player_id %||% NA_integer_)) == player_id, 'Expected /player-profile to echo the requested player.')
assert_true(is.list(profile_payload$season_summaries), 'Expected /player-profile to include season summaries.')
check_step('player profile endpoint returns career data for a discovered player')

team_leaders_payload <- request_json(base_url, '/team-leaders', query = list(season = default_season, stat = 'goals', limit = 3))
assert_true(is.list(team_leaders_payload$data) && length(team_leaders_payload$data) >= 1, 'Expected /team-leaders to return rows.')
check_step('team leaders endpoint returns ranked team rows')

team_leaders_highest_payload <- request_json(base_url, '/team-leaders', query = list(season = default_season, stat = 'goals', ranking = 'highest', limit = 3))
team_leaders_lowest_payload <- request_json(base_url, '/team-leaders', query = list(season = default_season, stat = 'goals', ranking = 'lowest', limit = 3))
assert_true(is.list(team_leaders_highest_payload$data) && length(team_leaders_highest_payload$data) >= 1, 'Expected /team-leaders highest mode to return rows.')
assert_true(is.list(team_leaders_lowest_payload$data) && length(team_leaders_lowest_payload$data) >= 1, 'Expected /team-leaders lowest mode to return rows.')
highest_value <- as.numeric(scalar_value(team_leaders_highest_payload$data[[1]]$total_value %||% NA_real_))
lowest_value <- as.numeric(scalar_value(team_leaders_lowest_payload$data[[1]]$total_value %||% NA_real_))
assert_true(!is.na(highest_value) && !is.na(lowest_value), 'Expected ranked team rows to expose numeric totals.')
assert_true(highest_value >= lowest_value, 'Expected highest-mode team leaders to rank at least as high as lowest-mode leaders.')
check_step('team leaders endpoint supports highest and lowest ranking modes')

team_game_highs_payload <- request_json(base_url, '/team-game-highs', query = list(season = default_season, stat = 'goals', ranking = 'highest', limit = 3))
team_game_lows_payload <- request_json(base_url, '/team-game-highs', query = list(season = default_season, stat = 'goals', ranking = 'lowest', limit = 3))
assert_true(is.list(team_game_highs_payload$data) && length(team_game_highs_payload$data) >= 1, 'Expected /team-game-highs to return rows.')
assert_true(is.list(team_game_lows_payload$data) && length(team_game_lows_payload$data) >= 1, 'Expected /team-game-highs lowest mode to return rows.')
check_step('team game records endpoint supports highest and lowest ranking modes')

player_game_highs_payload <- request_json(base_url, '/player-game-highs', query = list(season = default_season, stat = 'goals', ranking = 'highest', limit = 3))
assert_true(is.list(player_game_highs_payload$data) && length(player_game_highs_payload$data) >= 1, 'Expected /player-game-highs to return rows.')
check_step('player game records endpoint returns rows')

round_summary_url <- build_endpoint_url(base_url, '/round-summary')
round_summary_response <- httr::GET(round_summary_url, httr::timeout(30))
round_summary_status <- httr::status_code(round_summary_response)
round_summary_text <- httr::content(round_summary_response, as = 'text', encoding = 'UTF-8')
round_summary_payload <- if (nzchar(round_summary_text)) {
  jsonlite::fromJSON(round_summary_text, simplifyVector = FALSE)
} else {
  list()
}

assert_true(round_summary_status %in% c(200L, 404L), sprintf('Expected /round-summary to return 200 or 404, got %s.', round_summary_status))
if (identical(round_summary_status, 200L)) {
  assert_true(nzchar(as.character(scalar_value(round_summary_payload$round_label %||% ''))), 'Expected /round-summary to return a round label.')
  assert_true(is.list(round_summary_payload$matches) && length(round_summary_payload$matches) >= 1, 'Expected /round-summary to return completed matches.')
  assert_true(is.list(round_summary_payload$notable_facts) && length(round_summary_payload$notable_facts) >= 1, 'Expected /round-summary to return notable facts.')
  check_step('round summary endpoint returns recap content')
} else {
  assert_true(nzchar(as.character(scalar_value(round_summary_payload$error %||% ''))), 'Expected /round-summary 404 responses to include an error payload.')
  check_step('round summary endpoint returns a clean 404 when no completed round is available')
}

query_payload <- request_json(
  base_url,
  '/query',
  query = list(question = sprintf('Which players scored 20+ goals in %s?', default_season), limit = 5)
)
assert_true(identical(as.character(scalar_value(query_payload$status)), 'supported'), 'Expected /query to support a representative natural-language question.')
assert_true(nzchar(as.character(scalar_value(query_payload$answer %||% ''))), 'Expected /query to return an answer string.')
check_step('natural-language query endpoint returns a supported answer')

team_query_payload <- request_json(
  base_url,
  '/query',
  query = list(question = sprintf('Which teams scored 60+ goals in %s?', default_season), limit = 5)
)
assert_true(identical(as.character(scalar_value(team_query_payload$status)), 'supported'), 'Expected /query to support a representative team natural-language question.')
assert_true(identical(as.character(scalar_value(team_query_payload$parsed$subject_type %||% '')), 'teams'), 'Expected team query parsing to report teams subject_type.')
check_step('natural-language query endpoint supports representative team queries')

helpers_env <- new.env(parent = globalenv())
sys.source('api/R/helpers.R', envir = helpers_env)
possessive_subject <- helpers_env$extract_query_subject_phrase(
  "What is the Swifts' highest goals total against the Vixens?",
  'highest'
)
assert_true(identical(possessive_subject, 'the Swifts'), 'Expected possessive team phrasing to normalize to the team subject.')
check_step('parser normalizes possessive team phrasing')

player_builder_inputs <- list(
  stat = 'goals',
  seasons = c(2022L, 2023L),
  player_id = 804L,
  opponent_id = 806L,
  comparison = 'gte',
  threshold = 20
)
period_player_query <- do.call(helpers_env$build_player_match_query, player_builder_inputs)
fast_player_query <- do.call(helpers_env$build_fast_player_match_query, player_builder_inputs)
period_player_sql <- normalize_sql(period_player_query$query)
fast_player_sql <- normalize_sql(fast_player_query$query)

assert_true(identical(period_player_query$params, fast_player_query$params), 'Expected player match query builders to keep parameter payloads aligned.')
assert_contains(period_player_sql, 'FROM player_period_stats AS stats', 'Expected player-period builder to query player_period_stats.')
assert_contains(fast_player_sql, 'FROM player_match_stats AS pms', 'Expected player-match builder to query player_match_stats.')
assert_contains(period_player_sql, 'stats.season IN (?season_1, ?season_2)', 'Expected player-period builder to retain season array filters.')
assert_contains(fast_player_sql, 'pms.season IN (?season_1, ?season_2)', 'Expected player-match builder to retain season array filters.')
assert_contains(period_player_sql, 'AND stats.player_id = ?player_id', 'Expected player-period builder to retain player filters.')
assert_contains(fast_player_sql, 'AND pms.player_id = ?player_id', 'Expected player-match builder to retain player filters.')
assert_contains(period_player_sql, 'END) = ?opponent_id', 'Expected player-period builder to retain opponent filters.')
assert_contains(fast_player_sql, 'END) = ?opponent_id', 'Expected player-match builder to retain opponent filters.')
assert_contains(period_player_sql, 'HAVING SUM(stats.value_number) >= ?threshold', 'Expected player-period builder thresholds to stay in HAVING clauses.')
assert_contains(fast_player_sql, 'AND pms.match_value >= ?threshold', 'Expected player-match builder thresholds to stay in WHERE clauses.')
assert_contains(period_player_sql, 'GROUP BY stats.player_id, players.canonical_name, stats.squad_name, stats.season, stats.round_number, stats.match_id, matches.local_start_time', 'Expected player-period builder to keep match-level grouping.')
assert_true(!grepl(' GROUP BY ', fast_player_sql, fixed = TRUE), 'Expected player-match builder to avoid redundant GROUP BY clauses.')
check_step('player match query builders keep filters and threshold placement aligned')

comparison_cases <- list(lt = '<', eq = '=')
for (comparison_name in names(comparison_cases)) {
  expected_operator <- comparison_cases[[comparison_name]]
  period_comparison_query <- normalize_sql(helpers_env$build_player_match_query(
    stat = 'goals',
    comparison = comparison_name,
    threshold = 12
  )$query)
  fast_comparison_query <- normalize_sql(helpers_env$build_fast_player_match_query(
    stat = 'goals',
    comparison = comparison_name,
    threshold = 12
  )$query)

  assert_contains(
    period_comparison_query,
    sprintf('HAVING SUM(stats.value_number) %s ?threshold', expected_operator),
    sprintf('Expected player-period builder to keep %s threshold operators.', comparison_name)
  )
  assert_contains(
    fast_comparison_query,
    sprintf('AND pms.match_value %s ?threshold', expected_operator),
    sprintf('Expected player-match builder to keep %s threshold operators.', comparison_name)
  )
}
check_step('player match query builders preserve comparison operator mapping')

capture_player_game_high_query <- function(use_match_stats, ...) {
  original_has_player_match_stats <- helpers_env$has_player_match_stats
  original_query_rows <- helpers_env$query_rows
  captured <- NULL

  on.exit({
    helpers_env$has_player_match_stats <- original_has_player_match_stats
    helpers_env$query_rows <- original_query_rows
  }, add = TRUE)

  helpers_env$has_player_match_stats <- function(conn) use_match_stats
  helpers_env$query_rows <- function(conn, query, params = list()) {
    captured <<- list(query = query, params = params)
    data.frame()
  }

  helpers_env$fetch_player_game_high_rows(
    conn = NULL,
    ...
  )

  captured
}

player_game_high_inputs <- list(
  seasons = c(2021L, 2022L),
  team_id = 804L,
  round = 5L,
  competition_phase = 'Final',
  stat = 'goals',
  ranking = 'lowest',
  limit = 4L
)
fast_player_game_high_query <- do.call(capture_player_game_high_query, c(list(use_match_stats = TRUE), player_game_high_inputs))
period_player_game_high_query <- do.call(capture_player_game_high_query, c(list(use_match_stats = FALSE), player_game_high_inputs))
fast_player_game_high_sql <- normalize_sql(fast_player_game_high_query$query)
period_player_game_high_sql <- normalize_sql(period_player_game_high_query$query)

assert_true(identical(fast_player_game_high_query$params, period_player_game_high_query$params), 'Expected player game-high query paths to keep parameter payloads aligned.')
assert_contains(fast_player_game_high_sql, 'pms.season IN (?season_1, ?season_2)', 'Expected player game-high fast path to retain season arrays.')
assert_contains(period_player_game_high_sql, 'stats.season IN (?season_1, ?season_2)', 'Expected player game-high fallback path to retain season arrays.')
assert_contains(fast_player_game_high_sql, 'AND pms.squad_id = ?team_id', 'Expected player game-high fast path to retain team filters.')
assert_contains(period_player_game_high_sql, 'AND stats.squad_id = ?team_id', 'Expected player game-high fallback path to retain team filters.')
assert_contains(fast_player_game_high_sql, 'AND pms.round_number = ?round_number', 'Expected player game-high fast path to retain round filters.')
assert_contains(period_player_game_high_sql, 'AND stats.round_number = ?round_number', 'Expected player game-high fallback path to retain round filters.')
assert_contains(fast_player_game_high_sql, "AND COALESCE(matches.competition_phase, '') = ?competition_phase", 'Expected player game-high fast path to retain competition phase filters.')
assert_contains(period_player_game_high_sql, "AND COALESCE(matches.competition_phase, '') = ?competition_phase", 'Expected player game-high fallback path to retain competition phase filters.')
assert_contains(fast_player_game_high_sql, 'ORDER BY pms.match_value ASC', 'Expected player game-high fast path to preserve lowest-ranking ordering.')
assert_contains(period_player_game_high_sql, 'GROUP BY stats.player_id, players.canonical_name, stats.squad_name, stats.season, stats.round_number, stats.match_id, matches.local_start_time ORDER BY total_value ASC', 'Expected player game-high fallback path to preserve match grouping before ordering.')
check_step('player game-high query paths keep filter and ordering clauses aligned')

invalid_summary <- request_json(base_url, '/summary', query = list(season = 1900), expected_status = 400L)
assert_true(nzchar(as.character(invalid_summary$error %||% '')), 'Expected invalid requests to return an error payload.')
check_step('validation errors return a 400 response')

invalid_round_summary <- request_json(base_url, '/round-summary', query = list(round = 1), expected_status = 400L)
assert_true(nzchar(as.character(invalid_round_summary$error %||% '')), 'Expected /round-summary to require a season when round is provided.')
check_step('round summary validation returns a 400 response')

cat('All API regression checks passed.\n')
