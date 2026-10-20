# Plan phase 6: API kategori & kontrak lintas modul

Index: [plan.md](plan.md) · Todo: [todo-6.md](todo-6.md) · Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md) § Kontrak API (Kategori, Kontrak untuk modul lain)

## Tujuan

API kategori lengkap (`GET`/`POST`/rename/arsip/restore), dan helper kepemilikan yang akan dipakai modul `transactions` dan `budgets`. Setelah phase ini, seluruh kontrak server modul `accounts-categories` selesai dan bisa diuji tanpa UI.

## Task

- [x] T14: `GET`/`POST /api/categories` (M)
- [x] T15: Rename, arsip, dan restore kategori (S)
- [ ] T16: Helper kepemilikan `lib/server/ownership.ts` (S)

Urutan: T14 → T15. T16 hanya butuh tabel yang sudah ada dan schema dari T12/T14 (untuk tipe `CategoryKind`), jadi dikerjakan setelah T14.

## Keputusan

- **`categoryCreateSchema` adalah discriminated union pada `kind`.** `spendingType` wajib untuk `spending` dan dilarang untuk `income`/`saving`. Error-nya muncul di `fields.spendingType`.
- **`categoryRenameSchema = z.strictObject({ name })`.** Mengirim `kind`/`spendingType` menghasilkan 400, bukan diabaikan diam-diam, supaya client yang salah langsung ketahuan.
- **Urutan `GET` di SQL** dengan `case` untuk kind (income, saving, spending) dan spending_type (needs, wants), lalu `lower(name)`.
- **Helper kepemilikan mengembalikan `archivedAt`** dan tidak memutuskan sendiri. Aturan "aktif saat dibuat, boleh terarsip jika tidak diubah saat edit" dimiliki modul `transactions`, yang punya konteks create/edit.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Pesan error discriminated union Zod v4 untuk `kind` tidak dikenal kurang jelas | Rendah | Tes unit memastikan `fields.kind` dan `fields.spendingType` berisi pesan bahasa Indonesia |
| Duplikasi pola route antara akun dan kategori | Rendah | Terima dulu duplikasi kecil. Ekstrak helper hanya jika pola ketiga muncul (budgets) |

## Checkpoint E

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Semua acceptance criteria API di SPEC-accounts-categories.md (selain UI) tercentang
- [ ] Review dengan Yogi sebelum phase 7
