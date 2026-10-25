# Implementation Plan: Lontu

Sumber: [SPEC.md](../SPEC.md) · 2026-10-20

Indeks plan per modul, mengikuti urutan build di capability map. Modul berikutnya (`pwa-offline`) direncanakan setelah `SPEC-pwa-offline.md` ditulis.

| Modul | Spec | Phase | Task | Status |
|---|---|---|---|---|
| `foundation` | [SPEC-foundation.md](../SPEC-foundation.md) | 1–4 | T1–T9 | Selesai (T9 ditunda) |
| `accounts-categories` | [SPEC-accounts-categories.md](../SPEC-accounts-categories.md) | 5–7 | T10–T21 | Selesai (review Yogi tertunda) |
| `transactions` | [SPEC-transactions.md](../SPEC-transactions.md) | 8–12 | T22–T41 | Kode selesai (T22–T41). Cek manual 360×800/1024 dan review Yogi di checkpoint G–K tertunda |
| `budgets` | [SPEC-budgets.md](../SPEC-budgets.md) | 13–15 | T42–T54 | Kode selesai (T42–T54). Cek manual 360×800/1024 dan review Yogi di checkpoint L–N tertunda |
| `dashboard` | [SPEC-dashboard.md](../SPEC-dashboard.md) | 16–18 | T55–T65 | Kode selesai (T55–T65). Cek manual 360×800/1024, Lighthouse, dan review Yogi di checkpoint O–Q tertunda. JS first load di atas 200 KB (lihat Catatan ukuran) |

---

# Modul `foundation`

Spec: [SPEC-foundation.md](../SPEC-foundation.md)

## Overview

Hasil akhir: email di allowlist bisa login dengan Google dan melihat app shell kosong yang responsif. Skema DB lengkap sudah termigrasi (5 tabel, view `account_balances`, RLS deny-all). `/api/me` menjadi contoh route pertama dengan `withAuth`, validasi Zod, dan format error yang seragam.

## Kondisi repo saat ini

- Scaffold Next.js 16.4.2. `next.config.ts` sudah memakai `cacheComponents: true` dan `partialPrefetching: true`.
- shadcn `base-vega` sudah terpasang, baru ada `button`. `drizzle-orm`/`drizzle-kit` 1.0.0-rc.4 dan `postgres` sudah terpasang, tapi belum ada `db/` atau `drizzle/`.
- `app/layout.tsx` masih bawaan create-next-app (`lang="en"`, judul "Create Next App", tiga font).
- `.env.example` masih memakai nama variabel NextAuth v4 (`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`).
- Ikon PWA ada di commit `c9de1eb` (`public/icons/icon-{192,512}.png`). Belum ada versi maskable.
- Belum ada framework tes. `tests/pwa.spec.ts` lama memakai `node:test` dan tidak dipulihkan.

## Dependency graph

```
T1 Tooling (deps, scripts, Vitest, money.ts)
 ├── T2 Skema DB + migrasi + RLS + view ──────┐
 ├── T3 Login Google (auth.ts, proxy, /login) ─┤
 │                                             └── T4 withAuth + errors + /api/me
 └── T5 Providers + root layout + token + stores
       └── T6 App shell (nav, + menu, placeholder)   ← juga butuh T3 (logout, session)
             ├── T7 ResponsiveModal
             └── T8 Manifest + ikon
```

T2 dan T3 tidak saling bergantung, kecuali upsert `users` di callback `signIn` yang butuh tabel `users`. Karena itu T2 dikerjakan lebih dulu. T5 bisa dikerjakan paralel dengan T2–T4.

## Phases

| Phase | Plan | Todo | Task | Checkpoint |
|---|---|---|---|---|
| 1. Fondasi teknis | [plan-1.md](plan-1.md) | [todo-1.md](todo-1.md) | T1–T3 | A |
| 2. Kontrak API | [plan-2.md](plan-2.md) | [todo-2.md](todo-2.md) | T4 | B |
| 3. UI shell | [plan-3.md](plan-3.md) | [todo-3.md](todo-3.md) | T5–T8 | C |
| ~~4. Verifikasi end-to-end~~ | [plan-4.md](plan-4.md) | [todo-4.md](todo-4.md) | ~~T9~~ ditunda | Foundation selesai setelah phase 3 |

