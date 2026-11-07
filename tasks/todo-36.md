# Todo phase 36: Revaluasi

Plan: [plan-36.md](plan-36.md) · Index: [plan.md](plan.md) · Spec: [SPEC-net-worth.md](../SPEC-net-worth.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T124: Tipe `revaluation` di DB dan API transaksi

**Description:** Migrasi `revaluation` sesuai SPEC-net-worth § Perubahan skema (tanpa tabel `net_worth`): tiga constraint `transactions`, view `account_balances` (`revaluation → +amount`), index `transactions_user_account_type_idx`. `db/schema.ts` mengikuti. Tambah `SYSTEM_TRANSACTION_TYPES` + `isSystemTransactionType()` (plan-36 § Keputusan) dan pakai di `lib/schemas/transaction.ts` dan `updateTransaction` (revaluasi → `notEditable`). Tes merah dulu dengan baris `revaluation` yang ditulis langsung ke DB.

**Acceptance criteria:**

- [x] Baris `revaluation` bertanda (±) menggeser `balance` di `GET /api/accounts`; `amount = 0` atau `category_id` terisi ditolak DB
- [x] `PATCH /api/transactions/[id]` revaluasi → 409 `TRANSACTION_NOT_EDITABLE`; `DELETE` dan `restore` menggeser saldo; `POST /api/transactions { type: "revaluation" }` → 400; `GET ?type=revaluation` memfilter
- [x] Revaluasi tidak ikut `totals` `/api/transactions`, `dashboardSummary`, `budgetUsage`, dan `Account.initialBalance`

**Verification:**

- [x] `pnpm drizzle-kit generate --explain` dibaca; `migration.sql` hanya berisi objek di atas
- [x] `pnpm vitest run tests/api/transactions-revaluation.spec.ts` hijau; semua `tests/api/*.spec.ts` lama hijau tanpa diubah
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T123

**Files likely touched:** `db/schema.ts`, `drizzle/<timestamp>_revaluation/`, `lib/transaction-types.ts`, `lib/schemas/transaction.ts`, `lib/server/transactions.ts`, `tests/api/transactions-revaluation.spec.ts`

**Estimated scope:** M

**Catatan (2026-11-01):** menambah `revaluation` ke `LIST_TRANSACTION_TYPES` memaksa cabang exhaustive di `transaction-format.ts`, `transaction-filters.ts`, `type-styles.ts`, `filter-panel.tsx`, `transaction-editor.tsx`, jadi bagian itu (helper `isSystemTransactionType`, `transactionTypeLabel`, ikon `TrendingUpIcon`) ikut T124. Label CSV "Revaluasi" juga. Sisa untuk T126: judul baris, kartu detail, filter kategori di panel. Tes: 1324 lulus (78 berkas).

---

### T125: `GET`/`POST /api/valuations` dan subtype `gold`

**Description:** `lib/schemas/valuation.ts` (`AssetValuation`, `valuationSchema`), `lib/server/valuations.ts` (`recordValuations`: lock baris akun urut id, saldo per tanggal sesuai keputusan #7, revaluasi terakhir untuk keputusan #6, insert delta ≠ 0, `description "Pembaruan nilai"`), `lib/server/queries/asset-valuations.ts`, `app/api/valuations/route.ts`. Subtype `gold` ("Emas") di `lib/schemas/account.ts`. Tes merah dulu dengan skenario dasar SPEC-net-worth.

**Acceptance criteria:**

- [x] Skenario dasar: check-in 2026-10-31 Emas 36.500.000 + RD Saham 6.200.000 → `recorded: 2`, revaluasi +500.000 dan +200.000; ulangan → `recorded: 0`; dua request paralel → total tetap dua baris
- [x] Tanggal sebelum revaluasi terakhir → 400 `fields.date`; tanggal masa depan, akun `transaction`, terarsip, atau milik user lain → 400 `fields["items.<i>"]` dan tidak ada item yang tertulis; adjustment hari ini + check-in kemarin → delta sesuai keputusan #7
- [x] `GET /api/valuations` → akun aset aktif dengan `contributed + marketGain = balance` dan `lastValuedAt`; `netWorthId` `null`; isolasi A/B; tanpa session → 401; `subtype: "gold"` diterima `POST /api/accounts`

**Verification:**

- [x] `pnpm vitest run tests/api/valuations.spec.ts tests/unit/valuation-schema.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T124

**Files likely touched:** `lib/schemas/valuation.ts`, `lib/schemas/account.ts`, `lib/server/valuations.ts`, `lib/server/queries/asset-valuations.ts`, `app/api/valuations/route.ts`, `tests/api/valuations.spec.ts`, `tests/unit/valuation-schema.spec.ts`

**Estimated scope:** M

**Catatan (2026-11-01):** `tests/unit/account-schema.spec.ts` memakai `"gold"` sebagai contoh subtype tak dikenal; diganti `"stock"` karena `gold` kini valid (keputusan #19), maksud tes sama. Tes: 1352 lulus (80 berkas).

---

### T126: Revaluasi di UI transaksi

**Description:** Label "Revaluasi" (`REVALUATION_LABEL` di `lib/transaction-types.ts`), tanda dan warna seperti adjustment di `lib/transaction-format.ts` dan `type-styles.ts`, opsi filter di `filter-panel.tsx` (tanpa filter kategori, seperti adjustment di `lib/transaction-filters.ts`), dan detail hanya-baca dengan tombol hapus: `adjustment-card.tsx` menerima label dari tipe, `transaction-editor.tsx` merutekan kedua tipe sistem ke kartu itu.

**Acceptance criteria:**

- [x] Baris revaluasi di `/transactions` tampil "Revaluasi · {akun}" dengan nominal bertanda (+ / −) dan warna sesuai tanda; filter "Revaluasi" hanya menampilkan revaluasi
- [x] Detail revaluasi hanya-baca; hapus + "Urungkan" memulihkannya
- [x] `rg -n '"adjustment"' lib components` hanya menyisakan cek yang memang khusus adjustment (dicatat di commit body)

**Verification:**

- [x] `pnpm vitest run tests/unit/transaction-format.spec.ts tests/unit/transaction-filters.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual (tertunda: sesi tanpa browser): revaluasi yang dibuat lewat API T125 tampil, terfilter, terhapus, dan pulih di 360×800

**Dependencies:** T124

**Files likely touched:** `lib/transaction-types.ts`, `lib/transaction-format.ts`, `lib/transaction-filters.ts`, `components/transactions/type-styles.ts`, `components/transactions/filter-panel.tsx`, `components/transactions/adjustment-card.tsx`, `components/transactions/transaction-editor.tsx` (perubahan kecil per file)

**Estimated scope:** S

**Catatan (2026-11-01):** sisa `"adjustment"` di `lib`/`components` memang khusus adjustment: saldo awal efektif dan insert di `lib/server/accounts.ts`, saldo per tanggal di `lib/server/valuations.ts`, entri `TYPE_STYLES`, label di `transaction-types.ts`. Pesan 409 `TRANSACTION_NOT_EDITABLE` kini menyebut revaluasi juga. Tes: 1353 lulus.

---

### T127: Halaman `/net-worth` dengan nilai aset dan sheet Perbarui nilai

**Description:** `app/(app)/net-worth/page.tsx` (di dalam `<Suspense>`, baca `node_modules/next/dist/docs/` dulu) dan `components/net-worth/net-worth-view.tsx`: daftar akun aset aktif (nama, subtype, nilai, "Disetor Rp… · Pasar ±Rp…", "diperbarui 12 Okt" / "belum pernah", teks basi > 35 hari) dan tombol **Perbarui nilai** yang membuka `components/net-worth/valuation-sheet.tsx` (SPEC-net-worth § UI). `hooks/use-valuations.ts` (`useValuations`, `recordValuations` → `invalidate("transactions")`). Resource `valuations` di `lib/cache-invalidation.ts` dengan edge dari `transactions` dan `accounts`. `netWorthsItem` di nav. Teks bantuan "Pakai harga buyback hari ini" untuk akun `gold`.

**Acceptance criteria:**

- [x] Check-in dari sheet (hanya baris yang diubah dikirim) → nilai, porsi pasar, dan kartu Account Balance dashboard berubah tanpa reload; toast "{n} nilai diperbarui" / "Nilai sama, tidak ada yang dicatat"; error per baris terpasang di barisnya
- [x] Tanpa akun aset → teks yang mengajak membuat akun aset di Settings; offline → tombol nonaktif "Butuh koneksi"; `hideAmounts` menyamarkan nominal
- [x] "Net Worth" ada di sidebar (≥ lg) dan menu More (< lg); 360 px tanpa scroll horizontal, input 16 px, target ≥ 44 px

**Verification:**

- [x] `pnpm vitest run tests/unit/cache-invalidation.spec.ts` hijau (edge `valuations`)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; JS first load `/net-worth` dicatat
- [ ] Manual (tertunda: sesi tanpa browser): skenario di atas di 360×800 dan 1024

**Dependencies:** T125

**Files likely touched:** `app/(app)/net-worth/page.tsx`, `components/net-worth/net-worth-view.tsx`, `components/net-worth/valuation-sheet.tsx`, `hooks/use-valuations.ts`, `lib/cache-invalidation.ts`, `components/layout/nav-items.ts`, `tests/unit/cache-invalidation.spec.ts`

**Estimated scope:** M

**Catatan (2026-11-02):** JS first load `/net-worth` 329,4 KB gzip (metode Catatan ukuran dashboard), setara `/recurring` 330,4 dan `/settings` 324,6; di atas target 200 KB karena app shell bersama (sudah tercatat). `hideAmounts` di sheet: field mulai kosong (tidak menampilkan saldo) dan hanya akun yang diisi yang dikirim. Wave halaman `lilac`. `cache-invalidation.spec.ts` dan `nav.spec.ts` (yang ada) diperluas untuk `valuations` dan `netWorthsItem`, seperti rencana SPEC-net-worth § Tes. Tes: 1373 lulus (81 berkas).
