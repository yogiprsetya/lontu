# Todo phase 21: Pasang dan penyelesaian

Plan: [plan-21.md](plan-21.md) · Index: [plan.md](plan.md) · Spec: [SPEC-pwa-offline.md](../SPEC-pwa-offline.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T75: Kartu "Pasang Lontu"

**Description:** Tes ditulis lebih dulu. `lib/offline/install.ts`: `installPromptState({ standalone, isIOSSafari, hasPromptEvent, dismissedAt, now })` → `"hidden" | "prompt" | "ios-instructions"`, `isIOSSafari(userAgent)`. `hooks/use-install-prompt.ts`: event `beforeinstallprompt` (listener dipasang dari providers, `preventDefault` + simpan), `appinstalled`, `matchMedia("(display-mode: standalone)")`. `stores/ui.ts`: `installDismissedAt` + `dismissInstall()`, ikut `partialize`. `components/pwa/install-card.tsx` di dashboard: "Pasang" → `prompt()`, "Nanti" → `dismissInstall()`, varian instruksi iOS.

**Acceptance criteria:**

- [ ] `installPromptState`: standalone → hidden; event ada → prompt; Safari iOS tanpa event → ios-instructions; Chrome iOS (`CriOS`) tanpa event → hidden; ditutup 29 hari lalu → hidden, 31 hari lalu → tampil
- [ ] Android Chrome: kartu → dialog pasang bawaan, setelah terpasang kartu hilang. iPhone Safari: kartu instruksi. "Nanti" bertahan setelah reload
- [ ] Kartu tidak menggeser layout dashboard saat muncul (ruang hanya dipakai saat `prompt`/`ios-instructions`, CLS < 0,1), tombol ≥ 44 px, 360 px tanpa horizontal scroll

**Verification:**

- [ ] `pnpm vitest run tests/unit/install-prompt.spec.ts` hijau
- [ ] `pnpm build` hijau. Manual di Android Chrome dan iPhone Safari (preview Vercel, butuh HTTPS)

**Dependencies:** T66

**Files likely touched:** `lib/offline/install.ts`, `hooks/use-install-prompt.ts`, `stores/ui.ts`, `components/pwa/install-card.tsx`, `components/dashboard/dashboard-view.tsx`, `tests/unit/install-prompt.spec.ts`

**Estimated scope:** M

---

### T76: Verifikasi modul di perangkat + ukuran bundle

**Description:** Jalankan seluruh checklist Manual di SPEC-pwa-offline.md § Acceptance criteria di preview Vercel (Android Chrome dan iPhone Safari) dan `pnpm build && pnpm start` (DevTools). `Page.getInstallabilityErrors` kosong. Ukur JS first load `/dashboard` dan `/transactions` sebelum dan sesudah modul dengan metode Catatan ukuran di plan.md, catat di bagian modul ini. Centang acceptance criteria di spec, perbarui status di plan.md.

**Acceptance criteria:**

- [ ] Semua butir Manual di spec tercentang, atau dicatat sebagai temuan dengan task lanjutan
- [ ] Tambahan JS first load dari modul ini < 10 KB gzip, angka dicatat di plan.md
- [ ] Status modul `pwa-offline` di tabel plan.md diperbarui

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau

**Dependencies:** T74, T75

**Files likely touched:** `SPEC-pwa-offline.md`, `tasks/plan.md`

**Estimated scope:** S

---

### Checkpoint T (modul selesai)

- [ ] Gerbang penuh hijau + `pnpm build`
- [ ] Semua acceptance criteria spec tercentang
- [ ] Review dengan Yogi