Phase dikerjakan berurutan. Pengecualian: T5 (phase 3) hanya butuh T1 dan boleh dikerjakan paralel dengan phase 1–2.

## Aturan lintas phase

- **Risiko tinggi didahulukan:** Drizzle 1.0 RC dan Auth.js v5 di Next 16.4 ada di phase 1.
- **Satu task = satu commit conventional**, dengan gerbang `pnpm lint && pnpm typecheck && pnpm test`.
- Keputusan dan risiko yang berlaku untuk satu phase ditulis di `plan-<phase>.md` masing-masing.

## Keputusan open questions (2026-10-20)

1. **DB tes:** Supabase lewat `DATABASE_URL`, tanpa DBMS lokal. Tes membuat user `test-<uuid>` dan menghapusnya setelah selesai.
2. **Login E2E:** ditunda. E2E (T9) dikeluarkan dari foundation pada 2026-10-20.
3. **Nama package:** `lontu` (T1).
4. **Ikon maskable:** dibuat dari ikon 512 dengan padding safe zone (T8).
5. **Font:** Inter saja sebagai `--font-sans` (T5).

---

# Modul `accounts-categories`

Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md) · 2026-10-20

## Overview

Akun dan kategori bisa dikelola dari Settings, saldo per akun berasal dari view `account_balances`, user baru otomatis punya 16 kategori default, dan mengubah saldo awal mencatat transaksi `adjustment`. Modul ini juga menyelesaikan kontrak server yang dipakai `transactions` (`GET /api/accounts`, `GET /api/categories`, helper kepemilikan, `revalidateAccounts`).

## Dependency graph

```
T10 Migrasi adjustment ─────────────┐
T11 Seed kategori default ──────────┼──────────────┐
                                    ▼              │
T12 GET/POST accounts ──► T13 PATCH/DELETE/restore akun (+adjustment)
  │                                 │              │
  └──► T14 GET/POST categories ◄────┼──────────────┘
         ├──► T15 rename/arsip/restore kategori
         └──► T16 ownership helpers
T17 Settings + profil (hanya butuh /api/me)
  └──► T18 Kelola akun: daftar + tambah (butuh T12) ──► T19 edit/arsip/pulihkan (butuh T13)
         └──► T20 Kelola kategori: daftar + tambah (butuh T14) ──► T21 rename/arsip (butuh T15)
```

## Phases

| Phase | Plan | Todo | Task | Checkpoint |
|---|---|---|---|---|
| 5. Data akun & kategori | [plan-5.md](plan-5.md) | [todo-5.md](todo-5.md) | T10–T13 | D |
| 6. API kategori & kontrak | [plan-6.md](plan-6.md) | [todo-6.md](todo-6.md) | T14–T16 | E |
| 7. UI Settings & modal | [plan-7.md](plan-7.md) | [todo-7.md](todo-7.md) | T17–T21 | F (modul selesai) |

Phase dikerjakan berurutan. Pengecualian: T17 hanya butuh foundation dan boleh dikerjakan paralel dengan phase 5–6. Di phase 7, T19 dan T20 bisa dikerjakan paralel.

## Aturan lintas phase

- **Risiko tinggi didahulukan:** migrasi `adjustment` (T10) dan transaksi DB + `for update` (T13) ada di phase 5.
- **Kontrak server selesai sebelum UI** (Checkpoint E), supaya modul `transactions` bisa dispec dan dimulai paralel dengan phase 7 jika perlu.
- Satu task = satu commit conventional, dengan gerbang `pnpm lint && pnpm typecheck && pnpm test`.

## Keputusan (2026-10-20)

1. **Seed** saat login, hanya jika user belum punya baris kategori sama sekali.
2. **Hapus = arsip**, dengan restore. Tanpa hard delete.
3. **Kategori hanya bisa di-rename.** `kind`/`spending_type` dikunci.
4. **`subtype` opsional dan bebas, saldo negatif diizinkan.**
5. **Edit saldo awal → transaksi `adjustment`.** Butuh migrasi constraint + view (disetujui). `adjustment` tidak bisa dibuat lewat UI/API transaksi.
6. **Kategori default** dipakai apa adanya. **Label UI** campuran. **Arsip akun bersaldo** hanya diberi peringatan.

---

# Modul `transactions`

