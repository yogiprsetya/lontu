# Plan phase 12: Expenses dan ekspor

Index: [plan.md](plan.md) · Todo: [todo-12.md](todo-12.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md) § Keputusan 2, Ekspor CSV, Deliverables (UI: `/expenses`, menu ekspor)

## Tujuan

`/expenses` menjadi preset dari daftar yang sama, dan pemilik bisa mengunduh CSV dari filter yang sedang aktif. Phase ini menutup modul `transactions`.

## Task

- [x] T39: `/expenses` sebagai preset filter (S)
- [x] T40: `GET /api/transactions/export` (M)
- [x] T41: Menu "Ekspor CSV" di header daftar (XS)

Urutan: T39 dan T40 bebas urutan. T41 butuh T40 dan T31.

## Keputusan

- **`/expenses` tidak punya kode daftar sendiri.** `TransactionList` menerima `lockedType`. Dengan `lockedType`, filter Jenis disembunyikan di `FilterPanel` dan `type` dari URL diabaikan (dipaksa ke `lockedType`). Periode, akun, kategori, total, dan "Muat lebih banyak" tetap bekerja.
- **CSV dibangun di memori** (spec). `lib/csv.ts` murni: escape koma/kutip/newline, awalan `'` untuk sel **teks** yang diawali `=`, `+`, `-`, `@`, tab, atau CR, BOM UTF-8. Kolom `Jumlah` tidak disentuh (adjustment negatif memang diawali `-`).
- **Urutan dan himpunan baris** sama dengan daftar (`transactionWhere` + urutan yang sama, tanpa paginasi). Nama akun/kategori digabung di server, termasuk yang terarsip.
- **Tautan ekspor adalah `<a href>` biasa** ke `/api/transactions/export?<filtersToSearchParams>`. Session cookie ikut terkirim, tanpa fetch dan blob.
- **Nama file:** `lontu-transaksi-<period|semua>.csv`.

## Risiko

| Risiko                                             | Dampak | Mitigasi                                                                             |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| Penjaga formula merusak angka negatif              | Sedang | Hanya sel teks yang dijaga. Tes untuk `Jumlah = -50000` dan `description = "-1"`     |
| `Content-Disposition` dengan karakter di nama file | Rendah | Nama file dibangun dari `period` yang sudah tervalidasi (`YYYY-MM`, `YYYY`, `semua`) |
| Ekspor sangat besar                                | Rendah | Diterima di spec untuk satu pemilik. Ganti dengan stream jika terjadi                |
| `lockedType` bocor ke URL `/transactions`          | Rendah | `normalizeFilters` menerima `lockedType` dan dites                                   |

## Checkpoint K (modul selesai)

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [x] Semua acceptance criteria di SPEC-transactions.md tercentang
- [x] Manual di 360×800 dan 1024 (light dan dark): seluruh alur catat → lihat → filter → ubah → hapus → ekspor, tanpa horizontal scroll, target sentuh ≥ 44 px
- [x] CSV terbuka benar di spreadsheet (huruf Indonesia, angka tidak berubah)
- [x] Review dengan Yogi, lalu tulis `SPEC-budgets.md`
