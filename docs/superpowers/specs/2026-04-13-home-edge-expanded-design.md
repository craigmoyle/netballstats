# Home Court Advantage Expanded Design

## Summary

Expand **Home Court Advantage** from a high-level venue impact page into a two-layer analysis surface:

1. keep the current **overview** story focused on home win rate, margin, and whistle/control edge
2. add a second **detailed breakdown** layer for stat-specific venue effects and opposition-club impact

The approved direction is **option 2**:

- keep `/api/home-venue-impact` as the lightweight overview endpoint
- add a second endpoint for the deeper stat and opponent evidence
- extend the existing `/home-court-advantage/` page so it feels like a premium archive analysis desk rather than a stack of generic dashboard tables

The new page must support:

- **multi-year season selection** like the archive homepage
- deeper team-stat breakdowns, especially:
  - general play turnovers
  - held balls
  - contacts
  - obstructions
  - penalties
- a new **opposition club** lens showing which opponents are most affected overall and by stat

## Problem

The first Home Court Advantage release answers only the top-level question:

- does home improve win rate, margin, or the overall whistle?

It does **not** yet answer the richer questions the user wants to explore:

1. **Which detailed match-control stats move most at a venue?**
2. **Which opposition clubs are most affected at that venue?**
3. **How do those effects behave across multiple years, not just one season?**
4. **For clubs with more than one home floor, what specific stat families explain the difference between venues?**

Without that second layer, the page can identify that a venue has an edge, but not explain **what kind of edge it is**.

## Goals

1. Add **multi-year season filtering** to Home Court Advantage using the same mental model as the archive page.
2. Add a detailed **stat influence** layer for venue-specific swings in team stats.
3. Add an **opposition impact** layer with both:
   - overall opponent effect
   - stat-specific opponent effect
4. Preserve the current editorial framing and keep the page fast enough for real archive use.
5. Keep API validation, empty states, and data limits explicit and predictable.

## Non-goals

- No replacement of the existing Home Court Advantage overview section
- No creation of a separate second page for the deep-dive layer
- No generic “build your own BI tool” control sprawl
- No move away from the current amber/teal editorial visual system
- No speculative support for arbitrary stat keys without explicit mapping and validation

## Product framing

### Layer 1: overview

The current Home Court Advantage layer remains the **editorial frame**:

- how strong is the home edge in the selected slice?
- which arena or club-home pairing stands out first?
- how different is home from away at a glance?

### Layer 2: breakdown

The new second layer becomes the **evidence desk**:

- which detailed stats are driving the venue edge?
- which opposition clubs are most affected?
- how does one home floor differ from another for the same club?

The page should feel like:

- an archive analysis desk
- a sports almanac with evidence rails
- a data-journalism explainer with dense but readable tables

It should not feel like:

- a widget dashboard
- a betting surface
- a parameter-heavy analyst console

## Detailed stat scope

The first-class detailed stat groups for this iteration are:

1. **General play turnovers**
2. **Held balls**
3. **Contacts**
4. **Obstructions**
5. **Penalties**

### Canonical stat-key expectations

Implementation should map user-facing labels to canonical team stat keys where available:

- `generalPlayTurnovers`
- `contactPenalties`
- `obstructionPenalties`
- `penalties`

### Held balls note

`held balls` does not currently appear in the repo’s known stat-key mappings. Before implementation, confirm whether this exists as:

- a direct Champion Data stat key in `team_match_stats`
- a differently named stat/alias
- or a stat not currently present in the archive

If it is unavailable, the API and UI must handle that explicitly rather than silently dropping it.

## UX design

## Information hierarchy

1. Hero framing
2. Filter rail
3. Overview summary band
4. Venue spotlight
5. Venue ladder
6. Stat influence table
7. Opposition impact tables
8. Team-specific venue breakdown

### Hero and tone

Keep the current editorial hero but update the framing copy so the page clearly promises:

- venue effects on results
- venue effects on whistle/control stats
- opposition-specific impact

### Filter rail

Replace the single season dropdown with **archive-style multi-year season controls**.

Required controls:

1. **Seasons**: multi-select checkbox/chip group using the existing archive interaction model
2. **Team**: optional squad filter
3. **Min matches**: threshold for grouped rows
4. **Stat lens**: active detailed stat groups

Requirements:

- the multi-year pattern should feel consistent with the homepage archive controls
- active season scope should be easy to read in nearby meta copy
- controls must remain keyboard-friendly and mobile-safe
- the detailed-stat controls should be visible, not buried behind an advanced accordion

### Overview summary band

Keep the existing high-level summary:

- matches
- home win rate
- average home margin
- overall penalty/control edge

This remains the top-line story and should not be crowded by the deeper stat breakdowns.

### Venue spotlight

Keep the venue spotlight, but strengthen it into a short editorial explanation of:

- the selected venue
- sample size
- overall effect
- the most influential detailed stat if available

### Venue ladder

Retain the venue ladder as the primary navigation table for the page.

When a venue is selected, the deeper sections below should update in place:

- spotlight
- detailed stat influence
- opponent impact
- API link state

### New section: Stat Influence

Add a new table immediately below the venue ladder layer showing **how the selected venue shifts each tracked stat**.

Recommended columns:

1. Stat
2. Venue home average
3. Comparison baseline average
4. Lift / swing
5. Directional cue or rank

Baseline rules:

- **No team selected**: compare against the **league-wide home baseline**
- **Team selected**: compare the chosen team at this venue against the same team at its **other home venues**

