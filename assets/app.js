const config = window.NETBALL_STATS_CONFIG || {};
const API_BASE_URL = (config.apiBaseUrl || "/api").replace(/\/$/, "");
const DEFAULT_TIMEOUT_MS = 12000;

const state = {
  meta: null,
  filters: {
    seasons: [],
    teamId: "",
    round: "",
    teamStat: "goals",
    playerStat: "goals",
    playerSearch: "",
    matchesLimit: "12",
    leadersLimit: "10",
    highsLimit: "10"
  }
};

const elements = {
  statusBanner: document.getElementById("status-banner"),
  filtersForm: document.getElementById("filters-form"),
  seasonChoices: document.getElementById("season-choices"),
  seasonSummary: document.getElementById("season-summary"),
  activeFilterSummary: document.getElementById("active-filter-summary"),
  teamId: document.getElementById("team-id"),
  round: document.getElementById("round"),
  teamStat: document.getElementById("team-stat"),
  playerStat: document.getElementById("player-stat"),
  playerSearch: document.getElementById("player-search"),
  matchesLimit: document.getElementById("matches-limit"),
  leadersLimit: document.getElementById("leaders-limit"),
  highsLimit: document.getElementById("highs-limit"),
  resetFilters: document.getElementById("reset-filters"),
  summaryMatches: document.getElementById("summary-matches"),
  summaryTeams: document.getElementById("summary-teams"),
  summaryPlayers: document.getElementById("summary-players"),
  summaryGoals: document.getElementById("summary-goals"),
  summaryRefreshed: document.getElementById("summary-refreshed"),
  matchesTableBody: document.querySelector("#matches-table tbody"),
  teamLeadersBody: document.querySelector("#team-leaders-table tbody"),
  playerLeadersBody: document.querySelector("#player-leaders-table tbody"),
  teamHighsBody: document.querySelector("#team-highs-table tbody"),
  playerHighsBody: document.querySelector("#player-highs-table tbody"),
  apiBase: document.getElementById("api-base"),
  seasonActionButtons: document.querySelectorAll("[data-season-action]")
};

document.body.classList.remove("is-ready");

elements.apiBase.textContent = API_BASE_URL;

function isLocalApiConfigured() {
  try {
    const apiUrl = new URL(API_BASE_URL, window.location.href);
    return apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1";
  } catch {
    return API_BASE_URL.startsWith("http://localhost") || API_BASE_URL.startsWith("http://127.0.0.1");
  }
}

function showStatus(message, tone = "neutral") {
  elements.statusBanner.textContent = message;
  elements.statusBanner.dataset.tone = tone;
  elements.statusBanner.hidden = !message;
}

function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) {
        url.searchParams.set(key, value.join(","));
      }
      return;
    }

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
      const message = Array.isArray(payload.error) ? payload.error.join(" ") : payload.error;
      throw new Error(message || `Request failed with status ${response.status}.`);
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

  return new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: Number.isInteger(numeric) ? 0 : 2
  }).format(numeric);
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

