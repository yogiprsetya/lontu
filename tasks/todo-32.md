# Todo phase 32: Lihat dan atur budget

Plan: [plan-32.md](plan-32.md) · Index: [plan.md](plan.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, cek manual di 360×800 dan 1024, lalu satu commit conventional.

---

### T114: `/budget` membaca model baru

**Description:** `useBudgetUsage(period)` (key `apiKey("budgets", { path: "usage", query: { period } })`) di `hooks/use-budgets.ts`. `budget-view.tsx` memakai hook baru: ringkasan, daftar budget urut `compareByAttention`, baris "tanpa budget", empty state "Belum ada budget untuk {bulan}." (tombol Tambah datang di T115), tanpa kategori spending → "Tambah kategori" seperti sekarang. `budget-row.tsx` menjadi baris budget: nama, nama kategori (dipotong satu baris), "Rp terpakai dari Rp budget · %", sisa/lebih, progress, teks status. Form per kategori lama dihapus (baris belum bisa di-tap). Batas `budgetPeriodFromParam` dan `MonthStepper` = bulan berjalan. Hook dan tipe lama dibiarkan sampai T120.

**Acceptance criteria:**

- [x] `compareByAttention` dites murni: over sebelum warning sebelum ok, persen turun, seri diputus nama
- [x] `budgetPeriodFromParam("2026-12", "2026-11-15")` → `2026-11`; stepper tidak bisa maju melewati bulan berjalan
- [x] Halaman memakai `useBudgetUsage` saja (`rg -n "useBudgets\(" components/budgets` kosong; dashboard pindah di T119); status tetap terbaca tanpa warna; progress `role="progressbar"`

**Verification:**

- [x] `pnpm vitest run tests/unit/budget-format.spec.ts tests/unit/use-budgets.spec.ts` hijau
- [ ] Manual (tertunda: sesi tanpa browser): budget dari T111/T112 (dibuat lewat API) tampil berurutan; bulan lalu menampilkan versi lama

**Dependencies:** T108, T109, T111

**Files likely touched:** `hooks/use-budgets.ts`, `components/budgets/budget-view.tsx`, `components/budgets/budget-row.tsx`, `components/budgets/budget-summary.tsx` (tipe), `components/budgets/month-stepper.tsx`, `components/forms/budget-form.tsx` (dihapus), `lib/budget-format.ts`, `tests/unit/budget-format.spec.ts`

**Estimated scope:** M

---

### T115: Tambah budget

**Description:** Tombol "Tambah budget" (di header dan empty state, hanya bulan berjalan) membuka `budget-form.tsx` baru di `ResponsiveModal`: Nama, Nominal per bulan (`MoneyInput`), Needs/Wants (`ToggleGroup`), Kategori (checkbox dari `budgetCategoryOptions`). Simpan → `createBudget` → toast "Budget disimpan". Teks bantuan bila semua kategori jenis itu sudah dipakai: "Semua kategori {Needs} sudah punya budget."

**Acceptance criteria:**

- [x] `budgetCategoryOptions` dites murni: filter jenis, `taken` membawa nama budget pemilik, terarsip hanya bila `own`, urut nama
- [x] Galat server tampil di field: 409 → Nama, 400 `categoryIds` → Kategori; galat jaringan → toast
- [ ] Input 16 px, target sentuh ≥ 44 px, tidak ada scroll horizontal di 360 px (kode: `inputClass`, `h-11`/`min-h-11`, `size-14`; cek visual tertunda: sesi tanpa browser)

**Verification:**

- [x] `pnpm vitest run tests/unit/budget-format.spec.ts tests/unit/use-budgets.spec.ts` hijau
- [ ] Manual (tertunda: sesi tanpa browser): buat dua budget wants; kategori budget pertama disabled "di {nama}" di form kedua

**Dependencies:** T112, T114

**Files likely touched:** `components/forms/budget-form.tsx`, `components/budgets/budget-view.tsx`, `hooks/use-budgets.ts`, `lib/budget-format.ts`, `tests/unit/budget-format.spec.ts`, `tests/unit/use-budgets.spec.ts`

**Estimated scope:** M

---

### T116: Sheet budget: rincian per kategori + edit

**Description:** Tap baris → sheet berjudul nama budget: rincian per kategori (nama, terpakai, tautan `budgetTransactionsHref(period, categoryId)` "Lihat transaksi"). Bulan berjalan: form edit (nilai awal dari versi efektif, Needs/Wants terkunci sebagai teks, kategori sendiri tercentang, terarsip sendiri tampil "(arsip)") → `updateBudget`. Bulan lalu: hanya rincian.

**Acceptance criteria:**

- [ ] Edit nama, nominal, dan kategori tersimpan; hanya field yang berubah dikirim di `PATCH`
- [ ] Bulan lalu: sheet tanpa field dan tanpa Simpan
- [ ] Tautan per kategori membuka `/transactions` dengan filter yang totalnya sama dengan angka di rincian

**Verification:**

- [ ] `pnpm vitest run tests/unit/use-budgets.spec.ts` hijau
- [ ] Manual: pindahkan Jajan dari budget A (hapus centang) ke budget B (centang) → angka keduanya dan "tanpa budget" konsisten

**Dependencies:** T113, T115

**Files likely touched:** `components/forms/budget-form.tsx`, `components/budgets/budget-breakdown.tsx` (baru), `components/budgets/budget-view.tsx`, `hooks/use-budgets.ts`, `tests/unit/use-budgets.spec.ts`

**Estimated scope:** M
