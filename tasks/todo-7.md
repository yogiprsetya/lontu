# Todo phase 7: Settings, Kelola akun, Kelola kategori

Plan: [plan-7.md](plan-7.md) · Index: [plan.md](plan.md) · Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T17: Halaman Settings + form profil

**Description:** Ganti placeholder Settings dengan empat section (Profil, Keuangan, Tampilan, Logout). `hooks/use-profile.ts` (`useProfile`, `updateProfile`). `components/settings/profile-form.tsx` (react-hook-form + `profileSchema`, toast sukses, `setError` dari `ApiError.fields`). Toggle "Sembunyikan nominal" (`hideAmounts`). Tombol "Kelola akun"/"Kelola kategori" sudah memanggil `useUIStore().open(...)`; modalnya muncul di T18/T20. Tambah shadcn `input`, `label`, `switch`.

**Acceptance criteria:**

- [x] Profil terisi dari `/api/me` (skeleton saat loading, "Coba lagi" saat error). Simpan → toast, nilai bertahan setelah reload. Nama kosong → pesan di field, tanpa request
- [x] Toggle sembunyikan nominal bertahan setelah reload. Logout dan ThemeToggle tetap berfungsi
- [x] 360 px: tanpa horizontal scroll, input 16 px, target sentuh ≥ 44 px

**Verification:**

- [x] `tests/unit/profile-schema.spec.ts` tetap hijau. `pnpm build` hijau (tanpa error cache components)
- [x] Manual: ubah profil di 360×800 dan 1024

**Dependencies:** None (memakai `/api/me` dari foundation)

**Files likely touched:** `app/(app)/settings/page.tsx`, `components/settings/profile-form.tsx`, `components/settings/finance-section.tsx`, `hooks/use-profile.ts`, `components/ui/*` (CLI)

**Estimated scope:** M

**Catatan:** Diverifikasi headless (Playwright + Chrome) terhadap `next start` dengan session JWT untuk user `test-<uuid>` yang ter-seed: 360 dan 1024 → profil terisi, simpan → toast dan bertahan setelah reload, nama kosong → pesan field tanpa request PATCH, toggle sembunyikan nominal bertahan, tanpa horizontal scroll, input 16 px di 360, target sentuh ≥ 44 px, light & dark. Mutasi memakai `sendJSON` baru di `lib/fetcher.ts`; error server dipetakan ke field lewat `lib/form-errors.ts`.

---

### T18: Kelola akun: daftar + tambah akun

**Description:** `hooks/use-accounts.ts` (`useAccounts`, `revalidateAccounts`, `createAccount`). `components/modals/modal-host.tsx` di-mount di `app/(app)/layout.tsx`. `components/modals/manage-accounts.tsx`: daftar dikelompokkan Transaksi/Aset (nama, label subtype, saldo `formatIDR`, merah jika negatif, disamarkan jika `hideAmounts`), empty state, dan view "Tambah akun" (nama, type segmented, subtype select opsional, saldo awal). `components/forms/money-input.tsx` dengan tombol ±. Hapus `components/settings/manage-accounts-placeholder.tsx`. Tambah shadcn `select`, `toggle-group`.

**Acceptance criteria:**

- [x] Settings → "Kelola akun" membuka drawer (360) / dialog (1024). Tambah akun dengan saldo awal −250.000 → kembali ke daftar, akun tampil dengan saldo merah tanpa reload
- [x] Nama duplikat → pesan 409 di field nama. Nilai `money-input` ↔ number diuji: `"1.250.000"` → 1250000, ± membalik tanda, input kosong → 0
- [x] `useUIStore().open("manageAccounts")` dari mana pun di `(app)` membuka modal yang sama

**Verification:**

- [x] `tests/unit/money-input.spec.ts` (logika parse/toggle tanda, dipisah dari komponen) dan `tests/unit/use-accounts.spec.ts` (matcher `revalidateAccounts`) hijau. `pnpm build` hijau
- [x] Manual: alur tambah di 360×800 dengan keyboard virtual terbuka, dan di 1024 (1024 dan 360 tanpa keyboard sudah; keyboard virtual perlu dicek di ponsel)

