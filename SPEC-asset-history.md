# Spec module: `asset-history`

Status: draft · 2026-11-03 · @Yogi
Bergantung pada: `goals`, `transactions`, `accounts-categories` · Dipakai oleh: — · Indeks: [SPEC.md](SPEC.md)
Asal: sesi idea-refine 2026-11-03 ("histori perubahan aset, tabel standar dan chart yang mudah dipahami").

## Objective

Pemilik bisa menjawab **"aset saya naik atau turun, dan karena apa?"** dalam satu detik dari halaman `/net-worth`: satu kalimat ringkasan, grafik dua garis (Nilai vs Disetor), dan tabel per bulan. Bisa untuk gabungan semua aset atau satu akun aset.

Garis nilai saja menyesatkan: transfer 5 jt dari BCA ke Emas membuat garis naik 5 jt padahal kekayaan tidak bertambah. Karena itu setiap bulan dipecah menjadi **setoran** dan **pasar** dengan identitas yang sudah dipakai modul `goals` (keputusan #9 SPEC-goals: `contributed = balance − marketGain`, `marketGain` = jumlah revaluasi hidup).

**Sukses berarti:** setelah dua check-in bulanan, pemilik bisa membaca dari section "Histori nilai" berapa nilai asetnya naik atau turun sejak bulan tertentu, berapa dari setoran dan berapa dari pasar, dan angka bulan berjalan sama persis dengan jumlah di daftar "Nilai aset".

Di luar cakupan: net worth gabungan dengan akun transaksi (bank, e-wallet), persen return (TWR/IRR), proyeksi di grafik, satu garis per akun dalam satu grafik, ekspor CSV histori, kartu histori di dashboard, tabel snapshot atau cron, menyimpan pilihan rentang/akun di URL atau storage.

## Keputusan

Diputuskan Yogi pada 2026-11-03 (sesi idea-refine dan `/spec`): bentuk grafik (#3), rentang (#5), akun terarsip (#6), dan modul baru di capability map.

1. **Diturunkan dari `transactions`, tanpa tabel baru.** Nilai akhir bulan M = `initial_balance` + efek semua transaksi hidup bertanggal ≤ hari terakhir M, dengan rumus yang sama dengan view `account_balances`. Ini memanfaatkan keputusan #4 SPEC-goals ("riwayat nilai bisa diturunkan nanti tanpa snapshot"). Tidak ada perubahan skema, migrasi, atau dependency.
2. **Setoran vs pasar per bulan.** `marketGain` bulan M = jumlah `revaluation` hidup bertanggal ≤ akhir M. `contributed = value − marketGain`. Saldo awal, adjustment, income, expense, saving, dan transfer termasuk setoran (sama dengan keputusan #9 SPEC-goals; income seperti dividen yang dicatat sebagai income juga terhitung setoran). Perubahan bulanan = selisih dengan bulan sebelumnya.
3. **Grafik "Nilai vs Disetor".** Dua garis per bulan: Nilai (garis penuh) dan Disetor (garis putus-putus). Celah di antaranya adalah hasil pasar. Sumbu Y tidak dimulai dari 0 (grafik garis, bukan batang), supaya perubahan ratusan ribu di atas basis puluhan juta tetap terlihat.
4. **Kalimat ringkasan di atas grafik**, dihitung (bukan AI): "Naik Rp12,4 jt sejak Agt 2026: setoran +Rp12 jt, pasar +Rp400 rb." Nominal saja, **tanpa persen**, karena persen dari nilai awal ikut menghitung setoran. Kalimat ini juga menjadi alternatif teks grafik.
5. **Rentang 6 bulan, 12 bulan, atau Semua**, default 12. Jendela berakhir di bulan berjalan dan dipotong di bulan pertama yang punya data. "Semua" dimulai dari bulan pertama itu.
6. **Hanya akun aset aktif** (`type = "asset"`, `archived_at is null`), sama dengan keputusan #15 SPEC-goals dan daftar "Nilai aset". Konsekuensinya, mengarsipkan akun mengubah histori gabungan bulan-bulan lalu (diterima, lihat [Risiko](#risiko)). Tipe akun dibaca saat ini, jadi akun yang dulu bertipe `transaction` membawa riwayatnya sebagai aset.
7. **Bulan pertama akun** = yang lebih awal antara bulan `created_at` (Asia/Jakarta) dan bulan transaksi hidup tertua yang menyentuh akun itu. `initial_balance` adalah saldo sebelum transaksi pertama, jadi masuk sebagai setoran di bulan pertama itu. Dengan begitu transaksi yang di-backdate sebelum akun dibuat tidak membuat nilai negatif. Bulan sebelum bulan pertama bernilai 0.
8. **Bulan berjalan memakai nilai hari ini** dan berlabel "berjalan". Transaksi bertanggal masa depan tidak bisa dibuat (keputusan #7 SPEC-goals), jadi nilai bulan berjalan = `balance` sekarang.
9. **Gabungan = jumlah per akun.** Transfer antar dua akun aset bernilai 0 di gabungan dan tetap tampil sebagai setoran ± di filter per akun.
10. **Endpoint di bawah `/api/valuations`**: `GET /api/valuations/history`. Path ini sudah cocok dengan key resource `valuations` di `lib/cache-invalidation.ts`, jadi ikut direvalidasi oleh `invalidate("transactions")` dan `invalidate("accounts")` tanpa edge baru. Modul `goals` tetap pemilik `GET`/`POST /api/valuations`, dan modul ini pemilik sub-path `history`.
11. **Section "Histori nilai" di `/net-worth`**, di bawah "Nilai aset". Tidak tampil jika tidak ada akun aset aktif (empty state "Nilai aset" yang sudah ada sudah cukup). Filter akun hanya tampil jika ada ≥ 2 akun aset.
12. **Pilihan rentang dan akun adalah state lokal komponen** (`useState`), kembali ke default saat halaman dibuka ulang. Tidak masuk URL, Zustand, atau storage.
13. **Online tidak wajib.** Read-only. `GET` tampil dari cache service worker lewat aturan `GET /api/*` yang sudah ada. Kombinasi rentang/akun yang belum pernah dibuka saat online menampilkan error dengan "Coba lagi".

## Kontrak API

Route memakai `withAuth`, memfilter `user_id` dari session, dan format error dari `lib/api/errors.ts`.

### Tipe

```ts
// lib/schemas/asset-history.ts (dipakai client & server)
export const ASSET_HISTORY_RANGES = ["6", "12", "all"] as const;
type AssetHistoryRange = (typeof ASSET_HISTORY_RANGES)[number];

type AssetHistoryValue = {
  value: number; // nilai akhir bulan, integer rupiah
  contributed: number; // value − marketGain
  marketGain: number; // jumlah revaluasi hidup s.d. akhir bulan
};

type AssetHistoryMonth = AssetHistoryValue & {
  month: string; // YYYY-MM
  contributionChange: number; // contributed − contributed bulan sebelumnya (atau opening)
  marketChange: number; // marketGain − marketGain bulan sebelumnya (atau opening)
};

type AssetHistory = {
  range: AssetHistoryRange;
  accountId: string | null; // null = gabungan
  opening: AssetHistoryValue; // akhir bulan sebelum months[0]; semua 0 jika belum ada data
  months: AssetHistoryMonth[]; // terlama dulu, terakhir = bulan berjalan; kosong hanya tanpa akun aset aktif
};
```

### Route

| Method & path                  | Query                                              | Sukses             | Error                        |
| ------------------------------ | -------------------------------------------------- | ------------------ | ---------------------------- |
| `GET /api/valuations/history`  | `range` (`6` \| `12` \| `all`, default `12`), `accountId` (opsional) | 200 `AssetHistory` | 400, 404 `ACCOUNT_NOT_FOUND` |

### Validasi (Zod)

- `assetHistoryQuerySchema` di `lib/schemas/asset-history.ts`, di-parse dari `Object.fromEntries(searchParams)` seperti `dashboardQuerySchema`. `range`: `z.enum(ASSET_HISTORY_RANGES)`, default `"12"`. `accountId`: `z.uuid()`, opsional. Nilai tidak valid → 400 `fields.range` / `fields.accountId`.
- `accountId` yang tidak ada, milik user lain, terarsip, atau bukan `type = "asset"` → 404 `ACCOUNT_NOT_FOUND` (`accountNotFound()` yang sudah ada). Keempatnya sama supaya keberadaan akun user lain tidak bocor.

### Query

`lib/server/queries/asset-history.ts`: `assetHistory(userId, { range, accountId, today })` → `AssetHistory | null` (`null` = akun tidak ditemukan, route menjawab 404). Menerima `today` supaya tes memakai tanggal tetap, sama dengan `dashboardSummary`. Agregasi di SQL:

1. **`assets`**: akun aset aktif milik user (atau satu `accountId`), dengan `initial_balance` dan bulan pertama (keputusan #7).
2. **`deltas`** per akun per bulan: efek transaksi hidup dengan rumus view `account_balances`, di-join dari sisi `account_id` **dan** `to_account_id` (sama dengan `flows` di `goal-progress.ts`), dipisah menjadi `revaluation` dan lainnya, ditambah `initial_balance` sebagai setoran di bulan pertama akun.
3. **Seri bulan** `generate_series` dari bulan pertama paling awal sampai bulan `today` (di atas `timestamp`, label `to_char`, sama dengan `expenseActivity`), `sum() over (order by month)` kumulatif, lalu ambil 6/12 bulan terakhir. `opening` = baris kumulatif tepat sebelum jendela (0 jika tidak ada).

Hasilnya paling banyak beberapa ratus baris. `contributionChange`/`marketChange` dihitung di TS oleh fungsi murni `withChanges`.

**Invarian (dites):**

- Bulan terakhir: `value` = jumlah `balance`, `marketGain` = jumlah `marketGain`, `contributed` = jumlah `contributed` dari `GET /api/valuations` (untuk akun yang difilter, baris akun itu).
- Setiap bulan: `value = contributed + marketGain`, dan `prev.contributed + contributionChange = contributed` (sama untuk pasar, `prev` bulan pertama = `opening`).
- Setiap bulan gabungan = jumlah histori per akun di bulan itu.

### Fungsi murni

`lib/asset-history.ts` (client & server, tanpa `Date` lokal, aritmetika bulan dari `lib/period.ts`):

- `withChanges(opening, points)` → `AssetHistoryMonth[]`.
- `assetHistorySummary(history)` → `{ since: string; change: number; contributed: number; market: number } | null`: `since = months[0].month`, setiap angka = bulan terakhir − `opening`. `null` jika `months` kosong.
- `summarySentence(summary, money)`: "Naik {abbr} sejak {Agt 2026}: setoran {±abbr}, pasar {±abbr}." `change < 0` → "Turun …", `change = 0` → "Tetap sejak …". Tanda ditulis sebagai teks ("+", "−"), bukan hanya warna. `money` dari `useAmountFormat`, jadi `hideAmounts` menyamarkan nominal.

### Kontrak untuk modul lain

- **`goals`**: tidak ada kontrak yang berubah. `GoalsView` merender `<AssetHistory>` di bawah `AssetValues`. Item "grafik net worth dari waktu ke waktu" di *Di luar cakupan* SPEC-goals diberi rujukan ke spec ini.
- **`lib/cache-invalidation.ts`**: tidak berubah (keputusan #10). Tes memastikan key histori cocok dengan resource `valuations`.
- **`transactions`, `accounts-categories`, `dashboard`, `pwa-offline`**: tidak berubah.

## Deliverables

### 1. Server

- `lib/schemas/asset-history.ts`: tipe, `ASSET_HISTORY_RANGES`, `assetHistoryQuerySchema`.
- `lib/asset-history.ts`: `withChanges`, `assetHistorySummary`, `summarySentence`.
- `lib/server/queries/asset-history.ts`: `assetHistory`.
- `app/api/valuations/history/route.ts`.

### 2. Client

- `hooks/use-asset-history.ts`: `useAssetHistory({ range, accountId })`, key `apiKey("valuations", { path: "history", query: { range, accountId } })`.
- Tidak ada data histori di Zustand.

### 3. UI

- **`components/goals/asset-history.tsx`**: section `surface` dengan `SectionTitle` "Histori nilai".
  - **Kontrol:** `ToggleGroup` rentang "6 bln" / "12 bln" / "Semua" (default 12), dan jika ada ≥ 2 akun aset, `Select` berlabel "Akun" berisi "Semua aset" + akun aset aktif dengan urutan `useValuations()` dan nama dari `useAccounts`. `accountId` yang tidak lagi ada di daftar aset (mis. baru diarsipkan) diperlakukan sebagai "Semua aset". Setiap kontrol ≥ 44 px.
  - **Ringkasan:** `summarySentence` sebagai paragraf teks.
  - **Grafik** (`months.length ≥ 2`): `components/goals/asset-history-chart.tsx`, default export yang dimuat dengan `next/dynamic` di belakang skeleton setinggi grafik. `LineChart` Recharts lewat shadcn chart: Nilai = garis penuh `--chart-1`, Disetor = garis putus-putus `--muted-foreground`, legenda teks "Nilai" dan "Disetor" (beda pola garis, bukan hanya warna). Sumbu X `formatBucket(month, "tick")`, sumbu Y `abbreviateIDR` dengan domain dari data (keputusan #3). Tooltip: bulan (`formatBucket(…, "full")`), Nilai, Disetor, Pasar dengan `formatIDR`. `aria-hidden`, karena ringkasan dan tabel adalah alternatif teksnya. `hideAmounts` menyembunyikan sumbu Y dan tooltip, bentuk garis tetap tampil (sama dengan Expense Activity). `months.length = 1` → teks "Grafik muncul setelah ada data dua bulan." menggantikan grafik.
  - **Tabel** `<table>` semantik (bukan komponen shadcn baru), `<caption>` sr-only, `<th scope>`: **Bulan · Setoran · Pasar · Nilai**, bulan terbaru di atas. Setoran dan Pasar = perubahan bulan itu dengan tanda teks, Nilai = nilai akhir bulan. Bulan berjalan memakai label kecil "berjalan". Di bawah `sm` nominal memakai `abbreviateIDR` supaya empat kolom muat di 360 px; mulai `sm` memakai `formatIDR`. Angka rata kanan dengan `tabular-nums`. `hideAmounts` → `HIDDEN_AMOUNT`.
  - **State:** skeleton dengan tinggi sama dengan konten akhir (CLS < 0,1). Error SWR → `LoadError` "Gagal memuat histori nilai." dengan "Coba lagi", section lain tetap tampil.
- **`components/goals/goals-view.tsx`**: render `<AssetHistory>` di bawah `AssetValues` hanya jika `assets.length > 0`.
- Mobile: layout benar di 360 px, target sentuh ≥ 44×44 px, kontras ≥ 4.5:1. Ikuti [DESIGN.md](DESIGN.md).

## Acceptance criteria

Skenario dasar (`today = 2026-11-15`, transaksi ditulis langsung dengan tanggal tetap): BCA (`transaction`), Emas (`asset`, gold, saldo awal 30.000.000), RD Saham (`asset`, saldo awal 0), semua dibuat 2026-07-01.

| Tanggal    | Transaksi                          |
| ---------- | ---------------------------------- |
| 2026-08-05 | transfer BCA → RD Saham 3.000.000  |
| 2026-09-05 | transfer BCA → RD Saham 4.000.000  |
| 2026-09-30 | revaluasi RD Saham −300.000        |
| 2026-10-05 | transfer BCA → Emas 5.000.000      |
| 2026-10-10 | transfer RD Saham → Emas 1.000.000 |
| 2026-10-31 | revaluasi Emas +500.000            |
| 2026-11-02 | revaluasi RD Saham +200.000        |

**API / query**

- [ ] Gabungan, `range=12` → `opening` 0/0/0, lima bulan (dipotong di Jul):

  | month   | value      | contributed | marketGain | contributionChange | marketChange |
  | ------- | ---------- | ----------- | ---------- | ------------------ | ------------ |
  | 2026-07 | 30.000.000 | 30.000.000  | 0          | +30.000.000        | 0            |
  | 2026-08 | 33.000.000 | 33.000.000  | 0          | +3.000.000         | 0            |
  | 2026-09 | 36.700.000 | 37.000.000  | −300.000   | +4.000.000         | −300.000     |
  | 2026-10 | 42.200.000 | 42.000.000  | 200.000    | +5.000.000         | +500.000     |
  | 2026-11 | 42.400.000 | 42.000.000  | 400.000    | 0                  | +200.000     |

  Transfer RD Saham → Emas bernilai 0 di gabungan.
- [ ] `accountId = RD Saham`, `range=12` → Jul 0, Agt 3.000.000, Sep 6.700.000 (`marketGain −300.000`), Okt 5.700.000 (`contributionChange −1.000.000`), Nov 5.900.000 (`marketGain −100.000`).
- [ ] `range=6` dengan `today = 2027-01-15` → enam bulan 2026-08..2027-01, `opening` = Jul (30.000.000 / 30.000.000 / 0). Des dan Jan sama dengan Nov. `assetHistorySummary` → `since "2026-08"`, `change 12.400.000`, `contributed 12.000.000`, `market 400.000`.
- [ ] `range=all` sama dengan `range=12` di skenario dasar. Tanpa `range` → `"12"`.
- [ ] Akun aset dibuat 2026-11-01 dengan saldo awal 2.000.000 dan transfer masuk 1.000.000 bertanggal 2026-09-10 → bulan pertama 2026-09 dengan nilai 3.000.000 (bukan 1.000.000), tanpa bulan bernilai negatif.
- [ ] Revaluasi yang di-soft-delete tidak dihitung. Menghapus revaluasi Emas 2026-10-31 menurunkan `marketGain` Okt dan Nov sebesar 500.000.
- [ ] Emas diarsipkan → gabungan tidak memuat Emas di bulan mana pun. `accountId = Emas` → 404.
- [ ] Invarian di bagian Query, untuk gabungan dan per akun.
- [ ] `range=24` → 400 `fields.range`. `accountId=abc` → 400 `fields.accountId`. `accountId` BCA (`transaction`), id acak, atau akun aset user lain → 404 `ACCOUNT_NOT_FOUND`.
- [ ] User tanpa akun aset aktif → 200, `months: []`, `opening` 0.
- [ ] **Isolasi:** user B dengan `accountId` akun aset A → 404. Histori gabungan B tidak berubah oleh akun dan transaksi A.
- [ ] Tanpa session → 401 `UNAUTHORIZED`.
- [ ] Semua tes yang ada tetap hijau tanpa diubah.

**UI (manual di 360 px dan 1024 px)**

- [ ] Section "Histori nilai" tampil di bawah "Nilai aset" dengan kalimat ringkasan, grafik dua garis, dan tabel. Check-in baru memperbarui baris bulan berjalan tanpa reload.
- [ ] Ganti rentang dan akun → ringkasan, grafik, dan tabel berubah bersama. Filter akun tidak tampil dengan satu akun aset.
- [ ] Empat kolom tabel muat di 360 px tanpa scroll horizontal halaman. Naik/turun terbaca tanpa warna (tanda teks, garis penuh vs putus-putus).
- [ ] Satu bulan data → teks pengganti grafik, tabel satu baris.
- [ ] `hideAmounts` menyamarkan ringkasan, tabel, sumbu Y, dan tooltip.
- [ ] Mode pesawat: kombinasi yang pernah dibuka tampil dari cache, yang belum menampilkan error + "Coba lagi".
- [ ] First load `/net-worth` < 200 KB gzip (Recharts lewat `next/dynamic`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Tes

- **Unit (`tests/unit/`):**
  - `asset-history.spec.ts`: `withChanges` (bulan pertama dari `opening`, nilai negatif), `assetHistorySummary` (kosong → `null`, `since`), `summarySentence` (naik, turun, tetap, pasar negatif "−Rp…", nominal tersembunyi).
  - `asset-history-schema.spec.ts`: default `range`, enum, `accountId` uuid.
  - `cache-invalidation.spec.ts` (yang ada): key `useAssetHistory` cocok dengan `isResourceKey("valuations", …)` dan ikut `affectedBy("transactions")` / `affectedBy("accounts")`.
- **API (`tests/api/`, Supabase sungguhan, user `test-<uuid>`):**
  - `asset-history.spec.ts`: query `assetHistory` dengan `today` tetap untuk semua angka di Acceptance criteria, invarian terhadap `assetValuations`, dan route handler (400, 404, isolasi, 401).
- **E2E:** tetap ditunda (SPEC.md Open question #2).
- Satu berkas: `pnpm vitest run tests/api/asset-history.spec.ts`.

## Struktur file

```
app/api/valuations/history/route.ts
components/goals/{asset-history.tsx, asset-history-chart.tsx, goals-view.tsx}
hooks/use-asset-history.ts
lib/schemas/asset-history.ts
lib/asset-history.ts
lib/server/queries/asset-history.ts
tests/unit/{asset-history,asset-history-schema}.spec.ts, tests/unit/cache-invalidation.spec.ts
tests/api/asset-history.spec.ts
```

Perintah, gaya kode, dan format error mengikuti [SPEC.md](SPEC.md).

## Boundaries (khusus modul ini)

- **Always:** hitung semua nilai bulanan di SQL dari `transactions` + `initial_balance` dengan rumus view `account_balances`, filter `user_id` di setiap CTE, hitung bulan dari string dan "hari ini" dengan `todayInJakarta()`, pakai `useAmountFormat` untuk setiap nominal, beri grafik alternatif teks.
- **Ask first:** tabel snapshot, cron, atau materialized view; menghitung akun transaksi atau akun terarsip; persen return; dependency grafik selain shadcn chart/Recharts; komponen shadcn baru; kartu histori di dashboard; mengubah kontrak `GET /api/valuations`.
- **Never:** menjumlahkan baris transaksi di client, menyalin histori ke Zustand, menerima `userId` dari query, menulis data apa pun dari route ini, mengedit `components/ui/chart.tsx` manual.

## Risiko

- **Data masih tipis.** Check-in baru dibuka 2026-11-02, jadi selama 1–2 bulan pertama garis Nilai dan Disetor hampir menempel. Itu jujur (belum ada hasil pasar yang tercatat). Ringkasan tetap memberi angka.
- **Pasar berbentuk tangga.** Di antara dua check-in pasar datar karena tidak ada harga otomatis, dan semua lonjakan pasar jatuh di bulan check-in. Diterima. Tooltip memisahkan Pasar supaya tidak dikira setoran.
- **Arsip mengubah masa lalu** (keputusan #6). Mengarsipkan akun aset menghapusnya dari histori gabungan semua bulan. Diterima demi konsistensi dengan "Nilai aset" dan target. Alternatifnya (ikut sampai tanggal arsip) adalah Ask first.
- **Edit transaksi lama** menggeser histori bulan itu dan sesudahnya. Memang benar, karena histori diturunkan, bukan dibekukan.
- **Income ke akun aset terhitung setoran** (keputusan #2). Dividen yang dicatat sebagai income tidak muncul sebagai pasar. Diterima, sama dengan SPEC-goals #9.
- **Query "Semua"** bisa mencakup puluhan bulan jika ada transaksi lama yang di-backdate. Data satu pemilik kecil. Cek `EXPLAIN` di tes dengan beberapa ribu baris, dan index `transactions_user_account_type_idx` serta `transactions_user_account_idx` yang sudah ada seharusnya cukup.
- **Bundle:** Recharts sudah dipakai dashboard, tapi `/net-worth` belum memuatnya. `next/dynamic` menjaga first load.

## Open questions

1. ~~Bentuk grafik, rentang, akun terarsip, letak spec~~ **Dijawab 2026-11-03:** Nilai vs Disetor + ringkasan, 6/12/Semua, akun terarsip tidak ikut, modul baru `asset-history`.
