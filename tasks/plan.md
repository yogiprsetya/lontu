# Implementation Plan: modul `foundation`

Sumber: [SPEC.md](../SPEC.md), [SPEC-foundation.md](../SPEC-foundation.md) · 2026-10-20

## Overview

Plan ini mencakup modul `foundation` saja, karena baru modul itu yang punya spec detail. Lima modul lain (`accounts-categories` → `pwa-offline`) direncanakan setelah `SPEC-<module>.md` masing-masing ditulis.

Hasil akhir: email di allowlist bisa login dengan Google dan melihat app shell kosong yang responsif. Skema DB lengkap sudah termigrasi (5 tabel, view `account_balances`, RLS deny-all). `/api/me` menjadi contoh route pertama dengan `withAuth`, validasi Zod, dan format error yang seragam.

## Kondisi repo saat ini

- Scaffold Next.js 16.4.2. `next.config.ts` sudah memakai `cacheComponents: true` dan `partialPrefetching: true`.
- shadcn `base-vega` sudah terpasang, baru ada `button`. `drizzle-orm`/`drizzle-kit` 1.0.0-rc.4 dan `postgres` sudah terpasang, tapi belum ada `db/` atau `drizzle/`.
- `app/layout.tsx` masih bawaan create-next-app (`lang="en"`, judul "Create Next App", tiga font).
- `.env.example` masih memakai nama variabel NextAuth v4 (`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`).
- Ikon PWA ada di commit `c9de1eb` (`public/icons/icon-{192,512}.png`). Belum ada versi maskable.
- Belum ada framework tes. `tests/pwa.spec.ts` lama memakai `node:test` dan tidak dipulihkan.

## Dependency graph

```
T1 Tooling (deps, scripts, Vitest, money.ts)
 ├── T2 Skema DB + migrasi + RLS + view ──────┐
 ├── T3 Login Google (auth.ts, proxy, /login) ─┤
 │                                             └── T4 withAuth + errors + /api/me
 ├── T5 Providers + root layout + token + stores
 │     └── T6 App shell (nav, + menu, placeholder)   ← juga butuh T3 (logout, session)
 │           ├── T7 ResponsiveModal
 │           └── T8 Manifest + ikon
 └── T9 E2E login tes + smoke shell                   ← butuh T3, T6
```

T2 dan T3 tidak saling bergantung, kecuali upsert `users` di callback `signIn` yang butuh tabel `users`. Karena itu T2 dikerjakan lebih dulu. T5 bisa dikerjakan paralel dengan T2–T4.

## Phases

| Phase | Plan | Todo | Task | Checkpoint |
|---|---|---|---|---|
| 1. Fondasi teknis | [plan-1.md](plan-1.md) | [todo-1.md](todo-1.md) | T1–T3 | A |
| 2. Kontrak API | [plan-2.md](plan-2.md) | [todo-2.md](todo-2.md) | T4 | B |
| 3. UI shell | [plan-3.md](plan-3.md) | [todo-3.md](todo-3.md) | T5–T8 | C |
| 4. Verifikasi end-to-end | [plan-4.md](plan-4.md) | [todo-4.md](todo-4.md) | T9 | Foundation selesai |

Phase dikerjakan berurutan. Pengecualian: T5 (phase 3) hanya butuh T1 dan boleh dikerjakan paralel dengan phase 1–2.

## Aturan lintas phase

- **Risiko tinggi didahulukan:** Drizzle 1.0 RC dan Auth.js v5 di Next 16.4 ada di phase 1.
- **Satu task = satu commit conventional**, dengan gerbang `pnpm lint && pnpm typecheck && pnpm test`.
- Keputusan dan risiko yang berlaku untuk satu phase ditulis di `plan-<phase>.md` masing-masing.

## Open questions (perlu jawaban sebelum task terkait)

Setiap `plan-<phase>.md` menandai pertanyaan yang memblokir phase tersebut.

1. **SPEC.md OQ #1, DB tes:** Docker `postgres:17` atau Supabase CLI? Plan mengasumsikan Docker. *Blocker untuk T2 dan T4.*
2. **SPEC.md OQ #2, login E2E:** provider Credentials yang hanya aktif saat `E2E_AUTH=1` dan bukan production? *Blocker untuk T9.*
3. **SPEC.md OQ #6:** ganti nama package `"my"` → `"lontu"` di T1?
4. **Ikon maskable:** tidak ada di commit `c9de1eb`. Buat versi maskable dari ikon 512 (dengan padding safe zone), atau tunda?
5. **Font:** `app/layout.tsx` memuat Inter, Geist, dan Geist Mono. Pertahankan Inter saja sebagai `--font-sans` (lebih hemat JS/CSS), atau tetap ketiganya?

Open questions #3–#5 di SPEC.md (saldo tidak cukup, biaya admin, halaman Expenses) tidak memengaruhi foundation.
