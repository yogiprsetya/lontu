# Lontu design direction

The source of truth for how Lontu looks. Read it before touching UI; if the direction changes, update this file first, then the code. Tokens live in [app/globals.css](app/globals.css).

## Mood

Warm, cheerful, playful. Think of a sticker-covered notebook on a sunny desk: a cream page with a faint grid, a pastel hill of color behind the content, soft rounded cards, bright pastel tiles and a few bold candy-colored accents. It should feel like a happy companion app that greets you by name, not a bank dashboard. Money is still serious: numbers stay big, clear and aligned, and decoration never sits on top of a number.

One light theme: cream page, warm-white cards, near-black warm ink. There is no dark mode and no theme switcher.

## Color

All colors are tokens in `app/globals.css`, defined on `:root`. Don't write raw colors in components.

| Token | Role |
| --- | --- |
| `background` | Cream page (`#f8efe0`) |
| `card` / `popover` / `sidebar` | Raised surfaces, a step lighter than the page |
| `foreground` | Warm ink for text |
| `muted` / `muted-foreground` | Quiet fills (tracks, chips) and secondary text |
| `primary` | Pill CTAs: ink |
| `sunny` + `sunny-foreground` + `sunny-muted-foreground` + `sunny-alert` | The hero card and active nav state. On sunny, use only these `sunny-*` text tokens, never `foreground` |
| `mint`, `peach`, `lilac`, `sky` (+ `-foreground`) | Pastel tiles and page waves. Text on a tile uses its own `-foreground` or `foreground` |
| `mint-pop`, `peach-pop`, `lilac-pop`, `sky-pop` | Bold candy accents: icon squares (quick add, hero sticker) and the ok progress fill. Icons on them are white (≥ 3:1). Never put text on them |
| `income`, `expense`, `budget`, `transfer` | Amount and status text tones |
| `chart-1..5` | Chart slices, in the same pastel family |

Fixed meaning per transaction type. Keep it identical everywhere (tiles, chips, add menu):

| Type | Tile | Pop | Text tone | Icon |
| --- | --- | --- | --- | --- |
| Income | `mint` | `mint-pop` | `income` | `ArrowDownLeftIcon` |
| Expense | `peach` | `peach-pop` | `expense` | `ArrowUpRightIcon` |
| Saving | `lilac` | `lilac-pop` | `budget` | `PiggyBankIcon` |
| Transfer | `sky` | `sky-pop` | `transfer` | `ArrowLeftRightIcon` |

Use `TypeChip` and `TYPE_STYLES` from [components/transactions/type-chip.tsx](components/transactions/type-chip.tsx) rather than repeating the mapping.

Contrast is checked: every text token is at least 4.5:1 on the surfaces it is used on. Every `-foreground` passes on its own tile, and the tone colors pass on `card`, `background` and every pastel tile. If you add a pairing, check it. [tests/unit/color-tokens.spec.ts](tests/unit/color-tokens.spec.ts) enforces the tone and chart rules: chart slices need chroma ≥ 0.1, hues at least 40° apart and 3:1 on `background`.

## Typography

- **Display: Baloo 2** (`font-heading`, weights 600 to 800). Use it for page titles, card titles, the hero amount and big numbers in tiles. Chunky, rounded, friendly.
- **Body: Nunito** (`font-sans`). Use it for everything else. Nunito's rounded terminals match Baloo.
- Page title (h1): `PageTitle` from [components/layout/page-title.tsx](components/layout/page-title.tsx): `font-heading text-3xl font-extrabold tracking-tight`. Pass `className` for layout extras such as `truncate` or an inline chip.
- Card title (h2): `SectionTitle` from [components/layout/section-title.tsx](components/layout/section-title.tsx): `font-heading text-lg font-bold` with a pastel icon chip in front. Pick a tone that isn't already dominant in that card.
- Eyebrow label (above a hero value, a group heading): `text-xs font-bold uppercase tracking-[0.14em]`.
- Hero amount: `font-heading text-4xl font-extrabold`. Tile amount: `font-heading text-xl font-extrabold`.
- Money stays `tabular-nums` (already on `<body>`).
- Fields: `Input`, `SelectTrigger` and `SelectItem` are `h-11` (items `min-h-11`) with 16 px semibold values on every breakpoint; placeholders stay normal weight so a filled field reads differently from an empty one. `Label` is `text-base font-semibold`; hints are `text-sm`, errors `text-sm font-semibold` (`fieldMessageClass` in [components/forms/field-styles.ts](components/forms/field-styles.ts)). The amount in `MoneyInput` is `Input variant="amount"` (`text-lg font-bold`) because it is the field the form exists for.

## Surfaces and shape

