# Plan phase 2: Kontrak API

Index: [plan.md](plan.md) · Todo: [todo-2.md](todo-2.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md) §4

## Tujuan

Route API pertama (`/api/me`) mengikuti pola route handler acuan di SPEC.md: `withAuth`, validasi Zod di server, dan format error `{ error: { code, message, fields? } }`. Semua modul berikutnya menyalin pola ini.

## Task

- [ ] T4: `withAuth`, `errors.ts`, dan `GET`/`PATCH /api/me` (M)

Butuh phase 1 selesai (T2 untuk tabel `users`, T3 untuk `auth()`).

## Keputusan

- **`withAuth` dites dengan `vi.mock("@/lib/auth")`**, jadi tes API tidak butuh OAuth.
- **Tes isolasi user** memakai dua `userId` palsu terhadap DB tes. Tes ini wajib untuk setiap resource (SPEC.md, Testing strategy), dan `/api/me` menjadi contoh pertamanya.
- `serverError` mencatat detail di server dan mengirim pesan generik ke client.

## Blocker

- **Open question #1 (DB tes)**, sama dengan phase 1.

## Checkpoint B

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] `/api/me` sesuai pola route handler acuan di SPEC.md, termasuk tes isolasi user
