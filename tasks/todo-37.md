# Todo phase 37: Target, model dan API

Plan: [plan-37.md](plan-37.md) · Index: [plan.md](plan.md) · Spec: [SPEC-goals.md](../SPEC-goals.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T128: `goalProjection` fungsi murni

**Description:** `lib/goal-projection.ts`: `goalProjection({ targetAmount, targetMonth, current, monthlyFlows, countedMonths, today })` → `GoalProjection` (SPEC-goals keputusan #12–#14, § Tipe). Aritmetika bulan dari string lewat `lib/period.ts`, tanpa `Date` lokal. Tipe `Goal`, `GoalProjection`, `GoalProgress` di `lib/schemas/goal.ts` (schema Zod menyusul di T130). TDD.

**Acceptance criteria:**

- [x] Skenario dasar: `current 42700000`, target 150.000.000, `targetMonth "2028-12"`, arus 3/4/5 jt, hari ini 2026-11-15 → `monthlyContribution 4000000`, `etaMonth "2029-01"`, `monthsLeft 26`, `neededPerMonth 4126924`, `onTrack false`
- [x] `reached`, `countedMonths` 0 (laju `null`), laju 0 dan negatif (`etaMonth null`), sisa ≤ laju (tercapai bulan ini), `overdue`, pergantian tahun, tanpa `targetMonth`
- [x] `monthlyContribution` dibulatkan ke bawah, `neededPerMonth` dan bulan ETA memakai `ceil`

**Verification:**

- [x] `pnpm vitest run tests/unit/goal-projection.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T123

**Files likely touched:** `lib/goal-projection.ts`, `lib/schemas/goal.ts`, `tests/unit/goal-projection.spec.ts`

**Estimated scope:** S

---

### T129: Tabel `goals` dan query `goalProgress`

**Description:** Tabel `goals` di `db/schema.ts` + migrasi `goals_table` (SPEC-goals § Perubahan skema). `lib/server/queries/goal-progress.ts`: `goalProgress(userId, { today, includeArchived })` dengan tiga agregasi SQL (SPEC-goals § Query) lalu `goalProjection`. `asset-valuations.ts` mengisi `goalId`. Tes merah dulu dengan baris yang ditulis langsung ke DB.

**Acceptance criteria:**

- [x] Skenario dasar (setelah revaluasi 2026-10-31) → angka SPEC-goals § Acceptance criteria; transfer RD Saham → Emas bernilai 0; transfer antar dua target memindahkan laju; adjustment dan revaluasi tidak masuk laju
- [x] Akun terarsip tidak ikut `current`, `marketGain`, dan laju; akun dibuat 2026-10-01 → pembagi 1; akun dibuat bulan ini → `monthlyContribution null`; `staleAccountIds` sesuai keputusan #16
- [x] Invarian `current` = jumlah `balance` `GET /api/accounts` untuk akun aktif target; target user lain tidak pernah terbaca; `GET /api/valuations` mengisi `goalId`

**Verification:**

- [x] `pnpm drizzle-kit generate --explain` dibaca; `migration.sql` hanya `goals` + index/FK/RLS
- [x] `pnpm vitest run tests/api/goal-progress.spec.ts tests/api/valuations.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T124, T128

**Files likely touched:** `db/schema.ts`, `drizzle/<timestamp>_goals_table/`, `lib/server/queries/goal-progress.ts`, `lib/server/queries/asset-valuations.ts`, `tests/api/goal-progress.spec.ts`

**Estimated scope:** M

**Catatan (2026-11-02):** migrasi `20261101235956_goals_table` diterapkan (hanya tabel `goals`, check, index, FK, RLS). `goalProgress` = tiga query paralel (daftar target, total per target, arus per bulan) lalu `goalProjection`; arus hanya untuk bulan yang dihitung. Satu run penuh pertama gagal 5 tes lama (budgets, recurring, dashboard, seed) karena DB lambat; ulangan file-file itu dan run penuh kedua hijau (1398 lulus, 83 berkas). `EXPLAIN` dengan ribuan baris belum diukur.

---

### T130: `POST`/`GET /api/goals`

**Description:** `goalCreateSchema` di `lib/schemas/goal.ts`, `createGoal` di `lib/server/goals.ts` (advisory lock, nama unik di antara target aktif, aturan akun keputusan #10), `app/api/goals/route.ts` (`GET ?includeArchived`, `POST` → 201 `GoalProgress`), `goalNotFound()` dan `goalNameTaken()` di `lib/api/errors.ts`.

**Acceptance criteria:**

- [x] `POST` valid → 201 dengan progres; nama sama beda huruf besar → 409 `GOAL_NAME_TAKEN`; `targetMonth` lampau → 400
- [x] Akun dipakai target aktif lain, kartu kredit, terarsip, milik user lain, atau duplikat → 400 `fields.accountIds`; dua `POST` paralel dengan akun sama → tepat satu 201
- [x] `GET` hanya target user sendiri, urut `created_at`; body dengan `userId` → 400; tanpa session → 401

**Verification:**

- [x] `pnpm vitest run tests/api/goals.spec.ts tests/unit/goal-schema.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T129

**Files likely touched:** `lib/schemas/goal.ts`, `lib/server/goals.ts`, `app/api/goals/route.ts`, `lib/api/errors.ts`, `tests/api/goals.spec.ts`, `tests/unit/goal-schema.spec.ts`

**Estimated scope:** M

**Catatan (2026-11-02):** cek akun dulu (400), lalu nama (409), seperti budget. Run penuh kadang gagal di tes API lama karena hook menunggu koneksi pooler (lihat komentar `vitest.config.ts`); ulangan hijau 1434 lulus (85 berkas).

---

### T131: `PATCH`/`DELETE`/`restore /api/goals/[id]`

**Description:** `goalUpdateSchema`, `updateGoal`, `archiveGoal`, `restoreGoal` di `lib/server/goals.ts`; `app/api/goals/[id]/route.ts` dan `[id]/restore/route.ts`; `goalRestoreConflict()`. Akun terarsip yang sudah ada di target boleh tetap saat `PATCH` (keputusan #15).

**Acceptance criteria:**

- [x] `PATCH { name }` pada target dengan akun terarsip → 200; `PATCH { accountIds }` yang menambah akun terarsip atau akun target lain → 400; `PATCH` target terarsip → 404; body kosong → 400
- [x] `DELETE` dua kali → 200, `archivedAt` tidak berubah; arsip A, buat B dengan akun A, restore A → 409 `GOAL_RESTORE_CONFLICT`; restore target aktif → 200 tanpa perubahan
- [x] Isolasi: user B mendapat 404 untuk `PATCH`/`DELETE`/`restore` target A; id bukan UUID → 404

**Verification:**

- [x] `pnpm vitest run tests/api/goals.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T130

**Files likely touched:** `lib/schemas/goal.ts`, `lib/server/goals.ts`, `app/api/goals/[id]/route.ts`, `app/api/goals/[id]/restore/route.ts`, `lib/api/errors.ts`, `tests/api/goals.spec.ts`

**Estimated scope:** M

**Catatan (2026-11-02):** tes route item di `tests/api/goals-item.spec.ts` (precedent `transactions-item.spec.ts`), bukan `goals.spec.ts`. Tes: 1450 lulus (86 berkas).
