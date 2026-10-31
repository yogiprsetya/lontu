# Plan phase 31: Model dan API

Index: [plan.md](plan.md) § Budget bernama · Todo: [todo-31.md](todo-31.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md) § Perubahan skema, Kontrak API, Query `budgetUsage`, Aturan tulis

## Tujuan

Server budget bernama siap dan terkunci tes: tabel `budget_versions`, query pemakaian berversi di path baru, buat dan ubah budget. UI lama di branch belum tersentuh, dan produksi tidak terpengaruh karena migrasinya hanya menambah tabel.

## Task

- [x] T110: Tabel `budget_versions` (M, migrasi additive di DB bersama)
- [x] T111: `budgetUsage` berversi + `GET /api/budgets/usage` (M, risiko tinggi)
- [x] T112: `POST /api/budgets` buat budget (M, risiko tinggi: eksklusivitas)
- [ ] T113: `PATCH /api/budgets/[id]` ubah mulai bulan ini (M)

Urutan: T110 dulu. T111 dan T112 bebas urutan. T113 butuh T112.

## Keputusan

- **Skema `budget_versions`:** `id uuid pk`, `user_id` (cascade), `budget_id uuid not null`, `name text not null`, `spending_type text not null check in ('needs','wants')`, `year int`, `month int check 1..12`, `amount bigint check >= 0`, `category_ids uuid[] not null check cardinality >= 1`, `created_at`, `deleted_at timestamptz null`. Unik `(user_id, budget_id, year, month)`. RLS aktif. Elemen array tidak punya FK: kepemilikan dan jenis dicek saat tulis, dan kategori tidak pernah di-hard-delete.
- **Versi efektif bulan P** = baris dengan `(year, month)` terbesar ≤ P per `budget_id` (`distinct on`). Tampil bila `deleted_at is null`. Kategori efektif = `unnest(category_ids)`.
- **`summary` tetap berbentuk `BudgetGroup`** (`budget`, `spent`, `unbudgetedSpent`), jadi `groupStatus` dan `BudgetSummary` tidak berubah. `summarizeBudgetUsage(items, unbudgeted)` murni di `lib/budget-status.ts`, dipakai server dan update optimistic (T118).
- **Query lama diganti nama `legacyBudgetUsage`** di tempat (route lama dan tes lama tetap jalan). Tipe baca baru di `lib/schemas/budget-usage.ts`; tipe tulis baru `BudgetVersion` di `lib/schemas/budget.ts` (tidak bentrok dengan `Budget` lama).
- **Tulisan:** satu `db.transaction` dengan `pg_advisory_xact_lock(hashtext(userId))`, lalu cek, lalu upsert pada `(user_id, budget_id, year, month)`. `budget_id` dibuat server. Bulan = `todayInJakarta()`.
- **Pesan galat kategori dua saja:** "Kategori tidak valid" (asing, tidak ada, bukan spending, beda jenis, terarsip yang baru ditambahkan) dan "Kategori sudah dipakai budget lain". Keduanya di `fields.categoryIds`.

## Risiko

| Risiko                                             | Dampak | Mitigasi                                                                                     |
| -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Migrasi menyentuh `budgets` atau objek lain        | Tinggi | `drizzle-kit generate --explain` dulu; hanya `CREATE TABLE "budget_versions"` + index/FK/RLS  |
| Versi efektif atau budget berakhir salah dibaca    | Tinggi | T111 tes merah dulu dengan versi di beberapa bulan dan baris akhir                            |
| Dua tulisan paralel mengklaim kategori yang sama   | Tinggi | Advisory lock; tes `Promise.all` dua `POST` → tepat satu 201                                  |
| Pooler transaction mode dan advisory lock          | Sedang | Lock level transaksi (`_xact_`), dilepas saat commit; pola `db.transaction` sudah dipakai T13 |

## Checkpoint AD

- [ ] `pnpm lint && pnpm typecheck && pnpm test` hijau; jumlah tes dicatat
- [ ] Migrasi T110 sudah diterapkan dan `/budget` produksi (model lama) tetap normal
- [ ] Invarian `summary.total.spent = transactionTotals.expense` hijau untuk bulan dengan budget berpindah kategori
- [ ] Review dengan Yogi
