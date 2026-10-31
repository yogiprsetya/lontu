# Todo phase 31: Model dan API

Plan: [plan-31.md](plan-31.md) · Index: [plan.md](plan.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Semua task di phase ini server saja.

---

### T110: Tabel `budget_versions`

**Description:** Tambah `budgetVersions` di `db/schema.ts` (`pgTable.withRLS`, kolom dan constraint di plan-31 § Keputusan). `pnpm exec drizzle-kit generate --explain`, pastikan hanya penambahan, lalu `pnpm db:generate` dan `pnpm db:migrate`. Tabel `budgets` dan kode lama tidak disentuh. Tes constraint ditulis lebih dulu.

**Acceptance criteria:**

- [x] `migration.sql` hanya berisi `CREATE TABLE "budget_versions"`, `ENABLE ROW LEVEL SECURITY`, index unik, dan FK `user_id` cascade
- [x] Ditolak Postgres dengan nama constraint: `month` 0/13, `amount` −1, `spending_type 'saving'`, `category_ids '{}'`, baris ganda `(user_id, budget_id, year, month)`. Hapus user → versinya ikut terhapus
- [x] Semua tes lama hijau tanpa diedit

**Verification:**

- [x] `pnpm vitest run tests/api/db-constraints.spec.ts` hijau

**Dependencies:** T107

**Files likely touched:** `db/schema.ts`, `drizzle/<timestamp>_budget_versions/`, `tests/api/db-constraints.spec.ts`

**Estimated scope:** M

---

### T111: `budgetUsage` berversi + `GET /api/budgets/usage`

**Description:** Ganti nama query lama menjadi `legacyBudgetUsage` (importer: route lama, `budgets.spec.ts`, `budget-usage.spec.ts`, `dashboard.spec.ts`). Tulis `budgetUsage(userId, period)` baru di `lib/server/queries/budget-usage.ts`, satu query SQL: versi efektif per budget (plan-31 § Keputusan), kategori efektif, `sum(amount)` expense tak terhapus per kategori dalam `monthRange(period)`. Hasil: `items` per budget yang tampil (urut `spending_type`, `lower(name)`) dengan `categories[{ categoryId, spent }]` dan `budgetStatus`, `unbudgeted` (kategori spending, termasuk terarsip, dengan `spent > 0` yang tidak ada di budget mana pun bulan itu), `summary` lewat `summarizeBudgetUsage`. Tipe dan `budgetUsageQuerySchema` (period 2000-01..bulan berjalan) di `lib/schemas/budget-usage.ts`. Route `app/api/budgets/usage/route.ts`. Data tes disisipkan langsung ke `budget_versions`. Tes merah lebih dulu.

**Acceptance criteria:**

- [ ] Budget dengan versi Sep (Rp1.000.000, {Makan}) dan Nov (Rp1.200.000, {Makan, Jajan}): Agustus tidak tampil; Okt pakai versi Sep; Des pakai versi Nov. Versi Des dengan `deleted_at` → Des dan Jan tidak tampil, Nov tetap. Budget yang versi pertamanya Nov tidak tampil di Okt
- [ ] `spent` budget = jumlah expense kategorinya di bulan itu (tanggal 1 dan hari terakhir ikut; transfer, saving, adjustment, terhapus, bulan lain tidak). `unbudgeted` benar, termasuk kategori terarsip. `summary.total.spent = transactionTotals({ from, to }).expense`, juga saat sebuah kategori pindah budget di bulan berikutnya
- [ ] `period` hilang, `2026-13`, `1999-12`, atau bulan depan → 400 `fields.period`. Isolasi: B tidak melihat budget, kategori, atau pengeluaran A. Tanpa session → 401
- [ ] `summarizeBudgetUsage` dites murni (unit), dan tes lama untuk `legacyBudgetUsage` tetap hijau

**Verification:**

- [ ] `pnpm vitest run tests/api/budget-usage.spec.ts tests/unit/budget-status.spec.ts tests/api/dashboard.spec.ts` hijau

**Dependencies:** T110

**Files likely touched:** `lib/server/queries/budget-usage.ts`, `lib/schemas/budget-usage.ts`, `lib/budget-status.ts`, `app/api/budgets/usage/route.ts`, `app/api/budgets/route.ts` (import), `tests/api/budget-usage.spec.ts`, `tests/api/budgets.spec.ts` + `tests/api/dashboard.spec.ts` (import), `tests/unit/budget-status.spec.ts`

**Estimated scope:** M (tiga berkas hanya ganti nama import)

---

### T112: `POST /api/budgets` buat budget

**Description:** `lib/schemas/budget.ts`: `budgetName` (trim, 1–50, sama dengan kategori), `budgetCreateSchema` (`strictObject { name, spendingType, amount, categoryIds }`, `categoryIds` 1–50 uuid unik), tipe `BudgetVersion`. `lib/server/budgets.ts`: `createBudget(userId, input)` dalam transaksi dengan advisory lock: kategori milik user, aktif, `kind = spending`, `spendingType` sama dengan budget, tidak dipakai budget lain yang tampil di bulan berjalan; nama unik (case-insensitive) di antara budget yang tampil bulan berjalan; insert versi di bulan berjalan dengan `budget_id` baru. `POST` di `app/api/budgets/route.ts` (GET/PUT lama tetap).

**Acceptance criteria:**

- [ ] `POST { name: "Jajan & Hiburan", spendingType: "wants", amount: 800000, categoryIds: [Jajan, Hiburan] }` → 201 dengan `period` bulan berjalan; `budgetUsage` bulan ini memuatnya, bulan lalu tidak
- [ ] Kategori needs di budget wants, income/saving, terarsip, milik B, tidak ada → 400 `fields.categoryIds` "Kategori tidak valid", nol baris. Kategori milik budget lain bulan ini → 400 "Kategori sudah dipakai budget lain". Nama sama (beda huruf besar) → 409 `BUDGET_NAME_TAKEN`. Body tidak valid, `userId` atau `period` di body → 400
- [ ] Dua `POST` paralel yang mengklaim kategori sama → tepat satu 201, satu 400. Isolasi A/B, tanpa session → 401

**Verification:**

- [ ] `pnpm vitest run tests/api/budgets.spec.ts tests/unit/budget-schema.spec.ts` hijau

**Dependencies:** T110

**Files likely touched:** `lib/schemas/budget.ts`, `lib/server/budgets.ts`, `app/api/budgets/route.ts`, `tests/api/budgets.spec.ts`, `tests/unit/budget-schema.spec.ts`

**Estimated scope:** M

---

### T113: `PATCH /api/budgets/[id]` ubah mulai bulan ini

**Description:** `budgetUpdateSchema` (`strictObject { name?, amount?, categoryIds? }`, minimal satu field; `spendingType` → 400). `updateBudget(userId, id, input)`: ambil versi efektif bulan berjalan (harus tampil), gabungkan field, cek seperti T112 (kecualikan budget ini sendiri; kategori terarsip yang sudah ada di versi efektif boleh tetap), upsert di `(user_id, budget_id, bulan berjalan)`. `PATCH` di `app/api/budgets/[id]/route.ts` (DELETE lama tetap sampai T117).

**Acceptance criteria:**

- [ ] Budget dengan versi bulan lalu, di-`PATCH { amount }` → versi baru di bulan berjalan; bulan lalu tetap nominal, nama, dan kategori lama. `PATCH` kedua di bulan yang sama → tetap satu versi bulan ini
- [ ] Kategori terarsip yang sudah ada boleh tetap, yang baru ditolak. Menambah kategori budget lain → 400. Ganti nama ke nama budget lain → 409; ke nama sendiri dengan huruf beda → 200
- [ ] Id bukan UUID, tidak ada, milik B, atau budget yang sudah berakhir → 404 `BUDGET_NOT_FOUND`. Body kosong atau `spendingType` → 400. Tanpa session → 401

**Verification:**

- [ ] `pnpm vitest run tests/api/budgets.spec.ts tests/unit/budget-schema.spec.ts` hijau

**Dependencies:** T112

**Files likely touched:** `lib/schemas/budget.ts`, `lib/server/budgets.ts`, `app/api/budgets/[id]/route.ts`, `tests/api/budgets.spec.ts`, `tests/unit/budget-schema.spec.ts`

**Estimated scope:** M
