# Spec module: `budgets`

Status: draft · revisi 2026-10-31 (budget bernama) · @Yogi
Asal: sesi idea-refine 2026-10-31. Menggantikan model per kategori per bulan (2026-10-23, T42–T54). Plan: [tasks/plan.md](tasks/plan.md) § Budget bernama.
Bergantung pada: `accounts-categories`, `transactions` · Dipakai oleh: `dashboard`, `pwa-offline` · Indeks: [SPEC.md](SPEC.md)

## Objective

Pemilik mengelola beberapa **budget bernama**, misalnya "Jajan & Hiburan" Rp800.000 per bulan. Setiap budget mencakup beberapa kategori spending dari satu jenis (Needs atau Wants). Budget berlaku terus setiap bulan sampai diubah atau diakhiri, jadi bulan baru tidak perlu disiapkan. `/budget` menjawab "budget mana yang hampir habis": urut Melebihi → Hampir habis → Aman. Bulan lalu tampil seperti saat itu (nama, nominal, dan kategori yang berlaku waktu itu) dan hanya bisa dibaca.

Modul ini pemilik **kontrak** `/api/budgets*`, query `budgetUsage`, hook `useBudgetUsage`, dan fungsi murni `compareByAttention` / `summarizeBudgetUsage`. `dashboard` memakai `budgetUsage` untuk kartu Budget Summary.

Di luar cakupan: budget mingguan atau tahunan, rollover sisa ke bulan berikutnya, "berlaku mulai bulan depan", menyiapkan atau mengubah bulan lalu, saran 50/30/20, salin dari bulan lalu, budget untuk income atau saving, budget per akun, budget campuran Needs + Wants, notifikasi push, prediksi laju belanja (pace).

## Keputusan

Nomor 1–8 diputuskan Yogi pada 2026-10-31 (plan.md § Budget bernama, Keputusan perencanaan dan Open questions 1–3). Nomor 9–13 dibawa dari model lama tanpa perubahan.

1. **Budget bernama, berversi.** Satu baris tabel `budget_versions` = satu versi budget yang berlaku mulai `(year, month)` sampai ada versi yang lebih baru. `budget_id` adalah identitas lintas versi. Nama, jenis, nominal, dan kategori ikut versi, jadi bulan lalu tampil persis seperti saat itu.
2. **Satu jenis per budget.** `spending_type` (needs/wants) dipilih saat membuat dan terkunci. Semua kategori di budget harus `kind = spending` dengan `spending_type` yang sama. Pemilih kategori di form hanya menampilkan jenis terpilih.
3. **Semua tulisan berlaku di bulan berjalan** (Asia/Jakarta, dihitung server dengan `todayInJakarta()`). Client tidak pernah mengirim `period` untuk tulisan. Bulan lalu hanya-baca, dan tidak ada bulan depan. Mengubah budget di hari terakhir bulan ikut mengubah bulan itu (diterima, Open question 3).
4. **Satu kategori di paling banyak satu budget per bulan.** Dicek server di dalam transaksi DB yang memegang `pg_advisory_xact_lock(hashtext(user_id))`, jadi dua tulisan paralel tidak bisa mengklaim kategori yang sama. Invarian `summary.total.spent = expense bulan itu` bergantung pada aturan ini.
5. **Nama unik tanpa beda huruf besar** di antara budget yang tampil di bulan berjalan → 409 `BUDGET_NAME_TAKEN` (Open question 2). Nama budget yang sudah berakhir boleh dipakai lagi.
6. **Simpan dua kali di bulan yang sama = satu versi.** Upsert pada `(user_id, budget_id, year, month)`. `PATCH` yang sama dua kali menghasilkan keadaan yang sama.
7. **Hapus = akhiri mulai bulan ini**, dengan Urungkan. Bulan lalu tetap. Budget yang dibuat dan diakhiri di bulan yang sama tidak tampil di bulan mana pun.
8. **Data lama dimigrasi sebagai riwayat dan berakhir di bulan cutover** (Open question 1): bulan lalu tampil persis seperti sebelum cutover, bulan berjalan mulai kosong, dan pemilik membuat budget bernama baru. Baris lama untuk bulan sesudah cutover diabaikan.
9. **Terpakai = `sum(amount)` transaksi `expense` tak terhapus** dengan `date` di bulan itu. Transfer, adjustment, dan saving tidak dihitung. Biaya admin transfer adalah expense biasa, jadi ikut.
10. **Status:** `ok` (< 80%), `warning` (≥ 80% dan sisa > 0), `over` (sisa ≤ 0, atau budget 0 dengan pengeluaran > 0), dari satu fungsi murni `budgetStatus()` yang dipakai server dan client. `none` hanya tersisa untuk ringkasan grup tanpa budget.
11. **`amount` 0..1e12.** Budget 0 berarti "jangan belanja di kategori-kategori ini".
12. **Arsip kategori tidak menyentuh budget.** Kategori terarsip yang sudah ada di versi efektif boleh tetap di budget dan pengeluarannya tetap terhitung (berlabel "(arsip)"). Kategori terarsip tidak bisa ditambahkan ke budget.
13. **Respons memakai id kategori**, nama kategori di-resolve di client dari `useCategories({ includeArchived: true })`. Nama budget ikut di respons karena berversi.