- **Page**: `bg-background` with a faint grid at the top that fades out (`body::before`), plus one pastel **wave** (`PageWave` in the app layout): a curved hill starting under the page title and fading out down the page. It is drawn at 60% opacity so full-strength tiles on top still stand apart. Each area has its own color: dashboard `peach`, transactions and expenses `sky`, budget `lilac`, settings `mint`; add pages follow their type. Pick a wave color that no tile on that page uses. Add new routes to the map in [components/layout/page-wave.tsx](components/layout/page-wave.tsx). Don't add more page-level texture.
- **Card**: the `surface` utility: `card` fill, `rounded-2xl`, soft warm shadow, **no border**. Default padding `px-5 py-5`. Use this for every content block (lists, charts, the add/edit forms; their sticky Simpan bar is `bg-card` so it blends into the card).
- **Hero**: one per screen at most. `rounded-[1.75rem] bg-sunny bg-dots text-sunny-foreground`, holding the most important number (total balance on the dashboard). It wears a **sticker**: a tilted `peach-pop` icon square with a `ring-card` outline, half over the top-right edge, where the reference puts its mascot.
- **Tile**: small pastel block for a single stat: `rounded-2xl bg-<pastel> text-<pastel>-foreground px-4 py-4 shadow-soft`. Group in grids of 2 to 4.
- **List inside a card**: `surface divide-y px-4`, rows `min-h-16` with a `TypeChip` on the left, title + meta in the middle, amount on the right.
- **Empty state**: dashed outline `rounded-2xl border-2 border-dashed`, centered muted text and one pill CTA.
- **Radius scale** (`--radius: 0.875rem`): `rounded-md` is the control radius, fixed at 22 px so every `h-11` button, input and select is a pill; `rounded-xl` ≈ 20 px (chips, icon squares, nav items), `rounded-2xl` ≈ 25 px (cards, tiles), `rounded-full` (FAB, badges). Nothing sharp.
- **Borders** only on inputs, outline buttons and dashed empty states. Separate things with fill and space, not lines.

## Components

- **Primary CTA**: dark ink pill (`Button` default variant and size: `h-11`, 16 px; the pill comes from `--radius-md`). Inside the sunny hero, use `variant="sunny"` so it stays dark on the yellow.
- **Icon chip**: `size-11 rounded-xl` pastel square with a 20 px lucide icon (`TypeChip`).
- **Quick add** (dashboard, after the hero): four `size-14` `*-pop` squares with white 28 px icons and a bold label below, one per type. This replaces the reference's illustrated app-icon menu.
- **Bottom nav**: card-colored bar with a rounded top edge and a soft upward shadow. The active item gets a `bg-sunny` pill behind its icon and a bold label. The center FAB is an ink circle (`Button size="fab"`, `size-14`) that sits slightly above the bar.
- **Sidebar (lg)**: `sidebar` surface, display-font logo, active item `bg-sunny text-sunny-foreground rounded-xl font-bold`. No add button in the sidebar: on lg the same ink FAB floats at the bottom right (`fixed right-8 bottom-8`) and its menu opens upward.
- **Progress bar**: `h-2.5 rounded-full`, `muted` track, `mint-pop` fill when ok, `budget` for warning, `expense` for over.
- **Segmented choices** (chips, `ToggleGroup`): pills; the selected one is ink-filled (`bg-primary text-primary-foreground`).
- **Primitives own their look.** `components/ui/` is edited to match this file, so a primitive looks right with no `className`. Where a primitive is used, `className` only places it: width, flex/grid placement, margins, position, visibility, `sr-only`. Height, padding, type, color, radius, shadow and state styles go in the primitive as a default or a variant; if a use needs a new look, add a variant. Boxes with no look of their own (`Skeleton`, `ChartContainer`, `ScrollArea`, `Tabs`) may also take a size and inner spacing. [tests/unit/ui-usage.spec.ts](tests/unit/ui-usage.spec.ts) enforces it. Re-adding a primitive from the shadcn CLI overwrites these edits, so diff and re-apply them.
- Variants beyond the registry:
  - `Button`: sizes are `h-11` (default), `sm` `h-9`, `lg` `h-12`, `icon` `size-11 rounded-xl`, `icon-lg` `size-14 rounded-2xl`, `fab`. Variants `sunny` (CTA on the hero), `raised` (card-colored icon square that turns sunny on hover and when pressed: hide amounts, settings) and `field` (a trigger that reads as an input: date, day of month). Destructive actions use `destructive`.
  - `Input variant="amount"`, `SelectTrigger variant="raised" size="lg"` (period stepper), `Label variant="row"` (a whole row labelling a switch, 44 px tall), `DropdownMenuRadioItem variant="cell"` (one square of a picker grid), `Skeleton variant="circle"`.
  - Menus, select lists and popovers are `rounded-2xl` with `rounded-xl`, `min-h-11`, 16 px items. `Skeleton` is `rounded-2xl`. `DrawerFooter` clears the iOS home indicator.

## Mascot and illustration

The reference uses an illustrated cat mascot. Lontu has no illustration assets yet, so the hero sticker and the pop icon squares stand in for it. If a mascot is added later, it replaces the hero sticker and may appear in empty states, and stays decorative (`alt=""`).

The dashboard greets by first name with a waving-hand emoji and a time-of-day line (`greetingInJakarta`: Selamat pagi / siang / sore / malam). Keep emoji to that one spot.

## Motion

Playful but quick. Tappable tiles squish on press (`motion-safe:active:scale-[0.98]`, icon squares `scale-95`), quick-add squares tilt on hover, the FAB plus turns on hover. Color transitions on hover. No bouncy entrances, no parallax, nothing that loops. Every transform goes behind `motion-safe:`.

## Mobile rules (unchanged from CLAUDE.md)

Works at 360 px, touch targets ≥ 44×44 px, input font 16 px, text contrast ≥ 4.5:1.

## Don't

- Don't use pure white, pure black or neutral greys for surfaces. Everything is tinted warm.
- Don't put `text-foreground` or `text-muted-foreground` on `bg-sunny`; use the `sunny-*` text tokens.
- Don't add borders around cards or use more than one hero per screen.
- Don't use the pastel tiles for anything other than a stat or a type cue; long content goes on `surface`.
- Don't introduce gradients (beyond the masks that fade the grid and wave), glassmorphism or neon accents.
- Don't put text on `*-pop` colors, or decoration (stickers, waves) over numbers.
