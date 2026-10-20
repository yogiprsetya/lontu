# Spec module: `foundation`

Bergantung pada: — · Dipakai oleh: semua modul · Indeks: [SPEC.md](SPEC.md)

## Objective

Menyediakan fondasi supaya modul lain tinggal menambah fitur: pengguna yang di-allowlist bisa login dengan Google dan melihat app shell kosong yang responsif. Skema DB lengkap sudah termigrasi. Setiap API route punya auth, validasi, dan format error yang seragam.

Di luar cakupan modul ini: CRUD apa pun selain `/api/me`, grafik, service worker.

## Deliverables

### 1. Dependency & scripts

- Tambah: `next-auth@5`, `zod@4`, `swr`, `zustand`, `react-hook-form`, `@hookform/resolvers`, `next-themes`, `server-only`. Dev: `vitest`. Playwright ditunda (tidak di foundation).
- Komponen shadcn: `drawer`, `dialog`, `sonner`, `skeleton`, `input`, `label`, `select`.
- Script `package.json`: `typecheck`, `test`, `test:watch`, `db:generate`, `db:migrate`, `db:studio`.
- `.env.example` diganti dengan nama variabel Auth.js v5:

```
DATABASE_URL=            # Supabase pooler, transaction mode (port 6543)
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
ALLOWED_EMAILS=          # dipisah koma
```

### 2. Skema database (`db/schema.ts` + `drizzle/`)

Semua tabel punya `user_id text not null references users(id) on delete cascade`, kecuali `users`. Uang memakai `bigint`. RLS: `alter table … enable row level security` di kelima tabel, tanpa policy.

| Tabel | Kolom | Constraint & index |
|---|---|---|
| `users` | `id text pk` (Google sub), `email text not null unique`, `display_name text`, `image text`, `phone text`, `location text`, `currency text not null default 'IDR'`, `created_at timestamptz default now()` | — |
| `accounts` | `id uuid pk default gen_random_uuid()`, `user_id`, `name text not null`, `type text not null check in ('transaction','asset')`, `subtype text` (`debit`/`ewallet`/`credit_card`/`investment`/`crypto`/`other`), `initial_balance bigint not null default 0`, `archived_at timestamptz`, `created_at` | unique `(user_id, lower(name))` |
| `categories` | `id uuid pk`, `user_id`, `name text not null`, `kind text not null check in ('income','saving','spending')`, `spending_type text check in ('needs','wants')`, `archived_at timestamptz`, `created_at` | check `(kind = 'spending') = (spending_type is not null)`; unique `(user_id, kind, lower(name))` |
| `transactions` | `id uuid pk`, `user_id`, `type text not null check in ('income','expense','saving','transfer')`, `amount bigint not null check > 0`, `date date not null`, `account_id uuid not null references accounts`, `to_account_id uuid references accounts`, `category_id uuid references categories`, `description text`, `receipt_url text`, `created_at`, `updated_at`, `deleted_at timestamptz` | check `(type = 'transfer') = (to_account_id is not null)`; check `(type = 'transfer') = (category_id is null)`; check `to_account_id <> account_id`; index `(user_id, date desc, id desc)`, `(user_id, account_id)`, `(user_id, to_account_id)`, `(user_id, category_id, date)` |
| `budgets` | `id uuid pk`, `user_id`, `category_id uuid not null references categories`, `year int not null`, `month int not null check 1..12`, `amount bigint not null check >= 0`, `created_at` | unique `(user_id, category_id, year, month)` |

Tambahan dibanding dokumen sumber: `accounts.subtype` (supaya kartu kredit bisa dikenali untuk aturan saldo negatif), `categories.archived_at` (arsip kategori yang sudah dipakai), `users.image`, dan dua CHECK konsistensi transfer. Hal yang masih bergantung pada modul pengguna (mis. kategori `kind` harus cocok dengan tipe transaksi) dicek di API, bukan dengan constraint.

**View `account_balances`** (migrasi SQL kustom):

```sql
create view account_balances with (security_invoker = true) as
select a.id as account_id, a.user_id,
  a.initial_balance + coalesce(sum(case
    when t.type = 'income'                              then t.amount
    when t.type in ('expense','saving')                 then -t.amount
    when t.type = 'transfer' and t.account_id = a.id    then -t.amount
    when t.type = 'transfer' and t.to_account_id = a.id then t.amount
  end), 0)::bigint as balance
from accounts a
left join transactions t
  on t.deleted_at is null and (t.account_id = a.id or t.to_account_id = a.id)
group by a.id;
```

### 3. Auth

- `lib/auth.ts`: Auth.js v5, provider Google, `session: { strategy: "jwt" }`. Callback `signIn` menolak jika email tidak ada di `ALLOWED_EMAILS` (ke `/login?error=AccessDenied`), lalu upsert `users`. Callback `jwt`/`session` memasang `session.user.id = token.sub`.
- `app/api/auth/[...nextauth]/route.ts` mengekspor handler.
- `proxy.ts`: redirect optimistik ke `/login` jika cookie session tidak ada, untuk semua halaman kecuali `/login`, aset statis, `manifest.webmanifest`. Semua `/api/*` dilewati: route API memverifikasi sendiri lewat `withAuth` dan harus membalas 401 JSON, bukan redirect. Proxy bukan sumber kebenaran. `withAuth` tetap memverifikasi.
- `app/(auth)/login/page.tsx`: tombol "Masuk dengan Google" dan pesan jika akses ditolak.

### 4. API helper

