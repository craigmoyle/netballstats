const {
  buildUrl,
  cycleStatusBanner = () => {},
  fetchJson,
  formatNumber
} = window.NetballStatsUI || {};
const {
  trackEvent = () => {}
} = window.NetballStatsTelemetry || {};

const LOADING_MESSAGES = [
  "Tracing home-court advantage…",
  "Comparing arenas…",
  "Checking margin and whistle swings…"
];

const state = {
  meta: null,
  payload: null,
  selectedVenue: "",
  requestToken: 0
};

const elements = {
  status: document.getElementById("home-edge-status"),
  filters: document.getElementById("home-edge-filters"),
  season: document.getElementById("home-edge-season"),
  team: document.getElementById("home-edge-team"),
  minMatches: document.getElementById("home-edge-min-matches"),
  meta: document.getElementById("home-edge-meta"),
  contextNote: document.getElementById("home-edge-context-note"),
  apiLink: document.getElementById("home-edge-api-link"),
  heroLabel: document.getElementById("home-edge-hero-label"),
  heroSummary: document.getElementById("home-edge-hero-summary"),
  focusTitle: document.getElementById("home-edge-focus-title"),
  focusCopy: document.getElementById("home-edge-focus-copy"),
  matches: document.getElementById("home-edge-matches"),
  homeWinRate: document.getElementById("home-edge-home-win-rate"),
  homeMargin: document.getElementById("home-edge-home-margin"),
  homePenalty: document.getElementById("home-edge-home-penalty"),
  spotlightSample: document.getElementById("home-edge-spotlight-sample"),
  spotlightMargin: document.getElementById("home-edge-spotlight-margin"),
  spotlightPenalty: document.getElementById("home-edge-spotlight-penalty"),
  venueBody: document.getElementById("home-edge-venue-body"),
  teamBody: document.getElementById("home-edge-team-body"),
  teamVenueBody: document.getElementById("home-edge-team-venue-body"),
  teamVenueHeading: document.getElementById("home-edge-team-venue-heading"),
  teamVenueLead: document.getElementById("home-edge-team-venue-lead"),
  venueTable: document.getElementById("home-edge-venue-table"),
  teamTable: document.getElementById("home-edge-team-table"),
  teamVenueTable: document.getElementById("home-edge-team-venue-table")
};

function unwrapValue(value) {
  if (Array.isArray(value)) {
    if (!value.length) {
      return null;
    }
    return value.length === 1 ? unwrapValue(value[0]) : value;
  }

  if (value && typeof value === "object" && !Array.isArray(value) && !Object.keys(value).length) {
    return null;
  }

  return value;
}

function scalarNumber(value) {
  const unwrapped = unwrapValue(value);
  const numeric = Number(unwrapped);
  return Number.isFinite(numeric) ? numeric : null;
}

function scalarText(value) {
  const unwrapped = unwrapValue(value);
  return unwrapped == null ? "" : `${unwrapped}`;
}

function formatPercent(value) {
  const numeric = scalarNumber(value);
  if (numeric == null) return "—";
  return `${(numeric * 100).toFixed(1)}%`;
}

function formatSigned(value, digits = 2) {
  const numeric = scalarNumber(value);
  if (numeric == null) return "—";
  const formatted = numeric.toFixed(digits);
  return numeric > 0 ? `+${formatted}` : formatted;
}

function showStatus(message, tone = "neutral", options = {}) {
  if (!message) {
    window.NetballStatsUI?.showStatusBanner?.(elements.status, "");
    return;
  }
  window.NetballStatsUI?.showStatusBanner?.(elements.status, message, tone, options);
}

