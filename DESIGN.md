---
name: Super Netball Stats
description: The trusted historical archive for Super Netball statistics, season comparisons, and player context.
colors:
  ink-navy: "#091117"
  ink-navy-mid: "#0b141b"
  ink-navy-soft: "#111c25"
  panel-solid: "#111b24"
  panel-alt: "#162531"
  paper-warm: "#f4efe5"
  faded-byline: "#cbc0b4"
  keepers-amber: "#f0c67e"
  keepers-amber-strong: "#ffe0a5"
  recorders-teal: "#79d8d0"
  danger-soft: "#ff9e9e"
  success-soft: "#a5efc1"
  text-on-amber: "#20160d"
  border-base: "#eed29c"
typography:
  display:
    fontFamily: "'Teko', sans-serif"
    fontWeight: 600
    fontSize: "clamp(3.5rem, 7.8vw, 7rem)"
    lineHeight: "0.88"
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "'Fraunces', Georgia, serif"
    fontWeight: 600
    fontSize: "clamp(1.5rem, 2.5vw, 2.1rem)"
    lineHeight: "1.12"
    letterSpacing: "0.01em"
  body:
    fontFamily: "'Fraunces', Georgia, serif"
    fontWeight: 400
    fontSize: "1rem"
    lineHeight: "1.68"
  label:
    fontFamily: "'Fraunces', Georgia, serif"
    fontWeight: 600
    fontSize: "0.8125rem"
    letterSpacing: "0.12em"
rounded:
  pill: "999px"
  card: "1.125rem"
  panel: "1.375rem"
spacing:
  2xs: "clamp(0.45rem, 0.6vw, 0.65rem)"
  xs: "clamp(0.75rem, 0.9vw, 0.95rem)"
  sm: "clamp(1rem, 1.2vw, 1.25rem)"
  md: "clamp(1.3rem, 1.8vw, 1.8rem)"
  lg: "clamp(1.8rem, 2.8vw, 2.6rem)"
  xl: "clamp(2.5rem, 4vw, 4rem)"
components:
  button-primary:
    backgroundColor: "{colors.keepers-amber}"
    textColor: "{colors.text-on-amber}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.3rem"
  button-primary-hover:
    backgroundColor: "{colors.keepers-amber-strong}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.paper-warm}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 1.3rem"
  input-field:
    backgroundColor: "#162531"
    textColor: "{colors.paper-warm}"
    rounded: "{rounded.card}"
    padding: "0.9rem 0.95rem"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.faded-byline}"
    rounded: "{rounded.pill}"
    padding: "0.72rem 0.95rem"
  nav-link-active:
    textColor: "{colors.keepers-amber-strong}"
    rounded: "{rounded.pill}"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.faded-byline}"
    rounded: "{rounded.pill}"
    padding: "0.45rem 0.8rem"
---

# Design System: Super Netball Stats

## 1. Overview

**Creative North Star: "The Data Room After Dark"**

The system lives in a deliberate evening register: deep ink-navy surfaces that read like a room where analysts work after the crowd goes home. Keeper's Amber holds the corner like a good lamp, warm and decisive. Recorder's Blue-Green sits at the whiteboard edge, cool and precise. Together they define a space that feels focused and inhabited rather than assembled from a component library.

The product is a serious reference tool. Its aesthetic is a direct refusal of the visual language it could have borrowed: SaaS dashboards with their gradient-washed KPI tiles, gambling-adjacent sports sites with neon on black and animated fixtures, and generic "dark mode" tools that reach for purple and glow by default. What it reaches toward instead is the best data journalism and sports almanacs — composure under density, evidence before flourish, typography doing weight-bearing work rather than decorative lifting.

The system scales from homepage editorial sweep to table-heavy comparison pages without losing coherence. Hierarchy is established through size and weight contrast, never decoration. Every spacing step is `clamp()`-based so the proportions travel from 375px to 1440px with integrity. Dark is the primary theme; the light theme is a direct inversion that preserves every token relationship.

**Key Characteristics:**
- Dark-first; tonal panel layering as the primary depth signal
- Two accents (amber primary, teal secondary) held at high rarity, never background noise
- `Fraunces` owns every word; `Teko` owns every large number
- Pill-shaped interactive elements with quiet resting states that respond, not perform
- No side-stripe borders, no gradient text, no glassmorphism

## 2. Colors: The Ink and Amber Palette

