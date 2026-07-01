export const PAGE_HEAD_META = Object.freeze({
  "index.html": {
    scope: "domestic",
    title: "Super Netball & ANZ Stats · Statsball",
    description:
      "Super Netball and ANZ Championship stats — leaders, records, and round context from the Statsball archive. 2008 finals only; full seasons from 2009."
  },
  "query/index.html": {
    scope: "domestic",
    shareImage: "/assets/share-domestic-query.png",
    title: "Ask the stats · Statsball",
    description:
      "Ask natural-language questions and get auditable answers from the Super Netball and ANZ Championship archive."
  },
  "compare/index.html": {
    scope: "domestic",
    shareImage: "/assets/share-domestic-compare.png",
    title: "Compare · Statsball",
    description:
      "Compare players or teams across seasons with shared trend charts and side-by-side tables."
  },
  "players/index.html": {
    scope: "domestic",
    title: "Players · Statsball",
    description:
      "Browse player profiles with career totals and season stats across the Super Netball and ANZ Championship archive."
  },
  "player/index.html": {
    scope: "domestic",
    shareImage: "/assets/share-domestic-player.png",
    title: "Player profile · Statsball",
    description:
      "Player dossier with career totals, pillars, and season ledger across the Super Netball and ANZ Championship archive."
  },
  "round/index.html": {
    scope: "domestic",
    title: "Round recap · Statsball",
    description:
      "Latest completed Super Netball round — results, spotlights, and notable records from the archive."
  },
  "round-preview/index.html": {
    scope: "domestic",
    title: "Round preview · Statsball",
    description:
      "Preview the next Super Netball round with head-to-head records, recent form, and player-watch notes."
  },
  "changelog/index.html": {
    scope: "domestic",
    title: "Changelog · Statsball",
    description: "Recent user-facing updates to the Statsball archive."
  },
  "league-composition/index.html": {
    scope: "domestic",
    title: "League composition · Statsball",
    description:
      "Youth break-ins, league age, experience, and import share across the Super Netball archive."
  },
  "scoreflow/index.html": {
    scope: "domestic",
    title: "Scoreflow · Statsball",
    description: "Track comebacks, control, and pressure through scoreflow records across the archive."
  },
  "home-court-advantage/index.html": {
    scope: "domestic",
    title: "Court advantage · Statsball",
    description:
      "Home-court advantage through win rate, margin, and penalty swing by arena, team, and season."
  },
  "nwar/index.html": {
    scope: "domestic",
    title: "nWAR · Statsball",
    description:
      "Netball Wins Above Replacement ranks players by estimated contribution to wins across seasons and positions."
  },
  "international/index.html": {
    scope: "international",
    title: "International archive · Statsball International",
    description:
      "International netball statistics for Australia, New Zealand, England, and major tournaments."
  },
  "international/players/index.html": {
    scope: "international",
    title: "Players · Statsball International",
    description:
      "Browse Australian Diamonds and international netball players with career statistics."
  },
  "international/player/index.html": {
    scope: "international",
    shareImage: "/assets/share-international-player.png",
    title: "Player profile · Statsball International",
    description: "International player dossier with career totals and season stats."
  },
  "international/query/index.html": {
    scope: "international",
    shareImage: "/assets/share-international-query.png",
    title: "Ask the stats · Statsball International",
    description:
      "Ask questions about Australian Diamonds and international netball statistics in plain English."
  },
  "international/compare/index.html": {
    scope: "international",
    shareImage: "/assets/share-international-compare.png",
    title: "Compare · Statsball International",
    description: "Compare international netball players side-by-side with career statistics."
  }
});

export const SITE_APPLICATION_NAMES = Object.freeze({
  domestic: "Statsball",
  international: "Statsball International"
});

export const SHARE_IMAGE_PATHS = Object.freeze({
  domestic: "/assets/share-domestic.png",
  international: "/assets/share-international.png"
});

export const SHARE_IMAGE_ALT = Object.freeze({
  domestic: "Statsball — Super Netball and ANZ Championship archive",
  international: "Statsball International — netball archive"
});

export function applicationNameForScope(scope = "domestic") {
  return SITE_APPLICATION_NAMES[scope] || SITE_APPLICATION_NAMES.domestic;
}

export function shareImageForScope(scope = "domestic") {
  return SHARE_IMAGE_PATHS[scope] || SHARE_IMAGE_PATHS.domestic;
}

export function shareImageAltForScope(scope = "domestic") {
  return SHARE_IMAGE_ALT[scope] || SHARE_IMAGE_ALT.domestic;
}

export function shareImageForMeta(meta = {}) {
  if (meta.shareImage) {
    return meta.shareImage;
  }
  return shareImageForScope(meta.scope);
}

export function renderSocialMetaTags(meta) {
  const { title, description, scope = "domestic" } = meta;
  const image = shareImageForMeta(meta);
  const imageAlt = shareImageAltForScope(scope);
  return [
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:alt" content="${imageAlt}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`
  ].join("\n    ");
}

export function renderApplicationNameTag(scope = "domestic") {
  return `<meta name="application-name" content="${applicationNameForScope(scope)}">`;
}
