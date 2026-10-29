# Spec module: `dashboard`

Status: draft · 2026-10-25 · @Yogi
Bergantung pada: `transactions`, `budgets` (dan `accounts-categories` lewat keduanya) · Dipakai oleh: `pwa-offline` · Indeks: [SPEC.md](SPEC.md)

## Objective

Begitu membuka aplikasi, pengguna langsung tahu posisi keuangannya: total saldo semua akun, berapa income, expense, dan saving di periode ini dibanding periode lalu, ke mana uangnya pergi (per hari dan per kategori), dan budget mana yang hampir habis. Setiap angka bisa di-tap untuk membuka daftar transaksi yang menyusunnya.

Modul ini pemilik **kontrak** `GET /api/dashboard`, query `dashboardSummary`, hook `useDashboard`, dan halaman `/dashboard`. Saldo akun memakai kontrak `GET /api/accounts` (`accounts-categories`), Budget Summary memakai `useBudgets` (`budgets`).

Di luar cakupan: daftar transaksi terakhir di dashboard, net worth historis (grafik saldo dari waktu ke waktu), rentang tanggal bebas, perbandingan antar tahun dalam satu grafik, grafik income, widget yang bisa diatur ulang, insight/teks otomatis ("pengeluaranmu naik karena…"), notifikasi.

## Keputusan