Two accents over a cool-neutral editorial ground. Both tones lean warm; the amber is authority, the teal is intelligence.

### Primary
- **Keeper's Amber** (`#f0c67e` dark / `#b87020` light): The warm gold that signs every call to action. Used for primary buttons, active navigation states, kicker labels on secondary panels, and the filter submit action. It reads as print-age editorial gold — confident without hype. In light mode, it shifts to a richer ochre to maintain contrast against the warm paper ground.

### Secondary
- **Recorder's Blue-Green** (`#79d8d0` dark / `#1a8a7a` light): The analytic counterpoint. Where Keeper's Amber signals decision and commitment, this teal signals attention and precision. Used for loading states, eyebrow/kicker text on primary panels, active filter outlines, and chart series 2. In light mode it deepens to a forest teal.

### Neutral (dark theme)
- **Ink Well** (`#091117`): Page ground. Deep navy with a faint blue undercurrent that keeps it from deadening. Never pure black.
- **Ink Well Mid** (`#0b141b`): Gradient middle ground in the page background.
- **Ink Well Soft** (`#111c25`): Page background at its brightest step.
- **Deep Slate** (`#111b24`): The raised panel surface. One notch brighter than the ground; where content lives.
- **Panel Alt** (`#162531`): Further raised, for nested or secondary containers.
- **Paper Proof** (`#f4efe5`): Primary text. Warm off-white, slightly cream — aged-quality newsprint, not clinical bright white.
- **Faded Byline** (`#cbc0b4`): Secondary text. Supporting copy, muted labels, captions, filter summaries.
- **Border Base** (`#eed29c` at ~16–35% opacity): The amber-tinted border that separates surfaces. Derived as `rgba(238, 210, 156, 0.16)` (subtle) and `0.35` (strong).

### Neutral (light theme)
- **Warm Paper** (`#f7f3ed`): Ground. A warm cream tone, not clinical white.
- **Dark Walnut** (`#1a1006`): Primary text. Deeply warm brown.
- **Warm Brown** (`#6b5c40`): Muted secondary text.

### Semantic
- **Danger Soft** (`#ff9e9e` dark / `#b02020` light): Error states, invalid inputs.
- **Success Soft** (`#a5efc1` dark / `#1a7040` light): Success and confirmation states.

### Named Rules
**The Restraint Rule.** Keeper's Amber and Recorder's Blue-Green appear on ≤10% of any given screen in their full-saturation form. Their rarity is what gives them authority. Use them on borders, small labels, and interactive states — not as backgrounds.

**The Dark-Always Rule.** Never use `#000000` or `#ffffff`. Every neutral leans toward the amber warmth of the brand hue with a chroma value of 0.005–0.01 minimum.

## 3. Typography: The Ledger Pairing

**Display Font:** Teko (600 weight, condensed sans-serif)
**Body Font:** Fraunces (400–700 weight, optical-size variable serif, with Georgia fallback)
**Label/Mono:** Fraunces for all UI labels; `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` for code.

**Character:** `Teko` is number-weight, a condensed shouting font that earns its volume by appearing only at scale. `Fraunces` is editorial intelligence — a warmly-voiced serif that reads crisply at small sizes and with authority at large ones. The pairing avoids the hollow sports-site cliché of using one bold font for everything; instead, one font owns words, the other owns numbers.

### Hierarchy
- **Display** (Teko 600, `clamp(3.5rem, 7.8vw, 7rem)`, line-height 0.88, letter-spacing -0.015em): Hero page titles. The only context where Teko appears at headline weight. Subpages can scale tighter: `clamp(3.5rem, 10vw, 9.5rem)` when the shell is narrower.
- **Headline** (Fraunces 600, `clamp(1.5rem, 2.5vw, 2.1rem)`, line-height 1.12, letter-spacing 0.01em): Panel and section headings. Max-width 18ch to avoid over-long headings in wide columns.
- **Title** (Fraunces 600, `clamp(1.45rem, 2.3vw, 2rem)`, line-height 1.28): Secondary section headings, editorial leads.
- **Body** (Fraunces 400, 1rem / 1.0625rem for lead copy, line-height 1.68): All body copy. Max-width 54–65ch for readable paragraph measure.
- **Label** (Fraunces 600, 0.8125rem, letter-spacing 0.12em, uppercase): Kickers, eyebrows, table headers, filter labels. The uppercase kicker is the primary way the product signals section hierarchy without adding a headline.

