# Expense Tracker — Confirmed Intent

Date: 2026-09-03

## What we are building

A mobile-first, installable PWA for fast personal expense tracking. The core pain point is recurring subscriptions silently draining money; the app must make logging so quick that it actually happens, and make budget burn visible before month-end.

## Outcome

A web app that lets you log expenses in ~3 taps, set monthly budgets per custom category, and surface recurring/subscription expenses so forgotten ones can be caught and cancelled.

## User

Single user (you) for now. The auth and data model must be designed so multi-user signup can be added later without a migration.

## Why now

Spreadsheets and notes are too slow, so tracking doesn't stick. Recurring subs are the main leak.

## Success

- Expenses are logged in the moment.
- Budget warnings are visible before overspending.
- Forgotten subscriptions can be identified and cancelled.

## Constraints

- Mobile-first UX, PWA installable on phone.
- Google OAuth sign-in with refresh tokens.
- Database persistence.
- In-app warnings only; no push notifications.
- Multi-user-ready data model.

## Out of scope

- Bank/import feeds.
- Native iOS/Android apps.
- Email/password auth (for now).
- Detailed reports beyond month/category totals.
