# Lontu design direction

The source of truth for how Lontu looks. Read it before touching UI; if the direction changes, update this file first, then the code. Tokens live in [app/globals.css](app/globals.css).

## Mood

Warm, friendly, calm. Think of a paper notebook on a sunny desk: a cream page with a faint grid, soft rounded cards and pastel tiles. It should feel like a cozy companion app, not a bank dashboard. Money is still serious: numbers stay big, clear and aligned.

Two themes, same mood:

- **Light**: cream page, warm-white cards, near-black warm ink.
- **Dark**: warm espresso page (never pure black or cool grey), slightly lighter cards, muted deep pastel tiles. The sunny hero card **stays bright yellow** in dark mode; it is the one warm light on the screen.

## Color

All colors are tokens in `app/globals.css`, defined for `:root` and `.dark`. Don't write raw colors in components.

| Token | Role |
| --- | --- |
| `background` | Cream page (`#f8efe0` light, `#1d1914` dark) |
| `card` / `popover` / `sidebar` | Raised surfaces, a step lighter than the page |
| `foreground` | Warm ink for text |
| `muted` / `muted-foreground` | Quiet fills (tracks, chips) and secondary text |
| `primary` | Pill CTAs: ink in light, sunny in dark |
| `sunny` + `sunny-foreground` + `sunny-muted-foreground` + `sunny-alert` | The hero card and active nav state. Same in both themes. On sunny, use only these `sunny-*` text tokens, never `foreground` |
| `mint`, `peach`, `lilac`, `sky` (+ `-foreground`) | Pastel tiles. Text on a tile uses its own `-foreground` or `foreground` |
| `income`, `expense`, `budget`, `transfer` | Amount and status text tones |
| `chart-1..5` | Chart slices, in the same pastel family |

Fixed meaning per transaction type. Keep it identical everywhere (tiles, chips, add menu):

| Type | Tile | Text tone | Icon |
| --- | --- | --- | --- |
| Income | `mint` | `income` | `ArrowDownLeftIcon` |
| Expense | `peach` | `expense` | `ArrowUpRightIcon` |
| Saving | `lilac` | `budget` | `PiggyBankIcon` |
| Transfer | `sky` | `transfer` | `ArrowLeftRightIcon` |

Use `TypeChip` and `TYPE_STYLES` from [components/transactions/type-chip.tsx](components/transactions/type-chip.tsx) rather than repeating the mapping.

Contrast is checked: every text token is at least 4.5:1 on the surfaces it is used on, in both themes. Every `-foreground` passes on its own tile, and the tone colors pass on `card`, `background` and every pastel tile. If you add a pairing, check it. [tests/unit/color-tokens.spec.ts](tests/unit/color-tokens.spec.ts) enforces the tone and chart rules: chart slices need chroma ≥ 0.1, hues at least 40° apart and 3:1 on `background`.

## Typography

- **Display: Baloo 2** (`font-heading`, weights 600 to 800). Use it for page titles, card titles, the hero amount and big numbers in tiles. Chunky, rounded, friendly.
- **Body: Nunito** (`font-sans`). Use it for everything else. Nunito's rounded terminals match Baloo.
- Page title: `font-heading text-3xl font-extrabold tracking-tight`.
- Card title (h2): `font-heading text-lg font-bold`.
- Eyebrow label (above a hero value, a group heading): `text-xs font-bold uppercase tracking-[0.14em]`.
- Hero amount: `font-heading text-4xl font-extrabold`. Tile amount: `font-heading text-xl font-extrabold`.
- Money stays `tabular-nums` (already on `<body>`). Inputs keep 16 px.

## Surfaces and shape

- **Page**: `bg-background` with a faint grid at the top that fades out (`body::before`). Content sits on top; don't add more page-level texture.
- **Card**: the `surface` utility: `card` fill, `rounded-2xl`, soft warm shadow, **no border**. Default padding `px-5 py-5`. Use this for every content block (lists, charts, forms in a frame).
- **Hero**: one per screen at most. `rounded-[1.75rem] bg-sunny bg-dots text-sunny-foreground`, holding the most important number (total balance on the dashboard).
- **Tile**: small pastel block for a single stat: `rounded-2xl bg-<pastel> text-<pastel>-foreground px-4 py-4`. Group in grids of 2 to 4.
- **List inside a card**: `surface divide-y px-4`, rows `min-h-16` with a `TypeChip` on the left, title + meta in the middle, amount on the right.
- **Empty state**: dashed outline `rounded-2xl border-2 border-dashed`, centered muted text and one pill CTA.
- **Radius scale** (`--radius: 0.875rem`): `rounded-md` is the control radius, fixed at 22 px so every `h-11` button, input and select is a pill; `rounded-xl` ≈ 20 px (chips, icon squares, nav items), `rounded-2xl` ≈ 25 px (cards, tiles), `rounded-full` (FAB, badges). Nothing sharp.
- **Borders** only on inputs, outline buttons and dashed empty states. Separate things with fill and space, not lines.

## Components

- **Primary CTA**: dark ink pill (`Button` default variant, `h-11`; the pill comes from `--radius-md`). Inside the sunny hero, use `bg-sunny-foreground text-sunny` so it stays dark in both themes.
- **Icon chip**: `size-11 rounded-xl` pastel square with a 20 px lucide icon (`TypeChip`). This replaces the reference's illustrated app icons.
- **Bottom nav**: card-colored bar with a rounded top edge and a soft upward shadow. The active item gets a `bg-sunny` pill behind its icon and a bold label. The center FAB is an ink circle (`size-14`) that sits slightly above the bar.
- **Sidebar (lg)**: `sidebar` surface, display-font logo, active item `bg-sunny text-sunny-foreground rounded-xl font-bold`.
- **Progress bar**: `h-2.5 rounded-full`, `muted` track, ink fill when ok, `budget` for warning, `expense` for over.
- **Segmented choices** (theme toggle, chips): `rounded-full` pills; the selected one is ink-filled (`bg-primary text-primary-foreground`).
- shadcn primitives in `components/ui/` are not hand-edited. They pick up the look through tokens. Override per use with `className`; `cn` merges Tailwind conflicts.

## Mascot and illustration

The reference uses an illustrated cat mascot. Lontu has no illustration assets yet, so screens use pastel icon chips and the sunny hero instead. If a mascot is added later, it goes on the hero card's top-right corner and in empty states only, and stays decorative (`alt=""`).

## Motion

Subtle. Color transitions on hover/press, `translate-y-px` press feedback from the button primitive. No bouncy entrances, no parallax. Respect `prefers-reduced-motion`.

## Mobile rules (unchanged from CLAUDE.md)

Works at 360 px, touch targets ≥ 44×44 px, input font 16 px, text contrast ≥ 4.5:1.

## Don't

- Don't use pure white, pure black or neutral greys for surfaces. Everything is tinted warm.
- Don't put `text-foreground` or `text-muted-foreground` on `bg-sunny`; in dark mode they turn light.
- Don't add borders around cards or use more than one hero per screen.
- Don't use the pastel tiles for anything other than a stat or a type cue; long content goes on `surface`.
- Don't introduce gradients, glassmorphism or neon accents.
