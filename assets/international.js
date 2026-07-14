const {
  buildUrl,
  buildSurfaceCitationText,
  bindSurfaceCitationCopy,
  bindArchiveFilterRailOpen,
  debounce = (fn) => fn,
  fetchJson,
  formatNumber,
  formatDate,
  formatStatLabel = (stat) => stat,
  getThemePalette = () => ["#f0c67e", "#79d8d0", "#b88484", "#8d7086"],
  ensureChartsModule = () => Promise.reject(new Error("Charts unavailable")),
  setChartPlaceholder = () => {},
  renderSeasonCheckboxes = () => {},
  renderCheckboxChoices = () => {},
  getCheckedValues = () => [],
  setCheckedValues = () => {},
  syncResponsiveTable = () => {},
  syncArchiveFilterRail = () => {},
  showStatusBanner = () => {},
  cycleStatusBanner = () => {},
  updateSurfaceCitation = () => {},
} = window.NetballStatsUI || {};

const CHART_RANK_LIMIT = 10;
const DEFAULT_CHART_PALETTE = ["#f0c67e", "#79d8d0", "#b88484", "#8d7086", "#a39562", "#6f8aa3"];

let chartsModule = null;
let chartsModulePromise = null;

function loadChartsModule() {
  if (chartsModule) {
    return Promise.resolve(chartsModule);
  }
  if (window.NetballCharts) {
    chartsModule = window.NetballCharts;
    return Promise.resolve(chartsModule);
  }
  if (!chartsModulePromise) {
    chartsModulePromise = ensureChartsModule()
      .then((mod) => {
        chartsModule = mod;
        return mod;
      })
      .catch((error) => {
        chartsModulePromise = null;
        throw error;
      });
  }
  return chartsModulePromise;
}

function clearChart(container, message) {
  if (chartsModule) {
    chartsModule.clearChart(container, message);
    return;
  }
  if (window.NetballCharts) {
    chartsModule = window.NetballCharts;
    chartsModule.clearChart(container, message);
    return;
  }
  setChartPlaceholder(container, message);
}

const CHARTS_LOAD_ERROR_MESSAGE = "Charts couldn't load. Refresh the page and try again.";

function runWithCharts(run, errorContainers = []) {
  return loadChartsModule().then(run).catch((error) => {
    const targets = (Array.isArray(errorContainers) ? errorContainers : [errorContainers]).filter(Boolean);
    targets.forEach((container) => clearChart(container, CHARTS_LOAD_ERROR_MESSAGE));
    if (typeof console !== "undefined" && typeof console.error === "function") {
      console.error(error);
    }
  });
}

function fallbackColour(index) {
  const palette = getThemePalette(DEFAULT_CHART_PALETTE);
  return palette[index % palette.length];
}

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
    seasons:      [],
    competitions: [],
    playerStat:   "points",
    teamStat:     "points",
    statMode:     "total",
    rankingMode:  "highest",
  },
  views: {
    "player-leaders": "table",
    "team-leaders": "table",
    "competition-season": "table"
  },
  deferredPanels: {
    queryKey: "",
    competition: { status: "idle", data: [], error: "" },
    team: { status: "idle", data: [], error: "" },
    player: { status: "idle", data: [], error: "" }
  },
  results: {
    playerLeaderRows: [],
    teamLeaderRows: []
  }
};

