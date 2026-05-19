const {
  buildUrl,
  fetchJson,
  formatNumber,
  showElementLoadingStatus = () => {},
  showElementStatus = () => {},
  syncResponsiveTable = () => {}
} = window.NetballStatsUI || {};
const {
  trackEvent = () => {}
} = window.NetballStatsTelemetry || {};

// DOM Elements
const elements = {
  status: document.getElementById("players-status"),
  searchInput: document.getElementById("players-search"),
  tableBody: document.getElementById("players-table-body"),
  pagination: document.getElementById("players-pagination"),
  prevButton: document.getElementById("prev-page"),
  nextButton: document.getElementById("next-page"),
  pageInfo: document.getElementById("page-info")
};

// State
const state = {
  searchTerm: "",
  currentPage: 1,
  totalPages: 1,
  isLoading: false
};

// Show status message
function showStatus(message, tone = "neutral", options = {}) {
  if (elements.status) {
    elements.status.textContent = message;
    elements.status.className = `status-banner status-banner--${tone}`;
    elements.status.hidden = false;
    
    if (options.autoHideMs) {
      setTimeout(() => {
        elements.status.hidden = true;
      }, options.autoHideMs);
    }
  }
}

// Hide status message
function hideStatus() {
  if (elements.status) {
    elements.status.hidden = true;
  }
}

// Show loading status
function showLoadingStatus(messages, kicker) {
  showElementLoadingStatus(elements.status, messages, kicker);
}

// Create table row for player
function createPlayerRow(player) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td data-label="Player">
      <a href="/international/player/?player_id=${player.player_id}">${player.player_name}</a>
    </td>
    <td data-label="Teams">${player.squad_name || "-"}</td>
    <td data-label="Matches" class="num">${formatNumber(player.matches_played || 0)}</td>
  `;
  return row;
}

// Load players
async function loadPlayers() {
  if (state.isLoading) return;
  
  state.isLoading = true;
  showLoadingStatus(["Loading international players…"], "Loading players");
  
  try {
    const params = {
      search: state.searchTerm,
      limit: "100"
    };
    
    const response = await fetchJson("/api/international/players", params);
    
    elements.tableBody.replaceChildren();
    
    if (response.players && response.players.length > 0) {
      response.players.forEach(player => {
        elements.tableBody.appendChild(createPlayerRow(player));
      });
      
      showStatus(`${response.players.length} international players found.`, "success", { autoHideMs: 2000 });
    } else {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="3">No international players found${state.searchTerm ? ` matching "${state.searchTerm}"` : ""}.</td>`;
      elements.tableBody.appendChild(row);
      showStatus("No international players found.", "neutral");
    }
    
    syncResponsiveTable(elements.tableBody.closest("table"));
  } catch (error) {
    console.error("Error loading players:", error);
    elements.tableBody.innerHTML = `<tr><td colspan="3">Error loading international players.</td></tr>`;
    showStatus("Error loading international players.", "error");
  } finally {
    state.isLoading = false;
    hideStatus();
  }
}

// Handle search input
function handleSearchInput(event) {
  const newSearchTerm = event.target.value.trim();
  
  // Debounce search to avoid excessive API calls
  clearTimeout(handleSearchInput.timeout);
  handleSearchInput.timeout = setTimeout(() => {
    if (newSearchTerm !== state.searchTerm) {
      state.searchTerm = newSearchTerm;
      state.currentPage = 1;
      loadPlayers();
    }
  }, 300);
}

// Initialize
function initialize() {
  // Set up search input handler
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", handleSearchInput);
  }
  
  // Load initial data
  loadPlayers();
  
  // Track page view
  trackEvent("international_players_viewed");
}

// Start initialization when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}