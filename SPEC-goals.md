# Spec module: `goals`

Status: diimplementasikan (T123–T134, 2026-11-02; cek UI manual tertunda) · @Yogi
Bergantung pada: `accounts-categories`, `transactions` · Dipakai oleh: — · Indeks: [SPEC.md](SPEC.md)
Asal: sesi idea-refine 2026-11-01 ("Net Worth Targets", referensi: fitur Net Worth Tracker Monsy).

## Objective

Pemilik tahu **seberapa dekat ia dengan setiap targetnya** (mis. "Dana Darurat 30 jt", "DP Rumah 150 jt"), dengan angka yang jujur memisahkan uang yang ia setor dari kenaikan/penurunan nilai pasar, dan tanpa upkeep selain satu check-in nilai per bulan.

Dua bagian yang saling bergantung:

1. **Revaluasi.** Tipe transaksi baru `revaluation`. Dari sheet "Perbarui nilai" sebuah akun aset, pemilik mengetik nilai terkininya (reksadana dari aplikasinya, emas fisik di harga buyback), dan server mencatat selisihnya sebagai satu baris bertanda. Perubahan nilai pasar menjadi kejadian bertanggal dengan label yang benar, bukan "Penyesuaian saldo awal".
2. **Target.** Satu target = nama, nominal, bulan target opsional, dan akun-akun yang dihitung. Kartu target menampilkan progres, porsi setoran vs pasar, perkiraan bulan tercapai dari laju setoran 3 bulan terakhir, dan setoran per bulan yang dibutuhkan jika ada bulan target.

Modul ini pemilik **kontrak** `/api/goals*` dan `/api/valuations`, query `goalProgress` dan `assetValuations`, fungsi murni `goalProjection`, hook SWR-nya, dan halaman `/goals`.

**Sukses berarti:** setelah dua check-in bulanan, pemilik bisa menjawab "kapan DP Rumah tercapai, dan berapa per bulan yang dibutuhkan supaya tepat waktu" dari satu layar, dan `current` setiap target sama persis dengan jumlah nilai yang ia ketik saat check-in ditambah transaksi sesudahnya.

Di luar cakupan: harga otomatis (saham, emas, kripto, NAB), saham, kuantitas (gram, unit), liabilitas, grafik net worth dari waktu ke waktu, tabel snapshot atau cron, transfer berulang ke target, satu akun dibagi ke beberapa target, target FI (25× pengeluaran tahunan), kartu target di dashboard, notifikasi atau pengingat check-in.

## Keputusan

Nomor 1–3 diputuskan Yogi pada 2026-11-01 (sesi idea-refine). Sisanya, perubahan skema, dan capability map disetujui Yogi pada 2026-11-01 (T123), termasuk menjalankan kedua migrasi di DB bersama setelah SQL `--explain` dibaca.

