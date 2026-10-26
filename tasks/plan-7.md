# Plan phase 7: Settings, Kelola akun, Kelola kategori

Index: [plan.md](plan.md) · Todo: [todo-7.md](todo-7.md) · Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md) § Deliverables 2–3

## Tujuan

Di ponsel (360 px), pemilik bisa mengubah profil, mengelola akun (termasuk mengubah saldo awal) dan kategori dari Settings, tanpa reload. Modal bisa dibuka dari modul lain lewat `useUIStore`.

## Task

- [x] T17: Halaman Settings + form profil (M)
- [x] T18: Kelola akun: daftar + tambah akun (M)
- [x] T19: Kelola akun: edit, arsip, pulihkan (M)
- [x] T20: Kelola kategori: daftar per tab + tambah (M)
- [x] T21: Kelola kategori: rename, arsip, pulihkan (S)

Urutan: T17 → T18 → T19, lalu T20 → T21. T20 hanya butuh T18 (ModalHost dan pola hook), jadi T19 dan T20 bisa dikerjakan paralel.

## Keputusan

- **Komponen shadcn ditambah lewat CLI** sesuai kebutuhan task: `input`, `label`, `switch` (T17), `select`, `toggle-group` (T18), `alert-dialog` (T19), `tabs` (T20). Tidak ada dependency npm baru di luar yang ditarik CLI dari `@base-ui/react`. Jika CLI meminta paket baru, berhenti dan tanya.
- **Hook = SWR + fungsi mutasi biasa** (`fetch` → lempar `ApiError` → `mutate`). Tanpa optimistic update (spec). `revalidateAccounts()` memakai `mutate((key) => typeof key === "string" && key.startsWith("/api/accounts"))`.
- **Satu `ModalHost`** di `app/(app)/layout.tsx` (client, di dalam boundary yang sudah ada), merender `ManageAccounts`/`ManageCategories` berdasarkan `useUIStore().modal`. Form tambah/edit adalah _view_ di dalam modal yang sama (daftar ↔ form), bukan modal bertumpuk, supaya drawer mobile tidak menumpuk.
- **Input nominal** (`components/forms/money-input.tsx`) memakai `formatThousands`/`parseIDR` dari `lib/money.ts`, `inputMode="numeric"`, dan tombol ± untuk tanda. Komponen ini dipakai ulang oleh form transaksi nanti.
- **Error server ke form:** `ApiError.fields` → `setError` per field. 409 → `setError("name")`.

## Risiko

| Risiko                                                          | Dampak | Mitigasi                                                                                    |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `cacheComponents` menolak Settings karena data dinamis          | Sedang | Semua data lewat komponen client + SWR. Page tetap statis. `pnpm build` jadi verifikasi T17 |
| Drawer Base UI + keyboard virtual di iOS menutupi tombol Simpan | Sedang | Footer `ResponsiveModal` sudah memakai safe-area. Cek manual di 360×800 dengan field fokus  |
| Komponen shadcn `base-vega` berbeda API dari dokumentasi Radix  | Rendah | Baca file hasil CLI di `components/ui/` sebelum memakai                                     |

## Checkpoint F (modul selesai)

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [x] Semua acceptance criteria di SPEC-accounts-categories.md tercentang
- [x] Manual di 360×800 dan 1024: alur akun dan kategori lengkap, tanpa horizontal scroll, target sentuh ≥ 44 px, dark mode (headless)
- [x] Review dengan Yogi, lalu tulis `SPEC-transactions.md`
