# Scoreflow Surfacing Design

## Summary

Introduce scoreflow as a new editorial archive pillar with:

1. a **dedicated `/scoreflow/` page** as the primary destination
2. a **homepage teaser band** that spotlights a few high-interest records and deep-links into the matching scoreflow slice

The first release should answer a tight set of questions well:

- which games produced the strongest scoreflow stories?
- which teams most often control games, recover from trouble, or live under pressure?
- what do the new scoreflow labels mean in plain English?

The approved direction is to treat scoreflow like Home Court Advantage: a distinct feature surface with a clear editorial frame, explicit definitions, and enough structure to grow later without crowding the archive homepage.

## Problem

The scoreflow backend now supports meaningful game- and team-level lead-state analytics, but the product has no clear surface for them.

Without a dedicated UX, the new capability risks becoming:

- invisible if it only exists in the API
- cramped if it is pushed directly into the homepage results stack
- fragmented if it is scattered across round recap, team pages, and the homepage without a primary destination

The product needs a scoreflow surface that preserves the archive's editorial reading order while still answering the kinds of questions users actually ask, such as:

1. which team led for most of the match?
2. what were the biggest comebacks?
3. which teams win despite trailing for most of the game?
4. which clubs most often control matches from in front?

## Goals

1. Make scoreflow discoverable from the archive homepage.
2. Give scoreflow a dedicated destination that can support richer analysis than a teaser module.
3. Lead with the most intuitive and high-interest scoreflow questions.
4. Keep the feature editorial, evidence-led, and easy to scan.
5. Preserve explicit definitions, empty states, and data-coverage notes so the feature feels trustworthy.

## Non-goals

- no attempt to expose every possible scoreflow-derived metric in v1
- no homepage redesign that displaces the archive reading order
- no replacement of round recap or team pages as their own products
- no analyst-console sprawl with excessive controls
- no client-side recreation of ranking logic that already belongs in the API

## Product framing

### Primary model

Scoreflow becomes a **destination feature** with a **homepage lead-in**.

- the homepage introduces scoreflow
- the dedicated page carries the real analysis
- other surfaces may reference scoreflow later, but do not become its primary home in v1

### Editorial stance

The scoreflow feature should feel like:

- a momentum archive
- an editorial analysis desk
- a sports almanac for control, comeback, and pressure stories

It should not feel like:

- a betting-style live tracker
- a generic dashboard
- a niche metrics lab that requires specialist knowledge before it becomes useful

## Information architecture

### Homepage teaser

Add a single scoreflow teaser band to the archive homepage:

- **placement:** after **Latest archive lead** and before **Choose the slice**
- **role:** introduce scoreflow without overloading the homepage
- **structure:** three featured cards plus a clear CTA into `/scoreflow/`

Recommended teaser cards:

1. **Biggest comeback**
2. **Won trailing most**
3. **Most time in front**

These three cards balance drama, resilience, and control.

The teaser must stay light:

- no deep filter desk
- no multiple tables
- no attempt to duplicate the dedicated page

### Dedicated page

Create a new top-level destination at **`/scoreflow/`**.

Recommended page structure:

1. **Hero**
   - short editorial framing
   - 2-3 summary numbers
   - one-line explanation of what scoreflow measures
2. **Filter desk**
   - seasons
   - optional team
   - optional opponent
   - scenario
   - ranking metric
3. **Lead module**
   - game-record leaderboard
4. **Supporting rail**
   - team summary / team tendency rankings
5. **Definitions and data notes**
   - plain-English glossary
   - coverage / limitations note where needed

The page should lead with **games first**, then use team aggregates as supporting context.

## Content model

### Homepage teaser questions

The teaser answers fast-entry questions:

1. what is the biggest comeback in the current archive frame?
2. which team won despite trailing for most of the game?
3. which team or game shows the strongest control from in front?

Each card should link into the exact scoreflow slice that produced it.

### Dedicated page questions

The dedicated page should answer three layers of questions:

#### 1. Lead question

