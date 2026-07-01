import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'dist');
const assetSourceDir = path.join(repoRoot, 'assets');
const assetOutputDir = path.join(outputDir, 'assets');

const staticEntries = ['changelog', 'home-court-advantage', 'index.html', 'compare', 'league-composition', 'nwar', 'player', 'players', 'query', 'round', 'round-preview', 'scoreflow', 'team-logos', 'staticwebapp.config.json', 'international'];
const htmlEntries = ['changelog/index.html', 'home-court-advantage/index.html', 'index.html', 'compare/index.html', 'league-composition/index.html', 'nwar/index.html', 'player/index.html', 'players/index.html', 'query/index.html', 'round/index.html', 'round-preview/index.html', 'scoreflow/index.html', 'international/index.html', 'international/players/index.html', 'international/player/index.html', 'international/query/index.html', 'international/compare/index.html'];
const fingerprintedAssets = ['app.js', 'charts.js', 'compare.js', 'config.js', 'home-court-advantage.js', 'league-composition.js', 'nwar.js', 'player.js', 'players.js', 'query.js', 'round.js', 'round-preview.js', 'scoreflow.js', 'styles.css', 'styles-query.css', 'styles-international.css', 'telemetry.js', 'theme.js', 'international.js', 'international-players.js', 'international-player.js', 'international-query.js', 'international-compare.js'];

const CSS_SPLIT_RANGES = {
  query: [[3963, 4987], [5870, 6348]],
  international: [[6350, null]]
};

const htmlExtraStylesheets = {
  'query/index.html': ['styles-query.css'],
  'international/query/index.html': ['styles-query.css'],
  'international/index.html': ['styles-international.css'],
  'international/players/index.html': ['styles-international.css'],
  'international/player/index.html': ['styles-international.css'],
  'international/compare/index.html': ['styles-international.css']
};

const hashContent = (content) => createHash('sha256').update(content).digest('hex').slice(0, 10);
const fingerprintName = (assetName, content) => {
  const parsed = path.parse(assetName);
  return `${parsed.name}.${hashContent(content)}${parsed.ext}`;
};

function extractCssRanges(source, ranges) {
  const lines = source.split('\n');
  return ranges
    .map(([start, end]) => lines.slice(start - 1, end ?? lines.length).join('\n'))
    .filter(Boolean)
    .join('\n\n');
}

function removeCssRanges(source, allRangeGroups) {
  const lines = source.split('\n');
  const skip = new Set();

  for (const ranges of Object.values(allRangeGroups)) {
    for (const [start, end] of ranges) {
      for (let index = start - 1; index < (end ?? lines.length); index += 1) {
        skip.add(index);
      }
    }
  }

  return lines.filter((_, index) => !skip.has(index)).join('\n');
}

async function minifyAsset(assetName, content) {
  const ext = path.extname(assetName).toLowerCase();
  if (ext === '.css') {
    const result = await esbuild.transform(content.toString('utf8'), {
      loader: 'css',
      minify: true
    });
    return Buffer.from(result.code, 'utf8');
  }

  if (ext === '.js') {
    const result = await esbuild.transform(content.toString('utf8'), {
      loader: 'js',
      minify: true,
      target: 'es2020'
    });
    return Buffer.from(result.code, 'utf8');
  }

  return content;
}

function injectExtraStylesheets(html, extras, manifest) {
  if (!extras.length) {
    return html;
  }

  let nextHtml = html;
  for (const assetName of extras) {
    const fingerprintedRef = manifest.get(`/assets/${assetName}`) || manifest.get(`assets/${assetName}`);
    if (!fingerprintedRef) {
      continue;
    }

    const linkTag = `    <link rel="stylesheet" href="${fingerprintedRef}">`;
    nextHtml = nextHtml.replace(
      /(<link rel="stylesheet" href="[^"]*styles\.[^"]+\.css">)/,
      `$1\n${linkTag}`
    );
  }

  return nextHtml;
}

async function rasterizeShareCard(svgName) {
  const svgPath = path.join(assetSourceDir, svgName);
  const pngName = svgName.replace(/\.svg$/i, '.png');
  const pngBuffer = await sharp(svgPath, { density: 144 })
    .resize(1200, 630)
    .png()
    .toBuffer();
  await writeFile(path.join(assetOutputDir, pngName), pngBuffer);
  return pngName;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await mkdir(assetOutputDir, { recursive: true });

for (const entry of staticEntries) {
  await cp(path.join(repoRoot, entry), path.join(outputDir, entry), { recursive: true });
}

await rm(assetOutputDir, { recursive: true, force: true });
await mkdir(assetOutputDir, { recursive: true });
await cp(path.join(assetSourceDir, 'fonts'), path.join(assetOutputDir, 'fonts'), { recursive: true });
await cp(path.join(assetSourceDir, 'noise.svg'), path.join(assetOutputDir, 'noise.svg'));
const shareSvgNames = (await readdir(assetSourceDir)).filter((name) => name.startsWith('share-') && name.endsWith('.svg'));
for (const svgName of shareSvgNames) {
  await cp(path.join(assetSourceDir, svgName), path.join(assetOutputDir, svgName));
  await rasterizeShareCard(svgName);
}

const fullCssSource = await readFile(path.join(assetSourceDir, 'styles.css'), 'utf8');
const stylesQuerySource = extractCssRanges(fullCssSource, CSS_SPLIT_RANGES.query);
const stylesInternationalSource = extractCssRanges(fullCssSource, CSS_SPLIT_RANGES.international);
const stylesCoreSource = removeCssRanges(fullCssSource, CSS_SPLIT_RANGES);

const assetContents = new Map();
for (const assetName of fingerprintedAssets) {
  let rawContent;
  if (assetName === 'styles.css') {
    rawContent = Buffer.from(stylesCoreSource, 'utf8');
  } else if (assetName === 'styles-query.css') {
    rawContent = Buffer.from(stylesQuerySource, 'utf8');
  } else if (assetName === 'styles-international.css') {
    rawContent = Buffer.from(stylesInternationalSource, 'utf8');
  } else {
    rawContent = await readFile(path.join(assetSourceDir, assetName));
  }
  assetContents.set(assetName, await minifyAsset(assetName, rawContent));
}

const assetManifest = new Map();
for (const assetName of fingerprintedAssets) {
  const content = assetContents.get(assetName);
  const outputName = fingerprintName(assetName, content);
  assetManifest.set(`/assets/${assetName}`, `/assets/${outputName}`);
  assetManifest.set(`assets/${assetName}`, `assets/${outputName}`);
  await writeFile(path.join(assetOutputDir, outputName), content);
}

for (const htmlEntry of htmlEntries) {
  const htmlPath = path.join(outputDir, htmlEntry);
  let html = await readFile(htmlPath, 'utf8');

  for (const [originalRef, fingerprintedRef] of assetManifest.entries()) {
    html = html.split(originalRef).join(fingerprintedRef);
  }

  html = injectExtraStylesheets(html, htmlExtraStylesheets[htmlEntry] || [], assetManifest);
  await writeFile(htmlPath, html, 'utf8');
}
