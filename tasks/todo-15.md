# Todo phase 15: Saran 50/30/20

Plan: [plan-15.md](plan-15.md) · Index: [plan.md](plan.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T52: `suggestBudgets` murni

**Description:** `lib/budget-suggestion.ts`: `suggestBudgets({ basis, categories: { id, spendingType }[], monthlyAverage: Record<id, number>, current: Record<id, number | null> })` → `{ pools, items }` sesuai spec § Saran 50/30/20. Tes ditulis lebih dulu.

**Acceptance criteria:**

- [ ] `basis 10.000.000` → pools `5.000.000 / 3.000.000 / 2.000.000`. Jumlah item per grup = pool grup (dibulatkan ke 1.000), semua item kelipatan 1.000
- [ ] Bobot proporsional dengan rata-rata. Semua bobot grup 0 → bagi rata. Seri → `categoryId` naik mendapat sisa lebih dulu. Hasil deterministik
- [ ] `basis 0` → `items` kosong. Grup tanpa kategori → tidak ada item. `basis 7.777.777` → needs pool `3.888.000`, wants `2.333.000`

**Verification:**

- [ ] `pnpm vitest run tests/unit/budget-suggestion.spec.ts` hijau

**Dependencies:** T42

**Files likely touched:** `lib/budget-suggestion.ts`, `tests/unit/budget-suggestion.spec.ts`

**Estimated scope:** S

---

### T53: `GET /api/budgets/suggestion`

**Description:** `budgetSuggestionQuerySchema` (`period`, `income?` `z.coerce.number().int()` 0..1e12). `lib/server/queries/budget-history.ts`: income bulan sebelum `period`, dan `sum(expense)` per kategori spending aktif selama 3 bulan sebelum `period` (satu query, `transactionWhere` tidak dipakai karena rentangnya berbeda per agregat, tapi filter `user_id`/`deleted_at` sama). Budget aktif `period` untuk `current`. Route `app/api/budgets/suggestion/route.ts` menggabungkan dengan `suggestBudgets`.

**Acceptance criteria:**

- [ ] Income September 10.000.000, riwayat Juli–September → respons sesuai T52 dengan `basisSource "previous_month"`. `income=7777777` → `"input"`. `current` terisi untuk kategori yang punya budget Oktober
- [ ] Pengeluaran bulan berjalan, terhapus, dan kategori terarsip tidak ikut. Rentang lintas tahun (`period 2026-02` → Nov–Jan) benar
- [ ] Tidak menulis baris apa pun. Isolasi: B tidak memakai income/pengeluaran A. Query tidak valid → 400. Tanpa session → 401

**Verification:**

- [ ] `pnpm vitest run tests/api/budget-suggestion.spec.ts` hijau

**Dependencies:** T52

**Files likely touched:** `lib/schemas/budget.ts`, `lib/server/queries/budget-history.ts`, `app/api/budgets/suggestion/route.ts`, `tests/api/budget-suggestion.spec.ts`

**Estimated scope:** M

---

### T54: Panel saran

**Description:** `useBudgetSuggestion(period, income?)` (key hanya aktif saat panel terbuka). `components/budgets/suggestion-panel.tsx` di `ResponsiveModal`, dibuka dari `month-actions` dan CTA empty state: `MoneyInput` income dasar (default dari respons, debounce 400 ms), pool Needs/Wants/Saving (saving berlabel "acuan, tidak jadi budget"), daftar per grup dengan nama kategori, nominal saran, checkbox (default sesuai plan-15), label "Ganti Rp…" untuk yang punya budget. "Terapkan ({n})" → `setBudgets` satu `PUT`, toast "{n} budget diterapkan", tutup panel. Basis 0 → pesan "Belum ada income bulan lalu. Isi income untuk melihat saran."

**Acceptance criteria:**

- [ ] Terapkan hanya menulis baris tercentang. Daftar dan ringkasan berubah tanpa reload
- [ ] Mengubah income memperbarui pool dan nominal. Basis 0 menampilkan pesan, tombol Terapkan nonaktif
- [ ] 360 px tanpa horizontal scroll, checkbox dan baris ≥ 44 px, input 16 px. `hideAmounts` dipatuhi

**Verification:**

- [ ] Manual 360×800 dan 1024, light dan dark
- [ ] `pnpm build` hijau

**Dependencies:** T47, T51, T53

**Files likely touched:** `hooks/use-budgets.ts`, `components/budgets/suggestion-panel.tsx`, `components/budgets/month-actions.tsx`, `components/budgets/budget-view.tsx`

**Estimated scope:** M

---

### Checkpoint N (modul selesai)

- [ ] Gerbang penuh hijau
- [ ] Semua acceptance criteria di SPEC-budgets.md tercentang
- [ ] Manual 360×800 dan 1024, light dan dark: alur penuh
- [ ] Review dengan Yogi, lalu tulis `SPEC-dashboard.md`
