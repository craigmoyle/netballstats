const {
  buildUrl,
  fetchJson,
  formatNumber,
  showStatusBanner = () => {},
  cycleStatusBanner = () => {},
  syncResponsiveTable = () => {}
} = window.NetballStatsUI || {};
const {
  trackEvent = () => {}
} = window.NetballStatsTelemetry || {};

const elements = {
  status:      document.getElementById("players-status"),
  searchInput: document.getElementById("players-search"),
  resultsMeta: document.getElementById("players-results-meta"),
  tableBody:   document.getElementById("players-table-body"),
  emptyMsg:    document.getElementById("players-empty"),
};

const state = {
  searchTerm: "",
  isLoading:  false
};

async function loadPlayers() {
  if (state.isLoading) return;
  state.isLoading = true;

  if (elements.emptyMsg) elements.emptyMsg.hidden = true;
  cycleStatusBanner(elements.status, ["Loading international players…"], { kicker: "Loading", tone: "loading" });

  try {
    const params = { search: state.searchTerm, limit: "2000" };
    const response = await fetchJson("/international/players", params);
    const players = response?.players || [];

    if (elements.tableBody) elements.tableBody.replaceChildren();

    if (!players.length) {
      if (elements.emptyMsg) elements.emptyMsg.hidden = false;
      if (elements.resultsMeta) elements.resultsMeta.textContent = "No players found.";
      showStatusBanner(elements.status, "");
      return;
    }

    const fragment = document.createDocumentFragment();
    players.forEach((player) => {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.dataset.label = "Player";
      const link = document.createElement("a");
      link.href = `/international/player/?player_id=${player.player_id}`;
      link.textContent = player.player_name;
      nameTd.appendChild(link);

      const nationTd = document.createElement("td");
      nationTd.dataset.label = "Nation";
      nationTd.textContent = player.squad_name || "–";

      const matchesTd = document.createElement("td");
      matchesTd.dataset.label = "Matches";
      matchesTd.className = "num";
      matchesTd.textContent = formatNumber(player.matches_played || 0);

      tr.append(nameTd, nationTd, matchesTd);
      fragment.appendChild(tr);
    });

    if (elements.tableBody) {
      elements.tableBody.replaceChildren(fragment);
      syncResponsiveTable(elements.tableBody.closest("table"));
    }

    if (elements.resultsMeta) {
      elements.resultsMeta.textContent = `${formatNumber(players.length)} players`;
    }
    showStatusBanner(elements.status, "Players loaded.", "success", { kicker: "Ready", autoHideMs: 2000 });

  } catch (error) {
    if (elements.tableBody) {
      elements.tableBody.innerHTML = `<tr><td colspan="3">Error loading international players.</td></tr>`;
    }
    showStatusBanner(elements.status, "Error loading players.", "error", { kicker: "Error" });
  } finally {
    state.isLoading = false;
  }
}

function handleSearchInput(event) {
  const newTerm = event.target.value.trim();
  clearTimeout(handleSearchInput._timer);
  handleSearchInput._timer = setTimeout(() => {
    if (newTerm !== state.searchTerm) {
      state.searchTerm = newTerm;
      loadPlayers();
    }
  }, 300);
}

function initialize() {
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", handleSearchInput);
  }
  loadPlayers();
  trackEvent("international_players_viewed");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}