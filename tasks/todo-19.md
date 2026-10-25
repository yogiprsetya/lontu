# Todo phase 19: Service worker dan baca offline

Plan: [plan-19.md](plan-19.md) · Index: [plan.md](plan.md) · Spec: [SPEC-pwa-offline.md](../SPEC-pwa-offline.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Semua task phase ini juga butuh `pnpm build && pnpm start` (perilaku SW tidak bisa dicek di `next dev`).

---

### T66: Spike Serwist configurator + baca offline `/dashboard`

**Description:** Prasyarat: Open questions #1 dan #2 di spec disetujui, lalu SPEC.md diperbarui (capability map dan Tech stack). Pasang `@serwist/next`, `serwist`, dev `@serwist/cli`. `serwist.config.mjs` (`swSrc: "worker/sw.ts"`, `swDest: "public/sw.js"`, `precachePrerendered: false`). `lib/offline/cache-names.ts`. `worker/sw.ts` dengan aturan `lontu-api` dan `pages` (keputusan #3: NetworkFirst 4 s, hanya 200, batas entri) sebelum `defaultCache`, `skipWaiting: false`, `clientsClaim: true`. Script `build` → `next build && serwist build`. `.gitignore` → `public/sw.js*`. `proxy.ts` melewati `sw\.js` dan `~offline`. `SerwistProvider` di `app/providers.tsx` (`disable` di development, `reloadOnOnline={false}`).

**Acceptance criteria:**

- [x] `pnpm build` menghasilkan `public/sw.js`. `curl -I /sw.js` tanpa cookie → 200, bukan redirect
- [ ] Setelah membuka `/dashboard` online: DevTools Offline + reload → dashboard tampil dengan angka terakhir (HTML dari `pages`, `/api/dashboard`, `/api/accounts`, `/api/budgets` dari `lontu-api`)
- [ ] `/api/auth/session`, `/api/transactions/export`, respons 401, dan redirect tidak pernah muncul di Cache Storage

**Verification:**

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual: `pnpm start`, Chrome DevTools > Application (SW aktif, isi cache) dan Network Offline
- [ ] Gagal membuktikan cold start offline → stop, catat temuan di plan-19, tanyakan Yogi

**Dependencies:** None (prasyarat: persetujuan Open questions #1–#2)

**Files likely touched:** `package.json`, `serwist.config.mjs`, `worker/sw.ts`, `lib/offline/cache-names.ts`, `app/providers.tsx`, `proxy.ts`, `.gitignore`, `SPEC.md`

**Estimated scope:** M (sebagian besar konfigurasi)

---

### T67: `/~offline`, banner offline, state "belum ada data tersimpan"

**Description:** `app/~offline/page.tsx` statis (di luar `(app)`, tanpa session): teks keputusan #4 + tautan Dashboard dan Tambah Expense, di-precache lewat `additionalPrecacheEntries` dan dipakai sebagai `fallbacks` dokumen di `worker/sw.ts`. `hooks/use-online-status.ts` (`navigator.onLine` + event, `useSyncExternalStore`). `components/pwa/offline-banner.tsx` di `app/(app)/layout.tsx` (`role="status"`, tidak menutupi bottom nav). `LoadError` menampilkan "Belum ada data tersimpan untuk tampilan ini" saat offline.

**Acceptance criteria:**

- [ ] Offline, navigasi penuh ke halaman yang belum pernah dibuka → `/~offline`, bukan halaman galat browser
- [ ] Offline → banner "Offline · menampilkan data tersimpan terakhir" tampil, online → hilang tanpa reload
- [ ] Offline di periode dashboard yang belum pernah dibuka → teks "Belum ada data tersimpan…" di bagian itu, bagian lain tetap tampil. 360 px tanpa horizontal scroll

**Verification:**

- [x] Tes matcher proxy (pakai yang ada dari T2, atau tambah `tests/unit/proxy.spec.ts`) mencakup `/sw.js` dan `/~offline` tidak dialihkan, `/dashboard` tetap dialihkan tanpa cookie
- [ ] `pnpm build` hijau. Manual 360×800 offline

**Dependencies:** T66

**Files likely touched:** `app/~offline/page.tsx`, `worker/sw.ts`, `serwist.config.mjs`, `hooks/use-online-status.ts`, `components/pwa/offline-banner.tsx`, `app/(app)/layout.tsx`, `components/settings/load-error.tsx`

**Estimated scope:** M

---

### T68: Toast "Versi baru tersedia"

**Description:** `components/pwa/update-toast.tsx` memakai `useSerwist()`: pada event `waiting` tampilkan toast persisten (sonner, `duration: Infinity`) "Versi baru tersedia" + "Muat ulang" → `messageSkipWaiting()`, lalu `location.reload()` pada `controlling`. Tidak ada reload tanpa tombol ditekan.

**Acceptance criteria:**

- [ ] Build kedua dengan perubahan kecil → toast muncul di tab yang terbuka, halaman tidak reload sendiri
- [ ] "Muat ulang" → versi baru aktif (DevTools: SW lama hilang), satu kali reload
- [ ] Tombol ≥ 44×44 px, toast tidak menutupi bottom nav (posisi top-center yang sudah ada)

**Verification:**

- [ ] `pnpm build` hijau. Manual: `pnpm build && pnpm start`, ubah teks, build ulang, kembali ke tab

**Dependencies:** T66

**Files likely touched:** `components/pwa/update-toast.tsx`, `app/providers.tsx`

**Estimated scope:** S

---

### T69: Hapus cache saat sign-out dan saat pemilik berganti

**Description:** `lib/offline/clear.ts`: `clearOfflineCaches()` menghapus `lontu-api`, `pages`, `pages-rsc`, `pages-rsc-prefetch` lewat `caches.delete` (tanpa galat jika `caches` tidak ada). `ensureCacheOwner(userId, store)`: simpan pemilik cache di IndexedDB (`idb-keyval`, store `lontu`), hapus cache jika berbeda. `sign-out.ts` memanggil `clearOfflineCaches()` sebelum `signOut`. Pemeriksaan pemilik dijalankan saat `useProfile` berhasil. Pasang `idb-keyval` di task ini.

**Acceptance criteria:**

- [ ] Sign-out → Cache Storage tidak berisi `lontu-api`/`pages*`, precache aset tetap ada
- [x] `ensureCacheOwner` dengan adapter `Map`: pemilik sama → tidak menghapus, berbeda atau kosong-lalu-diisi → menghapus sekali dan menyimpan pemilik baru
- [x] Browser tanpa `caches` (mis. `next dev` tanpa HTTPS) → sign-out tetap jalan

**Verification:**

- [x] `pnpm vitest run tests/unit/offline-clear.spec.ts` hijau
- [ ] Manual: sign-out lalu periksa DevTools > Cache Storage

**Dependencies:** T66

**Files likely touched:** `lib/offline/clear.ts`, `components/layout/sign-out.ts`, `app/providers.tsx`, `package.json`, `tests/unit/offline-clear.spec.ts`

**Estimated scope:** S

---

### Checkpoint R

- [ ] Gerbang penuh hijau + `pnpm build`
- [ ] Manual: alur di plan-19 (baca offline, `/~offline`, toast versi baru, sign-out)
- [ ] Review dengan Yogi sebelum phase 20
