# Todo phase 7: Settings, Kelola akun, Kelola kategori

Plan: [plan-7.md](plan-7.md) · Index: [plan.md](plan.md) · Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T17: Halaman Settings + form profil

**Description:** Ganti placeholder Settings dengan empat section (Profil, Keuangan, Tampilan, Logout). `hooks/use-profile.ts` (`useProfile`, `updateProfile`). `components/settings/profile-form.tsx` (react-hook-form + `profileSchema`, toast sukses, `setError` dari `ApiError.fields`). Toggle "Sembunyikan nominal" (`hideAmounts`). Tombol "Kelola akun"/"Kelola kategori" sudah memanggil `useUIStore().open(...)`; modalnya muncul di T18/T20. Tambah shadcn `input`, `label`, `switch`.

**Acceptance criteria:**
- [ ] Profil terisi dari `/api/me` (skeleton saat loading, "Coba lagi" saat error). Simpan → toast, nilai bertahan setelah reload. Nama kosong → pesan di field, tanpa request
- [ ] Toggle sembunyikan nominal bertahan setelah reload. Logout dan ThemeToggle tetap berfungsi
- [ ] 360 px: tanpa horizontal scroll, input 16 px, target sentuh ≥ 44 px

**Verification:**
- [ ] `tests/unit/profile-schema.spec.ts` tetap hijau. `pnpm build` hijau (tanpa error cache components)
- [ ] Manual: ubah profil di 360×800 dan 1024

**Dependencies:** None (memakai `/api/me` dari foundation)

**Files likely touched:** `app/(app)/settings/page.tsx`, `components/settings/profile-form.tsx`, `components/settings/finance-section.tsx`, `hooks/use-profile.ts`, `components/ui/*` (CLI)

**Estimated scope:** M

---

### T18: Kelola akun: daftar + tambah akun

**Description:** `hooks/use-accounts.ts` (`useAccounts`, `revalidateAccounts`, `createAccount`). `components/modals/modal-host.tsx` di-mount di `app/(app)/layout.tsx`. `components/modals/manage-accounts.tsx`: daftar dikelompokkan Transaksi/Aset (nama, label subtype, saldo `formatIDR`, merah jika negatif, disamarkan jika `hideAmounts`), empty state, dan view "Tambah akun" (nama, type segmented, subtype select opsional, saldo awal). `components/forms/money-input.tsx` dengan tombol ±. Hapus `components/settings/manage-accounts-placeholder.tsx`. Tambah shadcn `select`, `toggle-group`.

**Acceptance criteria:**
- [ ] Settings → "Kelola akun" membuka drawer (360) / dialog (1024). Tambah akun dengan saldo awal −250.000 → kembali ke daftar, akun tampil dengan saldo merah tanpa reload
- [ ] Nama duplikat → pesan 409 di field nama. Nilai `money-input` ↔ number diuji: `"1.250.000"` → 1250000, ± membalik tanda, input kosong → 0
- [ ] `useUIStore().open("manageAccounts")` dari mana pun di `(app)` membuka modal yang sama

**Verification:**
- [ ] `tests/unit/money-input.spec.ts` (logika parse/toggle tanda, dipisah dari komponen) dan `tests/unit/use-accounts.spec.ts` (matcher `revalidateAccounts`) hijau. `pnpm build` hijau
- [ ] Manual: alur tambah di 360×800 dengan keyboard virtual terbuka, dan di 1024

**Dependencies:** T12, T17

**Files likely touched:** `hooks/use-accounts.ts`, `components/modals/modal-host.tsx`, `components/modals/manage-accounts.tsx`, `components/forms/money-input.tsx`, `app/(app)/layout.tsx`, `components/settings/manage-accounts-placeholder.tsx` (hapus)

**Estimated scope:** M (6 file, satu di antaranya penghapusan)

---

### T19: Kelola akun: edit, arsip, pulihkan

