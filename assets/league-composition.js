const {
  fetchJson,
  getCheckedValues = () => [],
  renderEmptyTableRow = () => {},
  showStatusBanner = () => {},
  syncResponsiveTable = () => {}
} = window.NetballStatsUI || {};

const state = {
  seasons: [],
  summary: [],
  bands: []
};

const elements = {
  status: document.getElementById("league-composition-status"),
  meta: document.getElementById("league-composition-meta"),
  leadHeadline: document.getElementById("league-composition-lead-headline"),
  leadCopy: document.getElementById("league-composition-lead-copy"),
  coverageNote: document.getElementById("league-composition-coverage-note"),
  seasonChoices: document.getElementById("league-composition-season-choices"),
  summaryBody: document.getElementById("league-composition-summary-body"),
  bandBody: document.getElementById("league-composition-band-body")
};

function selectedSeasons() {
  return getCheckedValues(elements.seasonChoices).sort((a, b) => Number(a) - Number(b));
}

function renderSummaryRows(rows) {
  elements.summaryBody.replaceChildren();
  if (!rows.length) {
    renderEmptyTableRow(elements.summaryBody, "No league-composition rows match this season frame.", { colSpan: 1, kicker: "No rows" });
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.dataset.stackPrimary = "true";
    td.textContent = `${row.season}: debut age ${row.average_debut_age ?? "—"}, league age ${row.average_player_age ?? "—"}, experience ${row.average_experience_seasons ?? "—"}, import share ${row.import_share != null ? `${(Number(row.import_share) * 100).toFixed(1)}%` : "—"}`;
    tr.appendChild(td);
    fragment.appendChild(tr);
  });
  elements.summaryBody.appendChild(fragment);
  syncResponsiveTable(elements.summaryBody.closest("table"));
}

function renderBandRows(rows) {
  elements.bandBody.replaceChildren();
  if (!rows.length) {
    renderEmptyTableRow(elements.bandBody, "No debut-age band rows match this season frame.", { colSpan: 1, kicker: "No bands" });
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = `${row.season}: ${row.age_band} — ${row.players} debut players (${(Number(row.share) * 100).toFixed(1)}%)`;
    tr.appendChild(td);
    fragment.appendChild(tr);
  });
  elements.bandBody.appendChild(fragment);
  syncResponsiveTable(elements.bandBody.closest("table"));
}

function renderCoverage(summaryPayload) {
  const ageCoverage = Number(summaryPayload.coverage?.players_with_birth_date || 0) / Number(summaryPayload.coverage?.players_with_matches || 1);
  const importCoverage = Number(summaryPayload.coverage?.players_with_import_status || 0) / Number(summaryPayload.coverage?.players_with_matches || 1);
  const coverageFloor = Math.min(ageCoverage, importCoverage);

  elements.coverageNote.textContent = coverageFloor < 0.85
    ? "Coverage is below the release target for at least one maintained field, so treat the trend lines as partial rather than final."
    : "Coverage is above the release target for age and import classifications in the selected season frame.";
}

function renderLead(rows) {
  const latest = rows[rows.length - 1];
  if (!latest) {
    elements.leadHeadline.textContent = "No league-composition seasons match this filter.";
    elements.leadCopy.textContent = "Try a broader season range.";
    return;
  }
  elements.leadHeadline.textContent = `${latest.season}: debut age ${latest.average_debut_age ?? "—"}, average age ${latest.average_player_age ?? "—"}`;
  elements.leadCopy.textContent = `The current frame shows ${latest.average_experience_seasons ?? "—"} average seasons of experience and ${latest.import_share != null ? `${(Number(latest.import_share) * 100).toFixed(1)}%` : "—"} import share.`;
}

async function loadPage() {
  showStatusBanner(elements.status, "Loading league composition…", "loading");
  const seasons = selectedSeasons();
  const params = seasons.length ? { seasons: seasons.join(",") } : {};

  const [summaryPayload, bandsPayload] = await Promise.all([
    fetchJson("/league-composition-summary", params),
    fetchJson("/league-composition-debut-bands", params)
  ]);

  state.summary = summaryPayload.data || [];
  state.bands = bandsPayload.data || [];
  elements.meta.textContent = seasons.length ? `Showing ${seasons.length} selected seasons.` : "Showing all seasons.";
  renderLead(state.summary);
  renderCoverage(summaryPayload);
  renderSummaryRows(state.summary);
  renderBandRows(state.bands);
  showStatusBanner(elements.status, "");
}

window.addEventListener("DOMContentLoaded", loadPage);