1. **Nilai diperbarui manual.** Fase ini fokus pada akun reksadana dan emas fisik. Saham dan harga otomatis menyusul di fase lain, jadi tidak ada dependency atau layanan eksternal baru.
2. **Pertanyaan utama = progres ke target,** bukan grafik net worth. Total net worth saat ini sudah ada di kartu Account Balance dashboard dan tidak berubah.
3. **Setoran tercatat sebagai transfer** dari akun transaksi ke akun aset (cara pemilik menabung saat ini). Tipe `saving` tidak dipakai modul ini.
4. **Revaluasi = tipe transaksi, bukan tabel nilai.** Paling banyak satu baris `revaluation` hidup per akun per tanggal (keputusan #6), `amount = nilai baru − saldo per tanggal itu`. Karena semua perubahan saldo tetap berupa transaksi bertanggal, view `account_balances` cukup ditambah satu baris dan riwayat nilai bisa diturunkan nanti tanpa snapshot. Selisih 0 tidak membuat baris (sama dengan adjustment).
5. **Revaluasi hanya untuk akun aktif dengan `type = "asset"`.** Akun transaksi berubah lewat transaksi biasa.
6. **Check-in boleh mundur tanggal, tapi sekali sehari dan tidak mendahului revaluasi terakhir.** `date` mengikuti aturan transaksi (`2000-01-01 ≤ date ≤ hari ini`). Item yang nilainya berubah (delta ≠ 0) harus bertanggal **sesudah** revaluasi hidup terakhir akun itu. Check-in tanggal 2 untuk nilai akhir bulan lalu tetap bisa. Menyisipkan nilai lama di antara nilai yang lebih baru akan menggeser nilai terbaru diam-diam, dan nilai kedua di tanggal yang sama membuat dua baris untuk satu hari, jadi keduanya ditolak. Item dengan delta 0 tidak menulis apa pun, jadi tidak dicek (ulangan request tetap `recorded: 0`). Menghapus revaluasi hari itu membuka tanggalnya lagi. (Diubah 2026-11-02 dari "≥ revaluasi terakhir", hasil uji manual.)
7. **Saldo per tanggal D** = `initial_balance` + **semua** adjustment hidup (tanpa melihat tanggalnya, karena adjustment adalah koreksi saldo awal) + transaksi hidup lain bertanggal ≤ D. Dipakai untuk menghitung selisih revaluasi.
8. **Revaluasi tidak bisa diedit, boleh dihapus** (soft delete + Urungkan, sama dengan adjustment). Menghapusnya menggeser saldo kembali. Tidak ada aturan urutan untuk hapus (lihat [Risiko](#risiko)).
9. **Setoran vs pasar adalah identitas, bukan tebakan.** Per akun: `marketGain` = jumlah revaluasi hidup, `contributed = balance − marketGain`. Saldo awal dan adjustment termasuk `contributed` (anggap saldo awal sebagai modal; isi saldo awal emas dengan harga beli supaya angka pasarnya bermakna).
10. **Satu akun di paling banyak satu target aktif.** Dicek server di dalam transaksi DB yang memegang `pg_advisory_xact_lock(hashtext(user_id))`, sama dengan budget keputusan #4. Akun yang terhubung boleh tipe apa pun kecuali `subtype = "credit_card"` (dana darurat bisa di rekening debit).
11. **Laju setoran = arus bersih bulanan ke akun-akun target,** tidak termasuk `adjustment` dan `revaluation`. Income ke akun target menambah, expense/saving dari akun target mengurangi, transfer masuk menambah, transfer keluar mengurangi. Transfer antar dua akun di target yang sama otomatis bernilai 0. Transfer antar target memindahkan progres.
12. **Jendela laju = 3 bulan kalender penuh sebelum bulan berjalan** (Asia/Jakarta). Bulan sebelum bulan `created_at` akun target tertua tidak dihitung di pembagi. Belum ada bulan penuh → laju `null`. Laju ≤ 0 → tanpa perkiraan.
13. **Perkiraan konservatif:** hanya dari setoran, kenaikan pasar tidak diproyeksikan. `etaMonth` = bulan berjalan + `ceil(remaining / laju) − 1` (sisa ≤ laju bulanan → tercapai bulan ini).
14. **Bulan target, bukan tanggal.** `targetMonth: "YYYY-MM" | null`, ≥ bulan berjalan saat dibuat atau diubah. `monthsLeft` = jumlah bulan dari bulan berjalan sampai bulan target, inklusif. `neededPerMonth = ceil(remaining / monthsLeft)`. Bulan target sudah lewat → `overdue`, `neededPerMonth = remaining`.
15. **Akun terarsip tidak dihitung** di `current`, `marketGain`, maupun laju (sama dengan dashboard keputusan #6), tetapi tetap tersimpan di target dan tampil "(arsip)". `PATCH` boleh membiarkannya, tapi tidak bisa menambahkan akun terarsip.
16. **Basi = akun aset di target yang belum pernah direvaluasi atau revaluasi terakhirnya > 35 hari.** Kartu target dan sheet menampilkan "diperbarui 47 hari lalu" sebagai teks, supaya angka yang sudah tidak terawat terlihat.
17. **Nama target unik tanpa beda huruf besar** di antara target aktif → 409 `GOAL_NAME_TAKEN`. Nama target terarsip boleh dipakai lagi.
18. **Hapus = arsip** dengan Urungkan dan restore. Restore mengecek ulang nama dan akun → 409 `GOAL_RESTORE_CONFLICT` jika bentrok.
19. **Subtype `gold` ("Emas")** ditambahkan ke `ACCOUNT_SUBTYPES`. Hanya perubahan Zod dan label, karena kolom `subtype` tidak punya check constraint di DB. Mengubah keputusan #4 accounts-categories.
20. **Halaman `/goals`** (label nav "Goals") di sidebar dan menu More bottom nav, sama dengan `/recurring`. Dashboard tidak berubah di fase ini.
21. **Online saja.** Simpan target, check-in, arsip, dan restore dinonaktifkan saat offline ("Butuh koneksi"). `GET` tetap tampil dari cache service worker lewat aturan `GET /api/*` yang sudah ada.
22. **Label UI** mengikuti keputusan #10 accounts-categories: nav bahasa Inggris, tombol/form/pesan bahasa Indonesia. `revaluation` berlabel "Revaluasi".

## Perubahan skema

Tabel ke-7, ditambah perubahan constraint `transactions` dan view. Mengubah keputusan terkunci #8 di [SPEC.md](SPEC.md) dan butuh persetujuan (Ask first: skema di luar spec, migrasi yang mengubah constraint). Dua migrasi baru: `drizzle/<timestamp>_revaluation/` (constraint, view, index) dan `drizzle/<timestamp>_goals_table/` (tabel `goals`, RLS), supaya revaluasi bisa tayang sebelum target. Tidak ada kolom yang diubah atau dihapus.

```ts
// db/schema.ts
// account_ids has no FK, same as budgets.category_ids: ownership and the one-goal rule are checked on write.
export const goals = pgTable.withRLS(
  "goals",
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
    check("goals_amount_check", sql`${t.targetAmount} between 1 and 1000000000000`),
    check(
      "goals_target_check",
      sql`(${t.targetYear} is null) = (${t.targetMonth} is null) and (${t.targetMonth} is null or ${t.targetMonth} between 1 and 12)`,
    ),
    check("goals_account_ids_check", sql`cardinality(${t.accountIds}) between 1 and 20`),
    index("goals_user_idx").on(t.userId),
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
| RLS `goals`                            | —                                                           | aktif, tanpa policy (deny-all)                                                   |

Nama kolom dan bentuk builder mengikuti `db/schema.ts` (Drizzle 1.0 RC, cek `.d.ts` terpasang). Index baru boleh dihapus dari migrasi jika `EXPLAIN` menunjukkan `transactions_user_account_idx` sudah cukup.

## Kontrak API

Semua route memakai `withAuth`, memfilter `user_id` dari session, dan format error dari `lib/api/errors.ts`. Id target di path yang bukan UUID, tidak ada, atau milik user lain → **404 `GOAL_NOT_FOUND`**. `PATCH` pada target terarsip juga 404.

### Tipe

```ts
// lib/schemas/goal.ts (dipakai client & server)
type Goal = {
  id: string;
  name: string;
  targetAmount: number; // integer rupiah, 1..1e12
  targetMonth: string | null; // YYYY-MM
  accountIds: string[]; // urutan dari client dipertahankan
  archivedAt: string | null;
  createdAt: string;
};

type GoalProjection = {
  remaining: number; // max(targetAmount − current, 0)
  reached: boolean; // remaining = 0
  monthlyContribution: number | null; // keputusan #12, dibulatkan ke bawah
  etaMonth: string | null; // YYYY-MM, null jika reached, laju null, atau laju ≤ 0
  monthsLeft: number | null; // null tanpa targetMonth
  neededPerMonth: number | null; // null tanpa targetMonth atau jika reached
  overdue: boolean; // targetMonth < bulan berjalan dan belum reached
  onTrack: boolean | null; // etaMonth ≤ targetMonth; null tanpa targetMonth atau etaMonth
};

type GoalProgress = Goal & {
  current: number; // jumlah balance akun aktif di target
  marketGain: number; // jumlah revaluasi hidup akun aktif di target
  contributed: number; // current − marketGain
  staleAccountIds: string[]; // keputusan #16
  projection: GoalProjection;
};

// lib/schemas/valuation.ts
type AssetValuation = {
  accountId: string;
  balance: number;
  marketGain: number;
  contributed: number;
  lastValuedAt: string | null; // YYYY-MM-DD revaluasi hidup terakhir
  goalId: string | null; // target aktif yang memakai akun ini
};
```

### Route

| Method & path                    | Body / query                                                  | Sukses                                            | Error                              |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------- |
| `GET /api/goals`                 | `?includeArchived=true` (opsional)                            | 200 `GoalProgress[]`, urut `created_at`           | —                                  |
| `POST /api/goals`                | `{ name, targetAmount, targetMonth?, accountIds }`            | 201 `GoalProgress`                                | 400, 409 `GOAL_NAME_TAKEN`         |
| `PATCH /api/goals/[id]`          | subset field create (min 1)                                   | 200 `GoalProgress`                                | 400, 404, 409 `GOAL_NAME_TAKEN`    |
| `DELETE /api/goals/[id]`         | —                                                             | 200 `GoalProgress` (`archivedAt` terisi). Idempoten | 404                              |
| `POST /api/goals/[id]/restore`   | —                                                             | 200 `GoalProgress` (aktif). Idempoten             | 404, 409 `GOAL_RESTORE_CONFLICT`   |
| `GET /api/valuations`            | —                                                             | 200 `AssetValuation[]`, akun aset aktif, urutan sama dengan `GET /api/accounts` | — |
| `POST /api/valuations`           | `{ date, items: [{ accountId, value }] }`                     | 200 `{ recorded: number; assets: AssetValuation[] }` | 400                             |

Target terarsip ikut `GET` dengan `includeArchived`, dihitung dengan aturan yang sama. Nama akun di-resolve di client dari `useAccounts({ includeArchived: true })` (keputusan #8 transactions).

### Validasi (Zod)

- Body memakai `z.strictObject`. Field tak dikenal (termasuk `userId`) → 400.
- `name`: trim, 1..60. `targetAmount`: `z.int()`, 1..1e12. `targetMonth`: `YYYY-MM` valid (`isPeriod` mode bulan), ≥ bulan berjalan, atau `null`.
- `accountIds`: `z.uuid()`, 1..20, tanpa duplikat. Setiap id milik user, aktif (kecuali yang sudah ada di target saat `PATCH`), bukan `credit_card`, dan tidak dipakai target aktif lain → 400 `fields.accountIds` dengan pesan yang menyebut akun pertama yang bermasalah. Id asing dan id tidak ada memakai pesan yang sama.
- `date`: aturan tanggal transaksi. `items`: 1..50, `accountId` unik. `value`: `z.int()`, 0..1e12.
- Setiap `items[i].accountId` milik user, aktif, dan `type = "asset"` → selain itu 400 dengan `fields["items.<i>"]`.
- Keputusan #6, dicek per item yang delta-nya ≠ 0 → 400 `fields.date`: `date` sebelum revaluasi terakhir → "Sudah ada nilai tanggal 31 Okt. Pilih tanggal sesudahnya."; `date` sama → "Nilai sudah diperbarui tanggal 31 Okt. Revaluasi hanya sekali sehari."

### Aturan tulis

- **Target** (`POST`, `PATCH`, `restore`): satu transaksi DB dengan `pg_advisory_xact_lock(hashtext(user_id))`, lalu cek nama unik dan akun (keputusan #10, #17), lalu tulis. `PATCH` yang tidak mengubah `accountIds` tidak mengecek ulang akun. `DELETE` mengisi `archived_at` dengan `coalesce` (sama dengan arsip akun).
- **Check-in** (`POST /api/valuations`), dalam **satu transaksi DB**:
  1. `select … from accounts where user_id and id in (…) order by id for update` (urutan tetap mencegah deadlock antar check-in paralel).
  2. Per item, query terpisah sesudah lock (snapshot baru di READ COMMITTED, sama dengan `updateAccount`): tanggal revaluasi terakhir per akun dan saldo per `date` (keputusan #7).
  3. `delta = value − saldoPerTanggal`. `delta ≠ 0` dan `date` tidak sesudah revaluasi terakhir akun itu → 400 tanpa baris (keputusan #6). Selain itu `delta ≠ 0` → insert `{ type: "revaluation", amount: delta, date, accountId, description: "Pembaruan nilai" }`. `recorded` = jumlah baris yang ditulis.
  - Ulangi request yang sama setelah respons hilang → semua delta 0, `recorded: 0`. Idempoten tanpa id dari client.
- **`revaluation` di API transaksi:** tidak masuk `TRANSACTION_TYPES`, jadi tidak bisa dibuat lewat `POST /api/transactions`. `PATCH` → 409 `TRANSACTION_NOT_EDITABLE` (jalur adjustment yang sudah ada). `DELETE` dan `restore` seperti adjustment.

### Query

- `lib/server/queries/goal-progress.ts`: `goalProgress(userId, { today, includeArchived })`. Tiga agregasi di SQL, dibatasi target milik user:
  - per target: `sum(balance)` dan `sum(revaluasi)` akun aktif (`unnest(account_ids)` join `accounts` + `account_balances`), serta `max(date)` revaluasi per akun aset untuk keputusan #16;
  - arus bersih per target per bulan di jendela keputusan #12: join transaksi ke `unnest(account_ids)` dari sisi `account_id` **dan** `to_account_id`, efek per sisi sama dengan view, tipe `adjustment`/`revaluation` dikecualikan, `group by goal, date_trunc('month', date)`, bulan kosong = 0;
  - `min(created_at)` akun target untuk pembagi.
  Hasilnya puluhan baris, lalu `goalProjection` di TS. Menerima `today` supaya tes memakai tanggal tetap, sama dengan `dashboardSummary`.
- `lib/server/queries/asset-valuations.ts`: per akun aset aktif, `balance`, `sum` revaluasi hidup, `max(date)` revaluasi hidup, dan `goalId` dari target aktif.
- **Invarian:** `current` target = jumlah `balance` dari `GET /api/accounts` untuk akun aktifnya. `contributed + marketGain = balance` per akun di `GET /api/valuations`. Dites.

### Fungsi murni

`lib/goal-projection.ts`: `goalProjection({ targetAmount, targetMonth, current, monthlyFlows, countedMonths, today })` → `GoalProjection`. `monthlyFlows` = arus per bulan di jendela, `countedMonths` = 0..3 (keputusan #12). Aritmetika bulan memakai `lib/period.ts` (`periodToYearMonth`, `yearMonthToPeriod`), tanpa `Date` lokal.

### Kontrak untuk modul lain

- **`transactions`** (perubahan di modul itu, perlu revisi [SPEC-transactions.md](SPEC-transactions.md)): `LIST_TRANSACTION_TYPES` mendapat `"revaluation"`. Daftar menampilkan "Revaluasi" + nama akun, nominal bertanda seperti adjustment. Filter tipe mendapat "Revaluasi". Detail memakai kartu hanya-baca adjustment dengan label sendiri. `transactionTotals`, `dashboardSummary`, dan `budgetUsage` tidak berubah karena hanya menghitung income/expense/saving. Ekspor CSV menulis nominal bertanda.
- **`accounts-categories`** (perlu revisi [SPEC-accounts-categories.md](SPEC-accounts-categories.md)): subtype `gold` (keputusan #19), tabel constraint di § Transaksi penyesuaian mendapat baris `revaluation`. Kontrak `GET /api/accounts` tidak berubah.
- **Revalidasi (`lib/cache-invalidation.ts`):** `Resource` mendapat `"goals"` (`/api/goals`) dan `"valuations"` (`/api/valuations`). `AFFECTS.transactions` dan `AFFECTS.accounts` mendapat keduanya (saldo dan arsip akun mengubah progres). `AFFECTS.goals = ["valuations"]`, karena `GET /api/valuations` memuat `goalId` (diubah saat implementasi T132). Check-in menulis transaksi, jadi mutasinya memanggil `invalidate("transactions")`, yang menjangkau saldo, dashboard, recurring, goals, dan valuations. `AFFECTS.valuations = []`.
- **`dashboard`, `budgets`, `recurring`:** tidak berubah. Kartu Account Balance otomatis ikut nilai baru karena membaca `balance`.
- **`pwa-offline`:** tidak berubah. Outbox tetap hanya untuk create transaksi.

## Deliverables

### 1. Server

- `db/schema.ts` (tabel `goals`, constraint, view) + migrasi `drizzle/<timestamp>_revaluation/` dan `drizzle/<timestamp>_goals_table/` (`pnpm db:generate`, lalu SQL view dan RLS).
- `lib/schemas/goal.ts`, `lib/schemas/valuation.ts`: tipe, `goalCreateSchema`, `goalUpdateSchema`, `valuationSchema`. `lib/schemas/account.ts`: subtype `gold`.
- `lib/goal-projection.ts` (murni).
- `lib/server/goals.ts`: `createGoal`, `updateGoal`, `archiveGoal`, `restoreGoal`. `lib/server/valuations.ts`: `recordValuations`.
- `lib/server/queries/goal-progress.ts`, `lib/server/queries/asset-valuations.ts`.
- `lib/server/transactions.ts`: `revaluation` diperlakukan seperti `adjustment` di jalur edit/hapus.
- `lib/api/errors.ts`: `goalNotFound()`, `goalNameTaken()`, `goalRestoreConflict()`.
- Route: `app/api/goals/route.ts`, `[id]/route.ts`, `[id]/restore/route.ts`, `app/api/valuations/route.ts`.

### 2. Client

- `hooks/use-goals.ts`: `useGoals({ includeArchived? })`, mutasi `createGoal`, `updateGoal`, `archiveGoal`, `restoreGoal`. `hooks/use-valuations.ts`: `useValuations()`, `recordValuations`. Mutasi melempar `ApiError` dan memanggil `invalidate`. Tanpa optimistic update, kecuali arsip dengan "Urungkan".
- `lib/cache-invalidation.ts`: resource dan edge di atas.
- `components/layout/nav-items.ts`: `goalsItem` (`/goals`, "Goals", ikon `TargetIcon`) di `sidebarItems` dan `moreItems`.
- `lib/transaction-format.ts`, `components/transactions/type-styles.ts`, `filter-panel.tsx`, `transaction-editor.tsx`: tipe `revaluation`.
- Tidak ada data target atau nilai di Zustand.

### 3. UI

- **`app/(app)/goals/page.tsx`**, isi di `components/goals/goals-view.tsx`.
  - Header: judul + tombol "Tambah target".
  - Daftar "Nilai aset": setiap baris akun punya tombol **Perbarui** (≥ 44 px) yang membuka sheet untuk akun itu saja. (Diubah 2026-11-02: sebelumnya satu tombol Perbarui nilai di header membuka semua akun aset.)
  - **`goal-card.tsx`** per target aktif: nama, `current` dari `targetAmount` dengan progress bar dan persen sebagai teks, baris "Disetor Rp… · Pasar +Rp…" (pasar negatif ditulis "−Rp…", bukan hanya warna), lalu satu kalimat proyeksi:
    - `reached` → "Tercapai".
    - dengan `targetMonth`: "Butuh Rp4,1 jt/bulan sampai Des 2028", ditambah "Dengan laju sekarang: Jan 2029 (terlambat 1 bulan)" atau "…: tepat waktu". `overdue` → "Bulan target sudah lewat · kurang Rp…".
    - tanpa `targetMonth`: "Dengan laju Rp4 jt/bulan, tercapai sekitar Jan 2029".
    - laju `null` → "Perkiraan muncul setelah satu bulan penuh". Laju ≤ 0 → "Belum ada setoran 3 bulan terakhir".
  - `staleAccountIds` tidak kosong → baris "Nilai Emas belum diperbarui 47 hari" dengan tombol "Perbarui" yang membuka sheet akun itu.
  - Tombol ikon "Ubah" di kartu (bukan tap seluruh kartu, karena kartu memuat tombol "Perbarui" untuk nilai basi; diubah saat T133) → `components/forms/goal-form.tsx` di `ResponsiveModal`: nama, `MoneyInput` nominal, bulan target opsional (`<input type="month">`, font 16 px, dengan tombol hapus), daftar centang akun (akun aktif bukan kartu kredit; akun milik target lain tampil nonaktif dengan teks "Dipakai {target}"), saldo setiap akun di sebelah namanya.
  - Arsip dari menu kartu → toast "Target diarsipkan · Urungkan" (6 detik). "Lihat arsip" menampilkan target terarsip dengan tombol Pulihkan.
  - Empty state: satu kalimat + "Tambah target". Tanpa akun aset → teks yang mengajak membuat akun aset di Settings.
- **`components/goals/valuation-sheet.tsx`** di `ResponsiveModal`, untuk **satu** akun aset: input tanggal (default hari ini), lalu satu field berlabel nama akun dengan subtype, "diperbarui 12 Okt" / "belum pernah", dan `MoneyInput` berisi `balance` sekarang. Nilai yang tidak diubah tidak dikirim. Simpan → toast "Nilai Emas diperbarui" (atau "Nilai sama, tidak ada yang dicatat"). `fields.date` dipasang di bawah tanggal, `fields["items.0"]` di bawah field nilai. API tetap menerima banyak item.
- `hideAmounts` menyamarkan semua nominal di kartu dan sheet.
- Offline (`useOnlineStatus`): tombol simpan, Perbarui nilai, arsip, dan pulihkan dinonaktifkan dengan teks "Butuh koneksi".
- Mobile: layout benar di 360 px, target sentuh ≥ 44×44 px, input 16 px, kontras ≥ 4.5:1. Ikuti [DESIGN.md](DESIGN.md).

## Acceptance criteria

Skenario dasar (hari ini 2026-11-15): akun BCA (`transaction`, debit), Emas (`asset`, gold, saldo awal 30.000.000), RD Saham (`asset`, investment, saldo awal 0), keduanya dibuat 2026-07-01. Transfer BCA → RD Saham 3.000.000 (Agt) dan 4.000.000 (Sep), BCA → Emas 5.000.000 (Okt), RD Saham → Emas 1.000.000 (Okt). Target "DP Rumah" 150.000.000, `targetMonth "2028-12"`, akun Emas + RD Saham.

**API**

- [x] `POST /api/valuations { date: "2026-10-31", items: [{ Emas, 36500000 }, { RD Saham, 6200000 }] }` → `recorded: 2`, revaluasi +500.000 (Emas) dan +200.000 (RD Saham) bertanggal 2026-10-31. `GET /api/accounts` → Emas 36.500.000, RD Saham 6.200.000. Request yang sama diulang → `recorded: 0`, tanpa baris baru.
- [x] `GET /api/goals` → DP Rumah `current 42700000`, `marketGain 700000`, `contributed 42000000`, `monthlyContribution 4000000` (Agt 3 jt, Sep 4 jt, Okt 5 jt; transfer RD Saham → Emas bernilai 0), `remaining 107300000`, `etaMonth "2029-01"`, `monthsLeft 26`, `neededPerMonth 4126924`, `onTrack false`, `overdue false`.
- [x] Check-in Emas `date "2026-10-15"` setelah revaluasi 2026-10-31 → 400 `fields.date`, tanpa baris. Nilai baru di `date "2026-10-31"` lagi → 400 `fields.date` "…sekali sehari", tanpa baris. Nilai sama di tanggal itu → `recorded: 0`. `date` masa depan → 400. Akun `transaction`, terarsip, atau milik user lain → 400 `fields["items.<i>"]`, dan **tidak ada item lain yang tertulis**.
- [x] Saldo awal akun aset 10.000.000 diubah ke 11.000.000 hari ini (adjustment +1.000.000), lalu check-in kemarin bernilai 12.000.000 → revaluasi +1.000.000, saldo 12.000.000 (keputusan #7).
- [x] Revaluasi tidak muncul di `totals` `/api/transactions`, `dashboardSummary`, maupun `budgetUsage`. `PATCH /api/transactions/[id]` revaluasi → 409. `DELETE` → saldo kembali, `marketGain` turun. `POST /api/transactions { type: "revaluation" }` → 400.
- [x] `POST /api/goals` dengan akun yang sudah dipakai target aktif lain, akun kartu kredit, akun terarsip, akun user lain, atau `accountIds` duplikat → 400 `fields.accountIds`. Dua `POST` paralel (`Promise.all`) yang mengklaim akun sama → tepat satu 201.
- [x] Nama sama (beda huruf besar) dengan target aktif → 409 `GOAL_NAME_TAKEN`. Arsip A, buat B dengan akun A, restore A → 409 `GOAL_RESTORE_CONFLICT`. `DELETE` dua kali → 200, `archivedAt` tidak berubah.
- [x] `targetMonth` sebelum bulan berjalan saat `POST`/`PATCH` → 400. Target lama yang bulan targetnya sudah lewat → `overdue true`, `neededPerMonth = remaining`.
- [x] Akun target diarsipkan → tidak ikut `current`, `marketGain`, dan laju. `PATCH { name }` pada target itu → 200 (akun terarsip tetap). `PATCH { accountIds }` yang menambah akun terarsip lain → 400.
- [x] Target dengan akun dibuat bulan ini → `monthlyContribution null`, `etaMonth null`. Akun dibuat 2026-10-01 → pembagi 1 bulan (Okt).
- [x] `staleAccountIds` memuat akun aset tanpa revaluasi dan akun dengan revaluasi terakhir > 35 hari, tidak memuat akun `transaction`.
- [x] Invarian `current` terhadap `GET /api/accounts` dan `contributed + marketGain = balance` di `GET /api/valuations`.
- [x] **Isolasi:** user B mendapat 404 untuk `PATCH`/`DELETE`/`restore` target A, `GET` B tidak pernah memuat target, nilai, atau saldo A, dan B tidak bisa menautkan atau check-in akun A.
- [x] Tanpa session, semua route → 401 `UNAUTHORIZED`. Body dengan `userId` → 400.
- [x] Semua tes `tests/api/*.spec.ts` yang ada tetap hijau tanpa diubah.

**UI (manual di 360 px dan 1024 px)**

- [ ] Buat target dari `/goals`, check-in dua akun lewat tombol Perbarui di setiap baris → kartu menampilkan progres, porsi disetor/pasar, dan proyeksi tanpa reload. Kartu Account Balance di dashboard ikut berubah. (tertunda: sesi tanpa browser)
- [ ] Revaluasi tampil "Revaluasi" di `/transactions`, bisa difilter, tidak bisa diedit, hapus + Urungkan memulihkannya. (tertunda: sesi tanpa browser)
- [ ] Akun yang dipakai target lain tampil nonaktif dengan teks di form target. (tertunda: sesi tanpa browser)
- [ ] Status basi, terlambat, dan pasar negatif terbaca tanpa warna. `hideAmounts` menyamarkan nominal. (tertunda: sesi tanpa browser)
- [ ] Mode pesawat: `/goals` tampil dari cache, aksi tulis nonaktif dengan teks "Butuh koneksi". (tertunda: sesi tanpa browser)
- [ ] "Goals" ada di sidebar (≥ lg) dan menu More (< lg). (tertunda: sesi tanpa browser; posisi di `sidebarItems`/`moreItems` dikunci `tests/unit/nav.spec.ts`)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Tes

- **Unit (`tests/unit/`):**
  - `goal-projection.spec.ts`: skenario dasar, `reached`, laju `null`/0/negatif, sisa ≤ laju (tercapai bulan ini), `overdue`, pergantian tahun, `countedMonths` 1 dan 2, pembulatan `ceil`.
  - `goal-schema.spec.ts`, `valuation-schema.spec.ts`: batas field, `strictObject`, duplikat `accountIds`/`items`, `targetMonth` lampau.
  - `cache-invalidation.spec.ts` (yang ada): edge `goals` dan `valuations`.
  - `transaction-format.spec.ts` (yang ada): label dan tanda `revaluation`.
- **API (`tests/api/`, Supabase sungguhan, user `test-<uuid>`):**
  - `valuations.spec.ts`: skenario dasar, idempoten, urutan tanggal, adjustment (keputusan #7), atomik saat satu item invalid, isolasi, 401.
  - `goals.spec.ts` (`POST`/`GET`) dan `goals-item.spec.ts` (`PATCH`/`DELETE`/`restore`): CRUD, arsip/restore, konflik nama/akun, klaim paralel, akun terarsip, isolasi, 401.
  - `goal-progress.spec.ts`: angka skenario dasar dengan `today` tetap, transfer internal, transfer antar target, jendela dan pembagi, basi, invarian.
  - `transactions-revaluation.spec.ts`: totals, edit ditolak, hapus/restore, create lewat API transaksi ditolak.
- **E2E:** tetap ditunda (SPEC.md Open question #2).
- Satu berkas: `pnpm vitest run tests/api/goal-progress.spec.ts`.

## Struktur file

```
app/api/goals/{route.ts, [id]/route.ts, [id]/restore/route.ts}
app/api/valuations/route.ts
app/(app)/goals/page.tsx
components/goals/                         # goals-view, goal-card, valuation-sheet
components/forms/goal-form.tsx
components/transactions/{type-styles.ts, filter-panel.tsx, transaction-editor.tsx}
components/layout/nav-items.ts
hooks/use-goals.ts, hooks/use-valuations.ts
lib/schemas/{goal.ts, valuation.ts, account.ts, transaction.ts}
lib/goal-projection.ts, lib/transaction-format.ts
lib/server/{goals.ts, valuations.ts, transactions.ts}
lib/server/queries/{goal-progress.ts, asset-valuations.ts}
lib/cache-invalidation.ts, lib/api/errors.ts
db/schema.ts, drizzle/<timestamp>_revaluation/, drizzle/<timestamp>_goals_table/
tests/unit/*.spec.ts, tests/api/{goals,goals-item,valuations,goal-progress,transactions-revaluation}.spec.ts
```

Perintah, gaya kode, dan format error mengikuti [SPEC.md](SPEC.md).

## Boundaries (khusus modul ini)

- **Always:** hitung "hari ini" dengan `todayInJakarta()` dan bulan dari string, cek kepemilikan dan status akun di setiap tulisan, pegang advisory lock user untuk tulisan target dan lock baris akun untuk check-in, hitung delta revaluasi di server (client hanya mengirim nilai), panggil `invalidate` setelah setiap mutasi.
- **Ask first:** harga otomatis atau API eksternal apa pun, kolom kuantitas (gram/unit), tabel snapshot atau cron, kolom baru di `accounts`, satu akun di beberapa target, kartu target di dashboard, memasukkan revaluasi ke totals/dashboard/budget, mengubah kontrak `GET /api/accounts`.
- **Never:** menerima `amount` revaluasi dari client, menulis revaluasi untuk akun `transaction`, menulis revaluasi bertanggal masa depan atau sebelum revaluasi terakhir, hard delete target, menyalin target atau nilai ke Zustand, memakai server action.

## Risiko

- **Check-in tidak dilakukan:** nilai basi membuat persen dan perkiraan menyesatkan. Mitigasi: keputusan #16 dan perkiraan yang hanya memakai setoran (tidak bergantung pada nilai pasar). Ukur setelah dua bulan; jika check-in terlewat, pertimbangkan pengingat (Ask first).
- **Edit transaksi lama setelah check-in** (hapus revaluasi lama, ubah transfer September setelah check-in Oktober) menggeser saldo sekarang, jadi tidak lagi sama dengan nilai yang diketik. Diterima: check-in berikutnya memperbaikinya, dan setiap pergeseran tetap terlihat di daftar transaksi. Aturan urutan hanya dipasang di create revaluasi (keputusan #6).
- **Spread buyback emas:** check-in pertama di harga buyback langsung menampilkan pasar negatif 5–8%. Itu benar (nilai yang didapat jika dijual). Teks bantuan di sheet: "Pakai harga buyback hari ini".
- **Mengubah constraint `transactions`:** constraint lama di-drop dan dibuat ulang di migrasi. Mitigasi: tes semua tipe transaksi yang ada tetap hijau, dan migrasi dijalankan di Preview lebih dulu.
- **Query laju:** join ganda (`account_id` dan `to_account_id`) ke `unnest(account_ids)`. Data satu pemilik kecil, tetapi cek `EXPLAIN` di tes dengan beberapa ribu baris.
- **Bundle:** halaman baru, tidak menyentuh dashboard. Target first load `/goals` < 200 KB gzip.
- **`cacheComponents`:** `/goals` memakai session lewat hook client, jadi di dalam `<Suspense>` seperti halaman lain. Baca `node_modules/next/dist/docs/` sebelum menulis page.

## Open questions

1. ~~Satu akun, satu target (keputusan #10)~~ **Dijawab 2026-11-01: setuju.** Jika satu akun reksadana harus mendanai dua target, alternatifnya akun terpisah per target, bukan alokasi persen (Ask first).
2. ~~Laju dari 3 bulan penuh (keputusan #12)~~ **Dijawab 2026-11-01: setuju,** bulan berjalan tidak dihitung.
3. **Kartu Saving di dashboard** hanya menghitung tipe `saving`, padahal pemilik menabung lewat transfer (keputusan #3), jadi kartu itu mendekati 0. Ini keputusan modul `dashboard`, bukan modul ini. **Dijawab 2026-11-01: dibiarkan,** di luar cakupan modul ini.
4. ~~Ambang basi 35 hari (keputusan #16)~~ **Dijawab 2026-11-01: setuju.**
5. ~~Subtype `gold` (keputusan #19)~~ **Dijawab 2026-11-01: ditambahkan.**
