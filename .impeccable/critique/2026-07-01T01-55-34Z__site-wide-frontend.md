---
target: site-wide frontend
total_score: 39
p0_count: 0
p1_count: 0
p2_count: 0
p3_count: 5
timestamp: 2026-07-01T01-55-34Z
slug: site-wide-frontend
---
Method: dual-agent (A: ecfffce3 · B: 1a4dce81)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Specialist surfaces gate hero/editorial chrome; status banner owns async |
| 2 | Match System / Real World | 4 | Points terminology, netball voice, Champion Data provenance intact |
| 3 | User Control and Freedom | 4 | Sticky filter rails, URL sync, citations, chart/table toggles |
| 4 | Consistency and Standards | 4 | International mirrors domestic archive pattern; nav + dossier hero gaps remain |
| 5 | Error Prevention | 3 | Query builder validation strong; sparse season combos still possible |
| 6 | Recognition Rather Than Recall | 4 | Reading-order intros, sticky summaries, More tools hints |
| 7 | Flexibility and Efficiency of Use | 4 | Shareable URLs, per-surface OG images, writer citations site-wide |
| 8 | Aesthetic and Minimalist Design | 4 | Hidden-until-ready reduces first-paint noise on query, nWAR, league composition |
| 9 | Error Recovery | 3 | Query errors robust; archive/player/specialist recovery still lighter |
| 10 | Help and Documentation | 4 | Query templates, nWAR methodology, filter hints, international disclaimer |
| **Total** | | **39/40** | **Near-excellent** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Detector: **0 findings** across 11 primary entry pages (clean run; nWAR em-dash warning no longer fires after hook ignore). Verifiers: meta + distill scripts pass. Dist confirms query/nWAR/league-composition gating hooks and Fraunces/Teko `@font-face` in share SVGs.

## Overall Impression

Run 8 confirms the polish pass landed. Query, nWAR, and league composition no longer flash loading chrome on first paint; share cards embed brand fonts. Score holds at **39/40** — the remaining gap is narrow P3 parity polish, not structural UX failure.

## What's Working

1. **Hidden-until-ready on specialist surfaces** — Query hero aside, nWAR hero, and league composition results defer paint until data arrives.
2. **Status-banner-first async UX** — Load narrative routes through status banners; editorial panels stay clean on first paint.
3. **Share-card brand alignment** — All share SVGs embed Fraunces/Teko; social previews can match in-app voice.

## Priority Issues

**[P3] International navigation parity gap** — International nav omits Round recap and More tools cluster. Fix: document slim mode or add scoped links. `/impeccable adapt`

**[P3] Domestic player dossier hero placeholders** — "Not yet verified" in domestic hero vs international row-hiding. Fix: align on row-hiding pattern. `/impeccable polish`

**[P3] Archive filter-desk loading hint** — Folded filter summaries still ship "Loading query options…" on both archive homes. Fix: static hint until meta hydrates. `/impeccable polish`

**[P3] Share international wordmark inconsistency** — `share-international.svg` may still diverge from Teko wordmark treatment on domestic cards. Fix: align title typography. `/impeccable polish`

**[P3] Query builder season select placeholder** — Builder modal still shows "Loading seasons…". Fix: neutral placeholder until populated. `/impeccable polish`

## Persona Red Flags

**Alex:** International depth matches domestic; mode switch still drops round-recap and specialist nav entry points.

**Jordan:** Specialist first-paint improved; filter desk below leaders on desktop unchanged.

**Morgan:** Citations trustworthy; share previews closer to brand; domestic "Not yet verified" still undermines dossier trust if visible.

## Minor Observations

- Round recap / round-preview hero meta still use loading strings outside this polish pass
- nWAR table shows headers with empty tbody during fetch — acceptable with status banner
- International overview retains 3 summary cards vs domestic 4

## Questions to Consider

- Should all folded async chrome adopt the static-until-hydrated contract?
- Is international nav intentionally slim — and should the UI say so?
- Should domestic player hero align fully on international row-hiding?
