# Spec module: `recurring`

Status: draft · 2026-10-27 · @Yogi
Bergantung pada: `accounts-categories`, `transactions` · Dipakai oleh: `dashboard` · Indeks: [SPEC.md](SPEC.md)
Asal: sesi idea-refine 2026-10-27 ("Recurring Transactions → Payday Forecast").

## Objective

Pemilik tahu berapa uang yang **benar-benar bebas sampai gajian berikutnya**, dihitung dari income dan tagihan tetap yang sudah ia ketahui, tanpa aplikasi pernah menulis transaksi yang belum terjadi.

Pemilik mendaftarkan aturan berulang bulanan (gaji, sewa, langganan, setoran tabungan). Saat jatuh tempo, aturan muncul di kotak "Jatuh tempo" di dashboard dan dicatat dengan satu tap lewat form yang sudah terisi, atau dilewati. Kartu gajian di dashboard menampilkan: *12 hari lagi gajian · Rp 1,8 jt terikat · Rp 2,4 jt bebas*.

Modul ini pemilik **kontrak** `/api/recurring*`, fungsi murni `advanceDate` dan `paydayForecast`, hook SWR-nya, serta komponen kotak Jatuh tempo dan kartu gajian yang dipasang `dashboard`.

**Sukses berarti:** dalam satu siklus gajian, setiap tagihan tetap tercatat atau dilewati secara sadar, dan angka "bebas" di kartu gajian selisih ≤ 10% dari hitungan pemilik sendiri di tiga titik siklus.

Di luar cakupan: posting otomatis atau cron, pencocokan otomatis transaksi manual dengan aturan, frekuensi selain bulanan, nominal variabel, transfer berulang, notifikasi push atau pengingat, angka "terikat" di halaman Budget, proyeksi lebih dari satu siklus, grafik, antrean offline untuk aksi aturan.

## Keputusan

Nomor 1–6 diputuskan Yogi pada 2026-10-27 (sesi idea-refine dan pertanyaan spec). Sisanya usulan untuk direview.

