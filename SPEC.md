# Spec: Lontu, Pencatatan Keuangan Pribadi

Status: draft · 2026-10-20 · @Yogi
Sumber: "Spesifikasi Aplikasi Pencatatan Keuangan" (Oct 20, 2026), dengan keputusan yang direvisi di bagian [Keputusan terkunci](#keputusan-terkunci).

File ini berisi **capability map** (indeks modul) dan aturan yang berlaku untuk semua modul. Detail per modul ada di `SPEC-<module-id>.md`.

## Objective

Aplikasi PWA mobile-first untuk mencatat keuangan pribadi (referensi UI: Monsy): income, expense, saving, transfer antar akun, budget bulanan per kategori, dan dashboard ringkasan.

- **Pengguna:** hanya pemilik (login Google dengan allowlist email). Model data tetap multi-user (`user_id` di setiap tabel), jadi membuka pendaftaran nanti tidak butuh migrasi data.
- **Sukses berarti:** mencatat transaksi dari ponsel cukup beberapa tap, saldo setiap akun selalu benar, budget yang hampir habis terlihat sebelum akhir bulan, dan data terakhir tetap bisa dilihat saat offline.

## Capability map

| Module id | Tanggung jawab | Bergantung pada |
|---|---|---|
| `foundation` | Auth.js Google + allowlist, skema Drizzle untuk 5 tabel + view + RLS deny-all, `withAuth`, format error, `money.ts`, app shell (bottom nav / sidebar, ResponsiveModal), SWRConfig, store Zustand, theme, manifest | — |
| `accounts-categories` | CRUD akun & kategori, modal Manage Accounts / Manage Categories, seed kategori default, saldo dari view `account_balances`, halaman Settings | foundation |
| `transactions` | Form Income/Expense/Saving/Transfer, All Transactions (filter di URL, paginasi cursor, totals), halaman Expenses, edit/hapus + undo, export CSV, optimistic update | accounts-categories |
| `budgets` | CRUD budget per kategori/bulan, salin dari bulan lalu, query `budgetUsage`, ringkasan Needs/Wants | accounts-categories, transactions |
| `dashboard` | Query `dashboardSummary`, kartu + % vs periode lalu, Account Balance, grafik Expense Activity & donut, Budget Summary | transactions, budgets |
| `pwa-offline` | Service worker Serwist, cache SWR di IndexedDB, antrean transaksi offline, banner install & update | transactions |

**Urutan build:** foundation → accounts-categories → transactions → budgets → dashboard → pwa-offline

Kontrak antar modul ditulis di spec modul penyedia. Contoh: bentuk respons `GET /api/accounts` ditulis di `SPEC-accounts-categories.md`.

## Keputusan terkunci

Keputusan ini menggantikan bagian dokumen sumber yang bertentangan.

1. **Auth: Auth.js (`next-auth` v5) dengan provider Google saja.** Tanpa Firebase. Session JWT di cookie. Callback `signIn` menolak email di luar `ALLOWED_EMAILS` dan meng-upsert baris `users`. `users.id` = Google `sub` (text).
2. **Database: Supabase hanya sebagai hosting Postgres, diakses lewat Drizzle** (`drizzle-orm` + `postgres`, `DATABASE_URL` memakai pooler transaction mode, `prepare: false`). Tanpa `supabase-js`, tanpa service role key.
3. **"RPC" menjadi fungsi query TypeScript** di `lib/server/queries/` (`transactionTotals`, `dashboardSummary`, `budgetUsage`) yang menjalankan SQL agregat lewat Drizzle. Agregasi tetap terjadi di database. Hanya view `account_balances` yang hidup di SQL (lewat migrasi).
4. **Keamanan data:** setiap query difilter `user_id` dari session. RLS diaktifkan di semua tabel tanpa policy (deny-all), sebagai pengaman jika kredensial anon/REST Supabase bocor. Role koneksi Drizzle adalah pemilik tabel, jadi tidak terkena RLS.
5. **Transfer digabung ke modul `transactions`:** tabel, daftar, dan cache SWR-nya sama.
6. **Deploy ke Vercel.** Satu project, environment Production + Preview.
7. Tetap dari dokumen sumber: semua data lewat API route (tanpa server action), shadcn/ui dengan Base UI, Recharts lewat shadcn chart, `react-hook-form` + Zod, SWR untuk data server, Zustand hanya untuk state UI, uang sebagai bigint rupiah (integer, tanpa float).
8. **5 tabel** (`users`, `accounts`, `categories`, `transactions`, `budgets`). Angka "6 tabel" di roadmap sumber dianggap typo.

## Tech stack

| Bagian | Pilihan | Versi (terpasang / target) |
|---|---|---|
| Framework | Next.js App Router, `cacheComponents: true`, `proxy.ts` (pengganti middleware) | 16.4.2 |
| UI | React 19, Tailwind v4, shadcn (style `base-vega`, `@base-ui/react`), lucide-react, `next-themes` | 19.3.0 / tailwind 4 |
| Auth | `next-auth` v5 (Auth.js), Google provider | ditambahkan di foundation |
| DB | Supabase Postgres, `drizzle-orm` + `drizzle-kit`, `postgres` | 1.0.0-rc.4 / ^3.4.9 |
| Validasi & form | `zod` v4, `react-hook-form`, `@hookform/resolvers` | ditambahkan di foundation |
| Data client | `swr`, `zustand` | ditambahkan di foundation |
| Grafik | shadcn chart (Recharts) | modul dashboard |
| PWA | `@serwist/next`, `idb-keyval` | modul pwa-offline |
| Test | Vitest, Playwright | ditambahkan di foundation |
| Package manager | pnpm | 12.5.1 |

Drizzle 1.0 masih RC dan API-nya berbeda dari 0.x. Untuk Next.js 16, baca `node_modules/next/dist/docs/` sebelum memakai API apa pun (lihat `AGENTS.md`).

## Commands

```bash
pnpm dev                 # next dev
pnpm build               # next build
pnpm start               # next start
pnpm lint                # eslint
pnpm typecheck           # tsc --noEmit                     (ditambahkan di foundation)
pnpm test                # vitest run                        (ditambahkan di foundation)
pnpm test:watch          # vitest
pnpm test:e2e            # playwright test
pnpm db:generate         # drizzle-kit generate
pnpm db:migrate          # drizzle-kit migrate
pnpm db:studio           # drizzle-kit studio
```

Gerbang sebelum commit: `pnpm lint && pnpm typecheck && pnpm test`.

## Project structure

```
app/
  (auth)/login/page.tsx
  (app)/layout.tsx                 # shell: bottom nav (<lg), sidebar (≥lg)
  (app)/dashboard/page.tsx
  (app)/transactions/page.tsx      # All Transactions
  (app)/expenses/page.tsx
  (app)/budget/page.tsx
  (app)/add/[type]/page.tsx        # income | expense | saving | transfer
  (app)/settings/page.tsx
  api/**/route.ts
  manifest.ts
components/
  ui/                              # shadcn, jangan diedit manual kecuali lewat CLI
  layout/                          # BottomNav, Sidebar, ResponsiveModal
  forms/                           # TransactionForm, TransferForm, BudgetForm
  modals/                          # ManageAccounts, ManageCategories
  dashboard/
db/
  schema.ts                        # tabel + view Drizzle
  index.ts                         # klien db, import 'server-only'
drizzle/                           # migrasi hasil drizzle-kit + SQL kustom (view, RLS)
lib/
  schemas/                         # Zod, dipakai client & server
  server/queries/                  # query agregat, import 'server-only'
  api/with-auth.ts, errors.ts
  auth.ts                          # konfigurasi Auth.js
  fetcher.ts                       # fetcher SWR + ApiError
  money.ts                         # format & parse IDR
  utils.ts
hooks/                             # useAccounts, useTransactions, ... (SWR)
stores/                            # Zustand: period.ts, ui.ts
proxy.ts                           # redirect optimistik ke /login
tests/unit/                        # Vitest: schema, util, query builder
tests/api/                         # Vitest: route handler terhadap DB test
e2e/                               # Playwright
```

Transfer tidak punya halaman `(app)/transfer` sendiri. Transfer adalah `add/transfer`, dibuka dari tombol **+**.

## Code style

- TypeScript strict. Path alias `@/*`. Nama file kebab-case, komponen PascalCase, hook `useX`.
- Format string dan indentasi mengikuti file yang sudah ada (double quotes di file hasil create-next-app/shadcn). Jangan memformat ulang file yang tidak disentuh.
- Modul server diawali `import "server-only"`. Komponen client diawali `"use client"`.
- Zod v4: pakai `z.uuid()` dan `z.flattenError(err)` (`.flatten()` dan `z.string().uuid()` sudah deprecated).
- Uang: `number` integer di TypeScript (maks 1e12, masih aman di bawah 2^53), `bigint({ mode: "number" })` di Drizzle. Tanggal transaksi: string `YYYY-MM-DD` di API dan kolom `date` di DB. "Hari ini" dihitung di zona `Asia/Jakarta`.
- Komentar hanya untuk alasan yang tidak terlihat dari kode.

Bentuk route handler yang menjadi acuan:

```ts
// app/api/accounts/route.ts
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { withAuth } from "@/lib/api/with-auth";
import { badRequest, conflict } from "@/lib/api/errors";
import { accountSchema } from "@/lib/schemas/account";

export const GET = withAuth(async (_req, { userId }) => {
  const rows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNull(accounts.archivedAt)));
  return Response.json(rows);
});

export const POST = withAuth(async (req, { userId }) => {
  const parsed = accountSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error);

  const [row] = await db
    .insert(accounts)
    .values({ ...parsed.data, userId })
    .onConflictDoNothing()
    .returning();
  if (!row) return conflict("ACCOUNT_NAME_TAKEN", "Nama akun sudah dipakai");
  return Response.json(row, { status: 201 });
});
```

Format error seragam: `{ error: { code, message, fields? } }`. `fields` berasal dari `z.flattenError(err).fieldErrors` dan di client dipasang ke form lewat `setError`.

## Testing strategy

| Level | Tool | Lokasi | Cakupan |
|---|---|---|---|
| Unit | Vitest | `tests/unit/` | Schema Zod, `money.ts`, encode/decode cursor, URL ↔ filter, bucket periode, logika % vs periode lalu |
| API / query | Vitest + Postgres test | `tests/api/` | Route handler dipanggil langsung (`GET(req)`), terhadap DB sungguhan. Wajib ada tes isolasi `user_id` (user B tidak bisa membaca/mengubah data user A) untuk setiap resource |
| E2E | Playwright (viewport 360×800 + desktop) | `e2e/` | Login → tambah akun → tambah expense → saldo & dashboard berubah; transfer; filter transaksi bertahan setelah refresh |
| NFR | Lighthouse CI, axe | CI | Target di bagian Success criteria |

- Logika baru ditulis dengan TDD (tes merah dulu). Bug diperbaiki dengan tes yang mereproduksinya lebih dulu.
- Tes API memakai DB Postgres terpisah (`DATABASE_URL_TEST`), bukan mock. Lihat Open questions #1.
- Coverage bukan target angka. Yang wajib: setiap schema, setiap query agregat, dan setiap route punya tes kepemilikan.

## Boundaries

**Always**
- Filter setiap query dengan `userId` dari session. Cek kepemilikan akun/kategori yang direferensikan body request.
- Validasi ulang body/query dengan Zod di server, walau client sudah memvalidasi.
- Simpan dan hitung uang sebagai integer rupiah.
- Jalankan `pnpm lint && pnpm typecheck && pnpm test` sebelum commit. Pakai conventional commits.
- Baca panduan Next.js di `node_modules/next/dist/docs/` sebelum memakai API Next.
- Perbarui spec modul terkait lebih dulu jika keputusan berubah, baru kodenya.

**Ask first**
- Mengubah skema DB di luar yang tertulis di spec, atau menulis migrasi yang mengubah/menghapus kolom.
- Menambah dependency yang tidak tercantum di Tech stack.
- Mengubah capability map, alur auth, atau `next.config.ts` (mis. `cacheComponents`).
- Hard delete data pengguna. Default selalu soft delete atau arsip.

**Never**
- Commit `.env` atau secret apa pun. Mengekspos `DATABASE_URL` / `AUTH_SECRET` ke bundle client.
- Menyimpan uang sebagai float, atau melakukan agregasi ribuan baris di client.
- Menyalin data server (akun, kategori, transaksi) ke Zustand.
- Memakai server action untuk mutasi data.
- Menghapus, men-skip, atau melemahkan tes yang gagal demi build hijau.

## Success criteria (lintas modul)

Kriteria fungsional per fitur ada di setiap `SPEC-<module>.md`. Target non-fungsional:

| Metrik | Target | Cara ukur |
|---|---|---|
| Lighthouse Performance (mobile) | ≥ 90 | Lighthouse CI per PR |
| LCP | < 2,5 s di 4G | Vercel Speed Insights |
| INP | < 200 ms | Vercel Speed Insights |
| CLS | < 0,1 | Lighthouse |
| JS first load per halaman | < 200 KB gzip | `@next/bundle-analyzer` |
| PWA | Installable, data terakhir tampil di mode pesawat | Lighthouse + uji manual |
| Aksesibilitas | Lighthouse ≥ 95, kontras teks ≥ 4.5:1 | Lighthouse + axe |
| Mobile | Layout benar di lebar 360 px, target sentuh ≥ 44×44 px, input font 16 px | Playwright screenshot + review |

## Di luar MVP (Fase 2)

Scan struk (OCR) dan upload receipt, transaksi berulang, multi-currency, pendaftaran terbuka (tanpa allowlist).

## Open questions

1. **DB untuk tes API:** Postgres lokal via Docker (`docker run postgres:17`) atau Supabase CLI (`supabase start`)? Saya condong ke Docker biasa karena lebih ringan, dan kita tidak memakai fitur Supabase lain.
2. **Login di E2E:** Google OAuth tidak bisa diotomasi. Usulan: provider Credentials khusus tes, hanya aktif jika `E2E_AUTH=1` dan bukan production. Boleh?
3. **Saldo tidak cukup saat transfer/expense:** dokumen sumber bilang "peringatan, tetap izinkan". Tetap begitu?
4. **Biaya admin transfer** (checkbox yang membuat expense terpisah) dan **saran 50/30/20** di Budget: masuk MVP atau Fase 2?
5. **Halaman Expenses vs `/transactions?type=expense`:** isinya hampir sama. Pertahankan dua halaman, atau Expenses cukup jadi preset filter?
6. Nama package masih `"my"`. Ganti jadi `lontu`?