**Description:** Tap baris → view edit (form yang sama dengan T18, terisi). Mengubah saldo awal menampilkan teks kecil "Selisih akan dicatat sebagai transaksi penyesuaian". Tombol "Arsipkan" → `alert-dialog` yang menyebut saldo saat ini jika ≠ 0. Toggle "Tampilkan arsip" memakai key `?include=archived` dan menampilkan item terarsip (redup) dengan tombol "Pulihkan". Tambah `updateAccount`, `archiveAccount`, `restoreAccount` di hook. Tambah shadcn `alert-dialog`.

**Acceptance criteria:**
- [ ] Ubah saldo awal 100.000 → 150.000 → daftar menampilkan saldo bergeser +50.000 tanpa reload
- [ ] Arsip akun bersaldo 30.000 → konfirmasi menyebut "Rp30.000", lalu akun hilang dari daftar aktif. Tampilkan arsip → Pulihkan → kembali aktif
- [ ] Rename ke nama akun terarsip → pesan 409 menyarankan memulihkan akun itu

**Verification:**
- [ ] `pnpm test` dan `pnpm build` hijau
- [ ] Manual: alur edit → arsip → pulihkan di 360×800 dan 1024

**Dependencies:** T13, T18

**Files likely touched:** `components/modals/manage-accounts.tsx`, `components/forms/account-form.tsx`, `hooks/use-accounts.ts`, `components/ui/alert-dialog.tsx` (CLI)

**Estimated scope:** M

---

### T20: Kelola kategori: daftar per tab + tambah

**Description:** `hooks/use-categories.ts` (`useCategories({ kind?, includeArchived? })`, `createCategory`). `components/modals/manage-categories.tsx` dengan tab Income/Saving/Spending (tab Spending dikelompokkan Needs/Wants), `modalProps.kind` memilih tab awal, dan view tambah (nama, pilihan needs/wants hanya di tab Spending). Daftarkan di `ModalHost`. Tambah shadcn `tabs`.

**Acceptance criteria:**
- [ ] Settings → "Kelola kategori" menampilkan 16 kategori default di tab yang benar
- [ ] Tambah "Parkir" (spending/needs) → muncul di grup Needs tanpa reload. Nama duplikat di kind sama → pesan 409 di field nama
- [ ] `open("manageCategories", { kind: "saving" })` membuka tab Saving

**Verification:**
- [ ] `tests/unit/use-categories.spec.ts` (filter per kind dan pengelompokan needs/wants, sebagai fungsi murni) hijau. `pnpm build` hijau
- [ ] Manual: 360×800 dan 1024. Tab bisa dipakai dengan keyboard

**Dependencies:** T14, T18 (ModalHost)

**Files likely touched:** `hooks/use-categories.ts`, `components/modals/manage-categories.tsx`, `components/modals/modal-host.tsx`, `components/ui/tabs.tsx` (CLI), `tests/unit/use-categories.spec.ts`

**Estimated scope:** M

---

### T21: Kelola kategori: rename, arsip, pulihkan

**Description:** Tap kategori → view edit yang hanya berisi nama, plus teks "Jenis kategori tidak bisa diubah". Arsip dengan `alert-dialog`. "Tampilkan arsip" + "Pulihkan" sama seperti akun. Tambah `renameCategory`, `archiveCategory`, `restoreCategory` di hook.

**Acceptance criteria:**
- [ ] Rename "Makan" → "Makan & Minum" tampil langsung. Form edit tidak punya field kind/needs-wants
- [ ] Arsip → hilang dari tab. Tampilkan arsip → Pulihkan → kembali di grup yang sama

**Verification:**
- [ ] `pnpm test` dan `pnpm build` hijau
- [ ] Manual: 360×800 dan 1024

**Dependencies:** T15, T20

**Files likely touched:** `components/modals/manage-categories.tsx`, `hooks/use-categories.ts`

**Estimated scope:** S

---

### Checkpoint F: modul `accounts-categories` selesai

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Semua acceptance criteria di SPEC-accounts-categories.md tercentang
- [ ] Manual di 360×800 dan 1024: tanpa horizontal scroll, target sentuh ≥ 44 px, input 16 px, light & dark
- [ ] Review dengan Yogi, lalu tulis `SPEC-transactions.md`
