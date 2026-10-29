# Plan phase 28: Pengiriman transaksi

Index: [plan.md](plan.md) § Refactor arsitektur · Todo: [todo-28.md](todo-28.md) · Spec: [SPEC-pwa-offline.md](../SPEC-pwa-offline.md) § Keputusan 9–14, Deliverables (`outbox.ts`, `replay.ts`, `use-outbox-replay.ts`)

## Tujuan

Satu modul memiliki seluruh hidup sebuah create transaksi di client: id dari client, kirim dengan timeout, antre saat jaringan gagal, kirim ulang, bentuk error, dan invalidasi cache. Form hanya memanggil `submit(input)` dan mendapat `sent` atau `queued`. Loop replay (pemicu, lock, interval, sesi habis) bisa dites lewat interface-nya.

## Task

- [ ] T101: Satu jalur kirim dan satu parser error untuk online dan replay (M, risiko tinggi)
- [ ] T102: `startReplay` yang bisa dites, hook tinggal pemasang (M)
- [ ] T103: Form dan daftar tertunda tanpa `userId`, `outbox`, atau toast antre sendiri (M)

Urutan berantai: T101 → T102 → T103.

## Keputusan

- **Lokasi:** `lib/offline/submission.ts` (client) untuk `sendCreate`, `submitTransaction`, `retryQueued`, `discardQueued`; `lib/offline/replay.ts` tetap pemilik loop dan mendapat `startReplay`. `hooks/use-transactions.ts` tidak lagi memuat logika outbox.
- **Seam yang dipertahankan:** transport (`send`, `fetch` di produksi, stub di tes) dan penyimpanan outbox (`KeyValueStore`: IndexedDB di produksi, `Map` di tes). Dua adapter masing-masing, jadi seam ini nyata.
- **Satu bentuk error.** `send` melempar `ApiError` (lewat `parse` di `lib/fetcher.ts`) atau error jaringan. `replayOutbox` mengklasifikasi dari `ApiError.status`, dan `OutboxError` dibuat dari `ApiError` (pesan field pertama didahulukan, sama dengan sekarang).
- **Satu konstanta timeout** (`SEND_TIMEOUT_MS = 10_000`) di modul submission.
- **Perilaku tidak berubah:** tabel status replay di SPEC-pwa-offline § Keputusan 10 (2xx hapus, 401 berhenti, 4xx gagal, 5xx/jaringan berhenti dan `bump`), kebijakan id per submit, dan pemisahan user.

## Risiko

| Risiko                                                 | Dampak | Mitigasi                                                                                                  |
| ------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------- |
| Item tertunda terkirim ganda atau hilang               | Tinggi | `transactions-idempotency.spec.ts` hijau tanpa diedit; `replay.spec.ts` assertion tetap, hanya stub `send` yang berubah bentuk |
| Klasifikasi status berubah (mis. 5xx dianggap gagal)   | Tinggi | Tes T101 per baris tabel status di spec, ditulis merah lebih dulu                                         |
| Tes timer/event rapuh                                  | Sedang | `startReplay` menerima `target` (EventTarget) dan memakai fake timers vitest, tanpa `window` global       |

## Checkpoint AA

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] `fetch(` tidak muncul di `hooks/`; `outbox.` tidak muncul di `components/`
- [ ] Dengan `pnpm build && pnpm start`: mode pesawat → catat expense dan transfer berbiaya → "Disimpan di perangkat" → online → keduanya terkirim sekali, daftar dan saldo terbarui; item yang ditolak server (akun diarsipkan) tampil gagal dengan pesan field, Coba lagi dan Buang berfungsi; sesi habis → toast "Masuk lagi"
- [ ] Review dengan Yogi sebelum phase 29
