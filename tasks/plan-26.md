# Plan phase 26: Tampilan nominal

Index: [plan.md](plan.md) § Refactor arsitektur · Todo: [todo-26.md](todo-26.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md) § `stores/ui.ts`, [SPEC-dashboard.md](../SPEC-dashboard.md) § `hideAmounts`

## Tujuan

Aturan "Sembunyikan nominal" hidup di satu modul. Komponen memberi angka dan mendapat teks, tanpa membaca `hideAmounts` atau menulis `HIDDEN_AMOUNT` sendiri. Layar baru yang lupa aturan ini gagal di tes, bukan bocor ke pemilik.

## Task

- [x] T94: `useAmountFormat` + migrasi dashboard (M)
- [x] T95: Migrasi budgets dan recurring, buang flag `hideAmounts` dari helper format (M)
- [ ] T96: Migrasi sisanya + tes penjaga (M)

Urutan berantai: T94 → T95 → T96.

## Keputusan

- **Interface:** `displayAmount(amount, hidden, format = formatIDR)` murni di `lib/money.ts`; `useAmountFormat()` di `hooks/use-amount-format.ts` mengembalikan `(amount, format?) => string` yang membaca `useUIStore`. `format` menerima `formatIDR`, `abbreviateIDR`, atau formatter bertanda (`formatSignedAmount`) supaya sumbu grafik dan baris transaksi ikut aturan yang sama.
- **Helper format tidak lagi menerima `hideAmounts`.** `formatBudgetAmount` dihapus; `formatSchedule` dan `formatFree` (`lib/recurring-format.ts`) menerima string nominal yang sudah diformat, atau formatter.
- **Toggle tetap di tempatnya** (`components/settings/finance-section.tsx`, `components/dashboard/hide-amounts-button.tsx`). Hanya dua berkas itu dan hook yang boleh membaca `hideAmounts`.
- **Tes penjaga berupa tes unit yang membaca sumber** (`tests/unit/amount-guard.spec.ts`): gagal bila berkas di `components/` atau `lib/*-format.ts` menyebut `HIDDEN_AMOUNT` atau `hideAmounts`, kecuali daftar izin di atas.

## Risiko

| Risiko                                                       | Dampak | Mitigasi                                                                    |
| ------------------------------------------------------------ | ------ | --------------------------------------------------------------------------- |
| Nominal di tooltip atau sumbu grafik lolos tanpa disamarkan  | Sedang | Daftar cek manual di T94 mengikuti SPEC-dashboard § `hideAmounts` butir per butir |
| Tes penjaga rapuh (cocok teks)                               | Rendah | Pola sederhana dengan daftar izin eksplisit; pesan gagal menyebut berkas dan cara memperbaikinya |

## Checkpoint Y

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; `amount-guard.spec.ts` hijau
- [ ] Manual 360×800 dan 1024, light dan dark, `hideAmounts` aktif: dashboard (kartu, saldo, legenda, tooltip, label tengah donut, sumbu Y), `/budget`, `/recurring`, kartu gajian, `/transactions` (daftar, strip total, kartu penyesuaian), Kelola akun, transaksi tertunda, peringatan saldo di form. Tidak ada nominal yang terbaca
- [ ] JS first load `/dashboard` tidak naik lebih dari 0,5 KB gzip
- [ ] Review dengan Yogi sebelum phase 27
