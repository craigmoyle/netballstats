import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(scriptDir, "..", "dist");
const nwarHtml = readFileSync(path.join(distDir, "nwar", "index.html"), "utf8");
const nwarScriptMatch = nwarHtml.match(/<script defer src="(\/assets\/nwar\.[^"]+\.js)"><\/script>/);
assert.ok(nwarScriptMatch, "Expected built nwar page to include a fingerprinted nwar.js asset.");
const nwarJs = readFileSync(path.join(distDir, nwarScriptMatch[1].replace(/^\//, "")), "utf8");

assert.match(nwarHtml, /id="nwar-era"/, "Expected built nwar page to include the era filter.");
assert.match(nwarHtml, /id="nwar-position-group"/, "Expected built nwar page to include the position-group filter.");
assert.match(nwarHtml, /name="era"/, "Expected built nwar page to submit an era field.");
assert.match(nwarHtml, /name="position_group"/, "Expected built nwar page to submit a position_group field.");
assert.match(nwarJs, /function syncUrlState/, "Expected built nwar.js to include syncUrlState.");
assert.match(nwarJs, /function hydrateFiltersFromUrl/, "Expected built nwar.js to include hydrateFiltersFromUrl.");
assert.match(nwarJs, /position_group/, "Expected built nwar.js to send position_group requests.");
assert.match(nwarJs, /ordered by nWAR per season/, "Expected built nwar.js to keep all-seasons ranking copy.");

console.log("nWAR filter UI shell checks passed");
