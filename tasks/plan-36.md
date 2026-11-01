# Plan phase 36: Revaluasi

Index: [plan.md](plan.md) § Modul `goals` · Todo: [todo-36.md](todo-36.md) · Spec: [SPEC-goals.md](../SPEC-goals.md) § Perubahan skema, Aturan tulis, Kontrak untuk modul lain

## Tujuan

Pemilik bisa membuka `/goals`, melihat nilai setiap akun aset beserta porsi disetor dan pasar, lalu memperbarui nilai reksadana dan emas lewat satu sheet. Revaluasi tampil jujur di `/transactions` dan tidak pernah masuk totals, dashboard, atau budget. Phase ini berguna sendiri walau target belum ada.

## Task

- [x] T124: Tipe `revaluation` di DB dan API transaksi (M, risiko tinggi: migrasi constraint di DB bersama)
- [ ] T125: `GET`/`POST /api/valuations` + subtype `gold` (M, risiko tinggi: saldo per tanggal)
- [ ] T126: Revaluasi di UI transaksi (S)
- [ ] T127: Halaman `/goals` dengan nilai aset dan sheet Perbarui nilai (M)

Urutan: T124 dulu. T125 dan T126 bebas urutan (keduanya butuh T124). T127 butuh T125.

## Keputusan

- **Migrasi `revaluation` di T124 hanya berisi bagian transaksi:** drop + create `transactions_type_check`, `transactions_amount_check`, `transactions_category_check`, `create or replace view account_balances`, index `transactions_user_account_type_idx`. Tabel `goals` di migrasi T129 (`goals_table`).
- **`SYSTEM_TRANSACTION_TYPES`** di `lib/transaction-types.ts` (`adjustment`, `revaluation`) + `isSystemTransactionType()`. `LIST_TRANSACTION_TYPES = [...TRANSACTION_TYPES, ...SYSTEM_TRANSACTION_TYPES]`. Cabang "tidak bisa diedit", "nominal bertanda", "tanpa kategori" memakai helper. `effectiveInitialBalance` di `lib/server/accounts.ts` tetap khusus `adjustment`.
- **Saldo per tanggal** (SPEC-goals keputusan #7) satu fungsi SQL di `lib/server/valuations.ts`, dipakai `recordValuations` saja. Tidak diekspor ke modul lain.
- **`GET /api/valuations` di T125 belum punya `goalId`** dari tabel target; field selalu `null` sampai T129 menambahkannya. Tipe sudah final di T125.
- **Resource cache `valuations`** ditambahkan di T127 (bersama hook pertama yang memakainya), dengan edge dari `transactions` dan `accounts`.
- **Nav "Goals"** (`TargetIcon`) di `sidebarItems` dan `moreItems` di T127.

## Risiko

| Risiko                                                      | Dampak | Mitigasi                                                                                         |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Migrasi menyentuh objek selain yang tertulis                | Tinggi | `drizzle-kit generate --explain`; view ditulis tangan di SQL kustom seperti migrasi `adjustment`  |
| Check-in dua kali (double tap, retry) mencatat dua revaluasi | Sedang | Delta dihitung ulang di dalam lock baris akun; tes ulangan dan `Promise.all` di T125              |
| Cabang `adjustment` terlewat di UI                          | Sedang | `rg -n '"adjustment"' lib components` di T126, setiap hasil dibenarkan atau diganti helper        |

## Checkpoint AI

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; jumlah tes sebelum/sesudah dicatat
- [ ] Migrasi T124 diterapkan; `/transactions` dan dashboard produksi (kode lama) tetap normal
- [ ] Skenario dasar SPEC-goals (check-in 2026-10-31) hijau di `tests/api/valuations.spec.ts`
- [ ] Manual (boleh tertunda: sesi tanpa browser): check-in dari `/goals` → saldo di Settings dan dashboard berubah, revaluasi tampil di `/transactions`
- [ ] Review dengan Yogi sebelum phase 37
