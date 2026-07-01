import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

export const DOMESTIC_MORE_TOOLS = Object.freeze([
  { href: "/league-composition/", label: "Composition", hint: "Youth, age, and import share" },
  { href: "/scoreflow/", label: "Scoreflow", hint: "Comebacks and score control" },
  { href: "/home-court-advantage/", label: "Court advantage", hint: "Home win rate and margin swing" },
  { href: "/nwar/", label: "nWAR", hint: "Wins above replacement by position" }
]);

function renderMoreToolsMenu() {
  const links = DOMESTIC_MORE_TOOLS.map(({ href, label, hint }) => `            <a class="page-nav__link" href="${href}"><span class="page-nav__link-label">${label}</span><small class="page-nav__link-hint">${hint}</small></a>`).join("\n");
  return `        <details class="page-nav__more">
          <summary class="page-nav__more-summary">More tools</summary>
          <div class="page-nav__more-menu" role="group" aria-label="Specialist archive tools">
${links}
          </div>
        </details>`;
}

const moreToolsPattern = /<details class="page-nav__more">[\s\S]*?<\/details>/;

const domesticPages = [
  "index.html",
  "query/index.html",
  "compare/index.html",
  "players/index.html",
  "player/index.html",
  "round/index.html",
  "round-preview/index.html",
  "changelog/index.html",
  "league-composition/index.html",
  "scoreflow/index.html",
  "home-court-advantage/index.html",
  "nwar/index.html"
];

const replacement = renderMoreToolsMenu();

for (const relativePath of domesticPages) {
  const filePath = path.join(repoRoot, relativePath);
  const html = readFileSync(filePath, "utf8");
  if (!moreToolsPattern.test(html)) {
    throw new Error(`Expected More tools block in ${relativePath}`);
  }
  writeFileSync(filePath, html.replace(moreToolsPattern, replacement), "utf8");
}

console.log(`Updated More tools nav on ${domesticPages.length} domestic pages.`);
