# Plan phase 38: Target, UI dan penutupan

Index: [plan.md](plan.md) § Modul `net-worth` · Todo: [todo-38.md](todo-38.md) · Spec: [SPEC-net-worth.md](../SPEC-net-worth.md) § UI, Acceptance criteria

## Tujuan

Pemilik membuat, mengubah, dan mengarsipkan target dari `/net-worth`, dan setiap kartu menjawab "seberapa dekat, kapan tercapai, berapa per bulan". Modul ditutup dengan verifikasi menyeluruh terhadap Acceptance criteria SPEC-net-worth, ukuran bundle, dan status spec.

## Task

- [x] T132: Kartu target dan buat target (M)
- [x] T133: Edit, arsip, Urungkan, dan daftar arsip (M)
- [x] T134: Verifikasi akhir modul `net-worth` (S)

Urutan: T132 → T133 → T134.

## Keputusan

- **Kartu target di atas daftar nilai aset** di `net-worth-view.tsx` (dari T127). Target aktif urut `created_at`; nilai aset tetap di bawahnya dengan tombol Perbarui nilai di header.
- **Kalimat proyeksi dari satu fungsi murni** `netWorthProjectionText(progress)` di `lib/net-worth-format.ts` (diuji unit), bukan di komponen, supaya semua cabang SPEC-net-worth § UI teruji.
- **Bar progres:** pakai ulang `components/budgets/budget-progress.tsx` jika tidak bergantung pada status budget; selain itu bar kecil sendiri (plan.md keputusan perencanaan #6).
- **Form target** memakai `ResponsiveModal`, `MoneyInput`, `Checkbox` (sudah terpasang), dan `<input type="month">` native.

## Risiko

| Risiko                                         | Dampak | Mitigasi                                                                          |
| ---------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Cabang teks proyeksi tidak lengkap             | Sedang | `netWorthProjectionText` diuji per cabang (reached, overdue, tepat waktu, terlambat, laju null/≤ 0) |
| Status basi, terlambat, pasar negatif hanya lewat warna | Sedang | Teks eksplisit di setiap status; cek manual kontras ≥ 4.5:1                       |
| `<input type="month">` tidak didukung di Safari desktop lama | Rendah | Fallback teks `YYYY-MM` divalidasi Zod yang sama; ponsel (target utama) mendukung |

## Checkpoint AK

- [x] Semua Acceptance criteria SPEC-net-worth hijau (API) atau dicentang / ditandai tertunda (UI)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; jumlah tes akhir ≥ jumlah sebelum T124 + tes baru (1486)
- [ ] JS first load `/net-worth` < 200 KB gzip; `/dashboard` tidak berubah lebih dari +0,5 KB (`/dashboard` +0,3 KB lulus; `/net-worth` 336,1 KB tidak lulus, app shell bersama)
- [x] plan.md status `net-worth` diperbarui; SPEC-net-worth.md Status → "diimplementasikan"
- [ ] Review dengan Yogi
