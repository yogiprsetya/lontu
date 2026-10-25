# Todo phase 17: Grafik aktivitas dan kategori

Plan: [plan-17.md](plan-17.md) · Index: [plan.md](plan.md) · Spec: [SPEC-dashboard.md](../SPEC-dashboard.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T59: Pasang shadcn chart + token warna grafik

**Description:** Baca dokumentasi chart shadcn untuk style `base-vega`, lalu `pnpm dlx shadcn@latest add chart`. Periksa versi `recharts` yang terpasang terhadap React 19.3. Ganti `--chart-1..5` di `app/globals.css` (`:root` dan `.dark`) dengan lima hue berbeda, dan perluas `tests/unit/color-tokens.spec.ts` dengan cek ≥ 3:1 terhadap `--background`. Catat JS first load `/dashboard` dari `pnpm build` sebelum dan sesudah memasang (tanpa grafik dirender, dependency belum dimuat).

**Acceptance criteria:**

- [x] `components/ui/chart.tsx` hanya hasil CLI, `recharts` ada di `package.json`, tidak ada file lain yang berubah tanpa diperiksa
- [x] Tes kontras `--chart-1..5` hijau di light dan dark
- [x] `pnpm build` hijau. Ukuran first load sebelum/sesudah dicatat di pesan commit

**Verification:**

- [x] `pnpm vitest run tests/unit/color-tokens.spec.ts` hijau
- [x] `pnpm build` hijau

**Dependencies:** T58

**Files likely touched:** `components/ui/chart.tsx`, `package.json`, `pnpm-lock.yaml`, `app/globals.css`, `tests/unit/color-tokens.spec.ts`

**Estimated scope:** S

---

### T60: `activity` di `dashboardSummary`

**Description:** Tambah `activity: { bucket, expense }[]` ke `DashboardSummary`. Satu query di `dashboard-summary.ts`: `generate_series` atas `range` (per hari untuk mode bulan, per bulan untuk mode tahun) left join `sum(amount)` expense tak terhapus milik user, label dari `to_char`.

**Acceptance criteria:**

- [x] `2026-10` dengan `today = 2026-10-25` → 25 bucket `2026-10-01..2026-10-25`. `2026-09` → 30, `2028-02` → 29. Hari tanpa expense = 0. Expense tanggal 1 dan hari terakhir di bucket yang benar
- [x] Mode tahun → bucket `YYYY-MM`, tidak melewati bulan berjalan. Income, saving, transfer, adjustment, baris terhapus tidak ikut
- [x] Invarian `sum(activity.expense) = totals.expense`. Isolasi: aktivitas B 0 semua walau A punya data

**Verification:**

- [x] `pnpm vitest run tests/api/dashboard.spec.ts` hijau

**Dependencies:** T56

**Files likely touched:** `lib/schemas/dashboard.ts`, `lib/server/queries/dashboard-summary.ts`, `tests/api/dashboard.spec.ts`

**Estimated scope:** S

---

### T61: Grafik Expense Activity

**Description:** `components/dashboard/expense-activity-chart.tsx` dengan `ChartContainer` + `BarChart`, warna `--expense`, sumbu Y `abbreviateIDR`, tooltip `formatIDR`, label tanggal dari string dengan `timeZone: "UTC"` ("1", "15" untuk hari; "Jan" untuk bulan). Dimuat lewat `next/dynamic` dengan skeleton bertinggi sama. Ringkasan teks di atas grafik ("Total Rp…, tertinggi Rp… pada {tanggal}") dan tabel `sr-only`. `hideAmounts` menyembunyikan sumbu Y, tooltip, dan nominal di ringkasan. Expense 0 sepanjang periode → "Belum ada pengeluaran di {periode}" + tombol "Catat expense" (`/add/expense`).

**Acceptance criteria:**

- [ ] Bulan menampilkan batang per hari, tahun per bulan, tanpa horizontal scroll di 360 px. Tidak ada layout shift saat grafik muncul
- [ ] Screen reader membaca ringkasan dan tabel. `hideAmounts` dipatuhi
- [ ] JS first load `/dashboard` tetap < 200 KB gzip (dicatat di commit)

**Verification:**

- [ ] Manual 360×800 dan 1024, light dan dark
- [x] `pnpm build` hijau

**Dependencies:** T59, T60

**Files likely touched:** `components/dashboard/expense-activity-chart.tsx`, `components/dashboard/dashboard-view.tsx`

**Estimated scope:** M

---

### T62: `categories` di `dashboardSummary` + `topCategories`

**Description:** Tambah `categories: { categoryId, spendingType, amount }[]` ke `DashboardSummary`: satu query `sum(amount)` expense tak terhapus per `category_id` dalam `range`, join `categories` milik user, `having sum > 0`, urut `amount desc, category_id`. `topCategories(categories, n = 5)` di `lib/dashboard-format.ts`: N teratas + "Lainnya" (hanya jika sisa ≥ 2 kategori), persen dari total.

**Acceptance criteria:**

- [x] Semua kategori dengan expense > 0 muncul, termasuk terarsip, urutan benar. Kategori tanpa expense tidak muncul. Invarian `sum(categories.amount) = totals.expense`
- [x] `topCategories` dengan 8 → 5 + "Lainnya" (jumlah 3 sisanya). 6 → 6 tanpa "Lainnya". Jumlah selalu sama dengan input
- [x] Isolasi: kategori B tidak pernah memuat kategori atau expense A

**Verification:**

- [x] `pnpm vitest run tests/api/dashboard.spec.ts tests/unit/dashboard-format.spec.ts` hijau

**Dependencies:** T56

**Files likely touched:** `lib/schemas/dashboard.ts`, `lib/server/queries/dashboard-summary.ts`, `lib/dashboard-format.ts`, `tests/api/dashboard.spec.ts`, `tests/unit/dashboard-format.spec.ts`

**Estimated scope:** S

---

### T63: Donut per kategori + legenda

**Description:** `components/dashboard/category-donut.tsx`: `PieChart` donut (`aria-hidden`) dengan total expense di tengah, warna `--chart-1..5` dan `--muted-foreground` untuk "Lainnya". Legenda sebagai daftar: titik warna, nama kategori (dari `useCategories({ includeArchived: true })`, "(arsip)" untuk terarsip), nominal, persen. Baris legenda (≥ 44 px) → `/transactions?period=…&type=expense&categoryId=…`. "Lainnya" tidak bisa di-tap. Dimuat lewat `next/dynamic`. Tanpa expense → empty state sama dengan T61.

**Acceptance criteria:**

- [ ] Persen di legenda menjumlah ≈ 100, nominal "Lainnya" sama dengan sisa. Tap legenda → total di `/transactions` sama dengan nominalnya
- [ ] Kategori terarsip berlabel "(arsip)". `hideAmounts` menyamarkan nominal dan label tengah, persen tetap tampil
- [ ] 360 px tanpa horizontal scroll, kontras teks ≥ 4.5:1, JS first load tetap < 200 KB gzip

**Verification:**

- [ ] Manual 360×800 dan 1024, light dan dark
- [ ] `pnpm build` hijau

**Dependencies:** T59, T62

**Files likely touched:** `components/dashboard/category-donut.tsx`, `components/dashboard/dashboard-view.tsx`

**Estimated scope:** M

---

### Checkpoint P

- [ ] Gerbang penuh hijau, JS first load `/dashboard` < 200 KB gzip
- [ ] Manual 360×800 dan 1024: alur di plan-17
- [ ] Review dengan Yogi (open question 4 di spec)
