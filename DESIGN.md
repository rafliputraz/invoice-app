---
name: SFL Invoice Dashboard
description: A light, warm finance dashboard for a freight forwarder — white cards on a soft grey ground, SFL's red as the brand, and charts that do real work.
colors:
  bg: "#f4f6f5"
  card: "#ffffff"
  soft: "#f7f9f8"
  line: "#e9edeb"
  line-2: "#dde3e0"
  ink: "#171a1c"
  ink-2: "#5a6570"
  ink-3: "#737f8a"
  brand: "#d6291e"
  brand-hover: "#b92117"
  brand-deep: "#8c1a16"
  brand-soft: "#fdecea"
  paid: "#15803d"
  paid-soft: "#dcfce7"
  open: "#2563eb"
  open-soft: "#dbeafe"
  overdue: "#dc2626"
  overdue-soft: "#fee2e2"
  short: "#b45309"
  short-soft: "#fef3c7"
typography:
  family: "Plus Jakarta Sans, Segoe UI, system-ui, sans-serif"
  page-title:
    fontSize: "19px / 21px from md"
    fontWeight: 800
    letterSpacing: "-0.025em"
  section:
    fontSize: "16px"
    fontWeight: 700
    letterSpacing: "-0.015em"
  hero-figure:
    fontSize: "28px"
    fontWeight: 600
    fontFeature: "tabular-nums"
  stat-figure:
    fontSize: "20px / 22px from md"
    fontWeight: 600
    fontFeature: "tabular-nums"
  figure:
    fontWeight: 600
    letterSpacing: "-0.01em"
    fontFeature: "tabular-nums"
  body:
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontSize: "13px"
    fontWeight: 500
    textColor: "{colors.ink-2}"
  pill:
    fontSize: "12px"
    fontWeight: 600
  control:
    fontSize: "13px"
    fontWeight: 600
rounded:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  2xl: "16px"
  3xl: "20px"
  4xl: "24px"
elevation:
  card: "0 1px 3px rgba(16,24,40,.06), 0 8px 24px -12px rgba(16,24,40,.10)"
  pop: "0 4px 10px rgba(16,24,40,.08), 0 24px 48px -20px rgba(16,24,40,.24)"
  brand: "0 6px 18px -6px rgba(214,41,30,.45)"
components:
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.2xl}"
    shadow: "{elevation.card}"
  card-brand:
    background: "linear-gradient(150deg, {colors.brand}, {colors.brand-deep}) + a white radial highlight"
    textColor: "#ffffff"
    shadow: "{elevation.brand}"
  iconchip:
    size: "40px"
    rounded: "{rounded.lg}"
    backgroundColor: "a status -soft tint, or {colors.soft}"
  navitem:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 0.75rem"
  navitem-active:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand}"
  pill:
    rounded: "999px"
    padding: "0.2rem 0.6rem"
    variants: "paid / open / overdue / short / neutral, each on its -soft ground"
  button:
    backgroundColor: "{colors.card}"
    border: "1px solid {colors.line-2}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.9rem"
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    shadow: "{elevation.brand}"
  field:
    backgroundColor: "{colors.card}"
    border: "1px solid {colors.line-2}"
    rounded: "{rounded.md}"
    focus: "border {colors.brand} + 3px {colors.brand-soft} ring"
  register:
    headerColor: "{colors.ink-3}"
    rowPadding: "0.8rem 1rem"
    rowHover: "{colors.soft}"
    rowSelected: "{colors.brand-soft}"
  track:
    height: "8px"
    rounded: "999px"
    backgroundColor: "{colors.line}"
---

# Design System: SFL Invoice Dashboard

<!-- SCOPE: this system governs the app chrome only. The four printed invoice
     templates under `src/components/templates/` are an excluded zone: they set
     their own fonts and colours, must not inherit anything here, and nothing in
     this file applies to them. See "Excluded Zone" under Layout. -->

## Overview

**Creative North Star: "Ledger"**

A light, warm finance dashboard for PT. Salam Fortuna Logistik. White cards float on a soft grey ground with real (soft) elevation, generous spacing, rounded geometry, and charts that carry their share of the work rather than decorating it.

Three earlier directions were built and rejected — an Admiralty sounding chart, a light "Manifest" document system, and a dark "Instrument" workbench. All three were the same design underneath: flat, hairline-ruled, desaturated, labelled in tiny uppercase monospace, with shadows and colour banned by rule and density increased each round. The lesson is recorded here because it is the most important thing this file has to say:

