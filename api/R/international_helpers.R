# International Netball Helpers
#
# This file contains functions for retrieving and processing international
# netball data (Australian Diamonds and other international teams) from the
# international_* database tables.

# Check if international tables exist in the database
has_international_matches <- function(conn) {
  cache_table_exists_once(conn, "international_matches", "netballstats.int_matches_available")
}

has_international_teams <- function(conn) {
  cache_table_exists_once(conn, "international_teams", "netballstats.int_teams_available")
}

has_international_players <- function(conn) {
  cache_table_exists_once(conn, "international_players", "netballstats.int_players_available")
}

has_international_player_match_stats <- function(conn) {
  cache_table_exists_once(conn, "international_player_match_stats", "netballstats.int_pms_available")
}

has_international_team_match_stats <- function(conn) {
  cache_table_exists_once(conn, "international_team_match_stats", "netballstats.int_tms_available")
}

has_international_player_match_participation <- function(conn) {
  cache_table_exists_once(conn, "international_player_match_participation", "netballstats.int_pmpart_available")
}

has_international_scoreflow_summary <- function(conn) {
  cache_table_exists_once(conn, "international_match_scoreflow_summary", "netballstats.int_scoreflow_available")
}

# Fetch international player profile data
fetch_international_player_profile <- function(conn, player_id) {
  player <- query_rows(
    conn,
    paste(
      "SELECT player_id, firstname, surname, short_display_name, player_name, canonical_name, search_name",
      "FROM international_players",
      "WHERE player_id = ?player_id",
      "LIMIT 1"
    ),
    list(player_id = player_id)
  )
  
  if (!nrow(player)) {
    return(NULL)
  }
  
  player
}

# Fetch international player stats for profile
fetch_international_player_stats <- function(conn, player_id) {
  has_participation <- has_international_player_match_stats(conn) && has_international_player_match_participation(conn)
  
  stats_rows <- if (has_international_player_match_stats(conn)) {
    participation_join <- if (has_participation) {
      "INNER JOIN international_player_match_participation pmpart ON pmpart.player_id = stats.player_id AND pmpart.match_id = stats.match_id"
    } else {
      ""
    }
    
    query_rows(
      conn,
      paste(
        "SELECT stats.match_id, stats.season, stats.squad_name, stats.stat, stats.match_value AS value_number",
        "FROM international_player_match_stats stats",
        participation_join,
        "WHERE stats.player_id = ?player_id AND stats.match_value IS NOT NULL"
      ),
      list(player_id = player_id)
    )
  } else {
    query_rows(
      conn,
      paste(
        "SELECT match_id, season, squad_name, stat, value_number",
        "FROM international_player_period_stats",
        "WHERE player_id = ?player_id AND value_number IS NOT NULL"
      ),
      list(player_id = player_id)
    )
  }
  
  stats_rows
}

# Fetch international player identity data
fetch_international_player_identity <- function(conn, player_id) {
  query_rows(
    conn,
    paste(
      "SELECT * FROM international_player_reference",
      "WHERE player_id = ?player_id",
      "LIMIT 1"
    ),
    list(player_id = player_id)
  )
}

# Fetch international player season stats
fetch_international_player_season_stats <- function(conn, player_id, season = NULL) {
  season_filter <- if (!is.null(season)) {
    "AND stats.season = ?season"
  } else {
    ""
  }
  
  params <- list(player_id = player_id)
  if (!is.null(season)) {
    params$season <- as.integer(season)
  }
  
  query_rows(
    conn,
    paste(
      "SELECT stats.season, stats.squad_name, stats.stat,",
      "  SUM(stats.match_value) AS total_value,",
      "  AVG(stats.match_value) AS average_value,",
      "  COUNT(stats.match_id) AS match_count",
      "FROM international_player_match_stats stats",
      "WHERE stats.player_id = ?player_id",
      season_filter,
      "GROUP BY stats.season, stats.squad_name, stats.stat",
      "ORDER BY stats.season DESC, stats.stat"
    ),
    params
  )
}

# Fetch international player match records (best performances)
fetch_international_player_match_records <- function(conn, player_id, stat = "points", limit = 10L) {
  canonical_stat <- canonical_player_match_stat(stat)
  
  query_rows(
    conn,
    paste(
      "SELECT stats.match_id, stats.season, stats.squad_name,",
      "  m.home_squad_name, m.away_squad_name, m.local_start_time,",
      "  stats.match_value AS value",
      "FROM international_player_match_stats stats",
      "JOIN international_matches m ON m.match_id = stats.match_id",
      "WHERE stats.player_id = ?player_id",
      "  AND stats.stat = ?stat",
      "  AND stats.match_value IS NOT NULL",
      "ORDER BY stats.match_value DESC, stats.match_id",
      "LIMIT ?limit"
    ),
    list(
      player_id = player_id,
      stat = canonical_stat,
      limit = as.integer(limit)
    )
  )
}

