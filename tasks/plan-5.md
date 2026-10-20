# Plan phase 5: Data akun & kategori

Index: [plan.md](plan.md) · Todo: [todo-5.md](todo-5.md) · Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md) § Keputusan, Transaksi penyesuaian, Kontrak API (Akun)

## Tujuan

Skema mendukung transaksi `adjustment`, user baru ter-seed kategori default saat login, dan API akun lengkap (`GET`/`POST`/`PATCH`/`DELETE`/`restore`) dengan saldo dari view. Setelah phase ini, akun bisa dikelola lewat `curl` dan saldo awal bisa diedit dengan jejak adjustment.

## Task

- [ ] T10: Migrasi tipe transaksi `adjustment` (S, risiko tinggi)
- [ ] T11: Seed kategori default saat login (M, risiko sedang)
- [ ] T12: `GET`/`POST /api/accounts` dengan saldo (M)
- [ ] T13: `PATCH`/`DELETE`/`restore` akun + adjustment saldo awal (M, risiko sedang)

Urutan: T10 → T12 → T13. T11 hanya butuh foundation dan boleh dikerjakan kapan saja di phase ini. T13 butuh T10 (constraint `adjustment`) dan T12 (schema + query akun).

## Keputusan

- **Migrasi lewat `drizzle-kit generate`**, bukan SQL tulisan tangan, supaya snapshot tetap sinkron. Constraint diubah di `db/schema.ts`; jika `drizzle-kit` tidak men-generate drop/create view dengan benar, tambahkan SQL kustom di migrasi yang sama dan catat di todo.
- **Saldo awal efektif dihitung di SQL** (`initial_balance + coalesce(sum(adjustment), 0)`) dalam query daftar akun, bersama join ke `account_balances`. Tidak ada penjumlahan di TS.
- **Bentrok nama:** `POST` memakai `onConflictDoNothing().returning()`, `PATCH` menangkap `23505` lewat helper `isUniqueViolation(err, constraint)` di `lib/server/pg-errors.ts`. Error Drizzle membungkus error Postgres di `cause` (lihat `tests/setup/db.ts`).
- **Id path divalidasi `z.uuid()`.** Kalau gagal, langsung 404 tanpa query.
- **Seed satu statement SQL** (`insert … select … where not exists … on conflict do nothing`). `upsertUser` menjalankannya setelah upsert user di dalam `db.transaction`.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `drizzle-kit` 1.0 RC salah men-diff perubahan `check()` atau definisi `pgView` | Tinggi | Baca SQL hasil generate sebelum migrate. Tes constraint + saldo yang sudah ada harus tetap hijau |
| `db.transaction` + `select … for update` di pooler transaction mode | Sedang | Tes paralel di T13 (dua `PATCH` bersamaan). Pooler transaction mode mempertahankan satu koneksi per transaksi, jadi seharusnya aman. Jika gagal, berhenti dan tanya |
| Owner yang sudah ada belum ter-seed | Rendah | Seed berbasis "belum ada baris kategori", jadi login berikutnya men-seed. Verifikasi manual setelah deploy |

## Checkpoint D

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] `pnpm db:migrate` jalan di Supabase, tes constraint dan saldo lama tetap hijau
- [ ] Manual: login ulang sebagai owner → 16 kategori tercipta. `curl` buat akun, ubah saldo awal → ada baris `adjustment`
- [ ] Review dengan Yogi sebelum phase 6
