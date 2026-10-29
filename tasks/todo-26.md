# Todo phase 26: Tampilan nominal

Plan: [plan-26.md](plan-26.md) · Index: [plan.md](plan.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, cek manual di 360×800 dan 1024 dengan `hideAmounts` aktif dan nonaktif, lalu satu commit conventional.

---

### T94: `useAmountFormat` + migrasi dashboard

**Description:** Perbarui `SPEC-foundation.md` (aturan nominal UI lewat `useAmountFormat`). Tambah `displayAmount` di `lib/money.ts` (tes merah dulu di `money.spec.ts`) dan `hooks/use-amount-format.ts`. Migrasikan `components/dashboard/{balance-card,summary-cards,category-breakdown,expense-activity,expense-activity-chart,budget-summary}.tsx`: ganti setiap `hideAmounts ? HIDDEN_AMOUNT : formatX(v)` dengan `amount(v, formatX)`.

**Acceptance criteria:**

- [x] `displayAmount(1500, true) === HIDDEN_AMOUNT`, `displayAmount(1500, false) === formatIDR(1500)`, `displayAmount(-2e6, false, abbreviateIDR) === abbreviateIDR(-2e6)`
- [x] Tidak ada berkas di `components/dashboard/` selain `hide-amounts-button.tsx` yang menyebut `hideAmounts` atau `HIDDEN_AMOUNT`
- [ ] Dashboard terlihat identik dengan sebelum task dalam kedua mode (bandingkan screenshot 360×800) (tertunda: sesi tanpa browser)

**Verification:**

- [x] `pnpm vitest run tests/unit/money.spec.ts tests/unit/dashboard-format.spec.ts` hijau
- [ ] Manual: semua butir SPEC-dashboard § `hideAmounts` (tertunda: sesi tanpa browser)

**Catatan (2026-10-29):** `useAmountsHidden()` ditambahkan di berkas hook yang sama untuk hal yang bukan teks (warna saldo negatif, sumbu Y dan tooltip grafik, `title` kartu ringkasan), supaya tampilannya tidak berubah. `ExpenseActivityChart` membaca hook itu sendiri, tidak lagi lewat prop.

**Dependencies:** Checkpoint X

**Files likely touched:** `lib/money.ts`, `hooks/use-amount-format.ts`, `tests/unit/money.spec.ts`, 6 berkas `components/dashboard/*`, `SPEC-foundation.md`

**Estimated scope:** M (per komponen 1–3 baris)

---

### T95: Migrasi budgets dan recurring

**Description:** Migrasikan `components/budgets/{budget-row,budget-summary,budget-view,suggestion-panel}.tsx` dan `components/recurring/{due-inbox,payday-card,recurring-view,rule-row}.tsx`. Hapus `formatBudgetAmount` (`lib/budget-format.ts:42`). Ubah `formatSchedule` dan `formatFree` (`lib/recurring-format.ts:20,42`) supaya tidak menerima flag `hideAmounts`; sesuaikan tesnya hanya di argumen, harapan tetap.

**Acceptance criteria:**

- [x] `lib/budget-format.ts` dan `lib/recurring-format.ts` tidak menyebut `hideAmounts` atau `HIDDEN_AMOUNT`
- [x] Tidak ada berkas di `components/budgets/` dan `components/recurring/` yang menyebut keduanya
- [x] Kasus tersembunyi di `budget-format.spec.ts` dan `recurring-format.spec.ts` tetap ada, dipindah ke `money.spec.ts` bila fungsinya hilang

**Verification:**

- [x] `pnpm vitest run tests/unit/budget-format.spec.ts tests/unit/recurring-format.spec.ts tests/unit/money.spec.ts` hijau
- [ ] Manual (tertunda: sesi tanpa browser): `/budget` (ringkasan, baris, panel saran), `/recurring` (baris aturan, kotak Jatuh tempo), kartu gajian

**Catatan (2026-10-29):** `formatSchedule` dan `formatFree` menerima formatter (default `formatIDR`); komponen memberi fungsi dari `useAmountFormat`. `formatBudgetAmount` tidak punya tes sendiri, jadi tidak ada kasus yang perlu dipindah. Prop `hideAmounts` di `BudgetRow`, `BudgetSummary`, dan `RuleRow` dihapus.

**Dependencies:** T94

**Files likely touched:** `lib/budget-format.ts`, `lib/recurring-format.ts`, `tests/unit/budget-format.spec.ts`, `tests/unit/recurring-format.spec.ts`, 8 berkas komponen

**Estimated scope:** M (per komponen 1–3 baris)

---

### T96: Migrasi sisanya + tes penjaga

**Description:** Migrasikan `components/transactions/{transaction-list,totals-strip,adjustment-card}.tsx`, `components/modals/manage-accounts.tsx`, `components/pwa/pending-transactions.tsx`, `components/forms/balance-warning.tsx`. Tambah `tests/unit/amount-guard.spec.ts`: membaca semua `components/**/*.tsx` dan `lib/*-format.ts`, gagal bila ada `HIDDEN_AMOUNT` atau `hideAmounts` di luar daftar izin (`components/settings/finance-section.tsx`, `components/dashboard/hide-amounts-button.tsx`). Pesan gagal menyebut berkas dan menyarankan `useAmountFormat`.

**Acceptance criteria:**

- [x] `amount-guard.spec.ts` hijau, dan merah bila satu ternary lama dikembalikan sementara (dicek manual sekali)
- [x] `grep -rln "HIDDEN_AMOUNT" components lib` hanya `lib/money.ts`

**Verification:**

- [x] `pnpm vitest run tests/unit/amount-guard.spec.ts` hijau
- [ ] Manual (tertunda: sesi tanpa browser): `/transactions`, Kelola akun, transaksi tertunda (mode pesawat), peringatan saldo di form expense

**Catatan (2026-10-29):** Konfirmasi arsip di Kelola akun (`manage-accounts.tsx`, "Saldo saat ini …") memakai `formatIDR` langsung dan tidak disamarkan saat `hideAmounts` aktif. Perilaku itu sudah ada sebelum refactor dan dibiarkan; tes penjaga tidak menangkapnya karena hanya mencari nama. Perlu keputusan Yogi.

**Dependencies:** T95

**Files likely touched:** `tests/unit/amount-guard.spec.ts`, 6 berkas komponen

**Estimated scope:** M

---

## Checkpoint Y

Lihat [plan-26.md](plan-26.md) § Checkpoint Y.
