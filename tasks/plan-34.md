# Plan phase 34: Cutover

Index: [plan.md](plan.md) § Budget bernama · Todo: [todo-34.md](todo-34.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md) § Migrasi + cutover

## Tujuan

Produksi pindah ke budget bernama tanpa kehilangan riwayat: setiap bulan lalu tampil dengan total Needs/Wants yang sama seperti sebelum cutover, bulan berjalan mulai kosong untuk budget bernama baru, lalu tabel `budgets` lama dihapus.

## Task

- [x] T121: Migrasi data lama ke `budget_versions` (M, risiko tinggi, berhenti untuk Yogi)
- [ ] T122: Cutover produksi + drop `budgets` (S, berhenti untuk Yogi di setiap langkah tulis)

Urutan berantai: T121 → T122.

## Keputusan

- **Backfill = migrasi kustom** (`drizzle-kit generate --custom --name budget_versions_backfill`), SQL saja, sekali jalan, tercatat di journal. Bulan cutover M = bulan `now()` di Asia/Jakarta saat migrasi dijalankan.
- **Aturan backfill per `(user, kategori)` dengan baris lama aktif ≤ M:** satu `budget_id` baru; nama = nama kategori, jenis = jenis kategori; satu versi per baris lama aktif (`category_ids = {kategori}`, `created_at` lama); bila bulan sesudah sebuah baris tidak punya baris aktif dan ≤ M → versi akhir (`deleted_at = now()`) di bulan itu; bila baris terakhir tepat di M → versi M diakhiri (bulan berjalan mulai kosong, Open question 1). Baris setelah M dan baris yang sudah di-soft-delete tidak disalin.
- **Urutan cutover:** merge + deploy dulu (kode baru mengabaikan `budgets`), lalu `db:migrate` backfill, verifikasi, baru drop. Jendela singkat bulan berjalan kosong sebelum backfill diterima (satu pengguna).
- **Drop `budgets`** lewat penghapusan tabel di `db/schema.ts` + `generate --explain` → hanya `DROP TABLE "budgets"`, dengan hint `confirm_data_loss` bila diminta.

## Hasil dry run T121 (2026-11-01)

SQL backfill dijalankan untuk data pemilik di dalam transaksi yang di-rollback (skrip sekali pakai di scratchpad, tidak di-commit). M = 2026-11.

| Bulan   | Budget lama aktif       | Budget hasil backfill yang tampil | Cocok |
| ------- | ----------------------- | --------------------------------- | ----- |
| 2026-10 | 2 baris, Rp62.000       | 2 budget, Rp62.000                | Ya    |
| 2026-11 | 0 baris                 | 0 (semua hasil migrasi berakhir)  | Ya    |

Di 2026-11 juga tampil "Konsumsi" (Needs, Rp2.000.000, 4 kategori), budget bernama yang dibuat pemilik lewat UI baru pada 2026-11-01. Baris itu sudah ada sebelum dry run dan tidak bentrok: budget hasil migrasi berakhir di 2026-11, Konsumsi mulai 2026-11. Setelah rollback, baris pemilik di `budget_versions` tetap 1 (Konsumsi).

Catatan untuk T122: karena `budget_versions` ada di DB bersama, budget yang dibuat lewat preview branch sudah tersimpan untuk produksi.

## Risiko

| Risiko                                           | Dampak | Mitigasi                                                                                                  |
| ------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------- |
| Backfill salah untuk data pemilik                | Tinggi | Tes otomatis di transaksi yang di-rollback + dry run banding total per bulan untuk data pemilik, cadangan `budgets` |
| `db:migrate` menjalankan backfill terlalu dini   | Sedang | Berkas backfill di-commit di T121 tetapi `db:migrate` baru dijalankan di T122; ditulis di todo dan commit body |
| Drop tabel sebelum produksi terverifikasi        | Tinggi | Drop hanya setelah butir verifikasi T122 dicentang Yogi                                                    |

## Checkpoint AG (modul selesai)

- [ ] Produksi: dua bulan lalu yang punya budget lama menampilkan total budget dan nominal per budget sama dengan screenshot sebelum cutover; bulan berjalan bisa diisi budget bernama
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau setelah drop; tes constraint `budgets` lama ikut terhapus bersama tabelnya
- [ ] SPEC-budgets.md status "selesai", plan.md indeks diperbarui