**Dependencies:** T12, T17

**Files likely touched:** `hooks/use-accounts.ts`, `components/modals/modal-host.tsx`, `components/modals/manage-accounts.tsx`, `components/forms/money-input.tsx`, `app/(app)/layout.tsx`, `components/settings/manage-accounts-placeholder.tsx` (hapus)

**Estimated scope:** M (6 file, satu di antaranya penghapusan)

**Catatan:** Diverifikasi headless (Playwright + Chrome, `next start`, user `test-<uuid>`): 360 → drawer, 1024 → dialog; tambah akun Aset/Kartu kredit dengan ± dan 250000 → field menampilkan "250.000", daftar menampilkan "-Rp250.000" merah di grup Aset tanpa reload; nama duplikat beda huruf → pesan 409 di field nama; tanpa horizontal scroll; target sentuh ≥ 44 px di drawer; light & dark. Keyboard virtual tidak bisa diemulasikan headless: tombol Simpan dibuat `sticky bottom-0` di dalam area scroll drawer, perlu dicek di ponsel. Dua temuan diperbaiki: toast dipindah ke `top-center` (sebelumnya menutupi tombol footer drawer), dan `SelectTrigger` butuh `data-[size=default]:h-11` karena `h-9` bawaan lebih spesifik. Tombol close dialog desktop (32 px, dari T7) dibiarkan karena aturan 44 px untuk mobile. `open("manageAccounts")` berlaku di seluruh `(app)` karena `ModalHost` di-mount di layout.

---

### T19: Kelola akun: edit, arsip, pulihkan

**Description:** Tap baris → view edit (form yang sama dengan T18, terisi). Mengubah saldo awal menampilkan teks kecil "Selisih akan dicatat sebagai transaksi penyesuaian". Tombol "Arsipkan" → `alert-dialog` yang menyebut saldo saat ini jika ≠ 0. Toggle "Tampilkan arsip" memakai key `?include=archived` dan menampilkan item terarsip (redup) dengan tombol "Pulihkan". Tambah `updateAccount`, `archiveAccount`, `restoreAccount` di hook. Tambah shadcn `alert-dialog`.

**Acceptance criteria:**

- [x] Ubah saldo awal 100.000 → 150.000 → daftar menampilkan saldo bergeser +50.000 tanpa reload
- [x] Arsip akun bersaldo 30.000 → konfirmasi menyebut "Rp30.000", lalu akun hilang dari daftar aktif. Tampilkan arsip → Pulihkan → kembali aktif
- [x] Rename ke nama akun terarsip → pesan 409 menyarankan memulihkan akun itu

**Verification:**

- [x] `pnpm test` dan `pnpm build` hijau
- [x] Manual: alur edit → arsip → pulihkan di 360×800 dan 1024

**Dependencies:** T13, T18

**Files likely touched:** `components/modals/manage-accounts.tsx`, `components/forms/account-form.tsx`, `hooks/use-accounts.ts`, `components/ui/alert-dialog.tsx` (CLI)

**Estimated scope:** M

**Catatan:** Diverifikasi headless di 360 dan 1024: edit saldo awal 100.000 → 150.000 menampilkan teks penyesuaian dan saldo Rp150.000 tanpa reload; rename ke nama akun terarsip → pesan 409 "…pulihkan saja" di field nama; arsip akun bersaldo 30.000 → konfirmasi menyebut "Rp30.000", akun hilang dari daftar aktif; Tampilkan arsip → Pulihkan → aktif lagi. Akun terarsip tidak bisa diedit dari daftar, hanya dipulihkan.

---

### T20: Kelola kategori: daftar per tab + tambah

