const {
  buildUrl,
  fetchJson,
  formatNumber,
  formatStatLabel = (stat) => stat,
  showElementLoadingStatus = () => {},
  showElementStatus = () => {},
  syncResponsiveTable = () => {}
} = window.NetballStatsUI || {};
const {
  trackEvent = () => {}
} = window.NetballStatsTelemetry || {};

// DOM Elements
const elements = {
  matchesLoading: document.getElementById("matches-loading"),
  matchesContent: document.getElementById("matches-content"),
  matchesBody: document.getElementById("matches-body"),
  matchesEmpty: document.getElementById("matches-empty"),
  leadersUnavailable: document.getElementById("leaders-unavailable"),
  leadersPanel: document.getElementById("leaders-panel"),
  playerLeadersLoading: document.getElementById("player-leaders-loading"),
  playerLeadersContent: document.getElementById("player-leaders-content"),
  playerLeadersBody: document.getElementById("player-leaders-body"),
  teamLeadersLoading: document.getElementById("team-leaders-loading"),
  teamLeadersContent: document.getElementById("team-leaders-content"),
  teamLeadersBody: document.getElementById("team-leaders-body"),
  playerStat: document.getElementById("int-player-stat"),
  teamStat: document.getElementById("int-team-stat"),
  tabButtons: Array.from(document.querySelectorAll(".tabbed-panel__tab")),
  tabPanes: Array.from(document.querySelectorAll(".tabbed-panel__pane"))
};

// State
const state = {
  activeTab: "player-leaders-tab",
  playerStat: "points",
  teamStat: "points"
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

function formatMatchDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch (_) {
    return dateStr;
  }
}

function formatScore(match) {
  if (match.match_status !== "complete" || match.home_score == null) return "—";
  return `${match.home_score}–${match.away_score}`;
}

// Load recent matches from /api/international/matches
async function loadRecentMatches() {
  showEl(elements.matchesLoading);
  hideEl(elements.matchesContent);
  hideEl(elements.matchesEmpty);

  try {
    const response = await fetchJson("/international/matches", { limit: "10" });
    hideEl(elements.matchesLoading);

    const matches = (response && response.matches) ? response.matches : [];
    if (matches.length === 0) {
      showEl(elements.matchesEmpty);
      return;
    }

    elements.matchesBody.replaceChildren();
    matches.forEach((match) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="Date">${formatMatchDate(match.local_start_time)}</td>
        <td data-label="Home">${match.home_squad_name || "—"}</td>
        <td data-label="Away">${match.away_squad_name || "—"}</td>
        <td data-label="Score" class="num">${formatScore(match)}</td>
      `;
      elements.matchesBody.appendChild(row);
    });

    syncResponsiveTable(document.getElementById("matches-table"));
    showEl(elements.matchesContent);
  } catch (error) {
    hideEl(elements.matchesLoading);
    showEl(elements.matchesEmpty);
  }
}

// Load player leaders (only called if stats are available)
async function loadPlayerLeaders() {
  const stat = state.playerStat;
  showEl(elements.playerLeadersLoading);
  hideEl(elements.playerLeadersContent);
  
  try {
    const response = await fetchJson("/international/leaders", {
      type: "player",
      stat,
      limit: "10"
    });
    
    elements.playerLeadersBody.replaceChildren();
    
    if (response.leaders && response.leaders.length > 0) {
      response.leaders.forEach((player) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td data-label="Player">
            <a href="/international/player/?player_id=${player.player_id}">${player.player_name}</a>
          </td>
          <td data-label="Total" class="num">${formatNumber(player.total_value)}</td>
          <td data-label="Matches" class="num">${formatNumber(player.match_count)}</td>
          <td data-label="Avg/match" class="num">${formatNumber(player.average_value)}</td>
        `;
        elements.playerLeadersBody.appendChild(row);
      });
      syncResponsiveTable(document.getElementById("player-leaders-table"));
      hideEl(elements.playerLeadersLoading);
      showEl(elements.playerLeadersContent);
    } else {
      // Stats table exists but is empty — show unavailable state
      hideEl(elements.playerLeadersLoading);
      showLeadersUnavailable();
    }
  } catch (error) {
    hideEl(elements.playerLeadersLoading);
    // 503 = stats not available; hide the whole leaderboard section
    showLeadersUnavailable();
  }
}

