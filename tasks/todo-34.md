# Todo phase 34: Cutover

Plan: [plan-34.md](plan-34.md) · Index: [plan.md](plan.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md)

Langkah yang menulis ke DB produksi (backfill, drop) hanya dijalankan setelah Yogi setuju di sesi itu.

---

### T121: Migrasi data lama ke `budget_versions`

**Description:** Buat migrasi kustom backfill sesuai plan-34 § Keputusan. Tes otomatis `tests/api/budget-backfill.spec.ts`: user tes dengan baris `budgets` lama di M−3, M−2 (celah di M−1), dan M, plus satu baris soft-deleted dan satu di M+1; jalankan SQL berkas migrasi di dalam `db.transaction` yang selalu di-rollback, lalu periksa versi user tes itu sebelum rollback. Dry run manual untuk data pemilik dengan cara yang sama (transaksi + rollback): banding total budget dan nominal per budget per bulan antara `budgets` lama dan `budgetUsage` baru. **Jangan jalankan `pnpm db:migrate`.**

**Acceptance criteria:**

- [x] Tes backfill: M−3 dan M−2 tampil dengan nominal lama; M−1 tidak tampil (celah); M tidak tampil (diakhiri); baris soft-deleted dan M+1 tidak disalin; satu `budget_id` per kategori
- [x] Dry run pemilik: untuk setiap bulan < M yang punya baris lama, `summary.total.budget` sama dengan jumlah baris lama aktif, dan setiap budget hasil migrasi bernominal sama dengan baris lamanya; bulan M = 0. Hasil dicatat di plan-34
- [ ] Cadangan baris `budgets` pemilik diekspor (CSV Supabase atau JSON lokal) sebelum T122

**Verification:**

- [x] `pnpm vitest run tests/api/budget-backfill.spec.ts` hijau, dan setelahnya tidak ada baris pemilik baru di `budget_versions`
- [ ] Review SQL dan hasil dry run bersama Yogi

**Dependencies:** T120

**Files likely touched:** `drizzle/<timestamp>_budget_versions_backfill/migration.sql` (+ snapshot), `tests/api/budget-backfill.spec.ts`, `tasks/plan-34.md`

**Estimated scope:** M

---

### T122: Cutover produksi + drop `budgets`

**Description:** (1) Screenshot `/budget` dua bulan lalu yang punya budget. (2) PR `refactor/named-budgets` → review → merge → deploy produksi Vercel. (3) Yogi setuju → `pnpm db:migrate` (backfill). (4) Verifikasi di ponsel: bulan lalu sama dengan screenshot, bulan berjalan kosong, tambah budget jalan, dashboard benar. (5) Yogi setuju → hapus `budgets` dari `db/schema.ts`, `generate --explain`, generate, `db:migrate`; hapus tes constraint `budgets` di `db-constraints.spec.ts` bersama tabelnya. (6) Perbarui status SPEC-budgets.md, SPEC.md, plan.md.

**Acceptance criteria:**

- [ ] Butir verifikasi (4) dicentang Yogi sebelum langkah (5)
- [ ] Migrasi drop hanya berisi `DROP TABLE "budgets"` (dan constraint/FK-nya)
- [ ] Setelah drop: `rg -n "\bbudgets\b" db/schema.ts` hanya rujukan nama di komentar atau tidak ada; semua tes hijau

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual produksi: `/budget` bulan lalu, bulan berjalan, dan dashboard

**Dependencies:** T121

**Files likely touched:** `db/schema.ts`, `drizzle/<timestamp>_drop_budgets/`, `tests/api/db-constraints.spec.ts`, `SPEC-budgets.md`, `SPEC.md`, `tasks/plan.md`

**Estimated scope:** S