Spec: [SPEC-transactions.md](../SPEC-transactions.md) · 2026-10-21

## Overview

Pemilik bisa mencatat income, expense, saving, dan transfer (dengan biaya admin) dari ponsel, melihat riwayat per tanggal dengan filter di URL, total, paginasi cursor, mengedit, menghapus dengan undo, dan mengekspor CSV. Saldo akun ikut berubah tanpa reload. `/expenses` adalah preset dari daftar yang sama. Tidak ada perubahan skema dan tidak ada migrasi.

## Kondisi repo saat ini

- Schema `transactions` (5 constraint, 4 index, tipe `adjustment`) dan view `account_balances` sudah ada. Satu-satunya penulis `adjustment` adalah `updateAccount` di `lib/server/accounts.ts`.
- Sudah siap dipakai: `withAuth`, `lib/api/errors.ts` (belum ada `fieldError`/`transactionNotFound`), `findOwnedAccounts`/`findOwnedCategory`, `CATEGORY_KIND_FOR`, `todayInJakarta`, `MoneyInput`, `FormField`, `applyServerErrors`, `sendJSON`, `revalidateAccounts`, `ResponsiveModal`, `ModalHost`, `useUIStore().open(...)`, `hideAmounts`, token warna `--income/--expense/--budget/--transfer`.
- Masih placeholder: `app/(app)/add/[type]`, `transactions`, `expenses`. Belum ada `lib/server/queries/`, `hooks/use-transactions.ts`, dan komponen shadcn `checkbox`.
- Vitest: `environment: "node"`, hanya `tests/**/*.spec.ts`. Tidak ada tes komponen, jadi logika hook dipisah menjadi fungsi murni yang dites unit. UI diverifikasi manual/headless seperti T17–T21.
- SWR `useSWRInfinite` menyimpan agregat di key `$inf$<key halaman pertama>` dan tiap halaman di key halamannya sendiri (`node_modules/swr/dist/infinite/index.js`). `mutate(matcher)` melihat kedua jenis key.

## Dependency graph

```
T22 POST simple ─┬─► T23 POST transfer + biaya admin ──────────────────────────────┐
                 │                                                                 │
                 ├─► T24 Form simple ─► T25 Peringatan saldo ─► T26 Form transfer ◄┘ (butuh T23, T25)
                 │        │
                 ├─► T27 GET list + cursor ─► T28 Daftar UI ◄─ T24 (file hook)
                 │        │                       │
                 │        └─► T29 Filter API ─┬─► T30 Totals API ─────────┐
                 │                            ├─► T40 Export API ─┐       │
                 │                            │                   │       │
                 │           T28 + T29 ─► T31 URL filter + periode ─┬─► T32 Strip total (butuh T30)
                 │                                                  ├─► T33 Panel filter ─► T39 /expenses
                 │                                                  └─► T41 Menu ekspor (butuh T40)
                 │
                 ├─► T34 GET/PATCH [id] (butuh T23) ─► T35 Edit simple (butuh T25, T28) ─► T36 Edit transfer + adjustment (butuh T26)
                 └─► T37 DELETE/restore ─► T38 Hapus + undo (butuh T35, T36)
```

Task sisi server (T29, T30, T34, T37, T40) tidak bergantung pada UI dan bisa dikerjakan kapan saja setelah prasyaratnya, termasuk paralel dengan task UI di phase yang sama.

## Phases

| Phase | Plan | Todo | Task | Checkpoint |
|---|---|---|---|---|
| 8. Catat transaksi | [plan-8.md](plan-8.md) | [todo-8.md](todo-8.md) | T22–T26 | G |
| 9. Daftar transaksi | [plan-9.md](plan-9.md) | [todo-9.md](todo-9.md) | T27–T28 | H |
| 10. Periode, total, filter | [plan-10.md](plan-10.md) | [todo-10.md](todo-10.md) | T29–T33 | I |
| 11. Ubah dan hapus | [plan-11.md](plan-11.md) | [todo-11.md](todo-11.md) | T34–T38 | J |
| 12. Expenses dan ekspor | [plan-12.md](plan-12.md) | [todo-12.md](todo-12.md) | T39–T41 | K (modul selesai) |

Phase dikerjakan berurutan. Pengecualian: task server di phase 10–12 (T29, T30, T34, T37, T40) boleh didahulukan.

