---
target: site-wide frontend
total_score: 38
p0_count: 0
p1_count: 0
p2_count: 3
p3_count: 2
timestamp: 2026-07-01T00-45-53Z
slug: site-wide-frontend
---
Method: dual-agent (A: 2b048979 · B: c20ea488)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Archive homes and player heroes gate correctly; player dossier body and nWAR/query still leak loading chrome |
| 2 | Match System / Real World | 4 | Points terminology and netball voice consistent |
| 3 | User Control and Freedom | 4 | Sticky filter rail, auto-apply, URL sync, keyboard season hub, copy citation |
| 4 | Consistency and Standards | 3 | Domestic/international homes rhyme; league-composition citation JS/HTML gap; intl lacks trend/season panels |
| 5 | Error Prevention | 3 | Query validates; sparse season combos on auto-apply still possible |
| 6 | Recognition Rather Than Recall | 4 | Sticky filter summary, reading-order intros, More tools hints |
| 7 | Flexibility and Efficiency of Use | 4 | Shareable URLs, per-surface OG images, writer citations on most surfaces |
| 8 | Aesthetic and Minimalist Design | 4 | Editorial hierarchy, hidden-until-ready gating, distinctive typography |
| 9 | Error Recovery | 3 | Query errors strong; archive/player recovery lighter |
| 10 | Help and Documentation | 4 | Query templates, nWAR methodology, More tools subtitles |
| **Total** | | **38/40** | **Good+** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Detector: **0 structural findings** on six primary entry pages; one stylistic `em-dash-overuse` warning on nWAR (low confidence, methodology list copy). Verifiers: meta + distill scripts pass; 8 share PNG families in dist; specialist citation HTML present on 3/4 tools (league-composition DOM missing).

## Overall Impression

Run 6 closes the Run 5 backlog. Sticky filter rails, hidden-until-ready leaderboards and player heroes, international editorial lead and chart toggles, Apply immediately, specialist citations (mostly), and per-surface share cards land as a coherent package. Score rises one point to 38/40. Remaining friction is dossier body skeleton before load, one broken citation wire, international analytical depth vs domestic, and residual loading copy on specialist/query surfaces.

## What's Working

1. Archive first paint is confident — hidden leader panels, status-banner loading, and sticky filter rail with live summary
2. Provenance is infrastructure — shared citation pattern spans home, international home, player, query, compare, round, and three specialist tools
3. Social layer is surface-aware — six per-surface PNG variants plus scope defaults, rasterized at build

## Priority Issues

**[P2] Player dossier body renders before profile load** — Hero and summary band gate correctly, but career snapshot, empty tables, and season ledger loading copy still paint immediately. Fix: single hidden-until-ready gate for main dossier content. `/impeccable polish`

**[P2] League composition citation DOM missing** — JS binds `#league-composition-citation` elements absent from HTML. Fix: add citation block (patch script marker drift). `/impeccable harden`

**[P2] International archive depth still trails domestic** — Bar charts and editorial lead landed; no trend charts or folded season-totals panel. Fix: port trend/season panels when API supports or document intentional slim mode. `/impeccable adapt`

**[P3] Loading copy on specialist and query surfaces** — nWAR tbody and query hero aside still show loading strings on first paint. Fix: hidden-until-ready or static almanac fallback. `/impeccable polish`

**[P3] Share cards use system fonts in SVG source** — PNGs fix platform risk but previews won't match Fraunces/Teko in-product voice. Fix: embed brand fonts in share SVGs or accept scope-label cards. `/impeccable polish`

## Persona Red Flags

**Alex:** Sticky rail solves filter scroll; international mode still lacks trend charts and season context.

**Jordan:** Player URL no longer flashes loading h1, but body below fold looks broken before data; three similar entry doors still compete.

**Morgan:** Citations mostly work; league-composition silently broken; share cards generic in timeline previews.

## Minor Observations

- Editorial lead upgrades from static fallback when round-summary resolves
- Apply immediately correctly demotes manual submit
- International overview shows 3 summary cards vs domestic 4 (Points)
- Filter desk remains below leaders; sticky rail mitigates scroll friction

## Questions to Consider

- Should player dossier use one hidden-until-ready gate for all content below the status banner?
- Is international bar-only chart parity enough, or does the product promise full analytical parity?
- Should specialist tools share a citation partial to prevent JS/HTML drift?
- With sticky rail + auto-apply, should the filter desk move above leaders on desktop?
