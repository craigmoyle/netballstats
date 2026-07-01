---
target: site-wide frontend
total_score: 39
p0_count: 0
p1_count: 0
p2_count: 0
p3_count: 5
timestamp: 2026-07-01T02-34-25Z
slug: site-wide-frontend
---
Method: dual-agent (A: 3b208938 · B: 95841657)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Status-banner-first async; round/compare still paint loading copy in hero/meta |
| 2 | Match System / Real World | 4 | Points terminology, netball voice, Champion Data provenance intact |
| 3 | User Control and Freedom | 4 | Sticky filter rails, URL sync, citations, chart/table toggles |
| 4 | Consistency and Standards | 4 | Run 8 P3 gaps closed; compare/round loading contracts still lag query |
| 5 | Error Prevention | 3 | Query builder validation strong; sparse season filter edge cases remain |
| 6 | Recognition Rather Than Recall | 4 | Static filter hints, reading-order intros, More tools hints |
| 7 | Flexibility and Efficiency of Use | 4 | Shareable URLs, per-surface OG images, writer citations site-wide |
| 8 | Aesthetic and Minimalist Design | 4 | Hidden-until-ready on specialist surfaces; editorial hierarchy holds |
| 9 | Error Recovery | 3 | Query error banner robust; round/compare recovery still lighter |
| 10 | Help and Documentation | 4 | Query templates, nWAR methodology, filter hints |
| **Total** | | **39/40** | **Near-excellent** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Detector: **0 findings** on 11 primary pages. Verifiers pass. `Not yet verified` cleared from player markup.

## Overall Impression

Run 9 confirms the critique arc plateau at **39/40**. Run 8 P3 backlog is closed in source. Remaining gap is guardrails on compare/round loading copy and error-prevention edge cases — not structural editorial failure.

## What's Working

1. Cross-mode navigation parity — international pages carry Round recap and More tools
2. Dossier trust — domestic and international player heroes share row-hiding contract
3. Static-until-hydrated hints on archive filters, query builder, and specialist hero asides

## Priority Issues

**[P3] Compare builder loading copy** — `compare.js` still cycles loading strings on init. `/impeccable polish`

**[P3] Round recap hero loading strings** — hero/meta ships Loading copy before JS. `/impeccable polish`

**[P3] Deferred archive chart placeholders** — "Loading season context…" in chart shells during deferred fetches. `/impeccable polish`

**[P3] International query scope** — thinner than domestic query without explicit scope copy. `/impeccable adapt`

**[P3] Specialist cross-links from international nav** — domestic tools reachable but mode context at destination could be clearer. `/impeccable clarify`

## Persona Red Flags

**Alex:** Nav parity restored; compare/round loading flicker remains.

**Jordan:** International query simplicity unexplained; compare init loading reads like breakage.

**Morgan:** Dossier heroes and share cards trustworthy; round hero mid-fetch screenshots still risky.

## Minor Observations

- 143 residual Loading strings in HTML/JS — mostly status banners and specialist placeholders
- International overview 3 cards vs domestic 4
- Archive auto-apply empty seasons = all seasons can surprise share-link recipients

## Questions to Consider

- Should every async surface adopt one static-until-hydrated contract?
- Is international query intentionally scoped down — and should the UI say so?
