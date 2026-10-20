# Todo phase 5: Data akun & kategori

Plan: [plan-5.md](plan-5.md) · Index: [plan.md](plan.md) · Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T10: Migrasi tipe transaksi `adjustment`

**Description:** Ubah tiga check di `transactions` (`type`, `amount`, `category`) dan definisi view `account_balances` di `db/schema.ts` sesuai tabel di spec § Transaksi penyesuaian. Generate migrasi, baca SQL-nya, lalu migrate ke Supabase. Tes ditulis lebih dulu (merah), lalu migrasi membuatnya hijau. `lib/transaction-types.ts` **tidak** diubah.

**Acceptance criteria:**
- [x] `adjustment` positif dan negatif tanpa kategori diterima. `adjustment` dengan kategori, `amount = 0`, atau `to_account_id` ditolak. `expense` dengan `amount < 0` tetap ditolak
- [x] `account_balances`: saldo awal 100.000 + adjustment +50.000 + adjustment −30.000 (satu soft-deleted −5.000 diabaikan) → 120.000
- [x] Semua tes constraint dan saldo yang sudah ada tetap hijau

**Verification:**
- [x] `pnpm test tests/api/db-constraints.spec.ts tests/api/account-balances.spec.ts` hijau
- [x] Manual: baca `drizzle/<timestamp>_*/migration.sql`. Isinya hanya drop/add constraint dan replace view, tanpa `drop column`/`alter column`
- [x] `pnpm db:migrate` sukses di Supabase

**Dependencies:** None (foundation selesai)

**Files likely touched:** `db/schema.ts`, `drizzle/<timestamp>_adjustment/*`, `tests/api/db-constraints.spec.ts`, `tests/api/account-balances.spec.ts`

**Estimated scope:** S

---

### T11: Seed kategori default saat login

**Description:** Konstanta `DEFAULT_CATEGORIES` (16 item persis seperti tabel spec) di `lib/default-categories.ts`, dan `seedDefaultCategories(tx, userId)` di `lib/server/categories.ts` sebagai satu statement idempoten. `upsertUser` memanggilnya dalam `db.transaction` setelah upsert user.

**Acceptance criteria:**
- [x] `upsertUser` untuk user baru → 16 kategori dengan `kind`/`spendingType` sesuai tabel. `upsertUser` kedua tidak menambah baris
- [x] User yang sudah ada tanpa kategori ter-seed. User yang semua kategorinya diarsipkan **tidak** di-seed ulang
- [x] Dua `upsertUser` paralel untuk user yang sama → tepat 16 baris, tanpa error

**Verification:**
- [x] `tests/unit/default-categories.spec.ts` (16 item, unik per kind, spending selalu punya `spendingType`) dan `tests/api/seed-categories.spec.ts` hijau
- [x] `tests/api/upsert-user.spec.ts` yang sudah ada tetap hijau
- [ ] Manual (Yogi): logout → login → Drizzle Studio menunjukkan 16 kategori untuk owner

**Dependencies:** None (foundation selesai)

**Files likely touched:** `lib/default-categories.ts`, `lib/server/categories.ts`, `lib/server/users.ts`, `tests/unit/default-categories.spec.ts`, `tests/api/seed-categories.spec.ts`

**Estimated scope:** M

---

### T12: `GET`/`POST /api/accounts` dengan saldo

**Description:** Schema Zod akun (`accountCreateSchema`, `accountUpdateSchema`, enum type/subtype, tipe `Account`) di `lib/schemas/account.ts`. Query `listAccounts(userId, { includeArchived })` di `lib/server/accounts.ts` join `account_balances` dan menghitung saldo awal efektif di SQL. Route `GET` (urut type lalu `lower(name)`, `?include=archived`) dan `POST` (409 `ACCOUNT_NAME_TAKEN` via `onConflictDoNothing`). Helper `isUniqueViolation` di `lib/server/pg-errors.ts` disiapkan untuk T13 dan T15.

**Acceptance criteria:**
- [x] `POST { name: "BCA", type: "transaction", initialBalance: 100000 }` → 201 `Account` dengan `balance = 100000`. `initialBalance: -500000` diterima. `1.5`, `"100"`, `> 1e12`, nama kosong/51 karakter → 400 dengan `fields`
- [x] `balance` sama dengan `account_balances` setelah income, expense, transfer, dan adjustment yang dimasukkan langsung ke DB. Nama duplikat beda huruf besar/kecil → 409
- [x] Isolasi: `GET` user B tidak berisi akun A. `userId` di body diabaikan. Tanpa session → 401

**Verification:**
- [x] `tests/unit/account-schema.spec.ts` dan `tests/api/accounts.spec.ts` (bagian GET/POST) hijau
- [x] `pnpm build` hijau
- [x] Manual: `curl` `GET /api/accounts` tanpa cookie → 401 JSON

**Dependencies:** T10 (fixture adjustment di tes saldo)

**Files likely touched:** `lib/schemas/account.ts`, `lib/server/accounts.ts`, `lib/server/pg-errors.ts`, `app/api/accounts/route.ts`, `tests/unit/account-schema.spec.ts`, `tests/api/accounts.spec.ts`

**Estimated scope:** M

---

### T13: `PATCH`/`DELETE`/`restore` akun + adjustment saldo awal

**Description:** `updateAccount(userId, id, input)` di `lib/server/accounts.ts`: dalam `db.transaction`, `select … for update` baris akun milik user, hitung saldo awal efektif, update `name`/`type`/`subtype`, dan insert `adjustment` sebesar selisih jika `initialBalance` dikirim dan berbeda (tanggal `todayInJakarta()`, deskripsi "Penyesuaian saldo awal"). Route `PATCH`/`DELETE` di `app/api/accounts/[id]/route.ts`, `POST` di `.../restore/route.ts`. Arsip/restore idempoten.

**Acceptance criteria:**
- [ ] Skenario spec: awal 100.000 + expense 20.000 → `PATCH { initialBalance: 150000 }` → `initialBalance 150000`, `balance 130000`, kolom `initial_balance` tetap 100.000, satu adjustment +50.000. Lalu `PATCH` 90.000 → adjustment −60.000. Nilai yang sama tidak membuat baris. Dua `PATCH` paralel (120.000 dan 130.000) berakhir di salah satunya, dengan total adjustment yang konsisten
- [ ] Rename ke nama yang sudah dipakai (termasuk akun terarsip) → 409. `DELETE` → `archivedAt` terisi dan hilang dari `GET` default. `DELETE` kedua tidak mengubah `archivedAt`. `restore` → aktif lagi. Baris tidak pernah terhapus
- [ ] Id bukan UUID, tidak ada, atau milik user B → 404 `ACCOUNT_NOT_FOUND` untuk ketiga route. Body kosong `{}` di `PATCH` → 400

**Verification:**
- [ ] `tests/api/accounts.spec.ts` (bagian PATCH/DELETE/restore, isolasi, paralel) hijau
- [ ] `pnpm build` hijau

**Dependencies:** T10, T12

**Files likely touched:** `lib/server/accounts.ts`, `app/api/accounts/[id]/route.ts`, `app/api/accounts/[id]/restore/route.ts`, `tests/api/accounts.spec.ts`

**Estimated scope:** M

---

### Checkpoint D: setelah T10–T13

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Migrasi sudah jalan di Supabase
- [ ] Manual: owner ter-seed 16 kategori setelah login ulang. Alur `curl` buat → ubah saldo awal → arsip → restore sesuai spec
- [ ] Review dengan Yogi sebelum phase 6