- `lib/api/errors.ts`: `badRequest(zodError)` → 400 `VALIDATION_ERROR` + `fields`; `unauthorized()` → 401; `notFound(code?)` → 404; `conflict(code, message)` → 409; `serverError(err)` → 500 `INTERNAL` (log detail di server, pesan generik ke client).
- `lib/api/with-auth.ts`: `withAuth(handler)` memanggil `auth()`, mengembalikan 401 jika tidak ada session, meneruskan `{ userId, params }` ke handler, dan menangkap error tak terduga menjadi `serverError`.
- `GET`/`PATCH /api/me` dengan `profileSchema` (`displayName`, `phone`, `location`; `currency` hanya `'IDR'` di MVP).

### 5. Util client

- `lib/money.ts`: `formatIDR(n)` → `Rp10.000` (`Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`), `parseIDR("10.000") → 10000`, `formatThousands` untuk input, `abbreviateIDR(1_200_000) → "1,2 jt"` (rb, jt, M, T).
- `lib/fetcher.ts`: `fetcher` dan `ApiError { status, code, message, fields }`. `SWRConfig` global di `app/providers.tsx` bersama `ThemeProvider` (next-themes, default `system`) dan `Toaster`.
- `stores/period.ts`: `usePeriodStore { year, month | null, setPeriod }`, default bulan berjalan (Asia/Jakarta).
- `stores/ui.ts`: `useUIStore { modal: 'manageAccounts' | 'manageCategories' | null, modalProps, open, close, hideAmounts, toggleHideAmounts }`. Hanya `hideAmounts` yang di-`persist`.

### 6. App shell

- `app/(app)/layout.tsx`: di bawah `lg`, satu kolom + **BottomNav** 5 slot (Dashboard, Transactions, **+**, Budget, More). Di `lg` ke atas, **Sidebar** dan bottom nav disembunyikan.
- Tombol **+** membuka menu Income / Expense / Saving / Transfer yang menuju `/add/[type]` (halaman placeholder di modul ini).
- More berisi Settings (placeholder) dan Logout.
- `components/layout/responsive-modal.tsx`: Drawer di bawah `lg`, Dialog di `lg` ke atas, dengan API yang sama.
- Halaman dashboard/transactions/budget/expenses/settings berupa placeholder dengan judul dan empty state.
- `app/layout.tsx`: hanya font Inter (`--font-sans`), `lang="id"`, metadata "Lontu", `viewport.themeColor`, padding `env(safe-area-inset-bottom)` di bottom nav, `tabular-nums` untuk nominal.
- Token warna di `globals.css`: `--income` (hijau), `--expense` (merah), `--budget` (kuning), `--transfer` (ungu), masing-masing untuk light/dark dan lolos 4.5:1 terhadap background.
- `app/manifest.ts`: name, ikon 192/512 + maskable, `display: "standalone"`, `start_url: "/dashboard"`, shortcut "Tambah Expense" → `/add/expense`. Ikon dipulihkan dari commit `c9de1eb`. Ikon maskable dibuat dari ikon 512 dengan padding safe zone.

## Acceptance criteria

- [ ] Email di `ALLOWED_EMAILS` bisa login dengan Google, mendarat di `/dashboard`, dan baris `users` tercipta. Login kedua tidak menduplikasi baris.
- [ ] Email lain ditolak dan kembali ke `/login` dengan pesan.
- [ ] Mengakses `/dashboard` tanpa session dialihkan ke `/login`. `GET /api/me` tanpa session → 401 `{ error: { code: "UNAUTHORIZED" } }`.
- [ ] `PATCH /api/me` dengan body tidak valid → 400 dengan `fields` per field.
- [ ] `pnpm db:migrate` pada DB kosong membuat 5 tabel, view, index, dan RLS aktif. Query lewat REST Supabase dengan anon key mengembalikan 0 baris.
- [ ] Constraint menolak: transfer tanpa `to_account_id`, transfer ke akun yang sama, expense tanpa kategori, kategori spending tanpa `spending_type`, `amount <= 0`.
- [ ] `account_balances` benar untuk skenario: saldo awal 100.000, income 50.000, expense 20.000, transfer keluar 10.000 ke akun B, satu expense soft-deleted → A = 120.000, B = saldo awal B + 10.000.
- [ ] Di lebar 360 px bottom nav tampil dengan 5 slot ≥ 44×44 px dan tidak ada horizontal scroll. Di 1024 px sidebar tampil dan bottom nav hilang.
- [ ] ResponsiveModal tampil sebagai Drawer di mobile dan Dialog di desktop.
- [ ] Dark mode mengikuti sistem dan bisa diubah manual. Pilihan bertahan setelah reload.
- [ ] Lighthouse menyatakan manifest installable.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Tes

- Unit: `money.ts` (format, parse termasuk input kosong/non-digit, singkatan di batas rb/jt/M/T), `profileSchema`, `errors.ts` (bentuk JSON).
- API: `withAuth` (tanpa session → 401, error tak terduga → 500 tanpa bocor detail), `/api/me` GET/PATCH, termasuk user hanya bisa membaca profil sendiri.
- DB: tes constraint dan `account_balances` terhadap `DATABASE_URL` (Supabase), dengan user tes yang dihapus setelah tes.
- E2E: ditunda, tidak di foundation (lihat Open questions #2 di SPEC.md).

## Risiko

- **Auth.js v5 + Next 16.4:** cek kompatibilitas peer dependency saat install. Jika ada masalah, berhenti dan tanya sebelum mengganti library.
- **Drizzle 1.0 RC:** API (`drizzle-orm/postgres-js`, relations) berbeda dari 0.x. Ikuti dokumen dari versi yang terpasang.
- **Pooler Supabase transaction mode** tidak mendukung prepared statement, jadi wajib `prepare: false`. Migrasi dijalankan lewat koneksi langsung (port 5432) jika pooler menolak DDL.
- **`cacheComponents: true`:** layout `(app)` membaca session (data dinamis), jadi bagian dinamis harus dibungkus `<Suspense>`. Baca `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.
