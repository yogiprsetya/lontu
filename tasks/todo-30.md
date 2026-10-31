# Todo phase 30: Spec dan pembersihan

Plan: [plan-30.md](plan-30.md) · Index: [plan.md](plan.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T107: Revisi spec dan persetujuan

**Description:** Tulis ulang SPEC-budgets.md untuk budget bernama sesuai plan.md § Budget bernama (Keputusan perencanaan 1–8), dengan "Asal: sesi idea-refine 2026-10-31". Isi minimal: Objective, Di luar cakupan (mingguan, rollover, "mulai bulan depan", saran, salin, budget per akun), Keputusan, Perubahan skema (`budget_versions`, drop `budgets` di cutover), Kontrak API, Validasi, Query `budgetUsage`, Aturan tulis, Migrasi + cutover, Kontrak untuk modul lain, AC, Tes, Boundaries. Perbarui juga SPEC.md (Objective, baris `budgets` di capability map, keputusan terkunci #8, catatan Open question #4), SPEC-dashboard.md (keputusan #9 dan #12, hook `useBudgetUsage`), SPEC-foundation.md (catatan di baris tabel `budgets`). Tanpa perubahan kode. Berhenti untuk review Yogi.

Kontrak yang ditulis:

| Method & path                    | Body / query                                    | Sukses                                | Error                                  |
| -------------------------------- | ----------------------------------------------- | ------------------------------------- | -------------------------------------- |
| `GET /api/budgets/usage`         | `?period=YYYY-MM` (2000-01..bulan berjalan)     | 200 `BudgetUsage`                     | 400                                    |
| `POST /api/budgets`              | `{ name, spendingType, amount, categoryIds }`   | 201 `BudgetVersion`                   | 400, 409 `BUDGET_NAME_TAKEN`           |
| `PATCH /api/budgets/[id]`        | `{ name?, amount?, categoryIds? }` (min 1)      | 200 `BudgetVersion`                   | 400, 404, 409                          |
| `DELETE /api/budgets/[id]`       | —                                               | 200 `BudgetVersion` (`deletedAt`), idempoten | 404                             |
| `POST /api/budgets/[id]/restore` | —                                               | 200 `BudgetVersion`, idempoten        | 404, 409 `BUDGET_RESTORE_CONFLICT`     |

Dihapus: `GET /api/budgets`, `PUT /api/budgets`, `POST /api/budgets/copy`, `GET /api/budgets/suggestion`.

```ts
type BudgetVersion = { id: string; name: string; spendingType: SpendingType; amount: number; categoryIds: string[]; period: BudgetPeriod; deletedAt: string | null };
type BudgetUsageItem = { budgetId: string; name: string; spendingType: SpendingType; budget: number; spent: number; remaining: number; percent: number | null; status: BudgetStatus; categories: { categoryId: string; spent: number }[] };
type BudgetUsage = { period: BudgetPeriod; items: BudgetUsageItem[]; unbudgeted: { categoryId: string; spendingType: SpendingType; spent: number }[]; summary: { needs: BudgetGroup; wants: BudgetGroup; total: BudgetGroup } };
```

**Acceptance criteria:**

- [ ] SPEC-budgets.md memuat kontrak di atas, aturan tulis (bulan berjalan dari server, satu kategori satu budget per bulan, jenis kategori = jenis budget, kategori terarsip hanya boleh tetap bila sudah ada di versi efektif, nama unik), definisi versi efektif, dan langkah cutover
- [ ] SPEC.md, SPEC-dashboard.md, SPEC-foundation.md konsisten dengan SPEC-budgets.md (tidak ada lagi "salin", "saran 50/30/20", "bulan depan", atau "budget per kategori" sebagai perilaku berjalan)
- [ ] Yogi menyetujui perubahan skema dan capability map, dan menjawab Open questions 1–3 di plan.md

**Verification:**

- [ ] `pnpm format:check` hijau
- [ ] Review dokumen bersama Yogi (tanpa perubahan kode)

**Dependencies:** None

**Files likely touched:** `SPEC-budgets.md`, `SPEC.md`, `SPEC-dashboard.md`, `SPEC-foundation.md`, `tasks/plan.md`, `tasks/plan-30.md`

**Estimated scope:** S

---

### T108: Hapus saran 50/30/20

**Description:** Hapus fitur saran dari ujung ke ujung: route `suggestion`, `suggestBudgets`, `budgetHistory`/`historyWindow`, `SuggestionPanel`, item menu "Saran 50/30/20", tombol saran di prompt bulan kosong, `useBudgetSuggestion`/`budgetSuggestionKey`, helper seleksi di `budget-format.ts`, `BudgetSuggestion` dan `budgetSuggestionQuerySchema`, beserta tesnya.

**Acceptance criteria:**

- [ ] `rg -n "suggestBudgets|budgetHistory|historyWindow|BudgetSuggestion|useBudgetSuggestion|SuggestionPanel|50/30/20" app components hooks lib tests` kosong
- [ ] Menu aksi bulan hanya berisi "Salin dari {bulan lalu}"; prompt bulan kosong hanya tombol salin
- [ ] Tes yang hilang hanya tes saran (jumlah dicatat di commit body)

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual: `/budget` tanpa "Saran 50/30/20", atur budget per kategori tetap jalan

**Dependencies:** T107

**Files likely touched:** `app/api/budgets/suggestion/route.ts`, `lib/budget-suggestion.ts`, `lib/server/queries/budget-history.ts`, `components/budgets/suggestion-panel.tsx`, `components/budgets/month-actions.tsx`, `components/budgets/budget-view.tsx`, `hooks/use-budgets.ts`, `lib/budget-format.ts`, `lib/schemas/budget.ts`, `tests/api/budget-suggestion.spec.ts`, `tests/unit/budget-suggestion.spec.ts`, `tests/unit/budget-format.spec.ts`, `tests/unit/budget-schema.spec.ts`, `tests/unit/use-budgets.spec.ts` (sebagian besar penghapusan)

**Estimated scope:** M

---

### T109: Hapus salin dari bulan lalu

**Description:** Dengan budget yang berlaku sampai diubah, salin tidak dibutuhkan. Hapus route `copy`, `copyBudgets` (server dan hook), `copy-from-previous-month.ts`, `MonthActions` (menunya kosong setelah T108), `NoBudgetsPrompt` (diganti teks "Belum ada budget untuk {bulan}."), `copyResultMessage`, `budgetCopySchema`, beserta tesnya.

**Acceptance criteria:**

- [ ] `rg -n "copyBudgets|budgetCopySchema|copyFromPreviousMonth|copyResultMessage|MonthActions|NoBudgetsPrompt" app components hooks lib tests` kosong
- [ ] Header `/budget` hanya stepper bulan
- [ ] Batas 2000-01 tetap dites di `tests/unit/period.spec.ts`; tes yang hilang hanya tes salin

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual 360×800: header tanpa menu, bulan kosong menampilkan teks

**Dependencies:** T107 (setelah T108 bila `month-actions.tsx` dihapus di sini)

**Files likely touched:** `app/api/budgets/copy/route.ts`, `lib/server/budgets.ts`, `components/budgets/copy-from-previous-month.ts`, `components/budgets/month-actions.tsx`, `components/budgets/budget-view.tsx`, `hooks/use-budgets.ts`, `lib/budget-format.ts`, `lib/schemas/budget.ts`, `tests/api/budget-copy.spec.ts`, `tests/unit/budget-format.spec.ts`, `tests/unit/use-budgets.spec.ts`, `tests/unit/budget-schema.spec.ts` (sebagian besar penghapusan)

**Estimated scope:** M