function showLoadingStatus() {
  cycleStatusBanner(elements.status, LOADING_MESSAGES, { tone: "loading", kicker: "Loading home-court advantage" });
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function renderMessageRow(tbody, colspan, message, kicker = "") {
  if (!tbody) return;
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = colspan;
  cell.className = "empty-state";
  if (kicker) {
    cell.dataset.kicker = kicker;
  }
  cell.textContent = message;
  row.appendChild(cell);
  tbody.replaceChildren(row);
}

function selectedTeamId() {
  return elements.team?.value ? Number(elements.team.value) : null;
}

function selectedTeamName() {
  if (!state.meta || !Array.isArray(state.meta.teams)) {
    return "All teams";
  }
  const teamId = `${elements.team?.value || ""}`;
  const team = state.meta.teams.find((entry) => `${entry.squad_id}` === teamId);
  return team ? team.squad_name : "All teams";
}

function syncUrlState() {
  const params = new URLSearchParams();
  if (elements.season?.value) params.set("season", elements.season.value);
  if (elements.team?.value) params.set("team_id", elements.team.value);
  if (elements.minMatches?.value) params.set("min_matches", elements.minMatches.value);
  if (state.selectedVenue) params.set("venue_name", state.selectedVenue);
  const nextUrl = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

function hydrateFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (elements.season && params.has("season")) elements.season.value = params.get("season");
  if (elements.team && params.has("team_id")) elements.team.value = params.get("team_id");
  if (elements.minMatches && params.has("min_matches")) elements.minMatches.value = params.get("min_matches");
  state.selectedVenue = params.get("venue_name") || "";
}

function renderSeasonChoices(seasons = []) {
  const select = elements.season;
  if (!select) return;
  const currentValue = select.value;
  while (select.options.length > 1) {
    select.remove(1);
  }
  seasons.forEach((season) => {
    const option = document.createElement("option");
    option.value = String(season);
    option.textContent = String(season);
    select.appendChild(option);
  });
  if (currentValue) {
    select.value = currentValue;
  } else if (state.meta?.default_season) {
    select.value = String(state.meta.default_season);
  }
}

function renderTeamChoices(teams = []) {
  const select = elements.team;
  if (!select) return;
  const currentValue = select.value;
  while (select.options.length > 1) {
    select.remove(1);
  }
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = String(team.squad_id);
    option.textContent = team.squad_name;
    select.appendChild(option);
  });
  if (currentValue) {
    select.value = currentValue;
  }
}

function currentParams(includeSelectedVenue = false) {
  const params = {
    limit: "12",
    min_matches: elements.minMatches?.value || "3"
  };
  if (elements.season?.value) params.season = elements.season.value;
  if (elements.team?.value) params.team_id = elements.team.value;
  if (includeSelectedVenue && state.selectedVenue) params.venue_name = state.selectedVenue;
  return params;
}

function updateApiLink() {
  if (!elements.apiLink || !buildUrl) return;
  elements.apiLink.href = buildUrl("/home-venue-impact", currentParams(true)).toString();
}

function venueRowsForSpotlight() {
  if (!state.payload) return [];
  const teamSpecific = Array.isArray(state.payload.team_venue_summary) ? state.payload.team_venue_summary : [];
  const venueSummary = Array.isArray(state.payload.venue_summary) ? state.payload.venue_summary : [];
  if (selectedTeamId()) {
    return teamSpecific;
  }
  return venueSummary;
}

function ensureSelectedVenue() {
  const rows = venueRowsForSpotlight();
  if (!rows.length) {
    state.selectedVenue = "";
    return null;
  }

  const existing = rows.find((row) => scalarText(row.venue_name) === state.selectedVenue);
  if (existing) {
    return existing;
  }

  state.selectedVenue = scalarText(rows[0].venue_name);
  return rows[0];
}

