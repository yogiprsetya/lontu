# Todo phase 14: Hapus dan salin

Plan: [plan-14.md](plan-14.md) · Index: [plan.md](plan.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T48: `DELETE /api/budgets/[id]` + `restore`

**Description:** `softDeleteBudget` / `restoreBudget` di `lib/server/budgets.ts` (`deleted_at = coalesce(deleted_at, now())` / `null`, melihat baris terhapus). `budgetNotFound()` di `lib/api/errors.ts`. Route `app/api/budgets/[id]/route.ts` (`DELETE`) dan `app/api/budgets/[id]/restore/route.ts` (`POST`). Tes lebih dulu.

**Acceptance criteria:**

- [x] `DELETE` → 200 `Budget` dengan `deletedAt`, baris tetap di DB, usage item `budget null`. `DELETE` ulang tidak mengubah `deleted_at`. `restore` → aktif lagi, idempoten. `restore` dengan kategori terarsip → 200
- [x] Id bukan UUID, tidak ada, milik B → 404 `BUDGET_NOT_FOUND`. Tanpa session → 401

**Verification:**

- [x] `pnpm vitest run tests/api/budgets.spec.ts` hijau

**Dependencies:** T42, T44 (fixture budget lewat `setBudgets`)

**Files likely touched:** `lib/server/budgets.ts`, `lib/api/errors.ts`, `app/api/budgets/[id]/route.ts`, `app/api/budgets/[id]/restore/route.ts`, `tests/api/budgets.spec.ts`

**Estimated scope:** S

---

### T49: Hapus budget + undo

**Description:** `deleteBudget(period, id)` dan `restoreBudget(period, id)` di `hooks/use-budgets.ts`. Delete optimistic memakai `removeBudgetFromUsage(usage, id)` murni di `lib/budget-cache.ts`. Tombol "Hapus budget" di `budget-form.tsx` (hanya jika budget ada), menutup modal, toast "Budget dihapus · Urungkan" (6 detik) seperti `transaction-editor.tsx`. Gagal → rollback + toast error.

**Acceptance criteria:**

- [ ] Hapus → baris langsung kembali "Atur budget" dan ringkasan berubah. "Urungkan" mengembalikannya
- [ ] `DELETE` gagal (offline di DevTools) → baris kembali, toast error
- [ ] `removeBudgetFromUsage` menghasilkan `summary` yang sama dengan respons server untuk keadaan yang sama

**Verification:**

- [ ] `pnpm vitest run tests/unit/budget-cache.spec.ts tests/unit/use-budgets.spec.ts` hijau
- [ ] Manual 360×800

**Dependencies:** T47, T48

**Files likely touched:** `lib/budget-cache.ts`, `hooks/use-budgets.ts`, `components/forms/budget-form.tsx`, `tests/unit/budget-cache.spec.ts`

**Estimated scope:** S

---

### T50: `POST /api/budgets/copy`

**Description:** `budgetCopySchema` (`strictObject { to: budgetPeriodSchema }`). `copyBudgets(userId, to)` di `lib/server/budgets.ts`: satu `insert … select` dari bulan sebelumnya (budget aktif, kategori aktif spending) dengan `on conflict … do update … where budgets.deleted_at is not null returning id`. Route `app/api/budgets/copy/route.ts` → `{ copied }`.

**Acceptance criteria:**

- [ ] Oktober: Makan, Hiburan, satu kategori terarsip. November sudah punya Makan 900.000 → `copied 1`, Makan November tetap 900.000, Hiburan tersalin, kategori terarsip dilewati. Ulang → `copied 0`
- [ ] Budget November yang terhapus dihidupkan lagi dengan nominal Oktober. Oktober kosong → `copied 0`. `to` tidak valid → 400
- [ ] Isolasi: copy B tidak pernah membaca atau menulis budget A. Tanpa session → 401

**Verification:**

- [ ] `pnpm vitest run tests/api/budget-copy.spec.ts` hijau

**Dependencies:** T42

**Files likely touched:** `lib/schemas/budget.ts`, `lib/server/budgets.ts`, `app/api/budgets/copy/route.ts`, `tests/api/budget-copy.spec.ts`

**Estimated scope:** S

---

### T51: Menu aksi bulan + empty state

**Description:** `copyBudgets(to)` di hook. `components/budgets/month-actions.tsx`: `dropdown-menu` di header dengan "Salin dari {bulan lalu}" (dan slot untuk "Saran 50/30/20" di T54). Toast "{n} budget disalin" atau "Bulan lalu belum punya budget". Bulan tanpa budget aktif sama sekali → CTA yang sama di tengah daftar (di atas daftar kategori).

**Acceptance criteria:**

- [ ] Salin dari ponsel mengisi daftar tanpa reload. Salin kedua → toast "0"/"belum punya" sesuai kasus, tanpa duplikat
- [ ] Menu terjangkau keyboard, target ≥ 44 px, 360 px tanpa horizontal scroll

**Verification:**

- [ ] Manual 360×800 dan 1024
- [ ] `pnpm build` hijau

**Dependencies:** T47, T50

**Files likely touched:** `hooks/use-budgets.ts`, `components/budgets/month-actions.tsx`, `components/budgets/budget-view.tsx`

**Estimated scope:** S

---

### Checkpoint M

- [ ] Gerbang penuh hijau
- [ ] Alur hapus/urungkan dan salin di 360×800 dan 1024
- [ ] Review dengan Yogi
