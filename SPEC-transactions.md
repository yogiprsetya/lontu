# Spec module: `transactions`

Status: draft · 2026-10-21 · @Yogi
Bergantung pada: `accounts-categories` · Dipakai oleh: `budgets`, `dashboard`, `pwa-offline` · Indeks: [SPEC.md](SPEC.md)

## Objective

Pengguna mencatat income, expense, saving, dan transfer dari ponsel dalam beberapa tap, lalu melihat, memfilter, mengedit, menghapus (dengan undo), dan mengekspor riwayatnya. Saldo akun ikut berubah tanpa reload.

Modul ini pemilik **kontrak** `/api/transactions*`, hook SWR-nya, dan aturan filter/cursor yang dipakai `dashboard` (tautan drill-down) dan `pwa-offline` (antrean offline).

Di luar cakupan: budget dan dashboard, antrean offline, scan struk (`receipt_url` tidak dipakai), transaksi berulang, pencarian teks, rentang tanggal bebas, aksi massal, layar sampah (trash), undo untuk create/edit, penautan baris biaya admin ke transfer induknya.

## Keputusan

Nomor 1–3 diputuskan Yogi pada 2026-10-21 (menjawab Open questions #3–#5 di SPEC.md). Sisanya usulan untuk direview.

1. **Biaya admin transfer masuk MVP, tanpa tautan.** Form transfer punya checkbox "Biaya admin" (nominal + kategori spending). Server menulis transfer dan satu `expense` dalam satu transaksi DB. Setelah tersimpan, kedua baris berdiri sendiri: edit/hapus transfer tidak menyentuh biaya admin. Tidak ada kolom baru (lihat [Risiko](#risiko)).
2. **`/expenses` = preset filter.** Halaman itu merender komponen daftar yang sama dengan `type=expense` terkunci. Entri sidebar tetap.
3. **Saldo kurang = peringatan non-blokir** di form, hanya untuk akun yang bukan `credit_card`. Server tidak menolak apa pun (saldo negatif diizinkan, keputusan #5 accounts-categories).
4. **Tipe transaksi tidak bisa diubah** lewat edit (`PATCH` menolak `type`), sama seperti `kind` kategori. Salah tipe → hapus dan buat ulang.
5. **Tanggal:** `2000-01-01 ≤ date ≤ hari ini (Asia/Jakarta)`. Tanggal masa depan ditolak karena saldo di view menghitung semua baris tak terhapus, dan transaksi terjadwal adalah Fase 2. Form memakai `<input type="date">` native (font 16 px, picker bawaan ponsel), tanpa dependency kalender baru.
6. **Hapus = soft delete + undo.** `DELETE` mengisi `deleted_at`, `restore` mengosongkannya. Tidak ada batas waktu di server. UI menawarkan "Urungkan" di toast selama 6 detik, tanpa layar sampah.
7. **Optimistic hanya untuk hapus dan urungkan.** Create dan edit menunggu server (form sedang terbuka, rollback setelah navigasi akan menghilangkan input pengguna), lalu navigasi dan revalidasi. `pwa-offline` yang menambah optimistic create bersama antreannya.
8. **Respons hanya berisi id.** Nama akun/kategori di-resolve di client dari `useAccounts({ includeArchived: true })` dan `useCategories({ includeArchived: true })`, jadi rename kategori langsung terlihat di semua baris cache. Ekspor CSV yang menggabungkan nama di server.
9. **Urutan daftar** `date desc, created_at desc, id desc` (yang terbaru dicatat tampil paling atas di harinya). Cursor memuat ketiganya. Lihat [Cursor](#cursor).
10. **Filter hidup di URL, bukan di `usePeriodStore`.** `/transactions` tidak membaca store itu. Modul lain yang menautkan ke daftar harus menyusun URL lengkap (lihat [Kontrak untuk modul lain](#kontrak-untuk-modul-lain)).
11. **Paginasi dengan tombol "Muat lebih banyak"** (target ≥ 44 px), bukan infinite scroll otomatis.
12. **Total** mencakup `income`, `expense`, `saving` pada himpunan yang terfilter. `transfer` dan `adjustment` tidak dihitung. Baris biaya admin adalah `expense` biasa, jadi ikut terhitung.
13. **Label UI** mengikuti keputusan #10 accounts-categories: nav bahasa Inggris, tombol/form/pesan bahasa Indonesia. `adjustment` berlabel "Penyesuaian".

Tidak ada perubahan skema dan tidak ada migrasi baru. `receipt_url` dibiarkan kosong.

## Aturan domain

| Tipe         | Efek pada saldo                                                         | Kategori                 | Field                                         |
| ------------ | ----------------------------------------------------------------------- | ------------------------ | --------------------------------------------- |
| `income`     | `+amount` pada `account_id`                                             | wajib, `kind = income`   | `accountId`, `categoryId`                     |
| `expense`    | `−amount`                                                               | wajib, `kind = spending` | idem                                          |
| `saving`     | `−amount` (uang pindah ke tabungan, tidak dihitung sebagai pengeluaran) | wajib, `kind = saving`   | idem                                          |
| `transfer`   | `−amount` di `account_id`, `+amount` di `to_account_id`                 | tidak ada                | `accountId`, `toAccountId` (≠ `accountId`)    |
| `adjustment` | bertanda                                                                | tidak ada                | dibuat hanya oleh modul `accounts-categories` |

- Efek saldo dihitung view `account_balances`, bukan TS. Modul ini tidak menulis saldo.
- Pemetaan tipe → `kind` kategori memakai `CATEGORY_KIND_FOR` dari `lib/schemas/category.ts`.
- `adjustment` tampil di daftar, bisa difilter, bisa di-soft-delete (saldo awal efektif ikut bergeser), tetapi **tidak bisa dibuat atau diedit** lewat API ini.
- Referensi (`accountId`, `toAccountId`, `categoryId`) harus milik user dan **aktif** saat create. Saat edit, referensi yang tidak diubah boleh tetap menunjuk item terarsip. Id asing, tidak ada, atau terarsip → 400 pada field yang bersangkutan (pesan sama untuk id asing dan id tidak ada, supaya tidak membocorkan data user lain).

## Kontrak API

Semua route memakai `withAuth`, memfilter `user_id` dari session, dan format error dari `lib/api/errors.ts`. Id di path yang bukan UUID, tidak ada, milik user lain, atau (untuk GET/PATCH) sudah dihapus → **404 `TRANSACTION_NOT_FOUND`**.

### Tipe

```ts
// lib/schemas/transaction.ts (dipakai client & server)
type Transaction = {
  id: string;
  type: "income" | "expense" | "saving" | "transfer" | "adjustment";
  amount: number; // integer rupiah; bertanda hanya untuk adjustment
  date: string; // YYYY-MM-DD
  accountId: string;
  toAccountId: string | null; // non-null tepat jika type = transfer
  categoryId: string | null; // null untuk transfer dan adjustment
  description: string | null;
  createdAt: string; // ISO timestamp
  updatedAt: string;
  deletedAt: string | null; // selalu null di daftar
};

type TransactionPage = { items: Transaction[]; nextCursor: string | null };
type TransactionTotals = { income: number; expense: number; saving: number };
type TransactionCreated = { transaction: Transaction; fee: Transaction | null };
```

### Filter (query string untuk list, totals, export)

| Param             | Nilai                                                   | Catatan                                            |
| ----------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `type`            | `income \| expense \| saving \| transfer \| adjustment` | satu nilai                                         |
| `accountId`       | `z.uuid()`                                              | cocok dengan `account_id` **atau** `to_account_id` |
| `categoryId`      | `z.uuid()`                                              |                                                    |
| `from`, `to`      | `YYYY-MM-DD`, inklusif                                  | `from ≤ to`, keduanya opsional                     |
| `cursor`, `limit` | list saja                                               | `limit` 1–100, default 30                          |

Param tak dikenal diabaikan. Nilai tidak valid → 400 `VALIDATION_ERROR` dengan `fields`. `accountId`/`categoryId` milik user lain atau tidak ada → daftar kosong (bukan 404).

### Route

| Method & path                         | Body / query                    | Sukses                                                                                     | Error                                                 |
| ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `GET /api/transactions`               | filter + `cursor`, `limit`      | 200 `TransactionPage`                                                                      | 400 `VALIDATION_ERROR`, 400 `INVALID_CURSOR`          |
| `POST /api/transactions`              | lihat di bawah                  | 201 `TransactionCreated`                                                                   | 400                                                   |
| `GET /api/transactions/[id]`          | —                               | 200 `Transaction`                                                                          | 404                                                   |
| `PATCH /api/transactions/[id]`        | subset field yang boleh diubah  | 200 `Transaction`                                                                          | 400, 404, 409 `TRANSACTION_NOT_EDITABLE` (adjustment) |
| `DELETE /api/transactions/[id]`       | —                               | 200 `Transaction` (`deletedAt` terisi). Idempoten: hapus ulang tidak mengubah `deleted_at` | 404                                                   |
| `POST /api/transactions/[id]/restore` | —                               | 200 `Transaction` (aktif). Idempoten                                                       | 404                                                   |
| `GET /api/transactions/totals`        | filter (tanpa `cursor`/`limit`) | 200 `TransactionTotals` (nol jika kosong)                                                  | 400                                                   |
| `GET /api/transactions/export`        | filter                          | 200 `text/csv`                                                                             | 400                                                   |

`DELETE` dan `restore` melihat baris yang sudah dihapus. `GET` dan `PATCH` tidak.

**Body `POST`** (discriminated union pada `type`, `z.strictObject`, field tak dikenal → 400):

| `type`                        | Field                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `income`, `expense`, `saving` | `amount`, `date`, `accountId`, `categoryId`, `description?`                                  |
| `transfer`                    | `amount`, `date`, `accountId`, `toAccountId`, `description?`, `fee?: { amount, categoryId }` |
| `adjustment`                  | selalu 400                                                                                   |

`fee` hanya ada saat create. Jika ada, server membuat `expense` dengan `account_id` = akun sumber, `date` sama, `description = "Biaya admin transfer"`, dan `categoryId` dari `fee` (harus `kind = spending`). Transfer dan biaya ditulis dalam satu `db.transaction`. Semua validasi dan cek kepemilikan selesai sebelum insert pertama.

**Body `PATCH`:** field yang boleh bergantung pada tipe tersimpan: `income/expense/saving` → `amount`, `date`, `accountId`, `categoryId`, `description`. `transfer` → `amount`, `date`, `accountId`, `toAccountId`, `description`. Field lain (termasuk `type`, `fee`, `userId`) → 400. Body kosong → 400. `description: null` mengosongkan. Hasil gabungan divalidasi ulang terhadap aturan tipe itu (mis. `toAccountId ≠ accountId`). `updated_at` diperbarui.

### Validasi (Zod, `lib/schemas/transaction.ts`)

- `amount`: `z.int()`, 1..1e12.
- `date`: `z.iso.date()`, lalu cek rentang keputusan #5. "Hari ini" dihitung dengan `todayInJakarta()` saat parse.
- `description`: `trim`, maks 200, string kosong → `null`.
- `fee.amount`: sama dengan `amount`.
- Transfer: `toAccountId ≠ accountId` (field `toAccountId`, "Akun tujuan harus berbeda").
- Cek kepemilikan/aktif/kind kategori dilakukan di server dengan `findOwnedAccounts` / `findOwnedCategory`, lalu dilaporkan lewat `fieldError(field, message)` baru di `lib/api/errors.ts` (400 `VALIDATION_ERROR` dengan `fields`).

Bentuk schema acuan:

```ts
const base = { amount, date, accountId: z.uuid(), description };

export const transactionCreateSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.enum(["income", "expense", "saving"]),
    ...base,
    categoryId: z.uuid(),
  }),
  z
    .strictObject({
      type: z.literal("transfer"),
      ...base,
      toAccountId: z.uuid(),
      fee: feeSchema.optional(),
    })
    .refine((v) => v.toAccountId !== v.accountId, {
      path: ["toAccountId"],
      error: "Akun tujuan harus berbeda",
    }),
]);
```

### Cursor

Opaque, base64url dari JSON `[date, createdAtMicros, id]`. Predikat keyset: `(date, created_at, id) < cursor` pada urutan `date desc, created_at desc, id desc`. Server mengambil `limit + 1` baris; baris ekstra menentukan `nextCursor`.

`createdAtMicros` dihitung di SQL (`(extract(epoch from created_at) * 1000000)::bigint`, aman di bawah 2^53), **bukan** lewat `Date` JS: Postgres menyimpan mikrodetik dan `Date` memotongnya ke milidetik, yang membuat baris terlewat atau muncul dua kali di batas halaman. Cursor rusak atau salah bentuk → 400 `INVALID_CURSOR`.

### Ekspor CSV

- Kolom: `Tanggal, Jenis, Jumlah, Akun, Akun Tujuan, Kategori, Needs/Wants, Deskripsi`. Urutan baris sama dengan daftar, tanpa paginasi.
- `Jumlah` integer mentah (tanpa format), `Jenis` memakai label tipe ("Penyesuaian" untuk adjustment). Nama akun/kategori terarsip tetap terisi.
- Diawali BOM UTF-8 supaya Excel membaca aksara dengan benar. `Content-Disposition: attachment; filename="lontu-transaksi-<period|semua>.csv"`.
- Sel **teks** yang diawali `=`, `+`, `-`, `@`, tab, atau CR diberi awalan `'` (CSV/formula injection dari `description`). Kolom `Jumlah` tidak disentuh, karena adjustment negatif memang diawali `-`.
- Dibangun di memori. Cukup untuk skala pribadi (puluhan ribu baris).

### Kontrak untuk modul lain

- **SWR key:** `"/api/transactions?<query terurut>"` (halaman pertama dan berikutnya), `"/api/transactions/totals?<query>"`, `"/api/transactions/<id>"`. Query dibangun oleh `filtersToSearchParams` dengan urutan param tetap, supaya filter yang sama menghasilkan key yang sama.
- **Revalidasi:** setiap mutasi transaksi memanggil `revalidateTransactions()` dan `revalidateAccounts()`. `revalidateTransactions()` me-revalidate semua key berawalan `/api/transactions` (termasuk key `useSWRInfinite`). Modul `dashboard` dan `budgets` menambahkan matcher key mereka di fungsi itu, bukan di tiap pemanggil.
- **Tautan ke daftar** (dari `dashboard`): `/transactions?period=2026-10&categoryId=<uuid>&type=expense`. `period` = `YYYY-MM`, `YYYY`, atau `all`. Tanpa `period`, daftar memakai bulan berjalan (Asia/Jakarta).
- **Antrean offline:** `pwa-offline` membutuhkan `POST` yang idempoten. Opsi `id` UUID dari client (kompatibel mundur) ditambahkan di spec modul itu, bukan di sini.

## Deliverables

### 1. Server

- `lib/schemas/transaction.ts`: tipe, schema create/update/filter, `LIST_TRANSACTION_TYPES` (= `TRANSACTION_TYPES` + `adjustment`).
- `lib/transaction-types.ts`: tambah label "Penyesuaian". `TRANSACTION_TYPES` tidak berubah (adjustment tidak boleh dibuat dari UI).
- `lib/period.ts` (murni, dipakai client & server): konsep Period (`YYYY-MM`, `YYYY`, `all`): `periodMode`, `isPeriod`, `periodToRange(period)`, `shiftPeriod`, `switchPeriodMode`, `formatPeriodLabel`, `monthRange`, `periodToYearMonth` / `yearMonthToPeriod`. Modul budgets, dashboard, recurring, dan server mengimpor periode dari sini, bukan dari filter transaksi.
- `lib/transaction-filters.ts` (murni, dipakai client & server): `parseFilters(searchParams)`, `filtersToSearchParams`, `normalizeFilters` (membersihkan kombinasi tak berarti: `type = transfer/adjustment` menghapus `categoryId`, `categoryId` yang `kind`-nya tidak cocok dengan `type` dihapus).
- `lib/server/transaction-cursor.ts`: `encodeCursor` / `decodeCursor`.
- `lib/server/transactions.ts`: `transactionWhere(userId, filters)` (satu-satunya pembangun `where`, dipakai list, totals, dan export), `listTransactions`, `getTransaction`, `createTransaction` (termasuk fee dalam satu `db.transaction`), `updateTransaction`, `softDeleteTransaction`, `restoreTransaction`.
- `lib/server/queries/transaction-totals.ts`: `transactionTotals(userId, filters)`, satu query `sum(amount) filter (where type = …)` untuk tiga tipe.
- `lib/csv.ts`: `toCSV(rows)` murni (escape koma/kutip/newline, penjaga formula, BOM). `lib/server/transaction-export.ts`: gabungkan nama akun/kategori lalu panggil `toCSV`.
- `lib/api/errors.ts`: `transactionNotFound()`, `transactionNotEditable()`, `invalidCursor()`, `fieldError(field, message)`.
- Route: `app/api/transactions/route.ts`, `[id]/route.ts`, `[id]/restore/route.ts`, `totals/route.ts`, `export/route.ts`.

### 2. Client

- `hooks/use-transactions.ts`: `useTransactions(filters)` (`useSWRInfinite`, key dari `filtersToSearchParams`), `useTransactionTotals(filters)`, `useTransaction(id)`, `revalidateTransactions()`, dan mutasi `createTransaction`, `updateTransaction`, `deleteTransaction` (optimistic: baris dihapus dari semua cache daftar, rollback + revalidasi jika gagal), `restoreTransaction`. Mutasi melempar `ApiError` agar form bisa memasang `fields`. Semua mutasi memanggil `revalidateAccounts()` setelahnya.
- `lib/transaction-balance.ts` (murni): `balanceAfter({ balance, subtype, effect, previousEffect? })` untuk peringatan saldo. Untuk edit, efek transaksi lama dikembalikan lebih dulu karena `balance` dari API sudah memuatnya.
- Tidak ada data transaksi di Zustand, termasuk di `modalProps`. Form edit dibuka lewat route berisi id.

### 3. UI

- **`app/(app)/add/[type]/page.tsx`** menggantikan placeholder. `income/expense/saving` merender `components/forms/transaction-form.tsx`, `transfer` merender `components/forms/transfer-form.tsx`.
  - Field: nominal (`MoneyInput` yang sudah ada, tanpa tombol ±), tanggal (native, default hari ini Jakarta, `max` hari ini), akun, kategori, deskripsi (opsional). Select kategori hanya memuat `kind` yang cocok; untuk expense dikelompokkan Needs / Wants.
  - Transfer: akun sumber, akun tujuan (tanpa akun sumber), checkbox "Biaya admin" yang membuka nominal + kategori spending (wajib saat dicentang).
  - Satu akun aktif → terpilih otomatis. Tanpa akun atau kategori yang cocok → empty state di picker dengan tombol "Tambah akun" / "Tambah kategori" (`useUIStore().open("manageAccounts")` / `open("manageCategories", { kind })`), tanpa meninggalkan halaman.
  - Peringatan saldo (non-blokir) di bawah field akun: "Saldo {akun} Rp… tidak cukup, akan menjadi −Rp…" memakai `balanceAfter` (termasuk biaya admin). Tombol Simpan tetap aktif.
  - Submit: tombol nonaktif + spinner, error server dipasang ke field (`setError`), sukses → toast ("Transfer dan biaya admin tersimpan" bila ada fee), `router.push("/transactions")`.
- **`app/(app)/transactions/page.tsx`** menggantikan placeholder, dibungkus `<Suspense>` karena memakai `useSearchParams` (aturan `cacheComponents`). `components/transactions/transaction-list.tsx` menerima prop `lockedType?` supaya dipakai ulang oleh `/expenses`.
  - Header: stepper periode (bulan sebelumnya/berikutnya, pilih bulan/tahun/"Semua"), strip total Income / Expense / Saving (`hideAmounts` menyamarkan nominal), menu "Ekspor CSV" (tautan biasa ke `/api/transactions/export?…`, ikut filter aktif).
  - Filter Jenis, Akun, Kategori dalam satu panel `ResponsiveModal` dengan badge jumlah filter aktif dan tombol Reset. Perubahan menulis URL lewat `router.replace`, jadi bertahan setelah refresh dan tombol back tidak dipenuhi langkah filter. Akun dan kategori terarsip tetap bisa dipilih (berlabel "(arsip)") karena transaksi lama masih memakainya.
  - Daftar dikelompokkan per tanggal ("Hari ini", "Kemarin", "Sen, 19 Okt 2026"). Judul tanggal diformat dari string `YYYY-MM-DD` dengan `timeZone: "UTC"` supaya tidak bergeser sehari.
  - Baris: nama kategori (transfer: "A → B", adjustment: "Penyesuaian"), nama akun, deskripsi, nominal berwarna token `--income` (+), `--expense` (−), `--budget` untuk saving (−), `--transfer` tanpa tanda, adjustment sesuai tanda. Tap baris → `/transactions/[id]`.
  - Skeleton saat memuat, empty state berbeda untuk "belum ada transaksi" dan "tidak ada yang cocok dengan filter", error SWR dengan "Coba lagi", tombol "Muat lebih banyak" selama `nextCursor` ada.
- **`app/(app)/transactions/[id]/page.tsx`**: form edit (field sesuai tipe, tipe ditampilkan read-only), tombol "Hapus". Id bukan UUID → `notFound()`. Referensi terarsip yang tidak diubah tetap muncul sebagai pilihan terpilih berlabel "(arsip)". Untuk adjustment halaman read-only, hanya ada "Hapus". Hapus → kembali ke daftar (`router.back()`, fallback `/transactions`) dan toast "Transaksi dihapus · Urungkan" (6 detik).
- **`app/(app)/expenses/page.tsx`**: `<TransactionList lockedType="expense" />` dalam `<Suspense>`. Filter Jenis disembunyikan.
- Mobile: semua target sentuh ≥ 44×44 px, input 16 px, tanpa horizontal scroll di 360 px, kontras ≥ 4.5:1 (nominal tidak hanya dibedakan lewat warna: tanda +/− ikut tampil).

## Acceptance criteria

**API**

- [x] `POST` expense `{ type, amount: 25000, date: hari ini, accountId, categoryId, description }` → 201 `{ transaction, fee: null }`. Akun dengan saldo 100.000 kini `balance = 75000` di `GET /api/accounts`. Income menambah, saving mengurangi.
- [x] Transfer 10.000 dari A ke B → A −10.000, B +10.000, `categoryId = null`. `toAccountId = accountId` → 400 `fields.toAccountId`.
- [x] Transfer dengan `fee: { amount: 2500, categoryId: <spending> }` → dua baris (transfer 10.000 + expense 2.500 di akun sumber, `description = "Biaya admin transfer"`), A turun 12.500, respons `fee` terisi. `fee.categoryId` berkategori income, atau akun tujuan terarsip → 400 dan **tidak ada baris** yang tertulis.
- [x] `amount` 0, −1, 1.5, `"100"`, atau > 1e12 → 400 `fields.amount`. `date` salah format, sebelum 2000-01-01, atau besok (Jakarta) → 400 `fields.date`. `description` > 200 karakter → 400.
- [x] Referensi: akun/kategori milik user lain, tidak ada, atau terarsip → 400 pada `fields.accountId` / `toAccountId` / `categoryId`. Expense dengan kategori income → 400 `fields.categoryId`. Income tanpa kategori, atau transfer dengan `categoryId` → 400.
- [x] `type: "adjustment"` di `POST` → 400. `PATCH` pada adjustment → 409 `TRANSACTION_NOT_EDITABLE`. `DELETE` adjustment → 200, dan `initialBalance` serta `balance` akun bergeser kembali.
- [x] `PATCH` `{ amount: 40000 }` pada expense 25.000 → 200, saldo ikut berubah, `updatedAt` maju, urutan daftar tidak berubah. `PATCH` yang memuat `type`, `userId`, atau `toAccountId` pada expense → 400. Body kosong → 400. Pindah ke akun terarsip → 400. Akun lama yang terarsip dan tidak diubah → 200.
- [x] `DELETE` mengisi `deleted_at` (baris tetap di DB), baris hilang dari list, totals, dan saldo. `GET`/`PATCH` baris terhapus → 404. `restore` mengembalikannya. Keduanya idempoten.
- [x] Urutan list `date desc, created_at desc, id desc`. Dengan `limit=2` atas 5 baris, termasuk tiga baris satu tanggal dan dua baris dengan `created_at` yang sama sampai milidetik, gabungan semua halaman = himpunan lengkap, tanpa duplikat atau lompatan. Halaman terakhir `nextCursor = null`. Cursor rusak → 400 `INVALID_CURSOR`. `limit=101` atau `0` → 400.
- [x] Filter `type`, `categoryId`, `from`/`to` (inklusif di kedua ujung) dan kombinasinya benar. `accountId` mengembalikan transfer di sisi sumber maupun tujuan. `from > to` → 400. `accountId` milik user lain → daftar kosong.
- [x] `totals` sama dengan jumlah baris terfilter untuk income/expense/saving, tidak menghitung transfer, adjustment, dan baris terhapus, dan mengembalikan `0` untuk hasil kosong.
- [x] `export` mengembalikan `text/csv`, BOM, baris header, jumlah baris sama dengan list pada filter yang sama, nama akun/kategori terarsip terisi, `description` `=1+1` keluar sebagai `'=1+1`, dan `Jumlah` adjustment negatif tetap `-50000`.
- [x] **Isolasi:** user B mendapat 404 untuk `GET`/`PATCH`/`DELETE`/`restore` transaksi A, list/totals/export B tidak pernah memuat data A, B tidak bisa mereferensikan akun/kategori A di `POST`/`PATCH`, dan `userId` di body diabaikan (400 karena strict).
- [x] Tanpa session, semua route → 401 `UNAUTHORIZED`.

**UI (manual di 360 px dan 1024 px)**

- [x] Dari dashboard: **+** → Expense → nominal → akun → kategori → Simpan mendarat di `/transactions` dengan baris baru paling atas di grup "Hari ini". Saldo akun di Kelola akun sudah berubah tanpa reload.
- [x] Peringatan saldo muncul saat nominal melebihi saldo (bukan `credit_card`), tidak memblokir Simpan, dan di mode edit memperhitungkan nominal lama.
- [x] Filter, periode, dan tombol back bertahan: refresh `/transactions?period=2026-10&type=expense` mempertahankan semuanya. Mengganti Jenis ke Transfer menghapus filter kategori.
- [x] `/expenses` hanya menampilkan expense dan tidak punya filter Jenis. Total, periode, dan filter lain bekerja sama dengan `/transactions`.
- [x] Hapus → baris langsung hilang, toast "Urungkan" mengembalikannya, saldo kembali. `DELETE` yang gagal mengembalikan baris dan menampilkan toast error.
- [x] Transaksi dengan akun/kategori terarsip menampilkan namanya dengan "(arsip)" di daftar dan form edit.
- [x] Error validasi dari server tampil di field yang sesuai. Tanpa akun atau kategori, form menawarkan menambahnya lewat modal tanpa kehilangan isian.
- [x] Layout benar di 360 px tanpa horizontal scroll, target sentuh ≥ 44 px, input 16 px.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Tes

- **Unit (`tests/unit/`):**
  - `transaction-schema.spec.ts`: batas nominal, union per tipe, `strictObject`, `fee`, batas tanggal (hari ini diinjeksi lewat fake timer), deskripsi kosong → `null`.
  - `transaction-filters.spec.ts`: URL ↔ filter bolak-balik, key yang stabil, `normalizeFilters`.
  - `period.spec.ts`: `periodToRange` (bulan, tahun, `all`, Februari kabisat), maju/mundur, batas 2000, label.
  - `transaction-cursor.spec.ts`: round trip, cursor rusak.
  - `csv.spec.ts`: escape, penjaga formula hanya di kolom teks, BOM.
  - `transaction-balance.spec.ts`: transfer + biaya, `credit_card`, mode edit.
  - `use-transactions.spec.ts`: key, matcher `revalidateTransactions` terhadap key `useSWRInfinite`, optimistic delete dan rollback.
- **API (`tests/api/`, Supabase sungguhan, user `test-<uuid>`):**
  - `transactions.spec.ts`: CRUD, efek ke `GET /api/accounts`, fee atomik, adjustment, soft delete/restore, 404 untuk id bukan UUID, isolasi A/B, 401.
  - `transactions-list.spec.ts`: urutan, paginasi (termasuk `created_at` kembar), filter, totals.
  - `transactions-export.spec.ts`: isi CSV, nama terarsip, penjaga formula.
- **E2E:** tetap ditunda (SPEC.md Open question #2). Verifikasi UI manual di 360 px dan 1024 px sebelum checkpoint.

## Struktur file

```
app/api/transactions/{route.ts, totals/route.ts, export/route.ts, [id]/route.ts, [id]/restore/route.ts}
app/(app)/add/[type]/page.tsx            # ganti placeholder
app/(app)/transactions/{page.tsx, [id]/page.tsx}
app/(app)/expenses/page.tsx              # preset filter
components/forms/{transaction-form.tsx, transfer-form.tsx}
components/transactions/                 # transaction-list, transaction-row, filter panel, period stepper, totals strip
hooks/use-transactions.ts
lib/schemas/transaction.ts, lib/period.ts, lib/transaction-filters.ts, lib/transaction-balance.ts, lib/csv.ts
lib/server/{transactions.ts, transaction-cursor.ts, transaction-export.ts, queries/transaction-totals.ts}
tests/unit/*.spec.ts, tests/api/*.spec.ts
```

Perintah, gaya kode, dan format error mengikuti [SPEC.md](SPEC.md). Menjalankan satu berkas tes: `pnpm vitest run tests/api/transactions.spec.ts`.

## Boundaries (khusus modul ini)

- **Always:** pakai `findOwnedAccounts` / `findOwnedCategory` untuk setiap id di body, satu `transactionWhere` untuk list, totals, dan export, `db.transaction` untuk transfer + biaya admin, dan panggil `revalidateTransactions()` + `revalidateAccounts()` setelah setiap mutasi. Saldo dan total dihitung di DB.
- **Ask first:** kolom atau index baru (mis. `parent_id` untuk menautkan biaya admin ke transfer, atau index `(user_id, date, created_at)` jika `EXPLAIN` menunjukkan perlu), dependency kalender (`react-day-picker`), `id` dari client untuk idempotensi, optimistic create, menghapus biaya admin secara berantai bersama transfer.
- **Never:** hard delete transaksi, membuat atau mengedit `adjustment` lewat API ini, mengubah `type` lewat `PATCH`, menerima `userId` dari body, menghitung total/saldo di client selain peringatan form, menyalin transaksi ke Zustand (termasuk lewat `modalProps`), memakai server action.

## Risiko

- **Biaya admin yatim:** menghapus transfer tidak menghapus biaya adminnya, jadi pengeluaran bisa tertinggal. Mitigasi: toast saat membuat menyebut keduanya tersimpan, dan teks bantuan di halaman edit transfer. Jika ini terjadi sering, tambah `parent_id` (Ask first).
- **Presisi cursor:** lihat [Cursor](#cursor). Dites dengan baris `created_at` kembar.
- **Key `useSWRInfinite`:** SWR menyimpan data infinite di bawah key turunan (`$inf$…`). Matcher `revalidateTransactions` dan penghapusan optimistic harus dites terhadap key itu, bukan hanya key halaman biasa. Jika bentuknya merepotkan, fallback: simpan halaman di state sendiri dengan satu key SWR per halaman.
- **`cacheComponents`:** `useSearchParams` di `/transactions` dan `/expenses` wajib di dalam `<Suspense>`, dan halaman tidak memanggil `auth()` langsung. Baca `node_modules/next/dist/docs/` sebelum menulis page.
- **Zona waktu tanggal:** `new Date("2026-10-21")` dibaca UTC dan bisa bergeser sehari saat diformat. Format dari string dengan `timeZone: "UTC"`, bandingkan tanggal sebagai string.
- **Peringatan saldo bisa basah:** dihitung dari `balance` di cache SWR, jadi bisa tertinggal dari DB. Hanya informasi, server tidak bergantung padanya.
- **Ekspor di memori:** tidak masalah untuk satu pemilik. Jika data tumbuh besar, ganti dengan stream.

## Open questions

1. ~~Biaya admin transfer~~ **Diputuskan:** MVP, tanpa tautan (keputusan 1).
2. ~~Halaman Expenses~~ **Diputuskan:** preset filter (keputusan 2).
3. ~~Saldo kurang~~ **Diputuskan:** peringatan non-blokir (keputusan 3).
4. **Tanggal masa depan ditolak** (keputusan 5): setuju, atau izinkan sampai H+N untuk mencatat tagihan yang sudah diketahui?
5. **Edit tidak mengubah tipe** (keputusan 4): setuju, atau perlu "ubah tipe" untuk income ↔ expense?
