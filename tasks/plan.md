# Implementation Plan: Lontu

Sumber: [SPEC.md](../SPEC.md) · 2026-10-20

Indeks plan per modul, mengikuti urutan build di capability map. Modul berikutnya (`transactions` → `pwa-offline`) direncanakan setelah `SPEC-<module>.md` masing-masing ditulis.

| Modul | Spec | Phase | Task | Status |
|---|---|---|---|---|
| `foundation` | [SPEC-foundation.md](../SPEC-foundation.md) | 1–4 | T1–T9 | Selesai (T9 ditunda) |
| `accounts-categories` | [SPEC-accounts-categories.md](../SPEC-accounts-categories.md) | 5–7 | T10–T21 | Selesai (review Yogi tertunda) |

---

# Modul `foundation`

Spec: [SPEC-foundation.md](../SPEC-foundation.md)

## Overview

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
 └── T5 Providers + root layout + token + stores
       └── T6 App shell (nav, + menu, placeholder)   ← juga butuh T3 (logout, session)
             ├── T7 ResponsiveModal
             └── T8 Manifest + ikon
```

T2 dan T3 tidak saling bergantung, kecuali upsert `users` di callback `signIn` yang butuh tabel `users`. Karena itu T2 dikerjakan lebih dulu. T5 bisa dikerjakan paralel dengan T2–T4.

## Phases

| Phase | Plan | Todo | Task | Checkpoint |
|---|---|---|---|---|
| 1. Fondasi teknis | [plan-1.md](plan-1.md) | [todo-1.md](todo-1.md) | T1–T3 | A |
| 2. Kontrak API | [plan-2.md](plan-2.md) | [todo-2.md](todo-2.md) | T4 | B |
| 3. UI shell | [plan-3.md](plan-3.md) | [todo-3.md](todo-3.md) | T5–T8 | C |
| ~~4. Verifikasi end-to-end~~ | [plan-4.md](plan-4.md) | [todo-4.md](todo-4.md) | ~~T9~~ ditunda | Foundation selesai setelah phase 3 |

Phase dikerjakan berurutan. Pengecualian: T5 (phase 3) hanya butuh T1 dan boleh dikerjakan paralel dengan phase 1–2.

## Aturan lintas phase

- **Risiko tinggi didahulukan:** Drizzle 1.0 RC dan Auth.js v5 di Next 16.4 ada di phase 1.
- **Satu task = satu commit conventional**, dengan gerbang `pnpm lint && pnpm typecheck && pnpm test`.
- Keputusan dan risiko yang berlaku untuk satu phase ditulis di `plan-<phase>.md` masing-masing.

## Keputusan open questions (2026-10-20)

1. **DB tes:** Supabase lewat `DATABASE_URL`, tanpa DBMS lokal. Tes membuat user `test-<uuid>` dan menghapusnya setelah selesai.
2. **Login E2E:** ditunda. E2E (T9) dikeluarkan dari foundation pada 2026-10-20.
3. **Nama package:** `lontu` (T1).
4. **Ikon maskable:** dibuat dari ikon 512 dengan padding safe zone (T8).
5. **Font:** Inter saja sebagai `--font-sans` (T5).

---

# Modul `accounts-categories`

Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md) · 2026-10-20

## Overview

Akun dan kategori bisa dikelola dari Settings, saldo per akun berasal dari view `account_balances`, user baru otomatis punya 16 kategori default, dan mengubah saldo awal mencatat transaksi `adjustment`. Modul ini juga menyelesaikan kontrak server yang dipakai `transactions` (`GET /api/accounts`, `GET /api/categories`, helper kepemilikan, `revalidateAccounts`).

## Dependency graph

```
T10 Migrasi adjustment ─────────────┐
T11 Seed kategori default ──────────┼──────────────┐
                                    ▼              │
T12 GET/POST accounts ──► T13 PATCH/DELETE/restore akun (+adjustment)
  │                                 │              │
  └──► T14 GET/POST categories ◄────┼──────────────┘
         ├──► T15 rename/arsip/restore kategori
         └──► T16 ownership helpers
T17 Settings + profil (hanya butuh /api/me)
  └──► T18 Kelola akun: daftar + tambah (butuh T12) ──► T19 edit/arsip/pulihkan (butuh T13)
         └──► T20 Kelola kategori: daftar + tambah (butuh T14) ──► T21 rename/arsip (butuh T15)
```

## Phases

| Phase | Plan | Todo | Task | Checkpoint |
|---|---|---|---|---|
| 5. Data akun & kategori | [plan-5.md](plan-5.md) | [todo-5.md](todo-5.md) | T10–T13 | D |
| 6. API kategori & kontrak | [plan-6.md](plan-6.md) | [todo-6.md](todo-6.md) | T14–T16 | E |
| 7. UI Settings & modal | [plan-7.md](plan-7.md) | [todo-7.md](todo-7.md) | T17–T21 | F (modul selesai) |

Phase dikerjakan berurutan. Pengecualian: T17 hanya butuh foundation dan boleh dikerjakan paralel dengan phase 5–6. Di phase 7, T19 dan T20 bisa dikerjakan paralel.

## Aturan lintas phase

- **Risiko tinggi didahulukan:** migrasi `adjustment` (T10) dan transaksi DB + `for update` (T13) ada di phase 5.
- **Kontrak server selesai sebelum UI** (Checkpoint E), supaya modul `transactions` bisa dispec dan dimulai paralel dengan phase 7 jika perlu.
- Satu task = satu commit conventional, dengan gerbang `pnpm lint && pnpm typecheck && pnpm test`.

## Keputusan (2026-10-20)

1. **Seed** saat login, hanya jika user belum punya baris kategori sama sekali.
2. **Hapus = arsip**, dengan restore. Tanpa hard delete.
3. **Kategori hanya bisa di-rename.** `kind`/`spending_type` dikunci.
4. **`subtype` opsional dan bebas, saldo negatif diizinkan.**
5. **Edit saldo awal → transaksi `adjustment`.** Butuh migrasi constraint + view (disetujui). `adjustment` tidak bisa dibuat lewat UI/API transaksi.
6. **Kategori default** dipakai apa adanya. **Label UI** campuran. **Arsip akun bersaldo** hanya diberi peringatan.
