# Expense Tracker MVP — Task List

## Phase 1: Foundation

- [ ] **Task 1: Install and configure Drizzle ORM**
  - Acceptance:
    - [ ] `pnpm db:migrate` succeeds against a real Postgres database.
    - [ ] `pnpm db:studio` shows all MVP tables: `users`, `categories`, `budgets`, `expenses`, `recurring_configs`.
    - [ ] `.env.example` documents `DATABASE_URL`.
  - Verify:
    - [ ] Run `pnpm db:migrate`.
    - [ ] Run `pnpm db:studio` and inspect tables.
    - [ ] Run `pnpm build` to confirm no TypeScript errors.
  - Depends on: —
  - Files: `package.json`, `drizzle.config.ts`, `config/db.ts`, `db/schema.ts`, `db/migrations/*`, `.env.example`

- [ ] **Task 2: Set up NextAuth.js v5 with Google OAuth**
  - Acceptance:
    - [ ] User can sign in with Google on `/login`.
    - [ ] Session is available server-side.
    - [ ] Unauthenticated requests are redirected to `/login`.
  - Verify:
    - [ ] Start `pnpm dev`, complete OAuth flow, confirm session cookie exists.
    - [ ] Visit a protected route while logged out and confirm redirect.
    - [ ] Run `pnpm test` to confirm no regressions.
  - Depends on: Task 1
  - Files: `package.json`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx`, route/session guards

## Checkpoint: Foundation Ready

- [ ] `pnpm build` succeeds.
- [ ] `pnpm test` passes.
- [ ] Database is migrated and reachable.
- [ ] Google OAuth flow works on localhost.
- [ ] Review with human before continuing.

## Phase 2: Core Expense Flow

- [ ] **Task 3: Create the mobile home screen shell**
  - Acceptance:
    - [ ] `app/page.tsx` renders the mobile-first dashboard shell.
    - [ ] Auth guard works (anonymous users see `/login` or are redirected).
    - [ ] Layout is usable down to 375px width.
  - Verify:
    - [ ] Run `pnpm dev`, open Chrome DevTools at 375px width, confirm layout.
    - [ ] Visit `/` in an incognito window and confirm redirect/login prompt.
    - [ ] Run `pnpm lint`.
  - Depends on: Task 2
  - Files: `app/page.tsx`, `app/layout.tsx`, `components/dashboard/*.tsx`

- [ ] **Task 4: Implement the add-expense flow (3 taps)**
  - Acceptance:
    - [ ] Category + amount + save creates a persisted expense.
    - [ ] Invalid amounts are rejected.
    - [ ] New expense appears in the UI immediately after save.
  - Verify:
    - [ ] Manual mobile-emulator test: tap category → type amount → tap save.
    - [ ] Unit test for amount validation in `tests/expense*.test.ts`.
    - [ ] Confirm row appears in database.
  - Depends on: Tasks 2–3
  - Files: `components/expense/expense-form.tsx`, `app/api/expenses/route.ts`, `lib/validators.ts`, `tests/expense*.test.ts`

- [ ] **Task 5: Implement expense history with edit and delete**
  - Acceptance:
    - [ ] Recent expenses are listed, grouped by date.
    - [ ] User can edit amount, category, note, and date.
    - [ ] User can delete an expense with confirmation.
    - [ ] Mutations persist and list updates.
  - Verify:
    - [ ] Manual test edit and delete flows.
    - [ ] Unit/integration test for history ordering and mutation helpers.
    - [ ] Run `pnpm test`.
  - Depends on: Task 4
  - Files: `components/expense/expense-list.tsx`, `components/expense/expense-card.tsx`, `app/api/expenses/route.ts`, `app/api/expenses/[id]/route.ts`, `tests/expense*.test.ts`

- [ ] **Task 6: Wire the 3-tap end-to-end flow and verify**
  - Acceptance:
    - [ ] Full 3-tap flow results in a persisted expense shown in history.
    - [ ] Default Next.js landing content is removed.
    - [ ] Desktop view remains usable.
  - Verify:
    - [ ] Manual click/tap test on Chrome mobile emulator.
    - [ ] Confirm DB rows after multiple saves.
    - [ ] Run `pnpm build && pnpm lint && pnpm test`.
  - Depends on: Tasks 3–5
  - Files: `app/page.tsx`, `app/layout.tsx`

## Checkpoint: MVP Core Complete

- [ ] `pnpm build` succeeds.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] 3-tap add-expense flow works end-to-end.
- [ ] History edit/delete works end-to-end.
- [ ] Review with human before Phase 3.
