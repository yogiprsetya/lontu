# Spec: Expense Tracker

## Objective

Build a mobile-first, installable PWA for fast personal expense tracking. The core problem is recurring subscriptions silently draining money; the app must make logging an expense so quick that it actually happens, and make budget burn visible before month-end.

### User

Single user (you) for now. The auth layer and data model must be designed so multi-user signup can be added later without a data migration.

### User stories

1. As a user, I can log an expense in ~3 taps so that I capture it before the impulse fades.
2. As a user, I can set monthly budgets per custom category so that I know when I'm overspending.
3. As a user, I can see recurring/subscription expenses in one place so that I can identify forgotten ones and cancel them.

### Success criteria

- Expenses are logged in the moment (target: 3 taps from app open to saved).
- Budget warnings are visible before overspending.
- Forgotten subscriptions can be identified and cancelled.
- App is installable as a PWA on mobile.
- Google OAuth is the only auth method in v1.
- Multi-user-ready data model: no migration required to add multi-user signup later.

## Tech Stack

- **Framework:** Next.js 16.3.4 (App Router)
- **UI library:** React 19.2.8
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + `@tailwindcss/postcss`
- **Components:** shadcn/ui with Base UI primitives (`@base-ui/react`)
- **Icons:** Remix Icon (`@remixicon/react`)
- **Auth:** Google OAuth
- **Database:** PostgreSQL
- **ORM / query builder:** Drizzle
- **Validation library:** Zod
- **Form handling:** react-hook-form, @hookform/resolvers/zod
- **Deploy target:** VPS
- **Package manager:** pnpm 10.34.1
- **Auth library:** NextAuth.js v4
- **Currency:** Single currency (IDR) for v1
- **Offline strategy:** can view latest data
- **Test database:** mocking json

## Commands

```bash
# Development server
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint

# Run unit tests
pnpm test

# Database commands (TBD by chosen ORM)
# pnpm db:migrate
# pnpm db:generate
# pnpm db:studio
```

## Project Structure

```
app/
  api/                → API routes
  app/                → Main apps
    (overview)/
    spending/
    budget/
    recurring/
  login/              → Auth page
  globals.css         → Global styles / Tailwind imports
  layout.tsx          → Root layout
  page.tsx            → landing page
components/
  ui/                 → shadcn/ui base components
  layout/             → application shell
  expense/            → Expense-specific components
  budget/             → Budget-specific components
  subscription/       → Recurring/subscription components
config/
  db.ts               → Database client / connection
utils/
  auth.ts             → Google OAuth helpers
  css.ts              → Shared utilities
  validators.ts       → Input validation schemas
db/
  schema.ts           → Database schema definition
  migrations/         → Migration files
tests/
  *.spec.ts           → Unit / integration tests
.docs/
  intent/             → Confirmed intent documents
  ideas/              → Architecture notes and decisions
public/
  manifest.json       → PWA manifest
  icons/              → PWA icons
SPEC.md
CLAUDE.md
```

## Code Style

- TypeScript with strict mode enabled.
- Prefer server components by default; mark client components explicitly with `"use client"`.
- Use kebab-case for file names (`expense-form.tsx`).
- Use PascalCase for component names (`ExpenseForm`).
- Use camelCase for functions/variables; UPPER_SNAKE for constants.
- Mobile-first CSS: design for ~375px width, then scale up.
- Prefer `clsx` + `tailwind-merge` for class composition.
- Keep components small and focused; colocate tests next to source when a test framework supports it, otherwise under `tests/`.
- Validation happens at the API boundary and on the client for immediate feedback.

### Example component shape

```tsx
// components/expense/expense-form.tsx
import { cn } from '@/lib/utils';

interface ExpenseFormProps {
  className?: string;
}

export function ExpenseForm({ className }: ExpenseFormProps) {
  return <form className={cn('grid gap-4', className)}>{/* amount, category, note, save */}</form>;
}
```

## Testing Strategy

- **Unit / integration tests:** Node.js built-in test runner via `tsx --test tests/*.test.ts` (already configured).
- **Coverage:** No hard threshold in v1; add coverage reporting once the test suite matures.
- **Test scope:**
  - Pure utilities (currency formatting, budget math, recurrence calculations).
  - Database queries against a test database.
  - Auth callback handling.
- **E2E:** Deferred to a later phase; not required for v1 MVP.
- **Manual verification:** PWA installability and 3-tap log flow must be checked on a real mobile device or responsive emulator before calling a phase complete.

## Boundaries

### Always do

- Run `pnpm lint` and `pnpm test` before committing.
- Validate all user inputs at the API boundary.
- Keep the data model multi-user-ready (`user_id` as tenant key).
- Write tests for budget math, recurrence logic, and auth callbacks.
- Update this spec when scope or decisions change.

### Ask first

- Add a new major dependency (e.g., ORM, auth library, date library).
- Change the database schema after tables are in use.
- Change CI/CD configuration or deploy target.
- Add push notifications or email (explicitly out of scope for v1).
- Add bank/import feeds (explicitly out of scope for v1).
- Add shared household budgets (explicitly out of scope for v1).

### Never do

- Commit secrets, OAuth credentials, or database URLs.
- Edit generated/vendor directories directly.
- Remove or skip failing tests without approval.
- Deploy from an unreviewed branch.
- Add email/password auth, native apps, or detailed reports in v1.

## Phased Rollout

1. **Phase 0 — Skeleton:** Next.js + shadcn/ui baseline; confirm Google OAuth callback route; choose database tooling; first `users` and `expenses` tables.
2. **Phase 1 — Log an expense:** Home screen with recent categories; add expense flow (amount, category, note); history list with edit/delete; persistence + auth required.
3. **Phase 2 — Categories + budgets:** Custom categories with create/edit/archive; monthly budget per category; visual burn indicator; in-app warnings near/over limit.
4. **Phase 3 — Recurring lane:** Mark expenses as recurring with frequency; dedicated subscriptions view; optional "mark this period as spent" action.
5. **Phase 4 — PWA polish:** Manifest, icons, theme color, standalone display; service worker / cache strategy for offline add + later sync.
