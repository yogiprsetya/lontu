# Plan phase 21: Pasang dan penyelesaian

Index: [plan.md](plan.md) · Todo: [todo-21.md](todo-21.md) · Spec: [SPEC-pwa-offline.md](../SPEC-pwa-offline.md) § Keputusan 13, Acceptance criteria (manual), Risiko (bundle)

## Tujuan

Pemilik yang membuka Lontu di browser diajak memasangnya ke layar utama (dialog bawaan di Chromium, instruksi di Safari iOS) tanpa diganggu lagi setelah menolak. Seluruh acceptance criteria spec dicek di perangkat sungguhan. Phase ini menutup modul `pwa-offline` dan capability map.

## Task

- [ ] T75: Kartu "Pasang Lontu" (M)
- [ ] T76: Verifikasi modul di perangkat + ukuran bundle (S)

Urutan: T75 → T76.

## Keputusan

- **Kelayakan kartu dihitung `installPromptState` murni** (`lib/offline/install.ts`), jadi aturan standalone, iOS, dan 30 hari dites tanpa browser.
- **Event `beforeinstallprompt` ditangkap sedini mungkin** (di `app/providers.tsx`, bukan di dashboard), karena event bisa terpicu sebelum dashboard dirender.
- **`installDismissedAt` di `useUIStore`** (persist, ikut `partialize`): state UI, bukan data server.
- **T76 tidak menambah kode kecuali perbaikan dari temuan.** Temuan besar menjadi task baru, bukan diselipkan.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `beforeinstallprompt` sudah lewat saat dashboard dirender | Sedang | Listener di providers, event disimpan di modul |
| Deteksi Safari iOS salah (Chrome iOS juga WebKit tanpa event) | Rendah | Instruksi hanya untuk Safari iOS (`CriOS`/`FxiOS` dikecualikan), dites di `install-prompt.spec.ts` |
| Kode PWA menambah JS di semua halaman | Sedang | Diukur di T76 dengan metode yang sama dengan Catatan ukuran dashboard, target < 10 KB gzip |

## Checkpoint T (modul selesai)

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Semua acceptance criteria di SPEC-pwa-offline.md tercentang
- [ ] Android Chrome dan iPhone Safari: pasang → mode pesawat → baca, catat, online → terkirim
- [ ] Review dengan Yogi
