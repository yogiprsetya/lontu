# Plan phase 1: Fondasi teknis

Index: [plan.md](plan.md) · Todo: [todo-1.md](todo-1.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md) §1–§3

## Tujuan

Dependency dan pipeline tes siap, skema DB lengkap termigrasi, dan pengguna di allowlist bisa login dengan Google. Phase ini berisi dua risiko terbesar foundation, jadi dikerjakan paling awal.

## Task

- [x] T1: Tooling, scripts, Vitest, dan `money.ts` (S)
- [x] T2: Skema DB, migrasi, RLS, view `account_balances` (M, risiko tinggi)
- [x] T3: Login Google dengan allowlist (M, risiko tinggi)

Urutan: T1 → T2 → T3. T3 butuh tabel `users` dari T2 untuk upsert di callback `signIn`.

## Keputusan

- **Tes DB memakai Postgres sungguhan** (Supabase lewat `DATABASE_URL`, user tes dihapus setelah tes) dengan migrasi yang sama dengan production, supaya view dan constraint ikut teruji.
- **Yang tidak bisa diekspresikan Drizzle ditaruh di migrasi SQL kustom:** view `account_balances`, `enable row level security`, dan unique index `lower(name)` jika `drizzle-kit` tidak mendukung.
- **`proxy.ts` hanya redirect optimistik** berdasarkan ada/tidaknya cookie. Verifikasi tetap di `withAuth` (phase 2) dan server component.
- Klien `db/index.ts` memakai `prepare: false` karena pooler Supabase transaction mode.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `next-auth@5` tidak kompatibel dengan Next 16.4 / React 19.3 | Tinggi | Cek peer deps di T1 sebelum menulis kode auth. Jika bentrok, berhenti dan tanya. Jangan ganti library sendiri |
| API Drizzle 1.0 RC berbeda dari 0.x (`drizzle-orm/postgres-js`, `check()`, index ekspresi) | Tinggi | Baca `.d.ts` dan docs versi terpasang, bukan ingatan tentang 0.x |
| Pooler Supabase menolak DDL | Sedang | Migrasi lewat koneksi langsung (port 5432) dengan env terpisah jika perlu |

## Blocker

- ~~Open question #1~~ diputuskan: Supabase lewat `DATABASE_URL`.
- ~~Open question #3~~ diputuskan: `lontu`.

## Checkpoint A

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Migrasi jalan di DB kosong dan di Supabase
- [ ] Login Google berhasil secara manual, email di luar allowlist ditolak
- [ ] Review dengan Yogi sebelum phase 2