const elements = {
  statusBanner:             document.getElementById("int-status-banner"),
  seasonChoices:            document.getElementById("int-season-choices"),
  competitionFilterField:   document.getElementById("int-competition-filter-field"),
  competitionChoices:       document.getElementById("int-competition-choices"),
  filterSummary:            document.getElementById("int-active-filter-summary"),
  playerStat:               document.getElementById("int-player-stat"),
  teamStat:                 document.getElementById("int-team-stat"),
  statMode:                 document.getElementById("int-stat-mode"),
  rankingModeHidden:        document.getElementById("int-ranking-mode"),
  filtersForm:              document.getElementById("int-filters-form"),
  resetBtn:                 document.getElementById("int-reset-filters"),
  summaryMatches:           document.getElementById("int-summary-matches"),
  summaryPlayers:           document.getElementById("int-summary-players"),
  summaryTeams:             document.getElementById("int-summary-teams"),
  playerPanelTitle:         document.getElementById("int-player-panel-title"),
  playerPanelSummary:       document.getElementById("int-player-panel-summary"),
  playerValueHeading:       document.getElementById("int-player-value-heading"),
  playerLeadersBody:        document.getElementById("int-player-leaders-body"),
  playerLeadersUnavail:     document.getElementById("int-player-leaders-unavailable"),
  teamPanelTitle:           document.getElementById("int-team-panel-title"),
  teamPanelSummary:         document.getElementById("int-team-panel-summary"),
  teamValueHeading:         document.getElementById("int-team-value-heading"),
  teamLeadersBody:          document.getElementById("int-team-leaders-body"),
  teamLeadersUnavail:       document.getElementById("int-team-leaders-unavailable"),
  matchesBody:              document.getElementById("int-matches-body"),
  matchesEmpty:             document.getElementById("int-matches-empty"),
  archiveCitation:          document.getElementById("int-archive-citation"),
  archiveCitationText:      document.getElementById("int-archive-citation-text"),
  archiveCitationCopy:      document.getElementById("int-archive-citation-copy"),
  homeOverview:             document.querySelector(".home-overview"),
  archiveFilterDesk:        document.getElementById("int-archive-filter-desk"),
  archiveAdvanced:          document.getElementById("int-archive-advanced"),
  archiveFilterRail:          document.getElementById("int-archive-filter-rail"),
  archiveFilterRailSummary:   document.getElementById("int-archive-filter-rail-summary"),
  archiveFilterRailOpen:      document.getElementById("int-archive-filter-rail-open"),
  seasonScopeNote:            document.getElementById("int-season-scope-note"),
  playerLeadersPanel:         document.getElementById("int-player-leaders-panel"),
  teamLeadersPanel:           document.getElementById("int-team-leaders-panel"),
  playerLeadersChart:         document.getElementById("int-player-leaders-chart"),
  playerLeadersChartTitle:    document.getElementById("int-player-leaders-chart-title"),
  playerTrendChart:           document.getElementById("int-player-trend-chart"),
  playerTrendTitle:           document.getElementById("int-player-trend-title"),
  teamLeadersChart:           document.getElementById("int-team-leaders-chart"),
  teamLeadersChartTitle:      document.getElementById("int-team-leaders-chart-title"),
  teamTrendChart:             document.getElementById("int-team-trend-chart"),
  teamTrendTitle:             document.getElementById("int-team-trend-title"),
  competitionSeasonBody:      document.getElementById("int-competition-season-body"),
  competitionSeasonChart:     document.getElementById("int-competition-season-chart"),
  competitionSeasonSummary:   document.getElementById("int-competition-season-summary"),
  competitionSeasonChartTitle: document.getElementById("int-competition-season-chart-title"),
  competitionValueHeading:    document.getElementById("int-competition-value-heading"),
  competitionSeasonPanel:     document.getElementById("int-competition-season-panel"),
  panelViewButtons:           document.querySelectorAll("[data-panel][data-view-mode]"),
  editorialLead:              document.querySelector(".editorial-lead--international"),
  editorialLeadHeadline:      document.getElementById("int-editorial-lead-headline"),
  editorialLeadCopy:          document.getElementById("int-editorial-lead-copy"),
  editorialLeadFactLabel:     document.getElementById("int-editorial-lead-fact-label"),
  editorialLeadFactValue:     document.getElementById("int-editorial-lead-fact-value"),
  editorialLeadFactCopy:        document.getElementById("int-editorial-lead-fact-copy"),
  editorialLeadSecondaryLabel: document.getElementById("int-editorial-lead-secondary-label"),
  editorialLeadSecondaryValue: document.getElementById("int-editorial-lead-secondary-value"),
  editorialLeadSecondaryCopy: document.getElementById("int-editorial-lead-secondary-copy"),
};

let autoApplyReady = false;
let archiveResultsReady = false;
let runQuerySeq = 0;
const ALL_SEASONS_URL_TOKEN = "all";

async function fetchOptionalJson(path, params = {}) {
  try {
    return await fetchJson(path, params);
  } catch (error) {
    return {
      data: [],
      error: error.message || ""
    };
  }
}

function createDeferredPanelState() {
  return {
    status: "idle",
    data: [],
    error: ""
  };
}

function resetDeferredPanels(queryKey = "") {
  state.deferredPanels = {
    queryKey,
    competition: createDeferredPanelState(),
    team: createDeferredPanelState(),
    player: createDeferredPanelState()
  };
}

function buildIntlQueryKey() {
  return JSON.stringify({
    seasons: [...state.filters.seasons],
    competitions: [...state.filters.competitions],
    playerStat: state.filters.playerStat,
    teamStat: state.filters.teamStat,
    statMode: state.filters.statMode,
    rankingMode: state.filters.rankingMode
  });
}

