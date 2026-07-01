const SUPER_SHOT_START_SEASON = 2020;
const {
  buildUrl,
  buildSurfaceCitationText,
  bindSurfaceCitationCopy,
  fetchJson,
  formatNumber,
  formatStatAbbrev = (stat) => stat,
  formatStatLabel = (stat) => stat,
  formatPageTitle = (pageTitle, scope = "domestic") => {
    const brand = scope === "international" ? "Statsball International" : "Statsball";
    const clean = `${pageTitle || ""}`.replace(/\s+/g, " ").trim();
    return clean ? `${clean} · ${brand}` : brand;
  },
  showElementLoadingStatus = () => {},
  showElementStatus = () => {},
  syncResponsiveTable = () => {},
  updateSurfaceCitation = () => {}
} = window.NetballStatsUI || {};
const {
  bucketCount = () => "unknown",
  trackEvent = () => {}
} = window.NetballStatsTelemetry || {};

const PLAYER_LOADING_MESSAGES = [
  "Loading international player record…",
  "Loading career totals…",
  "Loading season splits…"
];

// Same stat definitions as regular player profiles
const PLAYER_STAT_DEFINITIONS = [
  ["netPoints", "Net Points"],
  ["intercepts", "Intercepts"],
  ["obstructionPenalties", "Obstructions"],
  ["contactPenalties", "Contacts"],
  ["generalPlayTurnovers", "General Play Turnovers"],
  ["unforcedTurnovers", "Unforced Turnovers"],
  ["pickups", "Pickups"],
  ["gain", "Gains"],
  ["centrePassReceives", "Centre Pass Receives"],
  ["deflections", "Deflections"],
  ["rebounds", "Rebounds"],
  ["goal1", "1 Point Goals"],
  ["attempts1", "1 Point Goal Attempts"],
  ["goal2", "2 Point Goals"],
  ["attempts2", "2 Point Goal Attempts"],
  ["feeds", "Feeds into Circle"],
  ["goalAssists", "Goal Assists"]
];

const PLAYER_STAT_ORDER = PLAYER_STAT_DEFINITIONS.map(([key]) => key);
const PLAYER_STAT_LABELS = new Map(PLAYER_STAT_DEFINITIONS);
const LEGACY_STAT_ALIASES = new Map([
  ["goal1", "goals"],
  ["attempts1", "goalAttempts"]
]);

const state = {
  metric: "total",
  profile: null
};

const elements = {
  playerStatus: document.getElementById("player-status"),
  playerHero: document.getElementById("player-hero"),
  playerName: document.getElementById("player-name"),
  playerSubtitle: document.getElementById("player-subtitle"),
  playerIntro: document.getElementById("player-intro"),
  playerSquads: document.getElementById("player-squads"),
  heroProfileBirthday: document.getElementById("hero-profile-birthday"),
  heroProfileBirthdayRow: document.getElementById("hero-profile-birthday-row"),
  heroProfileNationality: document.getElementById("hero-profile-nationality"),
  heroProfileNationalityRow: document.getElementById("hero-profile-nationality-row"),
  heroProfileDebutSeason: document.getElementById("hero-profile-debut-season"),
  heroProfileDebutRow: document.getElementById("hero-profile-debut-row"),
  summaryGames: document.getElementById("summary-games"),
  summarySeasons: document.getElementById("summary-seasons"),
  summaryTeams: document.getElementById("summary-teams"),
  summaryStats: document.getElementById("summary-stats"),
  summaryPrimary: document.getElementById("summary-primary"),
  playerSummaryBand: document.getElementById("player-summary-band"),
  playerDossierBody: document.getElementById("player-dossier-body"),
  careerStatsBody: document.getElementById("career-stats-body"),
  seasonTableCaption: document.getElementById("season-table-caption"),
  seasonStatsHead: document.getElementById("season-stats-head"),
  seasonStatsBody: document.getElementById("season-stats-body"),
  playerPillars: document.getElementById("player-pillars"),
  playerMarginalia: document.getElementById("player-marginalia"),
  seasonLedgerNotes: document.getElementById("season-ledger-notes"),
  metricButtons: Array.from(document.querySelectorAll("[data-metric]")),
  playerCitation: document.getElementById("player-citation"),
  playerCitationText: document.getElementById("player-citation-text"),
  playerCitationCopy: document.getElementById("player-citation-copy")
};

