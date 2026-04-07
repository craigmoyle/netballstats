# Editorial Almanac UX Spec

## Summary

Rework the archive homepage and player profile pages so they feel like one editorial system instead of adjacent utilities. The archive should become the **index of record** for discovery and comparison, while the player page should become a **dossier** that adds context, season shape, and career meaning.

This redesign prioritizes **visual polish first** without sacrificing trust, scanability, accessibility, or data density.

## Problem

The current experience is useful but visually fragmented:

- the archive reads as a collection of panels rather than a strongly ordered editorial surface
- player profiles feel table-heavy and utilitarian instead of contextual and premium
- archive and profile pages do not clearly communicate their relationship
- the visual system relies too much on repeated boxes and not enough on hierarchy, rhythm, and atmosphere

## Design direction

The chosen direction is **Editorial Almanac**.

It should feel like:

- a premium sports almanac
- an annotated archive rather than a SaaS dashboard
- a data-journalism surface with warmth, authority, and craft

It should not feel like:

- a betting product
- a generic BI dashboard
- a novelty microsite

## Core product framing

### Archive page

The archive is the **discovery layer**:

- find leaders, records, and trends
- filter the archive down to the right slice
- discover a player or team worth opening

### Player profile page

The player page is the **context layer**:

- explain the player beyond a leaderboard row
- show season progression and career landmarks
- make it easier to understand peaks, longevity, club context, and standout records

## Experience goals

1. Make the site feel cleaner and more premium at first glance.
2. Make archive results easier to scan and prioritize.
3. Make player pages feel richer without becoming cluttered.
4. Make the connection between archive discovery and profile context explicit.
5. Preserve dense, trustworthy stats presentation on both desktop and mobile.

## Non-goals

- No shift to a card-only mobile-app aesthetic.
- No removal of data density in favor of decoration.
- No abandonment of the current warm amber and teal identity.
- No second visual system for player pages that breaks cohesion with the archive.

## Visual principles

### 1. Tonal layering over borders

Use background tone shifts, nested surfaces, and spacing to separate sections. Avoid relying on thin lines and repeated boxed cards for structure.

### 2. Editorial hierarchy

Use the typography system to create strong rank:

- Teko-style display moments for major numbers, titles, and lead modules
- Fraunces-style editorial voice for framing copy and secondary explanation
- left-aligned composition by default

### 3. Marginalia and annotation

Introduce side notes, tags, and small context callouts that make the interface feel like an annotated almanac rather than a raw spreadsheet.

### 4. One memorable gesture

The most distinctive repeated pattern should be **dossier marginalia**:

- small side rails for archive context
- career notes or milestones on player pages
- short, high-signal annotations rather than long explanatory copy

### 5. Premium restraint

Visual polish should come from composition, typography, surface depth, and a few deliberate accents rather than heavy ornament everywhere.

## Shared visual system

### Color

- keep the existing warm amber and deep teal direction
- support both dark and light themes
- dark theme remains the hero presentation
- use amber for key emphasis and teal for structure/support

### Texture and depth

- subtle grain or paper-like texture is acceptable if it stays quiet
- surfaces should feel layered, not flat
- shadows and highlights should suggest stacked sheets or panels

### Spacing

- more deliberate whitespace around primary modules
- tighter internal spacing inside dense data tables
- stronger distinction between hero, control surface, and results

## Archive page redesign

## Information hierarchy

1. Hero framing
2. Filter hub
3. Primary result module
4. Secondary result module
5. Supporting records/trend modules

The page should stop presenting all result areas as equal-weight.

### Hero

The homepage hero should:

- frame the site as an editorial archive
- state data coverage honestly, including 2008 finals-only wording
- create a stronger emotional and visual first impression

### Filter hub

The archive controls should feel like a crafted **control desk**, not a generic form.

Requirements:

- seasons, stat pickers, and mode controls live in one visually unified module
- the filter area should feel like the anchor of the page
- active filter state should be easier to read at a glance
- controls should stay accessible and keyboard-friendly

### Results layout

The archive should adopt a clearer lead/support pattern:

- one primary leaderboard gets the strongest emphasis
- the second leaderboard becomes supporting context
- records or series modules act as sidebars or lower-priority rails

This emphasis can shift depending on mode, but the page should always tell the user where to look first.

### Player row treatment

Player rows should more clearly telegraph that they lead to a deeper dossier.

Possible treatments:

- more distinctive row hover/focus treatment
- subtle “open dossier” cue on desktop
- clearer clickable affordance around player names or lead cells

## Player profile redesign

## Information hierarchy

1. Player identity hero
2. Career pillars
3. Season ledger
4. Records and context
5. Supporting tables/detail

### Identity hero

The top of the page should feel more like a player dossier than a loading shell plus summary cards.

It should include:

- player name and era framing
- club tags
- concise subtitle that establishes role or archive context
- strong display of one or two defining numbers

### Career pillars

The first stat block should answer:

- how long did this player play?
- what are the big career totals?
- what is the headline reason to care?

This section should privilege the most meaningful stats, not simply the first available stats.

### Season ledger

The season area should become the core reading surface of the dossier.

Goals:

- make season-to-season progression easier to scan
- keep dense totals/averages available
- visually distinguish peaks, changes in club, and long-run consistency

The current totals table remains useful, but it should be wrapped in a stronger visual frame and supported by clearer context markers.

### Records and context

The player page should include a clearer “why this player matters” layer, for example:

- standout single-game records
- best seasons
- longevity markers
- archive rank context when available

## Archive ↔ profile relationship

The redesign must make the relationship explicit:

- the archive discovers
- the profile explains

That relationship should show up in:

- copy
- row/link affordances
- shared visual patterns
- repeated language such as dossier, archive, record, season ledger, or similar archive-minded framing

## Content and copy rules

- keep copy tight and editorial
- do not add explanatory clutter
- use netball terminology consistently
- preserve honest data framing, including coverage caveats like 2008 finals-only where relevant

## Accessibility and interaction requirements

- WCAG AA contrast remains mandatory
- keyboard focus must stay obvious
- reduced-motion support remains mandatory
- hover-only meaning is not sufficient
- responsive tables must remain usable and correctly labelled

## Implementation scope for first pass

### In scope

- homepage archive hero and hierarchy refresh
- archive filter hub visual redesign
- result module hierarchy improvements
- player hero and dossier framing
- season ledger visual redesign around the existing data
- shared styling tokens and section patterns

### Out of scope for first pass

- new analytics features
- new API endpoints solely for visual flourish
- major changes to query/parser behavior
- full information architecture rewrite across every page

## Success criteria

The redesign succeeds if:

1. the archive and player pages look clearly related
2. the homepage feels more distinctive and less dashboard-like
3. player pages feel easier to read in the first 15 seconds
4. important data remains fast to scan
5. visual styling is noticeably stronger without reducing credibility

## Planning notes

The first implementation plan should break the work into:

1. shared visual rules and section components
2. archive homepage hierarchy and control-desk treatment
3. player dossier hierarchy and season ledger treatment
4. responsive refinement and accessibility verification
