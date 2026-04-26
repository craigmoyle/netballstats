import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const html = readFileSync(path.join(repoRoot, "compare", "index.html"), "utf8");
const css = readFileSync(path.join(repoRoot, "assets", "styles.css"), "utf8");

// Hero: inline dek, no aside card
assert.ok(
  !html.includes('<aside class="hero-aside"'),
  "Expected the compare hero to stop using a separate aside card."
);

assert.ok(
  html.includes('class="compare-hero-dek"'),
  "Expected the compare hero to use an inline dek."
);

// Builder: two grouped surfaces instead of four equal-weight steps
assert.ok(
  html.includes('class="compare-surface compare-surface--matchup"'),
  "Expected a dominant matchup surface grouping mode + entities."
);

assert.ok(
  html.includes('class="compare-surface compare-surface--statframe"'),
  "Expected a supporting stat-frame surface grouping stat/metric/seasons/action."
);

// Step IDs preserved for compare.js — rail treatment retained within surfaces
assert.ok(
  html.includes('id="compare-step-mode" class="builder-step builder-step--rail"'),
  "Expected compare step-mode to keep the lighter rail treatment inside its surface."
);

assert.ok(
  html.includes('id="compare-step-action" class="builder-step builder-step--action builder-step--rail"'),
  "Expected compare step-action to keep the lighter rail treatment inside its surface."
);

// Results: verdict + chart paired in top story; table demoted as supporting evidence
assert.ok(
  html.includes('class="compare-results-stack"'),
  "Expected compare results to be grouped into one layout stack."
);

assert.ok(
  html.includes('class="compare-top-story"'),
  "Expected verdict and chart to be paired inside a compare-top-story container."
);

assert.ok(
  html.includes('class="panel compare-verdict compare-results-lead reveal"'),
  "Expected the verdict panel to lead the top story."
);

assert.ok(
  html.includes('compare-results-panel compare-results-panel--chart'),
  "Expected the trend panel to carry a compare-specific results layout class."
);

assert.ok(
  html.includes('compare-results-panel compare-results-panel--table'),
  "Expected the table panel to carry a compare-specific results layout class."
);

assert.ok(
  html.includes('compare-results-evidence'),
  "Expected the table section to carry the compare-results-evidence demotion class."
);

assert.ok(
  html.includes('class="table-wrapper compare-table-shell"'),
  "Expected the comparison table wrapper to use a lighter compare-specific shell."
);

// CSS selectors for the new hierarchy
for (const selector of [
  ".compare-surface--matchup",
  ".compare-surface .builder-step--rail",
  ".compare-top-story",
  ".compare-results-stack",
  ".compare-results-lead",
  ".compare-results-panel--table .table-wrapper",
  ".compare-page .hero-copy"
]) {
  assert.ok(
    css.includes(selector),
    `Expected compare layout styles for ${selector}.`
  );
}

console.log("Compare layout checks passed.");