function showStatus(message, tone = "neutral", options = {}) {
  showElementStatus(elements.playerStatus, message, tone, options);
}

function showLoadingStatus(messages, kicker) {
  showElementLoadingStatus(elements.playerStatus, messages, kicker);
}

function createCell(text, label) {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (label) {
    cell.dataset.label = label;
  }
  return cell;
}

function statLabel(statKey) {
  return PLAYER_STAT_LABELS.get(statKey) || formatStatLabel(statKey);
}

function statKeysForProfile(statKey) {
  const legacyAlias = LEGACY_STAT_ALIASES.get(statKey);
  return legacyAlias ? [statKey, legacyAlias] : [statKey];
}

function roundStatValue(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizedSeasonStatMap(stats) {
  const statMap = new Map((stats || []).map((entry) => [entry.stat, entry]));
  // Note: International data may not have the same season-based super shot logic
  return statMap;
}

function aggregateCareerStat(careerStats, statKey) {
  const statEntries = (careerStats || [])
    .filter(entry => entry.stat === statKey);
  
  if (!statEntries.length) {
    return null;
  }

  const totalValue = statEntries.reduce((sum, entry) => sum + Number(entry.total || 0), 0);
  const matchesPlayed = statEntries.reduce((sum, entry) => sum + Number(entry.games || 0), 0);

  return {
    stat: statKey,
    total: roundStatValue(totalValue),
    average: matchesPlayed > 0 ? roundStatValue(totalValue / matchesPlayed) : null,
    games: matchesPlayed
  };
}

function selectedCareerStats(careerStats) {
  return PLAYER_STAT_ORDER
    .map((stat) => aggregateCareerStat(careerStats, stat))
    .filter(Boolean);
}

function selectedStatsForProfile(careerStats, seasonData) {
  const availableStats = new Set();
  
  // Add stats from career stats
  if (careerStats) {
    careerStats.forEach(stat => availableStats.add(stat.stat));
  }
  
  // Add stats from season data
  Object.values(seasonData || {}).forEach(seasonStats => {
    (seasonStats || []).forEach(stat => availableStats.add(stat.stat));
  });

  return PLAYER_STAT_ORDER.filter((stat) =>
    statKeysForProfile(stat).some((key) => availableStats.has(key))
  );
}

function metricValue(entry) {
  if (!entry) {
    return "-";
  }

  return state.metric === "average" ? entry.average : entry.total;
}

function parsePlayerId() {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get("player_id");
  if (fromQuery && /^\d+$/.test(fromQuery)) {
    return Number(fromQuery);
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  const playerIndex = segments.indexOf("player");
  const rawSegment = playerIndex >= 0 ? segments[playerIndex + 1] : "";
  const match = rawSegment ? rawSegment.match(/^(\d+)/) : null;
  return match ? Number(match[1]) : NaN;
}

function renderSquads(squadNames) {
  elements.playerSquads.replaceChildren();
  (squadNames || []).forEach((squadName) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = squadName;
    elements.playerSquads.appendChild(tag);
  });
}

function renderCareerStats(careerStats) {
  elements.careerStatsBody.replaceChildren();

  if (!careerStats || !careerStats.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "No career stats for this player.";
    row.appendChild(cell);
    elements.careerStatsBody.appendChild(row);
    syncResponsiveTable(elements.careerStatsBody.closest("table"));
    return;
  }

  careerStats.forEach((entry) => {
    const row = document.createElement("tr");
    row.append(
      createCell(statLabel(entry.stat)),
      createCell(formatNumber(entry.total)),
      createCell(formatNumber(entry.average)),
      createCell(formatNumber(entry.games))
    );
    elements.careerStatsBody.appendChild(row);
  });
  syncResponsiveTable(elements.careerStatsBody.closest("table"));
}

function renderSeasonTable(careerStats, seasonData) {
  const stats = selectedStatsForProfile(careerStats, seasonData);
  const seasons = Object.keys(seasonData || {}).sort((a, b) => Number(b) - Number(a));

  elements.seasonTableCaption.textContent = state.metric === "average"
    ? "Per-game averages for key stats."
    : "Season totals for key stats.";

  elements.seasonStatsHead.replaceChildren();
  ["Season", "Clubs"].forEach((label) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    elements.seasonStatsHead.appendChild(cell);
  });
  [{ abbrev: "Gms", label: "Games", key: null }, ...stats.map((s) => ({ abbrev: formatStatAbbrev(s), label: statLabel(s), key: s }))].forEach(({ abbrev, label }) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.className = "season-table__stat-head";
    cell.textContent = abbrev;
    cell.title = label;
    elements.seasonStatsHead.appendChild(cell);
  });

  elements.seasonStatsBody.replaceChildren();

  if (!seasons.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3 + stats.length;
    cell.textContent = "No season summaries for this player.";
    row.appendChild(cell);
    elements.seasonStatsBody.appendChild(row);
    return;
  }

  seasons.forEach((season) => {
    const seasonStats = seasonData[season] || [];
    const statMap = normalizedSeasonStatMap(seasonStats);
    const squadNames = [...new Set(seasonStats.map(s => s.squad_name).filter(Boolean))].join(" / ") || "-";
    const gamesPlayed = seasonStats.length ? Math.max(...seasonStats.map(s => s.games || 0)) : 0;
    
    const row = document.createElement("tr");
    row.className = "season-table__row";
    row.append(
      createCell(`${season}`, "Season"),
      createCell(squadNames, "Clubs"),
      createCell(formatNumber(gamesPlayed), "Games")
    );

    stats.forEach((stat) => {
      const statEntry = statMap.get(stat);
      row.appendChild(createCell(formatNumber(metricValue(statEntry)), statLabel(stat)));
    });

    elements.seasonStatsBody.appendChild(row);
  });
}

