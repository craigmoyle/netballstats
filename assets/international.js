const {
  buildUrl,
  fetchJson,
  formatNumber,
  formatDate,
  formatStatLabel = (stat) => stat,
  renderSeasonCheckboxes = () => {},
  getCheckedValues = () => [],
  setCheckedValues = () => {},
  syncResponsiveTable = () => {},
  showStatusBanner = () => {},
  cycleStatusBanner = () => {},
} = window.NetballStatsUI || {};

const {
  trackEvent = () => {},
} = window.NetballStatsTelemetry || {};

// National team colour map — keyed on lowercase name fragments
const INTERNATIONAL_TEAM_COLOURS = {
  australia:      "#00843D",
  diamonds:       "#00843D",
  "silver ferns": "#2D6A4F",
  "new zealand":  "#2D6A4F",
  england:        "#C60C30",
  roses:          "#C60C30",
  "south africa": "#E36B11",
  proteas:        "#E36B11",
  jamaica:        "#D4A017",
  uganda:         "#D90000",
  "she-cranes":   "#D90000",
  malawi:         "#BB0000",
  scotland:       "#005EB8",
  fiji:           "#1A6FA8",
  samoa:          "#8B1C1C",
  zimbabwe:       "#007A33",
  wales:          "#C8102E",
  tonga:          "#8B1C1C",
  trinidad:       "#C60C30",
};

const FALLBACK_PALETTE = ["#C38B59", "#5BA8A0", "#7A6EA0", "#D9705D", "#6FA86B", "#A06B6B"];

// Stat group assignments for optgroup rendering in stat dropdowns
const INT_STAT_GROUPS = {
  goals:                    "Scoring",
  goalAttempts:             "Scoring",
  missedGoals:              "Scoring",
  goalAssists:              "Scoring",
  points:                   "Scoring",
  goalsFromCentrePass:      "Scoring",
  goalsFromGain:            "Scoring",
  goalsFromTurnovers:       "Scoring",
  feeds:                    "Creation",
  feedWithAttempt:          "Creation",
  centrePassReceives:       "Creation",
  disposals:                "Creation",
  possessions:              "Creation",
  possessionChanges:        "Creation",
  timeInPossession:         "Creation",
  gain:                     "Defence",
  intercepts:               "Defence",
  deflections:              "Defence",
  deflectionWithGain:       "Defence",
  deflectionWithNoGain:     "Defence",
  deflectionPossessionGain: "Defence",
  offensiveRebounds:        "Defence",
  defensiveRebounds:        "Defence",
  contactPenalties:         "Discipline",
  obstructionPenalties:     "Discipline",
  generalPlayTurnovers:     "Discipline",
  unforcedTurnovers:        "Discipline",
  turnoverHeld:             "Discipline",
  missedGoalTurnover:       "Discipline",
  interceptPassThrown:      "Discipline",
  tossUpWin:                "Discipline",
};
const INT_STAT_GROUP_ORDER = ["Scoring", "Creation", "Defence", "Discipline", "Other"];