**Which games are the strongest scoreflow stories?**

This is the primary job of the page and should be driven by scenario and metric controls.

#### 2. Supporting question

**Which teams live in those scripts most often?**

This is where the team summary rail adds pattern recognition and repeatability.

#### 3. Trust question

**What do these labels mean?**

Definitions must remain on the page so users do not need outside documentation to interpret the metrics.

## First-release metric groups

### Control

- most time in front
- games led most
- largest lead

### Comeback

- biggest comeback win
- won trailing most
- comeback wins

### Pressure / chaos

- deepest deficit
- most time trailing
- games trailed most

### Hold for later

Do not front-load more niche or difficult-to-explain scoreflow cuts in the first release. The feature should establish a strong mental model before expanding.

## Behavior and guardrails

### Homepage behavior

- the homepage teaser stays fixed and lightweight
- it inherits the active archive frame where appropriate
- it does not expose a second deep control surface

### Dedicated page controls

Keep the first release tighter than the homepage archive desk:

- seasons
- optional team
- optional opponent
- scenario
- ranking metric

No extra control sprawl unless a future release proves the need.

### Default landing state

The page should open on a dramatic scoreflow story, not a neutral aggregate.

Recommended default:

- broad team scope
- latest three seasons with scoreflow coverage
- scenario = all
- rank by either **biggest comeback** or **won trailing most**

### Empty and sparse states

When the selected slice has poor or missing scoreflow coverage:

- say that directly
- keep definitions visible
- avoid blank tables
- avoid dash-filled output that looks like partial insight

### Definitions

Keep plain-English definitions on the page for labels such as:

- won trailing most
- trailing share
- comeback deficit
- games led most
- games trailed most

The goal is comprehension without jargon.

## Implementation shape

### Frontend boundaries

1. **Dedicated page module**
   - create a page-specific frontend module for `/scoreflow/`
   - follow the feature-page pattern used elsewhere in the repo rather than bloating `assets/app.js`
2. **Homepage teaser module**
   - small, isolated fetch/render block on the homepage
   - responsible only for rendering the three featured cards and CTA
3. **Glossary copy**
   - frontend-owned so it can remain editorial, stable, and intentionally phrased

### Backend boundaries

Use the existing scoreflow endpoints as the core data sources.

If the homepage teaser needs a smaller or curated payload, prefer one of:

- a constrained API mode on an existing endpoint
- a thin derived endpoint that returns featured records only

Do not make the homepage assemble its own ranking logic client-side.

### Data flow

1. homepage teaser requests a curated featured-record slice
2. dedicated scoreflow page requests:
   - game-record leaderboard data
   - team-summary supporting data
3. homepage cards deep-link into `/scoreflow/` with matching query params
4. definitions remain visible in the page shell regardless of the active data slice

### Error handling

Follow the repo's explicit UX style:

- clear status or error banners
- explicit empty-state copy
- no silent fallback to misleading placeholders
- no hiding scoreflow scarcity behind generic "no results" language

## Validation and testing

### Frontend

- syntax-check the dedicated page module and any touched homepage module
- run the existing static build

### Backend

- run the existing R parse checks if endpoint behavior changes
- update regression coverage only when the scoreflow endpoint contract changes

### Product-level checks

Confirm that:

1. homepage teaser cards and scoreflow-page rankings agree for the same query params
2. homepage deep links land on the expected scenario and metric view
3. sparse-data slices render explanation, not confusion

## Rollout guidance

Phase 1 should ship:

1. homepage teaser band
2. dedicated `/scoreflow/` page
3. core game-record and team-summary views
4. definitions and data notes

Later releases can decide whether scoreflow should also surface in:

- round recap callouts
- team-level profile modules
- additional story packages or editorial leads

## Recommendation

Ship scoreflow as a **new archive destination with a homepage lead-in**.

That gives the feature:

- enough prominence to matter
- enough space to explain itself
- enough modularity to grow into a durable archive surface

It also keeps the homepage editorial and readable, which matches the product's broader design intent.