### Named Rules
**The Fraunces Rule.** Every word in the product is set in Fraunces. Every large number is Teko. Never use Teko for text copy, and never use another font for labels or headings.

**The Kicker Convention.** Eyebrows and section kickers are always: Fraunces 600, 0.8125rem, 0.12em letter-spacing, uppercase, Recorder's Blue-Green on primary panels, Keeper's Amber on secondary contexts.

## 4. Elevation: Tonal Ground, Structural Shadow

The system uses a two-layer depth model. **Primary depth is tonal**: panel backgrounds are `color-mix()` gradients that step from Ink Well ground through increasing lightness. Content surfaces feel raised not because they cast shadows but because they hold more light. **Secondary depth is structural shadow**: a large, soft drop shadow separates major panels from the ground and provides physical grounding. Hover states add a lift shadow as interaction feedback.

Dark theme panel shadow: `0 30px 60px rgba(0, 0, 0, 0.28)` — atmospheric, deep, creates strong Z separation.
Light theme panel shadow: `0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.05)` — subtle daylit lift.
Button hover lift: `0 18px 24px rgba(0, 0, 0, 0.22)` combined with `translateY(-2px)` — the button rises to meet the cursor.

### Shadow Vocabulary
- **Panel** (`0 30px 60px rgba(0,0,0,0.28)` dark / `0 4px 24px rgba(0,0,0,0.08)` light): Panels and hero surfaces. Used on every `.panel` and `.hero-panel` with a card treatment.
- **Button lift** (`0 18px 24px rgba(0,0,0,0.22)` + `translateY(-2px)`): Applied on hover. Signals that the element is interactive and responsive.
- **Aside card** (`0 18px 34px rgba(0,0,0,0.2)`): Hero aside cards. Slightly smaller than panel shadow to read as a contained sub-element.

### Named Rules
**The Layered Ground Rule.** Shadows signal structural separation or interaction response. A panel gets a shadow because it is a raised surface. A button gets a lift shadow on hover because it is responding to a cursor. Nothing else earns a shadow by default.

## 5. Components

Components disappear into the data. Resting states are quiet; transitions are fast and ease-out. The focus ring is a 2px amber outline so keyboard users always know where they are.

### Buttons
- **Shape:** Full pill (border-radius: 999px) for primary and ghost; all interactive elements in the system share this pill language.
- **Primary:** Keeper's Amber gradient background (`linear-gradient(135deg, #f0c67e, #ffe0a5)`), text-on-amber (`#20160d`) at Fraunces 600 0.9375rem. Padding `0.95rem 1.3rem`. Hover: `brightness(1.03)` filter + lift shadow + `translateY(-2px)`. Active: `translateY(1px) scale(0.99)`. Disabled: opacity 0.55, no pointer events.
- **Ghost:** Transparent background, Paper Proof text, 1px `color-mix(in srgb, var(--text) 14%, transparent)` border. Hover: very light text-tinted background. Used for secondary actions where the accent should not dominate.
- **Small:** Reduced padding (`0.75rem 0.95rem`), `min-block-size: 44px` to maintain touch target, 0.875rem font size.

### Season Chips / Filter Choice Pills
Used as multi-select filter toggles for year/season selection.
- **Style:** Pill (999px), 1px `color-mix(in srgb, var(--text) 12%, transparent)` border, `color-mix(in srgb, var(--text) 4%, transparent)` background, muted text.
- **Selected:** Keeper's Amber border and background tint, amber text.
- **Focus:** 2px amber outline, 3px offset.

### Tags
Categorical labels on directory cards and player entries.
- **Style:** Pill (999px), very subtle text-tinted fill (4% opacity), 8% opacity border, Faded Byline text, 0.9rem font size, min-height 2.1rem.
- **Card hover:** Amber-tinted border and fill (`color-mix(in srgb, var(--accent) 24/8%, ...)`), text shifts to Paper Proof with a 1px upward translate.

### Panels
The primary content surface.
- **Corner Style:** 1.375rem (`--radius-panel`)
- **Background:** `var(--panel-solid)` — Deep Slate `#111b24`
- **Shadow:** Structural panel shadow
- **Border:** 1px `rgba(238, 210, 156, 0.16)` (amber-tinted, very subtle)
- **Internal Padding:** `var(--space-md)` (`clamp(1.3rem, 1.8vw, 1.8rem)`)
- **Specialty variants:** Compare-page panels, home-edge panels, and changelog panels each use a bespoke gradient overlay (amber/teal at 7–18% opacity) to give major pages their own emphasis. This is intentional distinction within the shared system.