function resolveInternationalColour(name, index) {
  if (name) {
    const lower = name.toLowerCase();
    for (const [key, colour] of Object.entries(INTERNATIONAL_TEAM_COLOURS)) {
      if (lower.includes(key)) return colour;
    }
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

const state = {
  meta: null,
  filters: {
    seasons:     [],
    playerStat:  "points",
    teamStat:    "points",
    statMode:    "total",
    rankingMode: "highest",
  },
};

const elements = {
  statusBanner:           document.getElementById("int-status-banner"),
  seasonChoices:          document.getElementById("int-season-choices"),
  filterSummary:          document.getElementById("int-active-filter-summary"),
  playerStat:             document.getElementById("int-player-stat"),
  teamStat:               document.getElementById("int-team-stat"),
  statMode:               document.getElementById("int-stat-mode"),
  rankingModeHidden:      document.getElementById("int-ranking-mode"),
  filtersForm:            document.getElementById("int-filters-form"),
  resetBtn:               document.getElementById("int-reset-filters"),
  summaryMatches:         document.getElementById("int-summary-matches"),
  summaryPlayers:         document.getElementById("int-summary-players"),
  summaryTeams:           document.getElementById("int-summary-teams"),
  playerPanelTitle:       document.getElementById("int-player-panel-title"),
  playerPanelSummary:     document.getElementById("int-player-panel-summary"),
  playerValueHeading:     document.getElementById("int-player-value-heading"),
  playerLeadersBody:      document.getElementById("int-player-leaders-body"),
  playerLeadersUnavail:   document.getElementById("int-player-leaders-unavailable"),
  teamPanelTitle:         document.getElementById("int-team-panel-title"),
  teamPanelSummary:       document.getElementById("int-team-panel-summary"),
  teamValueHeading:       document.getElementById("int-team-value-heading"),
  teamLeadersBody:        document.getElementById("int-team-leaders-body"),
  teamLeadersUnavail:     document.getElementById("int-team-leaders-unavailable"),
  matchesBody:            document.getElementById("int-matches-body"),
  matchesEmpty:           document.getElementById("int-matches-empty"),
};

function showEl(el) { if (el) el.hidden = false; }
function hideEl(el) { if (el) el.hidden = true; }

function populateSelect(select, options) {
  if (!select) return;
  const prev = select.value;
  select.replaceChildren();
  options.forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });
  if ([...select.options].some((o) => o.value === prev)) select.value = prev;
}

function populateGroupedSelect(select, stats) {
  if (!select) return;
  const prev = select.value;
  select.replaceChildren();

  const groups = new Map(INT_STAT_GROUP_ORDER.map((g) => [g, []]));
  stats.forEach((stat) => {
    const group = INT_STAT_GROUPS[stat] || "Other";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(stat);
  });

  INT_STAT_GROUP_ORDER.forEach((groupName) => {
    const items = groups.get(groupName);
    if (!items?.length) return;
    const grp = document.createElement("optgroup");
    grp.label = groupName;
    items.forEach((stat) => {
      const opt = document.createElement("option");
      opt.value = stat;
      opt.textContent = formatStatLabel(stat);
      grp.appendChild(opt);
    });
    select.appendChild(grp);
  });

  if ([...select.options].some((o) => o.value === prev)) select.value = prev;
}

function createCell(text, className) {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.textContent = text ?? "–";
  return td;
}

function createTeamCell(name, colour) {
  const td = document.createElement("td");
  const swatch = document.createElement("span");
  swatch.className = "team-swatch";
  swatch.setAttribute("aria-hidden", "true");
  swatch.style.setProperty("--swatch-color", colour || "var(--muted)");
  td.appendChild(swatch);
  td.appendChild(document.createTextNode(name ?? "–"));
  return td;
}

function getSelectedSeasons() {
  return getCheckedValues(elements.seasonChoices)
    .sort((a, b) => Number(b) - Number(a));
}

function syncFiltersFromForm() {
  state.filters.seasons    = getSelectedSeasons();
  state.filters.playerStat = elements.playerStat?.value || "points";
  state.filters.teamStat   = elements.teamStat?.value || "points";
  state.filters.statMode   = elements.statMode?.value || "total";
}

function describeSeasons(seasons) {
  if (!seasons.length) return "all seasons";
  if (seasons.length === 1) return `season ${seasons[0]}`;
  return `${seasons.length} seasons selected`;
}

function renderFilterSummary() {
  if (!elements.filterSummary) return;
  const { seasons, playerStat, statMode, rankingMode } = state.filters;
  const modeLabel = statMode === "average" ? "averages" : "totals";
  const rankLabel = rankingMode === "lowest" ? "lowest" : "highest";
  elements.filterSummary.textContent =
    `${describeSeasons(seasons)} · ${formatStatLabel(playerStat)} ${modeLabel} · ${rankLabel}`;
}

