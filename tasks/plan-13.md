# Plan phase 13: Atur budget dan lihat pemakaian

Index: [plan.md](plan.md) · Todo: [todo-13.md](todo-13.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md) § Keputusan 1, 5–11, Perubahan skema, Kontrak API (`GET`, `PUT`), Query `budgetUsage`, Deliverables (halaman, form)

## Tujuan

Dari ponsel, pemilik membuka `/budget`, memilih bulan, mengatur budget per kategori spending, lalu melihat terpakai, sisa, dan status per kategori serta ringkasan Total/Needs/Wants. Mencatat expense dari **+** langsung menggeser angkanya tanpa reload.

## Task

- [x] T42: Migrasi `budgets.deleted_at`, schema Zod, `budgetStatus` (M)
- [x] T43: `GET /api/budgets` + query `budgetUsage` (M, risiko tinggi)
- [x] T44: `PUT /api/budgets` upsert atomik (M)
- [x] T45: `hooks/use-budgets.ts` + matcher revalidasi lintas modul (S)
- [x] T46: Halaman `/budget` (baca): stepper bulan, ringkasan, daftar (M)
- [x] T47: Form budget di `ResponsiveModal` (S)

Urutan: T42 dulu. T43 dan T44 bebas urutan (paralel boleh). T45 butuh T43 + T44. T46 butuh T45. T47 butuh T46.

## Keputusan

- **Migrasi lewat `pnpm db:generate`** setelah menambah `deletedAt: timestamp("deleted_at", { withTimezone: true })` di `db/schema.ts`. Hanya `ADD COLUMN`. Jika drizzle-kit mencoba mengubah objek lain (view, constraint), berhenti dan periksa snapshot.
- **`period` di API, `year`/`month` di DB.** `periodToYearMonth` / `yearMonthToPeriod` di `lib/schemas/budget.ts`, `monthRange(period)` → `{ from, to }` (`YYYY-MM-DD`) dari string, tanpa `Date` lokal.
- **`budgetUsage` satu query SQL** (CTE pengeluaran per kategori + left join budget aktif), lalu `budgetStatus()` per baris dan `summary` dijumlahkan di TS dari puluhan baris.
- **Upsert:** `insert … on conflict (user_id, category_id, year, month) do update set amount = excluded.amount, deleted_at = null`. Respons diurutkan sesuai `items`.
- **`GET` tanpa `period` → 400**, bukan default. Default bulan berjalan ditentukan di client dari URL.
- **Progress bar** = `components/budgets/budget-progress.tsx` (div + `role="progressbar"`, `aria-valuenow` dibatasi 100, `aria-valuetext` berisi teks status).

## Risiko

| Risiko                                                  | Dampak | Mitigasi                                                                                       |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Batas bulan / kategori terarsip salah di `budgetUsage`  | Tinggi | Tes merah lebih dulu di T43, termasuk invarian terhadap `transactionTotals`                    |
| drizzle-kit RC menghasilkan migrasi yang menyentuh view | Sedang | Baca `migration.sql` sebelum `db:migrate`. Hanya `ALTER TABLE "budgets" ADD COLUMN` yang boleh |
| Upsert menimpa `created_at`                             | Rendah | Kolom tidak ada di `set`. Dites                                                                |
| Halaman basi setelah catat expense                      | Sedang | Matcher dites di T45, dicek manual di checkpoint L                                             |

## Checkpoint L

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [x] Manual 360×800 dan 1024: atur budget Makan 1.500.000 → catat expense 1.300.000 → status "Hampir habis" 86% tanpa reload. Bulan lain kosong. Stepper berhenti di bulan depan
- [x] Kategori terarsip dengan pengeluaran bulan itu tampil dengan "(arsip)"
- [x] Review dengan Yogi