1. **Konfirmasi, bukan otomatis.** Tidak ada transaksi yang ditulis tanpa tap pemilik. Karena itu tidak ada cron, tidak ada jalur tulis tanpa session, dan tidak ada perubahan `next.config.ts` atau `vercel.json`. Yang jatuh tempo dihitung saat dibaca, terhadap hari ini di `Asia/Jakarta`.
2. **Tanpa pencocokan otomatis.** Transaksi yang dicatat manual tidak menandai aturan. Pemilik memakai aksi **Lewati** ("sudah dicatat manual atau tidak terjadi bulan ini"). Tanpa heuristik.
3. **Hanya jadwal bulanan dengan nominal tetap,** tipe `income | expense | saving`. Tanggal tetap per bulan (`day_of_month` 1–31). Gaji pemilik jatuh di tanggal kalender yang sama.
4. **Saldo "bebas"** = jumlah saldo akun **aktif** dengan `type = "transaction"` dan `subtype` bukan `credit_card` (termasuk `subtype` null). Akun aset (investasi, kripto, tabungan) dan kartu kredit tidak ikut. Tanpa kolom baru di `accounts`.
5. **Aturan dikelola di halaman baru `/recurring`** (label nav "Recurring"), di sidebar dan di menu More bottom nav.
6. **Gaji terlambat dicatat → kartu meminta pencatatan.** Jika aturan gajian sudah jatuh tempo (`next_due_date ≤ hari ini`), kartu gajian menampilkan "Gaji belum dicatat" dengan tombol Catat, dan proyeksi disembunyikan sampai itu ditangani.
7. **Satu kolom jadwal: `next_due_date`.** Tidak ada tabel kejadian (occurrence) dan tidak ada baris transaksi masa depan. Catat dan Lewati sama-sama memajukan `next_due_date` satu bulan. Konsekuensinya, server tidak membedakan "sudah dicatat manual" dari "tidak terjadi": keduanya Lewati, dan tidak ada riwayat aksi.
8. **Anchor disimpan, bukan diturunkan.** `day_of_month` disimpan terpisah, dan tanggal berikutnya = anchor di bulan berikutnya, dibatasi hari terakhir bulan itu. Jadi 31 Jan → 28 Feb → 31 Mar, tidak bergeser menjadi 28 selamanya.
9. **Tertinggal beberapa bulan = satu kejadian per tap.** Kotak Jatuh tempo menampilkan kejadian tertua. Setelah ditangani, kejadian berikutnya muncul jika juga sudah jatuh tempo. Tidak ada backfill saat aturan dibuat: `next_due_date` awal = tanggal anchor terdekat ≥ hari ini.
10. **Aksi boleh lebih awal.** Catat atau Lewati dari halaman `/recurring` diizinkan untuk kejadian berikutnya walau belum jatuh tempo (tagihan dibayar lebih awal). Kotak Jatuh tempo hanya menampilkan yang sudah jatuh tempo. Tanggal transaksi tetap mengikuti aturan transactions (≤ hari ini).
11. **Catat memakai `TransactionForm` di `ResponsiveModal`,** terisi dari aturan (nominal, akun, kategori, deskripsi = nama aturan, tanggal = tanggal kejadian atau hari ini jika kejadian di masa depan). Simpan memanggil `advance`, bukan `POST /api/transactions`. Kontrak transactions tidak berubah. Halaman `/add/[type]` tidak disentuh (masih statis lewat `generateStaticParams`).
12. **Idempoten dua lapis.** `advance` membawa `occurrenceDate` yang harus sama dengan `next_due_date`, dan (untuk Catat) `id` transaksi dari client. Tap ganda atau retry setelah respons hilang tidak mencatat dua kali.
13. **Satu aturan gajian aktif per user** (`is_payday`, hanya untuk `income`). Menandai aturan lain sebagai gajian mencabut tanda di aturan lama dalam satu transaksi DB. Mengarsipkan aturan gajian mencabut tandanya, jadi restore tidak pernah bentrok.
14. **Edit hanya berlaku ke depan.** Transaksi yang sudah dicatat berdiri sendiri. Mengubah `dayOfMonth` menghitung ulang `next_due_date` = anchor terdekat ≥ hari ini (kejadian tertinggal ikut hilang; form memperingatkannya). Menghapus transaksi hasil Catat tidak memundurkan aturan.
15. **Hapus = arsip** (`archived_at`) dengan restore, sama dengan akun dan kategori. Aturan terarsip tidak muncul di kotak Jatuh tempo maupun proyeksi.
16. **Online saja.** Aksi aturan dinonaktifkan saat offline ("Butuh koneksi"). `GET` tetap tampil dari cache service worker lewat aturan `GET /api/*` yang sudah ada di [SPEC-pwa-offline.md](SPEC-pwa-offline.md), jadi proyeksi terakhir terlihat offline.
17. **Label UI** mengikuti keputusan #10 accounts-categories: nav bahasa Inggris, tombol/form/pesan bahasa Indonesia.

## Perubahan skema

Tabel ke-6. Mengubah keputusan terkunci #8 di [SPEC.md](SPEC.md) (disetujui 2026-10-27 bersama capability map). Migrasi baru hanya **menambah** objek.

```ts
// db/schema.ts
export const recurringRules = pgTable.withRLS("recurring_rules", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text().notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text().notNull(), // income | expense | saving
  name: text().notNull(), // 1..60, juga deskripsi default transaksi
  amount: bigint({ mode: "number" }).notNull(), // 1..1e12
  accountId: uuid().notNull().references(() => accounts.id),
  categoryId: uuid().notNull().references(() => categories.id),
  dayOfMonth: smallint().notNull(), // 1..31
  nextDueDate: date({ mode: "string" }).notNull(),
  isPayday: boolean().notNull().default(false),
  archivedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
```

| Objek                                     | Isi                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `recurring_rules_type_check`              | `type in ('income','expense','saving')`                                 |
| `recurring_rules_amount_check`            | `amount > 0`                                                            |
| `recurring_rules_day_check`               | `day_of_month between 1 and 31`                                         |
| `recurring_rules_payday_check`            | `not is_payday or type = 'income'`                                      |
| `recurring_rules_one_payday` (unik parsial) | `(user_id) where is_payday and archived_at is null`                   |
| `recurring_rules_user_idx`                | `(user_id, next_due_date)`                                              |
| RLS                                       | aktif, tanpa policy (deny-all), sama dengan tabel lain                  |

