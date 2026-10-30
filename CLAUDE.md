@AGENTS.md

# Lontu

Mobile-first PWA for personal finance tracking (income, expense, saving, transfer, monthly budgets, dashboard). Single owner via Google login allowlist, but the data model is multi-user (`user_id` on every table).

Specs are the source of truth and are written in Indonesian:

- [SPEC.md](SPEC.md): capability map, locked decisions, cross-module rules
- `SPEC-<module>.md`: per-module detail and contracts (the providing module owns the contract)
- [tasks/plan.md](tasks/plan.md): plan index; per-phase `tasks/plan-N.md` + `tasks/todo-N.md`
- [DESIGN.md](DESIGN.md): visual design direction (palette, type, surfaces, components). Follow it for any UI work

If a decision changes, update the relevant spec first, then the code.

## Commands

```bash
pnpm dev | build | start | lint
pnpm format | format:check  # prettier
pnpm typecheck           # tsc --noEmit
pnpm test                # vitest run (unit + API against Supabase via DATABASE_URL)
pnpm test:e2e            # playwright (deferred, not set up yet)
pnpm db:generate | db:migrate | db:studio
```

`typecheck`, `test*` and `db:*` are added in the foundation module (task T1); they may not exist yet.

Before every commit: `pnpm lint && pnpm typecheck && pnpm test`. Conventional commits, one task per commit.

## Stack (versions matter)

- Next.js 16.4 App Router with `cacheComponents: true`. `proxy.ts` replaces middleware. Read `node_modules/next/dist/docs/` before using any Next API.
- Drizzle `1.0.0-rc.4` + `postgres`. The API differs from 0.x: check the installed `.d.ts`, not memory.
- Auth.js (`next-auth` v5), Google provider only, JWT session. `users.id` = Google `sub`.
- Supabase is only the Postgres host: no `supabase-js`, no service role key. Pooler in transaction mode, so `prepare: false`.
- shadcn (`base-vega`, `@base-ui/react`), Tailwind v4, Zod v4, react-hook-form, SWR, Zustand, Recharts via shadcn chart, Serwist.
- pnpm only.

## Architecture rules

- All data goes through API routes in `app/api/**/route.ts`. **No server actions for mutations.**
- Every route uses `withAuth` and filters every query by the session `userId`. Also verify ownership of any account/category id referenced in the request body.
- Revalidate request body/query with Zod on the server even if the client validated it.
- Error shape: `{ error: { code, message, fields? } }`, built with helpers in `lib/api/errors.ts`. `fields` comes from `z.flattenError(err).fieldErrors`.
- Aggregations run in the database: TS query functions in `lib/server/queries/` (Drizzle SQL). Only the `account_balances` view lives in SQL migrations. Never aggregate large row sets on the client.
- RLS is enabled with no policies (deny-all) on every table. The Drizzle role owns the tables.
- SWR for server data (hooks in `hooks/`). Zustand (`stores/`) for UI state only; never copy accounts, categories or transactions into it.
- With `cacheComponents`, anything reading the session goes behind `<Suspense>`. See `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.
- `proxy.ts` only does an optimistic cookie redirect to `/login`; `withAuth` is the real check.

## Conventions

- Money: integer rupiah. `number` in TS (max 1e12), `bigint({ mode: "number" })` in Drizzle. Never floats. Format with `lib/money.ts`.
- Dates: `YYYY-MM-DD` strings in the API, `date` columns in the DB. "Today" is computed in `Asia/Jakarta`.
- Zod v4: `z.uuid()`, `z.flattenError(err)`. Not `z.string().uuid()` or `.flatten()`.
- Server-only modules start with `import "server-only"`; client components with `"use client"`.
- TypeScript strict, alias `@/*`. Files kebab-case, components PascalCase, hooks `useX`.
- Prettier (`.prettierrc.json`) owns formatting; lint-staged runs it on commit. Run `pnpm format` only in a dedicated commit, and add that commit to `.git-blame-ignore-revs`.
- Don't hand-edit `components/ui/`; add or update components via the shadcn CLI. One exception: `button.tsx` sizes `default` and `lg` use `px-4` (registry `px-2.5`). Re-apply it after any `shadcn add button --overwrite`.
- Comments only for reasons not visible in the code.
- Mobile: layout must work at 360 px, touch targets ≥ 44×44 px, input font 16 px, text contrast ≥ 4.5:1.

## Testing

- TDD for new logic; fix bugs with a reproducing test first.
- Unit tests in `tests/unit/`, API/query tests in `tests/api/` against the real Supabase Postgres (`DATABASE_URL`), not mocks. Each test creates its own `test-<uuid>` user and deletes it afterwards. Call route handlers directly.
- Every resource needs a `user_id` isolation test (user B cannot read or modify user A's data).
- E2E in `e2e/` with Playwright at 360×800 and desktop.

## Ask first

- Schema changes beyond the spec, or migrations that alter/drop columns.
- Adding a dependency not listed in SPEC.md's tech stack.
- Changing the capability map, the auth flow, or `next.config.ts`.
- Hard deletes of user data (default is soft delete / archive).

## Never

- Commit `.env` or secrets, or expose `DATABASE_URL` / `AUTH_SECRET` to the client bundle.
- Delete, skip, or weaken failing tests to get a green build.

## Always

- Work like L7 senior software developer
- Think Before Coding
- Simplicity First
- Surgical Changes
- Goal-Driven Execution
- Write test -> `*.spec.tsx|ts`
- Write descriptive commit message after task success using `-F`, print full commit script, example:

  ```git
  git commit -F - <<'MSG'
   <type>(<scope>): <concise subject, imperative mood, ≤72 chars>

   <1-3 sentence body: what changed and why>

   Task: gh issue link
   MSG
  ```
