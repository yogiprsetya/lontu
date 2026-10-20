# Todo phase 4: Verifikasi end-to-end

Plan: [plan-4.md](plan-4.md) · Index: [plan.md](plan.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T9: Login tes E2E dan smoke test shell Playwright

**Description:** Provider Credentials khusus tes di `lib/auth.ts` yang hanya aktif saat `E2E_AUTH=1` dan `NODE_ENV !== "production"` (Open question #2). Konfigurasi Playwright dengan viewport 360×800 dan 1280×800, plus smoke test shell.

**Acceptance criteria:**
- [ ] Provider tes tidak terdaftar saat `E2E_AUTH` kosong atau di production. Dibuktikan dengan tes unit
- [ ] Smoke test: login tes → `/dashboard` → bottom nav (360) / sidebar (1280) tampil → tanpa horizontal scroll → logout
- [ ] Tanpa session, `/dashboard` dialihkan ke `/login`

**Verification:**
- [ ] `pnpm test:e2e` hijau di kedua viewport
- [ ] `pnpm build` dengan `NODE_ENV=production` tidak memuat provider tes

**Dependencies:** T3, T6. Open question #2 diputuskan: Credentials tes

**Files likely touched:** `lib/auth.ts`, `playwright.config.ts`, `e2e/shell.spec.ts`, `tests/unit/auth-providers.test.ts`

**Estimated scope:** M

---

### Checkpoint: Foundation selesai
- [ ] Semua acceptance criteria di SPEC-foundation.md tercentang
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e` hijau
- [ ] Review dengan Yogi, lalu tulis `SPEC-accounts-categories.md`