Nama kolom dan bentuk builder mengikuti tabel yang sudah ada di `db/schema.ts` (Drizzle 1.0 RC, cek `.d.ts` terpasang). Jika polanya berbeda dari potongan di atas, ikuti `db/schema.ts`.

## Kontrak API

Semua route memakai `withAuth`, memfilter `user_id` dari session, dan format error dari `lib/api/errors.ts`. Id di path yang bukan UUID, tidak ada, atau milik user lain → **404 `RULE_NOT_FOUND`**. `PATCH` dan `advance` pada aturan terarsip juga 404.

### Tipe

```ts
// lib/schemas/recurring.ts (dipakai client & server)
type RecurringType = "income" | "expense" | "saving";

type RecurringRule = {
  id: string;
  type: RecurringType;
  name: string;
  amount: number; // integer rupiah, 1..1e12
  accountId: string;
  categoryId: string;
  dayOfMonth: number; // 1..31
  nextDueDate: string; // YYYY-MM-DD
  isPayday: boolean;
  archivedAt: string | null;
  createdAt: string;
};

type ForecastItem = { ruleId: string; dueDate: string; amount: number };

type PaydayForecast =
  | { status: "no_payday" } // belum ada aturan gajian aktif
  | { status: "payday_due"; ruleId: string; dueDate: string } // keputusan #6
  | {
      status: "ok";
      payday: string; // YYYY-MM-DD
      daysLeft: number; // payday − hari ini, ≥ 1
      spendable: number; // saldo keputusan #4, boleh negatif
      committed: number; // jumlah items
      free: number; // spendable − committed, boleh negatif
      items: ForecastItem[]; // urut dueDate, lalu nama
    };

type RecurringOverview = {
  rules: RecurringRule[]; // aktif, urut nextDueDate lalu lower(name)
  due: RecurringRule[]; // subset rules dengan nextDueDate ≤ hari ini
  forecast: PaydayForecast;
};

type AdvanceResult = { rule: RecurringRule; transaction: Transaction | null };
```

### Route

| Method & path                       | Body / query                                  | Sukses                                       | Error                     |
| ----------------------------------- | --------------------------------------------- | -------------------------------------------- | ------------------------- |
| `GET /api/recurring`                | `?includeArchived=true` (opsional)            | 200 `RecurringOverview`                      | —                         |
| `POST /api/recurring`               | `{ type, name, amount, accountId, categoryId, dayOfMonth, isPayday? }` | 201 `RecurringRule` | 400                      |
| `PATCH /api/recurring/[id]`         | subset field create, kecuali `type`           | 200 `RecurringRule`                          | 400, 404                  |
| `DELETE /api/recurring/[id]`        | —                                             | 200 `RecurringRule` (`archivedAt` terisi). Idempoten | 404               |
| `POST /api/recurring/[id]/restore`  | —                                             | 200 `RecurringRule` (aktif). Idempoten       | 404                       |
| `POST /api/recurring/[id]/advance`  | lihat di bawah                                | 200 `AdvanceResult`                          | 400, 404, 409             |

`forecast` ikut di `GET /api/recurring` supaya dashboard cukup satu key SWR. `includeArchived` hanya memengaruhi `rules`. `due` dan `forecast` selalu dari aturan aktif.

