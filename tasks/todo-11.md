# Todo phase 11: Ubah dan hapus

Plan: [plan-11.md](plan-11.md) · Index: [plan.md](plan.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T34: `GET`/`PATCH /api/transactions/[id]`

**Description:** `transactionUpdateSchema` per tipe tersimpan di `lib/schemas/transaction.ts` (`strictObject`, field boleh: income/expense/saving → `amount`, `date`, `accountId`, `categoryId`, `description`; transfer → `amount`, `date`, `accountId`, `toAccountId`, `description`; minimal satu field; `description: null` mengosongkan). `getTransaction` dan `updateTransaction` di `lib/server/transactions.ts`: baca baris milik user yang belum dihapus (id bukan UUID → 404 tanpa query), `adjustment` → 409, gabungkan dan validasi ulang, periksa kepemilikan/aktif/`kind` **hanya untuk id yang berubah**, update dengan `updated_at = now()`. `app/api/transactions/[id]/route.ts` `GET`/`PATCH`. `transactionNotEditable()` di `lib/api/errors.ts`.

**Acceptance criteria:**
- [x] `PATCH { amount: 40000 }` pada expense 25.000 → 200, saldo akun ikut berubah, `updatedAt` maju, posisi di daftar tidak berubah. `GET` mengembalikan `Transaction`
- [x] Body memuat `type`, `userId`, `fee`, atau `toAccountId` (pada expense) → 400. Body kosong → 400. Transfer dengan `toAccountId = accountId` → 400 `fields.toAccountId`
- [x] Pindah ke akun/kategori terarsip, asing, atau kategori `kind` salah → 400. Akun lama yang terarsip dan tidak diubah → 200
- [x] `PATCH` adjustment → 409 `TRANSACTION_NOT_EDITABLE`. `GET`/`PATCH` baris soft-deleted, id bukan UUID, atau milik user lain → 404 `TRANSACTION_NOT_FOUND`. Tanpa session → 401

**Verification:**
- [x] `pnpm vitest run tests/unit/transaction-schema.spec.ts tests/api/transactions.spec.ts` hijau
- [x] `pnpm build` hijau

**Dependencies:** T22, T23

**Files likely touched:** `lib/schemas/transaction.ts`, `lib/server/transactions.ts`, `lib/api/errors.ts`, `app/api/transactions/[id]/route.ts`, `tests/unit/transaction-schema.spec.ts`, `tests/api/transactions.spec.ts`

**Estimated scope:** M (6 file, dua tes)

---

### T35: Halaman edit income/expense/saving

**Description:** `useTransaction(id)` dan `updateTransaction(id, input)` di `hooks/use-transactions.ts` (mutasi → `revalidateTransactions()` + `revalidateAccounts()`). `app/(app)/transactions/[id]/page.tsx`: id bukan UUID → `notFound()`, selain itu merender `components/transactions/transaction-editor.tsx` (client) yang memuat data dan memilih form menurut `type`. `TransactionForm` menerima `transaction` (mode edit): tipe ditampilkan read-only, `defaultValues` dari transaksi, submit → `PATCH`, peringatan saldo memakai `previousEffect`. Picker menampilkan nilai terpilih yang terarsip berlabel "(arsip)" meski tidak ada di daftar aktif. Baris di `transaction-list` menjadi tautan ke halaman ini. Sukses → toast + kembali ke daftar.

**Acceptance criteria:**
- [ ] Ketuk baris → halaman edit terisi. Ubah nominal → Simpan → toast, daftar, total, dan saldo ikut berubah tanpa reload
- [ ] Transaksi dengan akun atau kategori terarsip bisa disimpan tanpa mengubah referensi itu, dan picker menampilkannya sebagai "(arsip)". Memilih akun terarsip lain tidak ditawarkan
- [ ] Peringatan saldo di mode edit tidak menghitung nominal lama dua kali (saldo DB 70.000 setelah expense 30.000, ubah ke 90.000 → tidak ada peringatan)
- [ ] Id tidak ada → keadaan "Transaksi tidak ditemukan" dengan tautan kembali. Form create (`/add/*`) tetap berfungsi seperti sebelumnya

**Verification:**
- [x] `tests/unit/transaction-balance.spec.ts` sudah mencakup `previousEffect` (T25). `pnpm build` hijau
- [ ] Manual 360×800 dan 1024: edit, edit dengan akun terarsip, id ngawur, lalu cek ulang alur create

**Dependencies:** T24, T25, T28, T34

**Files likely touched:** `hooks/use-transactions.ts`, `app/(app)/transactions/[id]/page.tsx`, `components/transactions/transaction-editor.tsx`, `components/forms/transaction-form.tsx`, `components/forms/account-picker.tsx`, `components/forms/category-picker.tsx`, `components/transactions/transaction-list.tsx`

**Estimated scope:** M (7 file; picker dan list hanya perubahan kecil)

---

### T36: Edit transfer dan tampilan adjustment

**Description:** `TransferForm` menerima `transaction` (mode edit): akun sumber/tujuan, nominal, tanggal, deskripsi; tanpa blok biaya admin, diganti teks bantuan bahwa biaya admin dicatat sebagai expense terpisah dan tidak ikut berubah. Peringatan saldo dengan `previousEffect`. `transaction-editor` untuk `adjustment` menampilkan kartu read-only (tanggal, jumlah bertanda, akun, deskripsi, keterangan "Dibuat saat saldo awal akun diubah") tanpa form.

**Acceptance criteria:**
- [ ] Edit transfer: ubah nominal dan akun tujuan → saldo kedua akun benar. Akun tujuan tidak bisa sama dengan sumber
- [x] Halaman adjustment tidak punya form atau tombol Simpan, hanya informasi (tombol Hapus datang di T38)
- [x] Teks bantuan biaya admin tampil di edit transfer

**Verification:**
- [ ] `pnpm build` hijau. Manual 360×800 dan 1024: edit transfer, buka adjustment (buat lewat ubah saldo awal di Kelola akun)

**Dependencies:** T26, T35

**Files likely touched:** `components/forms/transfer-form.tsx`, `components/transactions/transaction-editor.tsx`

**Estimated scope:** S

---

### T37: `DELETE` dan `restore`

**Description:** `softDeleteTransaction` dan `restoreTransaction` di `lib/server/transactions.ts` (update `deleted_at` hanya jika berubah, kembalikan baris; idempoten). `DELETE` di `app/api/transactions/[id]/route.ts`, `POST` di `app/api/transactions/[id]/restore/route.ts`. Keduanya melihat baris yang sudah dihapus dan memakai `transactionNotFound()` untuk id bukan UUID, tidak ada, atau milik user lain.

**Acceptance criteria:**
- [x] `DELETE` → 200 `Transaction` dengan `deletedAt`, baris tetap ada di DB. Baris hilang dari list, totals, dan saldo. `GET`/`PATCH` setelahnya → 404
- [x] `restore` → 200, kembali ke list, totals, dan saldo. `DELETE` dua kali tidak mengubah `deleted_at`, `restore` dua kali tidak mengubah apa pun
- [x] `DELETE` pada `adjustment` → 200, `initialBalance` dan `balance` akun bergeser kembali (uji lewat `GET /api/accounts`). `restore` mengembalikannya
- [x] Isolasi: user B mendapat 404 untuk `DELETE`/`restore` baris A. Tanpa session → 401

**Verification:**
- [x] `pnpm vitest run tests/api/transactions.spec.ts` hijau
- [x] `pnpm build` hijau

**Dependencies:** T22

**Files likely touched:** `lib/server/transactions.ts`, `app/api/transactions/[id]/route.ts`, `app/api/transactions/[id]/restore/route.ts`, `tests/api/transactions.spec.ts`

**Estimated scope:** S (4 file)

---

### T38: Hapus + undo optimistic

**Description:** Fungsi murni `removeFromPages(pages, id)` (di `lib/transaction-cache.ts`) menghapus baris dari array `TransactionPage[]`. `deleteTransaction(id)` di `hooks/use-transactions.ts`: `mutate(isInfiniteTransactionsKey, updater, { revalidate: false })`, `DELETE`, lalu `revalidateTransactions()` + `revalidateAccounts()`; jika gagal, kembalikan cache, revalidasi, dan lempar galat. `restoreTransaction(id)` memanggil `POST …/restore` lalu revalidasi. Tombol "Hapus" di `transaction-editor` untuk semua tipe (termasuk adjustment) → hapus, kembali ke daftar (`router.back()`, fallback `/transactions`), dan toast "Transaksi dihapus" dengan aksi "Urungkan" (6 detik). Gagal → toast galat.

**Acceptance criteria:**
- [ ] Hapus → baris langsung hilang dari daftar, toast "Urungkan" muncul. Ketuk Urungkan → baris kembali di posisi benar setelah revalidasi, saldo dan total ikut kembali
- [ ] `DELETE` yang gagal (offline/diblok di DevTools) → baris kembali, toast galat, tidak ada baris hantu
- [ ] Setelah toast hilang tidak ada layar sampah. Menghapus adjustment menggeser saldo awal efektif akun dan `restore` mengembalikannya
- [ ] Tombol Hapus ≥ 44 px, tidak berdekatan dengan Simpan tanpa jarak

**Verification:**
- [x] `tests/unit/transaction-cache.spec.ts`: `removeFromPages` pada banyak halaman, id tidak ada, halaman menjadi kosong, tidak memutasi input
- [ ] Manual 360×800 dan 1024: hapus, urungkan, gagal-hapus, hapus dari halaman yang dibuka langsung (tanpa riwayat) kembali ke `/transactions`

**Dependencies:** T35, T36, T37

**Files likely touched:** `lib/transaction-cache.ts`, `tests/unit/transaction-cache.spec.ts`, `hooks/use-transactions.ts`, `components/transactions/transaction-editor.tsx`

**Estimated scope:** M (4 file)

---

### Checkpoint J

- [ ] Gerbang penuh hijau
- [ ] Acceptance criteria edit, hapus, restore, isolasi di SPEC-transactions.md tercentang
- [ ] Manual: edit semua tipe, hapus + urungkan, gagal-hapus, adjustment
- [ ] Review dengan Yogi sebelum phase 12