## Aturan lintas phase

- **Irisan vertikal per kapabilitas.** Setiap phase berakhir dengan alur yang bisa dicoba dari ponsel (catat → lihat → filter → ubah/hapus → ekspor). Di dalam satu irisan, task API lebih dulu karena tes API terhadap Supabase mengunci kontrak, lalu task UI-nya.
- **Semua tipe dicatat sebelum daftar dan edit dibangun** (phase 8), supaya daftar dan form edit menangani empat tipe sejak awal dan tidak perlu dibongkar saat transfer menyusul.
- **Risiko tinggi didahulukan di dalam phase-nya:** presisi cursor (T27), key `$inf$` (matcher di T24, dipakai nyata di T28), optimistic delete (T38).
- Satu task = satu commit conventional, dengan gerbang `pnpm lint && pnpm typecheck && pnpm test`. Task UI juga `pnpm build` dan cek manual di 360×800 dan 1024.
- Tidak ada dependency npm baru. Komponen shadcn baru (`checkbox`, T26) lewat CLI. Jika CLI meminta paket baru, berhenti dan tanya.
- Daftar task per phase ada di `todo-N.md` (konvensi modul sebelumnya), bukan satu `tasks/todo.md`. Tidak ada tracker eksternal.

## Keputusan perencanaan (2026-10-21)

1. **Galat `fee` muncul di `fields.fee`.** `z.flattenError` hanya mengenal key tingkat atas, jadi `fee.amount` dan `fee.categoryId` dilaporkan di bawah `fields.fee` (satu pesan). Form transfer menampilkannya di blok biaya admin. Spec hanya mewajibkan 400 tanpa baris tertulis, jadi ini tidak mengubah kontrak.
2. **Fungsi cache dipisah dari hook.** Pembuang baris optimistic (`removeFromPages`) dan `isTransactionsKey` adalah fungsi murni supaya bisa dites di Vitest `node`.
3. **Baris daftar baru menjadi tautan di T35**, saat halaman edit ada. Sebelumnya baris non-interaktif, supaya tidak ada tautan ke 404.
4. **Pemisahan filter:** `T29` (API: schema + `transactionWhere`) dan `T31` (client: `parseFilters`/`periodToRange`/`normalizeFilters`) memakai kamus param yang sama dari SPEC, tetapi tidak berbagi kode selain tipe `TransactionFilters`.

## Risiko modul

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Cursor kehilangan mikrodetik `created_at` sehingga baris terlewat/dobel di batas halaman | Tinggi | T27 mulai dari tes merah dengan dua baris yang `created_at`-nya hanya beda mikrodetik. Cursor memakai `extract(epoch …)` di SQL, bukan `Date` JS |
| Matcher `revalidateTransactions` atau optimistic delete tidak menyentuh key `$inf$` | Sedang | `isTransactionsKey` dites terhadap kedua bentuk key. T28 memverifikasi manual: tambah transaksi dari form → daftar ikut berubah tanpa reload. Fallback: state halaman sendiri dengan satu key SWR per halaman |
| `useSearchParams` di `/transactions` merusak `cacheComponents` | Sedang | Selalu di dalam `<Suspense>`. `pnpm build` menjadi verifikasi T28, T31, T39 |
| Transaksi DB (transfer + biaya) di pooler transaction mode | Rendah | Pola yang sama dengan T13 yang sudah terbukti. Tes atomik di T23 |
| Biaya admin yatim setelah transfer dihapus | Rendah | Diterima di spec. Toast dan teks bantuan menyebutnya. `parent_id` hanya jika sering terjadi (Ask first) |
| Tanggal bergeser sehari (`new Date("YYYY-MM-DD")` dibaca UTC) | Sedang | Semua format dari string dengan `timeZone: "UTC"`, dites di `transaction-format.spec.ts` |
| Keyboard virtual iOS menutupi tombol Simpan di form panjang (transfer + biaya) | Sedang | Footer sticky seperti form akun (T18). Cek manual di ponsel |

---

# Modul `budgets`

Spec: [SPEC-budgets.md](../SPEC-budgets.md) · 2026-10-23

## Overview

