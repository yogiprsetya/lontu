# Todo phase 2: Kontrak API

Plan: [plan-2.md](plan-2.md) · Index: [plan.md](plan.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T4: `withAuth`, `errors.ts`, dan `GET`/`PATCH /api/me`

**Description:** Helper error seragam `{ error: { code, message, fields? } }`, wrapper `withAuth` yang memverifikasi session dan menangkap error tak terduga, `profileSchema` di `lib/schemas/profile.ts`, dan route `/api/me` sebagai implementasi pertama dari pola acuan di SPEC.md.

**Acceptance criteria:**
- [ ] `GET /api/me` tanpa session → 401 `{ error: { code: "UNAUTHORIZED" } }`. Error tak terduga → 500 `INTERNAL` tanpa detail di body
- [ ] `PATCH /api/me` dengan body tidak valid → 400 `VALIDATION_ERROR` dengan `fields` per field (`z.flattenError`). `currency` selain `'IDR'` ditolak
- [ ] User A hanya membaca dan mengubah profilnya sendiri. Tes isolasi dengan user B

**Verification:**
- [ ] `tests/unit/errors.test.ts`, `tests/unit/profile-schema.test.ts`, `tests/api/with-auth.test.ts`, `tests/api/me.test.ts` hijau (handler dipanggil langsung, `@/lib/auth` di-mock)
- [ ] Manual: `curl` `/api/me` tanpa cookie → 401
- [ ] `pnpm build` hijau

**Dependencies:** T2, T3. Open question #1 diputuskan: Supabase

**Files likely touched:** `lib/api/errors.ts`, `lib/api/with-auth.ts`, `lib/schemas/profile.ts`, `app/api/me/route.ts`, tes di atas

**Estimated scope:** M

---

### Checkpoint B: setelah T4
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] `/api/me` sesuai pola route handler acuan di SPEC.md
