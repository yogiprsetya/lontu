# Plan phase 37: Target, model dan API

Index: [plan.md](plan.md) § Modul `goals` · Todo: [todo-37.md](todo-37.md) · Spec: [SPEC-goals.md](../SPEC-goals.md) § Perubahan skema, Kontrak API, Query, Fungsi murni

## Tujuan

Server target siap dan terkunci tes: proyeksi murni, tabel `goals`, query `goalProgress` dengan laju setoran, dan CRUD dengan aturan satu akun satu target. UI belum disentuh, dan produksi tidak terpengaruh karena migrasinya hanya menambah tabel.

## Task

- [x] T128: `goalProjection` fungsi murni (S)
- [x] T129: Tabel `goals` + query `goalProgress` (M, risiko tinggi: SQL laju)
- [x] T130: `POST`/`GET /api/goals` (M, risiko tinggi: eksklusivitas akun)
- [x] T131: `PATCH`/`DELETE`/`restore /api/goals/[id]` (M)

Urutan: T128 bebas (hanya butuh T123, boleh dikerjakan paralel dengan phase 36). T129 butuh T124 dan T128. T130 butuh T129. T131 butuh T130.

## Keputusan

- **Migrasi `goals_table`:** `CREATE TABLE "goals"` + check + index + FK `user_id` + RLS. Tanpa objek lain (`--explain`).
- **`goalProgress` dites lewat baris DB langsung** (target, akun, transaksi, revaluasi) di T129 sebelum route ada. Route T130 hanya memanggilnya.
- **`goalId` di `GET /api/valuations`** diisi di T129 (join `unnest(account_ids)` target aktif), jadi T127 otomatis mendapatkannya.
- **Tulisan target:** satu `db.transaction` dengan `pg_advisory_xact_lock(hashtext(userId))`, cek nama dan akun, tulis, lalu baca `GoalProgress` di luar transaksi. Pesan galat akun di `fields.accountIds` menyebut akun pertama yang bermasalah ("{akun} sudah dipakai {target}", "Akun tidak valid").
- **Resource cache `goals`** ditambahkan di T132 bersama hook pertama.

## Risiko

| Risiko                                                         | Dampak | Mitigasi                                                                                                 |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| Arus bersih salah: transfer internal dihitung dua kali, antar target tidak bergeser | Tinggi | Tes merah T129: transfer internal = 0, transfer antar target memindahkan laju, join dua sisi              |
| Pembagi laju salah (akun baru, bulan kosong)                   | Tinggi | Tes T128 (`countedMonths` 0–3) dan T129 (akun dibuat 2026-10-01 → pembagi 1)                              |
| Dua `POST` paralel mengklaim akun sama                         | Sedang | Advisory lock; tes `Promise.all` → tepat satu 201                                                        |
| Array `account_ids` tanpa FK menyimpan id asing                | Sedang | Cek kepemilikan di setiap tulisan, tes isolasi A/B (precedent `budgets.category_ids`)                    |

## Checkpoint AJ

- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau; jumlah tes dicatat (1450 di T131)
- [ ] Migrasi T129 diterapkan; produksi (kode lama) tetap normal (migrasi diterapkan 2026-11-02; cek produksi tertunda untuk Yogi)
- [x] Skenario dasar SPEC-goals (`GET /api/goals` → `current 42700000`, `etaMonth "2029-01"`, `neededPerMonth 4126924`) hijau
- [x] Invarian `current` = jumlah `GET /api/accounts` dan `contributed + marketGain = balance` hijau
- [ ] Review dengan Yogi
