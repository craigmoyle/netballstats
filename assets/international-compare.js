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
  form: document.getElementById("compare-form"),
  playerAInput: document.getElementById("player-a-search"),
  playerBInput: document.getElementById("player-b-search"),
  playerAId: document.getElementById("player-a-id"),
  playerBId: document.getElementById("player-b-id"),
  playerASuggestions: document.getElementById("player-a-suggestions"),
  playerBSuggestions: document.getElementById("player-b-suggestions"),
  submitButton: document.getElementById("compare-submit"),
  clearButton: document.getElementById("compare-clear"),
  status: document.getElementById("compare-status"),
  results: document.getElementById("compare-results"),
  compareTitle: document.getElementById("compare-title"),
  playerAName: document.getElementById("player-a-name"),
  playerBName: document.getElementById("player-b-name"),
  playerAMeta: document.getElementById("player-a-meta"),
  playerBMeta: document.getElementById("player-b-meta"),
  tableBody: document.getElementById("compare-table-body")
};

// State
const state = {
  playerA: { id: null, name: "", profile: null },
  playerB: { id: null, name: "", profile: null },
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

// Show results
function showResults() {
  if (elements.results) {
    elements.results.hidden = false;
  }
}

// Hide results
function hideResults() {
  if (elements.results) {
    elements.results.hidden = true;
  }
}

// Create suggestion item
function createSuggestionItem(player, inputField, hiddenField, suggestionsList) {
  const item = document.createElement("div");
  item.className = "suggestions-list__item";
  item.textContent = player.player_name;
  item.addEventListener("click", () => {
    inputField.value = player.player_name;
    hiddenField.value = player.player_id;
    suggestionsList.hidden = true;
    
    // Update state
    const isPlayerA = inputField === elements.playerAInput;
    if (isPlayerA) {
      state.playerA.id = player.player_id;
      state.playerA.name = player.player_name;
    } else {
      state.playerB.id = player.player_id;
      state.playerB.name = player.player_name;
    }
    
    // Enable submit button if both players selected
    updateSubmitButton();
  });
  return item;
}

// Search for players
async function searchPlayers(query, inputField, suggestionsList, hiddenField) {
  if (!query.trim()) {
    suggestionsList.hidden = true;
    return;
  }
  
  try {
    const response = await fetchJson("/international/players", {
      search: query,
      limit: "10"
    });
    
    suggestionsList.replaceChildren();
    
    if (response.players && response.players.length > 0) {
      response.players.forEach(player => {
        suggestionsList.appendChild(createSuggestionItem(player, inputField, hiddenField, suggestionsList));
      });
      suggestionsList.hidden = false;
    } else {
      suggestionsList.hidden = true;
    }
  } catch (error) {
    console.error("Error searching players:", error);
    suggestionsList.hidden = true;
  }
}

// Update submit button state
function updateSubmitButton() {
  if (elements.submitButton) {
    const isEnabled = state.playerA.id && state.playerB.id && state.playerA.id !== state.playerB.id;
    elements.submitButton.disabled = !isEnabled;
  }
}

// Clear selections
function clearSelections() {
  // Clear player A
  if (elements.playerAInput) elements.playerAInput.value = "";
  if (elements.playerAId) elements.playerAId.value = "";
  state.playerA = { id: null, name: "", profile: null };
  
  // Clear player B
  if (elements.playerBInput) elements.playerBInput.value = "";
  if (elements.playerBId) elements.playerBId.value = "";
  state.playerB = { id: null, name: "", profile: null };
  
  // Hide suggestions
  if (elements.playerASuggestions) elements.playerASuggestions.hidden = true;
  if (elements.playerBSuggestions) elements.playerBSuggestions.hidden = true;
  
  // Disable submit button
  updateSubmitButton();
  
  // Hide results
  hideResults();
}

// Load player profile
async function loadPlayerProfile(playerId) {
  try {
    const profile = await fetchJson("/international/player-profile", { player_id: playerId });
    return profile;
  } catch (error) {
    console.error(`Error loading player profile ${playerId}:`, error);
    throw new Error(`Unable to load player profile`);
  }
}

// Create comparison table row
function createComparisonRow(stat, playerAValue, playerBValue) {
  const row = document.createElement("tr");
  
  // Calculate difference
  const diff = playerAValue !== null && playerBValue !== null ? playerAValue - playerBValue : null;
  const diffClass = diff > 0 ? "diff-positive" : diff < 0 ? "diff-negative" : "";
  const diffText = diff !== null ? formatNumber(Math.abs(diff)) : "-";
  
  row.innerHTML = `
    <td data-label="Stat">${formatStatLabel(stat)}</td>
    <td data-label="${state.playerA.name}" class="num">${playerAValue !== null ? formatNumber(playerAValue) : "-"}</td>
    <td data-label="Difference" class="num ${diffClass}">${diffText}</td>
    <td data-label="${state.playerB.name}" class="num">${playerBValue !== null ? formatNumber(playerBValue) : "-"}</td>
  `;
  
  return row;
}

// Get stat value from profile
function getStatValue(profile, stat) {
  if (!profile || !profile.stats || !profile.stats.career) return null;
  
  const statEntry = profile.stats.career.find(s => s.stat === stat);
  return statEntry ? statEntry.total : null;
}

// Render comparison
function renderComparison() {
  if (!state.playerA.profile || !state.playerB.profile) return;
  
  // Update titles
  if (elements.compareTitle) {
    elements.compareTitle.textContent = `${state.playerA.name} vs ${state.playerB.name}`;
  }
  
  if (elements.playerAName) {
    elements.playerAName.textContent = state.playerA.name;
  }
  
  if (elements.playerBName) {
    elements.playerBName.textContent = state.playerB.name;
  }
  
  // Update meta info (games played, etc.)
  const playerAGames = state.playerA.profile.stats?.games_played || 0;
  const playerBGames = state.playerB.profile.stats?.games_played || 0;
  
  if (elements.playerAMeta) {
    elements.playerAMeta.textContent = `${formatNumber(playerAGames)} matches`;
  }
  
  if (elements.playerBMeta) {
    elements.playerBMeta.textContent = `${formatNumber(playerBGames)} matches`;
  }
  
  // Build comparison table
  elements.tableBody.replaceChildren();
  
  // Stats to compare (same as in player profiles)
  const COMPARE_STATS = [
    "goals", "goalAttempts", "goalAssists", "feeds", "gain", 
    "intercepts", "deflections", "rebounds", "pickups",
    "centrePassReceives", "contactPenalties", "obstructionPenalties",
    "generalPlayTurnovers", "unforcedTurnovers"
  ];
  
  COMPARE_STATS.forEach(stat => {
    const playerAValue = getStatValue(state.playerA.profile, stat);
    const playerBValue = getStatValue(state.playerB.profile, stat);
    
    if (playerAValue !== null || playerBValue !== null) {
      elements.tableBody.appendChild(createComparisonRow(stat, playerAValue, playerBValue));
    }
  });
  
  syncResponsiveTable(elements.tableBody.closest("table"));
  showResults();
}

// Submit comparison
async function submitComparison() {
  if (!state.playerA.id || !state.playerB.id) {
    showStatus("Please select two players to compare.", "error");
    return;
  }
  
  if (state.playerA.id === state.playerB.id) {
    showStatus("Please select two different players.", "error");
    return;
  }
  
  if (state.isLoading) return;
  
  state.isLoading = true;
  showLoadingStatus(["Loading player profiles...", "Comparing careers...", "Preparing results..."], "Comparing");
  
  try {
    // Load both player profiles
    const [profileA, profileB] = await Promise.all([
      loadPlayerProfile(state.playerA.id),
      loadPlayerProfile(state.playerB.id)
    ]);
    
    // Update state with profiles
    state.playerA.profile = profileA;
    state.playerB.profile = profileB;
    
    // Render comparison
    renderComparison();
    
    showStatus("Comparison ready.", "success", { autoHideMs: 2000 });
    
    trackEvent("international_compare_completed", {
      player_a_id: state.playerA.id,
      player_b_id: state.playerB.id
    });
  } catch (error) {
    showStatus(error.message || "Unable to compare players right now.", "error");
    trackEvent("international_compare_error", {
      error_type: error.name || "unknown"
    });
  } finally {
    state.isLoading = false;
  }
}

// Initialize
function initialize() {
  // Set up form submission
  if (elements.form) {
    elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitComparison();
    });
  }
  
  // Set up clear button
  if (elements.clearButton) {
    elements.clearButton.addEventListener("click", clearSelections);
  }
  
  // Set up player A search
  if (elements.playerAInput) {
    let debounceTimerA;
    elements.playerAInput.addEventListener("input", (event) => {
      clearTimeout(debounceTimerA);
      debounceTimerA = setTimeout(() => {
        searchPlayers(
          event.target.value, 
          elements.playerAInput, 
          elements.playerASuggestions,
          elements.playerAId
        );
      }, 300);
    });
    
    // Clear selection when input is cleared
    elements.playerAInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (!elements.playerAInput.value.trim()) {
          state.playerA = { id: null, name: "", profile: null };
          if (elements.playerAId) elements.playerAId.value = "";
          updateSubmitButton();
        }
      }, 200);
    });
  }
  
  // Set up player B search
  if (elements.playerBInput) {
    let debounceTimerB;
    elements.playerBInput.addEventListener("input", (event) => {
      clearTimeout(debounceTimerB);
      debounceTimerB = setTimeout(() => {
        searchPlayers(
          event.target.value, 
          elements.playerBInput, 
          elements.playerBSuggestions,
          elements.playerBId
        );
      }, 300);
    });
    
    // Clear selection when input is cleared
    elements.playerBInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (!elements.playerBInput.value.trim()) {
          state.playerB = { id: null, name: "", profile: null };
          if (elements.playerBId) elements.playerBId.value = "";
          updateSubmitButton();
        }
      }, 200);
    });
  }
  
  // Hide suggestions when clicking elsewhere
  document.addEventListener("click", (event) => {
    if (elements.playerASuggestions && !elements.playerAInput.contains(event.target) && !elements.playerASuggestions.contains(event.target)) {
      elements.playerASuggestions.hidden = true;
    }
    
    if (elements.playerBSuggestions && !elements.playerBInput.contains(event.target) && !elements.playerBSuggestions.contains(event.target)) {
      elements.playerBSuggestions.hidden = true;
    }
  });
  
  // Track page view
  trackEvent("international_compare_viewed");
}

// Start initialization when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}