# Plan phase 29: Pencatatan transaksi di server

Index: [plan.md](plan.md) § Refactor arsitektur · Todo: [todo-29.md](todo-29.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md) § idempotensi `POST`, [SPEC-recurring.md](../SPEC-recurring.md) § `POST /api/recurring/[id]/advance`

## Tujuan

Modul transactions di server menawarkan satu cara mencatat transaksi secara idempoten di dalam transaksi DB milik pemanggil. `advanceRule` berhenti merakit ulang urutan "replay → cek referensi → insert → race" dari enam ekspor (`checkAccounts`, `checkCategory`, `findReplay`, `IdConflict`, `insertSimple`, `Executor`), dan aturan urutan itu ditulis di satu tempat.

## Task

- [ ] T104: Desain interface record dan persetujuan (S, berhenti untuk Yogi)
- [ ] T105: Implementasi dan migrasi `createTransaction` + `advanceRule` (M, risiko tinggi)
- [ ] T106: Penyelesaian refactor (S)

Urutan berantai: T104 → T105 → T106. Bila T104 berakhir dengan "tidak lebih sederhana", T105 dilewati dan T106 mencatat alasannya.

## Keputusan

- **Kontrak modul penyedia ditulis di spec penyedia** (`SPEC-transactions.md`), sesuai SPEC.md § Capability map.
- **Batasan desain yang harus dipenuhi interface:**
  1. Replay diperiksa sebelum cek referensi (akun yang diarsipkan setelah tulisan pertama tidak mengubah retry menjadi 400).
  2. Catat hanya replay bila baris tersimpan sama dengan request **dan** aturan tepat satu langkah setelah kejadian (`recurring.ts:180-192`). Kecocokan ini milik recurring, jadi interface menerima predikat pencocokan, bukan logika recurring.
  3. Insert berjalan di transaksi DB pemanggil, sesudah aturan dimajukan, dan konflik id menggulung balik keduanya.
  4. Hasil berbentuk union yang sama dengan sekarang (`created` / `replayed` / `idTaken` / `invalid`), supaya route tidak berubah.
- **Di luar cakupan:** cek referensi `setBudgets` (`budgets.ts:31`, satu pesan untuk semua penolakan karena alasan privasi) tetap terpisah.

## Risiko

| Risiko                                                | Dampak | Mitigasi                                                                                              |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| Perilaku replay `POST /api/transactions` berubah      | Tinggi | `transactions-idempotency.spec.ts`, `transactions.spec.ts`, `transactions-executor.spec.ts` hijau tanpa diedit |
| Catat ganda atau aturan maju tanpa transaksi          | Tinggi | `recurring-advance.spec.ts` hijau tanpa diedit, termasuk kasus paralel dan id dipakai di tempat lain  |
| Interface baru sama lebarnya dengan enam ekspor lama  | Sedang | T104 membandingkan keduanya dan berhenti untuk keputusan                                              |

## Checkpoint AB (refactor selesai)

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; jumlah tes tidak turun dari sebelum T90
- [ ] `lib/server/recurring.ts` mengimpor paling banyak dua nama dari `lib/server/transactions.ts`
- [ ] Manual: Catat dua kali cepat (tap ganda) → satu transaksi; Catat setelah akun diarsipkan saat retry → replay, bukan 400
- [ ] Status di `plan.md` diperbarui; review dengan Yogi
