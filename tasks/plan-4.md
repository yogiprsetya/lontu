# Plan phase 4: Verifikasi end-to-end

Index: [plan.md](plan.md) · Todo: [todo-4.md](todo-4.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md) bagian Tes

## Tujuan

Alur login → shell → logout teruji otomatis di viewport mobile dan desktop, tanpa bergantung pada Google OAuth.

## Task

- [x] T9: Login tes E2E dan smoke test shell Playwright (M)

Butuh T3 dan T6.

## Keputusan

- Provider Credentials khusus tes hanya terdaftar saat `E2E_AUTH=1` dan `NODE_ENV !== "production"`. Kondisi ini dibuktikan dengan tes unit, bukan hanya dengan konfigurasi.
- Viewport: 360×800 dan 1280×800.

## Blocker

- ~~Open question #2~~ diputuskan: provider Credentials khusus tes.

## Checkpoint: Foundation selesai

- [ ] Semua acceptance criteria di SPEC-foundation.md tercentang
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e` hijau
- [ ] Review dengan Yogi, lalu tulis `SPEC-accounts-categories.md`
