# Todo phase 13: Atur budget dan lihat pemakaian

Plan: [plan-13.md](plan-13.md) · Index: [plan.md](plan.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T42: Migrasi `budgets.deleted_at`, schema Zod, `budgetStatus`

**Description:** Tambah `deletedAt` (timestamptz null) ke `budgets` di `db/schema.ts`, `pnpm db:generate`, periksa SQL, `pnpm db:migrate`. `lib/schemas/budget.ts`: tipe `Budget`, `BudgetUsage*`, `BudgetSuggestion`, `budgetPeriodSchema` (format `YYYY-MM`, 2000-01 sampai bulan depan Jakarta, dihitung saat parse), `budgetAmount` (`z.int()` 0..1e12), `budgetSetSchema` (`strictObject { period, items }`, items 1–100, `categoryId` unik), `periodToYearMonth`, `yearMonthToPeriod`, `monthRange`. `lib/budget-status.ts` murni: `budgetStatus(budget, spent)` → `{ remaining, percent, status }`. Tes ditulis lebih dulu.

**Acceptance criteria:**

- [x] Migrasi hanya berisi `ALTER TABLE "budgets" ADD COLUMN "deleted_at" timestamp with time zone`. Baris lama `deleted_at = null`
- [x] `budgetPeriodSchema`: `2026-13`, `2026-1`, `1999-12`, dua bulan ke depan → gagal. Bulan depan lolos, termasuk Desember → Januari tahun berikutnya (fake timer). `monthRange("2028-02")` → `2028-02-01..2028-02-29`
- [x] `budgetStatus`: 79% `ok`, 80% dan 100% `warning`, 101% `over`, `(0, 0)` `ok` dengan `percent = null`, `(0, 1)` `over`, `(null, x)` `none`. `percent` dibulatkan ke bawah, `remaining` boleh negatif
- [x] `budgetSetSchema` menolak `items` kosong/>100, `categoryId` ganda, `amount` −1/1.5/`"100"`/>1e12, field tak dikenal (`userId`)

**Verification:**

- [x] `pnpm vitest run tests/unit/budget-schema.spec.ts tests/unit/budget-status.spec.ts` hijau
- [x] `tests/api/db-constraints.spec.ts` tetap hijau setelah migrasi

**Dependencies:** None

**Files likely touched:** `db/schema.ts`, `drizzle/<timestamp>_budget_deleted_at/`, `lib/schemas/budget.ts`, `lib/budget-status.ts`, `tests/unit/budget-schema.spec.ts`, `tests/unit/budget-status.spec.ts`

**Estimated scope:** M

---

### T43: `GET /api/budgets` + query `budgetUsage`

**Description:** `lib/server/queries/budget-usage.ts`: `budgetUsage(userId, period)` satu query: kategori spending milik user yang aktif, ditambah yang terarsip dengan budget aktif atau pengeluaran di bulan itu. Left join budget aktif (`deleted_at is null`) dan CTE `sum(amount)` expense tak terhapus per kategori dalam `monthRange`. Urut `spending_type`, `lower(name)`. Lalu `budgetStatus` per item dan `summary` (`needs`, `wants`, `total`: `budget`, `spent`, `unbudgetedSpent`). `app/api/budgets/route.ts` `GET` dengan `?period` wajib. Tes merah lebih dulu.

**Acceptance criteria:**

- [x] Expense 1.300.000 di Makan (budget 1.500.000, termasuk satu biaya admin transfer) → `spent 1300000`, `remaining 200000`, `percent 86`, `warning`. Expense tanggal 1 dan hari terakhir bulan ikut. Bulan lain, terhapus, transfer, saving, adjustment tidak ikut
- [x] `summary.total.spent` = `transactionTotals({ from, to }).expense`. `unbudgetedSpent` per grup benar. Kategori terarsip tanpa budget dan tanpa pengeluaran tidak muncul. Budget yang di-soft-delete (diset langsung di DB) → `budget null`, `status none`
- [x] `period` hilang/tidak valid → 400 `fields.period`. Isolasi: B tidak melihat kategori, budget, atau pengeluaran A. Tanpa session → 401

**Verification:**

- [x] `pnpm vitest run tests/api/budget-usage.spec.ts` hijau

**Dependencies:** T42

**Files likely touched:** `lib/server/queries/budget-usage.ts`, `app/api/budgets/route.ts`, `tests/api/budget-usage.spec.ts`

**Estimated scope:** M

---

### T44: `PUT /api/budgets` upsert atomik

**Description:** `findOwnedCategories(userId, ids)` di `lib/server/ownership.ts` (pola `findOwnedAccounts`, mengembalikan `kind` dan `archivedAt`). `lib/server/budgets.ts` `setBudgets(userId, input)`: semua `categoryId` harus milik user, aktif, `kind = spending`, jika tidak → `fieldError("items", "Kategori tidak valid")` tanpa menulis. Satu `insert … on conflict … do update set amount, deleted_at = null … returning`, diurutkan sesuai `items`. `PUT` di `app/api/budgets/route.ts`.

**Acceptance criteria:**

- [ ] `PUT` Makan 1.500.000 → 200 `Budget[]` dengan `period "2026-10"`. `PUT` kedua 1.200.000 → id sama, `amount` baru, satu baris di DB. Baris yang `deleted_at`-nya diisi lalu di-`PUT` → id sama, `deleted_at null`, `created_at` tidak berubah
- [ ] Satu item valid + satu kategori income/saving/terarsip/milik B/tidak ada → 400 `fields.items`, **nol baris** tertulis. Body tidak valid (T42) → 400. Bulan depan → 200
- [ ] Isolasi: B tidak bisa `PUT` ke kategori A, `userId` di body → 400. Tanpa session → 401

**Verification:**

- [ ] `pnpm vitest run tests/api/budgets.spec.ts tests/api/ownership.spec.ts` hijau

**Dependencies:** T42

**Files likely touched:** `lib/server/ownership.ts`, `lib/server/budgets.ts`, `app/api/budgets/route.ts`, `tests/api/budgets.spec.ts`, `tests/api/ownership.spec.ts`

**Estimated scope:** M

---

### T45: `hooks/use-budgets.ts` + matcher revalidasi

**Description:** `budgetsKey(period)` → `"/api/budgets?period=YYYY-MM"`, `isBudgetsKey`, `useBudgets(period)`, `revalidateBudgets()`, `setBudgets(input)` (`sendJSON` `PUT`, lalu revalidasi, melempar `ApiError`). `revalidateTransactions()` di `hooks/use-transactions.ts` juga me-revalidate key budget. `archiveCategory`/`restoreCategory` di `hooks/use-categories.ts` memanggil `revalidateBudgets()`.

**Acceptance criteria:**

- [ ] `isBudgetsKey` cocok dengan `/api/budgets?period=…` dan `/api/budgets/suggestion?…`, tidak cocok dengan `/api/budgetsx` atau `/api/transactions`
- [ ] `revalidateTransactions()` memanggil `mutate` dengan matcher yang menerima key budget (dites dengan mock `mutate`)
- [ ] Tidak ada data budget di Zustand

**Verification:**

- [ ] `pnpm vitest run tests/unit/use-budgets.spec.ts tests/unit/use-transactions.spec.ts tests/unit/use-categories.spec.ts` hijau

**Dependencies:** T43, T44

**Files likely touched:** `hooks/use-budgets.ts`, `hooks/use-transactions.ts`, `hooks/use-categories.ts`, `tests/unit/use-budgets.spec.ts`, `tests/unit/use-transactions.spec.ts`

**Estimated scope:** S

---

### T46: Halaman `/budget` (baca)

**Description:** Ganti placeholder `app/(app)/budget/page.tsx` dengan `<Suspense>` + `components/budgets/budget-view.tsx` (client). `period` dari `?period` (tidak valid/hilang → bulan berjalan Jakarta), ditulis lewat `router.replace`. `month-stepper.tsx` (`shiftPeriod`, `formatPeriodLabel`, maju maksimal bulan depan). `budget-summary.tsx`: kartu Total/Needs/Wants (terpakai dari budget, sisa, progress, "Rp… tanpa budget"). `budget-row.tsx`: nama dari `useCategories({ includeArchived: true })` + "(arsip)", "Rp terpakai dari Rp budget · 85%", sisa atau "Lebih Rp…", teks status ("Hampir habis", "Melebihi budget"), `budget-progress.tsx`. Kategori tanpa budget menampilkan "Atur budget" (belum aktif sampai T47). Skeleton, error "Coba lagi", empty state tanpa kategori spending → "Tambah kategori" (`open("manageCategories", { kind: "spending" })`). `hideAmounts` dipatuhi.

**Acceptance criteria:**

- [ ] `/budget?period=2026-10` bertahan setelah refresh. Stepper tidak melewati bulan depan, tombol ≥ 44 px
- [ ] Angka sama dengan respons `GET`. Status terbaca tanpa warna. Warna `--budget` untuk warning, `--expense` untuk over
- [ ] Catat expense dari **+** lalu kembali → angka berubah tanpa reload
- [ ] 360 px tanpa horizontal scroll. `pnpm build` hijau (Suspense)

**Verification:**

- [ ] Manual 360×800 dan 1024, light dan dark
- [ ] `pnpm build` hijau

**Dependencies:** T45

**Files likely touched:** `app/(app)/budget/page.tsx`, `components/budgets/budget-view.tsx`, `components/budgets/month-stepper.tsx`, `components/budgets/budget-summary.tsx`, `components/budgets/budget-row.tsx`, `components/budgets/budget-progress.tsx`

**Estimated scope:** M (6 file kecil, satu alur)

---

### T47: Form budget

**Description:** `components/forms/budget-form.tsx` di `ResponsiveModal`, dibuka dari baris atau "Atur budget" dengan state lokal `categoryId`. Field `MoneyInput` (tanpa ±), judul nama kategori + bulan, tombol Simpan (spinner, `setBudgets` dengan satu item), galat server lewat `applyServerErrors`, toast "Budget disimpan". Tautan "Lihat transaksi" → `/transactions?period=…&type=expense&categoryId=…`. Footer sticky seperti form akun.

**Acceptance criteria:**

- [ ] Atur → simpan → baris dan ringkasan berubah tanpa reload. Edit nominal yang ada mengisi nilai lama
- [ ] Budget 0 tersimpan dan berstatus `over` jika ada pengeluaran
- [ ] Galat 400 tampil di form. Input 16 px, target ≥ 44 px, keyboard tidak menutupi Simpan di 360×800

**Verification:**

- [ ] Manual 360×800 dan 1024
- [ ] `pnpm build` hijau

**Dependencies:** T46

**Files likely touched:** `components/forms/budget-form.tsx`, `components/budgets/budget-view.tsx`

**Estimated scope:** S

---

### Checkpoint L

- [ ] Gerbang penuh hijau
- [ ] Alur atur → catat expense → status berubah di 360×800 dan 1024
- [ ] Review dengan Yogi
