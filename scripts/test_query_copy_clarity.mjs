import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const html = readFileSync(path.join(repoRoot, "query", "index.html"), "utf8");
const js = readFileSync(path.join(repoRoot, "assets", "query.js"), "utf8");

assert.ok(
  html.includes("Archive coverage"),
  "Expected Ask the Stats hero copy to use 'Archive coverage' instead of parser jargon."
);

assert.ok(
  html.includes("Need a prompt?"),
  "Expected the template step to be framed as prompt help, not parser help."
);

assert.ok(
  html.includes("Ask a question, then check the answer and rows below."),
  "Expected the idle answer meta to describe the user flow in plain language."
);

assert.ok(
  !html.includes("Parser scope"),
  "Expected the page to stop using the phrase 'Parser scope'."
);

assert.ok(
  !html.includes("Parser read"),
  "Expected the page to stop using the phrase 'Parser read'."
);

assert.ok(
  !html.includes("Pick a literal pattern the parser already understands"),
  "Expected the template help copy to avoid teaching parser internals."
);

assert.ok(
  !js.includes("The parser will check the wording before the answer card and evidence table update together."),
  "Expected query.js idle copy to avoid explaining parser internals."
);

console.log("Query copy clarity checks passed.");
