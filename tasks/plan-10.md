# Plan phase 10: Periode, total, filter

Index: [plan.md](plan.md) · Todo: [todo-10.md](todo-10.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md) § Filter, Kontrak API (`totals`), Deliverables (UI: header dan panel filter)

## Tujuan

`/transactions` bisa difilter berdasarkan periode (bulan, tahun, semua), Jenis, Akun, dan Kategori. Semuanya hidup di URL, jadi bertahan setelah refresh dan bisa ditautkan dari dashboard. Strip total (Income/Expense/Saving) mengikuti filter yang sama dan dihitung di database.

## Task

- [x] T29: Filter di `GET /api/transactions` (M)
- [x] T30: `GET /api/transactions/totals` (S)
- [ ] T31: Filter di URL + stepper periode (M, risiko sedang)
- [ ] T32: Strip total (S)
- [ ] T33: Panel filter Jenis/Akun/Kategori (M)

Urutan: T29 → T30 dan T29 → T31 → T32 (butuh T30) dan T31 → T33. T30 dan T31 tidak saling bergantung.

## Keputusan

- **`transactionWhere(userId, filters)` adalah satu-satunya pembangun `where`** untuk list (T29), totals (T30), dan export (T40). `accountId` cocok dengan `account_id` **atau** `to_account_id`. `accountId`/`categoryId` asing atau tidak ada → daftar kosong, bukan 404.
- **Nama param URL = API**, kecuali `period` (`YYYY-MM | YYYY | all`, default bulan berjalan Jakarta) yang hanya ada di URL dan dikonversi `periodToRange` menjadi `from`/`to`. `/transactions` tidak membaca `usePeriodStore`.
- **Key SWR stabil:** `filtersToSearchParams` menulis param dengan urutan tetap dan mengabaikan nilai kosong, sehingga filter yang sama menghasilkan key yang sama. Ini juga yang dipakai tautan ekspor (T41).
- **`normalizeFilters`** membersihkan kombinasi tak berarti: `type = transfer|adjustment` menghapus `categoryId`, dan `categoryId` yang `kind`-nya tidak cocok dengan `type` dihapus. Server tetap permisif (hasil kosong), normalisasi hanya untuk UI.
- **Perubahan filter memakai `router.replace`** supaya tombol back tidak dipenuhi langkah filter.
- **Panel filter** memakai `ResponsiveModal` yang sudah ada dan select shadcn yang sudah terpasang. Tidak ada komponen baru.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `useSearchParams` membuat halaman keluar dari prerender `cacheComponents` | Sedang | Komponen daftar di dalam `<Suspense>` di page. `pnpm build` di T31 |
| `from`/`to` pada kolom `date` dibaca zona waktu | Rendah | Selalu string `YYYY-MM-DD`. `periodToRange` murni, dites untuk Februari kabisat (2028) dan pergantian tahun |
| Filter `accountId` dengan `or` memperlambat query | Rendah | Index `(user_id, account_id)` dan `(user_id, to_account_id)` sudah ada. Tidak ada perubahan skema |

## Checkpoint I

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Acceptance criteria filter dan totals di SPEC-transactions.md tercentang
- [ ] Manual: refresh `/transactions?period=2026-10&type=expense` mempertahankan semuanya, back berfungsi, total sama dengan jumlah baris yang terlihat
- [ ] Review dengan Yogi sebelum phase 11
