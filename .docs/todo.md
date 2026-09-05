# Expense Tracker MVP — Task List

## Phase 1: Foundation

- [x] **Task 1: Install and configure Drizzle ORM**
  - Acceptance:
    - [x] `pnpm db:migrate` succeeds against a real Postgres database.
    - [x] `pnpm db:studio` shows all MVP tables: `users`, `categories`, `budgets`, `expenses`, `recurring_configs`.
    - [x] `.env.example` documents `DATABASE_URL`.
  - Verify:
    - [x] Run `pnpm db:migrate`.
    - [x] Run `pnpm db:studio` and inspect tables.
    - [x] Run `pnpm build` to confirm no TypeScript errors.
  - Depends on: —
  - Files: `package.json`, `drizzle.config.ts`, `config/db.ts`, `db/schema.ts`, `db/migrations/*`, `.env.example`

- [x] **Task 2: Set up NextAuth.js v4 with Google OAuth**
  - Acceptance:
    - [x] User can sign in with Google on `/login`.
    - [x] Session is available server-side.
    - [x] Unauthenticated requests are redirected to `/login`.
  - Verify:
    - [x] Start `pnpm dev`, complete OAuth flow, confirm session cookie exists.
    - [x] Visit a protected route while logged out and confirm redirect.
    - [x] Run `pnpm test` to confirm no regressions.
  - Depends on: Task 1
  - Files: `package.json`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx`, route/session guards

## Checkpoint: Foundation Ready

- [x] `pnpm build` succeeds.
- [x] `pnpm test` passes.
- [x] Database is migrated and reachable.
- [x] Google OAuth flow works on localhost.
- [x] Review with human before continuing.

## Phase 2: Core Expense Flow

- [x] **Task 3: Create the mobile home screen shell**
  - Acceptance:
    - [x] `app/app/page.tsx` renders the mobile-first dashboard shell.
    - [x] Auth guard works (anonymous users see `/login` or are redirected).
    - [x] Layout is usable down to 375px width.
  - Verify:
    - [x] Run `pnpm dev`, open Chrome DevTools at 375px width, confirm layout.
    - [x] Visit `/` in an incognito window and confirm redirect/login prompt.
    - [x] Run `pnpm lint`.
  - Depends on: Task 2
  - Files: `app/app/page.tsx`, `app/app/layout.tsx`, `components/dashboard/*.tsx`

- [x] **Task 4: Implement the add-expense flow (3 taps)**
  - Acceptance:
    - [x] Category + amount + save creates a persisted expense.
    - [x] Invalid amounts are rejected.
    - [x] New expense appears in the UI immediately after save.
  - Verify:
    - [x] Manual mobile-emulator test: tap category → type amount → tap save.
    - [x] Unit test for amount validation in `tests/expense*.test.ts`.
    - [x] Confirm row appears in database.
  - Depends on: Tasks 2–3
  - Files: `components/expense/expense-form.tsx`, `app/api/expenses/route.ts`, `lib/validators.ts`, `tests/expense*.test.ts`

- [x] **Task 5: Implement expense history with edit and delete**
  - Acceptance:
    - [x] Recent expenses are listed, grouped by date.
    - [x] User can edit amount, category, note, and date.
    - [x] User can delete an expense with confirmation.
    - [x] Mutations persist and list updates.
  - Verify:
    - [x] Manual test edit and delete flows.
    - [x] Unit/integration test for history ordering and mutation helpers.
    - [x] Run `pnpm test`.
  - Depends on: Task 4
  - Files: `components/expense/expense-list.tsx`, `components/expense/expense-card.tsx`, `app/api/expenses/route.ts`, `app/api/expenses/[id]/route.ts`, `tests/expense*.test.ts`

- [x] **Task 6: Wire the 3-tap end-to-end flow and verify**
  - Acceptance:
    - [x] Full 3-tap flow results in a persisted expense shown in history.
    - [x] Default Next.js landing content is removed.
    - [x] Desktop view remains usable.
  - Verify:
    - [x] Manual click/tap test on Chrome mobile emulator.
    - [x] Confirm DB rows after multiple saves.
    - [x] Run `pnpm build && pnpm lint && pnpm test`.
  - Depends on: Tasks 3–5
  - Files: `app/page.tsx`, `app/layout.tsx`

## Checkpoint: MVP Core Complete

- [x] `pnpm build` succeeds.
- [x] `pnpm lint` passes.
- [x] `pnpm test` passes.
- [x] 3-tap add-expense flow works end-to-end.
- [x] History edit/delete works end-to-end.
- [x] Review with human before Phase 3.

## Phase 3: Categories and Budgets

- [x] **Task 7: Manage user-owned categories**
  - Acceptance: Authenticated category CRUD validates ownership; users can create, rename, and archive categories; archived categories remain visible on history but are excluded from new expense choices.
  - Verify: Add category validator/route tests; run `pnpm test` and `pnpm lint`; manually exercise category management at 375px width.
  - Depends on: Tasks 1–6
  - Files: `db/schema.ts`, `app/api/categories/`, `components/category/`, `components/expense/expense-form.tsx`, `tests/category.spec.ts`

- [ ] **Task 8: Create and display monthly category budgets**
  - Acceptance: Users can create/update/remove one IDR budget per category/month; reads and writes enforce user/category ownership; dashboard shows budget and spend totals.
  - Verify: Test validation, duplicate months, and cross-user access; run `pnpm test`, `pnpm lint`, and `pnpm build`; manually refresh and verify persistence.
  - Depends on: Task 7
  - Files: `app/api/budgets/`, `utils/validators.ts`, `components/budget/`, `components/dashboard/spending-overview.tsx`, `tests/budget.spec.ts`

- [ ] **Task 9: Add budget burn warnings**
  - Acceptance: Current-month integer math shows burn percentage and remaining/overage amounts; near-limit and over-limit states are visible; unbudgeted categories remain neutral.
  - Verify: Test month boundaries and limit states; manually verify mobile and desktop warning presentation.
  - Depends on: Task 8
  - Files: `utils/budget-math.ts`, `components/budget/`, `components/dashboard/`, `tests/budget.spec.ts`

## Checkpoint: Categories and Budgets

- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` pass.
- [ ] Category ownership/archive behavior and budget warning states are manually reviewed.

## Phase 4: Recurring Subscriptions

- [ ] **Task 10: Mark expenses as recurring**
  - Acceptance: An expense can create/update an owned recurring configuration with validated frequency, amount, category, and start date.
  - Verify: Test recurrence validation and ownership; run `pnpm test`, `pnpm lint`, and `pnpm build`; manually mark/unmark a subscription.
  - Depends on: Tasks 7–9
  - Files: `utils/recurrence.ts`, `utils/validators.ts`, `app/api/expenses/[id]/route.ts`, `app/api/recurring/`, `components/expense/expense-form.tsx`, `tests/recurring.spec.ts`

- [ ] **Task 11: Deliver subscriptions view and period tracking**
  - Acceptance: Active subscriptions show amount/category/frequency/next occurrence; users can deactivate items; current-period marking creates one linked expense idempotently.
  - Verify: Test next-occurrence and idempotency calculations; run `pnpm test`, `pnpm lint`, and `pnpm build`; manually verify mobile navigation and repeated marking.
  - Depends on: Task 10
  - Files: `app/app/recurring/`, `app/api/recurring/`, `components/subscription/`, `utils/recurrence.ts`, `tests/recurring.spec.ts`

## Checkpoint: Recurring Lane

- [ ] Recurrence boundary cases and repeated period marking pass tests.
- [ ] Subscriptions are discoverable and usable at 375px width.

## Phase 5: PWA and Offline Read Support

- [ ] **Task 12: Make the app installable as a PWA**
  - Acceptance: Valid manifest, icons, theme metadata, and standalone behavior are available for the authenticated app.
  - Verify: Run `pnpm build`; inspect browser installability; install and launch on a real device or responsive emulator.
  - Depends on: Tasks 1–6
  - Files: `app/layout.tsx`, `app/manifest.ts`, `public/icons/`, `public/manifest.json` if retained, `tests/pwa.spec.ts`

- [ ] **Task 13: Cache latest authenticated data for offline viewing**
  - Acceptance: Latest visited data is viewable offline; offline mutations fail clearly; cache is invalidated on version change/sign-out. Offline writes remain out of scope.
  - Verify: Run `pnpm lint`, `pnpm test`, and `pnpm build`; use DevTools offline mode to reload and attempt a save.
  - Depends on: Task 12
  - Files: `public/sw.js` or `app/sw.ts`, `app/layout.tsx`, `components/swr-provider.tsx`, `components/expense/expense-form.tsx`, `tests/pwa.spec.ts`

## Checkpoint: v1 Complete

- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` pass.
- [ ] Mobile checks cover installability, offline read support, and the online three-tap flow.
- [ ] Tenant scoping, environment-based secrets, and approved SPEC.md decisions are reviewed before deployment.
