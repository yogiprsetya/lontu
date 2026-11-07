# Todo phase 37: Target, model dan API

Plan: [plan-37.md](plan-37.md) · Index: [plan.md](plan.md) · Spec: [SPEC-net-worth.md](../SPEC-net-worth.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T128: `netWorthProjection` fungsi murni

**Description:** `lib/net-worth-projection.ts`: `netWorthProjection({ targetAmount, targetMonth, current, monthlyFlows, countedMonths, today })` → `NetWorthProjection` (SPEC-net-worth keputusan #12–#14, § Tipe). Aritmetika bulan dari string lewat `lib/period.ts`, tanpa `Date` lokal. Tipe `Goal`, `NetWorthProjection`, `NetWorthProgress` di `lib/schemas/net-worth.ts` (schema Zod menyusul di T130). TDD.

**Acceptance criteria:**

- [x] Skenario dasar: `current 42700000`, target 150.000.000, `targetMonth "2028-12"`, arus 3/4/5 jt, hari ini 2026-11-15 → `monthlyContribution 4000000`, `etaMonth "2029-01"`, `monthsLeft 26`, `neededPerMonth 4126924`, `onTrack false`
- [x] `reached`, `countedMonths` 0 (laju `null`), laju 0 dan negatif (`etaMonth null`), sisa ≤ laju (tercapai bulan ini), `overdue`, pergantian tahun, tanpa `targetMonth`
- [x] `monthlyContribution` dibulatkan ke bawah, `neededPerMonth` dan bulan ETA memakai `ceil`

**Verification:**

- [x] `pnpm vitest run tests/unit/net-worth-projection.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T123

**Files likely touched:** `lib/net-worth-projection.ts`, `lib/schemas/net-worth.ts`, `tests/unit/net-worth-projection.spec.ts`

**Estimated scope:** S

---

### T129: Tabel `net_worth` dan query `netWorthProgress`

**Description:** Tabel `net_worth` di `db/schema.ts` + migrasi `goals_table` (SPEC-net-worth § Perubahan skema). `lib/server/queries/net-worth-progress.ts`: `netWorthProgress(userId, { today, includeArchived })` dengan tiga agregasi SQL (SPEC-net-worth § Query) lalu `netWorthProjection`. `asset-valuations.ts` mengisi `netWorthId`. Tes merah dulu dengan baris yang ditulis langsung ke DB.

**Acceptance criteria:**

- [x] Skenario dasar (setelah revaluasi 2026-10-31) → angka SPEC-net-worth § Acceptance criteria; transfer RD Saham → Emas bernilai 0; transfer antar dua target memindahkan laju; adjustment dan revaluasi tidak masuk laju
- [x] Akun terarsip tidak ikut `current`, `marketGain`, dan laju; akun dibuat 2026-10-01 → pembagi 1; akun dibuat bulan ini → `monthlyContribution null`; `staleAccountIds` sesuai keputusan #16
- [x] Invarian `current` = jumlah `balance` `GET /api/accounts` untuk akun aktif target; target user lain tidak pernah terbaca; `GET /api/valuations` mengisi `netWorthId`

**Verification:**

- [x] `pnpm drizzle-kit generate --explain` dibaca; `migration.sql` hanya `net-worth` + index/FK/RLS
- [x] `pnpm vitest run tests/api/net-worth-progress.spec.ts tests/api/valuations.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T124, T128

**Files likely touched:** `db/schema.ts`, `drizzle/<timestamp>_goals_table/`, `lib/server/queries/net-worth-progress.ts`, `lib/server/queries/asset-valuations.ts`, `tests/api/net-worth-progress.spec.ts`

**Estimated scope:** M

**Catatan (2026-11-02):** migrasi `20261101235956_goals_table` diterapkan (hanya tabel `net_worth`, check, index, FK, RLS). `netWorthProgress` = tiga query paralel (daftar target, total per target, arus per bulan) lalu `netWorthProjection`; arus hanya untuk bulan yang dihitung. Satu run penuh pertama gagal 5 tes lama (budgets, recurring, dashboard, seed) karena DB lambat; ulangan file-file itu dan run penuh kedua hijau (1398 lulus, 83 berkas). `EXPLAIN` dengan ribuan baris belum diukur.

---

### T130: `POST`/`GET /api/net-worth`

**Description:** `netWorthCreateSchema` di `lib/schemas/net-worth.ts`, `createNetWorth` di `lib/server/net-worth.ts` (advisory lock, nama unik di antara target aktif, aturan akun keputusan #10), `app/api/net-worth/route.ts` (`GET ?includeArchived`, `POST` → 201 `NetWorthProgress`), `netWorthNotFound()` dan `netWorthNameTaken()` di `lib/api/errors.ts`.

**Acceptance criteria:**

- [x] `POST` valid → 201 dengan progres; nama sama beda huruf besar → 409 `NET_WORTH_NAME_TAKEN`; `targetMonth` lampau → 400
- [x] Akun dipakai target aktif lain, kartu kredit, terarsip, milik user lain, atau duplikat → 400 `fields.accountIds`; dua `POST` paralel dengan akun sama → tepat satu 201
- [x] `GET` hanya target user sendiri, urut `created_at`; body dengan `userId` → 400; tanpa session → 401

**Verification:**

- [x] `pnpm vitest run tests/api/net-worth.spec.ts tests/unit/net-worth-schema.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T129

**Files likely touched:** `lib/schemas/net-worth.ts`, `lib/server/net-worth.ts`, `app/api/net-worth/route.ts`, `lib/api/errors.ts`, `tests/api/net-worth.spec.ts`, `tests/unit/net-worth-schema.spec.ts`

**Estimated scope:** M

**Catatan (2026-11-02):** cek akun dulu (400), lalu nama (409), seperti budget. Run penuh kadang gagal di tes API lama karena hook menunggu koneksi pooler (lihat komentar `vitest.config.ts`); ulangan hijau 1434 lulus (85 berkas).

---

### T131: `PATCH`/`DELETE`/`restore /api/net-worth/[id]`

**Description:** `netWorthUpdateSchema`, `updateNetWorth`, `archiveNetWorth`, `restoreNetWorth` di `lib/server/net-worth.ts`; `app/api/net-worth/[id]/route.ts` dan `[id]/restore/route.ts`; `netWorthRestoreConflict()`. Akun terarsip yang sudah ada di target boleh tetap saat `PATCH` (keputusan #15).

**Acceptance criteria:**

- [x] `PATCH { name }` pada target dengan akun terarsip → 200; `PATCH { accountIds }` yang menambah akun terarsip atau akun target lain → 400; `PATCH` target terarsip → 404; body kosong → 400
- [x] `DELETE` dua kali → 200, `archivedAt` tidak berubah; arsip A, buat B dengan akun A, restore A → 409 `NET_WORTH_RESTORE_CONFLICT`; restore target aktif → 200 tanpa perubahan
- [x] Isolasi: user B mendapat 404 untuk `PATCH`/`DELETE`/`restore` target A; id bukan UUID → 404

**Verification:**

- [x] `pnpm vitest run tests/api/net-worth.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T130

**Files likely touched:** `lib/schemas/net-worth.ts`, `lib/server/net-worth.ts`, `app/api/net-worth/[id]/route.ts`, `app/api/net-worth/[id]/restore/route.ts`, `lib/api/errors.ts`, `tests/api/net-worth.spec.ts`

**Estimated scope:** M

**Catatan (2026-11-02):** tes route item di `tests/api/net-worth-item.spec.ts` (precedent `transactions-item.spec.ts`), bukan `net-worth.spec.ts`. Tes: 1450 lulus (86 berkas).
