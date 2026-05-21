const {
  buildUrl,
  fetchJson,
  formatNumber,
  showStatusBanner = () => {},
  cycleStatusBanner = () => {},
} = window.NetballStatsUI || {};
const {
  trackEvent = () => {}
} = window.NetballStatsTelemetry || {};

const elements = {
  status:       document.getElementById("players-status"),
  searchInput:  document.getElementById("players-search"),
  resultsMeta:  document.getElementById("players-results-meta"),
  directoryTotal:   document.getElementById("int-directory-total"),
  directorySummary: document.getElementById("int-directory-summary"),
  directoryGrid:    document.getElementById("int-directory-grid"),
  emptyMsg:     document.getElementById("players-empty"),
};

const state = { searchTerm: "", isLoading: false, allPlayers: [] };

function playerProfileUrl(id) {
  return `/international/player/?player_id=${id}`;
}

function renderPlayers(players) {
  if (!elements.directoryGrid) return;
  if (elements.emptyMsg) elements.emptyMsg.hidden = true;

  if (!players.length) {
    elements.directoryGrid.replaceChildren();
    if (elements.emptyMsg) elements.emptyMsg.hidden = false;
    if (elements.resultsMeta) elements.resultsMeta.textContent = "No players found.";
    return;
  }

  const fragment = document.createDocumentFragment();
  players.forEach((player) => {
    const card = document.createElement("a");
    card.href = playerProfileUrl(player.player_id);
    card.className = "directory-card";

    const eyebrow = document.createElement("span");
    eyebrow.className = "directory-card__eyebrow";
    eyebrow.textContent = `Player ${player.player_id}`;

    const title = document.createElement("h2");
    title.className = "directory-card__title";
    title.textContent = player.player_name;

    const footer = document.createElement("div");
    footer.className = "directory-card__footer";

    const profileTag = document.createElement("span");
    profileTag.className = "tag";
    profileTag.textContent = "Open profile";
    footer.appendChild(profileTag);

    if (player.squad_name) {
      const nationTag = document.createElement("span");
      nationTag.className = "tag";
      nationTag.textContent = player.squad_name;
      footer.appendChild(nationTag);
    }

    if (player.matches_played > 0) {
      const matchesTag = document.createElement("span");
      matchesTag.className = "tag";
      matchesTag.textContent = `${formatNumber(player.matches_played)} matches`;
      footer.appendChild(matchesTag);
    }

    card.append(eyebrow, title, footer);
    fragment.appendChild(card);
  });

  elements.directoryGrid.replaceChildren(fragment);
  if (elements.resultsMeta) {
    elements.resultsMeta.textContent = `${formatNumber(players.length)} player profiles available.`;
  }
}

async function loadPlayers() {
  if (state.isLoading) return;
  state.isLoading = true;
  cycleStatusBanner(elements.status, ["Loading international players…"], { kicker: "Loading", tone: "loading" });

  try {
    const response = await fetchJson("/international/players", { limit: "2000" });
    state.allPlayers = response?.players || [];

    if (elements.directoryTotal) elements.directoryTotal.textContent = formatNumber(state.allPlayers.length);
    if (elements.directorySummary) elements.directorySummary.textContent = "Profiles are live for every player in the archive.";

    renderPlayers(state.allPlayers);
    showStatusBanner(elements.status, "Player directory ready.", "success", { kicker: "Profiles indexed", autoHideMs: 2200 });
    trackEvent("international_players_viewed", {});
  } catch {
    showStatusBanner(elements.status, "Unable to load the player directory.", "error", { kicker: "Directory unavailable" });
    if (elements.resultsMeta) elements.resultsMeta.textContent = "Player directory unavailable.";
  } finally {
    state.isLoading = false;
  }
}

function handleSearch(event) {
  const term = event.target.value.toLowerCase().trim();
  if (term === state.searchTerm) return;
  state.searchTerm = term;

  const filtered = term
    ? state.allPlayers.filter((p) => p.player_name?.toLowerCase().includes(term))
    : state.allPlayers;
  renderPlayers(filtered);
}

function initialize() {
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", handleSearch);
  }
  loadPlayers();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}