**`POST`:** `next_due_date` = `firstDueOnOrAfter(dayOfMonth, today)`. `isPayday: true` mencabut tanda di aturan gajian lama dalam transaksi DB yang sama (keputusan #13).

**`PATCH`:** `type` ditolak (400, sama dengan transactions keputusan #4). `dayOfMonth` berubah → `next_due_date` dihitung ulang (keputusan #14). Referensi yang tidak diubah boleh tetap menunjuk akun/kategori terarsip. Referensi yang diubah harus aktif.

**`DELETE`:** mengisi `archived_at` dan `is_payday = false`.

**`advance`:** body adalah discriminated union pada `action`.

```ts
{ action: "skip"; occurrenceDate: string }
{
  action: "post";
  occurrenceDate: string;
  id: string; // uuid transaksi dari client, crypto.randomUUID() sekali per submit
  amount: number;
  date: string; // aturan tanggal transactions: 2000-01-01 ≤ date ≤ hari ini
  accountId: string;
  categoryId: string;
  description: string | null;
}
```

Field `post` datar (tidak bersarang) supaya `fields` dari server langsung terpasang ke `TransactionForm` lewat `applyServerErrors`. `type` transaksi diambil dari aturan, bukan dari body.

Urutan di server, dalam **satu transaksi DB**:

1. `post` dengan `id` yang sudah ada milik user ini dan aturan ini sudah melewati `occurrenceDate` → **200 replay**: aturan saat ini + transaksi tersimpan (first write wins). `id` milik user lain atau baris yang tidak cocok → 409 `TRANSACTION_ID_TAKEN` (helper yang sudah ada).
2. Validasi referensi transaksi dengan aturan transactions (akun/kategori milik user, aktif, kategori `kind` = `CATEGORY_KIND_FOR[rule.type]`) → 400 dengan `fields`.
3. `update recurring_rules set next_due_date = advanceDate(day_of_month, occurrenceDate), updated_at = now() where id and user_id and archived_at is null and next_due_date = occurrenceDate returning`. Nol baris → **409 `OCCURRENCE_STALE`** ("Kejadian ini sudah ditangani. Muat ulang.").
4. `post`: insert transaksi lewat jalur insert yang sama dengan `createTransaction` di `lib/server/transactions.ts`, memakai executor transaksi DB yang sama.

`occurrenceDate` di masa depan diizinkan selama sama dengan `next_due_date` (keputusan #10).

### Validasi (Zod, `lib/schemas/recurring.ts`)

- Body memakai `z.strictObject`. Field tak dikenal (termasuk `userId`, `nextDueDate`) → 400.
- `name`: trim, 1..60. `amount`: `z.int()`, 1..1e12. `dayOfMonth`: `z.int()`, 1..31. `type`: enum. `isPayday`: boolean, `true` hanya dengan `type = "income"` (refine, `fields.isPayday`).
- `occurrenceDate`, `date`: `YYYY-MM-DD` valid. `id`, `accountId`, `categoryId`: `z.uuid()`. `description`: sama dengan schema transaksi.
- Akun/kategori asing, tidak ada, atau terarsip → 400 pada field yang bersangkutan, pesan sama untuk semua kasus (aturan transactions). Kategori dengan `kind` salah → 400 `fields.categoryId`.

### Fungsi murni

- `lib/period.ts` (aritmetika kalender bersama, lihat SPEC-transactions):
  - `clampDay(year, month, day)` → `YYYY-MM-DD` di hari `min(day, hari terakhir bulan)`.
  - `daysBetween(from, to)`, `lastDayOfMonth(year, month)`, `addDays(date, n)`.
- `lib/recurring-schedule.ts` (aturan jadwal, memakai `lib/period.ts`):
  - `advanceDate(dayOfMonth, from)` → anchor di bulan setelah `from`.
  - `firstDueOnOrAfter(dayOfMonth, today)` → anchor bulan ini jika ≥ `today`, selain itu bulan depan.
  - Semua aritmetika dari string `YYYY-MM-DD`, tanpa `Date` lokal.
- `lib/payday-forecast.ts`: `paydayForecast({ rules, spendable, today })` → `PaydayForecast`.
  - Tanpa aturan gajian aktif → `no_payday`. Gajian `nextDueDate ≤ today` → `payday_due`.
  - Selain itu `payday = nextDueDate` gajian. Untuk setiap aturan aktif `expense | saving`, kejadian = `nextDueDate`, lalu `advanceDate` berulang, selama `< payday`. Setiap kejadian menjadi satu `ForecastItem`. Kejadian tertinggal ikut dihitung.
  - Aturan `income` selain gajian tidak dihitung (konservatif, Open question #2).

### Query

`lib/server/queries/recurring-overview.ts`: dua query: aturan milik user (puluhan baris), dan `sum(balance)` dari `account_balances` join `accounts` dengan filter keputusan #4. Proyeksi dihitung `paydayForecast` di TS dari baris yang sudah teragregasi (bukan agregasi transaksi di client). Menerima `today` supaya tes memakai tanggal tetap, sama dengan `dashboardSummary`.

**Invarian:** `spendable` sama dengan jumlah `balance` dari `GET /api/accounts` untuk akun yang memenuhi keputusan #4. Dites.

### Kontrak untuk modul lain

- **`dashboard`:** memasang `<DueInbox />` dan `<PaydayCard />` dari `components/recurring/` di `dashboard-view.tsx`. Keduanya memakai `useRecurring()` (key `"/api/recurring"`). Dashboard tidak memanggil query modul ini secara langsung. Jika `rules` kosong, kartu gajian menampilkan ajakan "Atur gajian & tagihan tetap" ke `/recurring`. Jika `due` kosong, kotak Jatuh tempo tidak dirender.
- **Revalidasi (`lib/cache-invalidation.ts`):** `Resource` mendapat `"recurring"`, key `/^\/api\/recurring($|[/?])/`. `AFFECTS.transactions` dan `AFFECTS.accounts` mendapat `"recurring"` (saldo mengubah proyeksi). `AFFECTS.recurring = []`: mengubah, mengarsip, memulihkan aturan, dan Lewati tidak membuat transaksi basi. Catat menulis transaksi, jadi mutasi `post` memanggil `invalidate("transactions")`, yang menjangkau saldo, budget, dashboard, dan `recurring` (aturan `AFFECTS` lengkap, lihat SPEC-dashboard § Kontrak untuk modul lain). Diubah di T97 (2026-10-29).
- **`pwa-offline`:** tidak berubah. Outbox tetap hanya untuk create transaksi.

## Deliverables

### 1. Server

- `db/schema.ts` + migrasi `drizzle/<timestamp>_recurring_rules/` (`pnpm db:generate`), termasuk RLS.
- `lib/schemas/recurring.ts`: tipe, `recurringCreateSchema`, `recurringUpdateSchema`, `recurringAdvanceSchema`.
- `lib/recurring-schedule.ts`, `lib/payday-forecast.ts` (murni).
- `lib/server/recurring.ts`: `createRule`, `updateRule`, `archiveRule`, `restoreRule`, `advanceRule`.
- `lib/server/transactions.ts`: jalur insert transaksi sederhana menerima executor transaksi DB opsional supaya `advanceRule` atomik. Perilaku dan kontrak `createTransaction` tidak berubah, dan semua tes transaksi yang ada tetap hijau tanpa diubah.
- `lib/server/queries/recurring-overview.ts`.
- `lib/api/errors.ts`: `ruleNotFound()`, `occurrenceStale()`.
- Route: `app/api/recurring/route.ts`, `[id]/route.ts`, `[id]/restore/route.ts`, `[id]/advance/route.ts`.

### 2. Client

- `hooks/use-recurring.ts`: `useRecurring({ includeArchived? })`, mutasi `createRule`, `updateRule`, `archiveRule`, `restoreRule`, `advanceRule`. Mutasi melempar `ApiError` dan memanggil `invalidate` sesuai Kontrak untuk modul lain. Tanpa optimistic update (form terbuka, sama dengan transactions keputusan #7), kecuali arsip dengan "Urungkan".
- `lib/cache-invalidation.ts`: resource `recurring` dan edge di atas.
- `components/layout/nav-items.ts`: `recurringItem` (`/recurring`, "Recurring", ikon `RepeatIcon`) di `sidebarItems` dan menu More `bottom-nav.tsx`.
- Tidak ada data aturan di Zustand.

### 3. UI

- **`app/(app)/recurring/page.tsx`**, isi di `components/recurring/recurring-view.tsx`.
  - Daftar aturan dikelompokkan Income / Expense / Saving. Baris: nama, "Rp… · tiap tanggal 25", jatuh tempo berikutnya ("25 Nov", atau "Terlambat · 25 Okt" dengan teks, bukan hanya warna), lencana "Gajian" untuk `isPayday`. Tap → form aturan. Tombol **Catat** selalu terlihat di setiap baris aktif (≥ 44 px, warna utama jika sudah jatuh tempo), tidak disembunyikan di menu; menu baris: Lewati, Arsipkan. Di layar sempit tombol turun ke baris kedua, rata kanan.
  - Tombol "Tambah aturan" → `components/forms/recurring-form.tsx` di `ResponsiveModal`: tipe (hanya saat create), nama, `MoneyInput`, `AccountPicker`, `CategoryPicker` (kind dari tipe), tanggal 1–31 (grid 7 kolom di dropdown, sel ≥ 44 px, font 16 px, teks bantuan "Bulan yang lebih pendek memakai hari terakhirnya"), switch "Ini gaji saya" (hanya income; teks bantuan saat akan mengganti gajian lama). Edit `dayOfMonth` pada aturan yang terlambat menampilkan peringatan keputusan #14.
  - Arsipkan → toast "Aturan diarsipkan · Urungkan" (6 detik). Tautan "Lihat arsip" menampilkan aturan terarsip dengan tombol Pulihkan.
  - Empty state: penjelasan satu kalimat + "Tambah gaji" (form dengan income + gajian tercentang) dan "Tambah tagihan".
- **`components/recurring/due-inbox.tsx`** (dashboard): judul "Jatuh tempo", baris per aturan di `due`: nama, nominal, "hari ini" / "terlambat 3 hari". Tombol **Catat** (≥ 44 px) membuka `TransactionForm` dengan prop `recurring={{ rule, occurrenceDate }}` di `ResponsiveModal`, dan tombol **Lewati** dengan teks bantuan "Sudah dicatat manual atau tidak terjadi bulan ini". Lewati langsung memanggil `advance` dan menampilkan toast tanpa undo (Open question #4).
- **`components/recurring/payday-card.tsx`** (dashboard): status `ok` → "12 hari lagi gajian (25 Nov)", baris Terikat dan Bebas, dan rincian `items` yang bisa dibuka (nama, tanggal, nominal). `free < 0` → "Kurang Rp…" dengan teks. `payday_due` → "Gaji belum dicatat" + Catat. `no_payday` dengan aturan lain → "Tandai aturan gaji untuk melihat proyeksi". `hideAmounts` menyamarkan semua nominal.
- **`TransactionForm`:** prop opsional `recurring`. Jika ada: default dari aturan (keputusan #11), tipe dikunci, submit memanggil `advanceRule` dengan `id` dari `crypto.randomUUID()` yang dibuat sekali per form, peringatan saldo tetap berjalan, sukses → tutup modal + toast "{nama} dicatat". 409 `OCCURRENCE_STALE` → toast + tutup + revalidasi.
- Offline (`useOnlineStatus`): tombol Catat, Lewati, dan simpan form aturan dinonaktifkan dengan teks "Butuh koneksi".
- Mobile: layout benar di 360 px, target sentuh ≥ 44×44 px, input 16 px, kontras ≥ 4.5:1. Ikuti [DESIGN.md](DESIGN.md).

## Acceptance criteria

**API**

- [x] `POST { type: "expense", name: "Netflix", amount: 186000, accountId, categoryId: <Langganan>, dayOfMonth: 5 }` pada 2026-10-27 → 201, `nextDueDate = "2026-11-05"`. Dengan `dayOfMonth: 27` → `"2026-10-27"`. Dengan `dayOfMonth: 31` pada 2026-11-03 → `"2026-11-30"`.
- [x] `advanceDate(31, "2026-01-31") = "2026-02-28"`, lalu `"2026-03-31"`. `advanceDate(29, "2028-01-29") = "2028-02-29"` (kabisat). `advanceDate(15, "2026-12-15") = "2027-01-15"`.
- [x] `advance { action: "post", occurrenceDate: nextDueDate, id, … }` → 200, transaksi tertulis dengan `type` dari aturan, `nextDueDate` maju satu bulan, saldo akun berubah. Request yang sama diulang → 200 replay dengan transaksi yang sama, tanpa baris baru, `nextDueDate` tidak maju dua kali. Dua request paralel (`Promise.all`) dengan `id` berbeda → tepat satu 200, satu 409 `OCCURRENCE_STALE`, satu transaksi.
- [x] `advance { action: "skip" }` → 200 `transaction: null`, tidak ada transaksi, `nextDueDate` maju. `occurrenceDate` ≠ `nextDueDate` → 409, tidak ada perubahan.
- [x] `post` dengan kategori `kind` salah, akun terarsip, akun/kategori milik user lain, `date` masa depan, atau `amount` 0 → 400 dengan `fields`, dan **aturan tidak maju**.
- [x] Aturan tertinggal 3 bulan: `due` memuatnya dengan kejadian tertua, setelah satu `skip` `nextDueDate` = bulan berikutnya dan masih di `due`.
- [x] `POST`/`PATCH` dengan `isPayday: true` pada aturan B saat A gajian aktif → B gajian, A tidak. `isPayday: true` dengan `type: "expense"` → 400 `fields.isPayday`. `DELETE` aturan gajian → `isPayday = false`, restore tidak bentrok.
- [x] `PATCH { type }` → 400. `PATCH { dayOfMonth: 10 }` pada 2026-10-27 → `nextDueDate = "2026-11-10"`. `PATCH` field lain tidak mengubah `nextDueDate`.
- [x] **Proyeksi** dengan hari ini 2026-11-13, gajian tanggal 25 (`nextDueDate 2026-11-25`), Netflix tanggal 5 terlambat (`2026-11-05`), sewa tanggal 1 (`2026-12-01`), setoran tabungan tanggal 20, saldo akun debit 3.000.000, e-wallet 200.000, kartu kredit −500.000, investasi 10.000.000, debit terarsip 999 → `status "ok"`, `daysLeft 12`, `spendable 3200000`, `committed` = Netflix + setoran (sewa tidak), `free = spendable − committed`. Gajian `nextDueDate ≤ hari ini` → `payday_due`. Tanpa gajian → `no_payday`.
- [x] Invarian `spendable` terhadap `GET /api/accounts`.
- [x] **Isolasi:** user B mendapat 404 untuk `PATCH`/`DELETE`/`restore`/`advance` aturan A, `GET` B tidak pernah memuat aturan atau saldo A, dan B tidak bisa membuat aturan atau Catat ke akun/kategori A.
- [x] Tanpa session, semua route → 401 `UNAUTHORIZED`. Body dengan `userId` atau `nextDueDate` → 400.
- [x] Semua tes `tests/api/transactions*.spec.ts` yang ada tetap hijau tanpa diubah.

**UI (manual di 360 px dan 1024 px)**

- [x] Tambah gaji (tanggal 25, gajian) dan dua tagihan dari `/recurring` → kartu gajian di dashboard menampilkan hari tersisa, terikat, dan bebas tanpa reload.
- [x] Tagihan jatuh tempo muncul di Jatuh tempo. Catat → form terisi, ubah nominal, Simpan → transaksi ada di `/transactions`, saldo dan "bebas" berubah, baris hilang dari Jatuh tempo. Lewati → baris hilang, tidak ada transaksi.
- [x] Tap Simpan dua kali cepat di form Catat → satu transaksi.
- [x] Gaji jatuh tempo dan belum dicatat → kartu "Gaji belum dicatat", Catat dari kartu memulihkan proyeksi ke siklus berikutnya.
- [x] Mode pesawat: dashboard dan `/recurring` tampil dari cache, tombol aksi nonaktif dengan teks "Butuh koneksi".
- [x] "Recurring" ada di sidebar (≥ lg) dan menu More (< lg). Status terlambat terbaca tanpa warna. `hideAmounts` menyamarkan nominal di kedua kartu.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Tes

- **Unit (`tests/unit/`):**
  - `recurring-schedule.spec.ts`: `advanceDate` (31 → Feb → Mar, kabisat, Desember → Januari), `firstDueOnOrAfter` (hari yang sama, sudah lewat, anchor > hari terakhir bulan ini).
  - `period.spec.ts`: `clampDay`, `daysBetween`, `lastDayOfMonth`, `addDays`.
  - `payday-forecast.spec.ts`: tiga status, kejadian tertinggal, banyak kejadian sebelum gajian, income non-gajian diabaikan, aturan di hari gajian tidak ikut (`< payday`), `free` negatif.
  - `recurring-schema.spec.ts`: batas field, `strictObject`, refine `isPayday`, union `advance`.
  - `cache-invalidation.spec.ts` (yang ada): edge `recurring` baru.
- **API (`tests/api/`, Supabase sungguhan, user `test-<uuid>`):**
  - `recurring.spec.ts`: CRUD, arsip/restore, tukar gajian, `PATCH` jadwal, 404 id bukan UUID, isolasi A/B, 401.
  - `recurring-advance.spec.ts`: post/skip, replay, paralel, stale, validasi atomik (aturan tidak maju saat 400), isolasi.
  - `recurring-overview.spec.ts`: skenario proyeksi di Acceptance criteria dengan `today` tetap, invarian `spendable`.
- **E2E:** tetap ditunda (SPEC.md Open question #2).
- Satu berkas: `pnpm vitest run tests/api/recurring-advance.spec.ts`.

## Struktur file

```
app/api/recurring/{route.ts, [id]/route.ts, [id]/restore/route.ts, [id]/advance/route.ts}
app/(app)/recurring/page.tsx
components/recurring/                     # recurring-view, rule-row, due-inbox, payday-card
components/forms/recurring-form.tsx
components/forms/transaction-form.tsx     # prop recurring
components/dashboard/dashboard-view.tsx   # pasang DueInbox + PaydayCard
components/layout/{nav-items.ts, bottom-nav.tsx}
hooks/use-recurring.ts
lib/schemas/recurring.ts, lib/recurring-schedule.ts, lib/payday-forecast.ts
lib/server/recurring.ts, lib/server/queries/recurring-overview.ts
lib/server/transactions.ts                # executor opsional
lib/cache-invalidation.ts, lib/api/errors.ts
db/schema.ts, drizzle/<timestamp>_recurring_rules/
tests/unit/*.spec.ts, tests/api/recurring*.spec.ts
```

Perintah, gaya kode, dan format error mengikuti [SPEC.md](SPEC.md).

## Boundaries (khusus modul ini)

- **Always:** hitung "hari ini" dengan `todayInJakarta()` dan tanggal dari string, cek kepemilikan dan status aktif akun/kategori di setiap create, edit referensi, dan `post`, majukan aturan dan tulis transaksi dalam satu transaksi DB dengan syarat `next_due_date = occurrenceDate`, kirim `id` transaksi dari client di setiap Catat, panggil `invalidate` setelah setiap mutasi.
- **Ask first:** cron atau posting otomatis apa pun, frekuensi selain bulanan, tabel kejadian atau riwayat aksi, kolom baru di `accounts` (mis. toggle "ikut proyeksi"), mengubah kontrak `POST /api/transactions`, memasukkan aturan ke `budgetUsage`, mengantre `advance` di outbox.
- **Never:** menulis transaksi bertanggal masa depan, menulis transaksi tanpa tap pemilik, menerima `userId` atau `nextDueDate` dari body, hard delete aturan, menyalin aturan ke Zustand, memakai server action.

## Risiko

- **Insert transaksi di dalam transaksi DB lain:** `createTransaction` saat ini membuka transaksi DB sendiri. Refactor executor bisa mengubah perilaku replay transactions. Mitigasi: semua tes transaksi yang ada wajib hijau tanpa diubah, dan tes paralel di `recurring-advance.spec.ts`.
- **Proyeksi dipercaya padahal ada tagihan yang dicatat manual tanpa Lewati:** "bebas" menjadi terlalu kecil (aman, tetapi menyesatkan). Teks bantuan Lewati menyebut kasus ini. Jika sering terjadi setelah dua siklus, pertimbangkan lagi pencocokan otomatis (Ask first).
- **Kotak Jatuh tempo diabaikan:** tanpa push, aturan yang tidak dibuka tetap terlambat dan "terikat" membengkak. Diterima di keputusan #1. Ukur setelah dua siklus.
- **Tanggal bergeser sehari:** semua aritmetika jadwal dari string. Tes akhir bulan, kabisat, pergantian tahun.
- **Bundle dashboard:** dua komponen baru di halaman yang sudah di atas target 200 KB (lihat Catatan ukuran di [tasks/plan.md](tasks/plan.md)). Ukur sebelum/sesudah, target tambahan < 5 KB gzip.
- **`cacheComponents`:** `/recurring` memakai session lewat hook client, jadi di dalam `<Suspense>` seperti halaman lain. Baca `node_modules/next/dist/docs/` sebelum menulis page.

## Open questions

1. ~~Posting otomatis vs konfirmasi~~ **Diputuskan:** konfirmasi (keputusan #1).
2. **Income selain gaji** (bonus, sampingan) tidak ikut proyeksi: setuju, atau dihitung jika jatuh tempo sebelum gajian?
3. **"Sudah dicatat" dan "Lewati" digabung** menjadi satu aksi Lewati (keputusan #7), karena server tidak menyimpan perbedaannya: setuju, atau tetap dua tombol dengan efek sama?
4. **Lewati tanpa undo:** setuju, atau toast "Urungkan" (butuh endpoint mundur dengan syarat `next_due_date` yang sama)?
5. **Tanggal default form Catat** = tanggal kejadian (bisa di masa lalu untuk yang terlambat): setuju, atau selalu hari ini?