# Fetch international team data
fetch_international_team_by_id <- function(conn, squad_id) {
  query_rows(
    conn,
    paste(
      "SELECT squad_id, squad_name, squad_nickname, squad_code",
      "FROM international_teams",
      "WHERE squad_id = ?squad_id",
      "LIMIT 1"
    ),
    list(squad_id = squad_id)
  )
}

# Fetch international player leaders
fetch_international_player_leaders <- function(conn, seasons = NULL, team_id = NULL, stat = "points", search = "", limit = 12L, stat_mode = "total", ranking = "highest") {
  if (!has_international_player_match_stats(conn)) {
    return(data.frame())
  }

  sort_col <- if (identical(stat_mode, "average")) "average_value" else "total_value"
  sort_dir <- ranking_order_sql(ranking)

  base_query <- paste(
    "SELECT p.player_id, p.player_name, stats.squad_id,",
    "  COALESCE(t.squad_name, stats.squad_name) AS squad_name,",
    "  SUM(stats.match_value) AS total_value,",
    "  COUNT(stats.match_id) AS match_count,",
    "  AVG(stats.match_value) AS average_value",
    "FROM international_player_match_stats stats",
    "JOIN international_players p ON p.player_id = stats.player_id",
    "LEFT JOIN international_teams t ON t.squad_id = stats.squad_id",
    "WHERE stats.stat = ?stat"
  )
  params <- list(stat = stat)

  if (!is.null(seasons) && length(seasons)) {
    result <- append_integer_in_filter(base_query, params, "stats.season", as.integer(seasons), "season")
    base_query <- result$query
    params <- result$params
  }

  if (!is.null(team_id)) {
    base_query <- paste0(base_query, " AND stats.squad_id = ?team_id")
    params$team_id <- as.integer(team_id)
  }

  if (nzchar(search)) {
    base_query <- paste0(base_query, " AND p.player_name ILIKE ?search")
    params$search <- paste0("%", search, "%")
  }

  full_query <- paste(
    base_query,
    "GROUP BY p.player_id, p.player_name, stats.squad_id, COALESCE(t.squad_name, stats.squad_name)",
    sprintf("ORDER BY %s %s, match_count DESC, p.player_name ASC", sort_col, sort_dir),
    "LIMIT ?limit"
  )
  params$limit <- as.integer(limit)

  query_rows(conn, full_query, params)
}

# Fetch international team leaders by aggregating player stats per team
fetch_international_team_leaders <- function(conn, seasons = NULL, stat = "points", limit = 10L, stat_mode = "total", ranking = "highest") {
  if (!has_international_player_match_stats(conn)) {
    return(data.frame())
  }

  sort_col <- if (identical(stat_mode, "average")) "average_value" else "total_value"
  sort_dir <- ranking_order_sql(ranking)

  base_query <- paste(
    "SELECT stats.squad_id,",
    "  COALESCE(t.squad_name, stats.squad_name) AS squad_name,",
    "  SUM(stats.match_value) AS total_value,",
    "  COUNT(DISTINCT stats.match_id) AS match_count,",
    "  SUM(stats.match_value) * 1.0 / NULLIF(COUNT(DISTINCT stats.match_id), 0) AS average_value",
    "FROM international_player_match_stats stats",
    "LEFT JOIN international_teams t ON t.squad_id = stats.squad_id",
    "WHERE stats.stat = ?stat"
  )
  params <- list(stat = stat)

  if (!is.null(seasons) && length(seasons)) {
    result <- append_integer_in_filter(base_query, params, "stats.season", as.integer(seasons), "season")
    base_query <- result$query
    params <- result$params
  }

  full_query <- paste(
    base_query,
    "GROUP BY stats.squad_id, COALESCE(t.squad_name, stats.squad_name)",
    sprintf("ORDER BY %s %s, match_count DESC, squad_name ASC", sort_col, sort_dir),
    "LIMIT ?limit"
  )
  params$limit <- as.integer(limit)

  query_rows(conn, full_query, params)
}

# Fetch international match data
fetch_international_match_by_id <- function(conn, match_id) {
  query_rows(
    conn,
    paste(
      "SELECT match_id, season, round_number, game_number,",
      "  match_type, match_status, local_start_time, utc_start_time,",
      "  home_squad_id, home_squad_name, away_squad_id, away_squad_name,",
      "  home_score, away_score",
      "FROM international_matches",
      "WHERE match_id = ?match_id",
      "LIMIT 1"
    ),
    list(match_id = match_id)
  )
}

# Fetch international matches by season
fetch_international_matches_by_season <- function(conn, season, limit = 100L) {
  query_rows(
    conn,
    paste(
      "SELECT match_id, season, round_number, game_number,",
      "  local_start_time, utc_start_time,",
      "  home_squad_id, home_squad_name, away_squad_id, away_squad_name,",
      "  home_score, away_score, match_status",
      "FROM international_matches",
      "WHERE season = ?season",
      "ORDER BY round_number, game_number, local_start_time",
      "LIMIT ?limit"
    ),
    list(season = as.integer(season), limit = as.integer(limit))
  )
}

