---
target: site-wide frontend
total_score: 37
p0_count: 0
p1_count: 0
p2_count: 3
p3_count: 3
timestamp: 2026-06-30T05-56-45Z
slug: site-wide-frontend
---
Method: dual-agent (A: b02151da · B: 91a8c516)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Hero bands gate correctly; leader tables and player hero still show loading copy on first paint |
| 2 | Match System / Real World | 4 | Points terminology and netball voice consistent |
| 3 | User Control and Freedom | 4 | URL-sync filters, debounced auto-apply, reset, copy citation, season-chip keyboard nav |
| 4 | Consistency and Standards | 3 | Shared citation system; international home still lacks chart toggles and editorial lead |
| 5 | Error Prevention | 3 | Query builder validates; auto-apply can commit sparse season combos |
| 6 | Recognition Rather Than Recall | 4 | Collapsed filter desks, More tools hints, reading-order intros |
| 7 | Flexibility and Efficiency of Use | 4 | Shareable URLs, keyboard season hub, writer citations on major surfaces |
| 8 | Aesthetic and Minimalist Design | 4 | Editorial hierarchy, progressive disclosure, distinctive typography |
| 9 | Error Recovery | 3 | Query errors strong; archive/player recovery lighter |
| 10 | Help and Documentation | 4 | Query templates, example chips, More tools subtitles |
| **Total** | | **37/40** | **Good+** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Detector: **0 structural findings** on six entry pages; one stylistic `em-dash-overuse` warning on nWAR (low confidence, outside primary scan). Verifiers: meta + distill scripts pass; 17/17 pages ship PNG og:image and Twitter cards; season-chip keyboard helper in config.js.

## Overall Impression

Run 5 closes the Run 4 backlog and the three Run 4 P3 polish items. International home now matches domestic filter behaviour; player dossiers have copy-ready citations; editorial lead uses static almanac copy hidden until ready; share cards rasterize to PNG at build; season chips support arrow-key traversal and Space to toggle. Remaining friction is cross-surface parity (international charts/editorial lead), first-paint loading on tables and player hero, and citation coverage on specialist tools.

## What's Working

1. Writer-grade provenance is a shared system on home, international home, compare, query, round, and player dossiers
2. Domestic home rhythm is editorial — editorial lead, leaders, folded filters — with hidden-until-ready overview/citation
3. Run 5 behavioural package lands coherently: international auto-apply, PNG share cards, keyboard season hub

## Priority Issues

**[P2] International home feature gap vs domestic** — Filters and citations match; international still has no table/chart toggles and no editorial lead. Fix: port chart layer and editorial lead when data density justifies it. `/impeccable adapt`

**[P2] First-paint loading still leaks through tables and dossier hero** — Leader tables show "Loading…" and player `h1` shows loading copy before data arrives. Fix: hidden-until-ready or static almanac fallback on those surfaces. `/impeccable polish`

**[P2] Filter desk placement below leaderboards** — Power users must scroll past results to change filters even with auto-apply. Fix: sticky filter summary bar or reposition desk. `/impeccable layout`

**[P3] "Update now" competes with auto-apply** — Dual mental model with helper copy saying leaderboards update automatically. Fix: demote to text link or "Apply immediately." `/impeccable clarify`

**[P3] Specialist tools lack citation blocks** — nWAR, composition, scoreflow, court advantage have no copy-ready provenance. Fix: shared citation footer on specialist outputs. `/impeccable harden`

**[P3] Share previews are scope-generic** — PNG cards fix platform risk but player/query/compare links still ship the same domestic/international card. Fix: per-surface OG images if social attribution matters. `/impeccable polish`

## Persona Red Flags

**Alex:** Filter desk below leaderboards; redundant Update now; international home lacks chart shortcuts; tablet nav horizontal scroll hides links.

**Jordan:** Player hero `h1` still loading-first; dense reading-order copy; three similar entry doors compete for "where do I start?"

**Morgan:** Player citation is a Run 5 win; citation strings dense for social; specialist tools still lack citation; generic scope PNGs for share links.

## Minor Observations

- Editorial lead reveals with static copy at init, then upgrades when `/round-summary` returns
- International overview keeps intro copy domestic retired
- Compare/query/player citation gating pattern is sound
- Verifiers encode design contracts — good regression guardrails

## Questions to Consider

- Should international home inherit domestic chart layer and editorial lead?
- Should player hero adopt hidden-until-ready like home editorial lead?
- Does Update now still earn primary button weight with auto-apply?
- Would a sticky filter summary bar above leaderboards solve Alex's scroll problem?
