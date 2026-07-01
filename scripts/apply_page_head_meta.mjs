import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  PAGE_HEAD_META,
  renderApplicationNameTag,
  renderSocialMetaTags
} from "./page-head-meta.mjs";

const repoRoot = process.cwd();

function stripSocialMeta(html) {
  return html
    .replace(/\s*<meta property="og:title" content="[^"]*">/g, "")
    .replace(/\s*<meta property="og:description" content="[^"]*">/g, "")
    .replace(/\s*<meta property="og:type" content="[^"]*">/g, "")
    .replace(/\s*<meta property="og:image(?::alt)?" content="[^"]*">/g, "")
    .replace(/\s*<meta name="twitter:(?:card|title|description|image)" content="[^"]*">/g, "");
}

function upsertHeadMeta(html, meta) {
  const applicationNameTag = renderApplicationNameTag(meta.scope);
  const socialMetaTags = renderSocialMetaTags(meta);

  let next = html;

  if (!next.includes('name="application-name"')) {
    next = next.replace(
      /(<meta name="viewport" content="width=device-width, initial-scale=1">)/,
      `$1\n    ${applicationNameTag}`
    );
  } else {
    next = next.replace(
      /<meta name="application-name" content="[^"]*">/,
      applicationNameTag
    );
  }

  next = next.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
  next = next.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${meta.description}">`
  );

  next = stripSocialMeta(next);
  next = next.replace(
    /(<meta name="description" content="[^"]*">)/,
    `$1\n    ${socialMetaTags}`
  );

  return next;
}

for (const [relativePath, meta] of Object.entries(PAGE_HEAD_META)) {
  const filePath = path.join(repoRoot, relativePath);
  const html = readFileSync(filePath, "utf8");
  writeFileSync(filePath, upsertHeadMeta(html, meta), "utf8");
}

console.log(`Updated head metadata for ${Object.keys(PAGE_HEAD_META).length} pages.`);
