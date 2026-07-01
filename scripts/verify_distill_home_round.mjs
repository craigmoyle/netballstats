import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const homeHtml = readFileSync(path.join(repoRoot, "index.html"), "utf8");
const roundHtml = readFileSync(path.join(repoRoot, "round", "index.html"), "utf8");
const roundPreviewHtml = readFileSync(path.join(repoRoot, "round-preview", "index.html"), "utf8");
const appJs = readFileSync(path.join(repoRoot, "assets", "app.js"), "utf8");
const roundJs = readFileSync(path.join(repoRoot, "assets", "round.js"), "utf8");
const roundPreviewJs = readFileSync(path.join(repoRoot, "assets", "round-preview.js"), "utf8");
const queryHtml = readFileSync(path.join(repoRoot, "query", "index.html"), "utf8");
const compareHtml = readFileSync(path.join(repoRoot, "compare", "index.html"), "utf8");
const configJs = readFileSync(path.join(repoRoot, "assets", "config.js"), "utf8");
const css = readFileSync(path.join(repoRoot, "assets", "styles.css"), "utf8");
const intlHomeHtml = readFileSync(path.join(repoRoot, "international", "index.html"), "utf8");
const intlJs = readFileSync(path.join(repoRoot, "assets", "international.js"), "utf8");
const playerHtml = readFileSync(path.join(repoRoot, "player", "index.html"), "utf8");
const intlPlayerHtml = readFileSync(path.join(repoRoot, "international", "player", "index.html"), "utf8");
const playerJs = readFileSync(path.join(repoRoot, "assets", "player.js"), "utf8");
const intlPlayerJs = readFileSync(path.join(repoRoot, "assets", "international-player.js"), "utf8");

const archiveAdvancedStart = homeHtml.indexOf('id="archive-advanced"');
assert.notStrictEqual(archiveAdvancedStart, -1, "Expected homepage advanced archive details.");

for (const id of ['id="archive-mode"', 'id="stat-mode"', 'id="ranking-mode"']) {
  const index = homeHtml.indexOf(id);
  assert.ok(index > archiveAdvancedStart, `Expected ${id} to live inside the advanced archive details block.`);
}

assert.ok(
  !homeHtml.includes('id="editorial-lead-note"'),
  "Expected the homepage to remove the redundant editorial lead note."
);

assert.ok(
  homeHtml.includes("archive-results-intro"),
  "Expected the homepage to include the archive reading-order intro."
);

assert.ok(
  homeHtml.includes('id="competition-season-panel"') &&
  homeHtml.includes('<details id="competition-season-panel"'),
  "Expected season totals to live inside progressive disclosure."
);

assert.ok(
  homeHtml.includes('<details class="home-secondary panel reveal">') &&
  homeHtml.includes('id="matches-table"'),
  "Expected recent results to live inside progressive disclosure."
);

const editorialIndex = homeHtml.indexOf('class="panel editorial-lead');
const resultsGridIndex = homeHtml.indexOf("results-grid--home");
const filterDeskIndex = homeHtml.indexOf('id="archive-filter-desk"');
assert.ok(
  editorialIndex !== -1
  && resultsGridIndex !== -1
  && filterDeskIndex !== -1
  && editorialIndex < resultsGridIndex
  && resultsGridIndex < filterDeskIndex,
  "Expected editorial lead and leaderboards before the collapsed filter desk."
);

assert.ok(
  homeHtml.includes('<details id="archive-filter-desk"'),
  "Expected homepage filter desk to live inside progressive disclosure."
);

assert.ok(
  homeHtml.includes('id="archive-citation-text"') && homeHtml.includes('id="archive-citation-copy"'),
  "Expected homepage leaderboards to expose citation-ready provenance."
);

assert.ok(
  appJs.includes("function buildArchiveCitationText") && appJs.includes("function syncArchiveFilterDeskOpen"),
  "Expected homepage JS to render citations and manage filter desk disclosure."
);

assert.ok(
  configJs.includes("function hasDirectCrossModeRoute") && configJs.includes("page-nav__mode-fallback"),
  "Expected mode switch to surface fallback messaging on unmapped routes."
);

