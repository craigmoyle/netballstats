const config = window.NETBALL_STATS_CONFIG || {};
const API_BASE_URL = (config.apiBaseUrl || "/api").replace(/\/$/, "");
const DEFAULT_TIMEOUT_MS = 12000;

const state = {
  meta: null,
  filters: {
    season: "",
    teamId: "",
    round: "",
    teamStat: "goals",
    playerStat: "goals",
    playerSearch: ""
  }
};

const elements = {
  statusBanner: document.getElementById("status-banner"),
  filtersForm: document.getElementById("filters-form"),
  season: document.getElementById("season"),
  teamId: document.getElementById("team-id"),
  round: document.getElementById("round"),
  teamStat: document.getElementById("team-stat"),
  playerStat: document.getElementById("player-stat"),
  playerSearch: document.getElementById("player-search"),
  resetFilters: document.getElementById("reset-filters"),
  summaryMatches: document.getElementById("summary-matches"),
  summaryTeams: document.getElementById("summary-teams"),
  summaryPlayers: document.getElementById("summary-players"),
  summaryGoals: document.getElementById("summary-goals"),
  summaryRefreshed: document.getElementById("summary-refreshed"),
  summaryMode: document.getElementById("summary-mode"),
  matchesTableBody: document.querySelector("#matches-table tbody"),
  teamLeadersBody: document.querySelector("#team-leaders-table tbody"),
  playerLeadersBody: document.querySelector("#player-leaders-table tbody"),
  apiBase: document.getElementById("api-base")
};

elements.apiBase.textContent = API_BASE_URL;

function showStatus(message, tone = "neutral") {
  elements.statusBanner.textContent = message;
  elements.statusBanner.dataset.tone = tone;
  elements.statusBanner.hidden = !message;
}

function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url;
}

async function fetchJson(path, params = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path, params), {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({ error: "The API returned invalid JSON." }));
    if (!response.ok) {
      throw new Error(payload.error || `Request failed with status ${response.status}.`);
    }

    return payload;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return new Intl.NumberFormat("en-AU").format(numeric);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function clearTable(tableBody, message) {
  tableBody.replaceChildren();
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = tableBody.parentElement.querySelectorAll("thead th").length;
  cell.textContent = message;
  row.appendChild(cell);
  tableBody.appendChild(row);
}

function createCell(text, className) {
  const cell = document.createElement("td");
  if (className) {
    cell.className = className;
  }
  cell.textContent = text;
  return cell;
}

function populateSelect(select, options, placeholder) {
  const previousValue = select.value;
  select.replaceChildren();

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);

  options.forEach((option) => {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.appendChild(element);
  });

  if ([...select.options].some((option) => option.value === previousValue)) {
    select.value = previousValue;
  }
}

function syncFiltersFromForm() {
  state.filters = {
    season: elements.season.value,
    teamId: elements.teamId.value,
    round: elements.round.value,
    teamStat: elements.teamStat.value,
    playerStat: elements.playerStat.value,
    playerSearch: elements.playerSearch.value.trim()
  };
}

function applyMeta(meta) {
  state.meta = meta;

  populateSelect(
    elements.season,
    meta.seasons.map((season) => ({ value: `${season}`, label: `${season}` })),
    "All seasons"
  );
  populateSelect(
    elements.teamId,
    meta.teams.map((team) => ({ value: `${team.squad_id}`, label: team.squad_name })),
    "All teams"
  );
  populateSelect(
    elements.teamStat,
    meta.team_stats.map((stat) => ({ value: stat, label: stat })),
    "Choose a team stat"
  );
  populateSelect(
    elements.playerStat,
    meta.player_stats.map((stat) => ({ value: stat, label: stat })),
    "Choose a player stat"
  );

  elements.season.value = meta.default_season ? `${meta.default_season}` : "";
  elements.teamStat.value = meta.team_stats.includes("goals") ? "goals" : meta.team_stats[0] || "";
  elements.playerStat.value = meta.player_stats.includes("goals") ? "goals" : meta.player_stats[0] || "";
  syncFiltersFromForm();
}

function renderSummary(summary) {
  elements.summaryMatches.textContent = formatNumber(summary.total_matches);
  elements.summaryTeams.textContent = formatNumber(summary.total_teams);
  elements.summaryPlayers.textContent = formatNumber(summary.total_players);
  elements.summaryGoals.textContent = formatNumber(summary.total_goals);
  elements.summaryRefreshed.textContent = formatDate(summary.refreshed_at);
  elements.summaryMode.textContent = summary.build_mode || "production";
}

