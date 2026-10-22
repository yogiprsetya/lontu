# Plan phase 11: Ubah dan hapus

Index: [plan.md](plan.md) · Todo: [todo-11.md](todo-11.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md) § Kontrak API (`PATCH`, `DELETE`, `restore`), Deliverables (halaman edit, hapus + undo)

## Tujuan

Mengetuk baris di daftar membuka halaman edit. Pemilik bisa mengubah transaksi (tipe terkunci), menghapusnya dengan satu tap, dan mengurungkan lewat toast. Penghapusan terlihat seketika (optimistic) dan saldo ikut kembali.

## Task

- [ ] T34: `GET`/`PATCH /api/transactions/[id]` (M)
- [ ] T35: Halaman edit income/expense/saving (M)
- [ ] T36: Edit transfer dan tampilan adjustment (S)
- [ ] T37: `DELETE` dan `restore` (S)
- [ ] T38: Hapus + undo optimistic (M, risiko sedang)

Urutan: T34 → T35 → T36, dan T37 → T38 (butuh T35, T36). T34 dan T37 tidak saling bergantung dan keduanya hanya butuh sisi server phase 8.

## Keputusan

- **Tipe terkunci.** `PATCH` memakai schema per tipe tersimpan (`strictObject`, `partial`, minimal satu field). Field di luar tipe itu (`type`, `userId`, `fee`, `toAccountId` pada expense, `categoryId` pada transfer) → 400. Hasil gabungan divalidasi ulang (`toAccountId ≠ accountId`).
- **Aturan referensi saat edit:** id yang **tidak diubah** boleh menunjuk item terarsip. Id yang diubah harus milik user dan aktif (kategori juga harus `kind` yang cocok). Pembanding = nilai tersimpan.
- **`adjustment` tidak bisa di-`PATCH`** (409 `TRANSACTION_NOT_EDITABLE`) tetapi bisa dihapus dan dipulihkan.
- **`DELETE`/`restore` melihat baris yang sudah dihapus**, `GET`/`PATCH` tidak (404). Keduanya idempoten.
- **Halaman edit** adalah route (`/transactions/[id]`), bukan modal, karena data transaksi tidak boleh masuk Zustand/`modalProps`. Id bukan UUID → `notFound()`. Data lewat `useTransaction(id)`.
- **Optimistic hanya untuk hapus dan urungkan** (spec keputusan 7). Logika cache adalah fungsi murni `removeFromPages` (dites di Vitest `node`), diterapkan lewat `mutate(matcher, updater, { revalidate: false })` pada key `$inf$/api/transactions…`. Total dan saldo cukup di-revalidasi.
- **Setelah hapus:** `router.back()` bila ada riwayat, kalau tidak `router.push("/transactions")`. Toast tetap hidup lintas navigasi (`Toaster` ada di `Providers`).

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Optimistic pada key `$inf$` membuat agregat berbeda dari cache halaman, SWR lalu memuat ulang halaman itu | Rendah | Perilaku yang diinginkan (revalidasi tetap berjalan). Diverifikasi manual: baris tidak muncul kembali sesaat |
| `PATCH` membaca-lalu-menulis tanpa kunci baris | Rendah | Pemilik tunggal. Hasil gabungan divalidasi dari baris yang baru dibaca. Dua edit bersamaan → yang terakhir menang |
| Form edit memakai ulang `TransactionForm`/`TransferForm` dan merusak mode create | Sedang | Mode edit hanya mengubah `defaultValues`, field tipe read-only, dan pemanggil mutasi. Tes manual create setelah T35 dan T36 |
| Mengedit transaksi lama yang akunnya terarsip memblokir simpan | Sedang | Aturan "tidak berubah → boleh" di server dan picker yang tetap menampilkan nilai terpilih berlabel "(arsip)" |

## Checkpoint J

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Acceptance criteria edit, hapus, restore, dan isolasi di SPEC-transactions.md tercentang
- [ ] Manual 360×800 dan 1024: edit semua tipe, hapus + urungkan, hapus adjustment (saldo awal efektif bergeser kembali), gagal-hapus memulihkan baris
- [ ] Review dengan Yogi sebelum phase 12
