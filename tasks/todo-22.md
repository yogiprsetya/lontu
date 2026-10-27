# Todo phase 22: Aturan berulang

Plan: [plan-22.md](plan-22.md) · Index: [plan.md](plan.md) · Spec: [SPEC-recurring.md](../SPEC-recurring.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T77: Migrasi `recurring_rules`, schema Zod, `recurring-schedule`

**Description:** Tambah `recurringRules` di `db/schema.ts` sesuai § Perubahan skema (kolom, 4 check constraint, index unik parsial gajian, index `(user_id, next_due_date)`), `pnpm db:generate`, periksa `migration.sql`, tambahkan RLS deny-all seperti migrasi tabel lain, `pnpm db:migrate`. `lib/schemas/recurring.ts`: tipe `RecurringType`, `RecurringRule`, `ForecastItem`, `PaydayForecast`, `RecurringOverview`, `AdvanceResult`, lalu `recurringCreateSchema`, `recurringUpdateSchema`, `recurringAdvanceSchema` (union `action`). `lib/recurring-schedule.ts` murni: `clampDay`, `advanceDate`, `firstDueOnOrAfter`. Tes ditulis lebih dulu.

**Acceptance criteria:**

- [x] Migrasi hanya membuat objek `recurring_rules`. `db-constraints.spec.ts` tetap hijau, dan constraint baru menolak `amount 0`, `day_of_month 0`/`32`, `type "transfer"`, serta `is_payday` pada `type "expense"`
- [x] `advanceDate(31, "2026-01-31") = "2026-02-28"` lalu `"2026-03-31"`; `advanceDate(29, "2028-01-29") = "2028-02-29"`; `advanceDate(15, "2026-12-15") = "2027-01-15"`; `clampDay(2027, 2, 31) = "2027-02-28"`
- [x] `firstDueOnOrAfter(27, "2026-10-27") = "2026-10-27"` (hari yang sama ikut), `firstDueOnOrAfter(5, "2026-10-27") = "2026-11-05"`, `firstDueOnOrAfter(31, "2026-11-03") = "2026-11-30"`
- [x] Schema menolak `name` kosong/>60, `amount` 0/−1/1.5/`"100"`/>1e12, `dayOfMonth` 0/32/2.5, `type` tak dikenal, `isPayday: true` dengan `type != "income"` (`fields.isPayday`), field tak dikenal (`userId`, `nextDueDate`), dan `occurrenceDate`/`date` yang bukan tanggal valid

**Verification:**

- [x] `pnpm vitest run tests/unit/recurring-schedule.spec.ts tests/unit/recurring-schema.spec.ts tests/api/db-constraints.spec.ts` hijau
- [x] `migration.sql` dibaca sebelum `db:migrate`

**Dependencies:** None

**Files likely touched:** `db/schema.ts`, `drizzle/<timestamp>_recurring_rules/`, `lib/schemas/recurring.ts`, `lib/recurring-schedule.ts`, `tests/unit/recurring-schedule.spec.ts`, `tests/unit/recurring-schema.spec.ts`

**Estimated scope:** M

---

### T78: `GET` + `POST /api/recurring`

**Description:** `lib/server/queries/recurring-overview.ts`: `recurringOverview(userId, today, { includeArchived })` → `rules` (urut `next_due_date`, lalu `lower(name)`), `due` (subset `next_due_date <= today`), dan `forecast: { status: "no_payday" }` sebagai placeholder sampai T87. `lib/server/recurring.ts` `createRule`: validasi kepemilikan + aktif akun/kategori dan `kind = CATEGORY_KIND_FOR[type]` lewat helper ownership yang ada, `next_due_date = firstDueOnOrAfter(dayOfMonth, today)`, `isPayday: true` mencabut tanda gajian lama dalam satu transaksi DB. `app/api/recurring/route.ts` (`GET`, `POST`). `lib/api/errors.ts`: `ruleNotFound()`. Tes merah lebih dulu.

**Acceptance criteria:**

- [x] `POST { type: "expense", name: "Netflix", amount: 186000, accountId, categoryId: <Langganan>, dayOfMonth: 5 }` pada `today = 2026-10-27` → 201 dengan `nextDueDate "2026-11-05"`. `dayOfMonth: 27` → `"2026-10-27"` dan ikut di `due`
- [x] Kategori `kind` salah, akun/kategori terarsip, milik user lain, atau tidak ada → 400 pada field yang bersangkutan, tanpa baris tertulis. Pesan sama untuk id asing dan tidak ada
- [x] `POST` kedua dengan `isPayday: true` → aturan baru gajian, yang lama `isPayday false`. Dua `POST` paralel `isPayday: true` (`Promise.all`) → tepat satu aturan gajian aktif
- [x] `GET` mengurutkan `rules` dan mengisi `due` hanya untuk `next_due_date <= today`. `?includeArchived=true` memuat yang terarsip di `rules` saja, tidak di `due`
- [x] Isolasi: `GET` B tidak memuat aturan A, B tidak bisa `POST` ke akun/kategori A. Tanpa session → 401. Body dengan `userId`/`nextDueDate` → 400

**Verification:**

- [x] `pnpm vitest run tests/api/recurring.spec.ts tests/api/recurring-overview.spec.ts` hijau

**Dependencies:** T77

**Files likely touched:** `lib/server/recurring.ts`, `lib/server/queries/recurring-overview.ts`, `app/api/recurring/route.ts`, `lib/api/errors.ts`, `tests/api/recurring.spec.ts`, `tests/api/recurring-overview.spec.ts`

**Estimated scope:** M

---

### T79: `PATCH`, `DELETE`, `restore` + tukar gajian

**Description:** `updateRule` (menolak `type`, menghitung ulang `next_due_date` saat `dayOfMonth` berubah, referensi yang diubah harus aktif, referensi yang tidak diubah boleh terarsip, `isPayday: true` menukar), `archiveRule` (`archived_at` + `is_payday = false`, idempoten), `restoreRule` (idempoten). Route `app/api/recurring/[id]/route.ts` dan `[id]/restore/route.ts`. Id bukan UUID, tidak ada, milik user lain, atau (untuk `PATCH`) terarsip → 404 `RULE_NOT_FOUND`.

**Acceptance criteria:**

- [x] `PATCH { type }` → 400. `PATCH { dayOfMonth: 10 }` pada `today = 2026-10-27` → `nextDueDate "2026-11-10"`. `PATCH { amount }` tidak mengubah `nextDueDate`
- [x] `PATCH` pada aturan yang akunnya diarsipkan setelah dibuat, tanpa menyentuh `accountId` → 200. Mengubah `accountId` ke akun terarsip → 400
- [x] `DELETE` mengisi `archivedAt` dan `isPayday false`; `restore` mengosongkan `archivedAt`; keduanya idempoten dan aturan terarsip bisa dipulihkan walau ada gajian baru (tidak bentrok dengan index parsial)
- [x] `PATCH { isPayday: true }` memindahkan tanda dari aturan lama. `isPayday: true` pada aturan `expense` → 400 `fields.isPayday`
- [x] Isolasi: B mendapat 404 untuk `PATCH`/`DELETE`/`restore` aturan A. `PATCH` pada aturan terarsip → 404. Tanpa session → 401

**Verification:**

- [x] `pnpm vitest run tests/api/recurring.spec.ts` hijau

**Dependencies:** T77 (boleh paralel dengan T78; keduanya menyentuh `lib/server/recurring.ts`)

**Files likely touched:** `lib/server/recurring.ts`, `app/api/recurring/[id]/route.ts`, `app/api/recurring/[id]/restore/route.ts`, `tests/api/recurring.spec.ts`

**Estimated scope:** M

---

### T80: `hooks/use-recurring.ts`, resource cache, nav item

**Description:** `hooks/use-recurring.ts`: `useRecurring({ includeArchived } = {})` (key `"/api/recurring"` atau `"/api/recurring?includeArchived=true"`), `revalidateRecurring()`, mutasi `createRule`, `updateRule`, `archiveRule`, `restoreRule` lewat `sendJSON` (melempar `ApiError`). `lib/cache-invalidation.ts`: resource `"recurring"` dengan key `/^\/api\/recurring($|[/?])/`, `AFFECTS.transactions` dan `AFFECTS.accounts` mendapat `"recurring"`, `AFFECTS.recurring = ["transactions"]`. `components/layout/nav-items.ts`: `recurringItem` (`/recurring`, "Recurring", `RepeatIcon`) di `sidebarItems`, dan di daftar menu More `bottom-nav.tsx`.

**Acceptance criteria:**

- [x] `isResourceKey("recurring", …)` cocok dengan `/api/recurring` dan `/api/recurring?includeArchived=true`, tidak cocok dengan `/api/recurringx` atau `/api/transactions`
- [x] `invalidate("transactions")` dan `invalidate("accounts")` menyentuh key recurring; `invalidate("recurring")` menyentuh key transaksi (dites dengan mock `mutate`)
- [x] Tidak ada data aturan di Zustand. Mutasi memanggil `invalidate` setelah sukses
- [x] "Recurring" muncul di sidebar (≥ lg) dan menu More (< lg), 5 slot bottom nav tidak berubah

**Verification:**

- [x] `pnpm vitest run tests/unit/use-recurring.spec.ts tests/unit/cache-invalidation.spec.ts` hijau

**Dependencies:** T78, T79

**Files likely touched:** `hooks/use-recurring.ts`, `lib/cache-invalidation.ts`, `components/layout/nav-items.ts`, `components/layout/bottom-nav.tsx`, `tests/unit/use-recurring.spec.ts`, `tests/unit/cache-invalidation.spec.ts`

**Estimated scope:** S

---

### T81: Halaman `/recurring` (baca)

**Description:** `app/(app)/recurring/page.tsx` (di dalam `<Suspense>`) + `components/recurring/recurring-view.tsx` (client) dan `rule-row.tsx`. Daftar dikelompokkan Income / Expense / Saving. Baris: nama, "Rp… · tiap tanggal 25", jatuh tempo berikutnya ("25 Nov" atau "Terlambat · 25 Okt" sebagai teks, bukan hanya warna), lencana "Gajian". Nama akun dan kategori di-resolve dari `useAccounts({ includeArchived: true })` dan `useCategories({ includeArchived: true })` (keputusan #8 transactions). Skeleton, error SWR "Coba lagi", empty state dengan penjelasan satu kalimat + dua tombol ("Tambah gaji", "Tambah tagihan", belum aktif sampai T82). Tautan "Lihat arsip" menampilkan aturan terarsip. `hideAmounts` dipatuhi. Mengikuti [DESIGN.md](../DESIGN.md).

**Acceptance criteria:**

- [x] Aturan dari `GET` tampil terkelompok dengan jatuh tempo dan lencana gajian yang benar. Status terlambat terbaca tanpa warna
- [x] "Lihat arsip" memuat `?includeArchived=true` dan menandai baris terarsip. Empty state tampil saat belum ada aturan
- [ ] 360 px tanpa horizontal scroll, target sentuh ≥ 44 px, kontras ≥ 4.5:1, light dan dark
- [x] `pnpm build` hijau (Suspense + `cacheComponents`)

**Verification:**

- [ ] Manual 360×800 dan 1024, light dan dark
- [x] `pnpm build` hijau

**Dependencies:** T80

**Files likely touched:** `app/(app)/recurring/page.tsx`, `components/recurring/recurring-view.tsx`, `components/recurring/rule-row.tsx`

**Estimated scope:** M

---

### T82: Form aturan + arsip dengan undo

**Description:** `components/forms/recurring-form.tsx` di `ResponsiveModal`, dibuka dari "Tambah aturan", empty state, atau tap baris (state lokal halaman). Field: tipe (hanya saat create, memakai `TypeChip`), nama, `MoneyInput`, `AccountPicker`, `CategoryPicker` (kind dari tipe), tanggal 1–31 (`<select>` native + teks bantuan "Bulan yang lebih pendek memakai hari terakhirnya"), switch "Ini gaji saya" (hanya income, teks bantuan saat akan mengganti gajian lama). Edit `dayOfMonth` pada aturan terlambat menampilkan peringatan keputusan #14. Footer sticky seperti form akun. Galat server lewat `applyServerErrors`. Menu baris: Arsipkan → toast "Aturan diarsipkan · Urungkan" (6 detik, pola `transaction-editor.tsx`), dan Pulihkan untuk baris terarsip.

**Acceptance criteria:**

- [ ] Tambah gaji (income, tanggal 25, gajian) dan tagihan (expense, tanggal 5) → keduanya tampil tanpa reload, jatuh tempo benar. Edit mengisi nilai lama dan menyimpan perubahan
- [ ] Mengubah tanggal pada aturan terlambat menampilkan peringatan, dan setelah simpan jatuh tempo = anchor terdekat ≥ hari ini
- [ ] Menandai aturan income lain sebagai gajian memindahkan lencana tanpa reload. Switch tidak tersedia untuk expense/saving
- [ ] Arsipkan → baris hilang, "Urungkan" mengembalikannya; gagal `DELETE` mengembalikan baris + toast error
- [ ] Galat 400 tampil di field yang benar. Input 16 px, target ≥ 44 px, keyboard tidak menutupi Simpan di 360×800

**Verification:**

- [ ] Manual 360×800 dan 1024
- [ ] `pnpm build` hijau

**Dependencies:** T81

**Files likely touched:** `components/forms/recurring-form.tsx`, `components/recurring/recurring-view.tsx`, `components/recurring/rule-row.tsx`

**Estimated scope:** M

---

### Checkpoint U

- [ ] Gerbang penuh hijau
- [ ] Alur tambah gaji + tagihan + setoran tabungan → daftar benar di 360×800 dan 1024
- [ ] Tukar gajian, arsip + undo, dan aturan tanggal 31 di bulan pendek sudah dicek manual
- [ ] Review dengan Yogi, termasuk keputusan Open questions #2–#5 di spec sebelum phase 23
