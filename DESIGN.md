---
name: UrbanMind
description: A restrained, trustworthy civic operations design system for resident reporting and service workflows.
colors:
  primary: "#0b56d9"
  primary-dark: "#0846a8"
  on-primary: "#ffffff"
  surface: "#ffffff"
  ink: "#0f172a"
  muted: "#6b7280"
  neutral-50: "#f8fafc"
  success: "#047857"
  success-bg: "#ecfdf5"
  warning: "#b45309"
  warning-bg: "#fffbeb"
  danger: "#b91c1c"
  danger-bg: "#fff1f2"
  info: "#2563eb"
  info-bg: "#eff6ff"
typography:
  display:
    fontFamily: "Inter, Outfit, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.08
  headline:
    fontFamily: "Inter, Outfit, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.12
  body:
    fontFamily: "Inter, Outfit, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.75rem"
spacing:
  xs: "6px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
  card-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{typography.body.fontFamily}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
---

# Design System: UrbanMind

## 1. Overview

**Creative North Star:** "The Trustworthy Ledger"

UrbanMind's UI is restrained, legible, and task-focused — designed for residents, field staff, and managers to act quickly and confidently. The system favors clarity and predictability: clear status, clear next actions, and calm, service-oriented visuals. Surfaces are light, typography is dense and utilitarian, and motion is purposeful (state feedback rather than flourish).

Key characteristics:
- Trust-first palette with a single, restrained accent.
- Compact yet comfortable rhythm for dense information screens.
- Motion conveys state: quick transitions (120–220ms) and reduced-motion respect.
- Accessibility-first: WCAG AA contrast targets, clear focus rings, and comfortable touch targets.

## 2. Colors

The palette is deliberately restrained: one primary accent carried sparingly, with clear semantic states for success, warning, danger, and info. Neutral surfaces use near-white and slate tones to maximize legibility.

### Primary
- **Trust Blue** (#0b56d9): primary action, links, selected states. Use sparingly as the primary affordance color (buttons, active states, primary links).

### Primary (interactive)
- **Trust Blue - Dark** (#0846a8): hover / active treatment for primary actions.

### Neutrals
- **Surface** (#ffffff): main card and page surface.
- **Neutral-50** (#f8fafc): light panel backgrounds and subtle containers.
- **Ink** (#0f172a): primary text color for body and headings.
- **Muted** (#6b7280): secondary text and captions.

### Semantic
- **Success** (#047857) / bg `#ecfdf5`: success states and microcopy.
- **Warning** (#b45309) / bg `#fffbeb`: cautions and soft alerts.
- **Danger** (#b91c1c) / bg `#fff1f2`: errors and destructive affordances.
- **Info** (#2563eb) / bg `#eff6ff`: informational badges and indicators.

Named rules
- **The One Voice Rule.** The primary accent is an affordance color and should appear on no more than ~10% of a given screen at rest. Its rarity preserves its signal value.

## 3. Typography

Display: Inter / Outfit system stack (heavy, high-contrast headings). Body uses the same family for familiarity and density.

Character: compact, direct, and readable at small sizes. Preserve a tight scale to keep dashboards dense but legible.

Hierarchy
- **Display** (800, 2.25rem, 1.08): Large page headings and hero titles.
- **Headline** (800, 1.5rem, 1.12): Section headings and important cards.
- **Body** (400, 1rem, 1.6): Primary UI copy, metric prose — aim for 65–75ch when used as paragraph text.
- **Label** (700/800, 0.75rem–0.875rem): Button labels, badges, and compact UI labels. Uppercase for badges/eyebrows sparingly.

Named rules
- **The Single-Family Rule.** Use Inter/Outfit stack for display and body; avoid mixing display-only fonts in UI labels.

## 4. Elevation

UrbanMind is mostly flat with subtle ambient shadows for surface separation. Cards use a light, short ambient shadow; hover and elevated interactive surfaces increase shadow slightly. Depth is conservative — avoid heavy glows and large offsets.

Shadow vocabulary (examples from `index.css`):
- **card-ambient**: `0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)` — default card shadow.
- **hover-lift**: `0 10px 30px rgba(12,18,32,0.08)` — used sparingly on map focus or interactive reveals.

Motion
- Motion tokens: fast ~120ms, medium ~220ms, slow ~360ms. Easing: ease-out-quart / ease-out-quint (cubic-bezier tuned). All animations honor `prefers-reduced-motion: reduce` with near-instant transitions.

Named rules
- **Flat-By-Default.** Surfaces are flat unless elevated for interactivity. Heavy shadows are reserved for transient overlays and map focus states.

## 5. Components

Buttons
- Shape: rounded `{rounded.md}` (1rem).
- Primary: background `{colors.primary}`, text `{colors.on-primary}`, padding `{spacing.sm} {spacing.md}`. Hover → `{colors.primary-dark}`. Transition color in ~180–220ms.
- Ghost / outline: transparent background, `{colors.primary}` text, light slate hover background for affordance.

Inputs / Fields
- Stroke-based fields with `1px` slate border, white surface, rounded `{rounded.sm}`. Focus uses a soft ring computed from the primary token (focus ring: `color-mix(in srgb, {colors.primary} 12%, transparent)`), and a short color transition.

Cards / Containers
- Corner style: `{rounded.md}`. Background `{colors.surface}`. Default shadow `card-ambient`. Internal padding `{spacing.md}`. Use bordered surface variants (`border-slate-200`) for dense lists.

Badges / Status
- Use the semantic color backgrounds and the condensed uppercase label style. Radius: full (pill) for inline status; use small caps and bold weight.

Tables
- Dense rows, compact typography, hover row highlight uses a light slate tint. Horizontal overflow allowed; prefer responsive collapsing for mobile.

Timelines
- Minimal dot + vertical flow; completed segments use `{colors.primary}` and the timeline progress bar animates width with `--motion-slow` easing.

Dialog / Overlays
- Use fixed, centered dialogs with a `bg-black/40` scrim. Dialog card follows card rules: `{rounded.lg}`, `{spacing.lg}` padding, and short elevation.

## 6. Do's and Don'ts

Do:
- **Do** use the primary accent for actionable affordances only (buttons, active tab, focused map markers).
- **Do** prefer compact, high-contrast typography for dense dashboards; constrain body copy to ~65–75ch when used in paragraphs.
- **Do** respect `prefers-reduced-motion` and provide instant fallbacks for all transitions.

Don't:
- **Don't** use heavy decorative gradients, purple neon palettes, or glassmorphism — the product must avoid flashy aesthetics and remain authoritative.
- **Don't** add nested cards for simple grouping; prefer spacing and subtle borders instead.
- **Don't** use oversized or persistent shadows; heavy glows are reserved only for transient focus states.
- **Don't** invent inconsistent component vocabularies (buttons must look like buttons everywhere).

---

If you'd like, I can now:
- generate the `.impeccable/design.json` sidecar with tonal ramps, motion tokens, and self-contained component snippets, or
- migrate a few high-value existing UI uses to reference these tokens/components (e.g., `TicketDetailPage.jsx` empty state → `EmptyState`).
