import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = readFileSync(path.join(repoRoot, 'assets', 'app.js'), 'utf8');
const distAssetsDir = path.join(repoRoot, 'dist', 'assets');

assert.match(
  appSource,
  /formatNumber,\s*\n\s*formatStatLabel/,
  'assets/app.js must import formatNumber from window.NetballStatsUI'
);

const appBundle = readdirSync(distAssetsDir).find((name) => /^app\.[a-f0-9]{10}\.js$/.test(name));
const chartsBundle = readdirSync(distAssetsDir).find((name) => /^charts\.[a-f0-9]{10}\.js$/.test(name));

assert.ok(appBundle, 'Expected a fingerprinted app bundle in dist/assets');
assert.ok(chartsBundle, 'Expected a fingerprinted charts bundle in dist/assets');

const appHash = appBundle.match(/\.([a-f0-9]{10})\.js$/)[1];
const chartsHash = chartsBundle.match(/\.([a-f0-9]{10})\.js$/)[1];

assert.equal(
  appHash,
  chartsHash,
  `app and charts bundles must share the same build fingerprint (${appBundle} vs ${chartsBundle})`
);

const configSource = readFileSync(path.join(repoRoot, 'assets', 'config.js'), 'utf8');
assert.match(
  configSource,
  /prepareChangelogNav\(nav\);\s*\n\s*setChangelogNavMode\(nav, activeMode\);/,
  'Site mode nav must swap domestic and international link sets on every page'
);

// Fingerprint-aware charts URL: page scripts like app.<hash>.js must resolve to charts.<hash>.js.
assert.match(
  configSource,
  /\(\?:app\|compare\|international\|home-court-advantage\)\(\\\.\[a-f0-9\]\{10\}\)\?\\\.js/,
  'resolveChartsScriptUrl must match fingerprinted page scripts'
);
assert.match(
  configSource,
  /return "\/assets\/charts\.js"/,
  'resolveChartsScriptUrl must fall back to absolute /assets/charts.js'
);

function resolveChartsScriptUrlFromSources(scriptSources) {
  const sources = Array.isArray(scriptSources) ? scriptSources : [];
  for (const src of sources) {
    const pageMatch = src.match(
      /^(.*\/)(?:app|compare|international|home-court-advantage)(\.[a-f0-9]{10})?\.js(\?.*)?$/
    );
    if (pageMatch) {
      return `${pageMatch[1]}charts${pageMatch[2] || ''}.js${pageMatch[3] || ''}`;
    }
  }
  for (const src of sources) {
    const assetMatch = src.match(/^(.*\/assets\/).+(\.[a-f0-9]{10})\.(?:js|css)(\?.*)?$/);
    if (assetMatch) {
      return `${assetMatch[1]}charts${assetMatch[2]}.js${assetMatch[3] || ''}`;
    }
  }
  return '/assets/charts.js';
}

assert.equal(
  resolveChartsScriptUrlFromSources([`https://statsball.net/assets/${appBundle}`]),
  `https://statsball.net/assets/${chartsBundle}`,
  'Fingerprinted app.js must resolve to matching charts.js'
);
assert.equal(
  resolveChartsScriptUrlFromSources([`/assets/compare.${appHash}.js`]),
  `/assets/charts.${appHash}.js`,
  'Fingerprinted compare.js must resolve to matching charts.js'
);
assert.equal(
  resolveChartsScriptUrlFromSources(['/assets/styles.css', `/assets/config.${appHash}.js`]),
  `/assets/charts.${appHash}.js`,
  'Any fingerprinted /assets/ script must yield charts with the same hash'
);
assert.equal(
  resolveChartsScriptUrlFromSources([]),
  '/assets/charts.js',
  'Empty script list must fall back to absolute /assets/charts.js'
);

assert.ok(
  readdirSync(distAssetsDir).includes(chartsBundle),
  `Resolved charts bundle ${chartsBundle} must exist in dist/assets`
);

for (const relativePath of [
  'international/index.html',
  'international/compare/index.html',
  'international/query/index.html',
  'international/players/index.html',
  'international/player/index.html'
]) {
  const html = readFileSync(path.join(repoRoot, relativePath), 'utf8');
  assert.doesNotMatch(html, /href="\/round\/"/, `${relativePath} must not include Round recap`);
  assert.doesNotMatch(html, /page-nav__more/, `${relativePath} must not include More tools`);
}

console.log('Homepage stats smoke checks passed');
