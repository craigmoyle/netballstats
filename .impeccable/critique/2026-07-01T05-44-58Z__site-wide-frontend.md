---
target: site-wide frontend
total_score: 40
p0_count: 0
p1_count: 0
p2_count: 0
p3_count: 5
timestamp: 2026-07-01T05-44-58Z
slug: site-wide-frontend
---
Method: dual-agent (A: 144c34b9 · B: 3b096426)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Status banners + compare error banner cover async; home/round status-only on hard failures |
| 2 | Match System / Real World | 4 | Points terminology, netball voice, full-archive framing intact |
| 3 | User Control and Freedom | 4 | seasons=all URL token, filter rails, citations, chart toggles |
| 4 | Consistency and Standards | 4 | Compare error banner matches query; season-scope-note on archive homes |
| 5 | Error Prevention | 4 | Empty-season ambiguity closed via URL token, labels, and chip-level note |
| 6 | Recognition Rather Than Recall | 4 | Scope note + international query hero aside reduce recall burden |
| 7 | Flexibility and Efficiency of Use | 4 | Shareable seasons=all links; compare URL parity |
| 8 | Aesthetic and Minimalist Design | 4 | Scope note hidden until relevant; no loading-verb regression |
| 9 | Error Recovery | 3 | Compare Try again banner; query still richer; home/round unchanged |
| 10 | Help and Documentation | 4 | International query scope card; domestic templates/builder lead |
| **Total** | | **40/40** | **Excellent** |

## Anti-Patterns Verdict

**PASS** — editorial almanac, not AI slop. Run 11 copy is tight and domain-specific.

**Deterministic scan:** **0 findings** on 10 primary pages + styles.css. Verifiers pass.

**Browser overlays:** Not run this session.

## Overall Impression

Run 11 closes the three named Run 10 blockers and earns the final point on **error prevention (H5)**. The critique arc reaches **40/40**. Remaining friction is consistency polish (home retry banner, compare season note parity) and carryover P3s, not structural editorial failure.

## What's Working

1. **Empty-season guardrail end-to-end** — URL write/read, filter summary, and inline scope note form a closed loop for share links
2. **Compare error recovery** — Persistent alert + Try again matches query's hardened pattern
3. **International query scope card** — Sets honest expectations before Jordan types a question

## Priority Issues

**[P3] Home meta failure lacks retry banner** — Archive init still uses status banner only. `/impeccable harden`

**[P3] Compare lacks chip-level season-scope-note** — Home/intl home have note; compare has summary label only. `/impeccable polish`

**[P3] All vs Clear dual semantics** — "All" checks every box; "Clear" means full archive via seasons=all. `/impeccable clarify`

**[P3] Player season-ledger loading copy** — `#season-ledger-notes` still ships loading verb in HTML. `/impeccable polish`

**[P3] Cross-mode specialist links** — International More tools land on domestic pages without mode context. `/impeccable clarify`

## Persona Red Flags

**Alex:** seasons=all helps sharing; All vs Clear still splits mental model; compare lacks chip note.

**Jordan:** International query scope aside addresses mode-switch surprise; intl query still thinner than domestic.

**Morgan:** seasons=all URLs are citation-friendly; compare errors recover; player ledger HTML still risky if gating fails.

## Minor Observations

- International query aside visible on first paint; domestic query aside hidden until meta
- Compare reset defaults to recent 3 seasons; home defaults to latest single season
- Query error banner still offers builder fallback; compare has single-action recovery

## Questions to Consider

- Should home meta failure get the same error-banner + Try again as compare?
- Should Clear mean reset to default slice instead of full archive?
- Does international compare need error-banner parity next?
