# Todo phase 10: Periode, total, filter

Plan: [plan-10.md](plan-10.md) · Index: [plan.md](plan.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T29: Filter di `GET /api/transactions`

**Description:** Schema filter di `lib/schemas/transaction.ts`: `type` (`income|expense|saving|transfer|adjustment`), `accountId`, `categoryId` (`z.uuid()`), `from`, `to` (`z.iso.date()`, `from ≤ to`), digabung dengan query schema T27. `transactionWhere(userId, filters)` di `lib/server/transactions.ts` (`user_id`, `deleted_at is null`, filter opsional; `accountId` → `account_id = x or to_account_id = x`), dipakai `listTransactions`. Route mem-parse query dan mengembalikan 400 `VALIDATION_ERROR` untuk nilai tidak valid. Param tak dikenal diabaikan.

**Acceptance criteria:**
- [x] `type`, `categoryId`, dan `from`/`to` (inklusif di kedua ujung) bekerja sendiri dan dikombinasikan. `accountId` mengembalikan transfer di sisi sumber maupun tujuan
- [x] `from > to`, `type=foo`, `accountId=abc` → 400 dengan `fields`. `accountId` atau `categoryId` milik user lain → 200 dengan daftar kosong
- [x] Paginasi cursor tetap benar di bawah filter (halaman berikutnya tidak keluar dari himpunan terfilter)
- [x] Isolasi: filter tidak pernah membuka baris user lain

**Verification:**
- [x] `pnpm vitest run tests/api/transactions-list.spec.ts tests/unit/transaction-schema.spec.ts` hijau
- [x] `pnpm build` hijau

**Dependencies:** T27

**Files likely touched:** `lib/schemas/transaction.ts`, `lib/server/transactions.ts`, `app/api/transactions/route.ts`, `tests/api/transactions-list.spec.ts`

**Estimated scope:** M (4 file)

---

### T30: `GET /api/transactions/totals`

**Description:** `lib/server/queries/transaction-totals.ts`: `transactionTotals(userId, filters)` satu query `coalesce(sum(amount) filter (where type = 'income'), 0)` untuk `income`, `expense`, `saving`, memakai `transactionWhere`. `app/api/transactions/totals/route.ts` `GET` (filter yang sama, `cursor`/`limit` diabaikan) → 200 `{ income, expense, saving }`.

**Acceptance criteria:**
- [x] Angka sama dengan jumlah baris terfilter. Transfer, adjustment, dan baris soft-deleted tidak dihitung. Hasil kosong → `{ income: 0, expense: 0, saving: 0 }` (angka, bukan `null`)
- [x] Filter yang sama dengan list memberi himpunan yang sama (uji: jumlah baris `GET /api/transactions` semua halaman = totals)
- [x] Biaya admin (expense) ikut terhitung. Nilai tidak valid → 400. Isolasi A/B. Tanpa session → 401

**Verification:**
- [x] `pnpm vitest run tests/api/transactions-list.spec.ts` (bagian totals) hijau
- [x] `pnpm build` hijau

**Dependencies:** T29

**Files likely touched:** `lib/server/queries/transaction-totals.ts`, `app/api/transactions/totals/route.ts`, `tests/api/transactions-list.spec.ts`

**Estimated scope:** S

---

### T31: Filter di URL + stepper periode

**Description:** `lib/transaction-filters.ts` (murni, client dan server): `TransactionFilters`, `parseFilters(searchParams, today)` (tanpa `period` → bulan berjalan), `filtersToSearchParams(filters)` (urutan param tetap, nilai kosong dibuang), `periodToRange(period)`, `normalizeFilters`. `useTransactions(filters)` memakai `filtersToSearchParams` untuk key halaman. `components/transactions/period-stepper.tsx`: bulan sebelumnya/berikutnya, pilih bulan, tahun, atau "Semua" → menulis `period` dengan `router.replace`. `/transactions` membaca `useSearchParams` di dalam `<Suspense>`.

**Acceptance criteria:**
- [ ] `/transactions` tanpa param menampilkan bulan berjalan Jakarta. Prev/next menggeser bulan, "Semua" menampilkan semua baris. Refresh `?period=2026-10` mempertahankan periode, dan back tidak menumpuk langkah
- [ ] Filter yang sama menghasilkan key SWR yang sama (tanpa daftar dobel di cache)
- [ ] Target sentuh stepper ≥ 44 px, 360 px tanpa horizontal scroll. `pnpm build` hijau (Suspense + `useSearchParams`)

**Verification:**
- [ ] `tests/unit/transaction-filters.spec.ts` hijau: round trip parse ↔ serialize, `periodToRange` (bulan, tahun, `all`, Februari 2028, Desember → Januari), `normalizeFilters`, `parseFilters` mengabaikan nilai tidak valid
- [ ] Manual 360×800 dan 1024

**Dependencies:** T28, T29

**Files likely touched:** `lib/transaction-filters.ts`, `tests/unit/transaction-filters.spec.ts`, `hooks/use-transactions.ts`, `components/transactions/period-stepper.tsx`, `components/transactions/transaction-list.tsx`, `app/(app)/transactions/page.tsx`

**Estimated scope:** M (6 file)

---

### T32: Strip total

**Description:** `useTransactionTotals(filters)` di `hooks/use-transactions.ts` (key `/api/transactions/totals?<query>` yang otomatis ikut `revalidateTransactions` karena berawalan `/api/transactions`). `components/transactions/totals-strip.tsx`: Income / Expense / Saving, token warna, skeleton, `hideAmounts`, di atas daftar.

**Acceptance criteria:**
- [ ] Angka cocok dengan jumlah baris terfilter. Setelah menambah transaksi dari form, total berubah tanpa reload
- [ ] Hasil kosong menampilkan `Rp0`, bukan strip kosong. `hideAmounts` menyamarkan ketiganya
- [ ] 360 px: tiga angka muat tanpa terpotong (singkatan `abbreviateIDR` bila perlu)

**Verification:**
- [ ] Unit: pembangun key totals sama dengan pembangun key daftar tanpa `cursor`/`limit` (tambah ke `tests/unit/use-transactions.spec.ts`)
- [ ] Manual: tambah dan hapus transaksi, total ikut berubah

**Dependencies:** T30, T31

**Files likely touched:** `hooks/use-transactions.ts`, `components/transactions/totals-strip.tsx`, `components/transactions/transaction-list.tsx`, `tests/unit/use-transactions.spec.ts`

**Estimated scope:** S

---

### T33: Panel filter Jenis/Akun/Kategori

**Description:** `components/transactions/filter-panel.tsx` di dalam `ResponsiveModal`: select Jenis (Semua + lima tipe, "Penyesuaian" untuk adjustment), Akun (aktif + terarsip berlabel "(arsip)"), Kategori (dikelompokkan per `kind`, dipersempit mengikuti Jenis lewat `CATEGORY_KIND_FOR`, terarsip berlabel). Tombol pemicu dengan badge jumlah filter aktif, Reset. Perubahan menulis URL lewat `normalizeFilters` + `router.replace`.

**Acceptance criteria:**
- [ ] Memilih Jenis, Akun, Kategori memfilter daftar dan total, dan URL mencerminkannya. Refresh dan back mempertahankan filter
- [ ] Mengganti Jenis ke Transfer atau Penyesuaian menghapus filter Kategori. Mengganti Jenis ke tipe dengan `kind` berbeda menghapus Kategori yang tak cocok
- [ ] Akun dan kategori terarsip masih bisa dipilih sebagai filter. Badge menampilkan jumlah filter aktif (bukan periode). Reset mengembalikan ke default (periode tetap)
- [ ] Drawer di 360 px, dialog di ≥ 1024 px. Select 16 px, target ≥ 44 px

**Verification:**
- [ ] Unit: `normalizeFilters` dan penghitung badge (tambah ke `tests/unit/transaction-filters.spec.ts`)
- [ ] `pnpm build` hijau. Manual 360×800 dan 1024

**Dependencies:** T31

**Files likely touched:** `components/transactions/filter-panel.tsx`, `components/transactions/transaction-list.tsx`, `lib/transaction-filters.ts`, `tests/unit/transaction-filters.spec.ts`

**Estimated scope:** M (4 file)

---

### Checkpoint I

- [ ] Gerbang penuh hijau
- [ ] Acceptance criteria filter, periode, dan totals di SPEC-transactions.md tercentang
- [ ] Manual: URL bisa ditempel di tab baru dan menghasilkan tampilan sama. Total cocok dengan daftar
- [ ] Review dengan Yogi sebelum phase 11
