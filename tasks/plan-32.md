# Plan phase 32: Lihat dan atur budget

Index: [plan.md](plan.md) § Budget bernama · Todo: [todo-32.md](todo-32.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md) § Deliverables UI

## Tujuan

Dari ponsel, pemilik membuka `/budget`, melihat budget bernama diurut dari yang paling perlu diperhatikan, menambah budget (nama, nominal, Needs/Wants, beberapa kategori), dan mengubahnya. Bulan lalu tampil seperti saat itu dan hanya-baca.

## Task

- [ ] T114: `/budget` membaca model baru (M; halaman hanya-baca sampai T115)
- [ ] T115: Tambah budget (M)
- [ ] T116: Sheet budget: rincian per kategori + edit (M)

Urutan berantai: T114 → T115 → T116.

## Keputusan

- **Urutan perhatian** `compareByAttention`: Melebihi → Hampir habis → Aman, lalu persen turun, lalu nama. Satu fungsi murni, dipakai halaman (T114) dan dashboard (T119).
- **Tanpa budget** jadi satu baris di bawah daftar: "Rp… tanpa budget · Kesehatan, Hadiah" (dari `unbudgeted`). Kartu ringkasan Total/Needs/Wants tetap.
- **Form satu komponen** (`components/forms/budget-form.tsx`, ditulis ulang) dengan urutan field dari alur Yogi: Nama, Nominal per bulan, Needs/Wants (`ToggleGroup` seperti `category-form.tsx`, terkunci saat edit), Kategori (checkbox).
- **Pilihan kategori** dari fungsi murni `budgetCategoryOptions({ categories, usage, budgetId, spendingType })`: hanya jenis terpilih; status `free` / `own` / `taken` (dengan nama budget pemiliknya, disabled, teks "di {nama}"); terarsip hanya bila `own`. Ganti jenis saat buat → pilihan dikosongkan.
- **Bulan lalu hanya-baca:** sheet menampilkan rincian tanpa field dan tombol simpan. Stepper maks bulan berjalan.
- Mutasi `createBudget` / `updateBudget` di `hooks/use-budgets.ts` memanggil `invalidate("budgets")` dan melempar `ApiError`; galat field dipasang lewat `applyServerErrors`.

## Risiko

| Risiko                                                          | Dampak | Mitigasi                                                                          |
| --------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Daftar checkbox panjang menutupi tombol Simpan di 360 px        | Sedang | Footer `FormActions` sticky yang sudah ada; cek manual dengan 9 kategori          |
| Pilihan kategori tidak sinkron dengan server (dua tab)          | Rendah | Server tetap menolak (T112/T113); galat tampil di field Kategori                   |
| `useSearchParams` di `/budget` dan `cacheComponents`            | Rendah | Tetap di dalam `<Suspense>` yang ada; `pnpm build` di setiap task                  |

## Checkpoint AE

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual 360×800 dan 1024 (preview branch): tambah "Jajan & Hiburan" Rp800.000 (Jajan, Hiburan) → catat expense Jajan 700.000 → status "Hampir habis" 87% tanpa reload, budget itu naik ke atas. Kategori yang dipakai tampil disabled di form budget lain
- [ ] Ubah nominal di bulan berjalan → bulan lalu tidak berubah. Bulan lalu tidak bisa diedit, stepper berhenti di bulan berjalan
- [ ] Review dengan Yogi
