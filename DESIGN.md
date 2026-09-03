---
name: Ramp
colors:
  primary: "#5683D2"
  secondary: "#0C0A08"
  surface: "#000000"
  on-surface: "#FFFFFF"
typography:
  body-md:
    fontFamily: dm-sans
    fontSize: 14px
    fontWeight: 400
rounded:
  md: 12px
---

# Design System Inspired by Ramp

## 1. Visual Theme & Atmosphere

Ramp's design system embodies a modern, professional fintech aesthetic grounded in clarity and efficiency. The visual language prioritizes clean typography paired with purposeful color accents, creating an environment of trust and technological sophistication. The system uses abundant whitespace and a restrained palette to reduce cognitive load, allowing users to focus on financial data and actionable insights. Subtle shadows and carefully calibrated opacity convey hierarchy without visual clutter. The design communicates both enterprise reliability and accessible intelligence, positioning the platform as a bridge between complex finance operations and intuitive user control.

**Key Characteristics**

- Clean, minimal aesthetic with expansive whitespace
- Bold, legible typography at large scales for emphasis
- Strategic use of high-contrast primary blue for calls-to-action
- Luminous yellow-green accent for active highlights and primary CTAs
- Enterprise-grade neutral palette supporting content clarity
- Subtle depth through layered shadows and opacity
- Geometric precision with moderate border radii

## 2. Color Palette & Roles

### Primary

- **Primary Blue** (`#5683D2`): Core interactive element, links, secondary CTAs, and interactive states
- **Deep Navy** (`#001B4A`): High-contrast text and premium visual anchoring
- **Charcoal** (`#0C0A08`): Primary text color, headings, body copy

### Accent Colors

- **Luminous Yellow** (`#E4F222`): Primary CTA buttons, active states, warning indicators; highest visual priority

### Interactive

- **Light Blue** (`#C3D3EF`): Hover states, light backgrounds for interactive regions
- **Pale Blue** (`#E4EBF6`): Disabled states, low-priority interactive elements

### Neutral Scale

- **Off-White** (`#FFFFFF`): Primary background, card surfaces
- **Light Gray** (`#F2F5F9`): Secondary backgrounds, subtle section dividers
- **Medium Gray** (`#E2E8F0`): Borders, dividers, tertiary UI elements
- **Stone Gray** (`#D2CECB`): Subtle accent lines, reduced-contrast text
- **Slate Gray** (`#A0AEC0`): Secondary text, muted labels
- **Near Black** (`#212121`): Fallback text, maximum contrast
- **Pure Black** (`#000000`): Reserved for system text and shadows

### Surface & Borders

- **White Surface** (`#FFFFFF`): All card and container backgrounds
- **Surface Hover** (`#EDF2F7`): Subtle background shift on interactive surfaces
- **Border Light** (`#E2E8F0`): Standard divider, 1px strokes on light surfaces
- **Border Overlay** (`rgba(33, 33, 33, 0.1)`): Semantic border with transparency, adapts to backgrounds

## 3. Typography Rules

### Font Family

