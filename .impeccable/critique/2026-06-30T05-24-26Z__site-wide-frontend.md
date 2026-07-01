---
target: site-wide frontend
total_score: 32
p0_count: 0
p1_count: 1
p2_count: 3
p3_count: 1
timestamp: 2026-06-30T05-24-26Z
slug: site-wide-frontend
---
Method: dual-agent (A: 0743bb8f · B: inline detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong banners; overview cards still show `-` before fetch |
| 2 | Match System / Real World | 4 | Points terminology aligned; netball voice consistent |
| 3 | User Control and Freedom | 4 | Home filters URL-sync on apply; changelog mode persists |
| 4 | Consistency and Standards | 3 | Mode switch + Statsball titles; domestic nav still wide |
| 5 | Error Prevention | 3 | Query builder validates; home allows sparse filter combos |
| 6 | Recognition Rather Than Recall | 3 | Reading order + collapsed sections help; stat lists long |
| 7 | Flexibility and Efficiency | 3 | Shareable URLs and advanced filters; no keyboard shortcuts |
| 8 | Aesthetic and Minimalist Design | 3 | Editorial-first + folded panels; filter desk still prominent |
| 9 | Error Recovery | 3 | Query error-banner strong; home recovery lighter |
| 10 | Help and Documentation | 3 | Query examples excellent; no global stat glossary |
| **Total** | | **32/40** | **Good** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Detector: **0 markup findings** across six entry HTML files (index, query, compare, players, player, international).

LLM: Fraunces/Teko, domain copy, evidence-first query remain intentional. Residual tells: domestic pill density, reveal motion on dense home scroll.

## Overall Impression

A clear step up from the first critique pass. The five targeted fixes all landed—nav mode switch, homepage distill, Points copy, URL-sync filters, and Statsball branding. The product now reads as a coherent editorial archive rather than three stitched products. Remaining friction is structural: domestic nav breadth and a homepage that still wears both almanac cover and control-desk hats.

## What's Working

1. Site-mode nav scopes Super Netball vs International without duplicated core labels
2. Homepage distill: editorial lead first, reading order, season totals and match log folded by default
3. Evidence-first query/compare flows remain the strongest analyst surfaces

## Priority Issues

**[P1] Domestic nav still carries nine feature pills** — Tablet users scroll horizontally; specialist routes lack hierarchy. Fix: group into Archive · Explore · Tools with a More cluster. `/impeccable clarify`

**[P2] Homepage still mixes almanac cover and filter desk** — Editorial lead then full filter form before leaderboards. Fix: demote filter desk behind a CTA or sub-route. `/impeccable distill`

**[P2] Mode switch from specialist routes loses context** — `/round/` → international root via mapRouteAcrossModes. Fix: explicit fallback messaging or hide switch on unmapped routes. `/impeccable adapt`

**[P2] Leaderboard rows lack citation-ready provenance** — Morgan cannot cite home tables without reconstructing filter context. Fix: panel meta + copy citation anchored to URL params. `/impeccable harden`

**[P3] Meta polish incomplete on subpages** — Home has og tags; query/compare lack application-name. Fix: shared head template per scope. `/impeccable polish`

## Persona Red Flags

**Alex:** Apply click still required to commit filters; no keyboard path through season chips.

**Jordan:** Nine domestic pills feel equal-weight; specialist labels (nWAR, Scoreflow) unexplained; `-` placeholders on first paint.

**Morgan:** Points trust restored, but home leaderboards still lack explicit filter provenance for citation.

## Minor Observations

- Theme toggle ships hydrated markup (Night desk) — prior FOUC resolved
- International nav trims to four core links; domestic retains full specialist set
- Query examples use "50 points" consistently

## Questions to Consider

- Should the homepage be a pure almanac cover with filters on a sub-route?
- When switching archives from specialist pages, should users expect route preservation or explicit "not in this archive" messaging?
- What is the minimum citation block Morgan needs on every leaderboard?
