# Todo phase 12: Expenses dan ekspor

Plan: [plan-12.md](plan-12.md) · Index: [plan.md](plan.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T39: `/expenses` sebagai preset filter

**Description:** `TransactionList` menerima prop `lockedType?: TransactionType`. Dengan prop itu, `type` dipaksa ke `lockedType` (nilai `type` di URL diabaikan), dan `FilterPanel` menyembunyikan select Jenis. `normalizeFilters` menerima `lockedType`. `app/(app)/expenses/page.tsx` merender `<TransactionList lockedType="expense" />` di dalam `<Suspense>`, judul "Expenses". Entri sidebar tidak berubah.

**Acceptance criteria:**
- [ ] `/expenses` hanya menampilkan expense. Periode, filter Akun/Kategori, total, dan "Muat lebih banyak" bekerja seperti di `/transactions`. Filter Jenis tidak ada
- [ ] `/expenses?type=income` tetap hanya menampilkan expense. `/transactions` tidak terpengaruh
- [ ] Kategori di filter hanya kategori spending. Baris biaya admin muncul sebagai expense biasa
- [ ] 360 px tanpa horizontal scroll. `pnpm build` hijau (Suspense)

**Verification:**
- [ ] `tests/unit/transaction-filters.spec.ts` diperluas: `normalizeFilters` dengan `lockedType`
- [ ] Manual 360×800 dan 1024

**Dependencies:** T31, T33

**Files likely touched:** `components/transactions/transaction-list.tsx`, `components/transactions/filter-panel.tsx`, `lib/transaction-filters.ts`, `app/(app)/expenses/page.tsx`, `tests/unit/transaction-filters.spec.ts`

**Estimated scope:** S (5 file, perubahan kecil)

---

### T40: `GET /api/transactions/export`

**Description:** `lib/csv.ts`: `toCSV(rows)` murni (escape, penjaga formula hanya untuk sel teks, BOM). `lib/server/transaction-export.ts`: ambil semua baris terfilter dengan urutan daftar, gabungkan nama akun/tujuan/kategori dan `spending_type` (Needs/Wants), label tipe ("Penyesuaian" untuk adjustment), lalu panggil `toCSV`. `app/api/transactions/export/route.ts` `GET` dengan filter yang sama (`cursor`/`limit` diabaikan) → 200 `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="lontu-transaksi-<period|semua>.csv"`. Kolom: `Tanggal, Jenis, Jumlah, Akun, Akun Tujuan, Kategori, Needs/Wants, Deskripsi`. Tes ditulis lebih dulu.

**Acceptance criteria:**
- [ ] Respons diawali BOM dan baris header. Jumlah baris data sama dengan jumlah baris `GET /api/transactions` pada filter yang sama (semua halaman), dengan urutan yang sama
- [ ] Nama akun/kategori terarsip terisi. `description` `=1+1` keluar sebagai `'=1+1`. `Jumlah` adjustment negatif tetap `-50000`. Koma, kutip, dan newline di deskripsi ter-escape
- [ ] Filter tidak valid → 400. Isolasi: CSV user B tidak pernah memuat data A. Tanpa session → 401. Baris soft-deleted tidak ikut

**Verification:**
- [ ] `pnpm vitest run tests/unit/csv.spec.ts tests/api/transactions-export.spec.ts` hijau
- [ ] `pnpm build` hijau

**Dependencies:** T29

**Files likely touched:** `lib/csv.ts`, `lib/server/transaction-export.ts`, `app/api/transactions/export/route.ts`, `tests/unit/csv.spec.ts`, `tests/api/transactions-export.spec.ts`

**Estimated scope:** M (5 file, dua tes)

---

### T41: Menu "Ekspor CSV" di header daftar

**Description:** Tautan "Ekspor CSV" di header `TransactionList` (menu aksi atau tombol ikon dengan label tersedia untuk pembaca layar) menuju `/api/transactions/export?<filtersToSearchParams(filters)>`, tanpa `cursor`/`limit`. Mengikuti filter aktif, termasuk periode dan `lockedType` di `/expenses`.

**Acceptance criteria:**
- [ ] Ketuk → file `lontu-transaksi-2026-10.csv` terunduh (periode "Semua" → `semua`), berisi tepat baris yang terfilter di layar
- [ ] Target sentuh ≥ 44 px dan terjangkau keyboard. 360 px tanpa horizontal scroll
- [ ] Di `/expenses` hanya expense yang diekspor

**Verification:**
- [ ] Manual: unduh dari `/transactions` dan `/expenses`, buka di spreadsheet (huruf Indonesia benar, angka tidak berubah)
- [ ] `pnpm build` hijau

**Dependencies:** T31, T40

**Files likely touched:** `components/transactions/transaction-list.tsx` (atau komponen header kecil di `components/transactions/`)

**Estimated scope:** XS

---

### Checkpoint K (modul selesai)

- [ ] Gerbang penuh hijau
- [ ] Semua acceptance criteria di SPEC-transactions.md tercentang
- [ ] Manual 360×800 dan 1024, light dan dark: alur penuh, tanpa horizontal scroll, target ≥ 44 px
- [ ] Review dengan Yogi, lalu tulis `SPEC-budgets.md`
