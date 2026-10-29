# Todo phase 29: Pencatatan transaksi di server

Plan: [plan-29.md](plan-29.md) · Index: [plan.md](plan.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T104: Desain interface record dan persetujuan

**Description:** Tulis dua alternatif interface di `SPEC-transactions.md` § baru "Pencatatan oleh modul lain" yang memenuhi keempat batasan di plan-29 § Keputusan. Contoh arah: (a) `recordSimple(userId, input, { executor, isOwnReplay })` yang menjalankan replay → cek → insert → race; (b) `prepareSimple(userId, input, { isOwnReplay })` di luar transaksi DB + `commitPrepared(tx, prepared)` di dalamnya. Untuk tiap alternatif, tulis ulang `advanceRule` sebagai pseudocode dan hitung nama yang diimpor recurring. **Berhenti dan minta keputusan Yogi** (Open question #3 di [plan.md](plan.md)): pilih satu, atau batalkan phase bila keduanya tidak lebih sempit dari enam ekspor sekarang.

**Acceptance criteria:**

- [x] Dua alternatif tertulis dengan pseudocode `advanceRule` dan `createTransaction`, jumlah ekspor, dan cara tiap batasan dipenuhi
- [ ] Keputusan Yogi dicatat di plan-29 § Keputusan

**Verification:**

- [ ] Review dokumen bersama Yogi (tanpa perubahan kode)

**Dependencies:** None (boleh paralel dengan phase 26–28)

**Files likely touched:** `SPEC-transactions.md`, `tasks/plan-29.md`

**Estimated scope:** S

---

### T105: Implementasi dan migrasi

**Description:** Implementasikan interface yang dipilih di `lib/server/transactions.ts`. `createTransaction` memakainya untuk create sederhana (transfer tetap lewat `insertTransfer`). `advanceRule` memakainya dengan predikat dari `findPostReplay` (pencocokan tetap di recurring). Hapus ekspor yang tidak lagi dipakai di luar modul. Tidak ada tes yang ada diedit; tambahkan tes langsung untuk interface baru di `tests/api/transactions-executor.spec.ts` (replay sebelum cek, predikat menolak → `idTaken`, rollback saat konflik).

**Acceptance criteria:**

- [ ] `lib/server/recurring.ts` mengimpor paling banyak dua nama dari `lib/server/transactions.ts`; `checkReferences` di recurring tetap memakai cek yang sama dengan transaksi
- [ ] `transactions-idempotency.spec.ts`, `transactions.spec.ts`, `recurring-advance.spec.ts`, `recurring.spec.ts`, `ownership.spec.ts` hijau tanpa diedit
- [ ] Aturan "replay sebelum cek referensi" hanya ditulis (kode + komentar) di satu fungsi

**Verification:**

- [ ] `pnpm vitest run tests/api/transactions*.spec.ts tests/api/recurring*.spec.ts tests/api/ownership.spec.ts` hijau

**Dependencies:** T104 (disetujui)

**Files likely touched:** `lib/server/transactions.ts`, `lib/server/recurring.ts`, `tests/api/transactions-executor.spec.ts`

**Estimated scope:** M

---

### T106: Penyelesaian refactor

**Description:** Ukur JS first load `/dashboard` dan `/transactions` dengan metode § Catatan ukuran dan bandingkan dengan sebelum T90. Perbarui status baris "Refactor arsitektur" di `plan.md`, catat temuan yang belum selesai (pola Temuan verifikasi T89), dan tandai kandidat review yang ditunda (06) beserta alasannya.

**Acceptance criteria:**

- [ ] Tabel ukuran sebelum/sesudah di plan-29; selisih `/dashboard` ≤ +0,5 KB gzip
- [ ] `plan.md` status diperbarui; jumlah tes akhir ≥ jumlah sebelum T90

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau

**Dependencies:** T105 (atau T104 bila phase dibatalkan), Checkpoint AA

**Files likely touched:** `tasks/plan.md`, `tasks/plan-29.md`

**Estimated scope:** S

---

## Checkpoint AB

Lihat [plan-29.md](plan-29.md) § Checkpoint AB.
