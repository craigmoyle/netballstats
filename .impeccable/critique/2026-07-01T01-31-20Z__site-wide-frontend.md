---
target: site-wide frontend
total_score: 39
p0_count: 0
p1_count: 0
p2_count: 0
p3_count: 5
timestamp: 2026-07-01T01-31-20Z
slug: site-wide-frontend
---
Method: dual-agent (A: c28c3f15 · B: 10a9f22c)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Archive homes and player dossiers gate well; query/nWAR/league-composition still paint loading chrome before JS |
| 2 | Match System / Real World | 4 | Points terminology, netball voice, Champion Data provenance hold |
| 3 | User Control and Freedom | 4 | Sticky filter rails, auto-apply, URL sync, copy citation, chart/table toggles |
| 4 | Consistency and Standards | 4 | International mirrors domestic season-totals + trend pattern; league citation wired |
| 5 | Error Prevention | 3 | Query builder validation strong; sparse season combos on auto-apply still possible |
| 6 | Recognition Rather Than Recall | 4 | Reading-order intros, sticky filter summaries, More tools hints |
| 7 | Flexibility and Efficiency of Use | 4 | Shareable URLs, per-surface OG images, writer citations on all major surfaces |
| 8 | Aesthetic and Minimalist Design | 4 | Editorial hierarchy, hidden-until-ready gating, Fraunces/Teko system |
| 9 | Error Recovery | 3 | Query errors strong; archive/player/specialist recovery still lighter |
| 10 | Help and Documentation | 4 | Query templates, nWAR methodology, filter hints, international data disclaimer |
| **Total** | | **39/40** | **Near-excellent** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Detector: **1 warning** (`em-dash-overuse` on nWAR methodology copy; low confidence stylistic flag). Verifiers: meta + distill scripts pass. Dist confirms `league-composition-citation`, `int-competition-season-panel`, and `player-dossier-body` in built output.

## Overall Impression

Run 7 closes the Run 6 P2 backlog. Dossier body gating, league composition citation wiring, and international season/trend depth land as real fixes. Score rises one point to **39/40**. Remaining friction is narrower: static loading copy on query/nWAR/specialist surfaces, share-card typography, and international nav parity — not structural editorial failure.

## What's Working

1. **Player dossier load discipline** — Hero plus entire dossier body share one readiness gate; no empty career tables or season-ledger loading copy on first paint.
2. **International analytical parity** — Season totals panel, player/team trend charts, and deferred panel fetching mirror domestic architecture without bloating first paint.
3. **Citation infrastructure is complete** — League composition closes the last DOM/JS drift gap; writers can copy from every major analytical surface.

## Priority Issues

**[P3] Static loading chrome on query, nWAR, and league composition** — Query hero aside, nWAR hero/tbody, and league composition editorial/meta strings paint "Loading…" before JS. Fix: hidden-until-ready on hero asides and editorial panels, or static almanac fallbacks. `/impeccable polish`

**[P3] Share card typography still off-brand** — SVG sources use Georgia/Arial; social previews diverge from Fraunces/Teko in-product voice. Fix: embed brand fonts in share SVGs or accept scope-label cards. `/impeccable polish`

**[P3] League composition lacks status-only gating** — Three loading placeholders compete with the status banner on first paint. Fix: hide editorial panels until data loads. `/impeccable polish`

**[P3] International navigation parity gap** — International nav omits Round recap and More tools cluster. Fix: document intentional slim mode or add scoped links. `/impeccable adapt`

**[P3] Domestic player profile placeholders vs international row hiding** — Domestic ships "Not yet verified" in hidden hero; international hides empty rows. Fix: align on cleaner row-hiding pattern. `/impeccable polish`

## Persona Red Flags

**Alex:** International analytical depth now matches domestic; still loses round-recap and specialist entry points when switching modes.

**Jordan:** Sticky rails and deferred charts respect performance; filter desk below leaders still costs scroll on desktop.

**Morgan:** Citations trustworthy site-wide; share previews still look generic; query hero briefly shows loading copy.

## Minor Observations

- International overview retains 3 summary cards vs domestic 4 (Points)
- Filter desk summary ships loading copy inside folded details on slow connections
- nWAR methodology em-dash density is high but fits editorial tone
- International hero disclaimer is stronger provenance UX than domestic home

## Questions to Consider

- Should all data-heavy surfaces adopt a single hidden-until-ready contract below the status banner?
- Does international owe navigation parity, or should it explicitly position as a slimmer Diamonds-focused archive?
- With sticky rails proven, should the filter desk move above leaders on desktop?
- Should share cards prioritize typographic brand fidelity or data-rich previews?
