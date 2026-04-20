# League Composition Average Games Design

## Summary

Clarify that the existing league-composition experience metric is measured in **seasons**, and add a second summary metric for **average games played** across all players who appeared in each season.

The approved direction is to keep this change focused on the **season-by-season summary rows**:

1. relabel the current experience number so it explicitly reads as seasons
2. add an average games-played number beside the existing season summary metrics
3. leave the lead copy unchanged

## Problem

The current summary rows show `experience 6.52`, which is ambiguous. In the data build this value is `average_experience_seasons`, but the UI does not say so explicitly.

The page also lacks an adjacent participation metric. Adding average games played provides a clearer companion signal for how established and how frequently used a season's player pool was.

## Goals

1. Make it explicit that the existing experience metric measures **seasons of experience**.
2. Add **average games played** for all players who appeared in each season.
3. Keep the change small, data-driven, and consistent with the existing league-composition summary endpoint.
4. Preserve the current editorial tone and compact row format.

## Non-goals

- no change to the league-composition lead copy
- no change to the debut-band panel
- no change to the player-profile identity block
- no new filters, charts, or additional league-composition panels

## Approved scope

### Population

`average_games_played` should be calculated across **all players who appeared in that season**.

This matches the scope already used by the summary row metrics such as average player age and average seasons of experience.

### Display location

Show the new metric in the **season-by-season summary rows only**.

Do not add it to the lead copy.

## Design

### Data model

Extend the maintained `league_composition_summary` table with one new numeric field:

- `average_games_played`

This should represent the average number of matches played in that season by players who appeared in that season.

Recommended calculation:

1. derive one row per `player_id + season`
2. count distinct matches played for each player in that season
3. average those per-player counts by season
4. round to two decimals to match the existing summary metrics

### API shape

Keep using the existing `/league-composition-summary` endpoint.

The response shape stays the same except that each summary row now also includes:

- `average_games_played`

No new endpoint is needed.

### UI copy

Update the season-by-season summary row copy from:

- `experience {value}`

to:

- `average seasons of experience {value}`

and append:

- `average games played {value}`

Recommended final row pattern:

`{season}: debut age {value}, league age {value}, average seasons of experience {value}, average games played {value}, import share {value}`

This keeps the row compact while removing ambiguity.

### Missing-data behavior

If a season cannot produce a games average, render `—` using the same fallback style already used for other summary metrics.

The addition must not break seasons with partial age or import coverage.

## Testing

Update existing checks rather than adding a new test harness:

1. extend `scripts/test_player_reference_data.R` to assert that `league_composition_summary` includes `average_games_played`
2. verify the summary build still behaves for empty and partial fixtures
3. extend `scripts/test_api_regression.R` so the summary endpoint expects the new field in returned rows
4. keep the existing frontend syntax/build validation path unchanged

## Risks and mitigations

### Ambiguity between games and seasons

Risk: users may still read the experience number as games if the row stays too compressed.

Mitigation: spell the metric out as **average seasons of experience** rather than just `experience`.

### Inconsistent denominator

Risk: average games could be misread as a roster-wide or squad-listed value.

Mitigation: define it from players who actually appeared in that season, matching the summary table's existing player population.

### Over-expanding the panel

Risk: the row could become too dense.

Mitigation: keep the change to one extra metric and one clearer label, with no extra explanatory block in this iteration.
