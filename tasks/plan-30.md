# Plan phase 30: Spec dan pembersihan

Index: [plan.md](plan.md) § Budget bernama · Todo: [todo-30.md](todo-30.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md)

## Tujuan

Keputusan budget bernama tertulis di spec dan disetujui Yogi sebelum ada kode. Dua fitur yang tidak punya tempat di model baru (saran 50/30/20, salin dari bulan lalu) dihapus dari model lama, supaya phase berikutnya tidak perlu memindahkannya.

## Task

- [ ] T107: Revisi spec dan persetujuan (S, dokumen saja, berhenti untuk Yogi)
- [ ] T108: Hapus saran 50/30/20 (M, hanya penghapusan)
- [ ] T109: Hapus salin dari bulan lalu (M, hanya penghapusan)

Urutan: T107 dulu. T108 dan T109 bebas urutan, satu commit masing-masing.

## Keputusan

- **T107 adalah gerbang Ask first:** tabel baru `budget_versions`, drop `budgets` di T122, baris `budgets` di capability map, keputusan terkunci #8, dan penghapusan fitur. Tanpa persetujuan, phase 31 tidak dimulai.
- **Penghapusan per fitur, bukan per lapisan.** Satu fitur = route + lib + hook + UI + tesnya dalam satu commit, supaya tidak ada kode mati di antara commit.
- **Plan disetujui dan Open questions 1–3 dijawab Yogi 2026-10-31** (semua sesuai default, dicatat di SPEC-budgets.md keputusan #3, #5, #8). Persetujuan spec T107: menunggu.
- **Model lama tetap jalan di branch** setelah T108/T109: budget per kategori masih bisa diatur, hanya tanpa salin dan saran.

## Risiko

| Risiko                                              | Dampak | Mitigasi                                                                                  |
| --------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Spec tidak lengkap, keputusan baru muncul di tengah | Sedang | T107 menulis kontrak, validasi, query, migrasi, dan AC lengkap; Open questions dijawab di T107 |
| Batas 2000-01 kehilangan tes saat `budget-copy.spec.ts` dihapus | Rendah | Sudah dites di `tests/unit/period.spec.ts`; T109 memastikannya                          |

## Checkpoint AC

- [ ] Yogi menyetujui spec dan menjawab Open questions 1–3 (dicatat di § Keputusan di atas)
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; jumlah tes sebelum/sesudah dicatat
- [ ] Manual: `/budget` tanpa menu aksi bulan; atur budget per kategori masih jalan
