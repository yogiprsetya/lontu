# Todo phase 18: Budget Summary dan penyelesaian

Plan: [plan-18.md](plan-18.md) · Index: [plan.md](plan.md) · Spec: [SPEC-dashboard.md](../SPEC-dashboard.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T64: Kartu Budget Summary

**Description:** `budgetHighlights(items, n = 3)` di `lib/dashboard-format.ts` (tes lebih dulu). `components/dashboard/budget-summary.tsx`: mode bulan → `useBudgets(period)`, progress total ("Rp terpakai dari Rp budget") dengan `BudgetProgress`, lalu sampai 3 kategori dari `budgetHighlights` dengan nama, persen, teks status ("Hampir habis" / "Melebihi budget"), tap → `/transactions?period=…&type=expense&categoryId=…`. Tautan "Lihat budget" → `/budget?period=…`. Bulan tanpa budget → CTA "Atur budget". Semua aman → "Semua budget aman". Mode tahun → teks "Budget dihitung per bulan" + tautan ke `/budget`.

**Acceptance criteria:**

- [x] `budgetHighlights`: `over` sebelum `warning`, urut `percent` turun, `ok`/`none` tidak ikut, maksimal 3
- [x] Angka sama dengan `/budget` untuk bulan yang sama. Catat expense yang melewati 80% → kategori muncul tanpa reload
- [x] Status terbaca tanpa warna, baris ≥ 44 px, `hideAmounts` menyamarkan nominal

**Verification:**

- [x] `pnpm vitest run tests/unit/dashboard-format.spec.ts` hijau
- [x] Manual 360×800 dan 1024, light dan dark. `pnpm build` hijau

**Dependencies:** T58

**Files likely touched:** `lib/dashboard-format.ts`, `tests/unit/dashboard-format.spec.ts`, `components/dashboard/budget-summary.tsx`, `components/dashboard/dashboard-view.tsx`

**Estimated scope:** M

---

### T65: Layout `lg`, state kosong/error, verifikasi NFR

**Description:** `dashboard-view.tsx`: urutan mobile Account Balance → kartu → Budget Summary → Expense Activity → donut. Di `lg`: grid dua kolom (grafik kiri, saldo + budget kanan) tanpa mengubah urutan DOM. Pastikan setiap bagian punya skeleton bertinggi tetap dan error SWR sendiri dengan "Coba lagi" (bagian lain tetap tampil). Jalankan Lighthouse mobile dan catat hasil di commit. Centang acceptance criteria di SPEC-dashboard.md yang sudah terbukti.

**Acceptance criteria:**

- [x] 360 px dan 1024 px sesuai urutan di atas, tanpa horizontal scroll. Mematikan jaringan untuk satu request menampilkan error di bagian itu saja
- [x] Lighthouse mobile `/dashboard`: Performance ≥ 90, Accessibility ≥ 95, CLS < 0,1. JS first load < 200 KB gzip
- [x] Acceptance criteria API, unit, dan UI di SPEC-dashboard.md tercentang atau dicatat sebagai tertunda

**Verification:**

- [x] Manual 360×800 dan 1024, light dan dark
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau

**Dependencies:** T61, T63, T64

**Files likely touched:** `components/dashboard/dashboard-view.tsx`, `SPEC-dashboard.md`

**Estimated scope:** S

---

### Checkpoint Q (modul selesai)

- [x] Gerbang penuh hijau
- [x] Semua acceptance criteria di SPEC-dashboard.md tercentang
- [x] Manual 360×800 dan 1024, light dan dark: alur penuh
- [x] Lighthouse mobile memenuhi target
- [x] Review dengan Yogi, lalu tulis `SPEC-pwa-offline.md`
