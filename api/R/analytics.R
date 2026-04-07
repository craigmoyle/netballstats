`%||%` <- function(x, y) if (is.null(x) || length(x) == 0L || all(is.na(x))) y else x

ANALYTICAL_METRICS <- list(
  playerScoringEfficiency = list(
    key = "playerScoringEfficiency",
    subject = "player",
    family = "Efficiency",
    label = "Scoring Efficiency",
    short_label = "Score Eff",
    description = "Points scored per shooting attempt.",
    formula = "(goal1 + 2 * goal2) / goalAttempts",
    metric_modes = c("average"),
    prefer_low = FALSE,
    valid_from_season = 2008L
  ),
  playerAttackInvolvementRate = list(
    key = "playerAttackInvolvementRate",
    subject = "player",
    family = "Involvement",
    label = "Attack Involvement Rate",
    short_label = "Atk Involve",
    description = "Share of a team's attacking actions driven by the player.",
    formula = "(feeds + goalAssists + centrePassReceives + goalAttempts) / team_attacking_actions",
    metric_modes = c("average"),
    prefer_low = FALSE,
    valid_from_season = 2008L
  ),
  playerTurnoverCostRate = list(
    key = "playerTurnoverCostRate",
    subject = "player",
    family = "Ball Security and Pressure",
    label = "Turnover Cost Rate",
    short_label = "TO Cost",
    description = "Possession giveaways relative to the player's attacking load.",
    formula = "(generalPlayTurnovers + unforcedTurnovers + interceptPassThrown) / player_attacking_actions",
    metric_modes = c("average"),
    prefer_low = TRUE,
    valid_from_season = 2008L
  ),
  playerDefensiveDisruption = list(
    key = "playerDefensiveDisruption",
    subject = "player",
    family = "Ball Security and Pressure",
    label = "Defensive Disruption",
    short_label = "Disruption",
    description = "Total defensive disruption created from gains, intercepts, deflections, and rebounds.",
    formula = "gain + intercepts + deflections + rebounds",
    metric_modes = c("total", "average"),
    prefer_low = FALSE,
    valid_from_season = 2008L
  ),
  playerPressureBalance = list(
    key = "playerPressureBalance",
    subject = "player",
    family = "Ball Security and Pressure",
    label = "Pressure Balance",
    short_label = "Press Bal",
    description = "Defensive disruption created minus direct possession giveaways.",
    formula = "playerDefensiveDisruption - (generalPlayTurnovers + unforcedTurnovers + interceptPassThrown)",
    metric_modes = c("total", "average"),
    prefer_low = FALSE,
    valid_from_season = 2008L
  ),
  teamFinishingEfficiency = list(
    key = "teamFinishingEfficiency",
    subject = "team",
    family = "Efficiency",
    label = "Finishing Efficiency",
    short_label = "Finish Eff",
    description = "Points scored per team shooting attempt.",
    formula = "points / goalAttempts",
    metric_modes = c("average"),
    prefer_low = FALSE,
    valid_from_season = 2008L
  ),
  teamBallSecurityRate = list(
    key = "teamBallSecurityRate",
    subject = "team",
    family = "Ball Security and Pressure",
    label = "Ball Security Rate",
    short_label = "Ball Sec",
    description = "Turnovers committed per team possession.",
    formula = "(generalPlayTurnovers + unforcedTurnovers) / possessions",
    metric_modes = c("average"),
    prefer_low = TRUE,
    valid_from_season = 2008L
  ),
  teamDisruption = list(
    key = "teamDisruption",
    subject = "team",
    family = "Ball Security and Pressure",
    label = "Team Disruption",
    short_label = "Disruption",
    description = "Combined gains, intercepts, and deflections.",
    formula = "gain + intercepts + deflections",
    metric_modes = c("total", "average"),
    prefer_low = FALSE,
    valid_from_season = 2008L
  ),
  teamPossessionControlBalance = list(
    key = "teamPossessionControlBalance",
    subject = "team",
    family = "Ball Security and Pressure",
    label = "Possession Control Balance",
    short_label = "Control Bal",
    description = "Ball-winning events created minus direct turnover giveaways.",
    formula = "(gain + intercepts) - (generalPlayTurnovers + unforcedTurnovers)",
    metric_modes = c("total", "average"),
    prefer_low = FALSE,
    valid_from_season = 2008L
  )
)

analytics_metric_definition <- function(key) ANALYTICAL_METRICS[[key]] %||% NULL

analytics_metric_keys <- function(subject = c("player", "team")) {
  subject <- match.arg(subject)
  names(Filter(function(def) identical(def$subject, subject), ANALYTICAL_METRICS))
}

is_analytical_metric <- function(key, subject = NULL) {
  definition <- analytics_metric_definition(key)
  if (is.null(definition)) {
    return(FALSE)
  }
  if (is.null(subject)) {
    return(TRUE)
  }
  identical(definition$subject, subject)
}

analytics_metric_supports_mode <- function(key, metric_mode) {
  definition <- analytics_metric_definition(key)
  !is.null(definition) && metric_mode %in% definition$metric_modes
}

analytics_metric_default_mode <- function(key) {
  definition <- analytics_metric_definition(key)
  if (is.null(definition)) "total" else definition$metric_modes[[1]]
}

analytics_catalog_records <- function(subject = c("player", "team")) {
  subject <- match.arg(subject)
  lapply(analytics_metric_keys(subject), function(key) {
    definition <- analytics_metric_definition(key)
    list(
      key = definition$key,
      label = definition$label,
      short_label = definition$short_label,
      family = definition$family,
      description = definition$description,
      formula = definition$formula,
      metric_modes = definition$metric_modes,
      prefer_low = definition$prefer_low,
      valid_from_season = definition$valid_from_season
    )
  })
}

build_player_analytics_notes <- function(profile_values) {
  notes <- character()

  if (!is.null(profile_values$playerAttackInvolvementRate) && profile_values$playerAttackInvolvementRate >= 0.28) {
    notes <- c(notes, "High attacking involvement: the player sits at the centre of a large share of their team's ball flow.")
  }
  if (!is.null(profile_values$playerScoringEfficiency) && profile_values$playerScoringEfficiency >= 1.05) {
    notes <- c(notes, "Efficient finisher: shot output converts into points at a strong rate.")
  }
  if (!is.null(profile_values$playerTurnoverCostRate) && profile_values$playerTurnoverCostRate <= 0.10) {
    notes <- c(notes, "Ball-secure under load: possessions are rarely wasted relative to attacking responsibility.")
  }
  if (!is.null(profile_values$playerPressureBalance) && profile_values$playerPressureBalance >= 3) {
    notes <- c(notes, "Positive pressure balance: defensive disruption comfortably outweighs direct giveaways.")
  }

  unique(notes)
}
