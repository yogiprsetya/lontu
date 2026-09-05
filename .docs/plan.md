# Implementation Plan: Expense Tracker MVP

## Overview

This plan records the completed foundation and core expense slice, then breaks the remaining v1 work into independently verifiable vertical slices: category management, monthly budget visibility, recurring subscriptions, and PWA/offline read support. The existing app already has multi-user-scoped tables for all of these concepts, authenticated expense CRUD, and the dashboard shell; remaining work should extend those boundaries rather than replace them.

## Capability Map

| Module id      | Responsibility                                 | Depends on            |
| -------------- | ---------------------------------------------- | --------------------- |
| `db`           | Drizzle ORM config, schema, migrations         | —                     |
| `auth`         | Google OAuth sign-in, sessions, callback route | —                     |
| `expense`      | Add, edit, delete, list expenses               | `db`, `auth`          |
| `category`     | Custom categories with create/archive          | `db`, `auth`          |
| `budget`       | Monthly budgets + burn warnings                | `category`            |
| `subscription` | Recurring configs + subscriptions view         | `expense`, `category` |
| `pwa`          | Manifest, icons, service worker, offline       | app shell             |

**Build order (MVP):** `db` → `auth` → `expense`  
**Future order:** `category` → `budget` → `subscription` → `pwa`

## Architecture Decisions

- **Database access:** Drizzle ORM with PostgreSQL, because the spec calls for persistence, multi-user-ready schema, and typed queries. SQLite with mocking is rejected in favor of real persistence.
- **Auth:** NextAuth.js v4 (Auth.js) with Google provider, because it handles OAuth callbacks, refresh tokens, and session management with less boilerplate than a manual flow.
- **Currency:** Single currency IDR for v1, stored as integer cents/rupiah.
- **Testing:** Unit tests via `pnpm test` for pure utilities and DB queries; manual/mobile verification for the 3-tap flow.
- **Project paths:** Keep `~/utils/css` as the alias for shared utilities; align existing `app/layout.tsx` `cn` import to `~/utils/css` in a later style-cleanup task to avoid drift.

## Dependency Graph (MVP)

```
Drizzle config + schema.ts
    │
    ├── migrations/
    │
    └── lib/db.ts (typed DB client)
            │
            ├── auth.ts / NextAuth config
            │       │
            │       └── app/api/auth/[...nextauth]/route.ts
            │
            ├── app/api/expenses/route.ts
            │       │
            │       └── components/expense/expense-form.tsx
            │
            └── app/api/expenses/[id]/route.ts
                    │
                    └── components/expense/expense-list.tsx
```

## Task List

### Phase 1: Foundation

- [x] **Task 1: Install and configure Drizzle ORM**
  - Add Drizzle dependencies and `drizzle.config.ts`.
  - Create `config/db.ts` (typed DB client) and `.env.example` with `DATABASE_URL`.
  - Define schema in `db/schema.ts` for `users`, `categories`, `budgets`, `expenses`, `recurring_configs`.
  - Create an initial migration and run it against the Postgres database.
  - **Acceptance:** `pnpm db:migrate` succeeds; `pnpm db:studio` shows all MVP tables.
  - **Verification:** Run `pnpm db:migrate` and `pnpm db:studio` and confirm tables.
  - **Dependencies:** None.
  - **Files likely touched:** `package.json`, `drizzle.config.ts`, `config/db.ts`, `db/schema.ts`, `db/migrations/*`, `.env.example`.
  - **Estimated scope:** M.

- [x] **Task 2: Set up NextAuth.js v4 with Google OAuth**
  - Install `@auth/core` / `next-auth` v5 beta and configure `auth.ts`.
  - Create `app/api/auth/[...nextauth]/route.ts`.
  - Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.example`.
  - Protect routes by checking session on server; redirect unauthenticated users to `/login`.
  - **Acceptance:** User can sign in with Google; session is available server-side; unauthenticated requests are redirected.
  - **Verification:** Start dev server, visit `/login`, complete OAuth flow, confirm session cookie exists, confirm `/api/auth/session` returns user.
  - **Dependencies:** Task 1.
  - **Files likely touched:** `package.json`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx`, middleware or route guards.
  - **Estimated scope:** M.

### Checkpoint: Foundation Ready

