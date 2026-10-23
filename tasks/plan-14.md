# Plan phase 14: Hapus dan salin

Index: [plan.md](plan.md) · Todo: [todo-14.md](todo-14.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md) § Keputusan 2, 3, 10, Kontrak API (`DELETE`, `restore`, `copy`), Deliverables (hapus + undo, aksi bulan)

## Tujuan

Pemilik bisa menghapus budget dengan "Urungkan", dan menyiapkan bulan baru dengan satu tap "Salin dari {bulan lalu}". Bulan tanpa budget menampilkan CTA salin di tengah layar.

## Task

- [x] T48: `DELETE /api/budgets/[id]` + `restore` (S)
- [x] T49: Hapus budget + undo di UI (S)
- [ ] T50: `POST /api/budgets/copy` (S)
- [ ] T51: Menu aksi bulan "Salin dari …" + empty state (S)

Urutan: T48 → T49, T50 → T51. Kedua pasangan bebas urutan. T49 dan T51 butuh T47.

## Keputusan

- **Pola hapus sama dengan transaksi:** `softDeleteBudget` / `restoreBudget` idempoten, id bukan UUID → 404 tanpa query. `restore` diizinkan walau kategorinya terarsip (keputusan 10).
- **Optimistic delete** di cache `budgetsKey(period)`: item dikosongkan (`budgetId`, `budget`, `remaining`, `percent` → null, `status` → `none`) dan `summary` dihitung ulang lewat fungsi murni `removeBudgetFromUsage` (dites unit, memakai `budgetStatus`). Rollback + revalidasi jika gagal.
- **Copy satu statement:** `insert … select` dari bulan sumber (budget aktif, kategori aktif) `on conflict … do update set amount = excluded.amount, deleted_at = null where budgets.deleted_at is not null`. `copied` = jumlah baris `returning`. Baris aktif di tujuan tidak tersentuh karena `where` pada `do update`.
- **Bulan sumber** = `shiftPeriod(to, -1)`. Jika sumber di bawah 2000-01 → `copied 0`.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `do update … where` tidak menghitung baris yang dilewati, atau malah menimpa budget aktif | Sedang | Tes T50: tujuan sudah punya Makan → nominal tetap, `copied` tidak menghitungnya |
| Summary optimistic tidak cocok dengan server | Rendah | Revalidasi setelah sukses. Fungsi murni dites terhadap respons `GET` contoh |
| Salin menghidupkan budget yang sengaja dihapus | Rendah | Diterima di spec (Risiko). Toast menyebut jumlah yang disalin |

## Checkpoint M

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual 360×800 dan 1024: hapus → "Urungkan" mengembalikan, salin ke bulan depan mengisi daftar, salin kedua → "0 budget disalin"
- [ ] Review dengan Yogi
