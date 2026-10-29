# Todo phase 28: Pengiriman transaksi

Plan: [plan-28.md](plan-28.md) · Index: [plan.md](plan.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task yang menyentuh komponen juga `pnpm build` dan cek manual di 360×800 dan 1024. Perilaku offline diuji dengan `pnpm build && pnpm start`.

---

### T101: Satu jalur kirim dan satu parser error

**Description:** Perbarui `SPEC-pwa-offline.md` § Deliverables dulu (`send` melempar `ApiError`, lokasi `lib/offline/submission.ts`). Buat `sendCreate(body)` di `lib/offline/submission.ts`: `sendJSON` ke `/api/transactions` dengan `AbortSignal.timeout(SEND_TIMEOUT_MS)`. `createTransaction` (`hooks/use-transactions.ts:35-63`) dan `use-outbox-replay.ts` (menggantikan `send` di :18-25) memakainya. `replayOutbox` menerima `send` yang melempar, mengklasifikasi dari `ApiError.status` atau error jaringan, dan `errorOf` (`replay.ts:9-14`) diganti `outboxErrorFrom(ApiError)`. Tes merah dulu per baris tabel status.

**Acceptance criteria:**

- [x] Hanya satu `AbortSignal.timeout` untuk create dan hanya satu parser body error (`lib/fetcher.ts`)
- [x] `replay.spec.ts`: semua assertion lama tetap, hanya stub `send` berubah dari mengembalikan `Response` menjadi melempar `ApiError`/`TypeError`
- [x] Kasus baru: 200/201 hapus, 401 berhenti `auth`, 400 dengan `fields` → `failed` dengan pesan field pertama, 409 `TRANSACTION_ID_TAKEN` → `failed`, 500 dan timeout → `bump` + berhenti `network`

**Verification:**

- [x] `pnpm vitest run tests/unit/replay.spec.ts tests/unit/use-transactions.spec.ts tests/unit/fetcher.spec.ts tests/unit/submission.spec.ts` hijau
- [x] `pnpm vitest run tests/api/transactions-idempotency.spec.ts` hijau tanpa diedit

**Catatan (2026-10-29):** Status di luar 4xx (mis. 302) tetap dianggap galat jaringan seperti sebelumnya. `createTransaction` masih di `hooks/use-transactions.ts` dan memakai `sendCreate`; pemindahannya ke `lib/offline/submission.ts` di T103. Tes baru: 500, timeout (`TimeoutError`), dan status non-4xx di `replay.spec.ts`; `submission.spec.ts` untuk `sendCreate`.

**Dependencies:** Checkpoint Z

**Files likely touched:** `lib/offline/submission.ts`, `lib/offline/replay.ts`, `hooks/use-outbox-replay.ts`, `hooks/use-transactions.ts`, `tests/unit/replay.spec.ts`, `tests/unit/submission.spec.ts`, `SPEC-pwa-offline.md`

**Estimated scope:** M

---

### T102: `startReplay` yang bisa dites

**Description:** Pindahkan isi `useEffect` di `hooks/use-outbox-replay.ts:35-70` ke `startReplay({ userId, outbox, send, target, isOnline, lock, onSent, onAuthLost })` di `lib/offline/replay.ts`, yang mengembalikan fungsi stop. Ia memegang pemicu (`online`, `lontu:replay`, `visibilitychange`), interval 30 s, Web Lock, dan pemanggilan `invalidate("transactions")` lewat `onSent`. `requestReplay` pindah ke modul yang sama. Hook tinggal `useEffect(() => startReplay({ …, onAuthLost: showSignInToast }), [userId])`. Tes dengan `vi.useFakeTimers()`, `EventTarget` sebagai `target`, outbox `Map`.

**Acceptance criteria:**

- [ ] Tes: satu pass saat mulai; pass lagi pada `online`, `requestReplay`, `visible`, dan setiap 30 s; tidak ada pass saat offline; stop melepas semua listener dan interval; `onSent` dipanggil hanya bila `sent > 0`; `onAuthLost` saat `stopped: "auth"`; dua pass bersamaan dengan lock hanya mengirim sekali
- [ ] `hooks/use-outbox-replay.ts` ≤ 25 baris dan tidak memuat `addEventListener` atau `setInterval`

**Verification:**

- [ ] `pnpm vitest run tests/unit/replay.spec.ts` hijau
- [ ] Manual (`pnpm build && pnpm start`): mode pesawat → catat → online → terkirim tanpa reload; tab kembali aktif memicu kirim

**Dependencies:** T101

**Files likely touched:** `lib/offline/replay.ts`, `hooks/use-outbox-replay.ts`, `components/pwa/outbox-replay.tsx`, `tests/unit/replay.spec.ts`

**Estimated scope:** M

---

### T103: Form dan daftar tertunda tanpa `userId`, `outbox`, atau toast antre

**Description:** `submitTransaction(input, { userId, outbox?, sentMessage })` di `lib/offline/submission.ts` membungkus `createTransaction` dan menampilkan toast "Disimpan di perangkat, dikirim saat online" (antre) atau `sentMessage` (terkirim), lalu mengembalikan outcome. `useSubmitTransaction()` (`hooks/use-transactions.ts`) mengikat `userId` dari `useProfile`. `transaction-form.tsx` (:60,106-108) dan `transfer-form.tsx` (:62,107-109) memakainya dan tidak lagi memanggil `useProfile` untuk create. `retryQueued(id)` (retry + `requestReplay`) dan `discardQueued(id)` menggantikan pemanggilan `outbox.*` langsung di `components/pwa/pending-transactions.tsx:57,71`. Pindahkan `navigator.storage.persist()` dari hook ke `submitTransaction`.

**Acceptance criteria:**

- [ ] Literal "Disimpan di perangkat, dikirim saat online" hanya di `lib/offline/submission.ts`
- [ ] `components/` tidak mengimpor `lib/offline/outbox` untuk mutasi; form create tidak menyebut `userId`
- [ ] Kasus offline di `use-transactions.spec.ts` hijau tanpa diubah; kasus baru `submitTransaction` (antre → toast antre, terkirim → `sentMessage`, tanpa `userId` + offline → lempar)

**Verification:**

- [ ] `pnpm vitest run tests/unit/use-transactions.spec.ts tests/unit/submission.spec.ts tests/unit/outbox-store.spec.ts` hijau
- [ ] Manual: catat online (toast terkirim per jenis, termasuk "Transfer dan biaya admin tersimpan"), catat offline (toast antre), Coba lagi dan Buang di daftar tertunda

**Dependencies:** T102

**Files likely touched:** `lib/offline/submission.ts`, `hooks/use-transactions.ts`, `components/forms/transaction-form.tsx`, `components/forms/transfer-form.tsx`, `components/pwa/pending-transactions.tsx`, `tests/unit/submission.spec.ts`

**Estimated scope:** M

---

## Checkpoint AA

Lihat [plan-28.md](plan-28.md) § Checkpoint AA.
