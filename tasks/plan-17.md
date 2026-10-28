# Plan phase 17: Grafik aktivitas dan kategori

Index: [plan.md](plan.md) · Todo: [todo-17.md](todo-17.md) · Spec: [SPEC-dashboard.md](../SPEC-dashboard.md) § Keputusan 7–8, Query `dashboardSummary`, Deliverables (Expense Activity, donut, aksesibilitas, performa)

## Tujuan

Pemilik melihat ke mana uangnya pergi: batang expense per hari (bulan) atau per bulan (tahun), dan donut 5 kategori terbesar + "Lainnya" dengan legenda yang bisa di-tap ke daftar transaksi. Grafik terbaca screen reader, tidak membuat layout bergeser, dan tidak membuat JS awal melewati 200 KB.

## Task

- [x] T59: Pasang shadcn chart + token warna grafik (S, risiko tinggi)
- [x] T60: `activity` di `dashboardSummary` (S)
- [x] T61: Grafik Expense Activity (M)
- [x] T62: `categories` di `dashboardSummary` + `topCategories` (S)
- [x] T63: Donut per kategori + legenda (M)

Urutan: T59 lebih dulu (gagal cepat jika Recharts bermasalah dengan React 19.3 atau melewati budget bundle). T60 dan T62 hanya butuh T56 dan boleh dikerjakan paralel dengan T59. T61 butuh T59 + T60, T63 butuh T59 + T62.

## Keputusan

- **`pnpm dlx shadcn@latest add chart`** memasang `components/ui/chart.tsx` dan `recharts` (tercantum di Tech stack SPEC.md). Jika CLI menyentuh `app/globals.css` atau file lain di luar `components/ui/`, diff diperiksa sebelum commit.
- **Token `--chart-1..5` diganti dari abu-abu bawaan menjadi lima hue yang bisa dibedakan**, di `:root` dan `.dark`, masing-masing ≥ 3:1 terhadap `--background` (WCAG 1.4.11 untuk elemen grafis). Dites dengan memperluas `color-tokens.spec.ts`. "Lainnya" memakai `--muted-foreground`.
- **Bucket aktivitas dibuat di SQL:** `generate_series(from::date, to::date, interval)` left join agregat expense, `to_char` untuk label. Satu query.
- **Komponen grafik dimuat dengan `next/dynamic`** di belakang skeleton bertinggi sama. Ukuran first load `/dashboard` dicatat dari output `pnpm build` di T59 (sebelum dan sesudah) dan T61.
- **Teks alternatif:** aktivitas punya ringkasan teks (total, hari/bulan tertinggi) dan tabel `sr-only`. Donut cukup legenda berupa daftar teks (nama, nominal, persen), grafiknya `aria-hidden`.

## Risiko

| Risiko                                                               | Dampak | Mitigasi                                                                                                                                              |
| -------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recharts versi CLI tidak cocok dengan React 19.3 / `cacheComponents` | Tinggi | T59 hanya memasang dan merender grafik contoh di dashboard, `pnpm build` + cek manual. Jika gagal, stop dan Ask first (alternatif SVG tulisan tangan) |
| JS first load `/dashboard` > 200 KB gzip                             | Sedang | `next/dynamic`, ukuran dicatat di T59 dan T61                                                                                                         |
| Bucket bergeser sehari karena zona waktu                             | Sedang | Bucket dan label dari SQL `date`/`to_char`, label UI diformat dengan `timeZone: "UTC"`. Tes tanggal 1, hari terakhir, Februari kabisat                |
| Warna kategori tidak bisa dibedakan atau kontras kurang              | Sedang | Token diuji kontras, legenda selalu menulis nama dan persen                                                                                           |
| `sum(categories)` atau `sum(activity)` berbeda dari `totals.expense` | Sedang | Invarian dites di T60 dan T62                                                                                                                         |

## Checkpoint P

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau, JS first load `/dashboard` < 200 KB gzip
- [x] Manual 360×800 dan 1024, light dan dark: bulan dan tahun, bulan tanpa expense, tap legenda → `/transactions` dengan total yang sama, `hideAmounts` menyembunyikan tooltip dan sumbu
- [x] Review dengan Yogi (open question 4 di spec)