## Perubahan skema

Disetujui lewat T107. Expand → switch → contract, karena DB dipakai bersama oleh tes dan produksi (SPEC.md § Testing strategy).

| Langkah                  | Objek                                     | Isi                                                                                                       |
| ------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Expand (T110, additive)  | tabel baru `budget_versions`              | lihat di bawah. `budgets` tidak disentuh, kode produksi lama tetap jalan                                    |
| Backfill (T121, kustom)  | `budget_versions`                         | salin baris `budgets` aktif ≤ bulan cutover, lihat [Migrasi dan cutover](#migrasi-dan-cutover)              |
| Contract (T122)          | tabel `budgets`                           | `DROP TABLE "budgets"` setelah produksi terverifikasi                                                     |

**`budget_versions`** (`pgTable.withRLS`, RLS deny-all seperti tabel lain):

| Kolom           | Tipe                                                                        |
| --------------- | --------------------------------------------------------------------------- |
| `id`            | `uuid pk default gen_random_uuid()` (id baris, internal)                    |
| `user_id`       | `text not null references users(id) on delete cascade`                      |
| `budget_id`     | `uuid not null` (identitas budget lintas versi, dibuat server)              |
| `name`          | `text not null`                                                             |
| `spending_type` | `text not null check in ('needs','wants')`                                  |
| `year`          | `int not null`                                                              |
| `month`         | `int not null check 1..12`                                                  |
| `amount`        | `bigint not null check >= 0`                                                |
| `category_ids`  | `uuid[] not null check cardinality(category_ids) >= 1`                      |
| `created_at`    | `timestamptz not null default now()`                                        |
| `deleted_at`    | `timestamptz null` (terisi = budget berakhir mulai bulan versi ini)          |

Unik `(user_id, budget_id, year, month)`. Elemen `category_ids` tidak punya FK: kepemilikan dan jenis dicek saat tulis, dan kategori tidak pernah di-hard-delete. Tidak ada index lain. Bila `EXPLAIN` menunjukkan perlu, itu Ask first.

**Versi efektif bulan P** untuk sebuah `budget_id` = baris dengan `(year, month)` terbesar yang ≤ P. Budget **tampil** di P bila versi efektifnya ada dan `deleted_at is null`. Kategori efektif = `unnest(category_ids)` versi itu.

## Kontrak API

Semua route memakai `withAuth`, memfilter `user_id` dari session, dan format error dari `lib/api/errors.ts`. `[id]` di path adalah `budget_id`. Id yang bukan UUID, tidak ada, milik user lain, atau budget yang tidak tampil di bulan berjalan → **404 `BUDGET_NOT_FOUND`** (pengecualian `DELETE`/`restore` di bawah).

### Tipe

```ts
// lib/schemas/budget.ts (tulis) dan lib/schemas/budget-usage.ts (baca), dipakai client & server
type BudgetPeriod = string; // YYYY-MM
type SpendingType = "needs" | "wants";
type BudgetStatus = "none" | "ok" | "warning" | "over";

type BudgetVersion = {
  id: string; // budget_id
  name: string;
  spendingType: SpendingType;
  amount: number; // integer rupiah, 0..1e12
  categoryIds: string[];
  period: BudgetPeriod; // bulan versi ini berlaku
  deletedAt: string | null;
};

type BudgetUsageItem = {
  budgetId: string;
  name: string;
  spendingType: SpendingType;
  budget: number;
  spent: number;
  remaining: number; // budget − spent, boleh negatif
  percent: number | null; // floor(spent * 100 / budget), null bila budget 0
  status: BudgetStatus; // ok | warning | over
  categories: { categoryId: string; spent: number }[]; // kategori efektif, urut lower(nama)
};

type BudgetGroup = {
  budget: number; // jumlah budget yang tampil
  spent: number; // semua expense di grup, termasuk kategori tanpa budget
  unbudgetedSpent: number; // bagian dari spent yang kategorinya tidak ada di budget mana pun
};

type BudgetUsage = {
  period: BudgetPeriod;
  items: BudgetUsageItem[];
  unbudgeted: { categoryId: string; spendingType: SpendingType; spent: number }[];
  summary: { needs: BudgetGroup; wants: BudgetGroup; total: BudgetGroup };
};
```

### Route

| Method & path                    | Body / query                                  | Sukses                                       | Error                              |
| -------------------------------- | --------------------------------------------- | -------------------------------------------- | ---------------------------------- |
| `GET /api/budgets/usage`         | `?period=YYYY-MM` (2000-01..bulan berjalan)   | 200 `BudgetUsage`                            | 400                                |
| `POST /api/budgets`              | `{ name, spendingType, amount, categoryIds }` | 201 `BudgetVersion`                          | 400, 409 `BUDGET_NAME_TAKEN`       |
| `PATCH /api/budgets/[id]`        | `{ name?, amount?, categoryIds? }` (min 1)    | 200 `BudgetVersion`                          | 400, 404, 409 `BUDGET_NAME_TAKEN`  |
| `DELETE /api/budgets/[id]`       | —                                             | 200 `BudgetVersion` (`deletedAt`). Idempoten | 404                                |
| `POST /api/budgets/[id]/restore` | —                                             | 200 `BudgetVersion` (aktif). Idempoten       | 404, 409 `BUDGET_RESTORE_CONFLICT` |

Dihapus bersama model lama: `GET /api/budgets`, `PUT /api/budgets`, `POST /api/budgets/copy` (T109), `GET /api/budgets/suggestion` (T108). Path baca sengaja baru (`/usage`), supaya respons bentuk lama yang di-cache service worker untuk `/api/budgets?period=` tidak pernah tersaji ke kode baru.

### Validasi (Zod)

- `period` (query baca): regex `^\d{4}-(0[1-9]|1[0-2])$`, lalu rentang 2000-01..bulan berjalan dengan `todayInJakarta()` saat parse. Hilang, `2026-13`, `1999-12`, atau bulan depan → 400 `fields.period`.
- `name`: trim, 1–50 karakter (sama dengan nama kategori). `amount`: `z.int()`, 0..1e12. `spendingType`: `needs | wants`.
- `categoryIds`: `z.array(z.uuid()).min(1).max(50)`, refine unik.
- `budgetCreateSchema` dan `budgetUpdateSchema` memakai `z.strictObject`. Field tak dikenal (termasuk `userId`, `period`, dan `spendingType` di `PATCH`) → 400. `PATCH` tanpa field → 400.
- Penolakan kategori hanya punya dua pesan, keduanya di `fields.categoryIds`:
  - "Kategori tidak valid": milik user lain, tidak ada, bukan spending, beda jenis dengan budget, atau terarsip yang baru ditambahkan. Pesannya sama supaya tidak membocorkan data user lain.
  - "Kategori sudah dipakai budget lain": kategori ada di budget lain yang tampil di bulan berjalan.

### Aturan tulis

Setiap tulisan berjalan dalam satu `db.transaction`: `pg_advisory_xact_lock(hashtext(userId))` → cek → upsert. M = bulan berjalan. Lock level transaksi dilepas saat commit, jadi aman di pooler transaction mode.

- **`POST`:** cek kategori (milik user, aktif, spending, jenis sama, tidak dipakai budget lain yang tampil di M) dan nama unik. Insert versi M dengan `budget_id` baru.
- **`PATCH`:** ambil versi efektif M (harus tampil), gabungkan field, cek seperti `POST` dengan mengecualikan budget ini sendiri. Kategori terarsip yang sudah ada di versi efektif boleh tetap. Ganti nama ke nama sendiri dengan huruf beda → 200. Upsert versi M (`on conflict (user_id, budget_id, year, month) do update`, `created_at` tetap).
- **`DELETE`:** bila versi efektif M tampil: bila M sudah punya versi → `deleted_at = coalesce(deleted_at, now())`; bila belum → sisipkan versi M yang menyalin versi efektif dengan `deleted_at = now()`. Bila budget sudah berakhir **di M** → 200 tanpa perubahan (idempoten). Bila tidak ada versi ≤ M, atau budget berakhir sebelum M → 404.
- **`restore`:** hanya untuk budget yang berakhir di M: kosongkan `deleted_at` versi M setelah cek ulang nama dan kategori. Bentrok → 409 `BUDGET_RESTORE_CONFLICT` ("Tidak bisa dipulihkan: kategori atau nama sudah dipakai budget lain"). Budget yang sudah tampil → 200 tanpa perubahan. Budget yang berakhir sebelum M → 404.

### Query `budgetUsage`

`lib/server/queries/budget-usage.ts`, `budgetUsage(userId, period)`, satu query SQL:

- `distinct on (budget_id)` versi efektif per budget dengan `(year, month) ≤ period`, hanya yang tampil.
- `unnest(category_ids)` → kategori efektif, left join subquery `sum(amount)` expense tak terhapus per `category_id` dalam `monthRange(period)`.
- `items` urut `spending_type` (needs, wants), lalu `lower(name)`. Halaman dan dashboard mengurutkan ulang dengan `compareByAttention`.
- `unbudgeted`: kategori spending (termasuk terarsip) dengan `spent > 0` yang tidak ada di budget tampil mana pun bulan itu.
- `remaining`, `percent`, `status` dihitung di TS dengan `budgetStatus()`. `summary` dari `summarizeBudgetUsage(items, unbudgeted)` (`lib/budget-status.ts`, murni), yang juga dipakai update optimistic. Ini puluhan baris yang sudah teragregasi, bukan agregasi baris transaksi di client.

**Invarian (dites):** `summary.total.spent = transactionTotals(userId, { from, to }).expense` untuk bulan yang sama, termasuk saat sebuah kategori pindah budget di bulan berikutnya.

### Kontrak untuk modul lain

- **`dashboard`:** pakai `useBudgetUsage(period)`, key `apiKey("budgets", { path: "usage", query: { period } })` = `"/api/budgets/usage?period=YYYY-MM"`, jadi cache dibagi dengan `/budget`. Urutan sorotan memakai `compareByAttention` (Melebihi → Hampir habis → Aman, lalu persen turun, lalu nama). Baris Budget Summary menaut ke `/budget?period=YYYY-MM`. Server component yang butuh data langsung memanggil `budgetUsage(userId, period)`.
- **Drill-down ke transaksi** tanpa mengubah kontrak transactions: sheet budget berisi rincian per kategori, masing-masing ke `/transactions?period=YYYY-MM&type=expense&categoryId=<uuid>`.
- **Revalidasi:** resource `budgets` (base `/api/budgets`) sudah mencakup `/api/budgets/usage`. `AFFECTS` tidak berubah: `transactions → budgets`, `categories → budgets` (status arsip mengubah pilihan di form). Setiap mutasi budget memanggil `invalidate("budgets")`.
- **`pwa-offline`:** budget tidak diantre offline (keputusan #6 pwa-offline). `GET /api/budgets/usage` ikut cache NetworkFirst `/api/*`, jadi `/budget` yang pernah dibuka tampil offline.

## Migrasi dan cutover

1. **T121:** migrasi kustom `drizzle-kit generate --custom --name budget_versions_backfill`, SQL saja, sekali jalan, tercatat di journal. Di-commit tetapi **belum dijalankan**. M = bulan `now()` di Asia/Jakarta saat migrasi dijalankan.
2. **Aturan backfill**, per `(user, kategori)` dengan baris `budgets` aktif ≤ M:
   - satu `budget_id` baru; nama = nama kategori; jenis = jenis kategori;
   - satu versi per baris lama aktif (`category_ids = {kategori}`, `amount` dan `created_at` lama);
   - bila bulan sesudah sebuah baris tidak punya baris aktif dan ≤ M → versi akhir (`deleted_at = now()`) di bulan itu;
   - bila baris terakhir tepat di M → versi M diakhiri (keputusan #8);
   - baris sesudah M dan baris yang sudah di-soft-delete tidak disalin.
3. **T122:** merge dan deploy dulu (kode baru mengabaikan `budgets`), cadangkan `budgets`, `db:migrate` backfill, verifikasi total Needs/Wants/Total dua bulan lalu terhadap screenshot sebelum cutover, lalu hapus tabel di `db/schema.ts` → `generate --explain` hanya `DROP TABLE "budgets"` → `db:migrate`. Setiap langkah tulis berhenti untuk persetujuan Yogi.

## Deliverables

### 1. Server

- `db/schema.ts`: `budgetVersions`; migrasi `drizzle/<timestamp>_budget_versions/` (T110), backfill (T121), drop `budgets` (T122).
- `lib/schemas/budget.ts`: `budgetName`, `budgetCreateSchema`, `budgetUpdateSchema`, `BudgetVersion`. `lib/schemas/budget-usage.ts`: tipe baca dan `budgetUsageQuerySchema`.
- `lib/budget-status.ts` (murni): `budgetStatus`, `summarizeBudgetUsage`, `compareByAttention`.
- `lib/server/budgets.ts`: `createBudget`, `updateBudget`, `endBudget`, `restoreBudget`.
- `lib/server/queries/budget-usage.ts`: `budgetUsage(userId, period)`.
- `lib/api/errors.ts`: `budgetNameTaken()`, `budgetRestoreConflict()` (`budgetNotFound()` sudah ada).
- Route: `app/api/budgets/route.ts` (`POST`), `usage/route.ts`, `[id]/route.ts` (`PATCH`, `DELETE`), `[id]/restore/route.ts`.

### 2. Client

- `hooks/use-budgets.ts`: `useBudgetUsage(period)`, mutasi `createBudget`, `updateBudget`, `deleteBudget` (optimistic `endBudgetInUsage`, rollback lewat `removeOptimistically`), `restoreBudget`. Mutasi memanggil `invalidate("budgets")` dan melempar `ApiError`.
- `lib/budget-cache.ts` (murni): `endBudgetInUsage(usage, budgetId)`: item keluar, pengeluaran kategorinya pindah ke `unbudgeted`, `summary` dihitung ulang dengan `summarizeBudgetUsage`.
- Pilihan kategori dari fungsi murni `budgetCategoryOptions({ categories, usage, budgetId, spendingType })`: hanya jenis terpilih, status `free` / `own` / `taken` (dengan nama budget pemiliknya), terarsip hanya bila `own`.
- Tidak ada data budget di Zustand.

### 3. UI

- **`app/(app)/budget/page.tsx`**, di dalam `<Suspense>` karena memakai `useSearchParams`. Isi di `components/budgets/budget-view.tsx`.
  - **Header:** stepper bulan, maks bulan berjalan, periode di URL lewat `router.replace`. Tombol "Tambah budget" hanya di bulan berjalan.
  - **Ringkasan:** kartu Total, Needs, Wants (bentuk `BudgetGroup` sama dengan model lama). `hideAmounts` menyamarkan nominal.
  - **Daftar** urut `compareByAttention`. Baris: nama budget, jenis, "Rp terpakai dari Rp budget · 85%", sisa atau "Lebih Rp…", progress bar, teks status ("Hampir habis", "Melebihi budget"). Warna `--budget` untuk `warning`, `--expense` untuk `over`.
  - **Tanpa budget:** satu baris di bawah daftar, "Rp… tanpa budget · Kesehatan, Hadiah" (dari `unbudgeted`).
  - **Form** `components/forms/budget-form.tsx` di `ResponsiveModal`, urutan field: Nama, Nominal per bulan (`MoneyInput`), Needs/Wants (`ToggleGroup` seperti `category-form.tsx`, terkunci saat edit), Kategori (checkbox; kategori milik budget lain disabled dengan teks "di {nama}"). Ganti jenis saat membuat → pilihan dikosongkan. Galat server dipasang lewat `applyServerErrors`.
  - **Sheet budget** (tap baris): rincian per kategori dengan tautan drill-down, lalu form edit dan "Hapus budget" (bulan berjalan saja). Bulan lalu: rincian saja, tanpa field dan tombol. Hapus → toast "Budget dihapus · Urungkan".
  - Empty state: tanpa kategori spending aktif → "Tambah kategori" (`open("manageCategories", { kind: "spending" })`). Bulan berjalan tanpa budget → "Belum ada budget. Budget yang kamu buat berlaku tiap bulan sampai diubah." plus tombol tambah. Bulan lalu tanpa budget → "Tidak ada budget yang berlaku di {bulan}." (`emptyBudgetMessage`, dipakai juga Budget Summary dashboard). Skeleton saat memuat, error SWR dengan "Coba lagi".
- Mobile: target sentuh ≥ 44×44 px, input 16 px, tanpa horizontal scroll di 360 px, kontras ≥ 4.5:1, footer `FormActions` sticky supaya daftar kategori panjang tidak menutupi Simpan. Progress bar `role="progressbar"` dengan `aria-valuenow` (dibatasi 100) dan label teks.

## Acceptance criteria

**API**

- [ ] `POST { name: "Jajan & Hiburan", spendingType: "wants", amount: 800000, categoryIds: [Jajan, Hiburan] }` → 201 dengan `period` bulan berjalan. `budgetUsage` bulan ini memuatnya, bulan lalu tidak.
- [ ] Versi Sep (Rp1.000.000, {Makan}) dan Nov (Rp1.200.000, {Makan, Jajan}): Agustus tidak tampil; Okt memakai versi Sep; Des memakai versi Nov. Versi Des dengan `deleted_at` → Des dan Jan tidak tampil, Nov tetap. Budget yang versi pertamanya Nov tidak tampil di Okt.
- [ ] `spent` budget = jumlah expense kategorinya di bulan itu (tanggal 1 dan hari terakhir ikut, Februari kabisat dites; transfer, saving, adjustment, terhapus, dan bulan lain tidak). `unbudgeted` benar, termasuk kategori terarsip. Invarian terhadap `transactionTotals` berlaku, juga saat kategori pindah budget.
- [ ] Status: 79% → `ok`, 80% → `warning`, 99,99% → `warning`, 100% → `over`, budget 0 + spent 0 → `ok`, budget 0 + spent > 0 → `over`.
- [ ] Kategori needs di budget wants, income/saving, terarsip, milik B, atau tidak ada → 400 `fields.categoryIds` "Kategori tidak valid", nol baris tertulis. Kategori milik budget lain bulan ini → 400 "Kategori sudah dipakai budget lain". Nama sama dengan beda huruf besar → 409 `BUDGET_NAME_TAKEN`. Body tidak valid, `userId` atau `period` di body → 400.
- [ ] Dua `POST` paralel yang mengklaim kategori yang sama → tepat satu 201 dan satu 400.
- [ ] `PATCH { amount }` pada budget dengan versi bulan lalu → versi baru di bulan berjalan, bulan lalu tetap nominal, nama, dan kategori lama. `PATCH` kedua di bulan yang sama → tetap satu versi bulan ini. Kategori terarsip yang sudah ada boleh tetap, yang baru ditolak. `spendingType` atau body kosong → 400.
- [ ] `DELETE` → budget tidak tampil di bulan ini dan sesudahnya, bulan lalu tetap. Diulang → 200 tanpa perubahan. `restore` mengembalikannya. Kategori atau nama sudah dipakai budget lain → 409 `BUDGET_RESTORE_CONFLICT`. Budget yang dibuat dan dihapus di bulan yang sama tidak tampil di bulan mana pun.
- [ ] `period` hilang, `2026-13`, `1999-12`, atau bulan depan → 400 `fields.period`.
- [ ] **Isolasi:** B mendapat 404 untuk `PATCH`/`DELETE`/`restore` budget A, `GET` B tidak pernah memuat budget, kategori, atau pengeluaran A, dan B tidak bisa memakai kategori A.
- [ ] Tanpa session, semua route → 401 `UNAUTHORIZED`.

**UI (manual di 360 px dan 1024 px)**

- [ ] Tambah "Jajan & Hiburan" Rp800.000 (Jajan, Hiburan) → catat expense Jajan 700.000 dari **+** → kembali ke `/budget`: "Hampir habis" 87% tanpa reload, dan budget itu naik ke atas.
- [ ] Kategori yang sudah dipakai tampil disabled di form budget lain. Needs/Wants memfilter pilihan kategori.
- [ ] Ubah nominal di bulan berjalan → bulan lalu tidak berubah. Bulan lalu tidak bisa diedit, stepper berhenti di bulan berjalan.
- [ ] Hapus budget → hilang dari bulan ini, bulan lalu tetap. "Urungkan" mengembalikannya. `DELETE` gagal mengembalikan baris dan menampilkan toast error.
- [ ] Status terbaca tanpa warna, layout benar di 360 px, target sentuh ≥ 44 px, input 16 px.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

**Cutover**

- [ ] Produksi: dua bulan lalu yang punya budget lama menampilkan total Needs/Wants/Total yang sama dengan sebelum cutover. Bulan berjalan bisa diisi budget bernama.

## Tes

- **Unit (`tests/unit/`):**
  - `budget-schema.spec.ts`: `budgetName`, `amount`, `categoryIds` unik/batas, `strictObject` (`userId`, `period`, `spendingType` di `PATCH`), `PATCH` kosong.
  - `budget-status.spec.ts`: batas 80% dan 100%, budget 0, `summarizeBudgetUsage`, `compareByAttention`.
  - `budget-cache.spec.ts`: `endBudgetInUsage` (pengeluaran pindah ke `unbudgeted`, summary sama dengan hasil server).
  - `budget-format.spec.ts`: `budgetCategoryOptions` (jenis, `free`/`own`/`taken`, terarsip).
  - `use-budgets.spec.ts`: key, optimistic delete dan rollback.
- **API (`tests/api/`, Supabase sungguhan, user `test-<uuid>`):**
  - `db-constraints.spec.ts`: constraint `budget_versions` dan cascade.
  - `budget-usage.spec.ts`: versi efektif, batas bulan, `unbudgeted`, kategori terarsip, invarian, validasi `period`, isolasi, 401.
  - `budgets.spec.ts`: `POST`/`PATCH`/`DELETE`/`restore`, validasi kategori, nama unik, paralel, isolasi, 401.
  - `budget-backfill.spec.ts` (T121): aturan backfill di dalam transaksi yang di-rollback.
- **E2E:** tetap ditunda (SPEC.md Open question #2).

## Struktur file

```
app/api/budgets/{route.ts, usage/route.ts, [id]/route.ts, [id]/restore/route.ts}
app/(app)/budget/page.tsx
components/budgets/                       # budget-view, budget-summary, budget-row, budget-sheet, month-stepper
components/forms/budget-form.tsx
hooks/use-budgets.ts
lib/schemas/{budget.ts, budget-usage.ts}, lib/budget-status.ts, lib/budget-cache.ts, lib/budget-format.ts
lib/server/budgets.ts, lib/server/queries/budget-usage.ts
db/schema.ts, drizzle/<timestamp>_budget_versions/, drizzle/<timestamp>_budget_versions_backfill/
tests/unit/*.spec.ts, tests/api/*.spec.ts
```

Perintah, gaya kode, dan format error mengikuti [SPEC.md](SPEC.md). Menjalankan satu berkas tes: `pnpm vitest run tests/api/budgets.spec.ts`.

## Boundaries (khusus modul ini)

- **Always:** advisory lock per user di setiap tulisan budget, bulan tulisan dari server, upsert pada kunci unik (bukan cek-lalu-insert), hitung terpakai di DB, satu `budgetStatus()` dan satu `summarizeBudgetUsage()` untuk server dan client, `invalidate("budgets")` setelah setiap mutasi, `generate --explain` dan baca `migration.sql` sebelum setiap `db:migrate`.
- **Ask first:** budget untuk saving/income, budget campuran Needs + Wants, index baru, kolom baru di `budget_versions`, mengubah ambang 80%, tulisan ke bulan selain bulan berjalan, menjalankan backfill atau drop `budgets` di DB bersama.
- **Never:** hard delete versi budget (selain cascade user), menerima `userId` atau `period` dari body, mengubah versi bulan lalu, menghitung terpakai dari transaksi di client, menyalin budget ke Zustand, memakai server action.

## Risiko

- **SQL versi efektif salah** (versi lama/baru, budget berakhir, batas bulan): tes merah dulu di T111 dengan versi di beberapa bulan dan baris akhir.
- **Kategori terhitung di dua budget** (tap ganda, dua tab): advisory lock + tes paralel, invarian dites.
- **Migrasi di DB bersama:** expand additive, backfill di cutover, drop terakhir, cadangan `budgets` sebelum drop.
- **Backfill membawa budget melewati bulan kosong:** versi akhir di bulan sesudah celah, dites di transaksi yang di-rollback.
- **Zona waktu bulan:** batas bulan dari string `YYYY-MM` lewat `monthRange`, bukan `Date` lokal.
- **`cacheComponents`:** `useSearchParams` di `/budget` wajib di dalam `<Suspense>`.

## Open questions

1. ~~Budget lama per kategori saat cutover~~ **Diputuskan 2026-10-31:** dimigrasi sebagai riwayat dan berakhir di bulan cutover (keputusan #8).
2. ~~Nama budget unik~~ **Diputuskan 2026-10-31:** unik tanpa beda huruf besar di antara budget yang tampil di bulan berjalan, 409 `BUDGET_NAME_TAKEN` (keputusan #5).
3. ~~"Berlaku mulai bulan depan"~~ **Diputuskan 2026-10-31:** tidak ada. Perubahan di hari terakhir bulan ikut mengubah bulan itu (keputusan #3).