function setSelectedSeasons(values) {
  const selected = new Set(values.map((value) => `${value}`));
  elements.seasonChoices.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function getSelectedSeasons() {
  return [...elements.seasonChoices.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => input.value)
    .sort((left, right) => Number(right) - Number(left));
}

function renderSeasonChoices(seasons) {
  elements.seasonChoices.replaceChildren();
  seasons.forEach((season) => {
    const label = document.createElement("label");
    label.className = "season-choice";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = `${season}`;
    input.name = "season-choice";

    const text = document.createElement("span");
    text.textContent = `${season}`;

    label.append(input, text);
    elements.seasonChoices.appendChild(label);
  });
}

function seasonSummaryLabel(seasons) {
  if (!state.meta || !state.meta.seasons.length) {
    return "No seasons available";
  }
  if (!seasons.length) {
    return "All seasons selected";
  }
  if (seasons.length === 1) {
    return `Season ${seasons[0]}`;
  }
  return `${seasons.length} seasons selected`;
}

function teamLabel(teamId) {
  if (!teamId || !state.meta) {
    return "All teams";
  }
  const selectedTeam = state.meta.teams.find((team) => `${team.squad_id}` === `${teamId}`);
  return selectedTeam ? selectedTeam.squad_name : "All teams";
}

function syncFiltersFromForm() {
  state.filters = {
    seasons: getSelectedSeasons(),
    teamId: elements.teamId.value,
    round: elements.round.value,
    teamStat: elements.teamStat.value,
    playerStat: elements.playerStat.value,
    playerSearch: elements.playerSearch.value.trim(),
    matchesLimit: elements.matchesLimit.value,
    leadersLimit: elements.leadersLimit.value,
    highsLimit: elements.highsLimit.value
  };
}

function renderFilterSummary() {
  syncFiltersFromForm();
  const segments = [
    seasonSummaryLabel(state.filters.seasons),
    teamLabel(state.filters.teamId),
    state.filters.round ? `Round ${state.filters.round}` : "All rounds",
    `Team ${state.filters.teamStat || "-"}`,
    `Player ${state.filters.playerStat || "-"}`
  ];

  if (state.filters.playerSearch) {
    segments.push(`Player ${state.filters.playerSearch}`);
  }

  segments.push(
    `${state.filters.matchesLimit} match rows`,
    `${state.filters.leadersLimit} leaderboard rows`,
    `${state.filters.highsLimit} game highs`
  );

  elements.activeFilterSummary.textContent = segments.join(" • ");
  elements.seasonSummary.textContent = seasonSummaryLabel(state.filters.seasons);
}

function applyMeta(meta) {
  state.meta = meta;
  renderSeasonChoices(meta.seasons || []);

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

  const defaultSeason = meta.default_season ? `${meta.default_season}` : "";
  setSelectedSeasons(defaultSeason ? [defaultSeason] : []);
  elements.teamId.value = "";
  elements.round.value = "";
  elements.playerSearch.value = "";
  elements.matchesLimit.value = "12";
  elements.leadersLimit.value = "10";
  elements.highsLimit.value = "10";
  elements.teamStat.value = meta.team_stats.includes("goals") ? "goals" : meta.team_stats[0] || "";
  elements.playerStat.value = meta.player_stats.includes("goals") ? "goals" : meta.player_stats[0] || "";
  renderFilterSummary();
}

function renderSummary(summary) {
  elements.summaryMatches.textContent = formatNumber(summary.total_matches);
  elements.summaryTeams.textContent = formatNumber(summary.total_teams);
  elements.summaryPlayers.textContent = formatNumber(summary.total_players);
  elements.summaryGoals.textContent = formatNumber(summary.total_goals);
  elements.summaryRefreshed.textContent = formatDate(summary.refreshed_at);
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
      createCell(`${match.home_squad_name} ${formatNumber(match.home_score)} - ${formatNumber(match.away_score)} ${match.away_squad_name}`),
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

function renderTeamHighs(rows) {
  if (!rows.length) {
    clearTable(elements.teamHighsBody, "No team game highs matched the selected filters.");
    return;
  }

  elements.teamHighsBody.replaceChildren();
  rows.forEach((rowData, index) => {
    const row = document.createElement("tr");
    row.append(
      createCell(`${index + 1}`),
      createCell(rowData.squad_name),
      createCell(rowData.opponent || "-"),
      createCell(`${rowData.season}`),
      createCell(`R${rowData.round_number}`),
      createCell(formatNumber(rowData.total_value))
    );
    elements.teamHighsBody.appendChild(row);
  });
}

function renderPlayerHighs(rows) {
  if (!rows.length) {
    clearTable(elements.playerHighsBody, "No player game highs matched the selected filters.");
    return;
  }

  elements.playerHighsBody.replaceChildren();
  rows.forEach((rowData, index) => {
    const row = document.createElement("tr");
    row.append(
      createCell(`${index + 1}`),
      createCell(rowData.player_name),
      createCell(rowData.squad_name || "-"),
      createCell(rowData.opponent || "-"),
      createCell(`${rowData.season}`),
      createCell(`R${rowData.round_number}`),
      createCell(formatNumber(rowData.total_value))
    );
    elements.playerHighsBody.appendChild(row);
  });
}

function clearAllTables(message) {
  clearTable(elements.matchesTableBody, message);
  clearTable(elements.teamLeadersBody, message);
  clearTable(elements.playerLeadersBody, message);
  clearTable(elements.teamHighsBody, message);
  clearTable(elements.playerHighsBody, message);
}

async function runQueries() {
  syncFiltersFromForm();
  renderFilterSummary();
  showStatus("Loading summary, matches, leaderboards, and game highs…");

  const baseParams = {
    seasons: state.filters.seasons,
    team_id: state.filters.teamId,
    round: state.filters.round
  };

  try {
    const [summary, matchesPayload, teamLeadersPayload, playerLeadersPayload, teamHighsPayload, playerHighsPayload] = await Promise.all([
      fetchJson("/summary", baseParams),
      fetchJson("/matches", { ...baseParams, limit: state.filters.matchesLimit }),
      fetchJson("/team-leaders", {
        ...baseParams,
        stat: state.filters.teamStat,
        limit: state.filters.leadersLimit
      }),
      fetchJson("/player-leaders", {
        ...baseParams,
        stat: state.filters.playerStat,
        search: state.filters.playerSearch,
        limit: state.filters.leadersLimit
      }),
      fetchJson("/team-game-highs", {
        ...baseParams,
        stat: state.filters.teamStat,
        limit: state.filters.highsLimit
      }),
      fetchJson("/player-game-highs", {
        ...baseParams,
        stat: state.filters.playerStat,
        search: state.filters.playerSearch,
        limit: state.filters.highsLimit
      })
    ]);

    renderSummary(summary);
    renderMatches(matchesPayload.data || []);
    renderTeamLeaders(teamLeadersPayload.data || []);
    renderPlayerLeaders(playerLeadersPayload.data || []);
    renderTeamHighs(teamHighsPayload.data || []);
    renderPlayerHighs(playerHighsPayload.data || []);
    showStatus("Query completed successfully.", "success");
    document.body.classList.add("is-ready");
  } catch (error) {
    showStatus(error.message || "The query failed.", "error");
    clearAllTables("Unable to load data from the API.");
    document.body.classList.add("is-ready");
  }
}

async function initialise() {
  clearAllTables("Loading data…");

  try {
    const meta = await fetchJson("/meta");
    applyMeta(meta);
    await runQueries();
  } catch (error) {
    const baseMessage = error.message || "Unable to load the API metadata.";
    const hint = isLocalApiConfigured()
      ? " Build the database and run the API before using the site."
      : " The statistics API is currently unavailable. Please try again shortly.";
    showStatus(
      `${baseMessage}${hint}`,
      "error"
    );
    clearAllTables("API metadata is unavailable.");
    document.body.classList.add("is-ready");
  }
}

elements.filtersForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runQueries();
});

elements.filtersForm.addEventListener("input", () => {
  renderFilterSummary();
});

elements.filtersForm.addEventListener("change", () => {
  renderFilterSummary();
});

elements.seasonActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!state.meta) {
      return;
    }

    const action = button.dataset.seasonAction;
    if (action === "all") {
      setSelectedSeasons((state.meta.seasons || []).map((season) => `${season}`));
    } else if (action === "clear") {
      setSelectedSeasons([]);
    } else if (action === "latest") {
      setSelectedSeasons(state.meta.default_season ? [`${state.meta.default_season}`] : []);
    }

    renderFilterSummary();
  });
});

elements.resetFilters.addEventListener("click", () => {
  if (!state.meta) {
    return;
  }

  applyMeta(state.meta);
  runQueries();
});

initialise();