assert.ok(
  !homeHtml.includes('home-overview__intro'),
  "Expected the homepage overview to drop the redundant intro column."
);

assert.ok(
  homeHtml.includes('id="summary-points"') && homeHtml.includes(">Points</span>"),
  "Expected homepage archive totals to label scoring as Points."
);

assert.ok(
  !homeHtml.includes('id="summary-goals"'),
  "Expected homepage to retire the summary-goals element id."
);

assert.ok(
  roundHtml.includes('id="round-summary-points"') && roundHtml.includes("Points in round"),
  "Expected round recap totals to label scoring as Points."
);

assert.ok(
  !queryHtml.includes("50 goals or more"),
  "Expected query examples to use Points for scoring thresholds."
);

assert.ok(
  appJs.includes("function syncHomeUrlState") && appJs.includes("function applyHomeUrlState"),
  "Expected homepage archive filters to sync with the URL."
);

assert.ok(
  appJs.includes('params.set("seasons"') && appJs.includes('url.searchParams.get("seasons")'),
  "Expected homepage URL state to round-trip season filters."
);

assert.ok(
  configJs.includes('goals: "Points"'),
  "Expected goals stat label override to read Points for scoring totals."
);

assert.ok(
  homeHtml.includes("Super Netball & ANZ Stats · Statsball") &&
  homeHtml.includes('name="application-name" content="Statsball"') &&
  homeHtml.includes('property="og:title"'),
  "Expected homepage to use Statsball brand metadata."
);

assert.ok(
  !homeHtml.includes("Netball Stats Database"),
  "Expected homepage to retire the generic database title."
);

assert.ok(
  configJs.includes("function formatPageTitle") && appJs.includes("function syncHomeUrlState"),
  "Expected shared page title helper and URL sync helpers in archive scripts."
);

assert.ok(
  homeHtml.includes("page-nav__more"),
  "Expected domestic nav to collapse specialist tools into a More menu."
);

const homeNavBlock = homeHtml.slice(homeHtml.indexOf('class="page-nav"'), homeHtml.indexOf("</nav>", homeHtml.indexOf('class="page-nav"')));
assert.ok(
  !homeNavBlock.includes('Round recap</a>\n        <a class="page-nav__link" href="/league-composition/"')
  && !homeNavBlock.includes('Round recap</a>\n          <a class="page-nav__link" href="/league-composition/"'),
  "Expected specialist tools to live inside the More menu, not as top-level pills."
);

assert.ok(
  configJs.includes("DOMESTIC_MORE_ROUTES") && configJs.includes("page-nav__more--active"),
  "Expected nav helper to track active specialist routes in the More menu."
);

assert.ok(
  homeHtml.includes("page-nav__link-hint") && homeHtml.includes("Wins above replacement by position"),
  "Expected More tools menu links to include descriptive hints."
);

assert.ok(
  homeHtml.includes('class="home-overview reveal"') && homeHtml.includes('aria-label="Archive totals" hidden'),
  "Expected archive totals to stay hidden until the first summary fetch."
);

assert.ok(
  homeHtml.includes('archive-citation" aria-label="Leaderboard citation" hidden'),
  "Expected homepage citation to stay hidden until leaderboards load."
);

assert.ok(
  homeHtml.includes("Leaderboards update as you change filters"),
  "Expected homepage filters to auto-apply with helper copy."
);

assert.ok(
  appJs.includes("scheduleFilterApply") && appJs.includes("buildSurfaceCitationText"),
  "Expected homepage to debounce filter updates and use shared citation helpers."
);

assert.ok(
  configJs.includes("function buildSurfaceCitationText") && configJs.includes("function bindSurfaceCitationCopy"),
  "Expected shared citation helpers in config.js."
);

assert.ok(
  compareHtml.includes('id="compare-citation"') && queryHtml.includes('id="query-citation"'),
  "Expected compare and query pages to expose citation blocks."
);

for (const selector of [".archive-results-intro", ".archive-citation", ".home-secondary", ".home-secondary__summary", ".editorial-lead__link--primary", ".page-nav__mode-fallback"]) {
  assert.ok(
    css.includes(selector),
    `Expected distill styles for ${selector}.`
  );
}

assert.ok(
  !homeHtml.includes('scoreflow-teaser'),
  "Expected the homepage to remove the scoreflow teaser band."
);