function buildDossierPillars(gamesPlayed, seasonsCount, teamsCount, careerStats, topCareerStat) {
  const seasonsList = Object.keys(state.profile?.stats?.seasons || {}).map(Number);
  const firstSeason = seasonsList.length ? Math.min(...seasonsList) : null;
  const lastSeason = seasonsList.length ? Math.max(...seasonsList) : null;
  
  return [
    {
      label: "Career span",
      value: firstSeason && lastSeason ? `${firstSeason}–${lastSeason}` : "Single season",
      note: `${formatNumber(seasonsCount || 0)} seasons`
    },
    {
      label: "Games",
      value: formatNumber(gamesPlayed || 0),
      note: `${formatNumber(teamsCount || 0)} clubs`
    },
    {
      label: "Primary record",
      value: topCareerStat ? formatNumber(topCareerStat.total) : "--",
      note: topCareerStat ? statLabel(topCareerStat.stat) : "No primary stat"
    },
    {
      label: "Latest season",
      value: lastSeason ? `${lastSeason}` : "--",
      note: "Archive dossier"
    }
  ];
}

function buildDossierNotes(gamesPlayed, squadNames, careerStats, topCareerStat) {
  // For international players, we might have different notes
  return [
    `International career with ${formatNumber(gamesPlayed || 0)} matches played.`,
    topCareerStat ? `Signature total: ${formatNumber(topCareerStat.total)} ${statLabel(topCareerStat.stat).toLowerCase()}.` : "Signature total unavailable.",
    (squadNames || []).length ? `Represented: ${(squadNames || []).join(" / ")}.` : "Teams represented unavailable."
  ];
}

