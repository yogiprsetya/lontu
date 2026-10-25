# Plan phase 19: Service worker dan baca offline

Index: [plan.md](plan.md) · Todo: [todo-19.md](todo-19.md) · Spec: [SPEC-pwa-offline.md](../SPEC-pwa-offline.md) § Keputusan 1–5, 12, 14, Deliverables 1, Risiko (Serwist + Turbopack)

## Tujuan

Aplikasi terpasang yang dibuka dalam mode pesawat menampilkan dashboard, daftar transaksi, dan budget terakhir yang pernah dimuat, dengan banner offline. Halaman yang belum pernah dibuka jatuh ke `/~offline`. Versi baru tidak memuat ulang sendiri, dan sign-out menghapus data yang di-cache. Belum ada pencatatan offline.

## Task

- [x] T66: Spike Serwist configurator + baca offline `/dashboard` (M) (cek manual cold start offline tertunda)
- [x] T67: `/~offline`, banner offline, state "belum ada data tersimpan" (M) (cek manual tertunda)
- [ ] T68: Toast "Versi baru tersedia" (S)
- [ ] T69: Hapus cache saat sign-out dan saat pemilik berganti (S)

Urutan: T66 → T67, T68, T69. Ketiganya hanya butuh T66 dan boleh paralel.

## Keputusan

- **T66 adalah spike yang boleh gagal.** Jika cold start offline `/dashboard` tidak bisa dibuktikan dengan mode configurator, stop dan tanyakan Yogi (alternatif `@serwist/turbopack` butuh `next.config.ts`, Ask first). Tidak ada task lain yang dimulai sebelum T66 hijau.
- **SPEC.md diperbarui di T66**, sebelum kode: capability map (`cache API di service worker`) dan Tech stack (`serwist`, `@serwist/cli`). Hanya setelah Open questions #1 dan #2 di spec disetujui.
- **`LoadError` yang sudah ada dibuat sadar offline** (satu tempat), bukan menambah state baru di setiap halaman.
- **Pembersihan cache di T69 belum menyentuh outbox.** Outbox baru ada di phase 20, dan T74 memperluas `clearOfflineData`.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| HTML stream `cacheComponents` yang di-cache tidak bisa dihidrasi offline | Tinggi | T66 membuktikannya lebih dulu dengan `pnpm build && pnpm start` + DevTools Offline |
| `worker/sw.ts` membuat `pnpm typecheck` gagal (lib webworker vs DOM) | Sedang | `/// <reference lib="webworker" />`. Jika gagal, `worker/tsconfig.json` sendiri dan `worker/` di-exclude dari root |
| Proxy mengalihkan `/sw.js` ke `/login` sehingga SW tidak terdaftar | Sedang | Matcher diperbarui di T66, dicek dengan `curl -I /sw.js` tanpa cookie |
| Data user lama terlihat setelah sign-out | Sedang | T69, dicek di DevTools > Cache Storage |

## Checkpoint R

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual (Chrome DevTools + ponsel): buka dashboard, transaksi, budget online → mode pesawat → buka ulang dari layar utama → data terakhir dan banner offline tampil. Halaman baru → `/~offline`
- [ ] Deploy preview kedua → toast versi baru, form yang terbuka tidak hilang
- [ ] Sign-out → Cache Storage `lontu-api` dan `pages*` kosong
- [ ] Review dengan Yogi sebelum phase 20
