# Todo phase 16: Ringkasan dan saldo

Plan: [plan-16.md](plan-16.md) · Index: [plan.md](plan.md) · Spec: [SPEC-dashboard.md](../SPEC-dashboard.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T55: Schema periode + `dashboardRanges`

**Description:** `lib/schemas/dashboard.ts`: tipe `DashboardPeriod`, `DateRange`, `DashboardTotals`, `DashboardSummary` (tanpa `activity`/`categories` dulu), `dashboardPeriodSchema` (bulan atau tahun, 2000 sampai periode berjalan, dicek dengan `todayInJakarta()` saat parse), `dashboardQuerySchema`. `lib/dashboard-period.ts` (murni): `dashboardMode(period)`, `dashboardRanges(period, today)` → `{ range, previous: { period, range } }` sesuai keputusan #4 spec dan plan-16. Tes ditulis lebih dulu.

**Acceptance criteria:**

- [x] `2026-10` pada 2026-10-25 → range `10-01..10-25`, previous `2026-09`, `09-01..09-25`. Pada 2026-10-31 → previous sampai `09-30`. `2026-09` (lewat) → previous Agustus penuh. `2026-01` → previous `2025-12`
- [x] `2028` pada 2028-02-29 → range `2028-01-01..2028-02-29`, previous `2027-01-01..2027-02-28`. `2025` → previous 2024 penuh. `2000-01` / `2000` → previous `1999-12` / `1999` (selalu 0 karena tidak ada transaksi sebelum 2000)
- [x] Schema menolak kosong, `2026-13`, `26-10`, `1999`, `1999-12`, bulan depan, tahun depan (fake timer, termasuk 31 Desember)

**Verification:**

- [x] `pnpm vitest run tests/unit/dashboard-schema.spec.ts tests/unit/dashboard-period.spec.ts` hijau

**Dependencies:** None

**Files likely touched:** `lib/schemas/dashboard.ts`, `lib/dashboard-period.ts`, `tests/unit/dashboard-schema.spec.ts`, `tests/unit/dashboard-period.spec.ts`

**Estimated scope:** S

---

### T56: `GET /api/dashboard` (totals + pembanding)

**Description:** `lib/server/queries/dashboard-summary.ts`: `dashboardSummary(userId, period, today)` memanggil `transactionTotals` untuk `range` dan `previous.range` secara paralel, menambah `net`. Range kosong → totals 0 tanpa query. Route `app/api/dashboard/route.ts` dengan `withAuth`, `dashboardQuerySchema`, 400 `fields.period`.

**Acceptance criteria:**

- [x] Skenario spec (income 10 jt, expense 3 jt termasuk biaya admin dan kategori terarsip, saving 1 jt, transfer, adjustment, baris terhapus) → `totals = { 10000000, 3000000, 1000000, net 6000000 }`. Expense 26 Sep tidak masuk `previousTotals` dengan `today = 2026-10-25`
- [x] Invarian: `totals.expense` = `budgetUsage(userId, "2026-10").summary.total.spent`. Periode kosong → semua 0
- [x] Query tidak valid → 400 `fields.period`. Isolasi: totals B tetap 0 walau A punya data. Tanpa session → 401

**Verification:**

- [x] `pnpm vitest run tests/api/dashboard.spec.ts` hijau

**Dependencies:** T55

**Files likely touched:** `lib/server/queries/dashboard-summary.ts`, `app/api/dashboard/route.ts`, `tests/api/dashboard.spec.ts`

**Estimated scope:** M

---

### T57: Format murni, `useDashboard`, resource `dashboard`

**Description:** `lib/dashboard-format.ts`: `percentChange(current, previous)`, `changeTone(metric, delta)` (`"good" | "bad" | "neutral"`), `sumBalances(accounts)` → `{ total, byType }` (akun aktif saja). `hooks/use-dashboard.ts`: `dashboardKey(period)`, `useDashboard(period)`. `lib/cache-invalidation.ts`: resource `dashboard` (`/^\/api\/dashboard($|[/?])/`) dan `AFFECTS.transactions` ditambah `dashboard`.

**Acceptance criteria:**

- [x] `percentChange`: 100→112 = 12, 100→88 = −12, 0→50 = `null`, 0→0 = `null`, 3→4 = 33. `changeTone`: expense naik = bad, income/saving/net naik = good, 0 = neutral
- [x] `sumBalances` melewati akun terarsip, kartu kredit negatif mengurangi total, subtotal per `type` benar, daftar kosong → 0
- [x] `affectedBy("transactions")` memuat `dashboard`. `affectedBy("accounts")`, `("categories")`, `("budgets")` tidak. `isResourceKey("dashboard", "/api/dashboard?period=2026-10")` true

**Verification:**

- [x] `pnpm vitest run tests/unit/dashboard-format.spec.ts tests/unit/cache-invalidation.spec.ts` hijau

**Dependencies:** T55

**Files likely touched:** `lib/dashboard-format.ts`, `hooks/use-dashboard.ts`, `lib/cache-invalidation.ts`, `tests/unit/dashboard-format.spec.ts`, `tests/unit/cache-invalidation.spec.ts`

**Estimated scope:** M

---

### T58: Halaman dashboard: header, Account Balance, kartu

**Description:** `app/(app)/dashboard/page.tsx` menggantikan placeholder: `<Suspense>` + `components/dashboard/dashboard-view.tsx` yang membaca `period` dari URL (default bulan berjalan, nilai tidak valid → bulan berjalan) dan menulisnya lewat `router.replace`. `PeriodStepper` mendapat prop `modes`. `components/dashboard/balance-card.tsx`: total, subtotal Transaksi/Aset, collapsible per akun (tap → `/transactions?period=…&accountId=…`), tanpa akun → "Tambah akun". `components/dashboard/summary-cards.tsx`: grid 2×2 (4 kolom di `lg`), nominal, "naik/turun N% dari {periode}" dengan ikon + warna `changeTone`, "—" untuk `null`, teks bantuan rentang pembanding, Sisa menampilkan selisih nominal, tap → `/transactions?period=…&type=…` (Sisa tidak bisa di-tap). Skeleton bertinggi tetap, error per bagian dengan "Coba lagi". `hideAmounts` dipatuhi.

**Acceptance criteria:**

- [x] `/dashboard` → bulan berjalan. `?period=2026` bertahan setelah refresh. Stepper tanpa "Semua", tidak bisa melewati periode berjalan. `/transactions` tetap punya "Semua"
- [x] Catat expense dari **+**, kembali ke dashboard → kartu dan saldo berubah tanpa reload. Tap Expense → total di `/transactions` sama
- [x] 360 px tanpa horizontal scroll, kartu dan baris akun ≥ 44 px, arah perubahan terbaca tanpa warna, `hideAmounts` menyamarkan semua nominal

**Verification:**

- [x] Manual 360×800 dan 1024, light dan dark
- [x] `pnpm build` hijau

**Dependencies:** T56, T57

**Files likely touched:** `app/(app)/dashboard/page.tsx`, `components/dashboard/dashboard-view.tsx`, `components/dashboard/balance-card.tsx`, `components/dashboard/summary-cards.tsx`, `components/transactions/period-stepper.tsx`

**Estimated scope:** M

---

### Checkpoint O

- [x] Gerbang penuh hijau
- [x] Manual 360×800 dan 1024: alur di plan-16
- [x] Review dengan Yogi (open questions 1–3 dan 5 di spec)
