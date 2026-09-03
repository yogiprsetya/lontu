# Expense Tracker — Implementation Plan / Architecture Notes

Companion to [docs/intent/expense-tracker.md](../intent/expense-tracker.md). This doc covers how we build it: options considered, decisions made, phased rollout, schema, and risks.

## Strategic options we deliberately did not pick

| Option                         | Why it lost                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Native iOS/Android app         | Distribution overhead + App Store fees kill speed. PWA is installable today and good enough to validate the habit. |
| Email/password first           | Adds auth surface ( bcrypt, reset flow, email infra ) before we know anyone wants it. Google OAuth is one tap.     |
| Bank feed import               | Contradicts the "manual is fast" habit hypothesis; import also brings credential/security scope way too early.     |
| Shared household budgets in v1 | Multi-user schema is a constraint, not a feature. Household sharing adds permissions/UX complexity.                |
| Push notification reminders    | User chose in-app warnings only. Push is a future lever once habit is proven.                                      |

## Decision: the "3-tap" UX contract

The only thing that matters in v1: can a user record an expense before impulse fades. Every screen past amount + category is friction.

- Tap 1: hit category.
- Tap 2: type amount (numeric pad).
- Tap 3: save.
- Optional: note, date, recurring flag are available but collapsed.

Consequence: the home screen must surface recent categories as big touch targets. Categories are a first-class UX primitive, not just a label.

## Data architecture

### Chosen shape (multi-user-ready from day one)

```
users
  id (OAuth sub / mapped from provider)
  email, name, picture
  created_at

categories
  id, user_id, name, color/icon?, sort_order, archived
  soft-delete: keep for old transactions

budgets
  id, category_id, amount_cents, period_start, period_end
  one active budget per category per month

expenses
  id, user_id, category_id, amount_cents, currency, note, spent_at, created_at
  recurring_config_id nullable

recurring_configs
  id, user_id, category_id, amount_cents, frequency (weekly|monthly|yearly|custom_days),
  next_due_at, note, active
```

### Why this schema

- `users.id` as the top-level tenant key makes multi-user later trivial.
- Splitting `recurring_configs` from `expenses` lets us list subscriptions without pre-generating ghost transactions.
- Budgets are tied to category + month, so users can change budgets without rewriting history.
- Soft-delete categories preserves history while decluttering the add flow.

## Recurring expenses: how much magic?

Two valid models. We pick **Option B** for v1.

- **Option A** — auto-generate future transactions: good for budgets, but noisy when a subscription is paused/cancelled.
- **Option B** — recurring config as a subscription ledger; user marks each occurrence as spent: matches the mental model of "forgotten subs" and keeps the transaction log clean.

Future enhancement: Add a one-tap "mark this month's occurrence as spent" action.

## Phased rollout

### Phase 0 — Skeleton (1 day)

- Next.js + shadcn/ui baseline; confirm Google OAuth callback route.
- Database connection chosen and a single `users` and `expenses` table exists.
- Deploy target configured (Vercel + Neon Postgres recommended from existing stack).

### Phase 1 — Log an expense (MVP core)

- Home screen with recent categories.
- Add expense flow: amount, category, note, save.
- List history, edit/delete.
- Persistence + Google auth required.

### Phase 2 — Categories + budgets

- Custom categories with create/edit/archive.
- Monthly budget per category.
- Visual burn indicator on home/category views.
- In-app warning when near/over limit.

### Phase 3 — Recurring lane

- Mark any expense as recurring and define frequency.
- Dedicated subscriptions view.
- Optional "mark this period as spent" action.

### Phase 4 — PWA polish

- Manifest, icons, theme color, standalone display.
- Service worker/cache strategy for offline add + later sync.
- Mobile viewport lock / safe-area handling.

## Riskiest assumptions to prove or disprove

1. **Habit hypothesis** — Will users open the PWA in the moment, or will manual entry still fail? Evidence to collect: creation timestamps clustered near purchase time vs. batch spikes.
2. **Category/load hypothesis** — Are ~8 custom categories enough coverage, or do users need split transactions? Keep category count metric.
3. **Budget-warning resonance** — Does the burn indicator change behavior, or is it ignored? Qualitative: did user adjust spend after alerts?
4. **Auth friction** — Does Google OAuth drop-off exceed email/password aversion? Monitor sign-in conversion.
5. **Recurring value** — Does seeing forgotten subs lead to cancellation, or just guilt? Integrate a "cancelled" flag in v1.

## Key technical questions still to decide

| Question              | Current lean                                                           | Impact                                                      |
| --------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| Database              | Neon Postgres on Vercel                                                | Serverless-friendly, fits Next.js.                          |
| ORM/query layer       | Drizzle                                                                | Type-safe, lightweight, migrations in repo.                 |
| Auth library          | next-auth v5 / Auth.js with Google provider                            | Refresh tokens via `offline` access_type + `account` table. |
| Refresh token storage | Encrypted `refresh_token` on `accounts` table, standard Auth.js schema | Avoid manual crypto.                                        |
| State management      | Server Actions + URL state; local optimistic UI                        | Keep it simple; no global store until proven needed.        |
| PWA cache strategy    | Network-first for API, stale-while-revalidate for shell                | Offline add deferred to later phase.                        |

## Definition of "MVP shipped"

- [ ] Deployed and installable as PWA.
- [ ] Google sign-in persists across sessions via refresh token.
- [ ] A logged-in user can add an expense in ≤3 taps on mobile data.
- [ ] Custom categories exist and can be archived.
- [ ] Monthly category budgets show a burn indicator.
- [ ] Recurring expenses are visible in a dedicated list.
- [ ] Multi-user schema in place, even if only one user is supported in UI.

## Future levers (not now)

- Bank import via open banking.
- Push notifications at budget thresholds.
- Multi-user households / shared budgets.
- Analytics exports (CSV).
- AI categorization from note text.
