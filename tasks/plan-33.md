# Plan phase 33: Akhiri budget, dashboard, jalur lama

Index: [plan.md](plan.md) § Budget bernama · Todo: [todo-33.md](todo-33.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md) § Hapus, Kontrak untuk modul lain · [SPEC-dashboard.md](../SPEC-dashboard.md) § keputusan 9, 12

## Tujuan

Fitur budget bernama setara dengan modul lama: hapus (mengakhiri mulai bulan ini) dengan Urungkan, Budget Summary dashboard per budget, dan tidak ada lagi jalur per kategori di kode.

## Task

- [ ] T117: `DELETE` / `restore` = akhiri mulai bulan ini (M)
- [ ] T118: Hapus budget + Urungkan di UI (M)
- [ ] T119: Budget Summary dashboard per budget (M)
- [ ] T120: Hapus jalur lama per kategori (M, hanya penghapusan)

Urutan: T117 → T118. T119 bebas setelah T111. T120 terakhir.

## Keputusan

- **Akhiri:** bila bulan berjalan sudah punya versi → isi `deleted_at = coalesce(deleted_at, now())`; bila belum → sisipkan versi bulan berjalan yang menyalin versi efektif dengan `deleted_at = now()`. Bulan lalu tidak berubah. Budget yang dibuat dan diakhiri di bulan yang sama hilang dari semua bulan.
- **Restore:** kosongkan `deleted_at` di versi bulan berjalan setelah cek ulang nama dan kategori (advisory lock yang sama); bentrok → 409 `BUDGET_RESTORE_CONFLICT`. Idempoten.
- **Update optimistic murni** `endBudgetInUsage(usage, budgetId)`: item keluar, pengeluaran kategorinya pindah ke `unbudgeted`, `summary` dihitung ulang dengan `summarizeBudgetUsage`. Menggantikan `removeBudgetFromUsage`.
- **Dashboard:** `budgetHighlights` memakai `compareByAttention` (maks 3 budget Melebihi/Hampir habis), nama dari respons, tautan `/budget?period=`.
- **T120 menghapus:** `GET`/`PUT /api/budgets`, `setBudgets`, `legacyBudgetUsage`, tipe `Budget`/`BudgetUsage`/`BudgetUsageItem` lama, `budgetSetSchema`, `budgetPeriodSchema`/`maxBudgetPeriod`, `summarizeBudgets`, `useBudgets`/`budgetsKey`, dan tesnya. Tabel `budgets` tetap sampai T122.

## Risiko

| Risiko                                                      | Dampak | Mitigasi                                                                                  |
| ----------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Urungkan setelah kategori diambil budget lain               | Rendah | 409 dan toast "Tidak bisa dipulihkan: kategori sudah dipakai budget lain"                 |
| Invarian dashboard vs budget pecah                          | Tinggi | `dashboard.spec.ts` invarian memakai `budgetUsage` baru (T119)                             |
| Sisa rujukan jalur lama tertinggal                          | Sedang | T120 diakhiri `rg` atas nama-nama lama dan `GET /api/budgets` → 405                        |

## Checkpoint AF

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; jumlah tes sebelum T107 dan sesudah T120 dicatat dengan daftar tes yang dihapus beserta perilakunya
- [ ] Ukuran JS `/budget` dan `/dashboard` diukur dengan metode § Catatan ukuran; `/dashboard` ≤ +0,5 KB gzip
- [ ] Manual 360×800 dan 1024: hapus budget bulan ini → hilang, bulan lalu tetap; Urungkan mengembalikannya. Dashboard menampilkan budget yang hampir habis dan tautannya ke `/budget`. Mode offline (`pnpm build && pnpm start`): `/budget` yang pernah dibuka tampil
- [ ] Review dengan Yogi sebelum PR
