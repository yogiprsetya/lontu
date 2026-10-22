# Todo phase 9: Daftar transaksi

Plan: [plan-9.md](plan-9.md) · Index: [plan.md](plan.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T27: `GET /api/transactions` dengan cursor

**Description:** `lib/server/transaction-cursor.ts`: `encodeCursor`/`decodeCursor` (base64url JSON `[date, createdAtMicros, id]`; bentuk salah, `date` bukan `YYYY-MM-DD`, micros bukan integer, atau `id` bukan UUID → galat). `listTransactions(userId, { cursor, limit })` di `lib/server/transactions.ts`: `deleted_at is null`, urutan `date desc, created_at desc, id desc`, predikat keyset row-comparison dengan `(extract(epoch from created_at) * 1000000)::bigint`, ambil `limit + 1`, hitung `nextCursor`. Query schema (`cursor`, `limit` 1–100 default 30) di `lib/schemas/transaction.ts`, `invalidCursor()` di `lib/api/errors.ts`, `GET` di `app/api/transactions/route.ts`. Semua tipe (termasuk `adjustment`) ikut di daftar. **Mulai dari tes merah** untuk cursor mikrodetik.

**Acceptance criteria:**
- [x] Urutan `date desc, created_at desc, id desc`. Dengan `limit=2` atas 5 baris (tiga di satu tanggal, dua dengan `created_at` yang hanya beda mikrodetik), gabungan semua halaman = himpunan lengkap, tanpa duplikat atau lompatan. Halaman terakhir `nextCursor = null`
- [x] Baris soft-deleted tidak muncul. Cursor rusak/salah bentuk → 400 `INVALID_CURSOR`. `limit=0` atau `101` → 400 `fields.limit`
- [x] Isolasi: daftar user B tidak pernah memuat baris A. Tanpa session → 401

**Verification:**
- [x] `pnpm vitest run tests/unit/transaction-cursor.spec.ts tests/api/transactions-list.spec.ts` hijau (baris dimasukkan langsung ke DB dengan `created_at` eksplisit)
- [x] Tes mikrodetik terbukti merah bila `createdAtMicros` diganti `Date.getTime()` (cek sekali, jangan di-commit)

**Dependencies:** T22

**Files likely touched:** `lib/server/transaction-cursor.ts`, `lib/server/transactions.ts`, `lib/schemas/transaction.ts`, `lib/api/errors.ts`, `app/api/transactions/route.ts`, `tests/unit/transaction-cursor.spec.ts`, `tests/api/transactions-list.spec.ts`

**Estimated scope:** M (7 file, lima kecil dan dua tes)

---

### T28: Halaman daftar `/transactions`

**Description:** `useTransactions()` di `hooks/use-transactions.ts` (`useSWRInfinite`, `getKey` dari `nextCursor`). `lib/transaction-format.ts`: `formatDateHeading(date, today)`, `signedAmount(type, amount)` (income +, expense/saving −, transfer tanpa tanda, adjustment sesuai tanda), label tipe. `lib/transaction-types.ts`: label "Penyesuaian". `components/transactions/transaction-list.tsx` (client): resolve nama lewat `useAccounts({ includeArchived: true })` dan `useCategories({ includeArchived: true })` (terarsip berlabel "(arsip)"), kelompok per tanggal, baris dengan kategori / "A → B" / "Penyesuaian", akun, deskripsi, nominal berwarna token (`--income`, `--expense`, `--budget`, `--transfer`) dan tanda, `hideAmounts` menyamarkan nominal, skeleton, empty state, error + "Coba lagi", tombol "Muat lebih banyak" (≥ 44 px). `app/(app)/transactions/page.tsx` menggantikan placeholder. Baris belum menjadi tautan.

**Acceptance criteria:**
- [ ] Transaksi dari phase 8 tampil per tanggal, terbaru di atas. Lebih dari 30 baris → "Muat lebih banyak" menambah halaman berikutnya tanpa duplikat. Saat `nextCursor = null` tombol hilang
- [ ] Transfer tampil "A → B", adjustment "Penyesuaian", akun/kategori terarsip tetap bernama dengan "(arsip)". Nominal membawa tanda +/− selain warna
- [ ] Menyimpan transaksi dari `/add/*` lalu kembali ke daftar menampilkan baris baru tanpa reload (key `$inf$` ikut ter-revalidasi). Saldo di Kelola akun tetap benar
- [ ] Judul tanggal tidak bergeser sehari untuk tanggal `2026-10-01` dan `2026-12-31`. 360 px tanpa horizontal scroll, `pnpm build` hijau (cacheComponents)

**Verification:**
- [ ] `tests/unit/transaction-format.spec.ts` (Hari ini/Kemarin/tanggal biasa, batas bulan dan tahun, tanda dan warna per tipe) dan `tests/unit/use-transactions.spec.ts` (pembangun key halaman + `getKey` berhenti saat `nextCursor = null`) hijau
- [ ] Manual 360×800 dan 1024, light dan dark, dengan > 30 baris

**Dependencies:** T24 (file hook dan `isTransactionsKey`), T27

**Files likely touched:** `hooks/use-transactions.ts`, `lib/transaction-format.ts`, `lib/transaction-types.ts`, `components/transactions/transaction-list.tsx`, `app/(app)/transactions/page.tsx`, `tests/unit/transaction-format.spec.ts`, `tests/unit/use-transactions.spec.ts`

**Estimated scope:** M (7 file; terbesar di phase ini, bagian murni dipisah supaya bisa dites unit)

---

### Checkpoint H

- [ ] Gerbang penuh hijau
- [ ] Acceptance criteria urutan/paginasi di SPEC-transactions.md tercentang
- [ ] Manual: > 30 baris, "Muat lebih banyak", baris baru dari form muncul tanpa reload
- [ ] Review dengan Yogi sebelum phase 10