Semua usulan untuk direview (lihat [Open questions](#open-questions)).

1. **Periode hidup di URL:** `/dashboard?period=YYYY-MM` atau `YYYY`, default bulan berjalan (Asia/Jakarta). Sama dengan keputusan #10 transactions dan #6 budgets. Mode `all` tidak ada karena tidak punya "periode lalu" untuk dibandingkan. `usePeriodStore` tidak dipakai.
2. **Rentang periode:** bulan `2000-01` sampai bulan berjalan, tahun `2000` sampai tahun berjalan. Periode masa depan ditolak (400) karena transaksi masa depan tidak mungkin ada (keputusan #5 transactions).
3. **Kartu ringkasan:** Income, Expense, Saving, dan **Sisa** (`income − expense − saving`, boleh negatif). Transfer dan adjustment tidak dihitung, sama dengan `transactionTotals`.
4. **Pembanding = periode sebelumnya dengan panjang yang sama (period-to-date).** Untuk periode berjalan, periode lalu dipotong di hari yang sama: tanggal 25 Oktober dibandingkan dengan 1–25 September, bukan September penuh, supaya pertengahan bulan tidak selalu terlihat "turun". Hari yang tidak ada di periode lalu dipotong ke hari terakhirnya (31 Okt → 30 Sep, 29 Feb → 28 Feb). Periode yang sudah lewat dibandingkan penuh dengan periode lalu penuh.
5. **Perubahan %** = `round((sekarang − lalu) × 100 / lalu)`, dihitung oleh satu fungsi murni. `lalu = 0` → `null` (tampil "—", tanpa persen). Kartu Sisa menampilkan selisih nominal, bukan persen, karena tandanya bisa berbalik. Warna ikut arti, bukan arah: expense naik = buruk (`--expense`), income/saving/Sisa naik = baik (`--income`). Arah juga tertulis sebagai ikon + teks ("naik 12%"), tidak hanya lewat warna.
6. **Account Balance dari `useAccounts()`**, dijumlahkan di client. Ini puluhan baris akun yang sudah ada di cache dan saldonya sudah dihitung view `account_balances`, bukan agregasi baris transaksi. Total = jumlah `balance` akun aktif (saldo kartu kredit yang negatif ikut mengurangi), dikelompokkan per `type` (Transaksi, Aset). Saldo selalu saldo **sekarang**, tidak mengikuti periode.
7. **Expense Activity:** grafik batang expense per hari (mode bulan, 28–31 batang) atau per bulan (mode tahun, 12 batang). Bucket kosong tetap ada dengan nilai 0, dibuat di SQL (`generate_series`). Bucket setelah hari ini tidak dikirim.
8. **Donut per kategori:** expense per kategori spending di periode itu, 5 terbesar + "Lainnya". Data dari server berisi **semua** kategori yang punya expense (urut nominal), pemotongan top 5 dilakukan di client dari baris yang sudah teragregasi. Kategori terarsip tetap dihitung dan berlabel "(arsip)". Di bawah donut: legenda berisi nama, nominal, dan persen dari total expense.
9. **Budget Summary hanya di mode bulan**, memakai `useBudgets(period)` (cache dibagi dengan `/budget`). Isi: progress total (terpakai dari budget), lalu sampai 3 kategori dengan status `over` lalu `warning` (urut persen tertinggi). Bulan tanpa budget → CTA "Atur budget" ke `/budget?period=…`. Di mode tahun kartu ini diganti teks "Budget dihitung per bulan" dengan tautan ke `/budget`.
10. **Satu endpoint, satu query per bagian.** `GET /api/dashboard` mengembalikan kartu, pembanding, aktivitas, dan kategori sekaligus, jadi dashboard butuh tiga request SWR saja (dashboard, accounts, budgets) dan semuanya sudah dipakai halaman lain kecuali yang pertama.
11. **Respons memakai id**, nama kategori di-resolve di client dari `useCategories({ includeArchived: true })`, sama dengan keputusan #8 transactions.
12. **Drill-down** ke `/transactions` dengan URL lengkap (kontrak transactions): kartu Income/Expense/Saving → `?period=…&type=…`, irisan/legenda donut → `?period=…&type=expense&categoryId=…`, baris akun → `?period=…&accountId=…`, baris Budget Summary → kontrak budgets (`?period=…&type=expense&categoryId=…`). Batang aktivitas tidak bisa di-tap karena daftar tidak punya filter per hari.

Tidak ada perubahan skema, tidak ada migrasi, tidak ada index baru.

## Kontrak API

Route memakai `withAuth`, memfilter `user_id` dari session, dan format error dari `lib/api/errors.ts`.

### Tipe

```ts
// lib/schemas/dashboard.ts (dipakai client & server)
type DashboardPeriod = string; // YYYY-MM atau YYYY

type DateRange = { from: string; to: string }; // YYYY-MM-DD, inklusif

type DashboardTotals = TransactionTotals & { net: number }; // net = income − expense − saving

type DashboardSummary = {
  period: DashboardPeriod;
  range: DateRange; // range periode; `to` dipotong ke hari ini untuk periode berjalan
  previous: { period: DashboardPeriod; range: DateRange }; // keputusan #4
  totals: DashboardTotals;
  previousTotals: DashboardTotals;
  activity: { bucket: string; expense: number }[]; // bucket YYYY-MM-DD (mode bulan) atau YYYY-MM (mode tahun), urut naik
  categories: {
    categoryId: string;
    spendingType: "needs" | "wants";
    amount: number;
  }[]; // amount > 0, urut amount desc lalu categoryId
};
```

### Route

| Method & path        | Query                             | Sukses                 | Error                                         |
| -------------------- | --------------------------------- | ---------------------- | --------------------------------------------- |
| `GET /api/dashboard` | `?period=YYYY-MM \| YYYY` (wajib) | 200 `DashboardSummary` | 400 `VALIDATION_ERROR` (`fields.period`), 401 |

Hanya membaca. Param lain diabaikan.

### Validasi (Zod, `lib/schemas/dashboard.ts`)

- `period`: regex bulan (`^\d{4}-(0[1-9]|1[0-2])$`) atau tahun (`^\d{4}$`), lalu cek rentang keputusan #2 dengan `todayInJakarta()` saat parse.
- Rentang dan pembanding dihitung oleh fungsi murni `dashboardRanges(period, today)` di `lib/dashboard-period.ts`, dari string (bukan `Date` lokal), memakai `periodToRange` dan `shiftPeriod` dari `lib/period.ts`.

### Query `dashboardSummary`

`lib/server/queries/dashboard-summary.ts`, `dashboardSummary(userId, period, today)`:

- **Totals:** `transactionTotals(userId, range)` dan `transactionTotals(userId, previous.range)`, dijalankan paralel. Tidak ada `where` baru: pakai `transactionWhere` yang sudah ada. `net` ditambahkan di TS.
- **Activity:** satu query `generate_series(from, to, '1 day' | '1 month')` left join `sum(amount)` expense tak terhapus per `date` (atau `date_trunc('month', date)`). Bucket diformat di SQL (`to_char`) supaya tidak melewati `Date` JS.
- **Categories:** satu query `sum(amount)` expense tak terhapus per `category_id` dalam `range`, join `categories` untuk `spending_type`, `having sum > 0`.
- Semua agregasi di DB. TS hanya menyusun objek.

**Invarian (dites):** `sum(activity.expense) = totals.expense = sum(categories.amount)`, dan untuk mode bulan `totals.expense = budgetUsage(userId, period).summary.total.spent`.

### Kontrak untuk modul lain

- **SWR key:** `"/api/dashboard?period=<period>"`. Resource `dashboard` ditambahkan ke `lib/cache-invalidation.ts` (`KEYS.dashboard = /^\/api\/dashboard($|[/?])/`) dan ke `AFFECTS.transactions`. Mutasi akun dan kategori tidak memengaruhi angka dashboard (adjustment tidak dihitung, nama di-resolve di client), jadi tidak ditambahkan di sana.
- **Server component** yang butuh data langsung boleh memanggil `dashboardSummary(userId, period, today)`.
- **`pwa-offline`:** endpoint hanya membaca, jadi cukup di-cache. Respons terakhir per periode yang ditampilkan saat offline adalah urusan modul itu.

## Deliverables

### 1. Server

- `lib/schemas/dashboard.ts`: tipe, `dashboardPeriodSchema`, `dashboardQuerySchema`.
- `lib/dashboard-period.ts` (murni): `dashboardRanges(period, today)` → `{ range, previous }`, `dashboardMode(period)`.
- `lib/server/queries/dashboard-summary.ts`: `dashboardSummary`.
- Route: `app/api/dashboard/route.ts`.

### 2. Client

- `lib/dashboard-format.ts` (murni): `percentChange(current, previous)`, `changeTone(metric, delta)`, `topCategories(categories, n = 5)` (top N + "Lainnya", jumlah tepat sama dengan total), `sumBalances(accounts)` (total + per `type`, hanya akun aktif).
- `hooks/use-dashboard.ts`: `dashboardKey(period)`, `useDashboard(period)`.
- `lib/cache-invalidation.ts`: resource `dashboard` (lihat Kontrak).
- Komponen chart shadcn: `pnpm dlx shadcn@latest add chart` (memasang `recharts`, sudah ada di Tech stack). File `components/ui/chart.tsx` tidak diedit manual.

### 3. UI

- **`app/(app)/dashboard/page.tsx`** menggantikan placeholder, dibungkus `<Suspense>` karena memakai `useSearchParams`. Isi di `components/dashboard/dashboard-view.tsx`.
  - **Header:** stepper periode yang dipakai ulang dari `components/transactions/` dengan mode bulan dan tahun saja (tanpa "Semua"), tidak bisa melewati periode berjalan. Periode ditulis ke URL lewat `router.replace`. Tombol mata `hideAmounts` yang sudah ada.
  - **Account Balance:** total saldo besar, lalu subtotal Transaksi dan Aset. Bisa dibuka (collapsible) untuk melihat saldo per akun, tap akun → drill-down. Tanpa akun → "Tambah akun" (`open("manageAccounts")`).
  - **Kartu ringkasan** (grid 2×2 di 360 px, 4 kolom di `lg`): nominal, perubahan vs periode lalu ("naik 12% dari Sep" / "—"), label periode pembanding di teks bantuan ("dibanding 1–25 Sep").
  - **Expense Activity:** bar chart Recharts lewat shadcn chart, warna `--expense`, sumbu Y dengan `abbreviateIDR`, tooltip `formatIDR`. Tanggal diformat dari string dengan `timeZone: "UTC"`. Tinggi tetap.
  - **Pengeluaran per kategori:** donut + legenda (keputusan #8). Warna kategori dari token `--chart-1..5` + abu-abu untuk "Lainnya". Total expense di tengah donut.
  - **Budget Summary:** keputusan #9, progress bar dengan `role="progressbar"` seperti halaman Budget, teks status ("Hampir habis", "Melebihi budget").
  - Urutan mobile: Account Balance, kartu, Budget Summary, Expense Activity, donut. Di `lg`: dua kolom (grafik di kiri, saldo + budget di kanan).
  - `hideAmounts`: semua nominal (kartu, saldo, legenda, tooltip, label tengah donut, sumbu Y) diganti `HIDDEN_AMOUNT` atau disembunyikan. Persen dan bentuk grafik tetap tampil.
  - **State:** skeleton dengan tinggi sama dengan konten akhir (CLS < 0,1), error SWR per bagian dengan "Coba lagi" (bagian lain tetap tampil), periode tanpa expense → grafik diganti teks "Belum ada pengeluaran di {periode}" + tombol "Catat expense" (`/add/expense`).
- **Aksesibilitas grafik:** setiap grafik punya judul teks dan alternatif yang terbaca screen reader (legenda donut sudah berupa daftar teks, aktivitas punya ringkasan "Total Rp…, tertinggi Rp… pada {tanggal}" dan tabel `sr-only`). Warna tidak menjadi satu-satunya pembeda.
- **Performa:** grafik dimuat dengan `next/dynamic` di belakang skeleton supaya Recharts tidak memperberat JS awal. JS first load `/dashboard` < 200 KB gzip (SPEC.md), diukur dengan `@next/bundle-analyzer` atau output `pnpm build`.
- Mobile: target sentuh ≥ 44×44 px (kartu, legenda, baris akun), tanpa horizontal scroll di 360 px, kontras ≥ 4.5:1.

## Acceptance criteria

**API**

- [x] Dengan income 10.000.000, expense 3.000.000 (dua kategori, salah satunya terarsip, termasuk satu biaya admin transfer), saving 1.000.000, satu transfer, dan satu adjustment di Oktober 2026: `GET ?period=2026-10` → `totals = { income: 10000000, expense: 3000000, saving: 1000000, net: 6000000 }`. Transfer, adjustment, dan baris terhapus tidak ikut.
- [x] Pada tanggal 25 Oktober 2026 (fake timer), `period=2026-10` → `range = 2026-10-01..2026-10-25`, `previous.range = 2026-09-01..2026-09-25`, dan expense 26 September tidak masuk `previousTotals`. Pada 31 Oktober → pembanding sampai 30 September. `period=2026-09` (sudah lewat) → pembanding 1–31 Agustus penuh.
- [x] Mode tahun: pada 2028-02-29, `period=2028` → `range = 2028-01-01..2028-02-29`, `previous.range = 2027-01-01..2027-02-28`. `period=2025` → pembanding 2024 penuh.
- [x] `activity` mode bulan: satu bucket per hari dari tanggal 1 sampai `range.to` (25 bucket pada 25 Okt, 30 untuk September penuh, 29 untuk Februari 2028), hari tanpa expense bernilai 0, expense tanggal 1 dan hari terakhir masuk bucket yang benar. Mode tahun: bucket `YYYY-MM`, tidak melewati bulan berjalan.
- [x] `categories` berisi setiap kategori dengan expense > 0 di `range` (termasuk terarsip), urut `amount desc`, dan tidak memuat kategori tanpa expense.
- [x] Invarian: `sum(activity) = totals.expense = sum(categories.amount)`, dan untuk mode bulan sama dengan `GET /api/budgets?period=…` `summary.total.spent`.
- [x] Periode tanpa transaksi → semua total 0, `categories` kosong, `activity` berisi bucket 0.
- [x] `period` kosong, `2026-13`, `26-10`, `1999`, `1999-12`, bulan depan, atau tahun depan → 400 `fields.period`.
- [x] **Isolasi:** respons user B tidak pernah memuat transaksi atau kategori A (total, aktivitas, dan kategori B tetap 0 walau A punya data di periode yang sama).
- [x] Tanpa session → 401 `UNAUTHORIZED`.

**Unit**

- [x] `percentChange`: 100 → 112 = 12, 100 → 88 = −12, 0 → 50 = `null`, 0 → 0 = `null`, 3 → 4 = 33. `changeTone`: expense naik = buruk, income naik = baik, perubahan 0 = netral.
- [x] `topCategories` dengan 8 kategori → 5 + "Lainnya" berisi jumlah 3 sisanya. ≤ 6 kategori → tanpa "Lainnya" (tidak membuat "Lainnya" untuk satu kategori). Jumlah selalu sama dengan input.
- [x] `sumBalances` melewati akun terarsip, kartu kredit negatif mengurangi total, subtotal per `type` benar.

**UI (manual di 360 px dan 1024 px)** · Belum dicek manual per 2026-10-25: butuh login Google di perangkat. Lighthouse dan ukuran JS dicatat di [plan.md](tasks/plan.md) § dashboard.

- [x] `/dashboard` tanpa query menampilkan bulan berjalan. `/dashboard?period=2026` bertahan setelah refresh. Stepper tidak bisa maju melewati periode berjalan, dan mode tahun menyembunyikan Budget Summary dengan teks penggantinya.
- [x] Mencatat expense dari **+** lalu kembali ke `/dashboard` memperbarui kartu, grafik, donut, saldo, dan Budget Summary tanpa reload.
- [x] Tap kartu Expense, irisan donut, baris akun, dan baris budget membuka `/transactions` dengan filter yang benar, dan totalnya sama dengan angka di dashboard.
- [x] `hideAmounts` menyamarkan semua nominal di dashboard, termasuk tooltip dan sumbu grafik.
- [x] Tanpa akun: CTA "Tambah akun" membuka modal. Bulan tanpa expense: teks + tombol "Catat expense".
- [x] Perubahan vs periode lalu terbaca tanpa warna (ikon + teks), layout benar di 360 px tanpa horizontal scroll, target sentuh ≥ 44 px.
- [x] Tidak ada layout shift saat data selesai dimuat (Lighthouse CLS < 0,1). JS first load `/dashboard` < 200 KB gzip.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Tes

- **Unit (`tests/unit/`):**
  - `dashboard-schema.spec.ts`: format dan rentang `period` (hari ini lewat fake timer, termasuk 31 Desember → tahun depan ditolak).
  - `dashboard-period.spec.ts`: `dashboardRanges` untuk bulan/tahun berjalan dan lampau, pemotongan 31 → 30, 29 Feb, batas 2000-01 (pembanding di luar rentang menghasilkan range kosong, totals 0).
  - `dashboard-format.spec.ts`: `percentChange`, `changeTone`, `topCategories`, `sumBalances`.
  - `cache-invalidation.spec.ts` (tambah kasus): mutasi transaksi me-revalidate key `/api/dashboard?…`, mutasi akun dan kategori tidak.
- **API (`tests/api/`, Supabase sungguhan, user `test-<uuid>`):**
  - `dashboard.spec.ts`: skenario totals, pembanding period-to-date, bucket aktivitas, kategori terarsip, invarian terhadap `transactionTotals` dan `budgetUsage`, validasi `period`, isolasi A/B, 401.
- **E2E:** tetap ditunda (SPEC.md Open question #2).

## Struktur file

```
app/api/dashboard/route.ts
app/(app)/dashboard/page.tsx              # ganti placeholder
components/dashboard/                     # dashboard-view, balance-card, summary-cards, expense-activity-chart, category-donut, budget-summary
components/ui/chart.tsx                   # lewat shadcn CLI
hooks/use-dashboard.ts
lib/schemas/dashboard.ts, lib/dashboard-period.ts, lib/dashboard-format.ts
lib/cache-invalidation.ts                 # resource dashboard
lib/server/queries/dashboard-summary.ts
tests/unit/*.spec.ts, tests/api/dashboard.spec.ts
```

Perintah, gaya kode, dan format error mengikuti [SPEC.md](SPEC.md). Menjalankan satu berkas tes: `pnpm vitest run tests/api/dashboard.spec.ts`.

## Boundaries (khusus modul ini)

- **Always:** hitung total, aktivitas, dan kategori di DB lewat `transactionWhere` / query baru yang memfilter `userId`, hitung rentang dari string periode (bukan `Date` lokal), satu `percentChange` untuk semua kartu, beri setiap grafik alternatif teks, daftarkan key dashboard di `cache-invalidation.ts` (bukan di tiap mutasi).
- **Ask first:** dependency grafik selain shadcn chart/Recharts, index baru, materialized view atau cache server untuk ringkasan, widget di luar daftar ini (transaksi terakhir, net worth historis), mengubah aturan pembanding (keputusan #4).
- **Never:** menjumlahkan baris transaksi di client, menyalin data dashboard ke Zustand, memakai server action, menerima `userId` dari query, mengedit `components/ui/chart.tsx` manual.

## Risiko

- **Ukuran bundle Recharts:** bisa melewati 200 KB first load. Mitigasi: `next/dynamic` untuk komponen grafik, diukur saat build. Jika tetap terlalu besar, itu Ask first (alternatif SVG tulisan tangan).
- **Recharts + `@base-ui/react` / React 19:** pastikan versi Recharts yang dipasang shadcn CLI kompatibel dengan React 19.3. Cek setelah `shadcn add chart`, sebelum menulis komponen.
- **Zona waktu bucket:** `generate_series` atas `date` dan `to_char` di SQL, label diformat dengan `timeZone: "UTC"`. Batas bulan dan tahun kabisat dites.
- **"Hari ini" di server vs client:** periode berjalan dipotong di `todayInJakarta()` server. Saat lewat tengah malam dengan tab terbuka, SWR revalidasi berikutnya menggeser rentang. Diterima.
- **Persen menyesatkan untuk nilai kecil:** 1.000 → 50.000 tampil "naik 4.900%". Diterima untuk MVP, nominal pembanding tetap tertulis di teks bantuan.
- **Revalidasi lintas modul:** lupa `dashboard` di `AFFECTS.transactions` membuat dashboard basi setelah mencatat transaksi. Dites di `cache-invalidation.spec.ts`.
- **`cacheComponents`:** `useSearchParams` di `/dashboard` wajib di dalam `<Suspense>`. `/dashboard` adalah `start_url` PWA dan tujuan login, jadi shell harus cepat tampil. Baca `node_modules/next/dist/docs/` sebelum menulis page.

## Open questions

1. **Pembanding period-to-date** (keputusan #4): setuju, atau bandingkan dengan periode lalu penuh?
2. **Kartu keempat = Sisa** (`income − expense − saving`, keputusan #3): setuju, atau cukup tiga kartu?
3. **Mode tahun di dashboard** (keputusan #1): perlu, atau dashboard cukup per bulan saja (lebih sederhana: Budget Summary selalu tampil, aktivitas selalu per hari)?
4. **Donut per kategori, top 5 + Lainnya** (keputusan #8): setuju, atau per grup Needs / Wants?
5. ~~**`stores/period.ts` (`usePeriodStore`) tidak dipakai modul mana pun** setelah keputusan #1. Hapus di modul ini (dan perbarui Project structure di SPEC.md), atau biarkan?~~ Dihapus di T90 (2026-10-29).
6. **Transaksi terakhir di dashboard** (di luar cakupan): perlu 5 transaksi terakhir dengan tautan "Lihat semua"?