function intSeriesBaseParams() {
  const params = {
    stat_mode: state.filters.statMode,
    ranking: state.filters.rankingMode,
    limit: String(CHART_RANK_LIMIT)
  };
  if (state.filters.seasons.length > 0) {
    params.seasons = state.filters.seasons.join(",");
  }
  if (state.filters.competitions.length > 0) {
    params.competitions = state.filters.competitions.join(",");
  }
  return params;
}

function intSeasonTotalsParams() {
  return {
    ...intSeriesBaseParams(),
    stat: state.filters.teamStat
  };
}

function intPlayerSeriesParams() {
  return {
    ...intSeriesBaseParams(),
    stat: state.filters.playerStat
  };
}

function intTeamSeriesParams() {
  return {
    ...intSeriesBaseParams(),
    stat: state.filters.teamStat
  };
}

function statModeDescriptor() {
  return state.filters.statMode === "average" ? "average per match" : "total";
}

function rankingModeLabel() {
  return state.filters.rankingMode === "lowest" ? "Lowest" : "Highest";
}

const scheduleFilterApply = debounce(() => {
  if (!autoApplyReady || !state.meta) {
    return;
  }
  applyFilters();
}, 450);

function flushFilterApply() {
  if (typeof scheduleFilterApply.cancel === "function") {
    scheduleFilterApply.cancel();
  }
}

function revealLeaderPanels() {
  if (elements.playerLeadersPanel) {
    elements.playerLeadersPanel.hidden = false;
  }
  if (elements.teamLeadersPanel) {
    elements.teamLeadersPanel.hidden = false;
  }
}

function syncIntlFilterRailState() {
  syncArchiveFilterRail({
    rail: elements.archiveFilterRail,
    summaryElement: elements.archiveFilterRailSummary,
    filterDesk: elements.archiveFilterDesk,
    getSummaryText: () => elements.filterSummary?.textContent?.trim() || "",
    isReady: () => archiveResultsReady
  });
}

function intStatValue(row) {
  if (row?.value != null && !Number.isNaN(Number(row.value))) {
    return Number(row.value);
  }
  return state.filters.statMode === "average"
    ? Number(row.average_value)
    : Number(row.total_value);
}

function renderEditorialLead(meta = state.meta) {
  if (!elements.editorialLeadHeadline || !elements.editorialLeadCopy) {
    return;
  }

  const seasons = meta?.seasons || [];
  const latestSeason = seasons.length ? `${seasons[0]}` : "recent seasons";
  const matchCount = formatNumber(meta?.match_count);
  const nationCount = formatNumber(meta?.team_count);

  elements.editorialLeadHeadline.textContent = `${latestSeason} fixtures are on the shelf.`;
  elements.editorialLeadCopy.textContent = `${matchCount || "International"} matches across ${nationCount || "multiple"} nations — start with player leaders, then open a dossier.`;
  elements.editorialLeadFactLabel.textContent = "Archive route";
  elements.editorialLeadFactValue.textContent = "Ask the stats";
  elements.editorialLeadFactCopy.textContent = "Plain-language questions across Diamonds fixtures and major tournaments.";
  elements.editorialLeadSecondaryLabel.textContent = "Coverage";
  elements.editorialLeadSecondaryValue.textContent = seasons.length ? `${seasons.length} seasons tracked` : "Multi-season archive";
  elements.editorialLeadSecondaryCopy.textContent = "Filter by season and competition when you need a tighter slice.";

  if (elements.editorialLead) {
    elements.editorialLead.hidden = false;
  }
}

