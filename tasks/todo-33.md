# Todo phase 33: Akhiri budget, dashboard, jalur lama

Plan: [plan-33.md](plan-33.md) · Index: [plan.md](plan.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T117: `DELETE` / `restore` = akhiri mulai bulan ini

**Description:** Ganti `softDeleteBudget`/`restoreBudget` di `lib/server/budgets.ts` dengan `endBudget`/`restoreBudget` atas `budget_versions` (plan-33 § Keputusan). Route `[id]` `DELETE` dan `[id]/restore` memakai `budget_id`. Tes delete/restore lama (baris per kategori) diganti tes baru di `budgets.spec.ts`.

**Acceptance criteria:**

- [x] Budget dengan versi bulan lalu → `DELETE` → tidak tampil bulan ini, bulan lalu tetap. `DELETE` kedua → 200, `deletedAt` sama. `restore` → tampil lagi; kedua kali → 200
- [x] Budget dibuat bulan ini lalu `DELETE` → tidak tampil di bulan mana pun. Setelah `DELETE`, nama dan kategorinya bisa dipakai budget baru; `restore` budget lama → 409 `BUDGET_RESTORE_CONFLICT`
- [x] Id bukan UUID, tidak ada, milik B → 404. Tanpa session → 401

**Verification:**

- [x] `pnpm vitest run tests/api/budgets.spec.ts tests/api/budget-usage.spec.ts` hijau

**Dependencies:** T112, T114

**Files likely touched:** `lib/server/budgets.ts`, `app/api/budgets/[id]/route.ts`, `app/api/budgets/[id]/restore/route.ts`, `tests/api/budgets.spec.ts`

**Estimated scope:** M

---

### T118: Hapus budget + Urungkan di UI

**Description:** `endBudgetInUsage` di `lib/budget-cache.ts` (menggantikan `removeBudgetFromUsage`). `deleteBudget(period, id)` lewat `removeOptimistically` dan `restoreBudget(id)` di `hooks/use-budgets.ts` memakai route baru. Tombol "Hapus budget" di sheet bulan berjalan dengan teks "Berakhir mulai {bulan}. Bulan sebelumnya tetap." → modal tutup, toast "Budget dihapus · Urungkan" (`undoToast`, 6 detik). 409 saat Urungkan → toast pesan server.

**Acceptance criteria:**

- [x] `endBudgetInUsage` dites murni: item keluar, `unbudgeted` dan `summary` sama dengan hasil server untuk data yang sama; id tak dikenal → data tidak berubah
- [x] `DELETE` gagal → baris kembali dan toast galat (dites dengan mock `mutate`/`sendJSON` seperti `use-budgets.spec.ts` sekarang)
- [x] Tidak ada data budget di Zustand

**Verification:**

- [x] `pnpm vitest run tests/unit/budget-cache.spec.ts tests/unit/use-budgets.spec.ts` hijau
- [ ] Manual (tertunda: sesi tanpa browser): hapus → baris hilang seketika, "tanpa budget" bertambah; Urungkan mengembalikannya

**Dependencies:** T116, T117

**Files likely touched:** `lib/budget-cache.ts`, `hooks/use-budgets.ts`, `components/forms/budget-form.tsx`, `tests/unit/budget-cache.spec.ts`, `tests/unit/use-budgets.spec.ts`

**Estimated scope:** M

---

### T119: Budget Summary dashboard per budget

**Description:** `components/dashboard/budget-summary.tsx` memakai `useBudgetUsage(period)`: progress total, lalu maks 3 budget dari `budgetHighlights` (nama dari respons, tautan `/budget?period=…`). `budgetHighlights` di `lib/dashboard-format.ts` memakai tipe baru dan `compareByAttention`. Invarian di `tests/api/dashboard.spec.ts` memakai `budgetUsage` baru.

**Acceptance criteria:**

- [ ] `budgetHighlights` dites: hanya over/warning, maks 3, urutan `compareByAttention`
- [ ] Invarian `totals.expense = budgetUsage(userId, period).summary.total.spent` hijau dengan budget bernama dan pengeluaran tanpa budget
- [ ] Bulan tanpa budget → CTA "Atur budget" ke `/budget?period=…`; mode tahun tidak berubah

**Verification:**

- [ ] `pnpm vitest run tests/unit/dashboard-format.spec.ts tests/api/dashboard.spec.ts` hijau
- [ ] Manual: dashboard dan `/budget` menunjukkan angka yang sama setelah mencatat expense

**Dependencies:** T111, T114

**Files likely touched:** `components/dashboard/budget-summary.tsx`, `lib/dashboard-format.ts`, `tests/unit/dashboard-format.spec.ts`, `tests/api/dashboard.spec.ts`

**Estimated scope:** M

---

### T120: Hapus jalur lama per kategori

**Description:** Hapus semua yang disebut plan-33 § Keputusan "T120 menghapus", beserta tesnya. `app/api/budgets/route.ts` tinggal `POST`. `db/schema.ts` tetap memuat `budgets` sampai T122.

**Acceptance criteria:**

- [ ] `rg -n "legacyBudgetUsage|setBudgets|budgetSetSchema|budgetPeriodSchema|maxBudgetPeriod|summarizeBudgets\b|removeBudgetFromUsage|budgetsKey|useBudgets\(" app components hooks lib tests` kosong
- [ ] `GET /api/budgets` dan `PUT /api/budgets` → 405
- [ ] Tes yang hilang hanya untuk perilaku lama yang dihapus (daftar di commit body)

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau

**Dependencies:** T114–T119

**Files likely touched:** `app/api/budgets/route.ts`, `lib/server/budgets.ts`, `lib/server/queries/budget-usage.ts`, `lib/schemas/budget.ts`, `lib/budget-status.ts`, `hooks/use-budgets.ts`, `tests/api/budgets.spec.ts`, `tests/api/budget-usage.spec.ts`, `tests/unit/budget-schema.spec.ts`, `tests/unit/budget-status.spec.ts`, `tests/unit/use-budgets.spec.ts` (sebagian besar penghapusan)

**Estimated scope:** M
