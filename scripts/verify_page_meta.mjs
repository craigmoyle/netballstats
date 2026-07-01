import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  PAGE_HEAD_META,
  applicationNameForScope,
  renderApplicationNameTag,
  renderSocialMetaTags,
  shareImageForMeta
} from "./page-head-meta.mjs";

const repoRoot = process.cwd();

for (const [relativePath, meta] of Object.entries(PAGE_HEAD_META)) {
  const html = readFileSync(path.join(repoRoot, relativePath), "utf8");
  const applicationName = applicationNameForScope(meta.scope);

  assert.ok(
    html.includes(renderApplicationNameTag(meta.scope)),
    `Expected ${relativePath} to include application-name for ${meta.scope}.`
  );
  assert.ok(html.includes(`<title>${meta.title}</title>`), `Expected ${relativePath} title.`);
  assert.ok(
    html.includes(`<meta name="description" content="${meta.description}">`),
    `Expected ${relativePath} description.`
  );
  assert.ok(
    html.includes(renderSocialMetaTags(meta)),
    `Expected ${relativePath} to include Open Graph tags.`
  );
  assert.ok(
    html.includes(`property="og:image" content="${shareImageForMeta(meta)}"`),
    `Expected ${relativePath} to include scope share image.`
  );
  assert.ok(
    html.includes('name="twitter:card" content="summary_large_image"'),
    `Expected ${relativePath} to include Twitter card metadata.`
  );
  assert.ok(
    html.includes(`property="og:title" content="${meta.title}"`),
    `Expected ${relativePath} og:title to match page title.`
  );
}

console.log("Page meta verification passed.");