function spotlightNarrative(row) {
  if (!row) {
    return {
      title: "No qualifying venue spotlight",
      copy: "Try a lower minimum-match threshold or choose a season with more completed home fixtures.",
      sample: "—",
      margin: "—",
      penalty: "—",
      hero: "No qualifying venue"
    };
  }

  const teamId = selectedTeamId();
  const venueName = scalarText(row.venue_name);
  const teamName = scalarText(row.team_name);
  const sample = `${formatNumber(scalarNumber(row.matches))} home matches`;

  if (teamId) {
    return {
      title: `${teamName} at ${venueName}`,
      copy: `${formatPercent(row.home_win_rate)} home win rate, ${formatSigned(row.margin_lift_vs_team_other_home_venues)} average margin lift, and ${formatSigned(row.penalty_lift_vs_team_other_home_venues)} penalty swing versus that club's other home courts.`,
      sample,
      margin: formatSigned(row.margin_lift_vs_team_other_home_venues),
      penalty: formatSigned(row.penalty_lift_vs_team_other_home_venues),
      hero: `${teamName} — ${venueName}`
    };
  }

  return {
    title: `${venueName} against the league home baseline`,
    copy: `${formatPercent(row.home_win_rate)} home win rate from ${sample.toLowerCase()}, with ${formatSigned(row.margin_lift_vs_league_home)} average margin lift and ${formatSigned(row.penalty_lift_vs_league_home)} penalty lift versus the league home average.`,
    sample,
    margin: formatSigned(row.margin_lift_vs_league_home),
    penalty: formatSigned(row.penalty_lift_vs_league_home),
    hero: venueName
  };
}

function renderLeagueSummary() {
  const summary = state.payload?.league_summary;
  if (!summary) {
    if (elements.meta) elements.meta.textContent = "Home-court advantage unavailable.";
    if (elements.contextNote) elements.contextNote.textContent = "No qualifying matches for this filter set.";
    if (elements.matches) elements.matches.textContent = "—";
    if (elements.homeWinRate) elements.homeWinRate.textContent = "—";
    if (elements.homeMargin) elements.homeMargin.textContent = "—";
    if (elements.homePenalty) elements.homePenalty.textContent = "—";
    return;
  }

  const seasonLabel = elements.season?.value ? `${elements.season.value} season` : "all seasons";
  const teamLabel = selectedTeamId() ? selectedTeamName() : "league-wide";
  if (elements.meta) {
    elements.meta.textContent = `${formatNumber(scalarNumber(summary.matches))} matches — ${teamLabel} — ${seasonLabel}.`;
  }
  if (elements.contextNote) {
    elements.contextNote.textContent = selectedTeamId()
      ? `${selectedTeamName()} is being compared at home versus away, with venue rows showing how each home floor stacks up against the club's other home venues.`
      : "Venue rows compare each arena to the league-wide home baseline, while team rows compare each club at home versus away in the same archive slice.";
  }
  if (elements.matches) elements.matches.textContent = formatNumber(scalarNumber(summary.matches));
  if (elements.homeWinRate) elements.homeWinRate.textContent = formatPercent(summary.home_win_rate);
  if (elements.homeMargin) elements.homeMargin.textContent = formatSigned(summary.avg_home_margin);
  if (elements.homePenalty) elements.homePenalty.textContent = formatSigned(summary.avg_home_penalty_advantage);
}

function renderSpotlight() {
  const row = ensureSelectedVenue();
  const narrative = spotlightNarrative(row);
  if (elements.focusTitle) elements.focusTitle.textContent = narrative.title;
  if (elements.focusCopy) elements.focusCopy.textContent = narrative.copy;
  if (elements.heroLabel) elements.heroLabel.textContent = narrative.hero;
  if (elements.heroSummary) elements.heroSummary.textContent = narrative.copy;
  if (elements.spotlightSample) elements.spotlightSample.textContent = narrative.sample;
  if (elements.spotlightMargin) elements.spotlightMargin.textContent = narrative.margin;
  if (elements.spotlightPenalty) elements.spotlightPenalty.textContent = narrative.penalty;
}

