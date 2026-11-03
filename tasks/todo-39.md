# Todo phase 39: Check-in hari ini dan deskripsi

Plan: [plan-39.md](plan-39.md) · Index: [plan.md](plan.md) · Spec: [SPEC-goals.md](../SPEC-goals.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T135: Check-in bertanggal server

**Description:** Hapus `date` dari `valuationSchema`. `recordValuations` menghitung `today = todayInJakarta()` sekali, membaca saldo dari `accountBalances` (menggantikan `balancesOn`), menolak delta ≠ 0 jika revaluasi terakhir ≥ `today` dengan pesan di `fields["items.<i>"]`, dan menulis `date: today`. Sheet Perbarui nilai kehilangan `DateField`; hint mendapat "Dicatat untuk hari ini, {tanggal}", dan error sekali sehari tampil di bawah field nilai. Tes ditulis ulang sesuai tabel di plan-39.

**Acceptance criteria:**

- [x] `POST /api/valuations` tanpa `date` → revaluasi bertanggal `todayInJakarta()`; body dengan `date` apa pun → 400; ulangan request → `recorded: 0`
- [x] Nilai kedua hari ini → 400 `fields["items.0"]` "Nilai sudah diperbarui hari ini. Revaluasi hanya sekali sehari.", tanpa baris; revaluasi kemarin tidak menghalangi; adjustment hari ini ikut delta (saldo dari view)
- [ ] Sheet tanpa input tanggal, hint menyebut tanggal hari ini, simpan berhasil dari `/net-worth` (kode selesai; cek di browser tertunda: sesi tanpa browser)

**Verification:**

- [x] Merah dulu: `pnpm vitest run tests/unit/valuation-schema.spec.ts tests/api/valuations.spec.ts` gagal pada tes baru sebelum implementasi
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau (`tests/unit/cache-invalidation.spec.ts` ikut: `date` dihapus dari body mock, assertion tidak berubah)
- [ ] (tertunda: sesi tanpa browser) Manual: Perbarui nilai satu akun di 360×800, lalu coba lagi dari tab lain → pesan sekali sehari di bawah field nilai

**Dependencies:** commit `docs(goals)` spec + plan

**Files likely touched:** `lib/schemas/valuation.ts`, `lib/server/valuations.ts`, `components/goals/valuation-sheet.tsx`, `tests/api/valuations.spec.ts`, `tests/unit/valuation-schema.spec.ts`

**Estimated scope:** M

---

### T136: Deskripsi opsional di check-in

**Description:** `items[i].note` opsional dengan schema `description` transaksi (export dari `lib/schemas/transaction.ts` jika perlu). Insert memakai `description: note ?? null`, sehingga teks tetap "Pembaruan nilai" hilang. Sheet mendapat field "Deskripsi (opsional)" (16 px, `maxLength={200}`). Jika deskripsi terisi tapi nilai tidak berubah, muncul error di field deskripsi tanpa request. `fields.items` dari server tampil sebagai pesan form.

**Acceptance criteria:**

- [x] Check-in dengan `note` → `description` baris = note yang sudah di-trim; tanpa `note` atau string kosong → `null`; `note` > 200 → 400 `fields.items`
- [x] Ulangan request dengan `note` → `recorded: 0`, tanpa error, deskripsi baris pertama tidak berubah
- [ ] (kode selesai; cek di browser tertunda: sesi tanpa browser) Sheet: deskripsi + nilai sama → "Deskripsi disimpan bersama nilai baru. Ubah nilainya dulu.", tanpa request; revaluasi berdeskripsi tampil "Revaluasi · {deskripsi}" di `/transactions`

**Verification:**

- [x] Merah dulu: tes `note` di `valuation-schema.spec.ts` dan `valuations.spec.ts`
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] (tertunda: sesi tanpa browser) Manual: kedua cabang sheet di 360×800; detail transaksi revaluasi menampilkan baris "Deskripsi"

**Dependencies:** T135

**Files likely touched:** `lib/schemas/valuation.ts`, `lib/schemas/transaction.ts`, `lib/server/valuations.ts`, `components/goals/valuation-sheet.tsx`, `tests/api/valuations.spec.ts`, `tests/unit/valuation-schema.spec.ts`

**Estimated scope:** M

---

### T137: Baris aset "diperbarui hari ini"

**Description:** `valuedLabel(today, today)` → "diperbarui hari ini". `AssetRow` di `asset-values.tsx` tidak merender tombol Perbarui jika `lastValuedAt === today`. Tombol di baris basi kartu target tidak disentuh.

**Acceptance criteria:**

- [x] `valuedLabel` hari ini → "diperbarui hari ini"; cabang lain (belum pernah, basi, tanggal lain) tidak berubah
- [ ] (kode selesai; cek di browser tertunda: sesi tanpa browser) Baris aset yang dinilai hari ini tidak punya tombol Perbarui; baris lain tetap punya, ≥ 44 px

**Verification:**

- [x] Merah dulu: `pnpm vitest run tests/unit/valuation-format.spec.ts`
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] (tertunda: sesi tanpa browser) Manual: sesudah check-in, baris berubah tanpa reload (SWR revalidate) di 360×800

**Dependencies:** commit `docs(goals)` spec + plan

**Files likely touched:** `lib/valuation-format.ts`, `components/goals/asset-values.tsx`, `tests/unit/valuation-format.spec.ts`

**Estimated scope:** S

---

### T138: Verifikasi dan status

**Description:** Jalankan Checkpoint AL. Centang butir revisi di SPEC-goals § Acceptance criteria (API lewat tes, UI manual atau "tertunda: sesi tanpa browser"). Perbarui Status SPEC-goals dan baris `goals` di plan.md, lalu catat jumlah tes akhir. Perbaikan yang ditemukan menjadi commit `fix` terpisah dengan tes yang mereproduksi.

**Acceptance criteria:**

- [ ] Setiap butir revisi 2026-11-02 di SPEC-goals dicentang atau ditandai tertunda dengan alasan
- [ ] `rg -n "balancesOn|valuation-date|Pembaruan nilai" lib components` kosong
- [ ] SPEC-goals.md Status dan plan.md baris `goals` menyebut T135–T138

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; jumlah tes dicatat
- [ ] Review bersama Yogi

**Dependencies:** T135, T136, T137

**Files likely touched:** `SPEC-goals.md`, `tasks/plan.md`, `tasks/plan-39.md`

**Estimated scope:** S