function renderDossierPillars(pillars) {
  if (!elements.playerPillars) return;
  elements.playerPillars.replaceChildren();
  pillars.forEach((pillar) => {
    const article = document.createElement("article");
    article.className = "dossier-pillar";

    const label = document.createElement("span");
    label.className = "summary-card__label";
    label.textContent = pillar.label;

    const value = document.createElement("strong");
    value.className = "summary-card__value";
    value.textContent = pillar.value;

    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = pillar.note;

    article.append(label, value, note);
    elements.playerPillars.appendChild(article);
  });
}

function renderDossierNotes(notes) {
  if (!elements.playerMarginalia) return;
  elements.playerMarginalia.replaceChildren();
  notes.forEach((noteText) => {
    const item = document.createElement("li");
    item.textContent = noteText;
    elements.playerMarginalia.appendChild(item);
  });
}

function metricLabel(metric = state.metric) {
  return metric === "average" ? "Avg/game season ledger" : "Total season ledger";
}

function buildPlayerCitationText(profile = state.profile) {
  if (!profile) {
    return "";
  }

  const playerName = profile.player?.canonical_name || profile.player?.player_name || "Unknown player";
  const seasonKeys = Object.keys(profile.stats?.seasons || {}).map(Number).filter(Number.isFinite);
  const seasonSpan = seasonKeys.length
    ? `${Math.min(...seasonKeys)}\u2013${Math.max(...seasonKeys)}`
    : "Single-season";
  const squadNames = [...new Set(Object.values(profile.stats?.seasons || {}).flat().map((entry) => entry.squad_name).filter(Boolean))];
  const gamesPlayed = profile.stats?.games_played || 0;
  const teamsCount = squadNames.length;

  return buildSurfaceCitationText({
    scope: "international",
    segments: [
      `Player dossier: ${playerName}`,
      `${seasonSpan} · ${formatNumber(gamesPlayed)} games · ${formatNumber(teamsCount)} teams`,
      squadNames.length ? `Teams: ${squadNames.join(", ")}` : "",
      metricLabel()
    ]
  });
}

function renderPlayerCitation(profile = state.profile) {
  updateSurfaceCitation(
    elements.playerCitation,
    elements.playerCitationText,
    profile ? buildPlayerCitationText(profile) : "",
    { visible: Boolean(profile) }
  );
}

function updateSeasonLedgerNotes() {
  if (!elements.seasonLedgerNotes) return;
  elements.seasonLedgerNotes.textContent = state.metric === "average"
    ? "Per-game view keeps season shifts readable while the ledger preserves the full table."
    : "Use the ledger to scan peaks, club changes, and long-run consistency.";
}

function setMetric(nextMetric) {
  state.metric = nextMetric;
  elements.metricButtons.forEach((button) => {
    const isActive = button.dataset.metric === nextMetric;
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("button--ghost", !isActive);
    button.setAttribute("aria-pressed", `${isActive}`);
  });

  if (state.profile) {
    renderSeasonTable(state.profile.stats?.career, state.profile.stats?.seasons);
    updateSeasonLedgerNotes();
    renderPlayerCitation(state.profile);
  }
}

function renderHeroProfile(identity) {
  const fields = [
    { row: elements.heroProfileBirthdayRow, el: elements.heroProfileBirthday, value: identity?.date_of_birth || null },
    { row: elements.heroProfileNationalityRow, el: elements.heroProfileNationality, value: identity?.nationality || null },
    { row: elements.heroProfileDebutRow, el: elements.heroProfileDebutSeason, value: identity?.debut_season != null ? String(identity.debut_season) : null },
  ];
  let visible = 0;
  fields.forEach(({ row, el, value }) => {
    if (value && row && el) {
      el.textContent = value;
      row.hidden = false;
      visible++;
    } else if (row) {
      row.hidden = true;
    }
  });
  const aside = elements.heroProfileBirthday?.closest(".hero-aside");
  if (aside) aside.hidden = visible === 0;
}

