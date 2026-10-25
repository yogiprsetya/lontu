# Todo phase 20: Antrean transaksi offline

Plan: [plan-20.md](plan-20.md) · Index: [plan.md](plan.md) · Spec: [SPEC-pwa-offline.md](../SPEC-pwa-offline.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T70: `POST /api/transactions` idempoten dengan `id` dari client

**Description:** Tes Supabase ditulis lebih dulu. `lib/schemas/transaction.ts`: `id?` dan `fee.id?` (`z.uuid`), refine `fee.id ≠ id` (path `fee`). `PATCH` tetap menolak `id`. `lib/server/transactions.ts`: `findReplay(userId, id, feeId?)` (termasuk baris terhapus) dijalankan sebelum cek referensi, insert dengan id eksplisit, konflik primary key → baca ulang (milik user ini → replay, selain itu `idTaken`). `createTransaction` mengembalikan `{ created, replayed }`, `{ invalid }`, atau `{ idTaken: true }`. Route: replay → 200, `idTaken` → 409 `transactionIdTaken()` di `lib/api/errors.ts`.

**Acceptance criteria:**

- [ ] `id` baru → 201 dengan id itu. Body sama dua kali → 201 lalu 200, satu baris, saldo berkurang sekali. Transfer + `fee.id` diulang → 200 dengan `transaction` dan `fee` yang sama, tanpa baris ganda
- [ ] Replay setelah akun diarsipkan → 200. Replay baris yang sudah di-soft-delete → 200, baris tetap terhapus. Dua `POST` paralel (`Promise.all`) dengan id sama → satu 201 + satu 200, tepat satu baris
- [ ] User B memakai `id` atau `fee.id` milik A → 409 `TRANSACTION_ID_TAKEN` tanpa data A, baris A tidak berubah. `fee.id === id` → 400 `fields.fee`, `id` bukan UUID → 400 `fields.id`, `PATCH` dengan `id` → 400. Tes transaksi lama hijau tanpa diubah

**Verification:**

- [ ] `pnpm vitest run tests/api/transactions-idempotency.spec.ts tests/unit/transaction-schema.spec.ts tests/api/transactions.spec.ts` hijau

**Dependencies:** None

**Files likely touched:** `lib/schemas/transaction.ts`, `lib/server/transactions.ts`, `app/api/transactions/route.ts`, `lib/api/errors.ts`, `tests/api/transactions-idempotency.spec.ts`, `tests/unit/transaction-schema.spec.ts`

**Estimated scope:** M

---

### T71: Outbox dan `replayOutbox` murni

**Description:** Tes ditulis lebih dulu. `lib/offline/network-error.ts`: `isNetworkError(err)`. `lib/offline/outbox.ts`: `createOutbox(store)` dengan `enqueue`, `list(userId)`, `markFailed`, `remove`, `retry`, `bump` (attempts + 1), `subscribe`. Adapter default `idb-keyval` (store `lontu`, prefix kunci `outbox:`), tes memakai adapter `Map`. `lib/offline/replay.ts`: `replayOutbox({ outbox, send, userId })` sesuai tabel keputusan #10, mengembalikan `{ sent, failed, stopped }`.

**Acceptance criteria:**

- [ ] `isNetworkError`: `TypeError("Failed to fetch")`, `AbortError`, `TimeoutError` → true. `ApiError` 400/500 → false
- [ ] Outbox: `enqueue` id sama tidak menggandakan, `list` hanya item user itu urut `createdAt`, `retry` mengubah `failed` → `pending`, `subscribe` terpanggil di setiap perubahan
- [ ] Replay dengan `send` palsu: FIFO; 201/200 menghapus; 400/409 → `failed` dengan pesan + `fields` lalu lanjut; 401 → `stopped: "auth"`, sisa tetap `pending`; galat jaringan/5xx → `stopped: "network"`, `attempts + 1`; item `failed` dan item user lain tidak dikirim

**Verification:**

- [ ] `pnpm vitest run tests/unit/network-error.spec.ts tests/unit/outbox.spec.ts tests/unit/replay.spec.ts` hijau

**Dependencies:** T69 (`idb-keyval` terpasang)

**Files likely touched:** `lib/offline/network-error.ts`, `lib/offline/outbox.ts`, `lib/offline/replay.ts`, `tests/unit/network-error.spec.ts`, `tests/unit/outbox.spec.ts`, `tests/unit/replay.spec.ts`

**Estimated scope:** M

---

### T72: Create mengantre saat offline + replay otomatis

**Description:** `hooks/use-transactions.ts`: `createTransaction` membuat `id` (`crypto.randomUUID()`), mengirim dengan `AbortSignal.timeout(10_000)`, dan mengembalikan `{ status: "sent", created }` atau `{ status: "queued", id }` sesuai keputusan #8 (butuh `userId` dari `useProfile`, diteruskan form). Form `transaction-form.tsx` dan `transfer-form.tsx`: toast "Disimpan di perangkat, dikirim saat online" untuk `queued`, navigasi sama. `hooks/use-outbox-replay.ts` dipasang di `app/providers.tsx`: pemicu (mount, `online`, `visibilitychange`, interval 30 s selama ada `pending`), `navigator.locks.request("lontu-outbox", { ifAvailable: true })`, satu `invalidate("transactions")` setelah putaran yang mengirim. `navigator.storage.persist()` sekali setelah enqueue pertama. Mutasi lain yang gagal karena jaringan → toast "Tidak ada koneksi. Perubahan ini butuh internet."

**Acceptance criteria:**

- [ ] Unit (fetch dan `navigator.onLine` di-stub): offline → `queued` tanpa fetch; fetch menolak → `queued` dengan `id` sama dengan yang dikirim; 400 → `ApiError`, tidak mengantre; 500 → melempar, tidak mengantre; online sukses → body memuat `id`
- [ ] Manual: offline catat expense → toast `queued`, navigasi ke `/transactions`. Online → dalam ≤ 5 s terkirim, daftar, saldo, budget, dan dashboard berubah tanpa reload
- [ ] Manual: throttle Offline tepat setelah Simpan dan dua tab terbuka saat online kembali → tetap satu baris

**Verification:**

- [ ] `pnpm vitest run tests/unit/use-transactions.spec.ts` hijau
- [ ] `pnpm build` hijau. Manual dengan `pnpm start` dan DevTools

**Dependencies:** T70, T71

**Files likely touched:** `hooks/use-transactions.ts`, `hooks/use-outbox-replay.ts`, `components/forms/transaction-form.tsx`, `components/forms/transfer-form.tsx`, `app/providers.tsx`, `tests/unit/use-transactions.spec.ts`

**Estimated scope:** M

---

### T73: Bagian "Menunggu dikirim" dan catatan di dashboard

**Description:** `hooks/use-outbox.ts` (`useSyncExternalStore` atas `outbox.subscribe`, item user yang login). `components/pwa/pending-transactions.tsx` di atas `TransactionList` (`/transactions` dan `/expenses`, tanpa mengikuti filter): judul "Menunggu dikirim (N)", baris dengan nama akun/kategori dari cache, nominal, badge "Tertunda" / "Gagal: {pesan}", aksi "Buang" (konfirmasi) dan, untuk gagal, "Coba lagi" (`retry` + memicu replay), tombol "Kirim sekarang" saat online. `components/pwa/pending-notice.tsx` di dashboard. Banner offline menampilkan jumlah tertunda.

**Acceptance criteria:**

- [ ] Dua item tertunda (expense + transfer dengan biaya) tampil dengan judul baris sama seperti daftar biasa ("A → B" untuk transfer). Dashboard menampilkan "2 transaksi belum terkirim, belum masuk saldo dan ringkasan"
- [ ] Item gagal (akun diarsipkan sebelum terkirim) menampilkan pesan server. "Coba lagi" setelah akun dipulihkan → terkirim. "Buang" → hilang setelah konfirmasi
- [ ] Status terbaca tanpa warna (badge berteks), `aria-live="polite"` untuk jumlah, target sentuh ≥ 44 px, 360 px tanpa horizontal scroll, `hideAmounts` dipatuhi

**Verification:**

- [ ] `pnpm build` hijau. Manual 360×800 dan 1024, light dan dark

**Dependencies:** T72

**Files likely touched:** `hooks/use-outbox.ts`, `components/pwa/pending-transactions.tsx`, `components/pwa/pending-notice.tsx`, `components/transactions/transaction-list.tsx`, `components/dashboard/dashboard-view.tsx`

**Estimated scope:** M

---

### T74: Sign-out dengan item tertunda

**Description:** `lib/offline/clear.ts`: `clearOfflineData(userId)` = `clearOfflineCaches()` + hapus item outbox user itu. `sign-out.ts`: jika ada item user ini, konfirmasi "N transaksi belum terkirim akan dibuang. Tetap keluar?" (dialog `ResponsiveModal`/alert yang sudah ada), batal → tetap login. Item user lain tidak disentuh.

**Acceptance criteria:**

- [ ] Unit (adapter `Map`): `clearOfflineData("a")` menghapus item `a`, item `b` tetap
- [ ] Manual: sign-out dengan 1 item tertunda → konfirmasi. Batal → item tetap, masih login. Lanjut → outbox kosong untuk user itu, cache kosong
- [ ] Sign-out tanpa item tertunda → tanpa konfirmasi (perilaku lama)

**Verification:**

- [ ] `pnpm vitest run tests/unit/offline-clear.spec.ts` hijau. Manual DevTools > IndexedDB dan Cache Storage

**Dependencies:** T73

**Files likely touched:** `lib/offline/clear.ts`, `components/layout/sign-out.ts`, komponen pemanggil sign-out di `components/settings/`, `tests/unit/offline-clear.spec.ts`

**Estimated scope:** S

---

### Checkpoint S

- [ ] Gerbang penuh hijau + `pnpm build`
- [ ] Manual: alur di plan-20 (offline → tertunda → online → terkirim, tanpa duplikat, item gagal, sign-out)
- [ ] Review dengan Yogi sebelum phase 21