Pemilik menetapkan budget bulanan per kategori spending, melihat terpakai/sisa/status per kategori dan ringkasan Needs/Wants, menghapus dengan undo, menyalin dari bulan lalu, dan menerapkan saran 50/30/20. Satu perubahan skema: kolom `budgets.deleted_at` (disetujui di spec, keputusan 2).

## Kondisi repo saat ini

- Tabel `budgets` sudah ada (index unik `(user_id, category_id, year, month)`, check `month 1..12`, `amount >= 0`), tanpa `deleted_at`. `app/(app)/budget/page.tsx` masih placeholder.
- Siap dipakai: `withAuth`, `fieldError`, `notFound`, `findOwnedCategory` (satu id), `transactionTotals`/`transactionWhere`, `todayInJakarta`, `shiftPeriod`/`formatPeriodLabel` (`lib/transaction-filters.ts`), `MoneyInput`, `ResponsiveModal`, `useUIStore().open("manageCategories", { kind })`, `sonner` toast + pola undo dari `transaction-editor.tsx`, `checkbox`, `dropdown-menu`, token `--budget`/`--expense`, `hideAmounts`.
- Belum ada: komponen progress (shadcn `progress` tidak terpasang), helper kepemilikan banyak kategori, `revalidateBudgets`.
- Vitest `environment: "node"`: logika hook dipisah jadi fungsi murni. UI diverifikasi manual.

## Dependency graph

```
T42 Migrasi deleted_at + schema + budgetStatus
 ├─► T43 GET usage ──────────────┐
 ├─► T44 PUT upsert ─────────────┼─► T45 Hook + revalidasi ─► T46 Halaman (baca) ─► T47 Form budget
 │                               │                                   │
 ├─► T48 DELETE/restore ─────────┼──────────────────────────────────►├─► T49 Hapus + undo (butuh T47)
 ├─► T50 Copy API ───────────────┼──────────────────────────────────►├─► T51 Salin + empty state
 │                               │                                   │
 └─► T52 suggestBudgets (murni) ─► T53 Suggestion API ─────────────►└─► T54 Panel saran (butuh T47)
```

Task server (T43, T44, T48, T50, T52, T53) hanya butuh T42 dan bisa didahulukan atau paralel dengan task UI.

## Phases

| Phase | Plan | Todo | Task | Checkpoint |
|---|---|---|---|---|
| 13. Atur budget dan lihat pemakaian | [plan-13.md](plan-13.md) | [todo-13.md](todo-13.md) | T42–T47 | L |
| 14. Hapus dan salin | [plan-14.md](plan-14.md) | [todo-14.md](todo-14.md) | T48–T51 | M |
| 15. Saran 50/30/20 | [plan-15.md](plan-15.md) | [todo-15.md](todo-15.md) | T52–T54 | N (modul selesai) |

## Aturan lintas phase

- Irisan vertikal: setiap phase berakhir dengan alur yang bisa dicoba dari ponsel (atur → lihat → catat expense → status berubah; hapus/salin; saran). Di dalam irisan, API lebih dulu (tes Supabase mengunci kontrak), lalu UI.
- Risiko tinggi didahulukan: SQL `budgetUsage` dan invariannya terhadap `transactionTotals` (T43), upsert yang menghidupkan baris terhapus (T44).
- Satu task = satu commit conventional, gerbang `pnpm lint && pnpm typecheck && pnpm test`. Task UI juga `pnpm build` dan cek manual 360×800 dan 1024.
- Tidak ada dependency npm baru. Progress bar dibuat sebagai komponen kecil di `components/budgets/` (bukan `components/ui/`), jadi tidak butuh CLI shadcn.

## Keputusan perencanaan (2026-10-23)

1. **Open questions 5–7 di spec memakai default spec** (dasar income bulan lalu, ambang 80%, bulan depan diizinkan). Masing-masing terkunci di satu tempat (`suggestBudgets`, `budgetStatus`, `budgetPeriodSchema`), jadi perubahan nanti hanya menyentuh satu fungsi dan tesnya.
2. **`findOwnedCategories(userId, ids)`** ditambahkan di `lib/server/ownership.ts` (T44), dengan pola `findOwnedAccounts`. `findOwnedCategory` tidak diubah.
3. **Stepper bulan baru** (`components/budgets/month-stepper.tsx`) memakai `shiftPeriod`/`formatPeriodLabel`, bukan `PeriodStepper` yang punya mode tahun/semua. Batas maju = bulan depan.
4. **Galat item di `fields.items`** (satu pesan), sama alasannya dengan `fields.fee` di transaksi.
5. **Form budget dibuka dengan state lokal halaman** (`categoryId`), bukan `useUIStore`, karena hanya halaman Budget yang membukanya.