> **A redesign means changing what the thing is — the layout and the overall lightness of the screen — not the palette and the typeface.** The client reads composition and value as "the design". A token swap reads as decoration.

The reference this system was built to is a modern SaaS finance dashboard. It is deliberately conventional in structure, because for an internal tool a finance team uses every day, familiar *is* the correct answer.

**Key characteristics:**
- White cards, 16px radius, soft two-layer shadows on a warm grey ground
- **SFL's red is the brand colour** — sidebar active state, primary buttons, the hero card
- Left sidebar with a rounded pill on the active item; a top bar carrying the page title and account controls
- Real charts: a donut, twelve months of stacked bars, per-customer progress bars
- Roomy. Comfortable type sizes, generous padding, no uppercase-mono labels anywhere
- One entrance animation per screen, and one response animation for the single act that matters

## Colors

### Brand
- **SFL Red** (`{colors.brand}`): taken from the company mark. The active nav pill, primary buttons, the hero card's gradient, the selected table row, focus rings, the highlighted group in an invoice number.

Earlier systems banned red so it could mean "overdue" exclusively, which deleted the company's own colour from its own software. That was wrong. **Red is both the brand and the overdue status, and that is fine** — because of the rule below.

### Status
One validated trio plus an amber, used identically in the pills, the donut and the bar chart, so a colour means the same thing everywhere in the product:

- **Paid** (`{colors.paid}`) — settled in full
- **Open** (`{colors.open}`) — unpaid, not yet due
- **Overdue** (`{colors.overdue}`) — past the due date
- **Short** (`{colors.short}`) — paid, but less cash arrived than the invoice asked for

Each has a `-soft` companion used only as a pill or icon-chip ground.

**These were computed, not chosen.** `#15803D, #2563EB, #DC2626` was validated with the data-viz palette checker on the white card at all-pairs: lightness band PASS, chroma floor PASS, colourblind separation worst ΔE 8.6 (deutan), normal-vision worst ΔE 29.7, all three ≥3:1 contrast. Re-run the validator before changing any of them.

### Neutral
- **Bg** (`{colors.bg}`) — the ground everything sits on, warm rather than blue-grey
- **Card** (`{colors.card}`) — every surface carrying content
- **Soft** (`{colors.soft}`) — recessed: table row hover, wells, icon chips, dialog footers
- **Line / Line 2** — the two hairline weights: dividers inside a card, and input borders
- **Ink / Ink 2 / Ink 3** — primary text, secondary text, and labels/placeholders. `ink-3` clears 4.6:1 on the card; do not lighten it.

### Named Rules

**The Pill Rule.** Because red is both the brand and a status, a status is **never** communicated by colour alone and never by bare coloured text. It always appears as a pill carrying its word — `Paid`, `Late 6d`, `Short`, `3d left`. That is what keeps a red pill from being mistaken for a red button.

**The Same-Colour-Everywhere Rule.** The donut, the monthly bars and the row pills share one status palette. If a chart needs a colour, it takes it from that set or the chart is asking the wrong question.

**The Validator Rule.** Any new categorical palette gets run through the data-viz validator before it ships. Never eyeball colourblind separation.

## Typography

**Plus Jakarta Sans**, 400/500/600/700, for everything. It was commissioned for Jakarta's own city identity, which makes it a real choice for this company rather than a default reach for Inter, and it is friendly without being soft.

`tabular-nums` is on for every figure (`.fig`), so columns of rupiah align down a table.

**There are no uppercase-monospace labels.** Three previous systems used them everywhere and all three read as a terminal instead of a product. Labels are ordinary sentence case at a comfortable size.

## Layout

A **248px white sidebar** on the left (logo, nav, help card), and everything else in a scrolling column beside it under a sticky, blurred **68px top bar** carrying the page title, subtitle, and the account controls plus **New Invoice**. Below `lg` the sidebar becomes a drawer behind a hamburger.

The dashboard (`/`) is three rows:

