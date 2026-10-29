# Todo phase 27: Key cache dan invalidasi

Plan: [plan-27.md](plan-27.md) · Index: [plan.md](plan.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task yang menyentuh komponen juga `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T97: `AFFECTS` lengkap, tanpa sisi `recurring → transactions`

**Description:** Butuh jawaban Open question #2 di [plan.md](plan.md). Sisi `recurring: ["transactions"]` (`lib/cache-invalidation.ts:25-28`) ada supaya Catat mencapai saldo, tetapi akibatnya setiap edit/arsip aturan dan Lewati ikut me-revalidate semua daftar transaksi. Catat adalah perubahan `transactions`, dan `advanceRule` (`hooks/use-recurring.ts:56`) sudah menyebutnya begitu. Perbarui `SPEC-dashboard.md` § Kontrak dulu: setiap entri `AFFECTS` mendaftar **semua** resource yang basi di server (lengkap, tidak transitif). Lalu ubah `AFFECTS.recurring` menjadi `[]`, ganti komentar "Direct edges only" / "Edges are one level deep" dengan aturan itu, dan perbarui komentar di `advanceRule`. Tes merah dulu.

**Acceptance criteria:**

- [x] `affectedBy("recurring")` = `["recurring"]`; `affectedBy("transactions")`, `affectedBy("accounts")`, `affectedBy("categories")` tidak berubah
- [x] `advanceRule` dengan `action: "post"` tetap me-revalidate `transactions`, `accounts`, `budgets`, `dashboard`, `recurring`; `skip` dan CRUD aturan hanya `recurring` (kasus `use-recurring.spec.ts`)
- [x] Hanya harapan `affectedBy("recurring")` yang berubah di tes lama, sesuai keputusan

**Verification:**

- [x] `pnpm vitest run tests/unit/cache-invalidation.spec.ts tests/unit/use-recurring.spec.ts` hijau
- [ ] Manual (tertunda: sesi tanpa browser): Catat dari kotak Jatuh tempo → saldo, budget, dashboard terbarui; ubah nama aturan → daftar `/transactions` tidak refetch (tab Network)

**Catatan (2026-10-29):** Selain `affectedBy("recurring")`, dua tes lama ikut berubah karena keputusan yang sama: "a recurring change refreshes the transaction list" (kini kebalikannya) dan judul tes skip. Tes CRUD aturan dan skip mendapat assertion baru bahwa daftar transaksi tidak di-refetch. Akibat samping: penanganan `OCCURRENCE_STALE` (`transaction-form.tsx`, `occurrence-actions.tsx`) memanggil `revalidateRecurring()` dan tidak lagi me-refetch daftar transaksi; kejadian itu ditangani di tab/perangkat lain, jadi daftar di sini segar lewat revalidate-on-focus SWR.

**Dependencies:** Checkpoint Y, Open question #2

**Files likely touched:** `lib/cache-invalidation.ts`, `hooks/use-recurring.ts`, `tests/unit/cache-invalidation.spec.ts`, `tests/unit/use-recurring.spec.ts`, `SPEC-dashboard.md`

**Estimated scope:** S

---

### T98: Key dibangun dari tabel yang sama dengan pencocoknya

**Description:** Pindahkan `accountsKey`, `categoriesKey`, `recurringKey`, `budgetsKey`, `budgetSuggestionKey`, key dashboard, totals, dan detail transaksi menjadi `apiKey(resource, params)` di `lib/cache-invalidation.ts`, dari satu tabel `{ base, build }`. `KEYS` diturunkan dari `base`. `transactionsPageKey` tetap di hook (logika cursor) tapi memakai `apiKey("transactions", …)`. Hook mengimpor `apiKey`, tidak menulis string key sendiri.

**Acceptance criteria:**

- [x] Tes tabel: untuk setiap resource dan setiap kombinasi param yang dipakai hook, key cocok dengan `isResourceKey(resource)` dan tidak cocok dengan resource lain, termasuk varian `$inf$`
- [x] Key yang dihasilkan identik byte-per-byte dengan sekarang (tes lama di `use-accounts.spec.ts`, `use-categories.spec.ts`, `use-transactions.spec.ts`, `use-budgets.spec.ts` hijau tanpa diubah)

**Verification:**

- [x] `pnpm vitest run tests/unit/cache-invalidation.spec.ts tests/unit/use-*.spec.ts` hijau

**Catatan (2026-10-29):** Tabelnya `{ base, infinite? }`; parameter per resource ditulis di hook sebagai `query` (`include`, `includeArchived`, `period`, `income`), karena itu kontrak API. `accountsKey`, `budgetsKey`, dan lainnya tetap ada sebagai pembungkus satu baris supaya tes lama tidak berubah. `transactionKey(id)` baru untuk detail. Tersisa di luar tabel: `/api/me` (`use-profile.ts`, bukan `Resource`) dan `fetch` di `use-outbox-replay.ts` (dipindah di T101).

**Dependencies:** T97

**Files likely touched:** `lib/cache-invalidation.ts`, `hooks/use-accounts.ts`, `hooks/use-categories.ts`, `hooks/use-recurring.ts`, `hooks/use-budgets.ts`, `hooks/use-transactions.ts`, `hooks/use-dashboard.ts`, `tests/unit/cache-invalidation.spec.ts`

**Estimated scope:** M (hook: ganti builder, 1–3 baris per berkas)

---

### T99: Satu alur hapus optimistic dengan rollback

**Description:** Tambah `removeOptimistically` di `lib/cache-invalidation.ts` (lihat plan-27 § Keputusan). `deleteTransaction` (`hooks/use-transactions.ts:111-126`) dan `deleteBudget` (`hooks/use-budgets.ts:33-45`) memakainya. Tes merah dulu dengan `swr.mutate` di-mock: urutan update → send → invalidate, `except` hanya saat berhasil, rollback + lempar ulang saat gagal.

**Acceptance criteria:**

- [x] `deleteTransaction` dan `deleteBudget` masing-masing ≤ 10 baris dan tidak memanggil `mutate` langsung
- [x] Tes hapus yang ada di `use-transactions.spec.ts` dan `use-budgets.spec.ts` hijau tanpa diubah

**Verification:**

- [x] `pnpm vitest run tests/unit/cache-invalidation.spec.ts tests/unit/use-transactions.spec.ts tests/unit/use-budgets.spec.ts tests/unit/transaction-cache.spec.ts tests/unit/budget-cache.spec.ts` hijau

**Dependencies:** T98

**Files likely touched:** `lib/cache-invalidation.ts`, `hooks/use-transactions.ts`, `hooks/use-budgets.ts`, `tests/unit/cache-invalidation.spec.ts`

**Estimated scope:** S

---

### T100: Satu toast undo

**Description:** `lib/undo-toast.ts` (`"use client"`): `undoToast({ message, restore, failure })` memanggil `toast` sonner dengan aksi "Urungkan", 6000 ms, dan `toast.error(failureMessage(err, failure))` bila `restore` gagal. Ganti tiga salinan di `components/transactions/transaction-editor.tsx:44-50`, `components/forms/budget-form.tsx:74-82`, `components/recurring/recurring-view.tsx:137-147`. Tes dengan `vi.mock("sonner")`.

**Acceptance criteria:**

- [ ] Literal `"Urungkan"` hanya ada di `lib/undo-toast.ts`
- [ ] Tes: aksi memanggil `restore`; `restore` gagal → `toast.error` dengan pesan server bila ada, selain itu `failure`

**Verification:**

- [ ] `pnpm vitest run tests/unit/undo-toast.spec.ts` hijau
- [ ] Manual: hapus transaksi, hapus budget, arsip aturan → Urungkan berfungsi; Urungkan saat offline → toast gagal

**Dependencies:** None (setelah Checkpoint Y)

**Files likely touched:** `lib/undo-toast.ts`, `tests/unit/undo-toast.spec.ts`, `components/transactions/transaction-editor.tsx`, `components/forms/budget-form.tsx`, `components/recurring/recurring-view.tsx`

**Estimated scope:** S

---

## Checkpoint Z

Lihat [plan-27.md](plan-27.md) § Checkpoint Z.
