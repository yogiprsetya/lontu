# Plan phase 8: Catat transaksi

Index: [plan.md](plan.md) · Todo: [todo-8.md](todo-8.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md) § Keputusan, Aturan domain, Kontrak API (`POST`), Deliverables (form)

## Tujuan

Dari ponsel, pemilik bisa mencatat income, expense, saving, dan transfer (dengan biaya admin opsional). Saldo akun ikut berubah tanpa reload, dan peringatan saldo kurang muncul tanpa memblokir. Daftar transaksi belum ada (phase 9), jadi hasilnya dicek lewat saldo di Kelola akun dan Drizzle Studio.

## Task

- [x] T22: `POST /api/transactions` income/expense/saving (M)
- [x] T23: `POST` transfer + biaya admin atomik (M, risiko sedang)
- [x] T24: Form income/expense/saving di `/add/[type]` (M)
- [ ] T25: Peringatan saldo kurang (S)
- [ ] T26: Form transfer + biaya admin (M)

Urutan: T22 → T23 dan T22 → T24 → T25 → T26. T23 dan T24 tidak saling bergantung dan bisa paralel. T26 butuh T23 (API fee) dan T25 (peringatan saldo).

## Keputusan

- **Schema `POST` dibangun bertahap:** T22 membuat union dengan tiga tipe sederhana dan menolak `transfer` (400). T23 menambah anggota `transfer` ke union yang sama, jadi tes T22 tidak berubah kecuali satu asersi.
- **Validasi referensi di server, bukan Zod.** `createTransaction` memanggil `findOwnedAccounts`/`findOwnedCategory` dan mengembalikan galat per field lewat `fieldError(field, message)` baru di `lib/api/errors.ts`. Pesan untuk id asing dan id tidak ada sama.
- **Transfer + fee dalam satu `db.transaction`**, semua validasi selesai sebelum insert pertama. Galat `fee.*` dilaporkan di `fields.fee` (lihat plan.md, keputusan perencanaan 1).
- **Hook `use-transactions.ts` lahir di T24** dengan `isTransactionsKey` yang sudah mencocokkan `/api/transactions…` dan `$inf$/api/transactions…`, karena phase 9 mengandalkannya.
- **Setelah simpan, `router.push("/transactions")`.** Halamannya masih placeholder sampai T28, tidak masalah.
- **Pickers** (`account-picker`, `category-picker`) dipisah dari form supaya form transfer dan form edit memakainya ulang.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `db.transaction` untuk transfer + fee di pooler transaction mode | Rendah | Pola sama dengan `updateAccount` (T13). Tes memastikan tidak ada baris tertulis saat fee tidak valid |
| `date` ≤ hari ini Jakarta diuji dengan jam sistem | Rendah | Schema membaca `todayInJakarta()` saat parse (tidak basi lewat tengah malam). Tes unit memakai fake timer di 17:30 UTC, yang sudah besok di Jakarta |
| Form transfer panjang di drawer/keyboard virtual iOS | Sedang | Footer sticky seperti form akun. Cek manual di ponsel setelah T26 |
| Mengubah `add/[type]` memutus tautan manifest "Tambah Expense" | Rendah | Rute dan `generateStaticParams` tidak berubah; hanya isi halaman |

## Checkpoint G

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Acceptance criteria API pembuatan di SPEC-transactions.md (empat butir pertama dan referensi/validasi) tercentang
- [ ] Manual 360×800 dan 1024: catat empat tipe, saldo di Kelola akun benar, transfer dengan biaya admin menambah dua baris (Drizzle Studio)
- [ ] Review dengan Yogi sebelum phase 9
