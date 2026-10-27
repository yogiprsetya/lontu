# Plan phase 23: Catat dan Lewati

Index: [plan.md](plan.md) · Todo: [todo-23.md](todo-23.md) · Spec: [SPEC-recurring.md](../SPEC-recurring.md) § Keputusan 2, 7, 9–12, 14, 16, Kontrak API (`advance`), Deliverables (`due-inbox`, prop `recurring`)

## Tujuan

Aturan yang jatuh tempo muncul di kotak "Jatuh tempo" di dashboard. Satu tap **Catat** membuka form terisi, dan menyimpannya menulis transaksi sekaligus memajukan aturan dalam satu transaksi DB. **Lewati** memajukan aturan tanpa transaksi. Tap ganda atau retry tidak pernah mencatat dua kali.

## Task

- [x] T83: Executor opsional di jalur insert transaksi (S, risiko tinggi)
- [x] T84: `POST /api/recurring/[id]/advance` (M, risiko tinggi)
- [x] T85: `advanceRule` di hook + prop `recurring` di `TransactionForm` (M)
- [x] T86: Kotak Jatuh tempo di dashboard (M)

Urutan berantai: T83 → T84 → T85 → T86.

## Keputusan

- **Executor sebagai parameter, bukan jalur kedua.** `insertSimple` di `lib/server/transactions.ts` menerima executor (`db` atau `tx`) dengan default `db`, jadi `createTransaction` tidak berubah perilaku dan semua tes transaksi yang ada tetap hijau tanpa disentuh. `advanceRule` memanggil jalur insert yang sama di dalam transaksi DB-nya sendiri. Tidak ada duplikasi logika insert dan tidak ada perubahan kontrak `POST /api/transactions`.
- **Urutan di dalam satu transaksi DB:** replay check → validasi referensi → `update … where next_due_date = occurrenceDate returning` → insert transaksi. Nol baris di langkah 3 → 409 `OCCURRENCE_STALE`, transaksi DB dibatalkan.
- **Replay dibaca sebelum validasi referensi**, sama alasannya dengan `createTransaction`: akun yang diarsipkan setelah tulisan pertama tidak boleh mengubah retry menjadi 400.
- **`fields` datar.** Body `post` tidak bersarang, jadi `z.flattenError` menghasilkan key yang langsung dipakai `applyServerErrors` di `TransactionForm`. Ini menghindari masalah `fields.fee`/`fields.items` di modul sebelumnya.
- **`id` transaksi dibuat sekali per form** (`crypto.randomUUID()` di `useState`/`useRef` awal), bukan per submit, supaya submit kedua setelah galat jaringan memakai id yang sama dan menjadi replay.
- **Lewati tanpa undo** (spec Open question #4, default spec). Konfirmasi tidak dipakai; teks bantuan menyebut artinya. Jika Yogi memilih undo di checkpoint U, tambahkan endpoint mundur sebagai task baru, bukan mengubah T84.
- **Catat dari kotak Jatuh tempo memakai `TransactionForm` di `ResponsiveModal`**, bukan `/add/[type]?rule=`, karena halaman itu statis lewat `generateStaticParams` dan menambah `useSearchParams` di sana akan menyentuh modul transactions tanpa alasan.
- **Mutasi `post` memanggil `invalidate("transactions")`**, bukan `invalidate("recurring")`, karena `AFFECTS` hanya satu tingkat dan saldo, budget, serta dashboard ikut berubah. `AFFECTS.transactions` sudah memuat `recurring` sejak T80.

## Risiko

| Risiko                                                                     | Dampak | Mitigasi                                                                                                                                  |
| -------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Refactor executor mengubah perilaku replay `POST /api/transactions`        | Tinggi | T83 tidak mengubah satu pun tes transaksi yang ada; semua wajib hijau tanpa diedit. Diff T83 hanya tanda tangan fungsi dan pemanggilannya |
| Transaksi ganda atau aturan maju dua kali saat tap ganda / retry           | Tinggi | T84: tes replay, dua request paralel, dan `occurrenceDate` basi. `id` tetap per form di T85, cek manual tap ganda                          |
| Validasi gagal tetapi aturan sudah maju                                    | Tinggi | Satu transaksi DB untuk semua langkah. Tes eksplisit: 400 → `nextDueDate` tidak berubah                                                   |
| Transaksi DB di pooler transaction mode (`prepare: false`)                 | Rendah | Pola yang sama dengan T13 dan T23 yang sudah terbukti                                                                                     |
| Kotak Jatuh tempo menambah ukuran bundle `/dashboard` yang sudah di atas target | Sedang | Diukur di T86 dan dirangkum di T89. Target tambahan phase ini < 3 KB gzip                                                              |

## Checkpoint V

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau, termasuk seluruh `tests/api/transactions*.spec.ts` tanpa diedit
- [ ] Manual 360×800 dan 1024: tagihan jatuh tempo muncul di Jatuh tempo → Catat → form terisi → ubah nominal → Simpan → transaksi ada di `/transactions`, saldo berubah, baris hilang dari Jatuh tempo
- [ ] Lewati menghilangkan baris tanpa membuat transaksi
- [ ] Tap Simpan dua kali cepat → satu transaksi
- [ ] Mode pesawat: tombol Catat dan Lewati nonaktif dengan teks "Butuh koneksi"
- [ ] Aturan tertinggal 3 bulan: kejadian muncul satu per satu
- [ ] Review dengan Yogi