function renderVenueTable() {
  const rows = venueRowsForSpotlight();
  const usingTeamVenueRows = Boolean(selectedTeamId());
  if (!rows.length) {
    renderMessageRow(elements.venueBody, 5, "No qualifying venues found for this filter set.", "No data");
    window.NetballStatsUI?.syncResponsiveTable?.(elements.venueTable);
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const venueName = scalarText(row.venue_name);
    const tr = document.createElement("tr");
    if (venueName === state.selectedVenue) {
      tr.dataset.active = "true";
    }

    const venueCell = document.createElement("td");
    venueCell.dataset.stackPrimary = "true";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "home-edge-venue-button";
    if (venueName === state.selectedVenue) {
      button.classList.add("is-active");
    }
    button.textContent = venueName || "—";
    button.addEventListener("click", () => {
      state.selectedVenue = venueName;
      syncUrlState();
      updateApiLink();
      renderSpotlight();
      renderVenueTable();
    });
    venueCell.appendChild(button);

    const matchesCell = document.createElement("td");
    matchesCell.textContent = formatNumber(scalarNumber(row.matches));

    const winRateCell = document.createElement("td");
    winRateCell.textContent = formatPercent(row.home_win_rate);

    const marginCell = document.createElement("td");
    marginCell.textContent = usingTeamVenueRows
      ? formatSigned(row.margin_lift_vs_team_other_home_venues)
      : formatSigned(row.margin_lift_vs_league_home);

    const penaltyCell = document.createElement("td");
    penaltyCell.textContent = usingTeamVenueRows
      ? formatSigned(row.penalty_lift_vs_team_other_home_venues)
      : formatSigned(row.penalty_lift_vs_league_home);

    tr.append(venueCell, matchesCell, winRateCell, marginCell, penaltyCell);
    fragment.appendChild(tr);
  });

  elements.venueBody.replaceChildren(fragment);
  window.NetballStatsUI?.syncResponsiveTable?.(elements.venueTable);
}

function renderTeamTable() {
  const rows = Array.isArray(state.payload?.team_summary) ? state.payload.team_summary : [];
  if (!rows.length) {
    renderMessageRow(elements.teamBody, 5, "No qualifying team splits for this filter set.", "No data");
    window.NetballStatsUI?.syncResponsiveTable?.(elements.teamTable);
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const teamCell = document.createElement("td");
    teamCell.dataset.stackPrimary = "true";
    teamCell.textContent = scalarText(row.team_name) || "—";

    const homeWinCell = document.createElement("td");
    homeWinCell.textContent = formatPercent(row.home_win_rate);

    const awayWinCell = document.createElement("td");
    awayWinCell.textContent = formatPercent(row.away_win_rate);

    const marginCell = document.createElement("td");
    marginCell.textContent = formatSigned(row.margin_delta_home_vs_away);

    const penaltyCell = document.createElement("td");
    penaltyCell.textContent = formatSigned(row.penalty_delta_home_vs_away);

    tr.append(teamCell, homeWinCell, awayWinCell, marginCell, penaltyCell);
    fragment.appendChild(tr);
  });

  elements.teamBody.replaceChildren(fragment);
  window.NetballStatsUI?.syncResponsiveTable?.(elements.teamTable);
}

