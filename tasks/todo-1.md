# Todo phase 1: Fondasi teknis

Plan: [plan-1.md](plan-1.md) · Index: [plan.md](plan.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T1: Tooling, scripts, Vitest, dan `money.ts`

**Description:** Pasang dependency foundation, tambah script, siapkan Vitest, dan buktikan pipeline tes dengan `lib/money.ts` yang ditulis secara TDD. Perbarui `.env.example` ke nama variabel Auth.js v5.

**Acceptance criteria:**

- [x] Dependency dari Deliverables §1 terpasang: `next-auth@5`, `zod@4`, `swr`, `zustand`, `react-hook-form`, `@hookform/resolvers`, `next-themes`, `server-only`, dev `vitest`. Script `typecheck`, `test`, `test:watch`, `db:generate`, `db:migrate`, `db:studio` ada
- [x] `formatIDR`, `parseIDR` (termasuk input kosong dan non-digit), `formatThousands`, `abbreviateIDR` (batas rb/jt/M/T) lolos tes unit
- [x] `.env.example` berisi `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAILS`

**Verification:**

- [x] `pnpm test` menjalankan `tests/unit/money.spec.ts` dan hijau
- [x] `pnpm typecheck && pnpm lint && pnpm build` hijau
- [x] Cek: peer dependency warning `next-auth` dicatat. Jika bentrok dengan Next 16.4, berhenti dan tanya

**Catatan:** Vitest 4 dipakai (Vitest 5 butuh Node ≥ 22, mesin ini Node 20). `next-auth@5.0.0-beta.32` peer `next ^16`, tidak bentrok. Folder `types/` hasil salinan `.next/types` dihapus karena merusak typecheck.

**Dependencies:** None

**Files likely touched:** `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `lib/money.ts`, `tests/unit/money.test.ts`, `.env.example`

**Estimated scope:** S

---

### T2: Skema DB, migrasi, RLS, view `account_balances`

**Description:** Tulis `db/schema.ts` untuk 5 tabel sesuai tabel di spec §2, klien `db/index.ts` (`server-only`, `prepare: false`), `drizzle.config.ts`, migrasi hasil generate, dan migrasi SQL kustom untuk view, RLS, dan index ekspresi yang tidak bisa diekspresikan di Drizzle. Tes constraint dan saldo jalan terhadap Supabase (`DATABASE_URL`).

**Acceptance criteria:**

- [x] `pnpm db:migrate` pada DB kosong membuat 5 tabel, semua index & unique `lower(name)`, view `account_balances` (`security_invoker`), dan RLS aktif di kelima tabel tanpa policy
- [x] Constraint menolak: transfer tanpa `to_account_id`, transfer ke akun yang sama, expense tanpa kategori, kategori spending tanpa `spending_type`, `amount <= 0`
- [x] Skenario saldo: awal 100.000, income 50.000, expense 20.000, transfer 10.000 ke B, satu expense soft-deleted → A = 120.000, B = awal B + 10.000

**Verification:**

- [x] `pnpm test` menjalankan `tests/api/db-constraints.spec.ts` dan `tests/api/account-balances.spec.ts` terhadap Supabase, hijau
- [x] Manual: query `pg_class.relrowsecurity` = true untuk kelima tabel
- [x] Manual (setelah migrasi ke Supabase): query sebagai role `anon` mengembalikan 0 baris (setara REST dengan anon key)

**Catatan:** Tabel app lama (9 tabel + jurnal migrasi Drizzle lama) dipindah ke schema `legacy` pada 2026-10-20 sebelum migrasi, tanpa menghapus data. View dibuat lewat `pgView` di `db/schema.ts`, jadi masuk migrasi hasil generate. Migrasi pertama: `drizzle/20261020125856_foundation`.

**Dependencies:** T1. Open question #1 diputuskan: Supabase

**Files likely touched:** `db/schema.ts`, `db/index.ts`, `drizzle.config.ts`, `drizzle/*.sql`, `tests/api/db-constraints.test.ts`, `tests/api/account-balances.test.ts`, `tests/setup/db.ts`

**Estimated scope:** M

---

### T3: Login Google dengan allowlist

**Description:** Konfigurasi Auth.js v5 di `lib/auth.ts` (Google, JWT, callback `signIn` dengan allowlist + upsert `users`, `session.user.id = token.sub`), route handler `/api/auth/[...nextauth]`, `proxy.ts` untuk redirect optimistik, dan halaman `/login`. Baca `node_modules/next/dist/docs/` untuk `proxy.ts` sebelum menulis.

**Acceptance criteria:**

- [x] (manual, Yogi) Email di `ALLOWED_EMAILS` login, mendarat di `/dashboard` (placeholder sementara), dan baris `users` tercipta. Login kedua tidak menduplikasi baris
- [x] (manual, Yogi) Email lain kembali ke `/login?error=AccessDenied` dengan pesan
- [x] Tanpa cookie session, `/dashboard` dialihkan ke `/login`. `/login`, `/api/auth/*`, aset statis, dan `manifest.webmanifest` tidak dialihkan

**Verification:**

- [x] Tes: `tests/unit/allowlist.spec.ts`, `tests/unit/proxy.spec.ts`, `tests/api/upsert-user.spec.ts`
- [x] (manual, Yogi) login dengan akun di allowlist dan akun di luar allowlist di `pnpm dev`
- [x] `pnpm build` hijau (tidak ada error cache components)

**Catatan:** Proxy melewati semua `/api/*` (bukan hanya `/api/auth/*`) supaya route API membalas 401 JSON. Smoke test `next start`: `/dashboard` tanpa cookie → 307 `/login`, pesan AccessDenied tampil, provider `google` terdaftar. Login Google sungguhan butuh `.env` dengan nama variabel Auth.js v5 dan redirect URI `/api/auth/callback/google` di Google Console.

**Dependencies:** T1, T2 (tabel `users`)

**Files likely touched:** `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `proxy.ts`, `app/(auth)/login/page.tsx`, `tests/unit/allowlist.test.ts`

**Estimated scope:** M

---

### Checkpoint A: setelah T1–T3

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [x] Migrasi jalan di DB kosong dan di Supabase
- [x] Login Google berhasil secara manual
- [x] Review dengan Yogi sebelum lanjut