function setPanelView(panel, mode) {
  state.views[panel] = mode;

  document.querySelectorAll(`[data-panel-view="${panel}"]`).forEach((view) => {
    view.hidden = view.dataset.panelMode !== mode;
  });

  document.querySelectorAll(`[data-panel="${panel}"][data-view-mode]`).forEach((button) => {
    const active = button.dataset.viewMode === mode;
    button.classList.toggle("is-active", active);
    button.classList.toggle("button--ghost", !active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (panel === "competition-season" && mode === "chart") {
    if (!state.deferredPanels.queryKey) {
      clearChart(elements.competitionSeasonChart, "Switch to chart to see season context.");
      return;
    }
    void fetchDeferredPanel("competition", runQuerySeq);
    return;
  }

  if (panel === "player-leaders" && mode === "chart") {
    renderPlayerLeaderChart(state.results.playerLeaderRows);
    if (!state.deferredPanels.queryKey) {
      clearChart(elements.playerTrendChart, "Switch to chart to load season trends.");
      return;
    }
    void fetchDeferredPanel("player", runQuerySeq);
    return;
  }

  if (panel === "team-leaders" && mode === "chart") {
    renderTeamLeaderChart(state.results.teamLeaderRows);
    if (!state.deferredPanels.queryKey) {
      clearChart(elements.teamTrendChart, "Switch to chart to load season trends.");
      return;
    }
    void fetchDeferredPanel("team", runQuerySeq);
  }
}

function renderCompetitionSeasonTable(rows, errorMessage = "") {
  if (!elements.competitionSeasonBody) {
    return;
  }

  if (errorMessage) {
    elements.competitionSeasonBody.replaceChildren();
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = errorMessage;
    tr.appendChild(td);
    elements.competitionSeasonBody.appendChild(tr);
    syncResponsiveTable(elements.competitionSeasonBody.closest("table"));
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.append(
      createCell(String(row.season)),
      createCell(formatStatLabel(row.stat)),
      createCell(formatNumber(intStatValue(row)), "num"),
      createCell(formatNumber(row.matches_played), "num")
    );
    fragment.appendChild(tr);
  });
  elements.competitionSeasonBody.replaceChildren(fragment);
  syncResponsiveTable(elements.competitionSeasonBody.closest("table"));
}

function renderCompetitionSeasonChart(rows, errorMessage = "") {
  void runWithCharts(({ clearChart: clearChartSurface, renderSeasonColumnChart }) => {
    if (errorMessage) {
      clearChartSurface(elements.competitionSeasonChart, errorMessage);
      return;
    }

    renderSeasonColumnChart(elements.competitionSeasonChart, rows, {
      ariaLabel: `International ${statModeDescriptor()} chart by season for ${formatStatLabel(state.filters.teamStat)}`,
      emptyMessage: "No results for these filters.",
      labelAccessor: (row) => row.season,
      valueAccessor: (row) => intStatValue(row),
      colourAccessor: (_row, index) => fallbackColour(index)
    });
  }, elements.competitionSeasonChart);
}

function renderTeamTrendChart(trendRows, errorMessage = "") {
  void runWithCharts(({ clearChart: clearChartSurface, renderTrendChart }) => {
    if (errorMessage) {
      clearChartSurface(elements.teamTrendChart, errorMessage);
      return;
    }

    renderTrendChart(elements.teamTrendChart, trendRows, {
      ariaLabel: `International team season ${statModeDescriptor()} chart for ${formatStatLabel(state.filters.teamStat)}`,
      emptyMessage: "No results for these filters.",
      singleSeasonMessage: "Choose two or more seasons for a trend.",
      idAccessor: (row) => row.squad_id,
      labelAccessor: (row) => row.squad_name,
      valueAccessor: (row) => intStatValue(row),
      colourAccessor: (row, index) => resolveInternationalColour(row.squad_name, index)
    });
  }, elements.teamTrendChart);
}

function renderPlayerTrendChart(trendRows, errorMessage = "") {
  void runWithCharts(({ clearChart: clearChartSurface, renderTrendChart }) => {
    if (errorMessage) {
      clearChartSurface(elements.playerTrendChart, errorMessage);
      return;
    }

    renderTrendChart(elements.playerTrendChart, trendRows, {
      ariaLabel: `International player season ${statModeDescriptor()} chart for ${formatStatLabel(state.filters.playerStat)}`,
      emptyMessage: "No results for these filters.",
      singleSeasonMessage: "Choose two or more seasons for a trend.",
      idAccessor: (row) => row.player_id,
      labelAccessor: (row) => row.player_name,
      valueAccessor: (row) => intStatValue(row),
      colourAccessor: (row, index) => resolveInternationalColour(row.squad_name, index)
    });
  }, elements.playerTrendChart);
}

function renderCompetitionLoadingState() {
  renderCompetitionSeasonTable([], "Season totals load with the archive filters.");
  clearChart(elements.competitionSeasonChart, "Switch to chart to see season context.");
}

function renderTrendLoadingStates() {
  clearChart(elements.teamTrendChart, "Switch to chart to load season trends.");
  clearChart(elements.playerTrendChart, "Switch to chart to load season trends.");
}

function renderDeferredPanel(panel) {
  const payload = state.deferredPanels[panel];
  if (!payload) {
    return;
  }

  if (panel === "competition") {
    if (payload.status === "loading") {
      renderCompetitionLoadingState();
      return;
    }

    renderCompetitionSeasonTable(
      payload.data,
      payload.error ? "Season totals temporarily unavailable." : ""
    );
    renderCompetitionSeasonChart(
      payload.data,
      payload.error ? "Season chart temporarily unavailable." : ""
    );
    return;
  }

  if (panel === "team") {
    if (payload.status === "loading") {
      clearChart(elements.teamTrendChart, "Switch to chart to load season trends.");
      return;
    }

    renderTeamTrendChart(
      payload.data,
      payload.error ? "Team trend temporarily unavailable." : ""
    );
    return;
  }

  if (panel === "player") {
    if (payload.status === "loading") {
      clearChart(elements.playerTrendChart, "Switch to chart to load season trends.");
      return;
    }

    renderPlayerTrendChart(
      payload.data,
      payload.error ? "Player trend temporarily unavailable." : ""
    );
  }
}

async function fetchDeferredPanel(panel, seq) {
  if (!state.deferredPanels.queryKey) {
    return;
  }

  const current = state.deferredPanels[panel];
  if (!current || current.status === "loading" || current.status === "ready" || current.status === "error") {
    if (current) {
      renderDeferredPanel(panel);
    }
    return;
  }

  state.deferredPanels[panel] = {
    status: "loading",
    data: [],
    error: ""
  };
  renderDeferredPanel(panel);

  const queryKey = state.deferredPanels.queryKey;
  let payload = { data: [], error: "" };
  if (panel === "competition") {
    payload = await fetchOptionalJson("/international/season-totals-series", intSeasonTotalsParams());
  } else if (panel === "team") {
    payload = await fetchOptionalJson("/international/team-season-series", intTeamSeriesParams());
  } else if (panel === "player") {
    payload = await fetchOptionalJson("/international/player-season-series", intPlayerSeriesParams());
  }

  if (seq !== runQuerySeq || state.deferredPanels.queryKey !== queryKey) {
    return;
  }

  state.deferredPanels[panel] = {
    status: payload.error ? "error" : "ready",
    data: payload.data || [],
    error: payload.error || ""
  };
  renderDeferredPanel(panel);
}

function updateCompetitionSeasonSummary() {
  if (elements.competitionSeasonSummary) {
    elements.competitionSeasonSummary.textContent =
      `Season context for ${formatStatLabel(state.filters.teamStat)}.`;
  }
  if (elements.competitionValueHeading) {
    elements.competitionValueHeading.textContent =
      state.filters.statMode === "average" ? "Avg/match" : "Total";
  }
  if (elements.competitionSeasonChartTitle) {
    elements.competitionSeasonChartTitle.textContent =
      `International trend by season for ${formatStatLabel(state.filters.teamStat)}`;
  }
  if (elements.teamTrendTitle) {
    elements.teamTrendTitle.textContent =
      `Season trend for ${rankingModeLabel().toLowerCase()} teams by ${formatStatLabel(state.filters.teamStat)}`;
  }
  if (elements.playerTrendTitle) {
    elements.playerTrendTitle.textContent =
      `Season trend for ${rankingModeLabel().toLowerCase()} players by ${formatStatLabel(state.filters.playerStat)}`;
  }
}

function renderPlayerLeaderChart(rows = state.results.playerLeaderRows) {
  const chartRows = rows.slice(0, CHART_RANK_LIMIT);
  const rankPrefix = state.filters.rankingMode === "lowest" ? "Lowest" : "Top";
  if (elements.playerLeadersChartTitle) {
    elements.playerLeadersChartTitle.textContent =
      `${rankPrefix} international players by ${formatStatLabel(state.filters.playerStat)}`;
  }

  void runWithCharts(({ renderHorizontalBarChart }) => {
    renderHorizontalBarChart(elements.playerLeadersChart, chartRows, {
      ariaLabel: `${rankPrefix} international player leaderboard chart for ${formatStatLabel(state.filters.playerStat)}`,
      emptyMessage: "No results for these filters.",
      labelAccessor: (row) => row.player_name,
      valueAccessor: (row) => intStatValue(row),
      colourAccessor: (row, index) => resolveInternationalColour(row.squad_name, index)
    });
  }, elements.playerLeadersChart);
}

function renderTeamLeaderChart(rows = state.results.teamLeaderRows) {
  const chartRows = rows.slice(0, CHART_RANK_LIMIT);
  const rankPrefix = state.filters.rankingMode === "lowest" ? "Lowest" : "Top";
  if (elements.teamLeadersChartTitle) {
    elements.teamLeadersChartTitle.textContent =
      `${rankPrefix} national teams by ${formatStatLabel(state.filters.teamStat)}`;
  }

  void runWithCharts(({ renderHorizontalBarChart }) => {
    renderHorizontalBarChart(elements.teamLeadersChart, chartRows, {
      ariaLabel: `${rankPrefix} international team leaderboard chart for ${formatStatLabel(state.filters.teamStat)}`,
      emptyMessage: "No results for these filters.",
      labelAccessor: (row) => row.squad_name,
      valueAccessor: (row) => intStatValue(row),
      colourAccessor: (row, index) => resolveInternationalColour(row.squad_name, index)
    });
  }, elements.teamLeadersChart);
}

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
  state.filters.seasons      = getSelectedSeasons();
  state.filters.competitions = getCheckedValues(elements.competitionChoices);
  state.filters.playerStat   = elements.playerStat?.value || "points";
  state.filters.teamStat     = elements.teamStat?.value || "points";
  state.filters.statMode     = elements.statMode?.value || "total";
}

function updateCompetitionFilter() {
  const allComps = state.meta?.competitions || [];
  if (allComps.length <= 1) {
    if (elements.competitionFilterField) elements.competitionFilterField.hidden = true;
    state.filters.competitions = [];
    return;
  }

  const selectedSeasons = getSelectedSeasons();
  const availableComps = selectedSeasons.length === 0
    ? allComps
    : allComps.filter((c) => c.seasons.some((s) => selectedSeasons.includes(String(s))));

  if (availableComps.length <= 1) {
    if (elements.competitionFilterField) elements.competitionFilterField.hidden = true;
    state.filters.competitions = [];
    return;
  }

  if (elements.competitionFilterField) elements.competitionFilterField.hidden = false;

  const prevSelected = new Set(
    state.filters.competitions.length
      ? state.filters.competitions
      : availableComps.map((c) => c.competition_name)
  );

  renderCheckboxChoices(elements.competitionChoices, availableComps.map((c) => c.competition_name), {
    className: "season-choice",
    inputName: "int-competition",
    selectedValues: [...prevSelected],
  });
}

function isAllSeasonsScope(seasons = state.filters.seasons) {
  return !seasons.length;
}

function syncIntlUrlState() {
  if (!window.history || typeof window.history.replaceState !== "function") {
    return;
  }

  syncFiltersFromForm();
  const params = new URLSearchParams();
  if (state.filters.seasons.length) {
    params.set("seasons", state.filters.seasons.join(","));
  } else if (state.meta?.seasons?.length) {
    params.set("seasons", ALL_SEASONS_URL_TOKEN);
  }

  const nextUrl = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

function applyIntlUrlState(meta) {
  const url = new URL(window.location.href);
  if (!url.searchParams.toString()) {
    return false;
  }

  const validSeasons = new Set((meta.seasons || []).map((season) => `${season}`));
  const seasonsParam = (url.searchParams.get("seasons") || "").trim();
  if (seasonsParam.toLowerCase() === ALL_SEASONS_URL_TOKEN) {
    setCheckedValues(elements.seasonChoices, []);
    state.filters.seasons = [];
  } else if (seasonsParam) {
    const seasons = seasonsParam
      .split(",")
      .map((value) => value.trim())
      .filter((value) => validSeasons.has(value));
    if (seasons.length) {
      setCheckedValues(elements.seasonChoices, seasons);
      state.filters.seasons = seasons;
    }
  }

  updateCompetitionFilter();
  renderFilterSummary();
  return true;
}

function describeSeasons(seasons) {
  if (isAllSeasonsScope(seasons)) {
    return "All seasons · full archive";
  }
  if (seasons.length === 1) return `season ${seasons[0]}`;
  return `${seasons.length} seasons selected`;
}

function renderFilterSummary() {
  if (!elements.filterSummary) return;
  const { seasons, playerStat, teamStat, statMode, rankingMode } = state.filters;
  const modeLabel = statMode === "average" ? "averages" : "totals";
  const rankLabel = rankingMode === "lowest" ? "lowest" : "highest";
  const segments = [
    describeSeasons(seasons),
    `Player ${formatStatLabel(playerStat)}`,
    `Team ${formatStatLabel(teamStat)}`,
    modeLabel,
    rankLabel
  ];
  if (state.filters.competitions.length) {
    segments.push(`Competitions: ${state.filters.competitions.join(", ")}`);
  }
  elements.filterSummary.textContent = segments.join(" · ");
  if (elements.seasonScopeNote) {
    elements.seasonScopeNote.hidden = !isAllSeasonsScope(seasons);
  }
  if (elements.archiveAdvanced) {
    const hasTighterSlice = Boolean(
      statMode !== "total"
      || rankingMode !== "highest"
      || state.filters.competitions.length
    );
    elements.archiveAdvanced.open = hasTighterSlice;
  }
  renderIntlCitation();
  syncArchiveFilterDeskOpen();
  syncIntlFilterRailState();
}

function syncArchiveFilterDeskOpen() {
  if (!elements.archiveFilterDesk) {
    return;
  }

  syncFiltersFromForm();
  const hasTighterSlice = Boolean(
    state.filters.statMode !== "total"
    || state.filters.rankingMode !== "highest"
    || state.filters.competitions.length
  );
  elements.archiveFilterDesk.open = hasTighterSlice;
}

function buildIntlCitationSegments() {
  syncFiltersFromForm();
  const segments = [
    describeSeasons(state.filters.seasons),
    `Player stat: ${formatStatLabel(state.filters.playerStat)}`,
    `Team stat: ${formatStatLabel(state.filters.teamStat)}`,
    state.filters.statMode === "average" ? "Averages" : "Totals",
    state.filters.rankingMode === "lowest" ? "Lowest ranked" : "Highest ranked"
  ];
  if (state.filters.competitions.length) {
    segments.push(`Competitions: ${state.filters.competitions.join(", ")}`);
  }
  return segments;
}

function renderIntlCitation() {
  updateSurfaceCitation(
    elements.archiveCitation,
    elements.archiveCitationText,
    archiveResultsReady ? buildSurfaceCitationText({ scope: "international", segments: buildIntlCitationSegments() }) : "",
    { visible: archiveResultsReady }
  );
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

  updateCompetitionFilter();

  // Summary cards
  if (elements.summaryMatches) elements.summaryMatches.textContent = formatNumber(meta.match_count) ?? "";
  if (elements.summaryPlayers) elements.summaryPlayers.textContent = formatNumber(meta.player_count) ?? "";
  if (elements.summaryTeams) elements.summaryTeams.textContent = formatNumber(meta.team_count) ?? "";
  if (elements.homeOverview) {
    elements.homeOverview.hidden = false;
  }

  renderEditorialLead(meta);
  renderFilterSummary();
  updateCompetitionSeasonSummary();
}

async function loadPlayerLeaders() {
  const { seasons, competitions, playerStat, statMode, rankingMode } = state.filters;
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
  if (competitions.length > 0) params.competitions = competitions.join(",");

  try {
    const response = await fetchJson("/international/leaders", params);
    const rows = response?.leaders || [];
    state.results.playerLeaderRows = rows;

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
      link.className = "table-link table-link--dossier";
      const label = document.createElement("span");
      label.textContent = row.player_name || "–";
      const meta = document.createElement("span");
      meta.className = "table-link__meta";
      meta.textContent = "Open dossier";
      link.append(label, meta);
      playerTd.appendChild(link);
      playerTd.dataset.stackPrimary = "true";

      tr.append(
        createCell(String(index + 1)),
        playerTd,
        createTeamCell(row.squad_name || "–", colour),
        createCell(formatStatLabel(row.stat)),
        createCell(formatNumber(statVal), "num"),
        createCell(formatNumber(row.match_count), "num"),
      );
      fragment.appendChild(tr);
    });

    if (elements.playerLeadersBody) {
      elements.playerLeadersBody.replaceChildren(fragment);
      syncResponsiveTable(elements.playerLeadersBody.closest("table"));
    }
    if (state.views["player-leaders"] === "chart") {
      renderPlayerLeaderChart(rows);
    }
  } catch {
    showEl(elements.playerLeadersUnavail);
  }
}