- [x] `pnpm build` succeeds.
- [x] `pnpm test` passes (or has no failing tests).
- [x] Database is migrated and reachable.
- [x] Google OAuth flow works on localhost.
- [x] Review with human before continuing.

### Phase 2: Core Expense Flow

- [x] **Task 3: Create the mobile home screen shell**
  - Replace the default Next.js landing page in `app/page.tsx`.
  - Build a mobile-first layout with header, recent-categories grid, and quick-actions.
  - Ensure the page is protected (unauthenticated users see login prompt or are redirected).
  - **Acceptance:** Home screen renders on mobile viewport; layout is usable; auth guard works.
  - **Verification:** Run `pnpm dev`, open DevTools mobile viewport, confirm home screen loads and looks correct.
  - **Dependencies:** Task 2.
  - **Files likely touched:** `app/page.tsx`, `app/layout.tsx` (minor), new `components/dashboard/*.tsx`.
  - **Estimated scope:** S–M.

- [x] **Task 4: Implement the add-expense flow (3 taps)**
  - Create `components/expense/expense-form.tsx` with amount input, category selector, and save button.
  - Build `app/api/expenses/route.ts` POST endpoint with input validation.
  - On save, refresh the UI to show the new expense immediately.
  - Enforce the UX contract: category tap + amount + save = 3 taps.
  - **Acceptance:** User can select a category, enter an amount, and save an expense; input validation rejects invalid amounts; expense persists to the database.
  - **Verification:** Manual test on mobile viewport; unit test for validation; confirm row appears in DB.
  - **Dependencies:** Tasks 2–3.
  - **Files likely touched:** `components/expense/expense-form.tsx`, `app/api/expenses/route.ts`, `lib/validators.ts`, `tests/expense*.test.ts`.
  - **Estimated scope:** M.

- [x] **Task 5: Implement expense history with edit and delete**
  - Create `components/expense/expense-list.tsx` showing recent expenses grouped by date.
  - Add GET endpoint in `app/api/expenses/route.ts`.
  - Add PATCH and DELETE endpoints in `app/api/expenses/[id]/route.ts`.
  - Allow editing amount, category, note, and date; soft behavior for deletion (or hard delete with confirmation).
  - **Acceptance:** User can view, edit, and delete expenses; changes persist; list updates after mutation.
  - **Verification:** Manual test edit/delete flows; run `pnpm test` for history ordering and mutation helpers. Automated suite passes; manual flow remains pending.
  - **Dependencies:** Task 4.
  - **Files likely touched:** `components/expense/expense-list.tsx`, `components/expense/expense-card.tsx`, `app/api/expenses/route.ts`, `app/api/expenses/[id]/route.ts`, `tests/expense*.test.ts`.
  - **Estimated scope:** M.

- [x] **Task 6: Wire the 3-tap end-to-end flow and verify**
  - Connect home screen to expense form and list.
  - Add optimistic UI or revalidation so the screen feels instant.
  - Remove/redirect the default Next.js landing content.
  - **Acceptance:** Full flow — open app → tap category → enter amount → tap save — results in a persisted expense shown in history within ~3 taps; desktop view is also usable.
  - **Verification:** Manual click/tap test on Chrome mobile emulator; confirm DB rows; run `pnpm build && pnpm lint && pnpm test`.
  - **Dependencies:** Tasks 3–5.
  - **Files likely touched:** `app/page.tsx`, `app/layout.tsx`.
  - **Estimated scope:** S.

### Checkpoint: MVP Core Complete

- [x] `pnpm build` succeeds.
- [x] `pnpm lint` passes.
- [x] `pnpm test` passes.
- [x] 3-tap add-expense flow works end-to-end.
- [x] History edit/delete works end-to-end.
- [x] Review with human before Phase 3.

## Continuation Plan

The completed Tasks 1–6 above are the baseline. The following tasks are the proposed implementation scope for the remaining v1 requirements.

### Phase 3: Categories and Budgets

#### Task 7: Manage user-owned categories [x]

**Description:** Add an authenticated category API and management UI so a user can create, rename, and archive custom categories without exposing another user's data. Preserve archived categories on existing expenses and exclude them from quick-add choices by default.

**Acceptance criteria:**

