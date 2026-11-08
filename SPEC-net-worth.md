# Spec module: `net-worth`

Status: diimplementasikan (T123–T138, 2026-11-03; cek UI manual tertunda). Revisi "check-in hari ini + deskripsi" (keputusan #6, #7, #23) diimplementasikan di T135–T137. Modul, tabel, API, dan kode diganti nama dari `goals` menjadi `net-worth` (2026-11-05) · @Yogi
Bergantung pada: `accounts-categories`, `transactions` · Dipakai oleh: — · Indeks: [SPEC.md](SPEC.md)
Asal: sesi idea-refine 2026-11-01 ("Net Worth Targets", referensi: fitur Net Worth Tracker Monsy). Revisi dari sesi idea-refine 2026-11-02 ("Perbarui nilai tidak bisa backdate").

## Objective

Pemilik tahu **seberapa dekat ia dengan setiap targetnya** (mis. "Dana Darurat 30 jt", "DP Rumah 150 jt"), dengan angka yang jujur memisahkan uang yang ia setor dari kenaikan/penurunan nilai pasar, dan tanpa upkeep selain satu check-in nilai per bulan.

Dua bagian yang saling bergantung:

1. **Revaluasi.** Tipe transaksi baru `revaluation`. Dari sheet "Perbarui nilai" sebuah akun aset, pemilik mengetik nilai terkininya (reksadana dari aplikasinya, emas fisik di harga buyback), dan server mencatat selisihnya sebagai satu baris bertanda. Perubahan nilai pasar menjadi kejadian bertanggal dengan label yang benar, bukan "Penyesuaian saldo awal".
2. **Target.** Satu target = nama, nominal, bulan target opsional, dan akun-akun yang dihitung. Kartu target menampilkan progres, porsi setoran vs pasar, perkiraan bulan tercapai dari laju setoran 3 bulan terakhir, dan setoran per bulan yang dibutuhkan jika ada bulan target.

Modul ini pemilik **kontrak** `/api/net-worth*` dan `/api/valuations`, query `netWorthProgress` dan `assetValuations`, fungsi murni `netWorthProjection`, hook SWR-nya, dan halaman `/net-worth`.

**Sukses berarti:** setelah dua check-in bulanan, pemilik bisa menjawab "kapan DP Rumah tercapai, dan berapa per bulan yang dibutuhkan supaya tepat waktu" dari satu layar, dan `current` setiap target sama persis dengan jumlah nilai yang ia ketik saat check-in ditambah transaksi sesudahnya.

Di luar cakupan: harga otomatis (saham, emas, kripto, NAB), saham, kuantitas (gram, unit), liabilitas, grafik net worth dari waktu ke waktu (histori nilai aset kini modul `asset-history`, [SPEC-asset-history.md](SPEC-asset-history.md)), tabel snapshot atau cron, transfer berulang ke target, satu akun dibagi ke beberapa target, target FI (25× pengeluaran tahunan), kartu target di dashboard, notifikasi atau pengingat check-in.

## Keputusan

Nomor 1–3 diputuskan Yogi pada 2026-11-01 (sesi idea-refine). Sisanya, perubahan skema, dan capability map disetujui Yogi pada 2026-11-01 (T123), termasuk menjalankan kedua migrasi di DB bersama setelah SQL `--explain` dibaca.

1. **Nilai diperbarui manual.** Fase ini fokus pada akun reksadana dan emas fisik. Saham dan harga otomatis menyusul di fase lain, jadi tidak ada dependency atau layanan eksternal baru.
2. **Pertanyaan utama = progres ke target,** bukan grafik net worth. Total net worth saat ini sudah ada di kartu Account Balance dashboard dan tidak berubah.
3. **Setoran tercatat sebagai transfer** dari akun transaksi ke akun aset (keputusan #9 SPEC.md). Tipe `saving` tidak dipakai modul ini.
4. **Revaluasi = tipe transaksi, bukan tabel nilai.** Paling banyak satu baris `revaluation` hidup per akun per tanggal (keputusan #6), `amount = nilai baru − saldo saat check-in`. Karena semua perubahan saldo tetap berupa transaksi bertanggal, view `account_balances` cukup ditambah satu baris dan riwayat nilai bisa diturunkan nanti tanpa snapshot. Selisih 0 tidak membuat baris (sama dengan adjustment).
5. **Revaluasi hanya untuk akun aktif dengan `type = "asset"`.** Akun transaksi berubah lewat transaksi biasa.
6. **Check-in selalu bertanggal hari ini, sekali sehari.** Client tidak mengirim tanggal. Server memberi tanggal `todayInJakarta()` saat request diproses, jadi backdate dan tanggal masa depan tidak bisa dibuat dari kontrak, bukan sekadar ditolak. Nilai yang berubah (delta ≠ 0) ditolak jika akun itu sudah punya revaluasi hidup bertanggal hari ini atau sesudahnya, karena nilai kedua di hari yang sama membuat dua baris untuk satu hari. Item dengan delta 0 tidak menulis apa pun, jadi tidak dicek (ulangan request tetap `recorded: 0`). Menghapus revaluasi hari ini membuka hari itu lagi. Nilai akhir bulan yang baru diketik tanggal 2 tercatat tanggal 2; presisi tanggal pasar (NAB T-1) tidak dikejar. Revaluasi lama yang bertanggal mundur dibiarkan apa adanya. (Diubah 2026-11-02 dua kali: dari "≥ revaluasi terakhir" menjadi "sesudah revaluasi terakhir", lalu backdate dihapus karena picker tanggal hanya menambah langkah, mudah salah sentuh, dan membuat riwayat sulit dibaca.)
7. ~~**Saldo per tanggal D**~~ **Dihapus 2026-11-02.** Dengan keputusan #6, tanggal check-in selalu hari ini dan transaksi masa depan tidak bisa dibuat, jadi saldo per tanggal sama dengan `balance` di view `account_balances`. Delta dihitung dari view.
8. **Revaluasi tidak bisa diedit, boleh dihapus** (soft delete + Urungkan, sama dengan adjustment). Menghapusnya menggeser saldo kembali. Tidak ada aturan urutan untuk hapus (lihat [Risiko](#risiko)).
9. **Setoran vs pasar adalah identitas, bukan tebakan.** Per akun: `marketGain` = jumlah revaluasi hidup, `contributed = balance − marketGain`. Saldo awal dan adjustment termasuk `contributed` (anggap saldo awal sebagai modal; isi saldo awal emas dengan harga beli supaya angka pasarnya bermakna).
10. **Satu akun di paling banyak satu target aktif.** Dicek server di dalam transaksi DB yang memegang `pg_advisory_xact_lock(hashtext(user_id))`, sama dengan budget keputusan #4. Akun yang terhubung boleh tipe apa pun kecuali `subtype = "credit_card"` (dana darurat bisa di rekening debit).
11. **Laju setoran = arus bersih bulanan ke akun-akun target,** tidak termasuk `adjustment` dan `revaluation`. Income ke akun target menambah, expense/saving dari akun target mengurangi, transfer masuk menambah, transfer keluar mengurangi. Transfer antar dua akun di target yang sama otomatis bernilai 0. Transfer antar target memindahkan progres.
12. **Jendela laju = 3 bulan kalender penuh sebelum bulan berjalan** (Asia/Jakarta). Bulan sebelum bulan `created_at` akun target tertua tidak dihitung di pembagi. Belum ada bulan penuh → laju `null`. Laju ≤ 0 → tanpa perkiraan.
13. **Perkiraan konservatif:** hanya dari setoran, kenaikan pasar tidak diproyeksikan. `etaMonth` = bulan berjalan + `ceil(remaining / laju) − 1` (sisa ≤ laju bulanan → tercapai bulan ini).
14. **Bulan target, bukan tanggal.** `targetMonth: "YYYY-MM" | null`, ≥ bulan berjalan saat dibuat atau diubah. `monthsLeft` = jumlah bulan dari bulan berjalan sampai bulan target, inklusif. `neededPerMonth = ceil(remaining / monthsLeft)`. Bulan target sudah lewat → `overdue`, `neededPerMonth = remaining`.
15. **Akun terarsip tidak dihitung** di `current`, `marketGain`, maupun laju (sama dengan dashboard keputusan #6), tetapi tetap tersimpan di target dan tampil "(arsip)". `PATCH` boleh membiarkannya, tapi tidak bisa menambahkan akun terarsip.
16. **Basi = akun aset di target yang belum pernah direvaluasi atau revaluasi terakhirnya > 35 hari.** Kartu target dan sheet menampilkan "diperbarui 47 hari lalu" sebagai teks, supaya angka yang sudah tidak terawat terlihat.
17. **Nama target unik tanpa beda huruf besar** di antara target aktif → 409 `NET_WORTH_NAME_TAKEN`. Nama target terarsip boleh dipakai lagi.
18. **Hapus = arsip** dengan Urungkan dan restore. Restore mengecek ulang nama dan akun → 409 `NET_WORTH_RESTORE_CONFLICT` jika bentrok.
19. **Subtype `gold` ("Emas")** ditambahkan ke `ACCOUNT_SUBTYPES`. Hanya perubahan Zod dan label, karena kolom `subtype` tidak punya check constraint di DB. Mengubah keputusan #4 accounts-categories.
20. **Halaman `/net-worth`** (label nav "Net Worth"; dulu `/goals`, dipindah 2026-11-02; redirect `/goals` dihapus 2026-11-05 bersama penggantian nama modul) di sidebar dan menu More bottom nav, sama dengan `/recurring`. Dashboard tidak berubah di fase ini.
21. **Online saja.** Simpan target, check-in, arsip, dan restore dinonaktifkan saat offline ("Butuh koneksi"). `GET` tetap tampil dari cache service worker lewat aturan `GET /api/*` yang sudah ada.
22. **Label UI** mengikuti keputusan #10 accounts-categories: nav bahasa Inggris, tombol/form/pesan bahasa Indonesia. `revaluation` berlabel "Revaluasi".
23. **Deskripsi opsional per item check-in** (2026-11-02). `items[i].note` disimpan di `transactions.description` baris revaluasinya, dengan aturan `description` transaksi (trim, maks 200, kosong → `null`). Tanpa catatan → `description = null`, sehingga daftar cukup menampilkan "Revaluasi" (sebelumnya selalu "Pembaruan nilai"; baris lama tidak dimigrasi). Item dengan delta 0 tidak menulis baris, jadi `note`-nya diabaikan **tanpa error di server**: ulangan request setelah respons hilang harus tetap `recorded: 0`. Sheet yang mencegah catatan hilang diam-diam (lihat UI).

## Perubahan skema

Tabel ke-7, ditambah perubahan constraint `transactions` dan view. Mengubah keputusan terkunci #8 di [SPEC.md](SPEC.md) dan butuh persetujuan (Ask first: skema di luar spec, migrasi yang mengubah constraint). Dua migrasi baru: `drizzle/<timestamp>_revaluation/` (constraint, view, index) dan `drizzle/<timestamp>_goals_table/` (tabel `net_worth`, RLS), supaya revaluasi bisa tayang sebelum target. Tidak ada kolom yang diubah atau dihapus. Migrasi ketiga `drizzle/20261105120858_rename_goals_to_net_worth/` (2026-11-05) mengganti nama tabel `goals` menjadi `net_worth` beserta check, index, primary key, dan FK-nya, tanpa perubahan data.

```ts
// db/schema.ts
// account_ids has no FK, same as budgets.category_ids: ownership and the one-net-worth rule are checked on write.
export const netWorths = pgTable.withRLS(
  "net_worth",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    targetAmount: money("target_amount").notNull(),
    targetYear: integer("target_year"),
    targetMonth: integer("target_month"),
    accountIds: uuid("account_ids").array().notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("net_worth_amount_check", sql`${t.targetAmount} between 1 and 1000000000000`),
    check(
      "net_worth_target_check",
      sql`(${t.targetYear} is null) = (${t.targetMonth} is null) and (${t.targetMonth} is null or ${t.targetMonth} between 1 and 12)`,
    ),
    check("net_worth_account_ids_check", sql`cardinality(${t.accountIds}) between 1 and 20`),
    index("net_worth_user_idx").on(t.userId),
  ],
);
```

| Objek                                  | Sebelum                                                     | Sesudah                                                                          |
| -------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `transactions_type_check`              | `in (…, 'transfer', 'adjustment')`                          | tambah `'revaluation'`                                                           |
| `transactions_amount_check`            | `adjustment → amount <> 0`, selain itu `amount > 0`         | `adjustment`, `revaluation → amount <> 0`, selain itu `amount > 0`               |
| `transactions_category_check`          | `(type in ('transfer','adjustment')) = (category_id is null)` | `(type in ('transfer','adjustment','revaluation')) = (category_id is null)`      |
| view `account_balances`                | `income`, `adjustment → +amount`                            | `income`, `adjustment`, `revaluation → +amount`                                  |
| `transactions_user_account_type_idx`   | —                                                           | `(user_id, account_id, type, date)` untuk revaluasi terakhir dan saldo per tanggal |
| RLS `net_worth`                            | —                                                           | aktif, tanpa policy (deny-all)                                                   |

Nama kolom dan bentuk builder mengikuti `db/schema.ts` (Drizzle 1.0 RC, cek `.d.ts` terpasang). Index baru boleh dihapus dari migrasi jika `EXPLAIN` menunjukkan `transactions_user_account_idx` sudah cukup.

## Kontrak API

Semua route memakai `withAuth`, memfilter `user_id` dari session, dan format error dari `lib/api/errors.ts`. Id target di path yang bukan UUID, tidak ada, atau milik user lain → **404 `NET_WORTH_NOT_FOUND`**. `PATCH` pada target terarsip juga 404.

### Tipe

```ts
// lib/schemas/net-worth.ts (dipakai client & server)
type NetWorth = {
  id: string;
  name: string;
  targetAmount: number; // integer rupiah, 1..1e12
  targetMonth: string | null; // YYYY-MM
  accountIds: string[]; // urutan dari client dipertahankan
  archivedAt: string | null;
  createdAt: string;
};

type NetWorthProjection = {
  remaining: number; // max(targetAmount − current, 0)
  reached: boolean; // remaining = 0
  monthlyContribution: number | null; // keputusan #12, dibulatkan ke bawah
  etaMonth: string | null; // YYYY-MM, null jika reached, laju null, atau laju ≤ 0
  monthsLeft: number | null; // null tanpa targetMonth
  neededPerMonth: number | null; // null tanpa targetMonth atau jika reached
  overdue: boolean; // targetMonth < bulan berjalan dan belum reached
  onTrack: boolean | null; // etaMonth ≤ targetMonth; null tanpa targetMonth atau etaMonth
};

type NetWorthProgress = NetWorth & {
  current: number; // jumlah balance akun aktif di target
  marketGain: number; // jumlah revaluasi hidup akun aktif di target
  contributed: number; // current − marketGain
  staleAccountIds: string[]; // keputusan #16
  projection: NetWorthProjection;
};

// lib/schemas/valuation.ts
type AssetValuation = {
  accountId: string;
  balance: number;
  marketGain: number;
  contributed: number;
  lastValuedAt: string | null; // YYYY-MM-DD revaluasi hidup terakhir
  netWorthId: string | null; // target aktif yang memakai akun ini
};
```

### Route

| Method & path                    | Body / query                                                  | Sukses                                            | Error                              |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------- |
| `GET /api/net-worth`                 | `?includeArchived=true` (opsional)                            | 200 `NetWorthProgress[]`, urut `created_at`           | —                                  |
| `POST /api/net-worth`                | `{ name, targetAmount, targetMonth?, accountIds }`            | 201 `NetWorthProgress`                                | 400, 409 `NET_WORTH_NAME_TAKEN`         |
| `PATCH /api/net-worth/[id]`          | subset field create (min 1)                                   | 200 `NetWorthProgress`                                | 400, 404, 409 `NET_WORTH_NAME_TAKEN`    |
| `DELETE /api/net-worth/[id]`         | —                                                             | 200 `NetWorthProgress` (`archivedAt` terisi). Idempoten | 404                              |
| `POST /api/net-worth/[id]/restore`   | —                                                             | 200 `NetWorthProgress` (aktif). Idempoten             | 404, 409 `NET_WORTH_RESTORE_CONFLICT`   |
| `GET /api/valuations`            | —                                                             | 200 `AssetValuation[]`, akun aset aktif, urutan sama dengan `GET /api/accounts` | — |
| `POST /api/valuations`           | `{ items: [{ accountId, value, note? }] }`                   | 200 `{ recorded: number; assets: AssetValuation[] }` | 400                             |

Target terarsip ikut `GET` dengan `includeArchived`, dihitung dengan aturan yang sama. Nama akun di-resolve di client dari `useAccounts({ includeArchived: true })` (keputusan #8 transactions).

### Validasi (Zod)

- Body memakai `z.strictObject`. Field tak dikenal (termasuk `userId`) → 400.
- `name`: trim, 1..60. `targetAmount`: `z.int()`, 1..1e12. `targetMonth`: `YYYY-MM` valid (`isPeriod` mode bulan), ≥ bulan berjalan, atau `null`.
- `accountIds`: `z.uuid()`, 1..20, tanpa duplikat. Setiap id milik user, aktif (kecuali yang sudah ada di target saat `PATCH`), bukan `credit_card`, dan tidak dipakai target aktif lain → 400 `fields.accountIds` dengan pesan yang menyebut akun pertama yang bermasalah. Id asing dan id tidak ada memakai pesan yang sama.
- Check-in tidak punya `date`: body berisi `date` → 400 (`strictObject`). `items`: 1..50, `accountId` unik. `value`: `z.int()`, 0..1e12. `note`: schema `description` transaksi, opsional (keputusan #23).
- Setiap `items[i].accountId` milik user, aktif, dan `type = "asset"` → selain itu 400 dengan `fields["items.<i>"]`.
- Keputusan #6, dicek per item yang delta-nya ≠ 0 → 400 `fields["items.<i>"]` "Nilai sudah diperbarui hari ini. Revaluasi hanya sekali sehari."

### Aturan tulis

- **Target** (`POST`, `PATCH`, `restore`): satu transaksi DB dengan `pg_advisory_xact_lock(hashtext(user_id))`, lalu cek nama unik dan akun (keputusan #10, #17), lalu tulis. `PATCH` yang tidak mengubah `accountIds` tidak mengecek ulang akun. `DELETE` mengisi `archived_at` dengan `coalesce` (sama dengan arsip akun).
- **Check-in** (`POST /api/valuations`), dalam **satu transaksi DB**:
  1. `select … from accounts where user_id and id in (…) order by id for update` (urutan tetap mencegah deadlock antar check-in paralel).
  2. `today = todayInJakarta()`, dihitung sekali per request. Per item, query terpisah sesudah lock (snapshot baru di READ COMMITTED, sama dengan `updateAccount`): tanggal revaluasi terakhir per akun dan `balance` dari view `account_balances`.
  3. `delta = value − balance`. `delta ≠ 0` dan revaluasi terakhir akun itu ≥ `today` → 400 tanpa baris (keputusan #6). Selain itu `delta ≠ 0` → insert `{ type: "revaluation", amount: delta, date: today, accountId, description: note ?? null }`. `recorded` = jumlah baris yang ditulis.
  - Ulangi request yang sama setelah respons hilang → semua delta 0, `recorded: 0`, `note` diabaikan. Idempoten tanpa id dari client. Ulangan yang tiba sesudah tengah malam juga delta 0, jadi tetap tanpa baris.
- **`revaluation` di API transaksi:** tidak masuk `TRANSACTION_TYPES`, jadi tidak bisa dibuat lewat `POST /api/transactions`. `PATCH` → 409 `TRANSACTION_NOT_EDITABLE` (jalur adjustment yang sudah ada). `DELETE` dan `restore` seperti adjustment.

### Query

- `lib/server/queries/net-worth-progress.ts`: `netWorthProgress(userId, { today, includeArchived })`. Tiga agregasi di SQL, dibatasi target milik user:
  - per target: `sum(balance)` dan `sum(revaluasi)` akun aktif (`unnest(account_ids)` join `accounts` + `account_balances`), serta `max(date)` revaluasi per akun aset untuk keputusan #16;
  - arus bersih per target per bulan di jendela keputusan #12: join transaksi ke `unnest(account_ids)` dari sisi `account_id` **dan** `to_account_id`, efek per sisi sama dengan view, tipe `adjustment`/`revaluation` dikecualikan, `group by net_worth_id, date_trunc('month', date)`, bulan kosong = 0;
  - `min(created_at)` akun target untuk pembagi.
  Hasilnya puluhan baris, lalu `netWorthProjection` di TS. Menerima `today` supaya tes memakai tanggal tetap, sama dengan `dashboardSummary`.
- `lib/server/queries/asset-valuations.ts`: per akun aset aktif, `balance`, `sum` revaluasi hidup, `max(date)` revaluasi hidup, dan `netWorthId` dari target aktif.
- **Invarian:** `current` target = jumlah `balance` dari `GET /api/accounts` untuk akun aktifnya. `contributed + marketGain = balance` per akun di `GET /api/valuations`. Dites.

### Fungsi murni

`lib/net-worth-projection.ts`: `netWorthProjection({ targetAmount, targetMonth, current, monthlyFlows, countedMonths, today })` → `NetWorthProjection`. `monthlyFlows` = arus per bulan di jendela, `countedMonths` = 0..3 (keputusan #12). Aritmetika bulan memakai `lib/period.ts` (`periodToYearMonth`, `yearMonthToPeriod`), tanpa `Date` lokal.

### Kontrak untuk modul lain

- **`transactions`** (perubahan di modul itu, perlu revisi [SPEC-transactions.md](SPEC-transactions.md)): `LIST_TRANSACTION_TYPES` mendapat `"revaluation"`. Daftar menampilkan "Revaluasi" + nama akun, nominal bertanda seperti adjustment. Filter tipe mendapat "Revaluasi". Detail memakai kartu hanya-baca adjustment dengan label sendiri. `transactionTotals`, `dashboardSummary`, dan `budgetUsage` tidak berubah karena hanya menghitung income/expense/saving. Ekspor CSV menulis nominal bertanda.
- **`accounts-categories`** (perlu revisi [SPEC-accounts-categories.md](SPEC-accounts-categories.md)): subtype `gold` (keputusan #19), tabel constraint di § Transaksi penyesuaian mendapat baris `revaluation`. Kontrak `GET /api/accounts` tidak berubah.
- **Revalidasi (`lib/cache-invalidation.ts`):** `Resource` mendapat `"netWorths"` (`/api/net-worth`) dan `"valuations"` (`/api/valuations`). `AFFECTS.transactions` dan `AFFECTS.accounts` mendapat keduanya (saldo dan arsip akun mengubah progres). `AFFECTS.netWorths = ["valuations"]`, karena `GET /api/valuations` memuat `netWorthId` (diubah saat implementasi T132). Check-in menulis transaksi, jadi mutasinya memanggil `invalidate("transactions")`, yang menjangkau saldo, dashboard, recurring, goals, dan valuations. `AFFECTS.valuations = []`.
- **`dashboard`, `budgets`, `recurring`:** tidak berubah. Kartu Account Balance otomatis ikut nilai baru karena membaca `balance`.
- **`pwa-offline`:** tidak berubah. Outbox tetap hanya untuk create transaksi.

## Deliverables

### 1. Server

- `db/schema.ts` (tabel `net_worth`, constraint, view) + migrasi `drizzle/<timestamp>_revaluation/` dan `drizzle/<timestamp>_goals_table/` (`pnpm db:generate`, lalu SQL view dan RLS).
- `lib/schemas/net-worth.ts`, `lib/schemas/valuation.ts`: tipe, `netWorthCreateSchema`, `netWorthUpdateSchema`, `valuationSchema`. `lib/schemas/account.ts`: subtype `gold`.
- `lib/net-worth-projection.ts` (murni).
- `lib/server/net-worth.ts`: `createNetWorth`, `updateNetWorth`, `archiveNetWorth`, `restoreNetWorth`. `lib/server/valuations.ts`: `recordValuations`.
- `lib/server/queries/net-worth-progress.ts`, `lib/server/queries/asset-valuations.ts`.
- `lib/server/transactions.ts`: `revaluation` diperlakukan seperti `adjustment` di jalur edit/hapus.
- `lib/api/errors.ts`: `netWorthNotFound()`, `netWorthNameTaken()`, `netWorthRestoreConflict()`.
- Route: `app/api/net-worth/route.ts`, `[id]/route.ts`, `[id]/restore/route.ts`, `app/api/valuations/route.ts`.

### 2. Client

- `hooks/use-net-worth.ts`: `useNetWorths({ includeArchived? })`, mutasi `createNetWorth`, `updateNetWorth`, `archiveNetWorth`, `restoreNetWorth`. `hooks/use-valuations.ts`: `useValuations()`, `recordValuations`. Mutasi melempar `ApiError` dan memanggil `invalidate`. Tanpa optimistic update, kecuali arsip dengan "Urungkan".
- `lib/cache-invalidation.ts`: resource dan edge di atas.
- `components/layout/nav-items.ts`: `netWorthItem` (`/net-worth`, "Net Worth", ikon `TrendingUpIcon`) di `sidebarItems` dan `moreItems`.
- `lib/transaction-format.ts`, `components/transactions/type-styles.ts`, `filter-panel.tsx`, `transaction-editor.tsx`: tipe `revaluation`.
- Tidak ada data target atau nilai di Zustand.

### 3. UI

- **`app/(app)/net-worth/page.tsx`**, isi di `components/net-worth/net-worth-view.tsx`.
  - Header: judul + tombol "Tambah target".
  - Daftar "Nilai aset": setiap baris akun punya tombol **Perbarui** (≥ 44 px) yang membuka sheet untuk akun itu saja. (Diubah 2026-11-02: sebelumnya satu tombol Perbarui nilai di header membuka semua akun aset.) Akun yang `lastValuedAt`-nya hari ini tidak menampilkan tombol itu, dan baris keterangannya berbunyi "diperbarui hari ini" (keputusan #6). Penolakan server tetap ada untuk check-in dari tab lain. Tombol "Perbarui" di baris basi kartu target tidak berubah, karena akun basi tidak mungkin sudah dinilai hari ini.
  - **`net-worth-card.tsx`** per target aktif: nama, `current` dari `targetAmount` dengan progress bar dan persen sebagai teks, baris "Disetor Rp… · Pasar +Rp…" (pasar negatif ditulis "−Rp…", bukan hanya warna), lalu satu kalimat proyeksi:
    - `reached` → "Tercapai".
    - dengan `targetMonth`: "Butuh Rp4,1 jt/bulan sampai Des 2028", ditambah "Dengan laju sekarang: Jan 2029 (terlambat 1 bulan)" atau "…: tepat waktu". `overdue` → "Bulan target sudah lewat · kurang Rp…".
    - tanpa `targetMonth`: "Dengan laju Rp4 jt/bulan, tercapai sekitar Jan 2029".
    - laju `null` → "Perkiraan muncul setelah satu bulan penuh". Laju ≤ 0 → "Belum ada setoran 3 bulan terakhir".
  - `staleAccountIds` tidak kosong → baris "Nilai Emas belum diperbarui 47 hari" dengan tombol "Perbarui" yang membuka sheet akun itu.
  - Tombol ikon "Ubah" di kartu (bukan tap seluruh kartu, karena kartu memuat tombol "Perbarui" untuk nilai basi; diubah saat T133) → `components/forms/net-worth-form.tsx` di `ResponsiveModal`: nama, `MoneyInput` nominal, bulan target opsional (`<input type="month">`, font 16 px, dengan tombol hapus), daftar centang akun (akun aktif bukan kartu kredit; akun milik target lain tampil nonaktif dengan teks "Dipakai {target}"), saldo setiap akun di sebelah namanya.
  - Arsip dari menu kartu → toast "Target diarsipkan · Urungkan" (6 detik). "Lihat arsip" menampilkan target terarsip dengan tombol Pulihkan.
  - Empty state: satu kalimat + "Tambah target". Tanpa akun aset → teks yang mengajak membuat akun aset di Settings.
- **`components/net-worth/valuation-sheet.tsx`** di `ResponsiveModal`, untuk **satu** akun aset, tanpa input tanggal (keputusan #6): satu field berlabel nama akun dengan subtype, "diperbarui 12 Okt" / "belum pernah", "Dicatat untuk hari ini, 2 Nov" sebagai teks hint, dan `MoneyInput` berisi `balance` sekarang. Di bawahnya field **"Deskripsi (opsional)"** (input teks 16 px, maks 200, sama dengan form transaksi; keputusan #23). Nilai yang tidak diubah tidak dikirim. Deskripsi terisi tapi nilai tidak berubah → error di field deskripsi "Deskripsi disimpan bersama nilai baru. Ubah nilainya dulu.", tanpa request. Simpan → toast "Nilai Emas diperbarui" (atau "Nilai sama, tidak ada yang dicatat"). `fields["items.0"]` dipasang di bawah field nilai, `fields.items` sebagai pesan form (input deskripsi memakai `maxLength={200}`, jadi pesan ini jarang muncul). API tetap menerima banyak item.
- `hideAmounts` menyamarkan semua nominal di kartu dan sheet.
- Offline (`useOnlineStatus`): tombol simpan, Perbarui nilai, arsip, dan pulihkan dinonaktifkan dengan teks "Butuh koneksi".
- Mobile: layout benar di 360 px, target sentuh ≥ 44×44 px, input 16 px, kontras ≥ 4.5:1. Ikuti [DESIGN.md](DESIGN.md).

## Acceptance criteria

Skenario dasar (hari ini 2026-11-15): akun BCA (`transaction`, debit), Emas (`asset`, gold, saldo awal 30.000.000), RD Saham (`asset`, investment, saldo awal 0), keduanya dibuat 2026-07-01. Transfer BCA → RD Saham 3.000.000 (Agt) dan 4.000.000 (Sep), BCA → Emas 5.000.000 (Okt), RD Saham → Emas 1.000.000 (Okt). Target "DP Rumah" 150.000.000, `targetMonth "2028-12"`, akun Emas + RD Saham.

**API**

- [x] `POST /api/valuations { items: [{ Emas, 36500000 }, { RD Saham, 6200000, note: "NAB naik" }] }` → `recorded: 2`, revaluasi +500.000 (Emas, `description null`) dan +200.000 (RD Saham, `description "NAB naik"`), keduanya bertanggal `todayInJakarta()`. `GET /api/accounts` → Emas 36.500.000, RD Saham 6.200.000. Request yang sama diulang → `recorded: 0`, tanpa baris baru, deskripsi tidak berubah. (Diubah 2026-11-02: sebelumnya `date` dikirim client.)
- [x] `GET /api/net-worth` → DP Rumah `current 42700000`, `marketGain 700000`, `contributed 42000000`, `monthlyContribution 4000000` (Agt 3 jt, Sep 4 jt, Okt 5 jt; transfer RD Saham → Emas bernilai 0), `remaining 107300000`, `etaMonth "2029-01"`, `monthsLeft 26`, `neededPerMonth 4126924`, `onTrack false`, `overdue false`.
- [x] Sesudah check-in Emas hari ini, nilai baru untuk Emas → 400 `fields["items.0"]` "…sekali sehari", tanpa baris. Nilai sama → `recorded: 0`. Hapus revaluasi hari ini, lalu nilai baru → 200, `recorded: 1`. Body berisi `date` (berapa pun nilainya) → 400. `note` > 200 karakter → 400 `fields.items` (`flattenError` hanya memberi key tingkat atas). Akun `transaction`, terarsip, atau milik user lain → 400 `fields["items.<i>"]`, dan **tidak ada item lain yang tertulis**. (Diubah 2026-11-02.)
- [x] Saldo awal akun aset 10.000.000 diubah ke 11.000.000 hari ini (adjustment +1.000.000), lalu check-in bernilai 12.000.000 → revaluasi +1.000.000, saldo 12.000.000 (delta dari `balance` view; menggantikan kasus keputusan #7).
- [x] Revaluasi tidak muncul di `totals` `/api/transactions`, `dashboardSummary`, maupun `budgetUsage`. `PATCH /api/transactions/[id]` revaluasi → 409. `DELETE` → saldo kembali, `marketGain` turun. `POST /api/transactions { type: "revaluation" }` → 400.
- [x] `POST /api/net-worth` dengan akun yang sudah dipakai target aktif lain, akun kartu kredit, akun terarsip, akun user lain, atau `accountIds` duplikat → 400 `fields.accountIds`. Dua `POST` paralel (`Promise.all`) yang mengklaim akun sama → tepat satu 201.
- [x] Nama sama (beda huruf besar) dengan target aktif → 409 `NET_WORTH_NAME_TAKEN`. Arsip A, buat B dengan akun A, restore A → 409 `NET_WORTH_RESTORE_CONFLICT`. `DELETE` dua kali → 200, `archivedAt` tidak berubah.
- [x] `targetMonth` sebelum bulan berjalan saat `POST`/`PATCH` → 400. Target lama yang bulan targetnya sudah lewat → `overdue true`, `neededPerMonth = remaining`.
- [x] Akun target diarsipkan → tidak ikut `current`, `marketGain`, dan laju. `PATCH { name }` pada target itu → 200 (akun terarsip tetap). `PATCH { accountIds }` yang menambah akun terarsip lain → 400.
- [x] Target dengan akun dibuat bulan ini → `monthlyContribution null`, `etaMonth null`. Akun dibuat 2026-10-01 → pembagi 1 bulan (Okt).
- [x] `staleAccountIds` memuat akun aset tanpa revaluasi dan akun dengan revaluasi terakhir > 35 hari, tidak memuat akun `transaction`.
- [x] Invarian `current` terhadap `GET /api/accounts` dan `contributed + marketGain = balance` di `GET /api/valuations`.
- [x] **Isolasi:** user B mendapat 404 untuk `PATCH`/`DELETE`/`restore` target A, `GET` B tidak pernah memuat target, nilai, atau saldo A, dan B tidak bisa menautkan atau check-in akun A.
- [x] Tanpa session, semua route → 401 `UNAUTHORIZED`. Body dengan `userId` → 400.
- [x] Semua tes `tests/api/*.spec.ts` yang ada tetap hijau tanpa diubah.
- [x] Revisi 2026-11-02: hanya `tests/api/valuations.spec.ts` dan `tests/unit/valuation-schema.spec.ts` yang ditulis ulang (kontraknya berubah). Tes kasus yang tidak mungkin lagi (backdate, tanggal masa depan) diganti tes "body berisi `date` → 400", bukan dihapus diam-diam. Tes lain tetap hijau tanpa diubah. (Satu pengecualian: `valuation-format.spec.ts` mendapat tes "hari ini" dari T137, dan `cache-invalidation.spec.ts` kehilangan `date` di body mock `recordValuations` supaya lolos typecheck; assertion-nya tidak berubah.)

**UI (manual di 360 px dan 1024 px)**

- [ ] Buat target dari `/net-worth`, check-in dua akun lewat tombol Perbarui di setiap baris → kartu menampilkan progres, porsi disetor/pasar, dan proyeksi tanpa reload. Kartu Account Balance di dashboard ikut berubah. (tertunda: sesi tanpa browser)
- [ ] Revaluasi tampil "Revaluasi" di `/transactions`, bisa difilter, tidak bisa diedit, hapus + Urungkan memulihkannya. (tertunda: sesi tanpa browser)
- [ ] Sheet Perbarui nilai tanpa input tanggal, hint "Dicatat untuk hari ini, …". Deskripsi terisi + nilai sama → error di field deskripsi, tanpa request. Revaluasi berdeskripsi tampil "Revaluasi · {deskripsi}" di `/transactions` dan "Deskripsi" di detail. Sesudah simpan, baris aset tidak menampilkan tombol Perbarui dan berbunyi "diperbarui hari ini". (revisi 2026-11-02; tertunda: sesi tanpa browser)
- [ ] Akun yang dipakai target lain tampil nonaktif dengan teks di form target. (tertunda: sesi tanpa browser)
- [ ] Status basi, terlambat, dan pasar negatif terbaca tanpa warna. `hideAmounts` menyamarkan nominal. (tertunda: sesi tanpa browser)
- [ ] Mode pesawat: `/net-worth` tampil dari cache, aksi tulis nonaktif dengan teks "Butuh koneksi". (tertunda: sesi tanpa browser)
- [ ] "Net Worth" ada di sidebar (≥ lg) dan menu More (< lg). (tertunda: sesi tanpa browser; posisi di `sidebarItems`/`moreItems` dikunci `tests/unit/nav.spec.ts`)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Tes

- **Unit (`tests/unit/`):**
  - `net-worth-projection.spec.ts`: skenario dasar, `reached`, laju `null`/0/negatif, sisa ≤ laju (tercapai bulan ini), `overdue`, pergantian tahun, `countedMonths` 1 dan 2, pembulatan `ceil`.
  - `net-worth-schema.spec.ts`, `valuation-schema.spec.ts`: batas field, `strictObject`, duplikat `accountIds`/`items`, `targetMonth` lampau.
  - `cache-invalidation.spec.ts` (yang ada): edge `netWorths` dan `valuations`.
  - `transaction-format.spec.ts` (yang ada): label dan tanda `revaluation`.
- **API (`tests/api/`, Supabase sungguhan, user `test-<uuid>`):**
  - `valuations.spec.ts`: skenario dasar, idempoten (termasuk ulangan dengan `note`), sekali sehari, `date` di body ditolak, `note` tersimpan atau `null`, adjustment hari ini, atomik saat satu item invalid, isolasi, 401. Tanggal yang diharapkan = `todayInJakarta()` saat tes jalan (tanpa fake timer); transaksi pendukung bertanggal relatif dengan `addDays`.
  - `net-worth.spec.ts` (`POST`/`GET`) dan `net-worth-item.spec.ts` (`PATCH`/`DELETE`/`restore`): CRUD, arsip/restore, konflik nama/akun, klaim paralel, akun terarsip, isolasi, 401.
  - `net-worth-progress.spec.ts`: angka skenario dasar dengan `today` tetap, transfer internal, transfer antar target, jendela dan pembagi, basi, invarian.
  - `transactions-revaluation.spec.ts`: totals, edit ditolak, hapus/restore, create lewat API transaksi ditolak.
- **E2E:** tetap ditunda (SPEC.md Open question #2).
- Satu berkas: `pnpm vitest run tests/api/net-worth-progress.spec.ts`.

## Struktur file

```
app/api/net-worth/{route.ts, [id]/route.ts, [id]/restore/route.ts}
app/api/valuations/route.ts
app/(app)/net-worth/page.tsx
components/net-worth/                         # net-worth-view, net-worth-card, valuation-sheet
components/forms/net-worth-form.tsx
components/transactions/{type-styles.ts, filter-panel.tsx, transaction-editor.tsx}
components/layout/nav-items.ts
hooks/use-net-worth.ts, hooks/use-valuations.ts
lib/schemas/{net-worth.ts, valuation.ts, account.ts, transaction.ts}
lib/net-worth-projection.ts, lib/transaction-format.ts
lib/server/{net-worth.ts, valuations.ts, transactions.ts}
lib/server/queries/{net-worth-progress.ts, asset-valuations.ts}
lib/cache-invalidation.ts, lib/api/errors.ts
db/schema.ts, drizzle/<timestamp>_revaluation/, drizzle/<timestamp>_goals_table/, drizzle/20261105120858_rename_goals_to_net_worth/
tests/unit/*.spec.ts, tests/api/{net-worth,net-worth-item,valuations,net-worth-progress,transactions-revaluation}.spec.ts
```

Perintah, gaya kode, dan format error mengikuti [SPEC.md](SPEC.md).

## Boundaries (khusus modul ini)

- **Always:** hitung "hari ini" dengan `todayInJakarta()` dan bulan dari string, cek kepemilikan dan status akun di setiap tulisan, pegang advisory lock user untuk tulisan target dan lock baris akun untuk check-in, hitung delta revaluasi di server (client hanya mengirim nilai), panggil `invalidate` setelah setiap mutasi.
- **Ask first:** harga otomatis atau API eksternal apa pun, kolom kuantitas (gram/unit), tabel snapshot atau cron, kolom baru di `accounts`, satu akun di beberapa target, kartu target di dashboard, memasukkan revaluasi ke totals/dashboard/budget, mengubah kontrak `GET /api/accounts`.
- **Never:** menerima `amount` atau `date` revaluasi dari client, menulis revaluasi untuk akun `transaction`, menulis revaluasi bertanggal selain hari ini, menolak ulangan request (delta 0) karena `note`, hard delete target, menyalin target atau nilai ke Zustand, memakai server action.

## Risiko

- **Check-in tidak dilakukan:** nilai basi membuat persen dan perkiraan menyesatkan. Mitigasi: keputusan #16 dan perkiraan yang hanya memakai setoran (tidak bergantung pada nilai pasar). Ukur setelah dua bulan; jika check-in terlewat, pertimbangkan pengingat (Ask first).
- **Edit transaksi lama setelah check-in** (hapus revaluasi lama, ubah transfer September setelah check-in Oktober) menggeser saldo sekarang, jadi tidak lagi sama dengan nilai yang diketik. Diterima: check-in berikutnya memperbaikinya, dan setiap pergeseran tetap terlihat di daftar transaksi. Aturan urutan hanya dipasang di create revaluasi (keputusan #6).
- **Spread buyback emas:** check-in pertama di harga buyback langsung menampilkan pasar negatif 5–8%. Itu benar (nilai yang didapat jika dijual). Teks bantuan di sheet: "Pakai harga buyback hari ini".
- **Mengubah constraint `transactions`:** constraint lama di-drop dan dibuat ulang di migrasi. Mitigasi: tes semua tipe transaksi yang ada tetap hijau, dan migrasi dijalankan di Preview lebih dulu.
- **Query laju:** join ganda (`account_id` dan `to_account_id`) ke `unnest(account_ids)`. Data satu pemilik kecil, tetapi cek `EXPLAIN` di tes dengan beberapa ribu baris.
- **Bundle:** halaman baru, tidak menyentuh dashboard. Target first load `/net-worth` < 200 KB gzip.
- **`cacheComponents`:** `/net-worth` memakai session lewat hook client, jadi di dalam `<Suspense>` seperti halaman lain. Baca `node_modules/next/dist/docs/` sebelum menulis page.

## Open questions

1. ~~Satu akun, satu target (keputusan #10)~~ **Dijawab 2026-11-01: setuju.** Jika satu akun reksadana harus mendanai dua target, alternatifnya akun terpisah per target, bukan alokasi persen (Ask first).
2. ~~Laju dari 3 bulan penuh (keputusan #12)~~ **Dijawab 2026-11-01: setuju,** bulan berjalan tidak dihitung.
3. **Kartu Saving di dashboard** hanya menghitung tipe `saving`, padahal pemilik menabung lewat transfer (keputusan #3), jadi kartu itu mendekati 0. Ini keputusan modul `dashboard`, bukan modul ini. **Dijawab 2026-11-01: dibiarkan,** di luar cakupan modul ini. **Diubah 2026-11-08:** kartu Saving kini menghitung setoran (keputusan #9 SPEC.md).
4. ~~Ambang basi 35 hari (keputusan #16)~~ **Dijawab 2026-11-01: setuju.**
5. ~~Subtype `gold` (keputusan #19)~~ **Dijawab 2026-11-01: ditambahkan.**