async function loadTeamLeaders() {
  const { seasons, competitions, teamStat, statMode, rankingMode } = state.filters;
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
  if (competitions.length > 0) params.competitions = competitions.join(",");

  try {
    const response = await fetchJson("/international/leaders", params);
    const rows = response?.leaders || [];
    state.results.teamLeaderRows = rows;

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
        createCell(formatStatLabel(row.stat)),
        createCell(formatNumber(statVal), "num"),
        createCell(formatNumber(row.match_count), "num"),
      );
      fragment.appendChild(tr);
    });

    if (elements.teamLeadersBody) {
      elements.teamLeadersBody.replaceChildren(fragment);
      syncResponsiveTable(elements.teamLeadersBody.closest("table"));
    }
    if (state.views["team-leaders"] === "chart") {
      renderTeamLeaderChart(rows);
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
  const seq = ++runQuerySeq;
  syncFiltersFromForm();
  renderFilterSummary();
  updateCompetitionSeasonSummary();
  state.results.playerLeaderRows = [];
  state.results.teamLeaderRows = [];
  resetDeferredPanels();
  cycleStatusBanner(elements.statusBanner, [
    "Loading international stats…",
    "Gathering player leaders…",
    "Calculating team standings…",
  ], { kicker: "Loading", tone: "loading" });
  try {
    await Promise.all([loadPlayerLeaders(), loadTeamLeaders(), loadMatches()]);
    if (seq !== runQuerySeq) {
      return;
    }
    resetDeferredPanels(buildIntlQueryKey());
    renderCompetitionLoadingState();
    renderTrendLoadingStates();
    showStatusBanner(elements.statusBanner, "Stats ready.", "success", {
      kicker: "Ready",
      autoHideMs: 2000,
    });
    archiveResultsReady = true;
    revealLeaderPanels();
    renderIntlCitation();
    syncIntlFilterRailState();
    syncIntlUrlState();
    setPanelView("competition-season", state.views["competition-season"]);
    setPanelView("player-leaders", state.views["player-leaders"]);
    setPanelView("team-leaders", state.views["team-leaders"]);
    void fetchDeferredPanel("competition", seq);
  } catch {
    if (seq !== runQuerySeq) {
      return;
    }
    showStatusBanner(elements.statusBanner, "Some stats could not be loaded.", "error", {
      kicker: "Partial results",
    });
    revealLeaderPanels();
  }
}

