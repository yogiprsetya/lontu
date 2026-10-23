# Todo phase 2: Kontrak API

Plan: [plan-2.md](plan-2.md) · Index: [plan.md](plan.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T4: `withAuth`, `errors.ts`, dan `GET`/`PATCH /api/me`

**Description:** Helper error seragam `{ error: { code, message, fields? } }`, wrapper `withAuth` yang memverifikasi session dan menangkap error tak terduga, `profileSchema` di `lib/schemas/profile.ts`, dan route `/api/me` sebagai implementasi pertama dari pola acuan di SPEC.md.

**Acceptance criteria:**
- [x] `GET /api/me` tanpa session → 401 `{ error: { code: "UNAUTHORIZED" } }`. Error tak terduga → 500 `INTERNAL` tanpa detail di body
- [x] `PATCH /api/me` dengan body tidak valid → 400 `VALIDATION_ERROR` dengan `fields` per field (`z.flattenError`). `currency` selain `'IDR'` ditolak
- [x] User A hanya membaca dan mengubah profilnya sendiri. Tes isolasi dengan user B

**Verification:**
- [x] `tests/unit/errors.spec.ts`, `tests/unit/profile-schema.spec.ts`, `tests/api/with-auth.spec.ts`, `tests/api/me.spec.ts` hijau (handler dipanggil langsung, `@/lib/auth` di-mock)
- [x] Manual: `curl` `/api/me` tanpa cookie → 401
- [x] `pnpm build` hijau

**Catatan:** Tambahan helper `invalidJson()` (400 `INVALID_JSON`) untuk body yang bukan JSON. `curl /api/me` tanpa cookie dan dengan cookie palsu → 401 JSON.

**Dependencies:** T2, T3. Open question #1 diputuskan: Supabase

**Files likely touched:** `lib/api/errors.ts`, `lib/api/with-auth.ts`, `lib/schemas/profile.ts`, `app/api/me/route.ts`, tes di atas

**Estimated scope:** M

---

### Checkpoint B: setelah T4
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [x] `/api/me` sesuai pola route handler acuan di SPEC.md