### New section: Opposition Impact

Add a dedicated opponent layer with two related tables.

#### 1. Overall opposition effect

Shows which opposition clubs are most affected at the selected venue overall.

Recommended columns:

1. Opposition club
2. Matches
3. Home win rate or margin swing in this matchup context
4. Overall control / whistle swing

#### 2. Stat-specific opposition effect

Shows which opposition clubs are most affected for the active detailed stat lens.

Recommended columns:

1. Opposition club
2. Stat
3. Venue matchup average
4. Baseline matchup average
5. Lift / swing

This section is how the page answers questions like:

- which clubs give up more general play turnovers at Qudos Arena?
- which opponents see the biggest contact swing at a specific home floor?

### Team-specific venue breakdown

Retain the current team-home-venue comparison table, then add a deeper stat-specific layer beneath or beside it when a team is selected.

That extension should show:

- venue-by-venue stat influence for the selected club
- not just whether a floor lifts margin, but which stat families explain that lift

## API design

### Existing endpoint

Keep `/api/home-venue-impact` as the high-level overview endpoint.

It should continue returning the lightweight summary payload:

- `league_summary`
- `team_summary`
- `venue_summary`
- `team_venue_summary`

### New endpoint

Add a second endpoint for the detailed layer:

- `/api/home-venue-breakdown`

### Query parameters

The new endpoint should support:

- `season` optional single season
- `seasons` optional comma-separated season list, matching the existing `parse_season_filter()` pattern
- `team_id` optional squad filter
- `venue_name` optional selected venue
- `stat_groups` optional comma-separated detailed stat groups
- `min_matches` optional threshold
- `limit` optional row cap

### Response shape

The new endpoint should return separate sections rather than one giant flat table:

- `filters`
- `stat_summary`
- `opposition_summary_overall`
- `opposition_summary_by_stat`
- `team_venue_stat_summary`

#### `stat_summary`

One row per tracked stat for the selected venue and filter scope.

Expected fields:

- stat key
- stat label
- matches
- venue average
- baseline average
- lift
- preferred direction if relevant

#### `opposition_summary_overall`

One row per opposition club for the selected venue and filter scope.

Expected fields:

- opponent id
- opponent name
- matches
- win-rate impact
- margin impact
- control / whistle impact

#### `opposition_summary_by_stat`

One row per opposition club and stat pairing.

Expected fields:

- opponent id
- opponent name
- stat key
- stat label
- matches
- venue matchup average
- baseline matchup average
- lift

#### `team_venue_stat_summary`

Only meaningful when a team is selected.

Expected fields:

- team id
- team name
- venue name
- stat key
- stat label
- matches
- venue average
- other-home-venues average
- lift

## Baseline rules

### League-wide mode

When no team is selected:

- venue summary compares a venue to the **league home baseline**
- stat summary compares a venue to the **league home baseline**
- opposition sections compare the selected venue’s matchups to the broader baseline for that venue/stat context

### Team-specific mode

When a team is selected:

- venue summary compares the team at one home floor to the same team at its **other home venues**
- stat summary follows the same team-vs-other-home-venues rule
- opposition sections should stay team-specific, not revert to league-wide comparisons

## Validation and empty-state behavior

- invalid stat-group values should return explicit `400` responses
- valid filters with no results should return `200` with empty sections
- held-ball availability must be validated explicitly
- missing `team_match_stats` should degrade gracefully where possible, but stat-specific sections may need to return null/empty values instead of guessed numbers

## Performance constraints

The current overview endpoint already relies on `team_match_stats` and `matches` fast paths. The new detailed endpoint should preserve that posture.

Requirements:

1. push season and venue filters into the base match/stat scans as early as possible
2. aggregate from `team_match_stats` where available rather than from `team_period_stats` unless necessary
3. keep explicit `limit` caps on grouped outputs
4. avoid building one mega-query if separate summary queries are clearer and safer

The endpoint may use multiple bounded queries if that is the cleaner performance path.

## Copy and framing

The new copy should emphasize:

- **what kind of home edge** a venue creates
- **which clubs are bent most by that environment**
- **which stats explain the edge**

Copy should stay short and editorial, not parameter-dumpy.

## Implementation surfaces

Expected code surfaces:

- `home-court-advantage/index.html`
- `assets/home-court-advantage.js`
- `assets/styles.css`
- `api/plumber.R`
- `api/R/helpers.R`
- `scripts/test_api_regression.R`

Potentially:

- shared helper extensions in `assets/config.js` if the archive multi-season UI pattern is extracted or reused

## Testing requirements

Add regression coverage for:

1. multi-year requests using `seasons`
2. venue-specific detailed stat summaries
3. opponent overall summaries
4. opponent stat-specific summaries
5. team-selected venue stat comparisons
6. valid empty-result cases returning `200`
7. invalid stat-group input returning `400`
8. graceful behavior when requested stats are unavailable

Frontend checks should confirm:

- multi-year season state is reflected in URL and reloads correctly
- venue selection updates the detailed sections and API-link state
- team filtering changes baselines correctly
- stat lens changes the detailed tables and copy correctly
- empty, success, and error states remain readable and accessible

## Recommendation carried into planning

Implement the approved split:

- keep the current Home Court Advantage overview endpoint and summary-first story
- add one new detailed breakdown endpoint for stats and opposition effects
- extend the existing `/home-court-advantage/` page rather than creating a second page

This gives the archive the deeper venue-analysis layer the user wants without sacrificing clarity or turning Home Court Advantage into an unbounded query tool.