async function initialize() {
  bindArchiveFilterRailOpen(elements.archiveFilterRailOpen, elements.archiveFilterDesk);
  elements.panelViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPanelView(button.dataset.panel, button.dataset.viewMode || "table");
    });
  });

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
      state.filters.competitions = [];
      updateCompetitionFilter();
      renderFilterSummary();
      scheduleFilterApply();
    });
  });

  if (elements.seasonChoices) {
    elements.seasonChoices.addEventListener("change", () => {
      state.filters.competitions = [];
      updateCompetitionFilter();
      renderFilterSummary();
      scheduleFilterApply();
    });
  }

  if (elements.competitionChoices) {
    elements.competitionChoices.addEventListener("change", () => {
      renderFilterSummary();
      scheduleFilterApply();
    });
  }

  document.querySelectorAll("[data-int-ranking-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRankingMode(btn.dataset.intRankingMode);
      renderFilterSummary();
      scheduleFilterApply();
    });
  });

  if (elements.filtersForm) {
    elements.filtersForm.addEventListener("submit", (e) => {
      e.preventDefault();
      flushFilterApply();
      applyFilters();
    });
    elements.filtersForm.addEventListener("input", () => {
      renderFilterSummary();
      scheduleFilterApply();
    });
    elements.filtersForm.addEventListener("change", () => {
      renderFilterSummary();
      scheduleFilterApply();
    });
  }

  if (elements.resetBtn) {
    elements.resetBtn.addEventListener("click", () => {
      if (!state.meta) return;
      flushFilterApply();
      const latest = state.meta.seasons?.length ? [`${state.meta.seasons[0]}`] : [];
      setCheckedValues(elements.seasonChoices, latest);
      const defaultStat = (list) => list?.includes("points") ? "points" : (list?.[0] || "");
      if (elements.playerStat) elements.playerStat.value = defaultStat(state.meta.player_stats);
      if (elements.teamStat) elements.teamStat.value = defaultStat(state.meta.team_stats);
      if (elements.statMode) elements.statMode.value = "total";
      setRankingMode("highest");
      state.filters.seasons = latest;
      state.filters.competitions = [];
      state.filters.playerStat = defaultStat(state.meta.player_stats);
      state.filters.teamStat = defaultStat(state.meta.team_stats);
      state.filters.statMode = "total";
      updateCompetitionFilter();
      renderFilterSummary();
      applyFilters();
    });
  }

  try {
    const meta = await fetchJson("/international/meta");
    if (meta) {
      applyMeta(meta);
      applyIntlUrlState(meta);
    }
  } catch {
    if (elements.filterSummary) elements.filterSummary.textContent = "Unable to load filter options.";
  }

  autoApplyReady = true;
  setPanelView("competition-season", "table");
  await applyFilters();
  trackEvent("international_home_viewed");
}

bindSurfaceCitationCopy(
  elements.archiveCitationCopy,
  () => buildSurfaceCitationText({ scope: "international", segments: buildIntlCitationSegments() }),
  {
    onSuccess: () => showStatusBanner(elements.statusBanner, "Citation copied.", "success", { autoHideMs: 2000 }),
    onError: () => showStatusBanner(elements.statusBanner, "Couldn't copy citation.", "error", { kicker: "Copy failed" })
  }
);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
