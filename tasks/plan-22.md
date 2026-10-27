# Plan phase 22: Aturan berulang

Index: [plan.md](plan.md) · Todo: [todo-22.md](todo-22.md) · Spec: [SPEC-recurring.md](../SPEC-recurring.md) § Keputusan 3, 5, 8–10, 13–17, Perubahan skema, Kontrak API (`GET`, `POST`, `PATCH`, `DELETE`, `restore`), Fungsi murni (`recurring-schedule`), Deliverables (halaman, form)

## Tujuan

Dari ponsel, pemilik membuka `/recurring`, mendaftarkan gaji dan tagihan tetap, melihat jatuh tempo berikutnya per aturan, mengubahnya, dan mengarsipkannya dengan "Urungkan". Belum ada transaksi yang ditulis dan belum ada proyeksi: itu phase 23 dan 24.

## Task

- [x] T77: Migrasi `recurring_rules`, schema Zod, `lib/recurring-schedule.ts` (M, risiko tinggi)
- [x] T78: `GET` + `POST /api/recurring` (M)
- [x] T79: `PATCH`, `DELETE`, `restore` + tukar gajian (M)
- [x] T80: `hooks/use-recurring.ts`, resource cache, nav item (S)
- [x] T81: Halaman `/recurring` (baca) (M)
- [x] T82: Form aturan + arsip dengan undo (M)

Urutan: T77 dulu. T78 dan T79 boleh paralel setelah T77. T80 butuh T78 + T79. T81 butuh T80. T82 butuh T81.

## Keputusan

- **Migrasi lewat `pnpm db:generate`** setelah menambah `recurringRules` di `db/schema.ts`. Hanya objek baru (`CREATE TABLE`, index, constraint, `ALTER TABLE … ENABLE ROW LEVEL SECURITY`). Jika drizzle-kit RC menyentuh tabel atau view lain, berhenti dan periksa snapshot. RLS deny-all ditulis di SQL kustom seperti migrasi tabel lain.
- **Index unik parsial satu gajian** (`(user_id) where is_payday and archived_at is null`) adalah penjaga terakhir. Penukaran tetap dilakukan eksplisit di `lib/server/recurring.ts` dalam satu transaksi DB: cabut tanda lama, lalu set yang baru. Index parsial di sini berbeda dari pola "index tidak parsial" di accounts-categories keputusan #7 karena yang dijaga adalah keunikan `is_payday`, bukan nama.
- **Tanggal murni dari string.** `clampDay`, `advanceDate`, `firstDueOnOrAfter` di `lib/recurring-schedule.ts` memecah `YYYY-MM-DD` menjadi angka dan menyusunnya kembali, tanpa `Date` lokal. `Date.UTC` hanya untuk mencari hari terakhir bulan.
- **`GET` mengembalikan `rules` + `due` di phase ini.** Field `forecast` ditambahkan di T87 secara aditif, mengikuti pola `GET /api/dashboard` (plan modul dashboard). Tipe `RecurringOverview` di `lib/schemas/recurring.ts` sudah memuat `forecast` sejak T77, dan `paydayForecast` baru mengisinya di T87; sampai itu `GET` mengirim `{ status: "no_payday" }`.
- **`due` dihitung di server**, bukan di client, supaya "hari ini" selalu Jakarta dan tidak bergantung jam perangkat.
- **Tanggal 1–31 memakai `<select>` native** (bukan komponen baru), 31 opsi, font 16 px. Tidak ada dependency baru dan tidak ada komponen shadcn baru di phase ini.
- **Nav:** `recurringItem` masuk `sidebarItems` dan menu More di `bottom-nav.tsx`. Slot bawah (5 slot + FAB) tidak diubah, jadi tidak ada regresi layout di 360 px.

## Risiko

| Risiko                                                               | Dampak | Mitigasi                                                                                                                      |
| -------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Aritmetika tanggal bergeser sehari atau salah di akhir bulan/kabisat | Tinggi | T77 mulai dari tes merah: 31 Jan → 28 Feb → 31 Mar, 29 Feb 2028, Des → Jan, dan `firstDueOnOrAfter` saat anchor > hari terakhir |
| drizzle-kit RC menghasilkan migrasi yang menyentuh objek lain        | Sedang | Baca `migration.sql` sebelum `db:migrate`. Hanya objek `recurring_rules` yang boleh. `db-constraints.spec.ts` tetap hijau     |
| Dua aturan gajian lolos karena race                                  | Sedang | Penukaran dalam satu transaksi DB + index unik parsial. Tes dua `POST` paralel `isPayday: true`                                |
| `includeArchived` membocorkan aturan user lain                       | Rendah | Filter `user_id` di query, tes isolasi A/B di T78                                                                             |

## Checkpoint U

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual 360×800 dan 1024: tambah gaji tanggal 25 (tercentang gajian), Netflix tanggal 5, setoran tabungan tanggal 20 → ketiganya tampil terkelompok dengan jatuh tempo berikutnya yang benar
- [ ] Tandai aturan income lain sebagai gajian → lencana pindah, tidak ada dua gajian
- [ ] Arsipkan satu aturan → "Urungkan" mengembalikannya. "Lihat arsip" menampilkan yang terarsip
- [ ] Aturan tanggal 31 dibuat saat Februari → jatuh tempo berikutnya 28/29 Feb, dan bulan berikutnya kembali 31
- [ ] Review dengan Yogi (termasuk Open questions #2–#5 di spec sebelum phase 23)
