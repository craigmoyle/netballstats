---
target: site-wide frontend
total_score: 36
p0_count: 0
p1_count: 0
p2_count: 2
p3_count: 3
timestamp: 2026-06-30T05-48-46Z
slug: site-wide-frontend
---
Method: dual-agent (A: 6c7a096a · B: a1bdeb32)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Hero totals and citation hidden until load; editorial lead still loading-first |
| 2 | Match System / Real World | 4 | Points terminology and netball voice consistent |
| 3 | User Control and Freedom | 4 | URL-sync filters, debounced auto-apply, reset, copy citation |
| 4 | Consistency and Standards | 3 | Shared citation on key surfaces; international home filter UX diverges from domestic |
| 5 | Error Prevention | 3 | Query builder validates; auto-apply can fire sparse season combos |
| 6 | Recognition Rather Than Recall | 4 | More tools hints, collapsed filter desk, citation blocks |
| 7 | Flexibility and Efficiency | 4 | Domestic auto-apply, shareable URLs, citation on writer surfaces |
| 8 | Aesthetic and Minimalist Design | 4 | Editorial hierarchy, folded filter desk, hidden-until-ready hero band |
| 9 | Error Recovery | 3 | Query errors strong; archive/home recovery lighter |
| 10 | Help and Documentation | 4 | More tools subtitles; query examples excellent |
| **Total** | | **36/40** | **Good+** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Detector: **0 structural findings** on eight entry pages; one stylistic `em-dash-overuse` warning on nWAR (low confidence). Verifiers: meta + distill scripts pass; 17/17 pages ship og:image and Twitter cards; 12 domestic pages carry More tools hints.

## Overall Impression

Run 4 closes the domestic behavioural and provenance backlog from Run 3. Auto-apply filters, shared citation, hidden-until-ready hero band, social share meta, and More tools hints land as a coherent package. Remaining friction is cross-mode parity (international home), citation completeness (player profile), and polish (editorial lead loading copy, SVG share-card platform risk).

## What's Working

1. Domestic filter loop matches URL-sync promise — debounced auto-apply with Update now as escape hatch
2. Writer-grade provenance is a shared system on home, compare, query, round, and international home
3. External discoverability caught up — all 17 pages ship scope-aware og:image and Twitter cards

## Priority Issues

**[P2] International home still on the old filter contract** — Visible placeholders, exposed filter desk, Apply filters without auto-apply. Fix: port domestic Run 4 behaviour. `/impeccable adapt`

**[P2] Player profile lacks copy-ready citation** — Compare, query, and round have blocks; player dossier does not. Fix: shared citation on profile surfaces. `/impeccable harden`

**[P3] Editorial lead still loading-first on home** — Editorial panel shows loading copy and `--` before round-summary resolves. Fix: static almanac copy or hide until ready. `/impeccable polish`

**[P3] SVG share cards — platform risk** — SVG og:image may render inconsistently; fonts are system fallbacks not Fraunces/Teko. Fix: raster PNG fallback at build time. `/impeccable polish`

**[P3] Keyboard paths still absent for season chips** — Auto-apply helps mouse users; no keyboard traversal of season hub. Fix: focusable chip pattern. `/impeccable harden`

## Persona Red Flags

**Alex:** International mode reintroduces Apply-gated friction; no keyboard path through season chips; filter desk below leaderboards unchanged.

**Jordan:** International overview still shows placeholder dashes on load; More tools hints help specialist labels.

**Morgan:** Player dossier still lacks one-click citation; dense citation strings fine for footnotes, heavy for social.

## Minor Observations

- Round recap summary band and citation correctly start hidden
- Compare citation gates on two or more entities
- International nav correctly omits More tools
- Theme toggle Night desk hydration remains resolved

## Questions to Consider

- Should international home get a straight port of domestic auto-apply and collapsed filter desk?
- Is player profile the last Morgan surface, or do specialist tools need citation too?
- Does Update now still earn screen space now that filters auto-apply?
- Are SVG OG images sufficient, or do share previews need raster fallbacks?
