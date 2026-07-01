---
target: site-wide frontend
total_score: 27
p0_count: 1
p1_count: 2
p2_count: 1
p3_count: 1
timestamp: 2026-06-30T04-57-13Z
slug: site-wide-frontend
---
Method: dual-agent (A: ae60302a · B: f65db87f)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong status banners; home shows `-` placeholders before data lands |
| 2 | Match System / Real World | 3 | Netball voice strong; "Goals" on home vs Points elsewhere |
| 3 | User Control and Freedom | 3 | Clear/Cancel/theme exist; home filters not URL-shareable |
| 4 | Consistency and Standards | 2 | Duplicate nav labels; title vs domain brand split |
| 5 | Error Prevention | 3 | Query builder validates; home allows empty-result combos |
| 6 | Recognition Rather Than Recall | 2 | 14-link nav + long stat lists force memory |
| 7 | Flexibility and Efficiency | 3 | Advanced filters and toggles; no keyboard shortcuts |
| 8 | Aesthetic and Minimalist Design | 2 | Cohesive but homepage stacks too many jobs |
| 9 | Error Recovery | 3 | Query error-banner strong; home recovery lighter |
| 10 | Help and Documentation | 3 | Query examples good; no global stat glossary |
| **Total** | | **27/40** | **Acceptable** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Detector: **0 markup findings** across six entry HTML files.

LLM: Intentional Fraunces/Teko, domain copy, evidence-first query. Minor tells: pill nav density, reveal motion, summary-card band on home.

## Overall Impression

The product delivers on "evidence first" where it matters most — Ask the stats and compare step flows feel authored for analysts. The homepage still behaves like a control desk plus three leaderboards plus editorial lead on one scroll, and the global nav duplicates domestic/international labels. Fixing IA and homepage focus would lift the experience more than any visual polish pass.

## What's Working

1. Evidence-first query architecture (answer + interpretation + supporting evidence table)
2. Accessibility depth (skip links, ARIA, reduced motion, stack tables, theme toggle labels)
3. Editorial typography and dark-first palette — distinctive without gambling-site neon

## Priority Issues

**[P0] Global nav sprawl and duplicate wayfinding** — 14 pills with duplicated "Players" / "Ask the stats" / "Compare". Fix: collapse to ≤5 primaries; nest International as scoped mode. `/impeccable clarify`

**[P1] Homepage is three products on one scroll** — filters + editorial + match log + triple leaderboards. Fix: split entry paths; one dominant hero action. `/impeccable distill`

**[P1] Goals vs Points terminology** — `#summary-goals` vs Points leaderboards. Fix: align copy and summary label. `/impeccable harden`

**[P2] Home archive lacks shareable URL state** — unlike query/compare. Fix: sync filters to URL on apply. `/impeccable optimize`

**[P3] Brand identity at front door** — generic `<title>` vs statsball.net editorial voice. `/impeccable polish`

## Persona Red Flags

**Alex:** Apply-filters click chain, no shortcuts, nav scroll hides links on tablet, power settings in `<details>`.

**Jordan:** "SSN/ANZC" opaque, 14 equal-weight nav pills, three similar entry doors (home/query/compare), loading `-` on overview.

**Morgan (analyst/writer):** No provenance on home leaderboards, Goals/Points mismatch hurts citation trust, specialist nav labels without glossary, no export-friendly evidence formatting.

## Minor Observations

- Theme toggle FOUC: HTML shows "Light" before "Night desk" hydrates
- Player profile "Reading order" panel is a model home could borrow
- Query placeholder uses "goals" not Points

## Questions to Consider

- Is the homepage an almanac cover or a live control desk?
- Should International be a site mode rather than duplicated nav items?
- What would citation-ready UI look like for every leaderboard row?
