# Plan phase 18: Budget Summary dan penyelesaian

Index: [plan.md](plan.md) · Todo: [todo-18.md](todo-18.md) · Spec: [SPEC-dashboard.md](../SPEC-dashboard.md) § Keputusan 9, Deliverables (Budget Summary, urutan layout, state), Acceptance criteria UI

## Tujuan

Pemilik melihat budget yang hampir habis langsung dari dashboard dan bisa membuka kategorinya. Layout lengkap di ponsel dan desktop, semua empty/error state ada, dan target non-fungsional SPEC.md (CLS, bundle, aksesibilitas) terpenuhi. Phase ini menutup modul `dashboard`.

## Task

- [ ] T64: Kartu Budget Summary (M)
- [ ] T65: Layout `lg`, state kosong/error, verifikasi NFR (S)

Urutan: T64 → T65.

## Keputusan

- **Budget Summary memakai `useBudgets(period)` apa adanya.** Tidak ada endpoint baru, cache dibagi dengan `/budget`, dan revalidasi sudah lewat `AFFECTS.transactions → budgets`.
- **`BudgetProgress` dari `components/budgets/` dipakai ulang**, bersama label status dari `lib/budget-format.ts`. Tidak ada progress bar baru.
- **Kategori yang ditampilkan:** status `over` dulu lalu `warning`, urut `percent` turun, maksimal 3. Pemilihan di fungsi murni `budgetHighlights(items)` di `lib/dashboard-format.ts` supaya bisa dites.
- **`usePeriodStore` tidak disentuh** sampai open question 5 di spec dijawab. Jika Yogi setuju menghapusnya, itu task kecil terpisah bersama pembaruan Project structure di SPEC.md.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Budget Summary dan halaman Budget menampilkan angka berbeda | Rendah | Sumber data sama (`useBudgets`), invarian `totals.expense = budgetUsage.summary.total.spent` sudah dites di T56 |
| CLS dari bagian yang selesai memuat di waktu berbeda | Sedang | Semua skeleton bertinggi tetap, diukur Lighthouse di T65 |
| Layout dua kolom `lg` merusak urutan baca screen reader | Rendah | Urutan DOM = urutan mobile, kolom diatur dengan grid |

## Checkpoint Q (modul selesai)

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Semua acceptance criteria di SPEC-dashboard.md tercentang
- [ ] Manual 360×800 dan 1024, light dan dark: alur penuh (ganti periode → catat expense → semua bagian berubah → drill-down dari kartu, legenda, akun, budget)
- [ ] Lighthouse mobile `/dashboard`: Performance ≥ 90, Accessibility ≥ 95, CLS < 0,1
- [ ] Review dengan Yogi, lalu tulis `SPEC-pwa-offline.md`