function renderMatches(matches) {
  if (!matches.length) {
    clearTable(elements.matchesTableBody, "No matches found for the selected filters.");
    return;
  }

  elements.matchesTableBody.replaceChildren();
  matches.forEach((match) => {
    const row = document.createElement("tr");
    row.append(
      createCell(`${match.season} ${match.competition_phase}`),
      createCell(`R${match.round_number} G${match.game_number}`),
      createCell(`${match.home_squad_name} ${match.home_score} - ${match.away_score} ${match.away_squad_name}`),
      createCell(match.venue_name || "-"),
      createCell(formatDate(match.local_start_time))
    );
    elements.matchesTableBody.appendChild(row);
  });
}

function renderTeamLeaders(rows) {
  if (!rows.length) {
    clearTable(elements.teamLeadersBody, "No team leaderboard rows matched the selected filters.");
    return;
  }

  elements.teamLeadersBody.replaceChildren();
  rows.forEach((rowData, index) => {
    const row = document.createElement("tr");
    row.append(
      createCell(`${index + 1}`),
      createCell(rowData.squad_name),
      createCell(rowData.stat),
      createCell(formatNumber(rowData.total_value)),
      createCell(formatNumber(rowData.matches_played))
    );
    elements.teamLeadersBody.appendChild(row);
  });
}

function renderPlayerLeaders(rows) {
  if (!rows.length) {
    clearTable(elements.playerLeadersBody, "No player leaderboard rows matched the selected filters.");
    return;
  }

  elements.playerLeadersBody.replaceChildren();
  rows.forEach((rowData, index) => {
    const row = document.createElement("tr");
    row.append(
      createCell(`${index + 1}`),
      createCell(rowData.player_name),
      createCell(rowData.squad_name || "-"),
      createCell(rowData.stat),
      createCell(formatNumber(rowData.total_value))
    );
    elements.playerLeadersBody.appendChild(row);
  });
}

async function runQueries() {
  syncFiltersFromForm();
  showStatus("Loading summary, matches, and leaderboards…");

  const baseParams = {
    season: state.filters.season,
    team_id: state.filters.teamId,
    round: state.filters.round
  };

  try {
    const [summary, matchesPayload, teamLeadersPayload, playerLeadersPayload] = await Promise.all([
      fetchJson("/summary", baseParams),
      fetchJson("/matches", { ...baseParams, limit: 12 }),
      fetchJson("/team-leaders", {
        ...baseParams,
        stat: state.filters.teamStat,
        limit: 8
      }),
      fetchJson("/player-leaders", {
        ...baseParams,
        stat: state.filters.playerStat,
        search: state.filters.playerSearch,
        limit: 12
      })
    ]);

    renderSummary(summary);
    renderMatches(matchesPayload.data || []);
    renderTeamLeaders(teamLeadersPayload.data || []);
    renderPlayerLeaders(playerLeadersPayload.data || []);
    showStatus("Query completed successfully.", "success");
  } catch (error) {
    showStatus(error.message || "The query failed.", "error");
    clearTable(elements.matchesTableBody, "Connect the API to see match results.");
    clearTable(elements.teamLeadersBody, "Connect the API to see team leaderboards.");
    clearTable(elements.playerLeadersBody, "Connect the API to see player leaderboards.");
  }
}

async function initialise() {
  clearTable(elements.matchesTableBody, "Loading matches…");
  clearTable(elements.teamLeadersBody, "Loading team leaderboards…");
  clearTable(elements.playerLeadersBody, "Loading player leaderboards…");

  try {
    const meta = await fetchJson("/meta");
    applyMeta(meta);
    await runQueries();
  } catch (error) {
    showStatus(
      `${error.message || "Unable to load the API metadata."} Build the database and run the API before using the site.`,
      "error"
    );
    clearTable(elements.matchesTableBody, "API metadata is unavailable.");
    clearTable(elements.teamLeadersBody, "API metadata is unavailable.");
    clearTable(elements.playerLeadersBody, "API metadata is unavailable.");
  }
}

elements.filtersForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runQueries();
});

elements.resetFilters.addEventListener("click", () => {
  if (!state.meta) {
    return;
  }

  elements.teamId.value = "";
  elements.round.value = "";
  elements.playerSearch.value = "";
  elements.season.value = state.meta.default_season ? `${state.meta.default_season}` : "";
  elements.teamStat.value = state.meta.team_stats.includes("goals") ? "goals" : state.meta.team_stats[0] || "";
  elements.playerStat.value = state.meta.player_stats.includes("goals") ? "goals" : state.meta.player_stats[0] || "";
  runQueries();
});

initialise();
