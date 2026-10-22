# Plan phase 9: Daftar transaksi

Index: [plan.md](plan.md) · Todo: [todo-9.md](todo-9.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md) § Cursor, Kontrak API (`GET`), Deliverables (UI: halaman `/transactions`)

## Tujuan

Transaksi yang dicatat di phase 8 tampil di `/transactions`: dikelompokkan per tanggal, terbaru di atas, dengan "Muat lebih banyak" lewat cursor. Nama akun dan kategori (termasuk yang terarsip) di-resolve di client. Filter, periode, dan total menyusul di phase 10.

## Task

- [x] T27: `GET /api/transactions` dengan cursor (M, risiko tinggi)
- [ ] T28: Halaman daftar `/transactions` (M, risiko sedang)

Urutan: T27 → T28. T28 juga memakai `hooks/use-transactions.ts` dari T24.

## Keputusan

- **Risiko didahulukan:** T27 dimulai dari tes merah. Dua baris dengan `created_at` yang hanya beda mikrodetik dan tanggal sama harus muncul tepat sekali di dua halaman `limit=1`. Tes itu gagal jika cursor melewati `Date` JS.
- **Cursor** = base64url dari JSON `[date, createdAtMicros, id]`. Nilai `createdAtMicros` dihitung di SQL dan ikut di-select. Predikat keyset memakai ekspresi yang sama di kedua sisi.
- **Daftar belum punya filter di T27/T28**, tetapi `listTransactions` menerima objek opsi sehingga T29 cukup menambah `where`.
- **Baris daftar non-interaktif sampai T35.** Tidak ada tautan ke halaman yang belum ada.
- **Judul tanggal** diformat dari string `YYYY-MM-DD` dengan `timeZone: "UTC"` ("Hari ini", "Kemarin", lalu "Sen, 19 Okt 2026"). Fungsi murni di `lib/transaction-format.ts`.
- **Hook** `useTransactions` memakai `useSWRInfinite`. Key halaman: `/api/transactions` (+ `?cursor=…`). Pembangun query yang lengkap (`filtersToSearchParams`) datang di T31.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Ekspresi `extract(epoch from created_at) * 1000000` di `order by`/`where` tidak memakai index | Rendah | Skala pribadi; index `(user_id, date desc, id desc)` tetap memberi prefix `user_id, date`. Cek `EXPLAIN` hanya jika terasa lambat (Ask first untuk index baru) |
| `useSWRInfinite` + `mutate(matcher)` tidak merefresh daftar setelah create | Sedang | Verifikasi manual di T28: simpan transaksi dari form, daftar ikut berubah tanpa reload. Jika gagal, fallback di plan.md |
| Resolusi nama menunggu dua hook tambahan (akun dan kategori) | Rendah | Skeleton sampai ketiganya siap. Hook akun/kategori sudah ter-cache oleh SWR |

## Checkpoint H

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Acceptance criteria paginasi/urutan di SPEC-transactions.md tercentang
- [ ] Manual 360×800 dan 1024: dengan > 30 baris (skrip sekali pakai atau Drizzle Studio) "Muat lebih banyak" bekerja tanpa duplikat. Transaksi baru dari form muncul di atas tanpa reload
- [ ] Review dengan Yogi sebelum phase 10
