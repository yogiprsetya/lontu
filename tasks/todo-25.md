# Todo phase 25: Modul Period

Plan: [plan-25.md](plan-25.md) · Index: [plan.md](plan.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task yang menyentuh komponen juga butuh `pnpm build` dan cek manual di 360×800 dan 1024. Jumlah tes tidak boleh turun.

---

### T90: Pindahkan fungsi periode ke `lib/period.ts`

**Description:** Perbarui spec dulu: `SPEC-transactions.md` (daftar fungsi `lib/transaction-filters.ts`) dan `SPEC-dashboard.md` (rujukan `periodToRange`/`shiftPeriod`) menunjuk `lib/period.ts`. Lalu buat `lib/period.ts` dan pindahkan apa adanya dari `lib/transaction-filters.ts`: `Period`, `PeriodMode`, `periodMode`, `isPeriod`, `MIN_YEAR`, `periodToRange`, `shiftPeriod`, `switchPeriodMode`, `formatPeriodLabel`. Pindahkan juga `periodToYearMonth`, `yearMonthToPeriod`, `monthRange` dari `lib/schemas/budget.ts`. Ganti import di semua pemanggil (±15 berkas: `lib/server/budgets.ts`, `lib/server/queries/budget-history.ts`, `app/api/budgets/suggestion/route.ts`, `lib/dashboard-period.ts`, `lib/dashboard-format.ts`, `lib/schemas/budget.ts`, `components/transactions/period-stepper.tsx`, `components/budgets/*`, `components/dashboard/*`). Pindahkan blok tes yang terkait dari `transaction-filters.spec.ts` (dan `budget-schema.spec.ts` bila ada) ke `tests/unit/period.spec.ts` tanpa mengubah assertion. Isi fungsi tidak berubah.

**Acceptance criteria:**

- [x] `lib/period.ts` tidak mengimpor apa pun dari `lib/transaction-filters.ts`, `lib/schemas/*`, atau `lib/server/*`
- [x] Tidak ada berkas di `lib/server/`, `lib/schemas/`, `app/api/`, `components/budgets/`, `components/dashboard/` yang mengimpor `lib/transaction-filters.ts` untuk fungsi periode. Tidak ada re-export dari lokasi lama
- [x] Jumlah tes sama dengan sebelum task; assertion yang dipindah identik (diff hanya import dan nama berkas)

**Verification:**

- [x] `pnpm vitest run tests/unit/period.spec.ts tests/unit/transaction-filters.spec.ts tests/unit/dashboard-period.spec.ts tests/unit/budget-schema.spec.ts` hijau
- [x] `pnpm typecheck && pnpm build` hijau

**Catatan (2026-10-29):** `stores/period.ts` dan `period-store.spec.ts` dihapus atas persetujuan Yogi (Open question #1), jadi jumlah tes turun 3 (1084 → 1081); tes yang dipindah tetap utuh. `isPeriod` kini diekspor karena `parseFilters` memakainya dari modul lain.

**Dependencies:** None

**Files likely touched:** `lib/period.ts`, `lib/transaction-filters.ts`, `lib/schemas/budget.ts`, `tests/unit/period.spec.ts`, `tests/unit/transaction-filters.spec.ts`, plus import di ±12 pemanggil, `SPEC-transactions.md`, `SPEC-dashboard.md`

**Estimated scope:** M (logika: 2 berkas; sisanya baris import)

---

### T91: Satu parse `?period=` untuk tiga halaman

**Description:** "Nilai URL → periode valid, selain itu bulan berjalan" ada 3×: `budgetPeriodFromParam` (`lib/budget-format.ts:14`), `dashboardPeriodFromParam` (`lib/dashboard-period.ts:15`), dan bagian periode di `parseFilters` (`lib/transaction-filters.ts:43`). Ganti dengan `parsePeriod(value, { modes, today, min?, max? })` di `lib/period.ts`. Tiap pemanggil menyatakan aturannya: transaksi `modes: ["month","year","all"]`; budget `modes: ["month"]`, `max: maxBudgetPeriod(today)`; dashboard `modes: ["month","year"]`, `max: today`. Tes merah dulu untuk ketiga konfigurasi, dengan kasus dari spec tiap fungsi lama.

**Acceptance criteria:**

- [x] Ketiga fungsi lama hilang atau hanya memanggil `parsePeriod` satu baris; tes lama untuk ketiganya tetap hijau tanpa diubah selain import
- [x] `parsePeriod` menolak `1999`, `1999-12`, `2026-13`, bulan depan untuk dashboard, dan bulan setelah `maxBudgetPeriod` untuk budget, semuanya jatuh ke `today.slice(0, 7)`
- [x] Cek inline "tidak lewat hari ini" di `components/transactions/period-stepper.tsx:46-47` memakai `isPastOrCurrentPeriod`

**Verification:**

- [x] `pnpm vitest run tests/unit/period.spec.ts tests/unit/budget-format.spec.ts tests/unit/dashboard-period.spec.ts tests/unit/transaction-filters.spec.ts` hijau
- [ ] Manual (tertunda, sesi tanpa browser; kasusnya tercakup `period.spec.ts`): `/budget?period=1999-01`, `/dashboard?period=2099`, `/transactions?period=abc` jatuh ke bulan berjalan

**Catatan (2026-10-29):** `budgetPeriodFromParam` dan `dashboardPeriodFromParam` tetap ada sebagai pembungkus satu baris supaya aturan tiap halaman punya nama. `isPastOrCurrentPeriod` pindah dari `lib/schemas/dashboard.ts` ke `lib/period.ts` dan kini juga memeriksa format.

**Dependencies:** T90

**Files likely touched:** `lib/period.ts`, `lib/budget-format.ts`, `lib/dashboard-period.ts`, `lib/transaction-filters.ts`, `components/transactions/period-stepper.tsx`, `tests/unit/period.spec.ts`

**Estimated scope:** M

---

### T92: Satu aturan batas 2000 dan satu tipe Period

**Description:** `previousPeriod` (`lib/dashboard-period.ts:20-26`) menyalin aritmetika indeks bulan `shiftPeriod` karena batas 2000. Pindahkan `previousPeriod` ke `lib/period.ts` dan buat `shiftPeriod` serta `previousPeriod` memakai satu fungsi indeks bulan internal; batas hanya diterapkan oleh `shiftPeriod`. Satukan konstanta batas (`MIN_YEAR`, `MIN_BUDGET_PERIOD`, literal `"2000"` di `isPastOrCurrentPeriod`) menjadi `MIN_PERIOD_YEAR`. `BudgetPeriod` dan `DashboardPeriod` menjadi alias subset dari `Period`. Komentar di `budget-history.ts:10` menunjuk dokumentasi `shiftPeriod`, bukan menjelaskan ulang.

**Acceptance criteria:**

- [x] Hanya satu implementasi aritmetika indeks bulan di repo (`grep -rn "\* 12" lib` hanya di `lib/period.ts`)
- [x] Hanya satu sumber nilai 2000: `MIN_PERIOD_YEAR`, dipakai schema budget, schema dashboard, dan `isPeriod`
- [x] Tes batas yang ada hijau tanpa diubah: Januari 2000 tetap punya pembanding Desember 1999 di dashboard, `shiftPeriod("2000-01", -1)` tetap `"2000-01"`, `historyWindow("2000-01")` tetap `null`, salin budget ke 2000-01 tetap `copied: 0`

**Verification:**

- [x] `pnpm vitest run tests/unit/period.spec.ts tests/unit/dashboard-period.spec.ts tests/unit/budget-schema.spec.ts tests/unit/dashboard-schema.spec.ts tests/api/budget-copy.spec.ts tests/api/budget-suggestion.spec.ts tests/api/dashboard.spec.ts` hijau

**Catatan (2026-10-29):** `MonthPeriod` dan `MonthOrYearPeriod` tetap alias `string` (tanpa template literal type) supaya tidak ada pemanggil yang perlu cast. Pesan validasi "Januari 2000" / "tahun 2000" tetap literal karena itu teks UI.

**Dependencies:** T90

**Files likely touched:** `lib/period.ts`, `lib/dashboard-period.ts`, `lib/schemas/budget.ts`, `lib/schemas/dashboard.ts`, `lib/server/queries/budget-history.ts`

**Estimated scope:** M

---

### T93: Aritmetika hari kalender masuk modul Period

**Description:** Hari terakhir bulan ada di `periodToRange` dan `clampDay` (`lib/recurring-schedule.ts:14`). `DAY_MS` + parse UTC tengah malam ada di `lib/transaction-format.ts:15-18` (`dayBefore`) dan `recurring-schedule.ts:31-35` (`daysBetween`). Pindahkan `clampDay`, `daysBetween`, dan `lastDayOfMonth` + `addDays` baru ke `lib/period.ts`; `periodToRange` memakai `lastDayOfMonth`, `dayBefore` memakai `addDays(date, -1)`. `advanceDate` dan `firstDueOnOrAfter` tetap di `recurring-schedule.ts` (aturan jadwal recurring) dan mengimpor dari `lib/period.ts`. Perbarui `SPEC-recurring.md` § Fungsi murni.

**Acceptance criteria:**

- [ ] `DAY_MS` dan `Date.UTC(…, 0)` masing-masing hanya muncul di `lib/period.ts`
- [ ] Tes `clampDay`/`daysBetween` dipindah dari `recurring-schedule.spec.ts` ke `period.spec.ts` tanpa diubah; tes `advanceDate`, `firstDueOnOrAfter`, `paydayForecast`, `formatDateHeading` hijau tanpa diubah

**Verification:**

- [ ] `pnpm vitest run tests/unit/period.spec.ts tests/unit/recurring-schedule.spec.ts tests/unit/payday-forecast.spec.ts tests/unit/transaction-format.spec.ts tests/unit/recurring-format.spec.ts` hijau

**Dependencies:** T90

**Files likely touched:** `lib/period.ts`, `lib/recurring-schedule.ts`, `lib/transaction-format.ts`, `lib/recurring-format.ts`, `lib/payday-forecast.ts`, `tests/unit/period.spec.ts`, `tests/unit/recurring-schedule.spec.ts`

**Estimated scope:** S

---

## Checkpoint X

Lihat [plan-25.md](plan-25.md) § Checkpoint X.