function renderProfile(profile) {
  state.profile = profile;

  const playerName = profile.player?.canonical_name || profile.player?.player_name || "Unknown player";
  const squadNames = [...new Set(Object.values(profile.stats?.seasons || {}).flat().map(s => s.squad_name).filter(Boolean))];
  const seasonsCount = Object.keys(profile.stats?.seasons || {}).length;
  const teamsCount = squadNames.length;
  const gamesPlayed = profile.stats?.games_played || 0;
  
  const careerStats = selectedCareerStats(profile.stats?.career);
  const topCareerStat = careerStats
    .slice()
    .sort((left, right) => Number(right.total || 0) - Number(left.total || 0))[0];
    
  const pillars = buildDossierPillars(gamesPlayed, seasonsCount, teamsCount, profile.stats?.career, topCareerStat);
  const notes = buildDossierNotes(gamesPlayed, squadNames, profile.stats?.career, topCareerStat);

  document.title = formatPageTitle(playerName, "international");
  if (elements.playerHero) {
    elements.playerHero.hidden = false;
  }
  elements.playerName.textContent = playerName;
  elements.playerSubtitle.textContent = `International record ${profile.player?.player_id ?? ""}`.trim();
  elements.playerIntro.textContent = `${Object.keys(profile.stats?.seasons || {}).length ? `${Math.min(...Object.keys(profile.stats?.seasons || {}).map(Number))}\u2013${Math.max(...Object.keys(profile.stats?.seasons || {}).map(Number))}` : "Single-season"} dossier · ${formatNumber(gamesPlayed)} games across ${formatNumber(seasonsCount)} seasons and ${formatNumber(teamsCount)} teams.`;

  elements.summaryGames.textContent = formatNumber(gamesPlayed);
  elements.summarySeasons.textContent = formatNumber(seasonsCount);
  elements.summaryTeams.textContent = formatNumber(teamsCount);
  elements.summaryStats.textContent = formatNumber(careerStats.length);
  elements.summaryPrimary.textContent = topCareerStat
    ? `${statLabel(topCareerStat.stat)} · ${formatNumber(topCareerStat.total)}`
    : "No totals yet";
  if (elements.playerSummaryBand) {
    elements.playerSummaryBand.hidden = false;
  }
  if (elements.playerDossierBody) {
    elements.playerDossierBody.hidden = false;
  }

  renderSquads(squadNames);
  renderHeroProfile(profile.identity);
  renderCareerStats(careerStats);
  renderDossierPillars(pillars);
  renderDossierNotes(notes);
  updateSeasonLedgerNotes();
  renderSeasonTable(profile.stats?.career, profile.stats?.seasons);
  renderPlayerCitation(profile);
}

async function initialise() {
  const playerId = parsePlayerId();
  if (!Number.isFinite(playerId)) {
    showStatus("No player ID was found in the page URL.", "error");
    return;
  }

  showLoadingStatus(PLAYER_LOADING_MESSAGES, "Loading profile");

  try {
    const profile = await fetchJson("/international/player-profile", { player_id: playerId });
    renderProfile(profile);
    trackEvent("international_player_profile_loaded", {
      metric: state.metric,
      season_count_bucket: bucketCount(Object.keys(profile.stats?.seasons || {}).length, [0, 1, 2, 3, 5, 8, 12]),
      team_count_bucket: bucketCount([...new Set(Object.values(profile.stats?.seasons || {}).flat().map(s => s.squad_name).filter(Boolean))].length, [0, 1, 2, 3, 5]),
      stat_count_bucket: bucketCount((profile.stats?.available || []).length, [0, 1, 3, 5, 10, 15, 20])
    });
    showStatus("International player profile ready.", "success", { kicker: "Ready", autoHideMs: 2200 });
  } catch (error) {
    showStatus(error.message || "Unable to load the international player profile.", "error", { kicker: "Profile unavailable" });
  }
}

elements.metricButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMetric(button.dataset.metric || "total");
  });
});

bindSurfaceCitationCopy(
  elements.playerCitationCopy,
  () => buildPlayerCitationText(),
  {
    onSuccess: () => showStatus("Citation copied.", "success", { autoHideMs: 2000 }),
    onError: () => showStatus("Couldn't copy citation.", "error", { kicker: "Copy failed" })
  }
);

initialise();