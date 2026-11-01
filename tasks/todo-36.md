# Todo phase 36: Revaluasi

Plan: [plan-36.md](plan-36.md) · Index: [plan.md](plan.md) · Spec: [SPEC-goals.md](../SPEC-goals.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T124: Tipe `revaluation` di DB dan API transaksi

**Description:** Migrasi `revaluation` sesuai SPEC-goals § Perubahan skema (tanpa tabel `goals`): tiga constraint `transactions`, view `account_balances` (`revaluation → +amount`), index `transactions_user_account_type_idx`. `db/schema.ts` mengikuti. Tambah `SYSTEM_TRANSACTION_TYPES` + `isSystemTransactionType()` (plan-36 § Keputusan) dan pakai di `lib/schemas/transaction.ts` dan `updateTransaction` (revaluasi → `notEditable`). Tes merah dulu dengan baris `revaluation` yang ditulis langsung ke DB.

**Acceptance criteria:**

- [ ] Baris `revaluation` bertanda (±) menggeser `balance` di `GET /api/accounts`; `amount = 0` atau `category_id` terisi ditolak DB
- [ ] `PATCH /api/transactions/[id]` revaluasi → 409 `TRANSACTION_NOT_EDITABLE`; `DELETE` dan `restore` menggeser saldo; `POST /api/transactions { type: "revaluation" }` → 400; `GET ?type=revaluation` memfilter
- [ ] Revaluasi tidak ikut `totals` `/api/transactions`, `dashboardSummary`, `budgetUsage`, dan `Account.initialBalance`

**Verification:**

- [ ] `pnpm drizzle-kit generate --explain` dibaca; `migration.sql` hanya berisi objek di atas
- [ ] `pnpm vitest run tests/api/transactions-revaluation.spec.ts` hijau; semua `tests/api/*.spec.ts` lama hijau tanpa diubah
- [ ] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T123

**Files likely touched:** `db/schema.ts`, `drizzle/<timestamp>_revaluation/`, `lib/transaction-types.ts`, `lib/schemas/transaction.ts`, `lib/server/transactions.ts`, `tests/api/transactions-revaluation.spec.ts`

**Estimated scope:** M

---

### T125: `GET`/`POST /api/valuations` dan subtype `gold`

**Description:** `lib/schemas/valuation.ts` (`AssetValuation`, `valuationSchema`), `lib/server/valuations.ts` (`recordValuations`: lock baris akun urut id, saldo per tanggal sesuai keputusan #7, revaluasi terakhir untuk keputusan #6, insert delta ≠ 0, `description "Pembaruan nilai"`), `lib/server/queries/asset-valuations.ts`, `app/api/valuations/route.ts`. Subtype `gold` ("Emas") di `lib/schemas/account.ts`. Tes merah dulu dengan skenario dasar SPEC-goals.

**Acceptance criteria:**

- [ ] Skenario dasar: check-in 2026-10-31 Emas 36.500.000 + RD Saham 6.200.000 → `recorded: 2`, revaluasi +500.000 dan +200.000; ulangan → `recorded: 0`; dua request paralel → total tetap dua baris
- [ ] Tanggal sebelum revaluasi terakhir → 400 `fields.date`; tanggal masa depan, akun `transaction`, terarsip, atau milik user lain → 400 `fields["items.<i>"]` dan tidak ada item yang tertulis; adjustment hari ini + check-in kemarin → delta sesuai keputusan #7
- [ ] `GET /api/valuations` → akun aset aktif dengan `contributed + marketGain = balance` dan `lastValuedAt`; `goalId` `null`; isolasi A/B; tanpa session → 401; `subtype: "gold"` diterima `POST /api/accounts`

**Verification:**

- [ ] `pnpm vitest run tests/api/valuations.spec.ts tests/unit/valuation-schema.spec.ts` hijau
- [ ] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** T124

**Files likely touched:** `lib/schemas/valuation.ts`, `lib/schemas/account.ts`, `lib/server/valuations.ts`, `lib/server/queries/asset-valuations.ts`, `app/api/valuations/route.ts`, `tests/api/valuations.spec.ts`, `tests/unit/valuation-schema.spec.ts`

**Estimated scope:** M

---

### T126: Revaluasi di UI transaksi

**Description:** Label "Revaluasi" (`REVALUATION_LABEL` di `lib/transaction-types.ts`), tanda dan warna seperti adjustment di `lib/transaction-format.ts` dan `type-styles.ts`, opsi filter di `filter-panel.tsx` (tanpa filter kategori, seperti adjustment di `lib/transaction-filters.ts`), dan detail hanya-baca dengan tombol hapus: `adjustment-card.tsx` menerima label dari tipe, `transaction-editor.tsx` merutekan kedua tipe sistem ke kartu itu.

**Acceptance criteria:**

- [ ] Baris revaluasi di `/transactions` tampil "Revaluasi · {akun}" dengan nominal bertanda (+ / −) dan warna sesuai tanda; filter "Revaluasi" hanya menampilkan revaluasi
- [ ] Detail revaluasi hanya-baca; hapus + "Urungkan" memulihkannya
- [ ] `rg -n '"adjustment"' lib components` hanya menyisakan cek yang memang khusus adjustment (dicatat di commit body)

**Verification:**

- [ ] `pnpm vitest run tests/unit/transaction-format.spec.ts tests/unit/transaction-filters.spec.ts` hijau
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual (boleh tertunda: sesi tanpa browser): revaluasi yang dibuat lewat API T125 tampil, terfilter, terhapus, dan pulih di 360×800

**Dependencies:** T124

**Files likely touched:** `lib/transaction-types.ts`, `lib/transaction-format.ts`, `lib/transaction-filters.ts`, `components/transactions/type-styles.ts`, `components/transactions/filter-panel.tsx`, `components/transactions/adjustment-card.tsx`, `components/transactions/transaction-editor.tsx` (perubahan kecil per file)

**Estimated scope:** S

---

### T127: Halaman `/goals` dengan nilai aset dan sheet Perbarui nilai

**Description:** `app/(app)/goals/page.tsx` (di dalam `<Suspense>`, baca `node_modules/next/dist/docs/` dulu) dan `components/goals/goals-view.tsx`: daftar akun aset aktif (nama, subtype, nilai, "Disetor Rp… · Pasar ±Rp…", "diperbarui 12 Okt" / "belum pernah", teks basi > 35 hari) dan tombol **Perbarui nilai** yang membuka `components/goals/valuation-sheet.tsx` (SPEC-goals § UI). `hooks/use-valuations.ts` (`useValuations`, `recordValuations` → `invalidate("transactions")`). Resource `valuations` di `lib/cache-invalidation.ts` dengan edge dari `transactions` dan `accounts`. `goalsItem` di nav. Teks bantuan "Pakai harga buyback hari ini" untuk akun `gold`.

**Acceptance criteria:**

- [ ] Check-in dari sheet (hanya baris yang diubah dikirim) → nilai, porsi pasar, dan kartu Account Balance dashboard berubah tanpa reload; toast "{n} nilai diperbarui" / "Nilai sama, tidak ada yang dicatat"; error per baris terpasang di barisnya
- [ ] Tanpa akun aset → teks yang mengajak membuat akun aset di Settings; offline → tombol nonaktif "Butuh koneksi"; `hideAmounts` menyamarkan nominal
- [ ] "Goals" ada di sidebar (≥ lg) dan menu More (< lg); 360 px tanpa scroll horizontal, input 16 px, target ≥ 44 px

**Verification:**

- [ ] `pnpm vitest run tests/unit/cache-invalidation.spec.ts` hijau (edge `valuations`)
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; JS first load `/goals` dicatat
- [ ] Manual (boleh tertunda: sesi tanpa browser): skenario di atas di 360×800 dan 1024

**Dependencies:** T125

**Files likely touched:** `app/(app)/goals/page.tsx`, `components/goals/goals-view.tsx`, `components/goals/valuation-sheet.tsx`, `hooks/use-valuations.ts`, `lib/cache-invalidation.ts`, `components/layout/nav-items.ts`, `tests/unit/cache-invalidation.spec.ts`

**Estimated scope:** M
