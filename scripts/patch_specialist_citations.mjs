import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const citationBlock = (prefix, label) => `
        <div id="${prefix}-citation" class="archive-citation" aria-label="${label}" hidden>
          <p id="${prefix}-citation-text" class="archive-citation__text muted"></p>
          <button type="button" id="${prefix}-citation-copy" class="button button--ghost button--small">Copy citation</button>
        </div>`;

function patch(file, marker, insert, prefix) {
  const filePath = path.join(repoRoot, file);
  let html = readFileSync(filePath, "utf8");
  if (html.includes(`id="${prefix}-citation"`)) {
    return;
  }
  if (!html.includes(marker)) {
    throw new Error(`Marker not found in ${file}`);
  }
  html = html.replace(marker, `${insert}\n${marker}`);
  writeFileSync(filePath, html, "utf8");
}

patch(
  "nwar/index.html",
  '        <form id="nwar-filters" class="filters filters--dashboard" aria-label="nWAR filters">',
  citationBlock("nwar", "nWAR citation"),
  "nwar"
);

patch(
  "league-composition/index.html",
  '        <form id="league-composition-filters" class="filters filters--dashboard" aria-label="League composition filters">',
  citationBlock("league-composition", "League composition citation"),
  "league-composition"
);

patch(
  "scoreflow/index.html",
  '        <form id="scoreflow-filters" class="filters filters--dashboard" aria-label="Scoreflow filters">',
  citationBlock("scoreflow", "Scoreflow citation"),
  "scoreflow"
);

patch(
  "home-court-advantage/index.html",
  '        <form id="home-edge-filters" class="filters filters--dashboard" aria-label="Home court advantage filters">',
  citationBlock("home-edge", "Court advantage citation"),
  "home-edge"
);

console.log("Specialist citation blocks patched.");
