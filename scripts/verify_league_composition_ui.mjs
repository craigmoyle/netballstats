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

assert.match(pageHtml, /league-composition-editorial-lead/, "Expected the built page to include league-composition-editorial-lead.");
assert.match(pageHtml, /league-composition-coverage-note/, "Expected the built page to include league-composition-coverage-note.");
assert.match(css, /\.league-composition-editorial-lead\b/, "Expected built CSS to include .league-composition-editorial-lead.");
assert.match(css, /\.league-composition-coverage-note\b/, "Expected built CSS to include .league-composition-coverage-note.");

assert.doesNotMatch(playerHtml, /player-identity-card/, "Expected the built player page to remove player-identity-card.");
assert.doesNotMatch(playerHtml, /player-identity-list/, "Expected the built player page to remove player-identity-list.");
assert.doesNotMatch(playerHtml, /player-identity-status/, "Expected the built player page to remove player-identity-status.");
assert.match(playerHtml, /hero-profile-list/, "Expected the built player page to include hero-profile-list.");
assert.match(playerHtml, /<span class="hero-aside__label">Profile<\/span>/, "Expected the built player page to relabel the hero card to Profile.");
assert.match(css, /\.hero-profile-list\b/, "Expected built CSS to include .hero-profile-list.");

console.log("League composition smoke checks passed");