```
┌──────────────┬────────────────────────────────────────────────────────┐
│  ◉ SFL       │  Dashboard              ⚠   ● Administrator  + New     │
│              ├────────────────────────────────────────────────────────┤
│ ▣ Dashboard  │ ╭ RED HERO ────╮ ╭─────────╮ ╭─────────╮ ╭─────────╮  │
│ ▧ Customers  │ │ Outstanding  │ │ Billed  │ │ Overdue │ │ Banked  │  │
│ ▨ Users      │ │ Rp 1.592.325 │ ╰─────────╯ ╰─────────╯ ╰─────────╯  │
│ ▩ Trash      │ │ ▓▓▓▓▓▓▓░ 93% │                                       │
│              │ ╰──────────────╯                                       │
│              │ ╭ Invoiced by month (bars) ─╮ ╭ Where it stands ────╮  │
│              │ ╰───────────────────────────╯ ╰ (donut + legend) ───╯  │
│ ╭ Need a   ╮ │ ╭ Invoices — search, filters, table, pagination ────╮  │
│ │ hand?    │ │ ╰──────────────────────────────────────────────────╯  │
│ ╰──────────╯ │                                                        │
└──────────────┴────────────────────────────────────────────────────────┘
```

**Customers** is a stat row, then a position table beside a detail panel (avatar on a soft gradient, then labelled rows for total / outstanding / overdue / NPWP / address), then the saved-records table. **Users** and **Trash** are single tables with a count badge, a search, and icon actions per row.

### Excluded Zone

`src/components/templates/` — the four printed invoice templates — is outside this system. They set their own fonts and colours, produce the document customers and tax authorities receive, and inherit nothing from these tokens. Protections that must stay in place: the two `rounded-none` pins, `#invoice-print` setting its own `font-variant-numeric`, and the print stylesheet forcing white ground and flattening the app chrome.

## Motion

GSAP 3.15 via `@gsap/react`'s `useGSAP`, so every animation cleans itself up.

- **Shell** — logo, nav items, help card and bar controls arrive once on load.
- **Every page** — the shared `useReveal` hook: `.anim-card` elements rise in reading order, then `.anim-row` follows in a tighter stagger.
- **Charts** — bars grow up from the baseline left to right; the donut sweeps clockwise from twelve o'clock, slice handing to slice, then the legend and centre total settle.
- **Figures** — `CountUp` counts to the value once.
- **Dialogs** — scrim washes in, card rises just behind it, fields stagger.
- **Login** — a freight scene behind the form: three trade routes with a travelling highlight walking each one, port nodes breathing, a container stack on the quay, and a ship crossing every 58 seconds.
- **The one response animation** — `.just-paid`, a single pulse on the status pill of the row whose payment was actually recorded. Everything else responds to a page loading; this responds to something the user did.

**Everything is wrapped in `gsap.matchMedia()` keyed to `prefers-reduced-motion: no-preference`.** With reduced motion on, every screen renders in full and holds still.

### Named Rules

**The Run-Once Rule.** An entrance runs exactly once and must never be re-triggered. Guard it with a ref, and key its effect to a boolean (`count > 0`), never to a changing value.

This is not style advice — it is the single bug that broke this app twice. Data arrives from a `fetch` after first paint. If an entrance is keyed to the data, `useGSAP` re-runs when the data lands, its cleanup reverts the tween **mid-flight**, and elements are stranded at their start values: invisible bars, a half-faded axis, a greyed-out donut total.

**The Clean-Exit Rule.** Entrance tweens name their `clearProps` so no inline transform or opacity outlives them, and hand elements back to whatever React styles. Never `clearProps: "all"` on an element React also styles inline.

**The Never-Wrong-Number Rule.** `CountUp` writes the true formatted value on cleanup. A tween killed mid-count must not leave a half-counted figure on a finance screen.

## Do's and Don'ts

### Do:
- **Do** use SFL red as the brand — nav, primary actions, the hero card.
- **Do** give every status a pill with its word in it.
- **Do** take chart colours from the status palette, and re-run the validator if you add one.
- **Do** keep figures `tabular-nums`.
- **Do** guard every entrance animation with a ref and key it to a boolean.
- **Do** name `clearProps` on entrance tweens.
- **Do** route every modal through the single `Dialog` primitive.
- **Do** keep the app light, roomy and conventional. That is the brief.

### Don't:
- **Don't** communicate a status with colour alone, or with bare coloured text.
- **Don't** re-animate a list on filter or search. Rows animate once, when they first arrive.
- **Don't** key an animation effect to a value that changes when data loads.
- **Don't** reintroduce uppercase-monospace labels, hairline-only surfaces, or a ban on shadows and colour. Three systems died of it.
- **Don't** lighten `ink-3`.
- **Don't** apply any of this to `src/components/templates/`. The printed document is an excluded zone.