## Risiko modul

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `budgetUsage` salah menghitung batas bulan atau melewatkan kategori terarsip | Tinggi | T43 mulai dari tes merah: expense di tanggal 1 dan akhir bulan, Februari kabisat, kategori terarsip, dan invarian `summary.total.spent = transactionTotals.expense` |
| Upsert `on conflict do update` tidak menghidupkan baris terhapus atau menimpa `created_at` | Sedang | Tes T44: hapus langsung di DB lalu `PUT` → id sama, `deleted_at` null, `created_at` tetap |
| `PUT` banyak item menulis sebagian saat satu kategori tidak valid | Sedang | Semua cek sebelum satu statement insert. Tes: satu item asing + satu valid → 400, tidak ada baris |
| Halaman Budget basi setelah mencatat expense | Sedang | Matcher `/api/budgets` di `revalidateTransactions` dites di T45, dicek manual di checkpoint L |
| `useSearchParams` di `/budget` merusak `cacheComponents` | Sedang | `<Suspense>`, `pnpm build` di T46 |
| Pembulatan saran tidak menjumlah tepat ke pool | Rendah | `suggestBudgets` murni, dites dengan sisa terbesar dan seri (T52) |

---

# Modul `dashboard`

Spec: [SPEC-dashboard.md](../SPEC-dashboard.md) · 2026-10-25

## Overview

Pemilik membuka `/dashboard` dan melihat total saldo, kartu Income/Expense/Saving/Sisa dengan perubahan vs periode lalu (period-to-date), grafik expense per hari atau bulan, donut per kategori, dan budget yang hampir habis. Setiap angka bisa di-tap ke `/transactions` dengan filter yang menyusunnya. Tidak ada perubahan skema. Satu dependency baru lewat shadcn CLI: `recharts` (sudah tercantum di Tech stack).

## Kondisi repo saat ini

- `app/(app)/dashboard/page.tsx` masih placeholder. Belum ada `components/dashboard/`, `components/ui/chart.tsx`, atau `recharts`.
- Siap dipakai: `transactionTotals` + `transactionWhere`, `budgetUsage`, `useAccounts`, `useCategories`, `useBudgets`, `invalidate` / `affectedBy` di `lib/cache-invalidation.ts`, `periodToRange` / `shiftPeriod` / `formatPeriodLabel` (`lib/transaction-filters.ts`), `PeriodStepper` (mode bulan/tahun/semua), `BudgetProgress`, `formatIDR` / `abbreviateIDR` / `HIDDEN_AMOUNT`, `hideAmounts`, `todayInJakarta`.
- Token `--chart-1..5` masih abu-abu bawaan shadcn, belum bisa membedakan kategori. `color-tokens.spec.ts` baru menguji token semantik.
- `usePeriodStore` tidak dipakai di mana pun (open question 5 di spec).
- Vitest `environment: "node"`: logika UI dipisah jadi fungsi murni (`dashboard-period.ts`, `dashboard-format.ts`). UI diverifikasi manual.

## Dependency graph

```
T55 Schema periode + dashboardRanges (murni)
 ├─► T56 GET /api/dashboard (totals) ─┬─► T60 activity ────────┐
 │                                    ├─► T62 categories ──────┼──┐
 │                                    │                        │  │
 └─► T57 Format + useDashboard + cache┴─► T58 Halaman (header, saldo, kartu)
                                              ├─► T59 shadcn chart + token ─┬─► T61 Expense Activity (T60)
                                              │                             └─► T63 Donut (T62)
                                              └─► T64 Budget Summary
                                                        T61 + T63 + T64 ─► T65 Layout + NFR
```

T57 boleh paralel dengan T56. T60 dan T62 hanya butuh T56 dan boleh paralel dengan T58/T59.

## Phases

