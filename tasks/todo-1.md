# Todo phase 1: Fondasi teknis

Plan: [plan-1.md](plan-1.md) · Index: [plan.md](plan.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T1: Tooling, scripts, Vitest, dan `money.ts`

**Description:** Pasang dependency foundation, tambah script, siapkan Vitest, dan buktikan pipeline tes dengan `lib/money.ts` yang ditulis secara TDD. Perbarui `.env.example` ke nama variabel Auth.js v5.

**Acceptance criteria:**
- [x] Dependency dari Deliverables §1 terpasang: `next-auth@5`, `zod@4`, `swr`, `zustand`, `react-hook-form`, `@hookform/resolvers`, `next-themes`, `server-only`, dev `vitest`, `@playwright/test`. Script `typecheck`, `test`, `test:watch`, `test:e2e`, `db:generate`, `db:migrate`, `db:studio` ada
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
- [ ] `pnpm db:migrate` pada DB kosong membuat 5 tabel, semua index & unique `lower(name)`, view `account_balances` (`security_invoker`), dan RLS aktif di kelima tabel tanpa policy
- [ ] Constraint menolak: transfer tanpa `to_account_id`, transfer ke akun yang sama, expense tanpa kategori, kategori spending tanpa `spending_type`, `amount <= 0`
- [ ] Skenario saldo: awal 100.000, income 50.000, expense 20.000, transfer 10.000 ke B, satu expense soft-deleted → A = 120.000, B = awal B + 10.000

**Verification:**
- [ ] `pnpm test` menjalankan `tests/api/db-constraints.test.ts` dan `tests/api/account-balances.test.ts` terhadap DB tes, hijau
- [ ] Manual: query `pg_class.relrowsecurity` = true untuk kelima tabel
- [ ] Manual (setelah migrasi ke Supabase): REST dengan anon key mengembalikan 0 baris

**Dependencies:** T1. Open question #1 diputuskan: Supabase

**Files likely touched:** `db/schema.ts`, `db/index.ts`, `drizzle.config.ts`, `drizzle/*.sql`, `tests/api/db-constraints.test.ts`, `tests/api/account-balances.test.ts`, `tests/setup/db.ts`

**Estimated scope:** M

---

### T3: Login Google dengan allowlist

**Description:** Konfigurasi Auth.js v5 di `lib/auth.ts` (Google, JWT, callback `signIn` dengan allowlist + upsert `users`, `session.user.id = token.sub`), route handler `/api/auth/[...nextauth]`, `proxy.ts` untuk redirect optimistik, dan halaman `/login`. Baca `node_modules/next/dist/docs/` untuk `proxy.ts` sebelum menulis.

**Acceptance criteria:**
- [ ] Email di `ALLOWED_EMAILS` login, mendarat di `/dashboard` (placeholder sementara), dan baris `users` tercipta. Login kedua tidak menduplikasi baris
- [ ] Email lain kembali ke `/login?error=AccessDenied` dengan pesan
- [ ] Tanpa cookie session, `/dashboard` dialihkan ke `/login`. `/login`, `/api/auth/*`, aset statis, dan `manifest.webmanifest` tidak dialihkan

**Verification:**
- [ ] Tes unit: parsing `ALLOWED_EMAILS` (spasi, huruf besar, kosong) dan logika upsert `users` terhadap DB tes
- [ ] Manual: login dengan akun di allowlist dan akun di luar allowlist di `pnpm dev`
- [ ] `pnpm build` hijau (tidak ada error cache components)

**Dependencies:** T1, T2 (tabel `users`)

**Files likely touched:** `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `proxy.ts`, `app/(auth)/login/page.tsx`, `tests/unit/allowlist.test.ts`

**Estimated scope:** M

---

### Checkpoint A: setelah T1–T3
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Migrasi jalan di DB kosong dan di Supabase
- [ ] Login Google berhasil secara manual
- [ ] Review dengan Yogi sebelum lanjut
