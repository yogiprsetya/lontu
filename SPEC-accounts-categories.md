# Spec module: `accounts-categories`

Status: draft · 2026-10-20 · @Yogi
Bergantung pada: `foundation` · Dipakai oleh: `transactions`, `budgets`, `dashboard` · Indeks: [SPEC.md](SPEC.md)

## Objective

Pengguna bisa mengelola daftar akun (rekening, e-wallet, kartu kredit, aset) dan kategori (income, saving, spending needs/wants) dari halaman Settings, lengkap dengan saldo terkini per akun. Pengguna baru langsung punya kategori default, jadi transaksi pertama bisa dicatat tanpa setup.

Modul ini juga pemilik **kontrak** `GET /api/accounts` dan `GET /api/categories`, hook SWR-nya, dan aturan kepemilikan/arsip yang wajib dipatuhi modul `transactions` dan `budgets`.

Di luar cakupan: transaksi apa pun (termasuk penyesuaian saldo lewat transaksi), budget, urutan manual (drag to reorder), ikon/warna kategori, total saldo gabungan (milik `dashboard`).

## Keputusan

1. **Hapus = arsip.** `DELETE` mengisi `archived_at`, dan item bisa dipulihkan. Tidak ada hard delete. Item terarsip hilang dari picker, tetapi tetap tampil (dengan namanya) di transaksi lama.
2. **Kategori hanya bisa di-rename.** `kind` dan `spending_type` dikunci sejak dibuat. Transaksi mereferensikan `category_id`, jadi rename langsung berlaku di semua transaksi. Untuk "memindah" kategori ke kind lain, buat kategori baru.
3. **Akun boleh diubah seluruhnya:** `name`, `type`, `subtype`, dan saldo awal. Kolom `initial_balance` hanya diisi saat akun dibuat. Mengubah saldo awal setelahnya **menambah transaksi `adjustment`** sebesar selisihnya, sehingga ada jejak kenapa saldo bergeser (lihat [Transaksi penyesuaian](#transaksi-penyesuaian)).
4. **`subtype` opsional dan bebas dari `type`.** Nilainya salah satu dari `debit | ewallet | credit_card | investment | crypto | other`, atau `null`. Tidak ada pasangan wajib dengan `type`.
5. **Saldo negatif diizinkan di semua akun,** termasuk `initial_balance` negatif (rentang −1e12..1e12).
6. **Seed kategori default saat login,** di `upsertUser`, hanya jika user belum punya baris `categories` sama sekali (termasuk yang terarsip). Karena tidak ada hard delete, seed praktis terjadi sekali per user. Pemilik yang sudah login di fase foundation ikut ter-seed pada login berikutnya.
7. **Nama unik per user** (akun) dan per user + kind (kategori), case-insensitive, **termasuk yang terarsip** (index unik di DB tidak parsial). Restore tidak pernah bentrok. Membuat item baru dengan nama yang sama dengan item terarsip → 409 dengan pesan yang menyarankan restore.
8. **Satu perubahan skema, tanpa kolom baru:** tipe transaksi `adjustment` (constraint + view, lihat di bawah). Disetujui 2026-10-20.
9. **Arsip akun dengan saldo ≠ 0 diizinkan.** Konfirmasi menampilkan saldo saat ini sebagai peringatan.
10. **Label UI:** nav tetap bahasa Inggris seperti foundation. Tombol, form, dan pesan memakai bahasa Indonesia.

## Transaksi penyesuaian

Migrasi baru (bukan mengubah/menghapus kolom) mengganti constraint `transactions` dan view:

| Constraint / objek | Sebelum | Sesudah |
|---|---|---|
| `transactions_type_check` | `in ('income','expense','saving','transfer')` | tambah `'adjustment'` |
| `transactions_amount_check` | `amount > 0` | `amount > 0`, kecuali `adjustment`: `amount <> 0` (bertanda) |
| `transactions_category_check` | `(type = 'transfer') = (category_id is null)` | `(type in ('transfer','adjustment')) = (category_id is null)` |
| view `account_balances` | `income → +amount` | `income`, `adjustment → +amount` |

Aturan:

- Dibuat **hanya** oleh `PATCH /api/accounts/[id]` saat `initialBalance` berubah: `amount = initialBalance baru − saldo awal efektif`, `date` = hari ini (Asia/Jakarta), `description = "Penyesuaian saldo awal"`, `to_account_id` dan `category_id` null. Selisih 0 tidak membuat baris.
- **Saldo awal efektif** = `initial_balance + sum(amount adjustment yang tidak dihapus)`. Inilah nilai `Account.initialBalance` di respons, jadi dari sisi client field itu berperilaku seperti bisa diedit langsung.
- Insert adjustment dan pembacaan saldo awal efektif berjalan dalam satu transaksi DB dengan `select … for update` pada baris akun, supaya dua edit bersamaan tidak menghitung selisih dari angka yang sama.
- `adjustment` **tidak** ditambahkan ke `TRANSACTION_TYPES` (`lib/transaction-types.ts`), jadi tidak bisa dibuat lewat `/add/[type]` atau API transaksi. Modul `transactions` menampilkannya di daftar sebagai "Penyesuaian" dan boleh soft-delete (saldo ikut kembali). Modul `dashboard` dan `budgets` hanya menghitung income/expense/saving, jadi adjustment otomatis tidak ikut.

## Kategori default

| kind     | spending_type | Nama                                                     |
| -------- | ------------- | -------------------------------------------------------- |
| income   | —             | Gaji, Bonus, Hadiah, Lainnya                             |
| saving   | —             | Dana Darurat, Tabungan, Investasi                        |
| spending | needs         | Makan, Transportasi, Tagihan, Belanja Bulanan, Kesehatan |
| spending | wants         | Hiburan, Jajan, Belanja, Langganan                       |

Daftar ini ada di satu konstanta (`lib/default-categories.ts`) dan dites.

## Kontrak API

Semua route memakai `withAuth`, memfilter `user_id` dari session, dan memakai format error dari `lib/api/errors.ts`. Id di path yang bukan UUID, tidak ada, atau milik user lain → **404** dengan code yang sama (tidak membocorkan keberadaan data user lain).

### Tipe respons

```ts
// lib/schemas/account.ts (tipe dipakai bersama client & server)
type Account = {
  id: string;
  name: string;
  type: "transaction" | "asset";
  subtype:
    | "debit"
    | "ewallet"
    | "credit_card"
    | "investment"
    | "crypto"
    | "other"
    | null;
  initialBalance: number; // saldo awal efektif (initial_balance + adjustment), integer rupiah
  balance: number; // dari view account_balances, integer rupiah
  archivedAt: string | null; // ISO timestamp
  createdAt: string;
};

// lib/schemas/category.ts
type Category = {
  id: string;
  name: string;
  kind: "income" | "saving" | "spending";
  spendingType: "needs" | "wants" | null; // non-null tepat jika kind = spending
  archivedAt: string | null;
  createdAt: string;
};
```

### Akun

| Method & path                     | Body / query                                          | Sukses                                                                                                                           | Error                                                  |
| --------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `GET /api/accounts`               | `?include=archived` (opsional)                        | 200 `Account[]`: tanpa param hanya yang aktif, dengan param aktif + terarsip. Urut `type` (transaction dulu), lalu `lower(name)` | —                                                      |
| `POST /api/accounts`              | `{ name, type, subtype?, initialBalance? }`           | 201 `Account`                                                                                                                    | 400 `VALIDATION_ERROR`, 409 `ACCOUNT_NAME_TAKEN`       |
| `PATCH /api/accounts/[id]`        | subset dari `{ name, type, subtype, initialBalance }` | 200 `Account`                                                                                                                    | 400, 404 `ACCOUNT_NOT_FOUND`, 409 `ACCOUNT_NAME_TAKEN` |
| `DELETE /api/accounts/[id]`       | —                                                     | 200 `Account` (terarsip). Idempoten: arsip ulang tidak mengubah `archived_at`                                                    | 404                                                    |
| `POST /api/accounts/[id]/restore` | —                                                     | 200 `Account` (aktif). Idempoten                                                                                                 | 404                                                    |

`balance` dihitung dengan join ke view `account_balances` di query yang sama. Tidak ada endpoint saldo terpisah. `PATCH` dengan `initialBalance` membuat transaksi `adjustment` (bukan mengubah kolom `initial_balance`), lalu mengembalikan `Account` dengan `initialBalance` dan `balance` yang sudah bergeser.

### Kategori

| Method & path                       | Body / query                       | Sukses                                                                                                       | Error                                                                                                        |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `GET /api/categories`               | `?include=archived` (opsional)     | 200 `Category[]`, urut `kind` (income, saving, spending), `spending_type` (needs, wants), lalu `lower(name)` | —                                                                                                            |
| `POST /api/categories`              | `{ name, kind, spendingType? }`    | 201 `Category`                                                                                               | 400 (termasuk `spendingType` hilang untuk spending atau diisi untuk non-spending), 409 `CATEGORY_NAME_TAKEN` |
| `PATCH /api/categories/[id]`        | `{ name }` saja (`z.strictObject`) | 200 `Category`                                                                                               | 400 (termasuk mengirim `kind`/`spendingType`), 404 `CATEGORY_NOT_FOUND`, 409                                 |
| `DELETE /api/categories/[id]`       | —                                  | 200 `Category` (terarsip), idempoten                                                                         | 404                                                                                                          |
| `POST /api/categories/[id]/restore` | —                                  | 200 `Category` (aktif), idempoten                                                                            | 404                                                                                                          |

Filter per kind dilakukan di client (`useCategories`). Jumlah kategori kecil (puluhan), jadi ini bukan agregasi besar.

### Validasi (Zod, `lib/schemas/`)

- `name`: `trim`, 1–50 karakter.
- `initialBalance`: `z.int()`, −1e12..1e12, default 0.
- `accountCreateSchema`, `accountUpdateSchema` (`.partial()`, minimal satu field), `categoryCreateSchema` (discriminated union pada `kind`), `categoryRenameSchema` (`z.strictObject({ name })`).
- Bentrok nama di `PATCH` dideteksi dari error Postgres `23505` pada index `accounts_user_name_unique` / `categories_user_kind_name_unique`, lalu dipetakan ke 409. Error lain tetap 500.

### Kontrak untuk modul lain

- **Kepemilikan & status:** saat membuat atau mengubah transaksi/budget, `account_id`, `to_account_id`, dan `category_id` harus milik user dan **aktif**. Pengecualian: saat mengedit transaksi lama, referensi yang tidak diubah boleh tetap menunjuk item terarsip. Modul ini menyediakan `lib/server/ownership.ts`:

  ```ts
  // Mengembalikan baris yang dimiliki userId (aktif maupun terarsip); id yang tidak ditemukan tidak ikut.
  findOwnedAccounts(userId: string, ids: string[]): Promise<{ id: string; archivedAt: Date | null }[]>
  findOwnedCategory(userId: string, id: string): Promise<{ id: string; kind: CategoryKind; archivedAt: Date | null } | undefined>
  ```

  Pemetaan tipe transaksi → `kind` kategori (`income→income`, `saving→saving`, `expense→spending`) diekspor sebagai `CATEGORY_KIND_FOR` dari `lib/schemas/category.ts`. Yang memakainya adalah modul `transactions`.

- **SWR key:** `"/api/accounts"`, `"/api/accounts?include=archived"`, `"/api/categories"`, `"/api/categories?include=archived"`. Modul lain yang mengubah saldo (setiap mutasi transaksi) wajib memanggil `revalidateAccounts()` dari `hooks/use-accounts.ts`. Fungsi ini me-revalidate semua key yang berawalan `/api/accounts`.
- **Membuka modal dari modul lain:** `useUIStore().open("manageAccounts")` / `open("manageCategories", { kind })`. Host modal di-mount sekali di layout `(app)`, jadi form transaksi bisa membuka "Tambah akun" tanpa pindah halaman.

## Deliverables

### 1. Server

- Migrasi `adjustment` (constraint + view) di `db/schema.ts` dan `drizzle/`.
- `lib/server/accounts.ts`: query daftar akun + saldo, dan `updateAccount` yang membuat adjustment di dalam transaksi DB.
- `lib/schemas/account.ts`, `lib/schemas/category.ts`: schema Zod, tipe, konstanta enum, `CATEGORY_KIND_FOR`.
- `lib/default-categories.ts` + `seedDefaultCategories(tx, userId)` di `lib/server/categories.ts`: satu `insert … select … where not exists (select 1 from categories where user_id = $1)` dengan `on conflict do nothing`, aman untuk dua login bersamaan.
- `lib/server/users.ts`: `upsertUser` menjalankan upsert user + seed dalam satu transaksi DB.
- `lib/server/ownership.ts`: helper di atas.
- Route: `app/api/accounts/route.ts`, `app/api/accounts/[id]/route.ts`, `app/api/accounts/[id]/restore/route.ts`, dan tiga route yang sama untuk `categories`.

### 2. Client

- `hooks/use-accounts.ts`: `useAccounts({ includeArchived? })`, `revalidateAccounts()`, dan fungsi mutasi (`createAccount`, `updateAccount`, `archiveAccount`, `restoreAccount`) yang memanggil API lalu me-revalidate. Mutasi melempar `ApiError` supaya form bisa memasang `fields` lewat `setError`.
- `hooks/use-categories.ts`: `useCategories({ kind?, includeArchived? })` dan mutasinya, dengan pola yang sama.
- `hooks/use-profile.ts`: `useProfile()` + `updateProfile()` untuk `/api/me`.
- Tanpa optimistic update di modul ini. Daftarnya kecil dan revalidasi cukup cepat.

### 3. UI

- **Settings (`app/(app)/settings/page.tsx`)** menggantikan placeholder. Section berurutan:
  1. **Profil:** form `displayName`, `phone`, `location` (react-hook-form + `profileSchema`), tombol Simpan, toast sukses.
  2. **Keuangan:** tombol "Kelola akun" dan "Kelola kategori" (membuka modal lewat `useUIStore`), toggle "Sembunyikan nominal" (`hideAmounts`).
  3. **Tampilan:** `ThemeToggle` yang sudah ada.
  4. **Logout.**
     Bagian yang membaca data memakai SWR di komponen client dengan skeleton. Halaman tetap memenuhi aturan `cacheComponents`.
- **`components/modals/manage-accounts.tsx`** (di dalam `ResponsiveModal`):
  - Daftar dikelompokkan "Transaksi" dan "Aset". Setiap baris berisi nama, label subtype, dan saldo (`formatIDR`, disamarkan jika `hideAmounts`, merah jika negatif).
  - Tombol "Tambah akun" membuka form dengan field nama, type (segmented), subtype (select, opsional), dan saldo awal (input ribuan, boleh minus).
  - Tap baris membuka form edit. Di form edit ada "Arsipkan" dengan konfirmasi yang menyebut saldo saat ini jika ≠ 0.
  - Toggle "Tampilkan arsip" menampilkan item terarsip (redup) dengan tombol "Pulihkan".
- **`components/modals/manage-categories.tsx`:**
  - Tab Income / Saving / Spending. Tab Spending dikelompokkan Needs dan Wants.
  - Form tambah berisi nama dan, untuk spending, pilihan needs/wants. Form edit hanya berisi nama, dengan teks kecil yang menjelaskan bahwa jenis kategori tidak bisa diubah. Arsip/pulihkan sama seperti akun.
  - `modalProps.kind` memilih tab awal.
- **`components/modals/modal-host.tsx`** di-mount di `app/(app)/layout.tsx` dan merender modal sesuai `useUIStore().modal`. `components/settings/manage-accounts-placeholder.tsx` dihapus.
- Empty state di setiap daftar, error SWR dengan tombol "Coba lagi", tombol submit nonaktif + spinner saat request berjalan.
- Mobile: semua target sentuh ≥ 44×44 px, input 16 px, tanpa horizontal scroll di 360 px. Input nominal memakai `inputMode="numeric"`, dengan tombol ± untuk tanda minus karena keypad numerik iOS tidak punya minus.

## Acceptance criteria

- [ ] User baru yang login pertama kali punya 16 kategori default persis seperti tabel. Login kedua tidak menambah baris. User yang sudah ada tanpa kategori ter-seed pada login berikutnya. Dua `upsertUser` bersamaan tidak menghasilkan duplikat atau error.
- [ ] `POST /api/accounts` dengan `{ name: "BCA", type: "transaction", initialBalance: 100000 }` → 201, dan `GET` mengembalikan akun itu dengan `balance = 100000`.
- [ ] `balance` di `GET /api/accounts` sama dengan view `account_balances` setelah ada income, expense, dan transfer (transaksi dimasukkan langsung ke DB di tes).
- [ ] Akun dengan saldo awal 100.000 dan satu expense 20.000, di-`PATCH` `{ initialBalance: 150000 }` → respons `initialBalance = 150000`, `balance = 130000`. Kolom `initial_balance` tetap 100.000, dan ada satu transaksi `adjustment` +50.000 hari ini. `PATCH` ke 90.000 berikutnya membuat adjustment −60.000. `PATCH` dengan nilai yang sama tidak membuat baris. Dua `PATCH` bersamaan menghasilkan saldo sesuai urutan, bukan selisih ganda.
- [ ] Constraint: `adjustment` dengan kategori, dengan `amount = 0`, atau dengan `to_account_id` ditolak. `adjustment` negatif diterima. `expense` negatif tetap ditolak.
- [ ] `initialBalance: -500000` diterima. `initialBalance: 1.5`, `"100"`, atau `> 1e12` → 400 dengan `fields.initialBalance`.
- [ ] Nama duplikat (beda huruf besar/kecil, termasuk dengan akun terarsip) → 409 `ACCOUNT_NAME_TAKEN`, baik di POST maupun PATCH. Kategori: nama sama di kind berbeda diizinkan, di kind sama → 409 `CATEGORY_NAME_TAKEN`.
- [ ] `DELETE` mengarsipkan, `GET` tanpa param tidak lagi mengembalikannya, `?include=archived` mengembalikannya dengan `archivedAt`, dan `restore` mengembalikannya ke daftar aktif. Keduanya idempoten. Baris DB tidak pernah terhapus.
- [ ] `PATCH /api/categories/[id]` dengan `{ kind: "income" }` atau `{ spendingType: "wants" }` → 400. Dengan `{ name: "Makan Siang" }` → 200, dan transaksi yang mereferensikannya tetap menunjuk id yang sama.
- [ ] `POST /api/categories` spending tanpa `spendingType`, atau income dengan `spendingType` → 400.
- [ ] **Isolasi:** user B mendapat 404 untuk `PATCH`/`DELETE`/`restore` akun dan kategori milik A, dan `GET` B tidak pernah berisi data A. Body yang menyertakan `userId` lain diabaikan.
- [ ] Tanpa session, semua route → 401 `UNAUTHORIZED`.
- [ ] `findOwnedAccounts`/`findOwnedCategory` tidak mengembalikan baris milik user lain.
- [ ] Settings di 360 px: profil bisa disimpan, modal Kelola akun/kategori terbuka sebagai drawer, dan alur tambah → edit → arsip → pulihkan berjalan dengan daftar ter-update tanpa reload. Di ≥ 1024 px modal tampil sebagai dialog.
- [ ] Error validasi dari server tampil di field yang sesuai (`setError`), dan 409 tampil di field `name`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Tes

- **Unit (`tests/unit/`):** `account.spec.ts` dan `category.spec.ts` untuk schema (batas nama, integer/rentang saldo, discriminated union spendingType, strictObject rename, update kosong ditolak). `default-categories.spec.ts`: 16 item, nama unik per kind, spending selalu punya `spendingType`.
- **API (`tests/api/`, Supabase sungguhan, user `test-<uuid>`):**
  - `db-constraints.spec.ts` dan `account-balances.spec.ts` (yang sudah ada) diperluas untuk `adjustment`.
  - `accounts.spec.ts`: CRUD, `balance`, adjustment saat `initialBalance` berubah (termasuk paralel), urutan, `include=archived`, 409 dari POST/PATCH, idempotensi arsip/restore, 404 untuk id bukan UUID, isolasi user A/B, 401.
  - `categories.spec.ts`: hal yang sama, plus penolakan kind/spendingType di PATCH.
  - `seed-categories.spec.ts`: seed sekali, tidak seed ulang setelah semua diarsipkan, dua upsert paralel.
  - `ownership.spec.ts`: helper kepemilikan.
- **E2E:** tetap ditunda (lihat SPEC.md Open questions #2). Verifikasi UI dilakukan manual di 360 px dan 1024 px sebelum checkpoint.

## Boundaries (khusus modul ini)

- **Always:** pakai `onConflictDoNothing`/pemetaan `23505` untuk nama unik, bukan cek-lalu-insert (rawan race). Ambil saldo dari view, jangan menghitung di TS.
- **Ask first:** menambah kolom (mis. `sort_order`, `icon`, `color`), mengubah daftar kategori default setelah ada user ter-seed, atau membuat index unik menjadi parsial (`where archived_at is null`).
- **Never:** hard delete akun/kategori, mengizinkan perubahan `kind`/`spending_type`, atau menyalin daftar akun/kategori ke Zustand.

## Risiko

- **Transaksi Drizzle 1.0 RC dengan pooler transaction mode:** `db.transaction` seharusnya aman di pgbouncer transaction mode, tapi harus diverifikasi di tes seed. Jika bermasalah, seed dijadikan satu statement SQL tanpa transaksi eksplisit (statement itu sudah idempoten).
- **`cacheComponents` di Settings:** form profil butuh data user. Gunakan komponen client + SWR di dalam `<Suspense>`, jangan `auth()` di page tanpa boundary.
- **Keypad numerik iOS** tidak punya tanda minus. Mitigasinya tombol ± di input saldo awal.

## Open questions

1. ~~Daftar kategori default~~ **Diputuskan:** dipakai apa adanya.
2. ~~Label UI~~ **Diputuskan:** campuran (keputusan 10).
3. ~~Arsip akun dengan saldo ≠ 0~~ **Diputuskan:** peringatan, tetap diizinkan (keputusan 9).
4. ~~Edit saldo awal~~ **Diputuskan:** lewat transaksi `adjustment` (keputusan 3, 8).
