# Plan phase 25: Modul Period

Index: [plan.md](plan.md) § Refactor arsitektur · Todo: [todo-25.md](todo-25.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md) § `lib/transaction-filters.ts`, [SPEC-dashboard.md](../SPEC-dashboard.md) § `lib/dashboard-period.ts`, [SPEC-budgets.md](../SPEC-budgets.md), [SPEC-recurring.md](../SPEC-recurring.md) § Fungsi murni

## Tujuan

Satu modul `lib/period.ts` memiliki konsep Period (`YYYY-MM`, `YYYY`, `all`) dan aritmetika tanggal kalender: parse, maju/mundur, rentang, label, batas 2000, hari terakhir bulan, selisih hari. Modul budgets, dashboard, recurring, dan server tidak lagi mengimpor modul filter URL transaksi. Salinan yang sekarang tidak sepakat soal batas 2000 hilang.

## Task

- [x] T90: Pindahkan fungsi periode ke `lib/period.ts` (M, banyak berkas tapi hanya import)
- [x] T91: Satu parse `?period=` untuk tiga halaman (S)
- [x] T92: Satu aturan batas 2000 dan satu tipe Period (M)
- [ ] T93: Aritmetika hari kalender masuk modul Period (S)

Urutan: T90 → (T91, T92, T93 boleh urutan apa pun).

## Keputusan

- **Interface modul** (nama final boleh berubah saat T90, dicatat di spec): `periodMode`, `isPeriod`, `parsePeriod(value, { modes, today, max? })`, `shiftPeriod` (berhenti di `MIN_PERIOD_YEAR`), `previousPeriod` (tanpa batas), `periodToRange`, `monthRange`, `periodToYearMonth`, `yearMonthToPeriod`, `isPastOrCurrentPeriod`, `formatPeriodLabel`, `switchPeriodMode`, `clampDay`, `lastDayOfMonth`, `addDays`, `daysBetween`.
- **Yang tetap di tempat asal:** filter URL (`parseFilters` tanpa logika periode, `filtersToSearchParams`, `normalizeFilters`, `exportFilename`) di `transaction-filters.ts`; aturan jadwal (`advanceDate`, `firstDueOnOrAfter`) di `recurring-schedule.ts`; aturan rentang dashboard (`dashboardRanges`) di `dashboard-period.ts`; Zod schema di `lib/schemas/*` (memakai konstanta dan fungsi dari `lib/period.ts`).
- **`BudgetPeriod` dan `DashboardPeriod` jadi alias dari subset `Period`** (`MonthPeriod`, `MonthOrYearPeriod`), bukan tiga `string` terpisah.
- **Satu formatter `Intl` per bentuk label** di modul Period. Formatter tanggal transaksi (`formatDateHeading`) dan dashboard (`formatRangeLabel`) tetap di modul format masing-masing karena itu tampilan domain, bukan aritmetika.

## Risiko

| Risiko                                                       | Dampak | Mitigasi                                                                                             |
| ------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------- |
| Batas 2000 berubah di salah satu pemanggil                   | Tinggi | Tes batas dipindah tanpa diubah; `budget-copy.spec.ts` dan `budget-suggestion.spec.ts` (API) tetap hijau tanpa diedit |
| Tanggal bergeser sehari karena zona lokal                    | Tinggi | Semua aritmetika tetap dari string `YYYY-MM-DD` / UTC; tes kabisat dan akhir bulan ikut pindah        |
| Diff T90 besar sulit direview                                | Sedang | T90 hanya memindah dan mengganti import, tanpa mengubah isi fungsi. Perubahan logika di T91–T93       |

## Checkpoint X

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; jumlah tes tidak turun dari sebelum T90
- [ ] `grep -rn "transaction-filters" lib/server lib/schemas lib/*-format.ts lib/dashboard-period.ts` kosong
- [ ] Hanya ada satu implementasi hari-terakhir-bulan, satu aritmetika indeks bulan, dan satu parse `?period=`
- [ ] Manual 360×800: stepper periode di `/transactions`, `/budget`, dan `/dashboard` maju/mundur sama seperti sebelumnya, termasuk berhenti di Januari 2000 dan di periode berjalan
- [ ] JS first load `/dashboard` tidak naik lebih dari 0,5 KB gzip (metode § Catatan ukuran)
- [ ] Review dengan Yogi sebelum phase 26
