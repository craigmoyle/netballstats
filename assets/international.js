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
  playerLeadersLoading: document.getElementById("player-leaders-loading"),
  playerLeadersContent: document.getElementById("player-leaders-content"),
  playerLeadersBody: document.getElementById("player-leaders-body"),
  teamLeadersLoading: document.getElementById("team-leaders-loading"),
  teamLeadersContent: document.getElementById("team-leaders-content"),
  teamLeadersBody: document.getElementById("team-leaders-body"),
  tabButtons: Array.from(document.querySelectorAll(".tabbed-panel__tab")),
  tabPanes: Array.from(document.querySelectorAll(".tabbed-panel__pane"))
};

// State
const state = {
  activeTab: "player-leaders-tab"
};

// Show loading status
function showLoadingStatus(element) {
  if (element) {
    element.hidden = false;
  }
}

// Hide loading status
function hideLoadingStatus(element) {
  if (element) {
    element.hidden = true;
  }
}

// Show content
function showContent(element) {
  if (element) {
    element.hidden = false;
  }
}

// Hide content
function hideContent(element) {
  if (element) {
    element.hidden = true;
  }
}

// Create table cell
function createCell(text, isNumeric = false) {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (isNumeric) {
    cell.className = "num";
  }
  return cell;
}

// Load player leaders
async function loadPlayerLeaders() {
  showLoadingStatus(elements.playerLeadersLoading);
  hideContent(elements.playerLeadersContent);
  
  try {
    const response = await fetchJson("/api/international/leaders", {
      type: "player",
      stat: "points",
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
    } else {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="4">No player leaders found.</td>`;
      elements.playerLeadersBody.appendChild(row);
    }
    
    syncResponsiveTable(document.getElementById("player-leaders-table"));
    hideLoadingStatus(elements.playerLeadersLoading);
    showContent(elements.playerLeadersContent);
  } catch (error) {
    console.error("Error loading player leaders:", error);
    elements.playerLeadersBody.innerHTML = `<tr><td colspan="4">Error loading player leaders.</td></tr>`;
    hideLoadingStatus(elements.playerLeadersLoading);
    showContent(elements.playerLeadersContent);
  }
}

// Load team leaders
async function loadTeamLeaders() {
  showLoadingStatus(elements.teamLeadersLoading);
  hideContent(elements.teamLeadersContent);
  
  try {
    const response = await fetchJson("/api/international/leaders", {
      type: "team",
      stat: "points",
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
    } else {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="4">No team leaders found.</td>`;
      elements.teamLeadersBody.appendChild(row);
    }
    
    syncResponsiveTable(document.getElementById("team-leaders-table"));
    hideLoadingStatus(elements.teamLeadersLoading);
    showContent(elements.teamLeadersContent);
  } catch (error) {
    console.error("Error loading team leaders:", error);
    elements.teamLeadersBody.innerHTML = `<tr><td colspan="4">Error loading team leaders.</td></tr>`;
    hideLoadingStatus(elements.teamLeadersLoading);
    showContent(elements.teamLeadersContent);
  }
}

// Switch tabs
function switchTab(tabId) {
  // Update state
  state.activeTab = tabId;
  
  // Update tab buttons
  elements.tabButtons.forEach(button => {
    const isSelected = button.getAttribute("aria-controls") === tabId;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-selected", isSelected.toString());
  });
  
  // Update tab panes
  elements.tabPanes.forEach(pane => {
    const isSelected = pane.id === tabId;
    pane.hidden = !isSelected;
    if (isSelected) {
      pane.setAttribute("tabindex", "0");
    } else {
      pane.removeAttribute("tabindex");
    }
  });
  
  // Load data for the selected tab if needed
  if (tabId === "player-leaders-tab") {
    // Player leaders are loaded by default
  } else if (tabId === "team-leaders-tab") {
    // Load team leaders if not already loaded
    if (elements.teamLeadersBody.children.length === 0) {
      loadTeamLeaders();
    }
  }
}

// Initialize
async function initialize() {
  // Set up tab switching
  elements.tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("aria-controls");
      switchTab(tabId);
    });
  });
  
  // Load initial data
  await loadPlayerLeaders();
  
  // Track page view
  trackEvent("international_home_viewed");
}

// Start initialization when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}