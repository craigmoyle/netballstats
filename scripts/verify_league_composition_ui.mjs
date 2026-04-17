import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(scriptDir, "..", "dist");
const pageHtml = readFileSync(path.join(distDir, "league-composition", "index.html"), "utf8");
const playerHtml = readFileSync(path.join(distDir, "player", "index.html"), "utf8");
const stylesheetHrefMatch = pageHtml.match(/<link rel="stylesheet" href="(\/assets\/styles\.[^"]+\.css)">/);

assert.ok(stylesheetHrefMatch, "Expected the built league composition page to reference a fingerprinted stylesheet.");

const css = readFileSync(path.join(distDir, stylesheetHrefMatch[1].replace(/^\//, "")), "utf8");

assert.match(pageHtml, /league-composition-desk/, "Expected the built page to include league-composition-desk.");
assert.match(pageHtml, /league-composition-summary-body/, "Expected the built page to include league-composition-summary-body.");
assert.match(pageHtml, /league-composition-band-body/, "Expected the built page to include league-composition-band-body.");
assert.match(css, /\.league-composition-desk\b/, "Expected built CSS to include .league-composition-desk.");

console.log("League composition smoke checks passed");