assert.ok(
  !appJs.includes("loadScoreflowHomeCards"),
  "Expected homepage JS to remove the scoreflow teaser loader."
);

assert.ok(
  !roundHtml.includes('<aside class="hero-aside"'),
  "Expected the round recap hero to remove the summary aside."
);

assert.ok(
  !roundHtml.includes('id="round-fact-grid"'),
  "Expected the round recap to remove the standalone notable facts grid."
);

assert.ok(
  roundHtml.includes('id="round-fact-strip"'),
  "Expected the round recap to add an inline facts strip inside the match recap flow."
);

assert.ok(
  roundJs.includes("renderFactStrip"),
  "Expected round.js to render the simplified inline fact strip."
);

assert.ok(
  !roundPreviewHtml.includes('<aside class="hero-aside"'),
  "Expected the round preview hero to remove the summary aside."
);

assert.ok(
  roundPreviewJs.includes('document.createElement("details")') &&
  roundPreviewJs.includes("round-preview-card__extras"),
  "Expected round preview cards to use progressive disclosure for extra context."
);

for (const selector of [".round-fact-strip", ".round-preview-card__extras", ".round-preview-card__extras-summary"]) {
  assert.ok(
    css.includes(selector),
    `Expected distill styles for ${selector}.`
  );
}

const intlResultsIndex = intlHomeHtml.indexOf("results-grid--home");
const intlFilterDeskIndex = intlHomeHtml.indexOf('id="int-archive-filter-desk"');
assert.ok(
  intlResultsIndex !== -1
  && intlFilterDeskIndex !== -1
  && intlResultsIndex < intlFilterDeskIndex,
  "Expected international leaderboards before the collapsed filter desk."
);

assert.ok(
  intlHomeHtml.includes('<details id="int-archive-filter-desk"'),
  "Expected international filter desk to live inside progressive disclosure."
);

assert.ok(
  intlHomeHtml.includes('class="home-overview reveal"') && intlHomeHtml.includes('aria-label="Archive totals" hidden'),
  "Expected international archive overview to stay hidden until meta loads."
);

assert.ok(
  intlHomeHtml.includes("Leaderboards update as you change filters"),
  "Expected international filters to auto-apply with helper copy."
);

assert.ok(
  intlJs.includes("scheduleFilterApply") && intlJs.includes("syncArchiveFilterDeskOpen") && intlJs.includes("archiveResultsReady"),
  "Expected international home JS to debounce filter updates and gate citations."
);

assert.ok(
  playerHtml.includes('id="player-citation"') && intlPlayerHtml.includes('id="player-citation"'),
  "Expected player dossiers to expose citation blocks."
);

assert.ok(
  playerJs.includes("function buildPlayerCitationText") && intlPlayerJs.includes("function buildPlayerCitationText"),
  "Expected player dossier scripts to render shared citations."
);

assert.ok(
  homeHtml.includes('class="panel editorial-lead reveal"') && homeHtml.includes('aria-label="Latest archive lead" hidden'),
  "Expected editorial lead to stay hidden until round summary resolves."
);

assert.ok(
  !homeHtml.includes("Loading the latest completed round"),
  "Expected editorial lead to use static almanac copy instead of loading placeholders."
);

assert.ok(
  configJs.includes("function bindSeasonChoiceKeyboard"),
  "Expected shared season chip keyboard navigation helper."
);

assert.ok(
  homeHtml.includes('id="archive-filter-rail"') && homeHtml.includes("Apply immediately"),
  "Expected sticky filter rail and demoted apply control on domestic home."
);

assert.ok(
  intlHomeHtml.includes('id="int-archive-filter-rail"') && intlHomeHtml.includes("data-view-mode"),
  "Expected international home filter rail and chart toggles."
);

assert.ok(
  intlHomeHtml.includes("editorial-lead--international"),
  "Expected international home editorial lead."
);

assert.ok(
  playerHtml.includes('id="player-hero"') && playerHtml.includes('hidden') && playerHtml.includes('id="player-summary-band"'),
  "Expected player dossier hero and summary to stay hidden until profile loads."
);

console.log("Home and round distill checks passed.");
