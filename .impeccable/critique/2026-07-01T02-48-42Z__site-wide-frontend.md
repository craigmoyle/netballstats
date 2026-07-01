---
target: site-wide frontend
total_score: 39
p0_count: 0
p1_count: 0
p2_count: 0
p3_count: 5
timestamp: 2026-07-01T02-48-42Z
slug: site-wide-frontend
---
Method: dual-agent (A: e08510c6 · B: 2a353b3c)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Status banners own async; compare/round/deferred charts use static shells |
| 2 | Match System / Real World | 4 | Points terminology, netball voice, Champion Data provenance intact |
| 3 | User Control and Freedom | 4 | Sticky filter rails, URL sync, citations, chart/table toggles |
| 4 | Consistency and Standards | 4 | Run 10 closes compare/round/chart loading contract vs query pattern |
| 5 | Error Prevention | 3 | Query builder strong; empty-season = all-seasons share-link edge remains |
| 6 | Recognition Rather Than Recall | 4 | Static filter hints, reading-order intros, More tools hints |
| 7 | Flexibility and Efficiency of Use | 4 | Shareable URLs, per-surface OG images, writer citations site-wide |
| 8 | Aesthetic and Minimalist Design | 4 | Hidden-until-ready heroes; no loading verbs in editorial surfaces |
| 9 | Error Recovery | 3 | Query error banner robust; compare/round recovery lighter than query |
| 10 | Help and Documentation | 4 | Query templates, nWAR methodology, filter hints |
| **Total** | | **39/40** | **Near-excellent** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Run 10 removes the last credibility tells on compare init, round hero, and deferred chart shells.

**Deterministic scan:** **0 findings** on 12 primary HTML pages + `assets/styles.css`. Verifiers pass (`verify_page_meta.mjs`, `verify_distill_home_round.mjs`).

**Browser overlays:** Not run this session (no live-server injection attempted).

## Overall Impression

Run 10 closes the Run 9 P3 loading-copy backlog on compare, round recap, and deferred archive charts. The product now applies one consistent contract: **status banner = async progress, content shell = static instruction or empty structure**. The score holds at **39/40** because the remaining point sits on error prevention/recovery (H5/H9), not loading polish.

## What's Working

1. **Static-until-hydrated results** — Compare opens with `promptMessage()`; round hero meta stays hidden until `renderSummary()`; deferred charts say "Switch to chart…" not "Loading trend…"
2. **Cross-mode parity** — International nav, dossier row-hiding, share Teko wordmarks, filter-desk hints all hold from Runs 7–9
3. **Evidence-first editorial voice** — Citations, reading-order intros, and status-banner kickers read as one almanac system

## Priority Issues

**[P3] Player season-ledger loading copy** — `#season-ledger-notes` still ships "Loading season context…" in player HTML (body hidden mitigates flash). `/impeccable polish`

**[P3] International query scope** — Thinner than domestic query without explicit coverage copy. `/impeccable adapt`

**[P3] Empty seasons = all seasons** — Share-link recipients can get unintended full-archive results. `/impeccable clarify`

**[P3] Cross-mode specialist links** — International More tools land on domestic surfaces without mode context. `/impeccable clarify`

**[P3] Compare error recovery** — Meta failure message exists but lacks query's structured error banner pattern. `/impeccable harden`

## Persona Red Flags

**Alex:** Compare/round flicker fixed; season checkbox walls and deferred chart toggles still slow repeat workflows.

**Jordan:** Compare empty state is instructional, not broken; international query after domestic feels like a different, emptier product.

**Morgan:** Round hero hidden until load protects screenshots; player season-ledger HTML still carries loading verb if body gating fails.

## Minor Observations

- Residual Loading strings in scoreflow, home-court-advantage, players directories, round-preview (~29 HTML / ~90 JS lines, mostly banners)
- International overview 3 cards vs domestic 4
- `ARCHIVE_LOADING_MESSAGES` still rotates "Loading season context…" in banner only (acceptable)

## Questions to Consider

- Should international query stay minimal with explicit scope copy instead of mirroring domestic builder?
- Is hidden-until-ready the permanent hero contract, accepting unsharable mid-load round labels?
- Should archive URLs with no seasons selected require explicit "all seasons" confirmation?
