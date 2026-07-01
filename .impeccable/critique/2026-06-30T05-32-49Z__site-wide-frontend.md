---
target: site-wide frontend
total_score: 35
p0_count: 0
p1_count: 0
p2_count: 3
p3_count: 2
timestamp: 2026-06-30T05-32-49Z
slug: site-wide-frontend
---
Method: dual-agent (A: dda0f4d4 · B: 97a4870e)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong banners; summary cards and citation still show `-` / Loading on first paint |
| 2 | Match System / Real World | 4 | Points terminology aligned; netball voice consistent |
| 3 | User Control and Freedom | 4 | URL-sync filters, reset, mode persistence, copy citation |
| 4 | Consistency and Standards | 4 | More tools nav, unified head meta, honest mode switch |
| 5 | Error Prevention | 3 | Query builder validates; home allows sparse filter combos without pre-apply preview |
| 6 | Recognition Rather Than Recall | 4 | Reading order, collapsed sections, live filter summary, citation block |
| 7 | Flexibility and Efficiency | 3 | Shareable URLs and copy citation; Apply click and no keyboard paths remain |
| 8 | Aesthetic and Minimalist Design | 4 | Editorial-first hierarchy with folded filter desk and secondary panels |
| 9 | Error Recovery | 3 | Query error surfaces strong; home/archive recovery lighter |
| 10 | Help and Documentation | 3 | Query examples excellent; no global stat glossary; specialist labels unexplained |
| **Total** | | **35/40** | **Good+** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Detector: **0 markup findings** across eight entry HTML files (index, query, compare, players, player, international, round). Full 17-page scan: one stylistic warning on nWAR em-dash density (low confidence).

LLM: Fraunces/Teko, domain copy, evidence-first query remain intentional. Residual tells: instructional reading-order copy, horizontal nav scroll on tablet, reveal motion on dense home scroll.

## Overall Impression

The structural critique backlog from the first two passes is largely closed. Homepage IA, nav hierarchy, mode-switch honesty, citation provenance, and subpage meta now read as one coherent editorial archive. Remaining friction is behavioural (Apply-to-commit), geographic (citation only on home), and polish (first-paint placeholders, share images).

## What's Working

1. Homepage IA matches the editorial promise — editorial lead → leaders → folded controls
2. Writer-grade citation on archive home with filter scope, refresh date, URL, and copy button
3. Nav mode switch is honest with fallback messaging; all 17 pages share scope-aware head meta

## Priority Issues

**[P2] Apply click still gates filter commits on home** — Summary and citation update live, but tables refresh only on submit. Fix: debounced auto-run or demote Apply once URL sync exists. `/impeccable optimize`

**[P2] Citation pattern is homepage-only** — Compare, query, player, and round surfaces lack copy-ready provenance. Fix: shared citation helper on filter-bound tables. `/impeccable harden`

**[P2] First-paint placeholders undermine editorial polish** — Summary cards show `-`; citation reads Loading before fetch. Fix: skeleton states or hide until populated. `/impeccable polish`

**[P3] Social meta lacks images** — All pages have og:title/description but no og:image or Twitter cards. Fix: scope-branded share images. `/impeccable polish`

**[P3] More tools labels assume insider knowledge** — nWAR, Scoreflow, Composition have no one-line descriptors in the dropdown. Fix: subtitle hints per link. `/impeccable clarify`

## Persona Red Flags

**Alex:** Apply click still required despite live summary and URL sync; no keyboard path through season chips; filter desk below two leaderboard panels.

**Jordan:** `-` placeholders feel like missing data; More tools labels opaque; horizontal nav scroll persists on tablet.

**Morgan:** Homepage citation is a meaningful fix; compare/query/player/round still lack equivalent provenance; citation text dense for social attribution.

## Minor Observations

- Filter desk smart-open on URL params or non-default slice works well for power users
- International pages correctly use Statsball International application-name and omit More tools
- Theme toggle ships hydrated Night desk markup — FOUC resolved
- PAGE_HEAD_META centralises titles/descriptions; watch for drift vs HTML edits

## Questions to Consider

- Is Apply filters still the right commit model now that URL sync and citation update pre-submit?
- Should exploration live on a sub-route with home as pure almanac cover?
- What is the minimum citation block for Morgan on every table surface?
- Are `-` placeholders a loading pattern or a trust bug on an evidence-first archive?
