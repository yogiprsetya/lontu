# Spec module: `pwa-offline`

Status: draft · 2026-10-25 · @Yogi
Bergantung pada: `transactions` (dan `accounts-categories`, `budgets`, `dashboard` sebagai data yang di-cache) · Dipakai oleh: — · Indeks: [SPEC.md](SPEC.md)

## Objective

Lontu yang terpasang di ponsel tetap berguna tanpa sinyal: dibuka dari layar utama dalam mode pesawat, pengguna melihat saldo, dashboard, daftar transaksi, dan budget **terakhir yang pernah dimuat**, lalu tetap bisa mencatat transaksi baru. Transaksi itu menunggu di perangkat dan terkirim sendiri begitu koneksi kembali, tanpa duplikat walau koneksi putus di tengah request. Pengguna juga diberi tahu saat aplikasi bisa dipasang dan saat versi baru tersedia.

Modul ini pemilik service worker, kebijakan cache, antrean transaksi offline (outbox), dan perluasan kontrak `POST /api/transactions` dengan `id` dari client (dijanjikan di [SPEC-transactions.md](SPEC-transactions.md) § Kontrak untuk modul lain).

Di luar cakupan: edit, hapus, urungkan, budget, akun, dan kategori saat offline (butuh koneksi, lihat keputusan #6). Background Sync API, push notification, sinkronisasi dua arah atau resolusi konflik, data offline untuk halaman atau periode yang belum pernah dibuka, ekspor CSV offline, login offline.

## Keputusan

Semua usulan untuk direview (lihat [Open questions](#open-questions)).

1. **Serwist mode configurator, bukan plugin webpack.** `next build` memakai Turbopack, dan `@serwist/next` versi plugin hanya jalan di webpack. Mode configurator (`@serwist/next/config` + `@serwist/cli`) membangun `public/sw.js` setelah `next build` dari `serwist.config.mjs`, jadi **`next.config.ts` tidak disentuh**. Script `build` menjadi `next build && serwist build`. Di `next dev` service worker tidak didaftarkan.
2. **Satu sumber data offline: cache service worker untuk `GET /api/*`.** SWR tidak diubah dan tidak dipersist ke IndexedDB. Saat offline, fetch SWR dijawab SW dari cache, jadi semua hook (`useAccounts`, `useDashboard`, `useTransactions`, …) otomatis menampilkan respons terakhir. Ini menggantikan "cache SWR di IndexedDB" di capability map (perlu persetujuan, Open question #1). Alasannya: satu lapis cache, tanpa gerbang hidrasi async sebelum render, dan cold start offline tetap jalan. Trade-off: saat online dengan jaringan lambat, data lama baru tampil setelah timeout jaringan (keputusan #3), bukan seketika.
3. **Strategi cache:**

   | Request | Strategi | Cache | Batas |
   |---|---|---|---|
   | `/_next/static/**`, ikon, `/~offline` | precache (versi build) | precache Serwist | — |
   | `GET /api/*` kecuali `/api/auth/*` dan `/api/transactions/export` | NetworkFirst, timeout 4 s, hanya status 200 | `lontu-api` | 200 entri, 30 hari sejak terakhir dipakai |
   | Navigasi HTML (halaman `(app)`) | NetworkFirst, timeout 4 s, hanya status 200 | `pages` | 32 entri, 30 hari |
   | RSC (`RSC: 1`) dan prefetch RSC | NetworkFirst (`defaultCache`) | `pages-rsc`, `pages-rsc-prefetch` | 32 entri, 30 hari |
   | `/login`, `/api/auth/*`, `/api/transactions/export`, semua non-GET | NetworkOnly | — | — |
   | Navigasi yang gagal dan tidak ada di cache | fallback `/~offline` | precache | — |

   Aturan `lontu-api` dan `pages` ditulis sendiri dan diletakkan **sebelum** `defaultCache` (bawaannya hanya 16 entri API, 1 hari). Redirect (`/dashboard` tanpa session → `/login`) dan 401 tidak pernah di-cache. `precachePrerendered: false`: shell prerender halaman `(app)` hanya berisi skeleton dari `<Suspense>` + `RequireSession`, dan menyajikannya dari precache akan menampilkan skeleton selamanya.
4. **`/~offline`** adalah halaman statis (tanpa session, tanpa data): "Kamu sedang offline. Halaman ini belum pernah dibuka di perangkat ini." + tautan ke Dashboard dan Tambah Expense. `proxy.ts` tidak mengalihkan `/~offline` dan `/sw.js`.
5. **Pembaruan SW dikendalikan pengguna.** `skipWaiting: false`, `clientsClaim: true`. Saat SW baru `waiting`, muncul toast persisten "Versi baru tersedia" dengan tombol "Muat ulang" → `messageSkipWaiting()`, lalu reload saat `controlling`. Tidak ada reload otomatis (bisa membuang isi form). `reloadOnOnline: false` di `SerwistProvider` dengan alasan yang sama.
6. **Hanya create transaksi yang masuk antrean.** Empat jenis (income, expense, saving, transfer termasuk biaya admin). Mutasi lain saat offline gagal seperti sekarang, dengan pesan seragam "Tidak ada koneksi. Perubahan ini butuh internet." (deteksi lewat `isNetworkError(err)`, bukan `ApiError`). Mengantre edit/hapus butuh urutan dan resolusi konflik terhadap data server, terlalu mahal untuk MVP (Open question #3).
7. **`POST /api/transactions` menjadi idempoten lewat `id` dari client.** Body menerima `id?: uuid` dan, untuk transfer, `fee.id?: uuid`. Client **selalu** mengirim `id` (`crypto.randomUUID()` sekali per submit), online maupun offline, supaya kasus "request sampai server tapi respons hilang" aman diulang. Detail di [Kontrak API](#kontrak-api). Tanpa `id` perilakunya tetap sama (kompatibel mundur).
8. **Kapan masuk antrean:** `navigator.onLine === false` sebelum mengirim, `fetch` menolak (galat jaringan), atau tidak ada respons dalam 10 s (`AbortSignal.timeout`). Respons HTTP apa pun, termasuk 5xx, **tidak** diantrekan dan tampil sebagai galat seperti sekarang. Validasi Zod di client tetap jalan sebelum mengantre, jadi yang masuk antrean sudah lolos schema.
9. **Outbox di IndexedDB lewat `idb-keyval`**, store `lontu` / `outbox`, kunci = `id` transaksi. Isi: `{ id, userId, body, createdAt, status: "pending" | "failed", attempts, error? }`. Modul `lib/offline/outbox.ts` menerima adapter penyimpanan (default `idb-keyval`), jadi bisa dites dengan `Map` tanpa IndexedDB palsu. State outbox dibaca komponen lewat `useSyncExternalStore`, **bukan** Zustand (bukan state UI) dan bukan cache SWR.
10. **Pengiriman ulang (replay) dijalankan dari halaman**, bukan Background Sync (tidak ada di Safari iOS). Pemicu: aplikasi dibuka, event `online`, tab kembali `visible`, interval 30 s selama online dan outbox berisi `pending`, dan tombol "Kirim sekarang". Satu putaran berjalan di bawah Web Lock `lontu-outbox` (`ifAvailable`), jadi dua tab tidak mengirim bersamaan (kalaupun terjadi, keputusan #7 mencegah duplikat). Urutan FIFO `createdAt`, satu per satu. Hasil per item:

    | Respons | Tindakan |
    |---|---|
    | 201 / 200 | hapus dari outbox |
    | 400, 409 | `status = "failed"`, simpan `error` (pesan + `fields`), lanjut ke item berikutnya |
    | 401 | hentikan putaran, item tetap `pending`, banner "Masuk lagi untuk mengirim transaksi tertunda" |
    | galat jaringan, timeout, 5xx | hentikan putaran, `attempts + 1`, coba lagi di pemicu berikutnya |

    Setelah putaran yang mengirim minimal satu item: satu kali `invalidate("transactions")` (saldo, budget, dan dashboard ikut lewat `AFFECTS`).
11. **Transaksi tertunda tidak dimasukkan ke cache SWR.** Tidak ada baris palsu di daftar ber-cursor, saldo, total, budget, atau dashboard. Sebagai gantinya: bagian "Menunggu dikirim (N)" di atas daftar `/transactions` dan `/expenses` (semua item outbox user ini, tanpa mengikuti filter), dan catatan di dashboard "N transaksi belum terkirim, belum masuk saldo dan ringkasan". Ini bentuk "optimistic create" yang dijanjikan keputusan #7 transactions (Open question #6). Baris tertunda memakai nama akun/kategori dari cache, badge "Tertunda" atau "Gagal: {pesan}", dan aksi "Buang" (dengan konfirmasi). Baris gagal juga punya "Coba lagi" (mis. setelah akun yang diarsipkan dipulihkan). Baris tertunda tidak bisa diedit.
12. **Indikator offline:** banner tipis di shell, "Offline · menampilkan data tersimpan terakhir", plus jumlah tertunda bila ada. Sumbernya `useOnlineStatus()` (`navigator.onLine` + event `online`/`offline`). `experimental.useOffline` Next.js tidak diaktifkan karena butuh perubahan `next.config.ts` dan masih eksperimental (Open question #5). State error SWR saat offline tanpa cache menampilkan "Belum ada data tersimpan untuk tampilan ini" menggantikan pesan galat umum.
13. **Banner pasang:** hanya di `/dashboard`, hanya saat tidak `display-mode: standalone`.
    - Chromium: simpan event `beforeinstallprompt`, tampilkan kartu "Pasang Lontu di layar utama" dengan "Pasang" (memanggil `prompt()`) dan "Nanti".
    - Safari iOS (tanpa event): kartu yang sama dengan instruksi "Ketuk Bagikan lalu Tambahkan ke Layar Utama".
    - "Nanti" menyembunyikan kartu 30 hari. Waktu tutup disimpan di `useUIStore` (persist, `installDismissedAt`), karena itu state UI. Kelayakan dihitung fungsi murni `installPromptState(...)`.
14. **Pemisahan data antar user di satu perangkat.** Item outbox membawa `userId` dan hanya dikirim jika sama dengan `useProfile().data.id`. Saat sign-out: jika ada item milik user ini, konfirmasi "N transaksi belum terkirim akan dibuang. Tetap keluar?", lalu hapus item itu, hapus cache `lontu-api`, `pages`, `pages-rsc`, `pages-rsc-prefetch` (`caches.delete` dari window), baru `signOut`. Saat aplikasi dibuka online dan `useProfile` mengembalikan id yang berbeda dari pemilik cache terakhir (`cacheOwner` di store IDB yang sama), cache yang sama dihapus dulu.

Tidak ada perubahan skema DB dan tidak ada migrasi: `transactions.id` sudah UUID primary key dengan default, dan insert dengan id eksplisit memakai kolom yang sama.

## Kontrak API

Perubahan pada `POST /api/transactions` ([SPEC-transactions.md](SPEC-transactions.md) § Route). Route lain tidak berubah.

### Body

| `type` | Field tambahan (opsional) |
|---|---|
| `income`, `expense`, `saving` | `id: uuid` |
| `transfer` | `id: uuid`, `fee.id: uuid` |

```ts
// lib/schemas/transaction.ts
const clientId = z.uuid("Id transaksi tidak valid").optional();

const fee = z.strictObject({ id: clientId, amount, categoryId }, "Biaya admin tidak valid");
const base = { id: clientId, amount, date, accountId: z.uuid("Pilih akun"), description };
// transfer: refine tambahan, fee.id ≠ id (path ["fee"])
```

`PATCH` tetap menolak `id` (field tak dikenal → 400).

### Perilaku

Urutan di server: parse Zod → **cek replay** → cek referensi → insert.

| Kondisi | Respons |
|---|---|
| Tanpa `id` | seperti sekarang: 201 `TransactionCreated` |
| `id` baru | insert dengan `id` (dan `fee.id` bila ada) → 201 `TransactionCreated` |
| `id` sudah ada milik user ini (termasuk yang sudah di-soft-delete) | **200** `TransactionCreated` dari baris tersimpan, tanpa insert dan tanpa cek referensi. `fee` = baris `fee.id` jika dikirim dan milik user ini, selain itu `null`. Body pada replay diabaikan (tulisan pertama menang) |
| `id` atau `fee.id` sudah dipakai baris user lain | 409 `TRANSACTION_ID_TAKEN`, tanpa isi baris itu |
| `fee.id` sama dengan `id` | 400 `VALIDATION_ERROR` (`fields.fee`) |

- Cek replay sebelum cek referensi, karena akun atau kategori bisa sudah diarsipkan setelah tulisan pertama berhasil, dan replay tetap harus sukses.
- Balapan dua request dengan `id` sama: insert kedua kena konflik primary key (`onConflictDoNothing`), lalu server membaca ulang dan menjawab seperti baris replay (200) atau 409 jika milik user lain. Transfer + fee tetap dalam satu `db.transaction`.
- Pesan 409 tidak membedakan "id dipakai user lain" dari kasus lain, supaya tidak membocorkan keberadaan data user lain. Dengan UUID v4 acak, ini praktis hanya terjadi pada klien yang curang.
- `lib/api/errors.ts`: `transactionIdTaken()`.

### Kontrak untuk modul lain

- `createTransaction(input)` di `hooks/use-transactions.ts` mengembalikan `{ status: "sent"; created: TransactionCreated } | { status: "queued"; id: string }`. Form menampilkan toast berbeda: "Tersimpan" vs "Disimpan di perangkat, dikirim saat online", lalu navigasi ke `/transactions` di kedua kasus.
- Nama cache (`lontu-api`, `pages`, `pages-rsc`, `pages-rsc-prefetch`) diekspor dari `lib/offline/cache-names.ts`, dipakai SW dan pembersih sign-out.

## Deliverables

### 1. Build dan service worker

- Dependency (Open question #2): `@serwist/next`, `serwist`, `idb-keyval`, dev `@serwist/cli`.
- `serwist.config.mjs`: `serwist({ swSrc: "worker/sw.ts", swDest: "public/sw.js", precachePrerendered: false, additionalPrecacheEntries: [{ url: "/~offline", revision }] })`, `revision` dari commit hash (`VERCEL_GIT_COMMIT_SHA`, fallback `crypto.randomUUID()`).
- `worker/sw.ts`: `new Serwist({ precacheEntries: self.__SW_MANIFEST, skipWaiting: false, clientsClaim: true, navigationPreload: true, runtimeCaching: [...lontuCaching, ...defaultCache], fallbacks: { entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }] } })`. Diawali `/// <reference lib="webworker" />`. Di luar `app/` supaya tidak bercampur dengan route.
- `package.json`: `"build": "next build && serwist build"`. `.gitignore`: `public/sw.js`, `public/sw.js.map`.
- `proxy.ts`: matcher melewati `sw\.js` dan `~offline`.
- `app/~offline/page.tsx`: statis, tanpa `RequireSession`, di luar grup `(app)`.

### 2. Server

- `lib/schemas/transaction.ts`: `id` dan `fee.id` (lihat Kontrak).
- `lib/server/transactions.ts`: `findReplay(userId, id, feeId?)`, insert dengan id eksplisit, penanganan konflik. `createTransaction` mengembalikan `{ created, replayed: boolean }` atau `{ invalid }` / `{ idTaken: true }`.
- `app/api/transactions/route.ts`: 200 untuk replay, 409 untuk `idTaken`.

### 3. Client

- `lib/offline/network-error.ts` (murni): `isNetworkError(err)` (TypeError dari fetch, `AbortError`/`TimeoutError`).
- `lib/offline/outbox.ts`: `enqueue`, `list(userId)`, `markFailed`, `remove`, `retry(id)` (kembali ke `pending`), `subscribe`, adapter penyimpanan yang bisa diganti.
- `lib/offline/replay.ts`: `replayOutbox({ outbox, send, userId })` mengembalikan `{ sent, failed, stopped: "auth" | "network" | null }`. `send` diinjeksi supaya bisa dites tanpa jaringan. Pemicu dan Web Lock di `hooks/use-outbox-replay.ts`.
- `lib/offline/clear.ts`: `clearOfflineData(userId)` (cache SW + item outbox user itu), `ensureCacheOwner(userId)`.
- `lib/offline/install.ts` (murni): `installPromptState({ standalone, isIOSSafari, hasPromptEvent, dismissedAt, now })` → `"hidden" | "prompt" | "ios-instructions"`.
- `hooks/use-online-status.ts`, `hooks/use-outbox.ts` (`useSyncExternalStore`), `hooks/use-install-prompt.ts`.
- `hooks/use-transactions.ts`: `createTransaction` membuat `id`, mengirim dengan timeout 10 s, mengantre sesuai keputusan #8.
- `components/layout/sign-out.ts`: konfirmasi + `clearOfflineData` sebelum `signOut`.
- `stores/ui.ts`: `installDismissedAt` (ikut `partialize`).

### 4. UI

- `app/providers.tsx`: `SerwistProvider` dari `@serwist/next/react` (`swUrl="/sw.js"`, `disable` di development, `reloadOnOnline={false}`, `cacheOnNavigation`), pemasang replay, toast pembaruan.
- `components/pwa/`:
  - `update-toast.tsx` (keputusan #5).
  - `offline-banner.tsx` di `app/(app)/layout.tsx`, di atas konten, tidak menutupi bottom nav, `role="status"`.
  - `install-card.tsx` di dashboard (keputusan #13).
  - `pending-transactions.tsx` dipakai `TransactionList` (keputusan #11). Daftar teks biasa dengan `aria-live="polite"` untuk perubahan jumlah.
  - `pending-notice.tsx` di dashboard.
- Form `transaction-form.tsx` dan `transfer-form.tsx`: tangani `status: "queued"`. Peringatan saldo tetap memakai saldo dari cache (bisa basi saat offline, diterima).
- Mobile: semua tombol baru ≥ 44×44 px, banner tidak membuat horizontal scroll di 360 px, kontras ≥ 4.5:1, status tidak hanya lewat warna (badge berteks).

## Acceptance criteria

**API**

- [ ] `POST` expense dengan `id` baru → 201, `transaction.id` sama dengan `id` yang dikirim.
- [ ] Mengirim body yang sama dua kali → 201 lalu 200 dengan baris yang sama. Jumlah baris user tidak bertambah dan saldo akun hanya berkurang sekali.
- [ ] Transfer dengan `id` + `fee.id`, diulang → 200 dengan `transaction` dan `fee` yang sama, tidak ada transfer atau biaya admin ganda.
- [ ] Replay setelah akun sumber diarsipkan → 200 (baris lama), bukan 400.
- [ ] Replay `id` yang sudah di-soft-delete → 200, baris tetap terhapus (tidak dihidupkan lagi).
- [ ] Dua `POST` paralel dengan `id` sama → satu 201, satu 200, tepat satu baris.
- [ ] **Isolasi:** user B mengirim `id` milik transaksi A → 409 `TRANSACTION_ID_TAKEN`, respons tidak memuat data A, baris A tidak berubah. Sama untuk `fee.id`.
- [ ] `fee.id === id` → 400 `fields.fee`. `id` bukan UUID → 400 `fields.id`. `PATCH` dengan `id` → 400.
- [ ] Tanpa `id`: semua tes `tests/api/transactions*.spec.ts` yang ada tetap hijau tanpa diubah.

**Unit**

- [ ] `isNetworkError`: `TypeError("Failed to fetch")`, `AbortError`, `TimeoutError` → true. `ApiError` 500 → false.
- [ ] `replayOutbox` dengan `send` palsu: FIFO; 201/200 menghapus; 400 menandai `failed` lalu lanjut; 401 berhenti dengan `stopped: "auth"` dan sisa tetap `pending`; galat jaringan berhenti dengan `attempts + 1`; item user lain tidak dikirim.
- [ ] `outbox` dengan adapter `Map`: `enqueue` dengan `id` yang sama tidak menggandakan, `retry` mengembalikan `failed` ke `pending`, `subscribe` dipanggil setiap perubahan.
- [ ] `createTransaction`: offline (`navigator.onLine = false`) → `queued` tanpa fetch; fetch menolak → `queued` dengan `id` yang sama dengan yang dikirim; 400 → melempar `ApiError` dan tidak mengantre; 500 → melempar, tidak mengantre.
- [ ] `installPromptState`: standalone → hidden; event ada → prompt; iOS Safari tanpa event → ios-instructions; ditutup 29 hari lalu → hidden, 31 hari lalu → tampil.
- [ ] Schema: `id`/`fee.id` opsional, UUID, `fee.id ≠ id`.

**Manual (`pnpm build && pnpm start`, Chrome DevTools dan ponsel Android + iPhone)**

- [ ] `/sw.js` 200 tanpa login. DevTools > Application: SW aktif, precache berisi `/~offline` dan aset `_next/static`.
- [ ] Buka dashboard, transaksi, dan budget online, lalu mode pesawat dan buka ulang aplikasi terpasang dari layar utama: ketiganya menampilkan data terakhir, banner offline tampil.
- [ ] Offline: halaman atau periode yang belum pernah dibuka → `/~offline` (navigasi penuh) atau "Belum ada data tersimpan" (data SWR), bukan layar kosong atau error umum.
- [ ] Offline: catat expense dan transfer dengan biaya admin → toast "Disimpan di perangkat…", muncul di "Menunggu dikirim (2)", dashboard menampilkan catatan tertunda.
- [ ] Online kembali → dalam ≤ 5 s kedua item hilang dari bagian tertunda, muncul di daftar, saldo dan dashboard berubah, tanpa reload dan tanpa duplikat.
- [ ] Throttle "Offline" tepat setelah tombol Simpan ditekan (request terkirim, respons hilang) → setelah online, tetap satu baris.
- [ ] Item yang akunnya diarsipkan sebelum terkirim → "Gagal: …", "Coba lagi" setelah akun dipulihkan berhasil, "Buang" menghapusnya.
- [ ] Dua tab terbuka saat online kembali → tidak ada duplikat.
- [ ] Deploy versi baru → toast "Versi baru tersedia", "Muat ulang" memuat versi baru. Tanpa menekan tombol, form yang sedang diisi tidak hilang.
- [ ] Android Chrome: kartu "Pasang Lontu" → dialog pasang bawaan. iPhone Safari: kartu instruksi. "Nanti" menyembunyikan kartu setelah reload. Di aplikasi terpasang kartu tidak tampil.
- [ ] Sign-out dengan item tertunda → konfirmasi muncul. Setelah keluar: Cache Storage `lontu-api`/`pages*` kosong, outbox tidak berisi item user itu.
- [ ] `Page.getInstallabilityErrors` kosong (Lighthouse 12 tidak punya kategori PWA, sama dengan T8).
- [ ] Banner dan kartu benar di 360 px tanpa horizontal scroll, target sentuh ≥ 44 px. Kode PWA di bundle client < 10 KB gzip (dari output `pnpm build`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Tes

- **Unit (`tests/unit/`):** `network-error.spec.ts`, `outbox.spec.ts`, `replay.spec.ts`, kasus offline di `use-transactions.spec.ts` (fetch dan `navigator.onLine` di-stub), `install-prompt.spec.ts`, tambahan kasus di `transaction-schema.spec.ts`.
- **API (`tests/api/`, Supabase sungguhan, user `test-<uuid>`):** `transactions-idempotency.spec.ts`: semua kasus API di atas, termasuk dua `POST` paralel (`Promise.all`) dan isolasi A/B.
- **Service worker:** tidak dites otomatis. Kebijakan cache dicek manual di checklist di atas. E2E Playwright dengan `context.setOffline(true)` ditunda bersama E2E lainnya (SPEC.md Open question #2).
- Satu berkas: `pnpm vitest run tests/api/transactions-idempotency.spec.ts`.

## Struktur file

```
serwist.config.mjs
worker/sw.ts
public/sw.js                              # hasil build, di .gitignore
app/~offline/page.tsx
app/providers.tsx                         # SerwistProvider, replay, toast pembaruan
app/(app)/layout.tsx                      # OfflineBanner
app/api/transactions/route.ts             # 200 replay, 409
components/pwa/                           # update-toast, offline-banner, install-card, pending-transactions, pending-notice
components/forms/transaction-form.tsx, transfer-form.tsx
components/transactions/transaction-list.tsx
components/dashboard/dashboard-view.tsx
components/layout/sign-out.ts
hooks/use-online-status.ts, use-outbox.ts, use-outbox-replay.ts, use-install-prompt.ts
hooks/use-transactions.ts
lib/offline/                              # cache-names, network-error, outbox, replay, clear, install
lib/schemas/transaction.ts, lib/server/transactions.ts, lib/api/errors.ts
stores/ui.ts
proxy.ts
tests/unit/*.spec.ts, tests/api/transactions-idempotency.spec.ts
```

Perintah, gaya kode, dan format error mengikuti [SPEC.md](SPEC.md).

## Boundaries (khusus modul ini)

- **Always:** cache hanya respons 200 dari `GET`, hapus cache dan outbox user saat sign-out, kirim `id` di setiap create, uji perilaku offline dengan `pnpm build && pnpm start` (bukan `next dev`), tampilkan status tertunda/gagal dengan teks.
- **Ask first:** mengubah `next.config.ts` (termasuk `experimental.useOffline`), dependency selain empat di Deliverables, mengantre mutasi selain create transaksi, memasukkan transaksi tertunda ke saldo/total, Background Sync atau push, meng-cache `/api/auth/*` atau ekspor CSV.
- **Never:** reload otomatis saat SW baru aktif, `skipWaiting: true`, menyalin data server atau outbox ke Zustand, menyimpan token/secret di IndexedDB atau Cache Storage, mengirim item outbox milik user lain, membuat transaksi ganda saat replay.

## Risiko

- **Data keuangan tersimpan di perangkat.** Cache API berisi saldo dan transaksi, tetap terbaca offline tanpa session sampai sign-out. Diterima untuk ponsel pribadi. Mitigasi: dihapus saat sign-out dan saat pemilik berganti (keputusan #14), umur maksimal 30 hari.
- **Serwist + Turbopack + `cacheComponents`.** Mode configurator relatif baru dan respons halaman dinamis (stream dengan `<Suspense>`) di-cache utuh. Mitigasi: task pertama adalah spike `pnpm build && pnpm start` yang membuktikan cold start offline `/dashboard` sebelum menulis outbox. Jika gagal, alternatifnya `@serwist/turbopack` (butuh `withSerwist` di `next.config.ts`, Ask first).
- **Tipe webworker vs DOM.** `worker/sw.ts` di bawah `tsconfig` root bisa bentrok dengan lib DOM. Mitigasi: `/// <reference lib="webworker" />` + `declare const self: ServiceWorkerGlobalScope`; jika `pnpm typecheck` tetap gagal, `worker/` dikeluarkan dari tsconfig root dan diberi `worker/tsconfig.json` sendiri.
- **Data basi terlihat seperti data segar.** Saat offline, angka dashboard bisa berumur berhari-hari. Mitigasi: banner offline selalu tampil. Waktu "terakhir diperbarui" tidak ditampilkan di MVP.
- **Replay setelah aturan berubah.** Transaksi yang diantrekan tanggal 31 dengan `date` hari itu tetap valid karena `date ≤ hari ini` di server. Akun/kategori yang diarsipkan sebelum terkirim menjadi item gagal, bukan hilang diam-diam.
- **iOS menghapus storage aplikasi yang lama tidak dibuka** (~7 hari untuk situs, lebih longgar untuk PWA terpasang). Item tertunda bisa hilang. Mitigasi: replay berjalan setiap aplikasi dibuka online. `navigator.storage.persist()` dipanggil sekali setelah item pertama diantrekan.
- **Bundle:** `@serwist/next/react` + outbox menambah JS di semua halaman. Target < 10 KB gzip. `/dashboard` sudah di atas 200 KB (plan.md § Catatan ukuran), jadi tambahan ini tidak boleh dibebankan ke chunk grafik.

## Open questions

1. **Cache SW saja, tanpa persist SWR ke IndexedDB** (keputusan #2): setuju? Ini mengubah teks capability map di SPEC.md ("cache SWR di IndexedDB" → "cache API di service worker").
2. **Dependency:** SPEC.md mencantumkan `@serwist/next` dan `idb-keyval`. Mode configurator butuh tambahan `serwist` (kelas worker) dan `@serwist/cli` (dev), plus script `build` berubah. Setuju?
3. **Hanya create yang diantrekan** (keputusan #6): cukup untuk MVP, atau hapus transaksi offline juga perlu?
4. **Item gagal:** cukup "Coba lagi" dan "Buang", atau perlu "Buka di form" (form tambah terisi dari body item) supaya bisa diperbaiki?
5. **`experimental.useOffline`** Next.js (retry navigasi RSC otomatis + hook `useOffline`) tidak dipakai di MVP. Setuju, atau dicoba di spike?
6. **Transaksi tertunda tidak mengubah saldo/total** (keputusan #11): setuju, atau saldo akun perlu menampilkan "Rp… (termasuk tertunda)"?