| Phase | Plan | Todo | Task | Checkpoint |
|---|---|---|---|---|
| 16. Ringkasan dan saldo | [plan-16.md](plan-16.md) | [todo-16.md](todo-16.md) | T55–T58 | O |
| 17. Grafik aktivitas dan kategori | [plan-17.md](plan-17.md) | [todo-17.md](todo-17.md) | T59–T63 | P |
| 18. Budget Summary dan penyelesaian | [plan-18.md](plan-18.md) | [todo-18.md](todo-18.md) | T64–T65 | Q (modul selesai) |

## Aturan lintas phase

- Irisan vertikal: setiap phase berakhir dengan dashboard yang bisa dicoba dari ponsel (kartu + saldo → grafik → budget). Di dalam irisan, API lebih dulu (tes Supabase mengunci kontrak dan invarian), lalu UI.
- Risiko tinggi didahulukan: aturan period-to-date (T55), kompatibilitas Recharts dan ukuran bundle (T59, sebelum komponen grafik ditulis).
- Respons `GET /api/dashboard` tumbuh aditif: totals (T56), `activity` (T60), `categories` (T62).
- Satu task = satu commit conventional, gerbang `pnpm lint && pnpm typecheck && pnpm test`. Task UI juga `pnpm build` dan cek manual 360×800 dan 1024.

## Keputusan perencanaan (2026-10-25)

1. **Open questions 1–4 dan 6 di spec memakai default spec** (period-to-date, kartu Sisa, mode tahun, donut top 5 per kategori, tanpa transaksi terakhir). Aturan pembanding terkunci di `dashboardRanges`, persen di `percentChange`, top N di `topCategories`, jadi perubahan nanti hanya menyentuh satu fungsi dan tesnya. Mode tahun bisa dibuang dengan menghapus satu nilai di `modes` dan cabang di schema.
2. **Open question 5 (`usePeriodStore`) belum dikerjakan.** Ditanyakan di checkpoint O.
3. **`PeriodStepper` mendapat prop `modes`** daripada membuat stepper baru, karena dashboard butuh bulan dan tahun (berbeda dari `MonthStepper` budgets).
4. **`dashboardSummary(userId, period, today)`** menerima `today` supaya tes API memakai tanggal tetap.
5. **Token `--chart-1..5` diganti** dengan hue berbeda ≥ 3:1 terhadap background (T59). Ini mengubah `app/globals.css`, bukan `components/ui/`.

## Risiko modul

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Recharts tidak cocok dengan React 19.3 / `cacheComponents` | Tinggi | T59 dikerjakan sebelum komponen grafik. Gagal → stop, Ask first |
| JS first load `/dashboard` > 200 KB gzip | Sedang | `next/dynamic` untuk grafik, ukuran dicatat di T59, T61, T63, T65 |
| Pemotongan period-to-date salah di akhir bulan, kabisat, atau pergantian tahun | Sedang | T55 dimulai dari tes merah untuk semua kasus |
| Angka dashboard berbeda dari `/transactions` atau `/budget` | Sedang | `transactionWhere` dan `budgetUsage` dipakai ulang, invarian dites di T56, T60, T62 |
| Dashboard basi setelah mencatat transaksi | Sedang | `AFFECTS.transactions` memuat `dashboard`, dites di T57 |
| CLS dari bagian yang selesai memuat di waktu berbeda | Sedang | Skeleton bertinggi tetap, Lighthouse di T65 |

## Catatan ukuran (2026-10-25)

Diukur dari chunk JS yang dirujuk HTML prerender (gzip), bukan output `pnpm build` (Next 16.4 tidak lagi mencetak ukuran).

| Titik | `/dashboard` |
|---|---|
| Sebelum modul (placeholder, T58 belum) | ±364 KB, sama dengan `/transactions` (365,7) dan `/settings` (362,1) |
| T59 (chart terpasang, belum dirender) | 364,0 KB |
| T61 (Expense Activity) | 366,6 KB |
| T63 (donut) | 367,4 KB |
| T65 (layout akhir) | 369,5 KB |

Recharts ada di chunk lazy terpisah (±100 KB gzip) lewat `next/dynamic` dan tidak termasuk first load. Target 200 KB di SPEC.md sudah terlewati oleh app shell bersama (react-dom ±70 KB, zod ±48 KB, next-auth, sonner, dan lainnya) sebelum modul ini dimulai. Dashboard sendiri menambah ±5 KB. Perlu keputusan terpisah (Ask first): audit app shell atau revisi target.

