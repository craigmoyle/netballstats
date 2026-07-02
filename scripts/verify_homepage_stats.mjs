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