**Primary:** DM Sans (Google Font; sans-serif fallback stack: `'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)

**Secondary:** Same as primary — single-font system for consistency

### Hierarchy

| Role                  | Font    | Size | Weight | Line Height | Letter Spacing | Notes                                      |
| --------------------- | ------- | ---- | ------ | ----------- | -------------- | ------------------------------------------ |
| Display / H1          | DM Sans | 64px | 400    | 64px        | 0px            | Hero headlines, page titles                |
| Hero H2               | DM Sans | 48px | 400    | 50px        | 0px            | Section headers, major content blocks      |
| Subheading H2         | DM Sans | 28px | 400    | 32px        | 0px            | Secondary headings, card titles            |
| Heading H3            | DM Sans | 24px | 400    | 28px        | 0px            | Tertiary headers, feature titles           |
| Large Body            | DM Sans | 20px | 400    | 26px        | 0px            | Large descriptive text, marketing copy     |
| Body M                | DM Sans | 18px | 400    | 24px        | 0px            | Standard body, product descriptions        |
| Body                  | DM Sans | 16px | 400    | 24px        | 0px            | Default body text, form labels, navigation |
| Small Body            | DM Sans | 14px | 400    | 20px        | 0px            | Secondary text, captions, help text        |
| Input                 | DM Sans | 15px | 400    | 22.5px      | 0px            | Form input fields, placeholders            |
| Overline / Large Span | DM Sans | 16px | 400    | 24px        | 0px            | Metadata, tags, supplementary labels       |
| Jumbo Display         | DM Sans | 40px | 400    | 42px        | 0px            | Rare use: emphasis headlines, stats        |

### Principles

- Single font family throughout ensures visual cohesion and reduces cognitive load
- Font weight remains 400 (regular) across all scales — hierarchy derives from size, not weight
- Line height tracked proportionally to font size for maintained readability
- Large display sizes (48px+) use 1:1 line-height ratio for tight, confident composition
- Body text uses 1.5x line-height multiplier for legibility and reduced eye strain
- No letter spacing applied — DM Sans letterforms provide consistent readability

## 4. Component Stylings

### Buttons

**Primary CTA Button**

- Background: `#E4F222` (Luminous Yellow)
- Text Color: `#0C0A08` (Charcoal)
- Font Size: `14px`
- Font Weight: `400`
- Padding: `0px 12px` (height auto-sized to 44px minimum touch target)
- Border Radius: `6px`
- Border: `0px solid transparent`
- Box Shadow: `none`
- Line Height: `14px`
- Hover State: Background `#D4E200` (darkened yellow), text `#0C0A08`, shadow `rgba(0, 0, 0, 0.08) 0px 2px 4px`
- Active State: Background `#C4D200`, shadow inset

**Secondary Button**

- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text Color: `#5683D2` (Primary Blue)
- Font Size: `14px`
- Font Weight: `400`
- Padding: `0px 12px`
- Border Radius: `6px`
- Border: `0px solid transparent`
- Box Shadow: `none`
- Line Height: `14px`
- Hover State: Background `#E4EBF6` (Pale Blue), text `#5683D2`
- Active State: Background `#C3D3EF` (Light Blue), text `#001B4A`

**Ghost / Tertiary Button**

- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text Color: `#5683D2` (Primary Blue)
- Font Size: `14px`
- Font Weight: `400`
- Padding: `0px 12px`
- Border Radius: `6px`
- Border: `1px solid #E2E8F0` (optional, light border)
- Box Shadow: `none`
- Line Height: `14px`
- Hover State: Text `#001B4A`, Background `#F2F5F9`
- Active State: Text `#001B4A`, Border `#5683D2`

**Enterprise Contact Button**

- Background: `#0C0A08` (Charcoal)
- Text Color: `#FFFFFF` (White)
- Font Size: `14px`
- Font Weight: `400`
- Padding: `0px 12px`
- Border Radius: `6px`
- Border: `0px solid transparent`
- Box Shadow: `none`
- Line Height: `14px`
- Hover State: Background `#1C1B17` (darker charcoal), shadow `rgba(0, 0, 0, 0.12) 0px 4px 8px`
- Active State: Background `#0C0A08`, shadow inset

### Cards & Containers

**Standard Card**

- Background: `#FFFFFF` (White)
- Text Color: `#0C0A08` (Charcoal)
- Font Size: `16px`
- Font Weight: `400`
- Padding: `0px` (content padding handled internally)
- Border Radius: `12px`
- Border: `1px solid rgba(33, 33, 33, 0.1)` (subtle border)
- Box Shadow: `none`
- Line Height: `24px`
- Hover State: Background `#FFFFFF`, shadow `rgba(0, 0, 0, 0.04) 0px 2px 8px`, border `rgba(33, 33, 33, 0.15)`

**Pricing Card (Featured/Plus)**

- Background: `#FFFFFF` (White)
- Border: `2px solid #E4F222` (Luminous Yellow)
- Border Radius: `12px`
- Padding: `32px 24px`
- Text Color: `#0C0A08` (Charcoal)
- Box Shadow: `rgba(228, 242, 34, 0.1) 0px 8px 24px`
- Hover State: Shadow `rgba(228, 242, 34, 0.2) 0px 12px 32px`

**Pricing Card (Standard/Enterprise)**

- Background: `#FFFFFF` (White)
- Border: `1px solid #E2E8F0` (Medium Gray)
- Border Radius: `12px`
- Padding: `32px 24px`
- Text Color: `#0C0A08` (Charcoal)
- Box Shadow: `none`
- Hover State: Border `#D2CECB`, shadow `rgba(0, 0, 0, 0.02) 0px 1px 3px`

**Feature Container Card**

- Background: `#F2F5F9` (Light Gray)
- Border Radius: `12px`
- Padding: `32px 24px`
- Text Color: `#0C0A08` (Charcoal)
- Border: `0px solid transparent`
- Box Shadow: `none`

### Inputs & Forms

**Email Input Field**

- Background: `rgba(0, 0, 0, 0)` (transparent) or `rgba(33, 33, 33, 0.024)` (subtle fill)
- Text Color: `#0C0A08` (Charcoal)
- Placeholder Color: `#A0AEC0` (Slate Gray)
- Font Size: `15px` (standard) or `16px` (large variant)
- Font Weight: `400`
- Padding: `0px 16px 0px 24px` (left indent for icon space)
- Border Radius: `10px`
- Border: `1px solid rgba(33, 33, 33, 0.1)` or `0px none rgba(255, 255, 255, 0.3)` (light variant)
- Height: `43px` (compact) or `60px` (large)
- Box Shadow: `none`
- Line Height: `22.5px` (compact) or `22px` (large)
- Focus State: Border `#5683D2`, background `#F2F5F9`, box-shadow `0px 0px 0px 3px rgba(86, 131, 210, 0.1)`
- Disabled State: Background `rgba(33, 33, 33, 0.05)`, text `#A0AEC0`, border `#E2E8F0`

**Text Input (General)**

- Background: `rgba(33, 33, 33, 0.024)` (very subtle fill)
- Text Color: `#0C0A08` (Charcoal)
- Font Size: `15px`
- Font Weight: `400`
- Padding: `0px 16px 0px 16px`
- Border Radius: `6px`
- Border: `1px solid rgba(33, 33, 33, 0.1)`
- Height: `43px`
- Box Shadow: `none`
- Line Height: `22.5px`
- Focus State: Border `#5683D2`, background `#FFFFFF`, box-shadow `0px 0px 0px 3px rgba(86, 131, 210, 0.1)`

### Navigation

**Header Navigation**

- Background: `#FFFFFF` (White)
- Text Color: `#0C0A08` (Charcoal)
- Font Size: `16px`
- Font Weight: `400`
- Padding: `0px` (padding applied to individual nav items)
- Border Radius: `0px`
- Border: `0px solid transparent` or `1px solid #E2E8F0` (bottom border)
- Box Shadow: `none`
- Height: `62px` (standard) or `102px` (extended with banner)
- Line Height: `24px`
- Link Hover: Text `#5683D2`, background `rgba(86, 131, 210, 0.05)`
- Link Active: Text `#001B4A`, border-bottom `2px solid #5683D2`

**Navigation Link**

- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text Color: `#0C0A08` (Charcoal, default) or `#5683D2` (blue, secondary)
- Font Size: `14px` or `16px` (context-dependent)
- Font Weight: `400`
- Padding: `0px 12px` (horizontal spacing)
- Border Radius: `6px` (optional, for hover state pill)
- Border: `0px solid transparent`
- Box Shadow: `none`
- Line Height: `14px` or `24px`
- Hover State: Background `#E4EBF6`, text `#001B4A`
- Active State: Text `#001B4A`, underline `2px solid #5683D2`

### Badges & Tags

**Primary Badge**

- Background: `#E4F222` (Luminous Yellow)
- Text Color: `#0C0A08` (Charcoal)
- Font Size: `12px`
- Font Weight: `500`
- Padding: `4px 8px`
- Border Radius: `4px`
- Border: `0px solid transparent`
- Box Shadow: `none`

**Secondary Badge**

- Background: `#C3D3EF` (Light Blue)
- Text Color: `#001B4A` (Deep Navy)
- Font Size: `12px`
- Font Weight: `500`
- Padding: `4px 8px`
- Border Radius: `4px`
- Border: `0px solid transparent`

## 5. Layout Principles

### Spacing System

**Base Unit:** `4px`

**Scale:**

- `4px` — Micro spacing (gap between tightly coupled elements, component internals)
- `8px` — Extra small (internal component padding, tight grouping)
- `12px` — Small (button padding, form field internals)
- `16px` — Base (standard padding, navigation gaps)
- `20px` — Medium (card padding, section gaps)
- `24px` — Large (section margins, card spacing)
- `28px` — Extra large (container padding)
- `32px` — XL (featured card padding, significant section breaks)
- `40px` — XXL (layout padding, wide spacing)
- `48px` — 3XL (section margins, visual breathing room)
- `64px` — 4XL (hero section padding, major layout separators)
- `128px` — 5XL (page-level spacing, rare use)

**Usage Context:**

- Gaps between inline elements: `8px`, `16px`
- Button/form padding: `12px` horizontal, `8px–12px` vertical
- Card/container padding: `24px`, `32px`
- Section margins: `48px`, `64px`

### Grid & Container

**Max Width:** `1440px` (standard viewport container)

**Column Strategy:**

- 12-column grid at desktop (1440px)
- 6-column grid at tablet (768px)
- Single-column stacked at mobile

**Section Patterns:**

- Full-width colored sections with 128px top/bottom margin
- Centered content containers with 40px–64px padding
- Card grids using `24px` gap between cards
- Hero sections with 64px top margin, 48px bottom

### Whitespace Philosophy

Ramp embraces generous whitespace as a design principle, not a fallback. Empty space is used strategically to establish visual hierarchy, reduce cognitive load, and guide user focus. Large headlines are surrounded by significant breathing room. Cards and containers sit within spacious negative space. Sections are clearly separated by vertical rhythm based on the spacing scale. This approach creates a premium, uncluttered aesthetic aligned with enterprise financial software positioning.

### Border Radius Scale

- `0px` — No radius (sharp corners for architectural elements, rarely used)
- `4px` — Minimal radius (small badges, secondary UI)
- `6px` — Button/input standard (primary interactive components)
- `10px` — Large input fields, secondary cards
- `12px` — Card standard (main content containers)
- `16px` — Feature cards (large highlight sections)
- `21.888px` — Decorative radius (rare, specialty components)

### Border Widths

- **Thin:** `1px` (standard borders on inputs, cards, dividers)
- **Medium:** `2px` (featured card emphasis, active states)
- **None:** `0px` (transparent, borderless components)

## 6. Depth & Elevation

### Shadow Hierarchy

| Level    | Treatment                                                                                                                                                                                                                                   | Use                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Flat     | `none`                                                                                                                                                                                                                                      | Cards at rest, buttons, static UI          |
| Subtle   | `rgba(0, 0, 0, 0.02) 0px 1px 3px`                                                                                                                                                                                                           | Hover state for secondary cards            |
| Light    | `rgba(0, 0, 0, 0.04) 0px 2px 8px`                                                                                                                                                                                                           | Standard card hover, lifted state          |
| Medium   | `rgba(0, 0, 0, 0.08) 0px 2px 4px`                                                                                                                                                                                                           | Button hover, dropdown subtle lift         |
| Elevated | `rgba(0, 0, 0, 0.12) 0px 4px 8px`                                                                                                                                                                                                           | Modal overlay, prominent hover states      |
| Floating | `rgba(0, 0, 0, 0.15) 0px 8px 16px`                                                                                                                                                                                                          | Tooltip, popover, floating panel           |
| Dropdown | `rgba(0, 0, 0, 0.008) 0px 232px 65px 0px, rgba(0, 0, 0, 0.03) 0px 35px 59px 0px, rgba(0, 0, 0, 0.09) 0px 20px 50px 0px, rgba(0, 0, 0, 0.067) 0px 37px 37px 0px, rgba(0, 0, 0, 0.086) 0px 9px 20px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 0px` | Multi-layer dropdown menu, complex popover |
| Accent   | `rgba(228, 242, 34, 0.1) 0px 8px 24px` to `rgba(228, 242, 34, 0.2) 0px 12px 32px`                                                                                                                                                           | Featured card glow, accent elevation       |

**Shadow Philosophy:**
Ramp uses shadows sparingly to maintain clarity. Shadows serve functional hierarchy — indicating elevation and interactive state — rather than decorative depth. Most UI remains flat. Shadows appear on hover to signal interactivity. Complex layered shadows (like dropdown) simulate realistic depth for complex nested UI. Colored shadows (yellow accent glow on featured pricing) create visual emphasis without obscuring content.

### Opacity Levels

- **90%** (`0.90`) — Slight transparency for visual layering
- **60%** (`0.60`) — Medium overlay, readable text atop image
- **40%** (`0.40`) — Disabled interactive elements, low-priority text
- **30%** (`0.30`) — Subtle border, light divider
- **20%** (`0.20`) — Hover state overlay, light background tint
- **1%** (`0.01`) — Imperceptible, for AA contrast fallback

### Z-index / Layering

- **Base Layers** — z-index `1`, `2`, `3`: Standard content flow, cards, typography
- **Elevated UI** — z-index `4`, `5`: Floating panels, tooltips, sticky elements
- **Overlay/Modal** — z-index `6`, `7`: Modal backdrop, modal dialog, full-page overlay
- **Toast/Alert** — z-index `8`: Toast notifications, alert banners, highest layer

## 7. Do's and Don'ts

### Do

- **Use Luminous Yellow (`#E4F222`) for all primary CTAs** — it drives immediate visual hierarchy and conversion focus
- **Leverage whitespace aggressively** — surround major content blocks with 40px–64px margins
- **Maintain 16px minimum font size for body text** — ensures readability and accessibility across all devices
- **Apply subtle shadows (`rgba(0, 0, 0, 0.04)`) on card hover** — signals interactivity without visual noise
- **Use Primary Blue (`#5683D2`) for secondary actions and links** — consistent with enterprise fintech convention
- **Stack headings with 1:1 line-height** — projects confidence and premium positioning
- **Organize navigation using 14px–16px font** — maintains clarity in header hierarchy
- **Use `#E2E8F0` for borders and dividers** — provides subtle visual structure without harsh lines
- **Build pricing cards with 2px yellow border for premium tier** — immediately communicates value
- **Apply consistent 12px border-radius to cards** — unifies component aesthetic across product

### Don't

- **Don't use color weight for hierarchy** — Ramp uses only 400-weight font; rely on size and spacing instead
- **Don't apply decorative shadows to static elements** — shadows signal interaction, not ornamentation
- **Don't exceed 2–3 font sizes in a single layout** — limits cognitive load and maintains visual coherence
- **Don't mix border-radius scales within a component family** — consistency builds pattern recognition
- **Don't use opacity below 20% for text** — violates AA contrast requirements and reduces legibility
- **Don't stack more than two accent colors in proximity** — dilutes visual hierarchy
- **Don't use Deep Navy (`#001B4A`) for body text** — Primary Charcoal (`#0C0A08`) is the standard; Navy is reserved for maximum-contrast headings
- **Don't apply padding/margin inconsistently** — always align to the 4px base unit scale
- **Don't create buttons smaller than 44px height** — violates mobile touch target minimums
- **Don't render links without clear affordance** — apply underline on hover or use `#5683D2` color to distinguish from body text

## 8. Responsive Behavior

### Breakpoints

| Breakpoint    | Width         | Key Changes                                                                      |
| ------------- | ------------- | -------------------------------------------------------------------------------- |
| Mobile        | 375px–599px   | Single column, 16px padding, 24px margins, 14px body font, stacked cards         |
| Tablet        | 600px–1023px  | Two-column grid, 24px padding, 32px margins, 16px body font, 6-column layout     |
| Desktop       | 1024px–1439px | Three-column + grid, 40px padding, 48px margins, 16px body font, full navigation |
| Large Desktop | 1440px+       | Max-width 1440px container, 64px margins, full feature set                       |

### Touch Targets

- **Minimum touch target:** `44px × 44px` (buttons, interactive elements)
- **Recommended touch spacing:** `8px` gap between adjacent touch targets
- **Navigation items:** Minimum `44px` height, `16px` horizontal padding
- **Form fields:** Minimum `43px` height with comfortable hit area
- **Icon buttons:** `44px × 44px` at minimum for single-tap accuracy

### Collapsing Strategy

- **Hero section:** Reduce headline from `64px` to `40px` at tablet, `32px` at mobile
- **Subheading:** Collapse from `48px` to `32px` to `24px` across breakpoints
- **Navigation:** Switch from horizontal menu to hamburger at `600px` breakpoint
- **Card layout:** Three-column grid → two-column → single column at mobile
- **Spacing:** Reduce margins from `64px` to `48px` at tablet, `24px` at mobile
- **Padding:** Container padding reduces from `40px` to `24px` to `16px`
- **Form inputs:** Scale width from fixed to 100% fluid at mobile
- **Pricing cards:** Stack vertically on tablet, highlight featured tier with full width

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA:** Luminous Yellow (`#E4F222`) — "Get started for free" buttons, primary actions
- **Secondary Interactive:** Primary Blue (`#5683D2`) — links, secondary buttons, hover states
- **Heading Text:** Charcoal (`#0C0A08`) — all display text, h1–h6, body emphasis
- **Body Text:** Charcoal (`#0C0A08`) — default paragraph and content text
- **Background:** White (`#FFFFFF`) — cards, containers, primary surface
- **Secondary Background:** Light Gray (`#F2F5F9`) — feature sections, alternative surfaces
- **Borders:** Medium Gray (`#E2E8F0`) — dividers, card borders, subtle separation
- **Disabled/Muted:** Slate Gray (`#A0AEC0`) — placeholder text, disabled states, secondary labels
- **High-Contrast Text:** Deep Navy (`#001B4A`) — enterprise headings, max contrast
- **Accent Glow:** Luminous Yellow at 10–20% opacity — featured card shadow, emphasis states

### Iteration Guide

1. **Every button defaults to 44px height** — verify via `height: 44px` or equivalent padding/flex sizing; primary CTAs use Luminous Yellow, secondary use Primary Blue

2. **All body text is 14px–16px in DM Sans 400** — no bold, no italics; hierarchy through size alone (14px for small, 16px for standard, 18px–20px for emphasis)

3. **Cards always have 12px border-radius and 1px subtle border** — apply `border-radius: 12px; border: 1px solid rgba(33, 33, 33, 0.1)`; hover state adds `rgba(0, 0, 0, 0.04) 0px 2px 8px` shadow

4. **Spacing follows the 4px base unit** — gaps of 8px, 16px, 24px, 32px, 48px, 64px; never use arbitrary values like 13px or 29px

5. **Pricing cards use 2px yellow border for featured tier** — only the "Plus" plan gets `border: 2px solid #E4F222`; others use standard 1px gray border

6. **Navigation is 62px height at desktop** — apply `height: 62px` to header; text is 16px; logo and menu items align vertically with `16px` gap

7. **Form inputs have 10px border-radius and left-align padding at 24px** — apply `padding: 0px 16px 0px 24px` to accommodate icon; focus state adds blue box-shadow `0px 0px 0px 3px rgba(86, 131, 210, 0.1)`

8. **Hero headlines scale responsive: 64px desktop → 40px tablet → 32px mobile** — maintain 1:1 line-height ratio at all sizes for tight composition

9. **Opacity only applies to disabled states (40%) and overlays (60%)** — never render primary text below 90% opacity; placeholder text uses `#A0AEC0` color instead

10. **Dropdowns use complex multi-layer shadow for elevated presence** — apply the full dropdown shadow stack to signal nesting and depth; use z-index 6 or higher
