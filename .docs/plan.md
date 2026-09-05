# Implementation Plan: Expense Tracker MVP

## Overview

This plan covers the MVP of the expense tracker: build the foundation (database, auth), then deliver the first vertical slice — logging an expense in ~3 taps and reviewing history. Later phases (categories/budgets, recurring subscriptions, PWA polish) are listed but not detailed until this MVP is reviewed.

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

- [ ] **Task 1: Install and configure Drizzle ORM**
  - Add Drizzle dependencies and `drizzle.config.ts`.
  - Create `config/db.ts` (typed DB client) and `.env.example` with `DATABASE_URL`.
  - Define schema in `db/schema.ts` for `users`, `categories`, `budgets`, `expenses`, `recurring_configs`.
  - Create an initial migration and run it against the Postgres database.
  - **Acceptance:** `pnpm db:migrate` succeeds; `pnpm db:studio` shows all MVP tables.
  - **Verification:** Run `pnpm db:migrate` and `pnpm db:studio` and confirm tables.
  - **Dependencies:** None.
  - **Files likely touched:** `package.json`, `drizzle.config.ts`, `config/db.ts`, `db/schema.ts`, `db/migrations/*`, `.env.example`.
  - **Estimated scope:** M.

- [ ] **Task 2: Set up NextAuth.js v4 with Google OAuth**
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

- [ ] `pnpm build` succeeds.
- [ ] `pnpm test` passes (or has no failing tests).
- [ ] Database is migrated and reachable.
- [ ] Google OAuth flow works on localhost.
- [ ] Review with human before continuing.

### Phase 2: Core Expense Flow

- [ ] **Task 3: Create the mobile home screen shell**
  - Replace the default Next.js landing page in `app/page.tsx`.
  - Build a mobile-first layout with header, recent-categories grid, and quick-actions.
  - Ensure the page is protected (unauthenticated users see login prompt or are redirected).
  - **Acceptance:** Home screen renders on mobile viewport; layout is usable; auth guard works.
  - **Verification:** Run `pnpm dev`, open DevTools mobile viewport, confirm home screen loads and looks correct.
  - **Dependencies:** Task 2.
  - **Files likely touched:** `app/page.tsx`, `app/layout.tsx` (minor), new `components/dashboard/*.tsx`.
  - **Estimated scope:** S–M.

- [ ] **Task 4: Implement the add-expense flow (3 taps)**
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

- [ ] `pnpm build` succeeds.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] 3-tap add-expense flow works end-to-end.
- [ ] History edit/delete works end-to-end.
- [ ] Review with human before Phase 3.

## Future Phases (Outlined)

### Phase 3: Categories + budgets

- Category management (create, edit, archive).
- Monthly budget per category.
- Visual burn indicator on home/category views.
- In-app warnings when near/over limit.

### Phase 4: Recurring subscriptions

- Recurring config schema and API.
- Mark expense as recurring with frequency.
- Dedicated subscriptions view.
- Optional "mark this period as spent" action.

### Phase 5: PWA polish

- `manifest.json`, icons, theme color.
- Standalone display mode.
- Service worker / cache strategy for offline viewing.

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