function renderTeamVenueTable() {
  const rows = Array.isArray(state.payload?.team_venue_summary) ? state.payload.team_venue_summary : [];
  const teamName = selectedTeamName();
  if (elements.teamVenueHeading) {
    elements.teamVenueHeading.textContent = selectedTeamId()
      ? `${teamName} by home venue`
      : "Which team-and-venue pair gets the biggest lift?";
  }
  if (elements.teamVenueLead) {
    elements.teamVenueLead.textContent = selectedTeamId()
      ? `Each row compares ${teamName} at one home venue against the same club's other home venues in the current archive slice.`
      : "These rows show the strongest team-and-venue combinations after comparing each club's home courts against its own alternatives.";
  }

  if (!rows.length) {
    renderMessageRow(elements.teamVenueBody, 7, "No qualifying team venue splits for this filter set.", "No data");
    window.NetballStatsUI?.syncResponsiveTable?.(elements.teamVenueTable);
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const teamCell = document.createElement("td");
    teamCell.dataset.stackPrimary = "true";
    teamCell.textContent = scalarText(row.team_name) || "—";

    const venueCell = document.createElement("td");
    venueCell.textContent = scalarText(row.venue_name) || "—";

    const matchesCell = document.createElement("td");
    matchesCell.textContent = formatNumber(scalarNumber(row.matches));

    const homeWinCell = document.createElement("td");
    homeWinCell.textContent = formatPercent(row.home_win_rate);

    const otherHomeCell = document.createElement("td");
    otherHomeCell.textContent = formatPercent(row.other_home_venues_win_rate);

    const marginCell = document.createElement("td");
    marginCell.textContent = formatSigned(row.margin_lift_vs_team_other_home_venues);

    const penaltyCell = document.createElement("td");
    penaltyCell.textContent = formatSigned(row.penalty_lift_vs_team_other_home_venues);

    tr.append(teamCell, venueCell, matchesCell, homeWinCell, otherHomeCell, marginCell, penaltyCell);
    fragment.appendChild(tr);
  });

  elements.teamVenueBody.replaceChildren(fragment);
  window.NetballStatsUI?.syncResponsiveTable?.(elements.teamVenueTable);
}

function renderAll() {
  renderLeagueSummary();
  renderSpotlight();
  renderVenueTable();
  renderTeamTable();
  renderTeamVenueTable();
  updateApiLink();
  syncUrlState();
}

async function loadMetadata(retries = 1) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      const meta = await fetchJson("/meta");
      state.meta = meta;
      renderSeasonChoices(meta.seasons || []);
      renderTeamChoices(meta.teams || []);
      return meta;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        break;
      }
      await wait(1500 * (attempt + 1));
      attempt += 1;
    }
  }

  throw lastError;
}

async function loadHomeEdge() {
  const requestToken = ++state.requestToken;
  showLoadingStatus();
  try {
    const payload = await fetchJson("/home-venue-impact", currentParams(false));
    if (requestToken !== state.requestToken) {
      return;
    }
    state.payload = payload;
    renderAll();
    trackEvent("home_edge_loaded", {
      season: elements.season?.value || "all",
      team_id: elements.team?.value || "all",
      venue_name: state.selectedVenue || "top"
    });
    showStatus("Home-court advantage comparison ready.", "success", {
      kicker: "Comparison updated",
      autoHideMs: 2200
    });
  } catch (error) {
    if (requestToken !== state.requestToken) {
      return;
    }
    if (elements.meta) elements.meta.textContent = "Home-court advantage unavailable.";
    if (elements.contextNote) elements.contextNote.textContent = "Try narrowing to one season or one team.";
    if (elements.heroLabel) elements.heroLabel.textContent = "Unavailable";
    if (elements.heroSummary) elements.heroSummary.textContent = error.message || "Unable to load home-court advantage comparisons.";
    renderMessageRow(elements.venueBody, 5, "The venue comparison is unavailable. Try again shortly.", "Archive note");
    renderMessageRow(elements.teamBody, 5, "The team comparison is unavailable. Try again shortly.", "Archive note");
    renderMessageRow(elements.teamVenueBody, 7, "The team venue comparison is unavailable. Try again shortly.", "Archive note");
    showStatus(error.message || "Unable to load home-court advantage comparisons.", "error", {
      kicker: "Comparison unavailable"
    });
  }
}

if (elements.filters) {
  elements.filters.addEventListener("submit", (event) => {
    event.preventDefault();
    state.selectedVenue = "";
    loadHomeEdge();
  });
}

async function initialise() {
  try {
    await loadMetadata(1);
  } catch (error) {
    if (elements.meta) {
      elements.meta.textContent = "Archive metadata is taking longer than usual.";
    }
  }
  hydrateFiltersFromUrl();
  if (!elements.season?.value && state.meta?.default_season) {
    elements.season.value = String(state.meta.default_season);
  }
  await loadHomeEdge();
}

initialise();
