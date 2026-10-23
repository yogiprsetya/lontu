# Spec module: `budgets`

Status: draft · 2026-10-23 · @Yogi
Bergantung pada: `accounts-categories`, `transactions` · Dipakai oleh: `dashboard`, `pwa-offline` · Indeks: [SPEC.md](SPEC.md)

## Objective

Pengguna menetapkan batas pengeluaran bulanan per kategori spending, melihat berapa yang sudah terpakai dan sisanya, dan tahu kategori mana yang hampir habis sebelum akhir bulan. Menyiapkan bulan baru cukup satu tap: salin dari bulan lalu, atau terapkan saran 50/30/20 dari income.

Modul ini pemilik **kontrak** `/api/budgets*`, query `budgetUsage`, dan hook SWR-nya. `dashboard` memakai `budgetUsage` untuk kartu Budget Summary.

Di luar cakupan: budget untuk kategori income atau saving, budget tahunan atau mingguan, rollover sisa budget ke bulan berikutnya, notifikasi push, budget per akun, prediksi laju belanja (pace).

## Keputusan

Nomor 1–4 diputuskan Yogi pada 2026-10-23. Sisanya usulan untuk direview.

1. **Hanya kategori `kind = spending`** yang bisa diberi budget, dikelompokkan Needs / Wants. Saving tetap tampil sebagai angka total, tanpa target.
2. **Hapus = soft delete** lewat kolom baru `budgets.deleted_at` (lihat [Perubahan skema](#perubahan-skema)), dengan "Urungkan" di toast seperti transaksi.
3. **Salin dari bulan lalu hanya mengisi yang kosong.** Kategori yang sudah punya budget aktif di bulan tujuan tidak disentuh. Aman ditekan dua kali.
4. **Saran 50/30/20 mengisi nominal otomatis** per kategori (algoritma di [Saran 50/30/20](#saran-503020)). Pengguna melihat pratinjau, memilih baris, lalu menerapkannya.
5. **Set budget = upsert pada kunci `(kategori, bulan)`**, bukan create + edit per id. `PUT` yang sama dua kali menghasilkan keadaan yang sama, jadi `pwa-offline` bisa memutar ulang antrean tanpa id dari client. Baris yang sudah di-soft-delete dihidupkan lagi oleh upsert, sehingga index unik yang ada tetap penuh (tidak parsial).
6. **Periode = `YYYY-MM`, dari 2000-01 sampai bulan depan (Asia/Jakarta).** Bulan depan diizinkan supaya budget bisa disiapkan di akhir bulan. Periode hidup di URL (`/budget?period=2026-10`), tidak di `usePeriodStore`, sama dengan keputusan #10 transactions.
7. **Terpakai = `sum(amount)` transaksi `expense` tak terhapus** dengan `date` di bulan itu. Transfer, adjustment, dan saving tidak dihitung. Biaya admin transfer adalah expense biasa, jadi ikut terhitung.
8. **Status per kategori:** `none` (tanpa budget), `ok` (< 80%), `warning` (≥ 80% dan ≤ 100%), `over` (> 100%, atau budget 0 dengan pengeluaran > 0). Dihitung oleh satu fungsi murni yang dipakai server dan client.
9. **`amount` budget 0..1e12.** Budget 0 berarti "jangan belanja di kategori ini", bukan "tanpa budget".
10. **Arsip kategori tidak menyentuh budget-nya.** Kategori terarsip tidak bisa diberi budget baru dan dilewati saat salin atau saran, tetapi budget lama dan pengeluarannya tetap tampil dengan label "(arsip)".
11. **Respons memakai id, nama di-resolve di client** dari `useCategories({ includeArchived: true })`, sama dengan keputusan #8 transactions. `spendingType` ikut di respons karena pengelompokan dihitung di server.

## Perubahan skema

Disetujui lewat keputusan #2. Migrasi baru hanya **menambah** kolom, tidak mengubah atau menghapus kolom.

| Objek | Sebelum | Sesudah |
|---|---|---|
| `budgets.deleted_at` | tidak ada | `timestamptz null` |
| `budgets_user_category_period_unique` | `(user_id, category_id, year, month)` | tidak berubah (keputusan #5) |

Tidak ada index baru. Query usage membaca `transactions` per user dan rentang tanggal, dan skala pribadi tidak membutuhkan index tambahan. Jika `EXPLAIN` menunjukkan perlu, itu Ask first.

## Kontrak API

Semua route memakai `withAuth`, memfilter `user_id` dari session, dan format error dari `lib/api/errors.ts`. Id di path yang bukan UUID, tidak ada, atau milik user lain → **404 `BUDGET_NOT_FOUND`**.

### Tipe

```ts
// lib/schemas/budget.ts (dipakai client & server)
type BudgetPeriod = string; // YYYY-MM

type Budget = {
  id: string;
  categoryId: string;
  period: BudgetPeriod; // dari kolom year + month
  amount: number; // integer rupiah, 0..1e12
  createdAt: string;
  deletedAt: string | null;
};

type BudgetStatus = "none" | "ok" | "warning" | "over";

type BudgetUsageItem = {
  categoryId: string;
  spendingType: "needs" | "wants";
  budgetId: string | null;
  budget: number | null; // null = tanpa budget aktif
  spent: number;
  remaining: number | null; // budget − spent, boleh negatif
  percent: number | null; // floor(spent * 100 / budget), null jika budget null atau 0
  status: BudgetStatus;
};

type BudgetGroup = {
  budget: number; // jumlah budget aktif
  spent: number; // semua expense di grup, termasuk kategori tanpa budget
  unbudgetedSpent: number; // bagian dari spent yang kategorinya tanpa budget
};

type BudgetUsage = {
  period: BudgetPeriod;
  items: BudgetUsageItem[];
  summary: { needs: BudgetGroup; wants: BudgetGroup; total: BudgetGroup };
};

type BudgetSuggestion = {
  period: BudgetPeriod;
  basis: number; // income yang dipakai sebagai dasar
  basisSource: "previous_month" | "input";
  pools: { needs: number; wants: number; saving: number }; // 50 / 30 / 20
  items: { categoryId: string; spendingType: "needs" | "wants"; amount: number; current: number | null }[];
};
```

### Route

| Method & path | Body / query | Sukses | Error |
|---|---|---|---|
| `GET /api/budgets` | `?period=YYYY-MM` (wajib) | 200 `BudgetUsage` | 400 `VALIDATION_ERROR` |
| `PUT /api/budgets` | `{ period, items: [{ categoryId, amount }] }` | 200 `Budget[]` (urutan sama dengan `items`) | 400 |
| `DELETE /api/budgets/[id]` | — | 200 `Budget` (`deletedAt` terisi). Idempoten | 404 |
| `POST /api/budgets/[id]/restore` | — | 200 `Budget` (aktif). Idempoten | 404 |
| `POST /api/budgets/copy` | `{ to: YYYY-MM }` | 200 `{ copied: number }` | 400 |
| `GET /api/budgets/suggestion` | `?period=YYYY-MM&income=<int>` (`income` opsional) | 200 `BudgetSuggestion` | 400 |

**`PUT`:** `items` 1–100, `categoryId` unik di dalam `items`. Setiap `categoryId` harus milik user, aktif, dan `kind = spending`. Jika satu item gagal, tidak ada yang ditulis (semua cek selesai sebelum insert, lalu satu statement `insert … on conflict (user_id, category_id, year, month) do update set amount = excluded.amount, deleted_at = null`). `created_at` baris lama tetap.

**`DELETE` / `restore`** melihat baris terhapus. `restore` pada budget yang kategorinya sudah diarsipkan tetap diizinkan (budget lama, keputusan #10).

**`copy`:** sumber = bulan sebelum `to`. Menyalin budget aktif sumber yang kategorinya aktif ke `to`, hanya untuk kategori yang belum punya budget **aktif** di `to` (budget terhapus di `to` dihidupkan lagi dengan nominal sumber). `copied` = jumlah baris yang ditulis. Sumber kosong → 200 `{ copied: 0 }`.

**`suggestion`:** hanya membaca, tidak menulis apa pun. Penerapan memakai `PUT`.

### Validasi (Zod, `lib/schemas/budget.ts`)

- `period`: regex `^\d{4}-(0[1-9]|1[0-2])$`, lalu cek rentang keputusan #6 dengan `todayInJakarta()` saat parse.
- `amount`: `z.int()`, 0..1e12. `income` (query): `z.coerce.number().int()`, 0..1e12.
- `items`: `z.array(z.strictObject({ categoryId: z.uuid(), amount })).min(1).max(100)`, refine `categoryId` unik.
- Body memakai `z.strictObject`. Field tak dikenal (termasuk `userId`) → 400.
- Kategori asing, tidak ada, terarsip, atau bukan spending → 400 `fieldError("items", "Kategori tidak valid")`. Pesannya sama untuk semua kasus supaya tidak membocorkan data user lain.

### Query `budgetUsage`

`lib/server/queries/budget-usage.ts`, satu query SQL:

- Baris = kategori spending milik user yang **aktif**, ditambah kategori terarsip yang punya budget aktif atau pengeluaran di bulan itu.
- Left join budget aktif bulan itu, dan subquery `sum(amount)` expense tak terhapus per `category_id` dengan `date between awal and akhir bulan`.
- Urut `spending_type` (needs, wants), lalu `lower(name)`.
- `remaining`, `percent`, `status` dihitung di TS dari baris yang sudah teragregasi, memakai `budgetStatus()` dari `lib/budget-status.ts`. Ini bukan agregasi baris transaksi di client.
- `summary` dijumlahkan dari `items` (puluhan baris).

**Invarian:** `summary.total.spent` sama dengan `transactionTotals(userId, { from, to }).expense` untuk bulan yang sama. Dites.

### Saran 50/30/20

Data dari DB (`lib/server/queries/budget-history.ts`), pembagian di fungsi murni `suggestBudgets()` (`lib/budget-suggestion.ts`):

1. **Dasar:** `income` dari query jika ada (`basisSource = "input"`), selain itu total income bulan sebelum `period` (`"previous_month"`). Bulan berjalan tidak dipakai karena income-nya belum lengkap.
2. **Pool:** `needs = floor(basis × 0,5)`, `wants = floor(basis × 0,3)`, `saving = basis − needs − wants`. Pool saving hanya ditampilkan sebagai acuan (keputusan #1).
3. **Bobot:** rata-rata expense per kategori spending aktif selama 3 bulan penuh sebelum `period`. Jika semua bobot dalam satu grup 0, pool dibagi rata ke kategori grup itu.
4. **Pembulatan:** satuan Rp1.000. Pool dibulatkan ke bawah ke kelipatan 1.000, lalu dibagi dengan metode sisa terbesar (largest remainder), seri diputus berdasarkan `categoryId`. Jumlah `items` per grup = pool grup yang sudah dibulatkan.
5. `current` = budget aktif kategori itu di `period`, supaya UI bisa menandai baris yang akan ditimpa.
6. `basis = 0` → `items` kosong. Grup tanpa kategori aktif → tidak ada item untuk grup itu.

### Kontrak untuk modul lain

- **`dashboard`:** pakai `useBudgets(period)` (key `"/api/budgets?period=YYYY-MM"`), jadi cache dibagi dengan halaman Budget. Server component yang butuh data langsung memanggil `budgetUsage(userId, period)`. Tautan dari Budget Summary ke daftar: `/transactions?period=YYYY-MM&type=expense&categoryId=<uuid>`.
- **Revalidasi:** `revalidateBudgets()` me-revalidate semua key berawalan `/api/budgets`. Matcher ini ditambahkan di `revalidateTransactions()` (sesuai kontrak transactions), dan dipanggil juga oleh mutasi kategori (`archive`, `restore`) karena baris usage bergantung pada status kategori.
- **`pwa-offline`:** `PUT /api/budgets` sudah idempoten (keputusan #5). `DELETE`/`restore` idempoten.

## Deliverables

### 1. Server

- Migrasi `budgets.deleted_at` di `db/schema.ts` dan `drizzle/` (`pnpm db:generate`).
- `lib/schemas/budget.ts`: tipe, `budgetPeriodSchema`, `budgetSetSchema`, `budgetCopySchema`, `budgetSuggestionQuerySchema`, `periodToYearMonth` / `yearMonthToPeriod`.
- `lib/budget-status.ts` (murni): `budgetStatus(budget, spent)` → `{ remaining, percent, status }`.
- `lib/budget-suggestion.ts` (murni): `suggestBudgets({ basis, categories, history, current })`.
- `lib/server/budgets.ts`: `setBudgets`, `softDeleteBudget`, `restoreBudget`, `copyBudgets`.
- `lib/server/queries/budget-usage.ts`: `budgetUsage(userId, period)`. `lib/server/queries/budget-history.ts`: income bulan sebelumnya dan expense 3 bulan per kategori.
- `lib/api/errors.ts`: `budgetNotFound()`.
- Route: `app/api/budgets/route.ts`, `[id]/route.ts`, `[id]/restore/route.ts`, `copy/route.ts`, `suggestion/route.ts`.

### 2. Client

- `hooks/use-budgets.ts`: `useBudgets(period)`, `useBudgetSuggestion(period, income?)` (hanya fetch saat panel saran dibuka), `revalidateBudgets()`, mutasi `setBudgets`, `deleteBudget` (optimistic: `budget` di item dikosongkan, rollback + revalidasi jika gagal), `restoreBudget`, `copyBudgets`. Mutasi melempar `ApiError`.
- Tambah matcher `/api/budgets` di `revalidateTransactions()`, dan panggil `revalidateBudgets()` di mutasi arsip/pulihkan kategori.
- Tidak ada data budget di Zustand. Form budget dibuka dengan state lokal halaman (`categoryId` saja).

### 3. UI

- **`app/(app)/budget/page.tsx`** menggantikan placeholder, dibungkus `<Suspense>` karena memakai `useSearchParams`. Isi di `components/budgets/budget-view.tsx`.
  - **Header:** stepper bulan (mode bulan saja, maks bulan depan), periode ditulis ke URL lewat `router.replace`.
  - **Ringkasan:** kartu Total, Needs, Wants. Masing-masing: terpakai dari budget, sisa, progress bar, dan "Rp… tanpa budget" jika `unbudgetedSpent > 0`. `hideAmounts` menyamarkan nominal.
  - **Daftar** dikelompokkan Needs / Wants. Baris: nama kategori (+ "(arsip)"), "Rp terpakai dari Rp budget · 85%", sisa atau "Lebih Rp…", progress bar. Warna: `--budget` untuk `warning`, `--expense` untuk `over`. Status juga tertulis sebagai teks ("Hampir habis", "Melebihi budget"), tidak hanya lewat warna. Kategori tanpa budget menampilkan tombol "Atur budget".
  - Tap baris → `components/forms/budget-form.tsx` di `ResponsiveModal`: `MoneyInput` (tanpa tombol ±), Simpan, dan "Hapus budget" untuk budget yang ada. Hapus → toast "Budget dihapus · Urungkan" (6 detik).
  - Tombol "Lihat transaksi" di form → `/transactions?period=…&type=expense&categoryId=…`.
  - **Aksi bulan:** menu dengan "Salin dari {bulan lalu}" (toast "{n} budget disalin" atau "Bulan lalu belum punya budget") dan "Saran 50/30/20".
  - **Panel saran** (`components/budgets/suggestion-panel.tsx`, `ResponsiveModal`): field income dasar (default dari server, bisa diubah, refetch dengan debounce), pool Needs / Wants / Saving, daftar kategori dengan nominal saran, checkbox per baris (default: tercentang untuk kategori tanpa budget, tidak tercentang untuk yang akan ditimpa, ditandai "Ganti Rp…"). "Terapkan" → satu `PUT` berisi baris tercentang.
  - Empty state: tanpa kategori spending aktif → tombol "Tambah kategori" (`open("manageCategories", { kind: "spending" })`). Bulan tanpa budget → CTA salin dan saran di tengah layar. Skeleton saat memuat, error SWR dengan "Coba lagi".
- Mobile: target sentuh ≥ 44×44 px, input 16 px, tanpa horizontal scroll di 360 px, kontras ≥ 4.5:1. Progress bar memakai `role="progressbar"` dengan `aria-valuenow` (dibatasi 100) dan label teks.

## Acceptance criteria

**API**

- [ ] `PUT { period: "2026-10", items: [{ categoryId: <Makan>, amount: 1500000 }] }` → 200, `GET ?period=2026-10` memuat item Makan `budget = 1500000`. `PUT` kedua dengan 1.200.000 → id sama, `amount` berubah, tidak ada baris baru.
- [ ] Dengan expense 1.300.000 di Makan bulan itu (termasuk satu biaya admin transfer): `spent = 1300000`, `remaining = 200000`, `percent = 86`, `status = "warning"`. Expense di bulan lain, expense terhapus, transfer, saving, dan adjustment tidak ikut.
- [ ] Status: 79% → `ok`, 80% → `warning`, 100% → `warning`, 101% → `over`, budget 0 + spent 0 → `ok`, budget 0 + spent > 0 → `over`, tanpa budget → `none`.
- [ ] `summary.total.spent` sama dengan `GET /api/transactions/totals?from=…&to=…` `expense` untuk bulan yang sama, termasuk pengeluaran di kategori tanpa budget dan kategori terarsip. `unbudgetedSpent` benar per grup.
- [ ] Kategori terarsip dengan budget atau pengeluaran di bulan itu tetap muncul. Kategori terarsip tanpa keduanya tidak muncul.
- [ ] `PUT` dengan kategori income/saving, terarsip, milik user lain, atau tidak ada → 400 `fields.items`, dan **tidak ada baris** yang tertulis, termasuk untuk item lain yang valid. `categoryId` ganda, `items` kosong atau > 100, `amount` −1, 1.5, `"100"`, atau > 1e12 → 400. `period` `2026-13`, `1999-12`, atau dua bulan ke depan → 400 `fields.period`. Bulan depan → 200.
- [ ] `DELETE` mengisi `deleted_at`, item usage kembali `budget = null`, `status = "none"`. `restore` mengembalikannya. Keduanya idempoten. `PUT` pada kategori + bulan yang budget-nya terhapus menghidupkan baris yang sama dengan nominal baru.
- [ ] `copy { to: "2026-11" }` dengan Oktober berisi Makan, Hiburan, dan satu kategori terarsip, dan November sudah berisi Makan → `copied = 1` (Hiburan saja), Makan November tidak berubah, kategori terarsip dilewati. Diulang → `copied = 0`. Oktober kosong → `copied = 0`.
- [ ] `suggestion` dengan income bulan lalu 10.000.000 → `basis = 10000000`, `pools = { needs: 5000000, wants: 3000000, saving: 2000000 }`, jumlah item needs = 5.000.000 dan wants = 3.000.000, semua kelipatan 1.000, proporsional dengan riwayat 3 bulan. `income=7777777` → `basisSource = "input"`, pool dibulatkan ke 1.000. Tanpa income → `items` kosong. `suggestion` tidak menulis baris apa pun.
- [ ] **Isolasi:** user B mendapat 404 untuk `DELETE`/`restore` budget A, `GET`/`suggestion` B tidak pernah memuat budget, kategori, atau pengeluaran A, `copy` B tidak menyalin budget A, dan B tidak bisa `PUT` ke kategori A.
- [ ] Tanpa session, semua route → 401 `UNAUTHORIZED`.

**UI (manual di 360 px dan 1024 px)**

- [ ] Bulan baru: "Salin dari September" mengisi daftar tanpa reload. "Saran 50/30/20" menampilkan pratinjau, baris yang akan menimpa tidak tercentang, "Terapkan" menulis hanya baris tercentang.
- [ ] Mencatat expense dari **+** lalu kembali ke `/budget` memperbarui terpakai dan status tanpa reload.
- [ ] Hapus budget → baris langsung kembali "Atur budget", "Urungkan" mengembalikannya. `DELETE` gagal mengembalikan baris dan menampilkan toast error.
- [ ] `/budget?period=2026-10` bertahan setelah refresh. Stepper tidak bisa melewati bulan depan.
- [ ] Status terbaca tanpa warna (teks "Hampir habis" / "Melebihi budget"), layout benar di 360 px, target sentuh ≥ 44 px, input 16 px.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Tes

- **Unit (`tests/unit/`):**
  - `budget-schema.spec.ts`: format dan rentang `period` (hari ini lewat fake timer, termasuk Desember → Januari tahun depan), `amount`, `items` unik/batas, `strictObject`.
  - `budget-status.spec.ts`: batas 80% dan 100%, budget 0, `percent` dibulatkan ke bawah.
  - `budget-suggestion.spec.ts`: pool 50/30/20, sisa terbesar dengan jumlah tepat, seri deterministik, bobot nol → bagi rata, basis 0, grup kosong.
  - `use-budgets.spec.ts`: key, matcher `revalidateBudgets` dari `revalidateTransactions`, optimistic delete dan rollback.
- **API (`tests/api/`, Supabase sungguhan, user `test-<uuid>`):**
  - `budgets.spec.ts`: upsert, soft delete/restore, hidup lagi lewat `PUT`, validasi kategori (atomik), 404 untuk id bukan UUID, isolasi A/B, 401.
  - `budget-usage.spec.ts`: terpakai per kategori, batas tanggal awal/akhir bulan, kategori terarsip, invarian terhadap `transactionTotals`.
  - `budget-copy.spec.ts` dan `budget-suggestion.spec.ts`: skenario di Acceptance criteria.
- **E2E:** tetap ditunda (SPEC.md Open question #2).

## Struktur file

```
app/api/budgets/{route.ts, copy/route.ts, suggestion/route.ts, [id]/route.ts, [id]/restore/route.ts}
app/(app)/budget/page.tsx                 # ganti placeholder
components/budgets/                       # budget-view, budget-summary, budget-row, suggestion-panel, month-actions
components/forms/budget-form.tsx
hooks/use-budgets.ts
lib/schemas/budget.ts, lib/budget-status.ts, lib/budget-suggestion.ts
lib/server/budgets.ts, lib/server/queries/{budget-usage.ts, budget-history.ts}
db/schema.ts, drizzle/<timestamp>_budget_deleted_at/
tests/unit/*.spec.ts, tests/api/*.spec.ts
```

Perintah, gaya kode, dan format error mengikuti [SPEC.md](SPEC.md). Menjalankan satu berkas tes: `pnpm vitest run tests/api/budgets.spec.ts`.

## Boundaries (khusus modul ini)

- **Always:** pakai `findOwnedCategory` (atau varian banyak id) untuk setiap `categoryId`, upsert pada kunci unik (bukan cek-lalu-insert), hitung terpakai di DB, satu `budgetStatus()` untuk server dan client, panggil `revalidateBudgets()` setelah setiap mutasi budget.
- **Ask first:** budget untuk saving/income, index parsial atau index baru, kolom selain `deleted_at` (mis. `updated_at`, `rollover`), mengubah ambang 80%, persentase 50/30/20 yang bisa diatur pengguna.
- **Never:** hard delete budget, menerima `userId` dari body, menghitung terpakai dari transaksi di client, menyalin budget ke Zustand, memakai server action, `suggestion` yang menulis data.

## Risiko

- **Zona waktu bulan:** batas bulan dihitung dari string `YYYY-MM` (`YYYY-MM-01` sampai hari terakhir), bukan `Date` lokal. Februari kabisat dites.
- **Saran dari data tipis:** pengguna baru tanpa riwayat mendapat pembagian rata, dan tanpa income bulan lalu mendapat saran kosong. Field income di panel menutup kasus ini.
- **Upsert menghidupkan budget terhapus:** salin bisa menghidupkan budget yang sengaja dihapus bulan ini. Diterima karena keputusan #3 menganggap budget terhapus sama dengan kosong. Toast menyebut jumlah yang disalin.
- **Revalidasi lintas modul:** lupa matcher `/api/budgets` di `revalidateTransactions()` membuat halaman Budget basi setelah mencatat expense. Dites di `use-budgets.spec.ts`.
- **`cacheComponents`:** `useSearchParams` di `/budget` wajib di dalam `<Suspense>`. Baca `node_modules/next/dist/docs/` sebelum menulis page.

## Open questions

1. ~~Kategori yang bisa diberi budget~~ **Diputuskan:** spending saja (keputusan 1).
2. ~~Hapus budget~~ **Diputuskan:** soft delete dengan kolom `deleted_at` (keputusan 2).
3. ~~Salin dari bulan lalu~~ **Diputuskan:** hanya mengisi yang kosong (keputusan 3).
4. ~~Saran 50/30/20~~ **Diputuskan:** saran nominal otomatis (keputusan 4).
5. **Dasar saran = income bulan lalu, bobot = rata-rata 3 bulan:** setuju, atau pakai rata-rata income 3 bulan juga?
6. **Ambang `warning` 80%** (keputusan 8): setuju, atau bandingkan dengan hari berjalan di bulan itu (mis. 60% terpakai di tanggal 10 sudah peringatan)?
7. **Budget bulan depan diizinkan** (keputusan 6): setuju, atau batasi ke bulan berjalan dan sebelumnya?