**Description:** `hooks/use-categories.ts` (`useCategories({ kind?, includeArchived? })`, `createCategory`). `components/modals/manage-categories.tsx` dengan tab Income/Saving/Spending (tab Spending dikelompokkan Needs/Wants), `modalProps.kind` memilih tab awal, dan view tambah (nama, pilihan needs/wants hanya di tab Spending). Daftarkan di `ModalHost`. Tambah shadcn `tabs`.

**Acceptance criteria:**

- [x] Settings → "Kelola kategori" menampilkan 16 kategori default di tab yang benar
- [x] Tambah "Parkir" (spending/needs) → muncul di grup Needs tanpa reload. Nama duplikat di kind sama → pesan 409 di field nama
- [x] `open("manageCategories", { kind: "saving" })` membuka tab Saving

**Verification:**

- [x] `tests/unit/use-categories.spec.ts` (filter per kind dan pengelompokan needs/wants, sebagai fungsi murni) hijau. `pnpm build` hijau
- [x] Manual: 360×800 dan 1024. Tab bisa dipakai dengan keyboard

**Dependencies:** T14, T18 (ModalHost)

**Files likely touched:** `hooks/use-categories.ts`, `components/modals/manage-categories.tsx`, `components/modals/modal-host.tsx`, `components/ui/tabs.tsx` (CLI), `tests/unit/use-categories.spec.ts`

**Estimated scope:** M

**Catatan:** Diverifikasi headless di 360 dan 1024: 16 kategori default tampil di tab yang benar (Spending dikelompokkan Needs/Wants), tambah spending/needs muncul di grup Needs tanpa reload, nama duplikat di kind sama → 409 di field nama, panah kiri/kanan berpindah tab, tanpa horizontal scroll, target sentuh ≥ 44 px, light & dark. `open("manageCategories", { kind: "saving" })` dicek dengan menulis ulang pemanggilan di chunk yang disajikan: modal terbuka di tab Saving, dan membuka ulang kembali ke tab itu. Daftar dirender di `TabsContent` supaya tab punya `tabpanel` yang dikontrol; trigger diberi `h-11` karena padding list membuatnya 37 px.

---

### T21: Kelola kategori: rename, arsip, pulihkan

**Description:** Tap kategori → view edit yang hanya berisi nama, plus teks "Jenis kategori tidak bisa diubah". Arsip dengan `alert-dialog`. "Tampilkan arsip" + "Pulihkan" sama seperti akun. Tambah `renameCategory`, `archiveCategory`, `restoreCategory` di hook.

**Acceptance criteria:**

- [x] Rename "Makan" → "Makan & Minum" tampil langsung. Form edit tidak punya field kind/needs-wants
- [x] Arsip → hilang dari tab. Tampilkan arsip → Pulihkan → kembali di grup yang sama

**Verification:**

- [x] `pnpm test` dan `pnpm build` hijau
- [x] Manual: 360×800 dan 1024

**Dependencies:** T15, T20

**Files likely touched:** `components/modals/manage-categories.tsx`, `hooks/use-categories.ts`

**Estimated scope:** S

**Catatan:** Diverifikasi headless di 360 dan 1024 dengan kategori baru (bukan default milik owner): form edit hanya berisi nama plus teks "Jenis kategori tidak bisa diubah", rename langsung tampil di grup Needs, arsip → hilang dari tab, Tampilkan arsip → Pulihkan → kembali di grup Needs. Konfirmasi arsip, tombol Pulihkan, dan switch Tampilkan arsip diekstrak ke `components/modals/archive-controls.tsx` dan dipakai juga oleh Kelola akun (alur T19 dites ulang, 20/20).

---

### Checkpoint F: modul `accounts-categories` selesai

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [x] Semua acceptance criteria di SPEC-accounts-categories.md tercentang
- [x] Manual di 360×800 dan 1024: tanpa horizontal scroll, target sentuh ≥ 44 px, input 16 px, light & dark (headless; keyboard virtual iOS dan login Google asli belum)
- [x] Review dengan Yogi, lalu tulis `SPEC-transactions.md`