function setRankingMode(mode = "highest") {
  state.filters.rankingMode = mode;
  if (elements.rankingModeHidden) elements.rankingModeHidden.value = mode;
  document.querySelectorAll("[data-int-ranking-mode]").forEach((btn) => {
    const isActive = btn.dataset.intRankingMode === mode;
    btn.classList.toggle("is-active", isActive);
    btn.classList.toggle("button--ghost", !isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
}

function applyMeta(meta) {
  state.meta = meta;

  renderSeasonCheckboxes(elements.seasonChoices, meta.seasons || [], { inputName: "int-season" });

  const playerStats = meta.player_stats || [];
  const teamStats   = meta.team_stats   || [];
  populateGroupedSelect(elements.playerStat, playerStats);
  populateGroupedSelect(elements.teamStat, teamStats);

  const defaultStat = (list) => list.includes("points") ? "points" : (list[0] || "points");
  if (elements.playerStat) elements.playerStat.value = defaultStat(playerStats);
  if (elements.teamStat)   elements.teamStat.value   = defaultStat(teamStats);
  state.filters.playerStat = defaultStat(playerStats);
  state.filters.teamStat   = defaultStat(teamStats);

  // Default to latest season
  const latestSeason = meta.seasons?.length ? [`${meta.seasons[0]}`] : [];
  setCheckedValues(elements.seasonChoices, latestSeason);
  state.filters.seasons = latestSeason;

  // Summary cards
  if (elements.summaryMatches) elements.summaryMatches.textContent = formatNumber(meta.match_count) ?? "–";
  if (elements.summaryPlayers) elements.summaryPlayers.textContent = formatNumber(meta.player_count) ?? "–";
  if (elements.summaryTeams)   elements.summaryTeams.textContent   = formatNumber(meta.team_count) ?? "–";

  renderFilterSummary();
}

async function loadPlayerLeaders() {
  const { seasons, playerStat, statMode, rankingMode } = state.filters;
  hideEl(elements.playerLeadersUnavail);

  const statLabel  = formatStatLabel(playerStat);
  const modeLabel  = statMode === "average" ? "average per match" : "total";
  const rankPrefix = rankingMode === "lowest" ? "Lowest" : "Top";

  if (elements.playerPanelSummary) {
    elements.playerPanelSummary.textContent =
      `${rankPrefix} ${modeLabel} ${statLabel} · ${describeSeasons(seasons)}`;
  }
  if (elements.playerValueHeading) {
    elements.playerValueHeading.textContent = statMode === "average" ? "Avg/match" : "Total";
  }

  const params = { type: "player", stat: playerStat, stat_mode: statMode, ranking: rankingMode, limit: "12" };
  if (seasons.length > 0) params.seasons = seasons.join(",");

  try {
    const response = await fetchJson("/international/leaders", params);
    const rows = response?.leaders || [];

    if (!rows.length) {
      showEl(elements.playerLeadersUnavail);
      if (elements.playerLeadersBody) elements.playerLeadersBody.replaceChildren();
      return;
    }

    const fragment = document.createDocumentFragment();
    rows.forEach((row, index) => {
      const colour = resolveInternationalColour(row.squad_name, index);
      const tr = document.createElement("tr");
      tr.setAttribute("data-rank", index + 1);
      tr.style.setProperty("--row-accent", colour);

      const statVal = statMode === "average" ? Number(row.average_value) : Number(row.total_value);

      const playerTd = document.createElement("td");
      const link = document.createElement("a");
      link.href = `/international/player/?player_id=${encodeURIComponent(row.player_id)}`;
      link.textContent = row.player_name || "–";
      playerTd.appendChild(link);
      playerTd.dataset.stackPrimary = "true";

      tr.append(
        createCell(String(index + 1)),
        playerTd,
        createTeamCell(row.squad_name || "–", colour),
        createCell(formatNumber(statVal), "num"),
        createCell(formatNumber(row.match_count), "num"),
      );
      fragment.appendChild(tr);
    });

    if (elements.playerLeadersBody) {
      elements.playerLeadersBody.replaceChildren(fragment);
      syncResponsiveTable(elements.playerLeadersBody.closest("table"));
    }
  } catch {
    showEl(elements.playerLeadersUnavail);
  }
}

async function loadTeamLeaders() {
  const { seasons, teamStat, statMode, rankingMode } = state.filters;
  hideEl(elements.teamLeadersUnavail);

  const statLabel  = formatStatLabel(teamStat);
  const modeLabel  = statMode === "average" ? "average per match" : "total";
  const rankPrefix = rankingMode === "lowest" ? "Lowest" : "Top";

  if (elements.teamPanelSummary) {
    elements.teamPanelSummary.textContent =
      `${rankPrefix} ${modeLabel} ${statLabel} · ${describeSeasons(seasons)}`;
  }
  if (elements.teamValueHeading) {
    elements.teamValueHeading.textContent = statMode === "average" ? "Avg/match" : "Total";
  }

  const params = { type: "team", stat: teamStat, stat_mode: statMode, ranking: rankingMode, limit: "10" };
  if (seasons.length > 0) params.seasons = seasons.join(",");

  try {
    const response = await fetchJson("/international/leaders", params);
    const rows = response?.leaders || [];

    if (!rows.length) {
      showEl(elements.teamLeadersUnavail);
      if (elements.teamLeadersBody) elements.teamLeadersBody.replaceChildren();
      return;
    }

    const fragment = document.createDocumentFragment();
    rows.forEach((row, index) => {
      const colour = resolveInternationalColour(row.squad_name, index);
      const tr = document.createElement("tr");
      tr.setAttribute("data-rank", index + 1);
      tr.style.setProperty("--row-accent", colour);

      const statVal = statMode === "average" ? Number(row.average_value) : Number(row.total_value);
      const teamTd = createTeamCell(row.squad_name || "–", colour);
      teamTd.dataset.stackPrimary = "true";

      tr.append(
        createCell(String(index + 1)),
        teamTd,
        createCell(formatNumber(statVal), "num"),
        createCell(formatNumber(row.match_count), "num"),
      );
      fragment.appendChild(tr);
    });

    if (elements.teamLeadersBody) {
      elements.teamLeadersBody.replaceChildren(fragment);
      syncResponsiveTable(elements.teamLeadersBody.closest("table"));
    }
  } catch {
    showEl(elements.teamLeadersUnavail);
  }
}

async function loadMatches() {
  const { seasons } = state.filters;
  hideEl(elements.matchesEmpty);

  const params = { limit: "10" };
  if (seasons.length > 0) params.seasons = seasons.join(",");

  try {
    const response = await fetchJson("/international/matches", params);
    const matches = response?.matches || [];

    if (!matches.length) {
      if (elements.matchesBody) elements.matchesBody.replaceChildren();
      showEl(elements.matchesEmpty);
      return;
    }

    const fragment = document.createDocumentFragment();
    matches.forEach((match) => {
      const tr = document.createElement("tr");

      const seasonTd = createCell(String(match.season || "–"));
      seasonTd.dataset.label = "Season";

      const roundTd = createCell(match.round_number != null ? `Rd ${match.round_number}` : "–");
      roundTd.dataset.label = "Round";

      const dateTd = createCell(match.local_start_time ? formatDate(match.local_start_time) : "–");
      dateTd.dataset.label = "Date";

      const resultTd = document.createElement("td");
      resultTd.dataset.label = "Result";
      resultTd.dataset.stackPrimary = "true";

      const isComplete = match.match_status === "complete";
      if (isComplete) {
        const homeScore = Number(match.home_score);
        const awayScore = Number(match.away_score);
        const homeWon   = homeScore > awayScore;
        const awayWon   = awayScore > homeScore;

        const homeSpan = document.createElement("span");
        homeSpan.textContent = `${match.home_squad_name || "?"} ${homeScore}`;
        homeSpan.className   = homeWon ? "result-winner" : "result-loser";

        const awaySpan = document.createElement("span");
        awaySpan.textContent = `${awayScore} ${match.away_squad_name || "?"}`;
        awaySpan.className   = awayWon ? "result-winner" : "result-loser";

        resultTd.append(homeSpan, document.createTextNode(" – "), awaySpan);
      } else {
        resultTd.textContent = `${match.home_squad_name || "?"} vs ${match.away_squad_name || "?"}`;
      }

      tr.append(seasonTd, roundTd, dateTd, resultTd);
      fragment.appendChild(tr);
    });

    if (elements.matchesBody) {
      elements.matchesBody.replaceChildren(fragment);
      syncResponsiveTable(elements.matchesBody.closest("table"));
    }
  } catch {
    showEl(elements.matchesEmpty);
  }
}

async function applyFilters() {
  syncFiltersFromForm();
  renderFilterSummary();
  cycleStatusBanner(elements.statusBanner, [
    "Loading international stats…",
    "Gathering player leaders…",
    "Calculating team standings…",
  ], { kicker: "Loading", tone: "loading" });
  try {
    await Promise.all([loadPlayerLeaders(), loadTeamLeaders(), loadMatches()]);
    showStatusBanner(elements.statusBanner, "Stats ready.", "success", {
      kicker: "Ready",
      autoHideMs: 2000,
    });
  } catch {
    showStatusBanner(elements.statusBanner, "Some stats could not be loaded.", "error", {
      kicker: "Partial results",
    });
  }
}

async function initialize() {
  // Season quick actions
  document.querySelectorAll("[data-int-season-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.intSeasonAction;
      if (!state.meta) return;
      if (action === "latest") {
        const latest = state.meta.seasons?.length ? [`${state.meta.seasons[0]}`] : [];
        setCheckedValues(elements.seasonChoices, latest);
      } else if (action === "all") {
        setCheckedValues(elements.seasonChoices, (state.meta.seasons || []).map((s) => `${s}`));
      } else if (action === "clear") {
        setCheckedValues(elements.seasonChoices, []);
      }
    });
  });

  // Ranking mode toggle buttons
  document.querySelectorAll("[data-int-ranking-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setRankingMode(btn.dataset.intRankingMode));
  });

  // Filter form submit
  if (elements.filtersForm) {
    elements.filtersForm.addEventListener("submit", (e) => {
      e.preventDefault();
      applyFilters();
    });
  }

  // Reset button
  if (elements.resetBtn) {
    elements.resetBtn.addEventListener("click", () => {
      if (!state.meta) return;
      const latest = state.meta.seasons?.length ? [`${state.meta.seasons[0]}`] : [];
      setCheckedValues(elements.seasonChoices, latest);
      const defaultStat = (list) => list?.includes("points") ? "points" : (list?.[0] || "");
      if (elements.playerStat) elements.playerStat.value = defaultStat(state.meta.player_stats);
      if (elements.teamStat)   elements.teamStat.value   = defaultStat(state.meta.team_stats);
      if (elements.statMode)   elements.statMode.value   = "total";
      setRankingMode("highest");
      state.filters.seasons    = latest;
      state.filters.playerStat = defaultStat(state.meta.player_stats);
      state.filters.teamStat   = defaultStat(state.meta.team_stats);
      state.filters.statMode   = "total";
      renderFilterSummary();
      applyFilters();
    });
  }

  // Load meta from dedicated international endpoint
  try {
    const meta = await fetchJson("/international/meta");
    if (meta) applyMeta(meta);
  } catch {
    if (elements.filterSummary) elements.filterSummary.textContent = "Unable to load filter options.";
  }

  await applyFilters();
  trackEvent("international_home_viewed");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