function showLeadersUnavailable() {
  hideEl(elements.leadersPanel);
  showEl(elements.leadersUnavailable);
}

// Load team leaders
async function loadTeamLeaders() {
  const stat = state.teamStat;
  showEl(elements.teamLeadersLoading);
  hideEl(elements.teamLeadersContent);
  
  try {
    const response = await fetchJson("/international/leaders", {
      type: "team",
      stat,
      limit: "10"
    });
    
    elements.teamLeadersBody.replaceChildren();
    
    if (response.leaders && response.leaders.length > 0) {
      response.leaders.forEach((team) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td data-label="Team">${team.squad_name}</td>
          <td data-label="Total" class="num">${formatNumber(team.total_value)}</td>
          <td data-label="Matches" class="num">${formatNumber(team.match_count)}</td>
          <td data-label="Avg/match" class="num">${formatNumber(team.average_value)}</td>
        `;
        elements.teamLeadersBody.appendChild(row);
      });
      syncResponsiveTable(document.getElementById("team-leaders-table"));
      hideEl(elements.teamLeadersLoading);
      showEl(elements.teamLeadersContent);
    } else {
      hideEl(elements.teamLeadersLoading);
      showEl(elements.teamLeadersContent);
    }
  } catch (error) {
    hideEl(elements.teamLeadersLoading);
    showEl(elements.teamLeadersContent);
  }
}

// Switch tabs
function switchTab(tabId) {
  state.activeTab = tabId;
  
  elements.tabButtons.forEach(button => {
    const isSelected = button.getAttribute("aria-controls") === tabId;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-selected", isSelected.toString());
  });
  
  elements.tabPanes.forEach(pane => {
    const isSelected = pane.id === tabId;
    pane.hidden = !isSelected;
    if (isSelected) {
      pane.setAttribute("tabindex", "0");
    } else {
      pane.removeAttribute("tabindex");
    }
  });
  
  if (tabId === "team-leaders-tab" && elements.teamLeadersBody && elements.teamLeadersBody.children.length === 0) {
    loadTeamLeaders();
  }
}

// Initialize
async function initialize() {
  elements.tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("aria-controls");
      switchTab(tabId);
    });
  });

  // Populate stat selects from /api/meta (same stat lists as Super Netball homepage)
  try {
    const meta = await fetchJson("/meta");
    if (meta) {
      const playerStats = (meta.player_stats || []).map((s) => ({ value: s, label: formatStatLabel(s) }));
      const teamStats = (meta.team_stats || []).map((s) => ({ value: s, label: formatStatLabel(s) }));
      populateSelect(elements.playerStat, playerStats);
      populateSelect(elements.teamStat, teamStats);
      if (elements.playerStat) elements.playerStat.value = "points";
      if (elements.teamStat) elements.teamStat.value = "points";
    }
  } catch (_) { /* non-fatal — selects stay empty */ }

  if (elements.playerStat) {
    elements.playerStat.addEventListener("change", () => {
      state.playerStat = elements.playerStat.value;
      loadPlayerLeaders();
    });
  }
  if (elements.teamStat) {
    elements.teamStat.addEventListener("change", () => {
      state.teamStat = elements.teamStat.value;
      loadTeamLeaders();
    });
  }

  // Load recent matches first (always available if the DB is populated)
  await loadRecentMatches();
  
  // Attempt to load player leaders; gracefully hides the section if stats are unavailable
  await loadPlayerLeaders();
  
  trackEvent("international_home_viewed");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}