- [ ] Authenticated GET/POST/PATCH routes enforce `user_id` ownership and validate names/colors.
- [ ] The UI supports create, rename, and archive; duplicate names are handled deterministically.
- [ ] Archived categories remain readable on historical expenses but cannot be selected for new expenses.

**Verification:** Add validator and route contract tests; run `pnpm test` and `pnpm lint`; manually create, rename, archive, and use a category at 375px width.

**Dependencies:** Completed Tasks 1–6.

**Files likely touched:** `db/schema.ts`, `app/api/categories/route.ts`, `app/api/categories/[id]/route.ts`, `components/category/*`, `components/expense/expense-form.tsx`, `tests/category.spec.ts`.

**Estimated scope:** M.

#### Task 8: Create and display monthly category budgets

**Description:** Implement budget CRUD for a user/category/month and connect it to the spending dashboard. Enforce one budget per category and calendar month, with IDR stored as an integer consistent with expenses.

**Acceptance criteria:**

- [ ] A user can create, update, and remove a budget for a custom category and selected month.
- [ ] Budget reads and writes are scoped by both `user_id` and category ownership.
- [ ] The dashboard shows the selected month's budget and spent totals per category.

**Verification:** Add budget validator/math tests for empty, positive, duplicate-month, and cross-user cases; run `pnpm test`, `pnpm lint`, and `pnpm build`; manually exercise the budget form and refresh the page.

**Dependencies:** Task 7.

**Files likely touched:** `app/api/budgets/route.ts`, `app/api/budgets/[id]/route.ts`, `utils/validators.ts`, `components/budget/*`, `components/dashboard/spending-overview.tsx`, `tests/budget.spec.ts`.

**Estimated scope:** M.

#### Task 9: Add budget burn warnings to the core flow [x]

**Description:** Calculate current-month spend against each budget and expose clear near-limit and over-limit states in the dashboard without changing expense logging behavior.

**Acceptance criteria:**

- [x] Burn percentage and remaining/overage amounts use integer IDR math and current calendar month boundaries.
- [x] Warning states appear at the agreed near-limit threshold and when spending exceeds budget.
- [x] Categories without a budget remain usable and do not produce misleading warnings.

**Verification:** Unit-test month boundaries, zero/large budgets, exact-limit, near-limit, and over-limit cases; manually verify warning states with representative data at mobile and desktop widths.

**Dependencies:** Task 8.

**Files likely touched:** `utils/budget-math.ts`, `components/budget/budget-progress.tsx`, `components/dashboard/overview-metrics.tsx`, `components/dashboard/spending-overview.tsx`, `tests/budget.spec.ts`.

**Estimated scope:** S–M.

### Checkpoint: Categories and Budgets

- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` pass.
- [ ] Category ownership and archived-category behavior are verified.
- [ ] A budget can be set and its burn/warning state changes as expenses are added or edited.
- [ ] Human review confirms the mobile dashboard is understandable before recurring work begins.

### Phase 4: Recurring Subscriptions

#### Task 10: Mark expenses as recurring [x]

**Description:** Extend the expense workflow with an optional recurring configuration that records frequency, start date, and active state while retaining the original expense record.

**Acceptance criteria:**

- [ ] A user can create or update a recurring configuration from an expense.
- [ ] Frequency, amount, category, and start date are validated at the API boundary.
- [ ] Every recurring read/write is scoped to the authenticated user and related category.

**Verification:** Add recurrence validator tests for supported frequencies, invalid dates, and ownership; run `pnpm test`, `pnpm lint`, and `pnpm build`; manually mark and unmark a subscription.

**Dependencies:** Tasks 7–9.

**Files likely touched:** `utils/recurrence.ts`, `utils/validators.ts`, `app/api/expenses/[id]/route.ts`, `app/api/recurring/route.ts`, `components/expense/expense-form.tsx`, `tests/recurring.spec.ts`.

**Estimated scope:** M.

#### Task 11: Deliver the subscriptions view and period tracking

**Description:** Add a dedicated recurring view showing active subscriptions, next expected occurrence, and a user action to mark the current period as spent without creating duplicate configurations.

**Acceptance criteria:**

- [ ] Active recurring expenses are listed with amount, category, frequency, and next occurrence.
- [ ] Users can deactivate a recurring item and identify which subscriptions need cancellation outside the app.
- [ ] “Mark this period as spent” creates one correctly linked expense and is idempotent for that period.

**Verification:** Unit-test next-occurrence and idempotency calculations; add route contract tests; run `pnpm test`, `pnpm lint`, and `pnpm build`; manually verify the recurring lane from mobile navigation.

**Dependencies:** Task 10.

**Files likely touched:** `app/app/recurring/page.tsx`, `app/api/recurring/route.ts`, `app/api/recurring/[id]/route.ts`, `components/subscription/*`, `utils/recurrence.ts`, `tests/recurring.spec.ts`.

**Estimated scope:** M.

### Checkpoint: Recurring Lane

- [ ] Recurrence calculations cover monthly/yearly boundary cases and pass tests.
- [ ] Current-period marking cannot duplicate a charge on repeated requests.
- [ ] Subscriptions are discoverable from the app shell and usable at 375px width.
- [ ] Human review confirms the view supports identifying forgotten subscriptions; cancellation remains an external user action in v1.

### Phase 5: PWA and Offline Read Support

#### Task 12: Make the app installable as a PWA

**Description:** Add the web app manifest, stable icons, theme metadata, and standalone display behavior while preserving the existing authenticated app shell.

**Acceptance criteria:**

- [ ] Manifest has valid name, start URL, icons, theme/background colors, and standalone display.
- [ ] Icons exist at the declared sizes and the app passes browser installability checks.
- [ ] Standalone launch opens the authenticated app entry point without layout regressions.

**Verification:** Run `pnpm build` and inspect the manifest/icon requests; use Chrome DevTools Application > Manifest at mobile dimensions; manually install and launch on a real device or responsive emulator.

**Dependencies:** Completed Tasks 1–6; Tasks 7–11 should not be required for installability.

**Files likely touched:** `app/layout.tsx`, `app/manifest.ts`, `public/icons/*`, `public/manifest.json` if retained, `tests/pwa.spec.ts`.

**Estimated scope:** S.

#### Task 13: Cache latest authenticated data for offline viewing

**Description:** Add a service worker/cache strategy limited to the app shell and latest read data. Offline writes are explicitly deferred unless a later decision adds a durable queue and conflict policy.

**Acceptance criteria:**

- [ ] Previously visited dashboard/history content remains viewable after network loss.
- [ ] Mutating requests fail clearly while offline and do not claim data was saved.
- [ ] Cached data is user/session-safe and is invalidated when the app version changes or the user signs out.

**Verification:** Add a focused service-worker/cache contract test where practical; run `pnpm lint`, `pnpm test`, and `pnpm build`; use DevTools offline mode to reload the dashboard and attempt an expense save.

**Dependencies:** Task 12.

**Files likely touched:** `public/sw.js` or `app/sw.ts`, `app/layout.tsx`, `components/swr-provider.tsx`, `components/expense/expense-form.tsx`, `tests/pwa.spec.ts`.

**Estimated scope:** M.

### Checkpoint: v1 Complete

- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` pass.
- [ ] Manual mobile verification covers installability, offline latest-data viewing, and the three-tap expense path while online.
- [ ] No secrets are committed; OAuth and database configuration remain environment-based.
- [ ] All user-scoped queries include the authenticated `user_id` tenant key.
- [ ] SPEC.md reflects any approved threshold, frequency, offline, or schema decisions made during implementation.
- [ ] Human review approves the v1 release scope before deployment.

## Risks and Mitigations

| Risk                                                     | Mitigation                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| NextAuth.js v5 beta instability                          | Pin an exact version; isolate auth config in `auth.ts`; keep fallback route if API changes. |
| Schema changes after deployment                          | Treat schema as additive; use migrations; avoid destructive changes once data exists.       |
| Mobile UX feels slow                                     | Use server actions or optimistic UI; keep form fields minimal; test on real device.         |
| OAuth callback mismatch between localhost and production | Use env vars for origin; document callback URLs.                                            |

## Open Questions

1. Should seed/default categories be created automatically for new users?
2. Do we want server actions or REST API routes for mutations?
3. How should optimistic updates/revalidation work — `revalidatePath`, `router.refresh`, or TanStack Query?