### Inputs and Selects
- **Style:** 1px text-tinted border, near-opaque dark fill (`rgba(22, 37, 49, 0.9)`), 1.125rem radius. Padding `0.9rem 0.95rem`. Placeholder at 60% Paper Proof opacity.
- **Focus:** 2px `rgba(240, 198, 126, 0.8)` outline, 3px offset — the Keeper's Amber focus ring is consistent across all focusable elements.
- **Error:** Border shifts to Danger Soft via status-banner tone system.

### Navigation
- **Style:** Horizontal scrolling pill list, `overflow-x: auto; scrollbar-width: none` on mid-screen widths (641–1240px) to handle many items without wrapping.
- **Default:** Faded Byline text, near-transparent fill, subtle text-tinted border.
- **Hover:** Slightly brighter fill, Paper Proof text.
- **Active:** Amber tinted fill (`color-mix(in srgb, var(--accent) 18%, transparent)`), amber-strong border, amber-strong text.
- **Touch target:** `min-block-size: 44px` on all nav links.
- **Typography:** Fraunces 600, 0.875rem, letter-spacing 0.01em.

### Status Banner (Signature Component)
A full-width contextual feedback bar for loading, success, and error states.
- **Default/Loading:** Panel-tinted background with a slow scan shimmer animation using Recorder's Blue-Green at ~70% and ~50% opacity.
- **Success:** Success-soft tinted background with an amber shimmer.
- **Error:** Danger-soft tinted border.
- **Shape:** 1.125rem radius (`--radius-sm`).
- **Tone system:** Applied via `data-tone` attribute (`data-tone="success"` / `data-tone="error"`). The light-theme override does not apply when a tone is active.

## 6. Do's and Don'ts

The product's editorial authority depends on restraint and specificity. Every rule below exists because a violation would push the interface toward the categories it explicitly rejects.

### Do:
- **Do** use `Fraunces` for every text element, including labels, kickers, headings, and body copy.
- **Do** use `Teko` for display numerics (match scores, large stat values, hero figures) and only there.
- **Do** hold Keeper's Amber and Recorder's Blue-Green to ≤10% of any screen surface — use them on borders, kickers, and interactive states, not as backgrounds.
- **Do** use pill (999px) border-radius for all buttons, chips, tags, and nav links.
- **Do** apply `color-mix()` tonal gradients for panel depth differentiation rather than creating new fixed hex values.
- **Do** set `min-block-size: 44px` on every interactive touch target.
- **Do** use the Keeper's Amber 2px focus outline (`outline: 2px solid rgba(240, 198, 126, 0.8); outline-offset: 3px`) as the universal focus ring — never remove it.
- **Do** keep body line length at 54–65ch maximum on paragraph text.
- **Do** use the clamp-based spacing scale (`--space-2xs` through `--space-xl`) for all layout gaps and padding rather than hardcoding pixel values.
- **Do** give major pages their own gradient accent variation on their hero panel. Distinct pages within a cohesive system.

### Don't:
- **Don't** use pure `#000000` or `#ffffff`. Every neutral needs at least trace warmth (chroma ≥ 0.005).
- **Don't** use `border-left` or `border-right` greater than 1px as a colored side stripe on cards, callouts, or list items. This is the most common anti-pattern and it never looks intentional. Use background tints, full borders, or leading numbers instead.
- **Don't** use `background-clip: text` with a gradient. Use a single solid color for text, always.
- **Don't** use glassmorphism (`backdrop-filter: blur()` + semi-transparent card). The tonal layering system already creates depth; a glass effect adds noise.
- **Don't** build a hero section with a big number, small label, and gradient accent beneath it. This is the SaaS KPI hero template and it is explicitly rejected.
- **Don't** use Teko for copy, labels, headings, or anything that requires reading rather than scanning a value.
- **Don't** design the interface to feel like a gambling-adjacent sports site — no neon on black, no animated score counters, no hype copy.
- **Don't** make every page look the same. The shared system supports distinction. Give each major section its own emphasis within the token vocabulary.
- **Don't** add explanatory copy that restates what the data or heading already communicates. If a heading says what a section is, the paragraph below it should not repeat the heading in different words.
- **Don't** use em dashes (—) in copy. Use commas, colons, semicolons, or parentheses instead.