# Fetch most recent international matches across all seasons, ordered by date desc
fetch_recent_international_matches <- function(conn, limit = 20L) {
  query_rows(
    conn,
    paste(
      "SELECT match_id, season, round_number, game_number,",
      "  local_start_time, utc_start_time,",
      "  home_squad_id, home_squad_name, away_squad_id, away_squad_name,",
      "  home_score, away_score, match_status",
      "FROM international_matches",
      "WHERE match_status = 'complete'",
      "ORDER BY utc_start_time DESC",
      "LIMIT ?limit"
    ),
    list(limit = as.integer(limit))
  )
}

# Fetch international matches filtered by seasons (ordered newest first)
fetch_international_matches_filtered <- function(conn, seasons = NULL, limit = 20L) {
  base_query <- paste(
    "SELECT match_id, season, round_number, game_number,",
    "  local_start_time, utc_start_time, match_status,",
    "  home_squad_id, home_squad_name, away_squad_id, away_squad_name,",
    "  home_score, away_score",
    "FROM international_matches",
    "WHERE 1 = 1"
  )
  params <- list()

  if (!is.null(seasons) && length(seasons) > 0) {
    result <- append_integer_in_filter(base_query, params, "season", as.integer(seasons), "season")
    base_query <- result$query
    params <- result$params
  }

  full_query <- paste(base_query, "ORDER BY utc_start_time DESC LIMIT ?limit")
  params$limit <- as.integer(limit)
  query_rows(conn, full_query, params)
}

# Fetch international metadata: available seasons, stats, and summary counts
fetch_international_meta <- function(conn) {
  seasons <- tryCatch(
    as.integer(query_rows(conn,
      "SELECT DISTINCT season FROM international_matches ORDER BY season DESC", list())$season),
    error = function(e) integer(0)
  )

  player_stats <- tryCatch({
    if (has_international_player_match_stats(conn)) {
      as.character(query_rows(conn,
        "SELECT DISTINCT stat FROM international_player_match_stats ORDER BY stat", list())$stat)
    } else {
      character(0)
    }
  }, error = function(e) character(0))

  match_count <- tryCatch(
    as.integer(query_rows(conn,
      "SELECT COUNT(*) AS n FROM international_matches", list())$n[1]),
    error = function(e) NA_integer_
  )

  player_count <- tryCatch({
    if (has_international_players(conn)) {
      as.integer(query_rows(conn,
        "SELECT COUNT(*) AS n FROM international_players", list())$n[1])
    } else {
      NA_integer_
    }
  }, error = function(e) NA_integer_)

  team_count <- tryCatch(
    as.integer(query_rows(conn,
      "SELECT COUNT(DISTINCT home_squad_id) AS n FROM international_matches", list())$n[1]),
    error = function(e) NA_integer_
  )

  list(
    seasons      = seasons,
    player_stats = player_stats,
    team_stats   = player_stats,
    match_count  = match_count,
    player_count = player_count,
    team_count   = team_count
  )
}

# Build international player profile payload
build_international_player_profile_payload <- function(player_row, stats_rows, identity_row = NULL) {
  available_stats <- if (nrow(stats_rows)) {
    sort(unique(as.character(stats_rows$stat)))
  } else {
    character()
  }
  
  games_played <- if (nrow(stats_rows)) {
    length(unique(stats_rows$match_id))
  } else {
    0L
  }
  
  # Calculate career totals by stat
  career_stats <- if (nrow(stats_rows)) {
    stats_rows %>%
      dplyr::group_by(stat) %>%
      dplyr::summarise(
        total = sum(value_number, na.rm = TRUE),
        average = round(mean(value_number, na.rm = TRUE), 2),
        games = length(unique(match_id)),
        .groups = "drop"
      ) %>%
      dplyr::mutate(total = round(total, 2)) %>%
      dplyr::arrange(stat)
  } else {
    data.frame(stat = character(), total = numeric(), average = numeric(), games = integer())
  }
  
  # Season-by-season breakdown
  season_stats <- if (nrow(stats_rows)) {
    stats_rows %>%
      dplyr::group_by(season, stat) %>%
      dplyr::summarise(
        total = sum(value_number, na.rm = TRUE),
        average = round(mean(value_number, na.rm = TRUE), 2),
        games = length(unique(match_id)),
        .groups = "drop"
      ) %>%
      dplyr::mutate(total = round(total, 2)) %>%
      dplyr::arrange(desc(season), stat)
  } else {
    data.frame(season = integer(), stat = character(), total = numeric(), average = numeric(), games = integer())
  }
  
  result <- list(
    player = list(
      player_id = player_row$player_id[[1]],
      firstname = player_row$firstname[[1]],
      surname = player_row$surname[[1]],
      short_display_name = player_row$short_display_name[[1]],
      player_name = player_row$player_name[[1]],
      canonical_name = player_row$canonical_name[[1]]
    ),
    identity = if (nrow(identity_row)) as.list(identity_row[1, ]) else list(),
    stats = list(
      available = available_stats,
      career = career_stats,
      seasons = split(season_stats, season_stats$season),
      games_played = games_played
    )
  )
  
  result
}