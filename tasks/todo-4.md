# Todo phase 4: Verifikasi end-to-end

Plan: [plan-4.md](plan-4.md) · Index: [plan.md](plan.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### ~~T9: Login tes E2E dan smoke test shell Playwright~~ (ditunda)

**Status:** Ditunda pada 2026-10-20, E2E tidak masuk foundation. Implementasi di commit `84cb66c` dihapus; pulihkan dari commit itu saat E2E dijadwalkan. Checklist di bawah adalah catatan historis.

**Description:** Provider Credentials khusus tes di `lib/auth.ts` yang hanya aktif saat `E2E_AUTH=1` dan `NODE_ENV !== "production"` (Open question #2). Konfigurasi Playwright dengan viewport 360×800 dan 1280×800, plus smoke test shell.

**Acceptance criteria:**
- [x] Provider tes tidak terdaftar saat `E2E_AUTH` kosong atau di production. Dibuktikan dengan tes unit
- [x] Smoke test: login tes → `/dashboard` → bottom nav (360) / sidebar (1280) tampil → tanpa horizontal scroll → logout
- [x] Tanpa session, `/dashboard` dialihkan ke `/login`

**Verification:**
- [x] `pnpm test:e2e` hijau di kedua viewport
- [x] `pnpm build` dengan `NODE_ENV=production` tidak memuat provider tes

**Catatan:** Provider `e2e` login sebagai user tetap `test-e2e` (di-upsert ke `users`), dan global teardown Playwright menghapusnya (cascade). Playwright menjalankan `next dev` di port 3100 dengan `E2E_AUTH=1`. Dicek manual: `next start` dengan `E2E_AUTH=1` hanya mendaftarkan `google`, dan POST ke `/api/auth/callback/e2e` ditolak (`error=Configuration`).

**Dependencies:** T3, T6. Open question #2 diputuskan: Credentials tes

**Files likely touched:** `lib/auth.ts`, `playwright.config.ts`, `e2e/shell.spec.ts`, `tests/unit/auth-providers.spec.ts`, `e2e/helpers.ts`, `e2e/global-teardown.ts`

**Estimated scope:** M

---

### Checkpoint: Foundation selesai
- [x] Semua acceptance criteria di SPEC-foundation.md tercentang
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau (tanpa `test:e2e`, ditunda)
- [ ] Review dengan Yogi, lalu tulis `SPEC-accounts-categories.md`
