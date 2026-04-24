import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(scriptDir, "..", "dist");
const pageHtml = readFileSync(path.join(distDir, "round-preview", "index.html"), "utf8");
const stylesheetHrefMatch = pageHtml.match(/<link rel="stylesheet" href="(\/assets\/styles\.[^"]+\.css)">/);

assert.ok(stylesheetHrefMatch, "Expected the built round preview page to reference a fingerprinted stylesheet.");
assert.match(pageHtml, /round-preview-page/, "Expected the built page to include round-preview-page.");
assert.match(pageHtml, /round-preview-status/, "Expected the built page to include round-preview-status.");
assert.match(pageHtml, /round-preview-match-grid/, "Expected the built page to include round-preview-match-grid.");
assert.match(pageHtml, /\/assets\/round-preview\.[^"]+\.js/, "Expected the built page to include the fingerprinted round-preview asset.");

console.log("Round preview UI smoke checks passed");
