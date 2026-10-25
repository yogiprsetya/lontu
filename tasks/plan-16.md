# Plan phase 16: Ringkasan dan saldo

Index: [plan.md](plan.md) · Todo: [todo-16.md](todo-16.md) · Spec: [SPEC-dashboard.md](../SPEC-dashboard.md) § Keputusan 1–6, 10–12, Kontrak API, Deliverables (kartu, Account Balance)

## Tujuan

Pemilik membuka `/dashboard` dan melihat total saldo, kartu Income/Expense/Saving/Sisa dengan perubahan vs periode lalu (period-to-date), bisa berganti bulan/tahun lewat URL, dan setiap kartu membuka daftar transaksi yang menyusunnya. Mencatat transaksi lalu kembali ke dashboard memperbarui angka tanpa reload.

## Task

- [x] T55: Schema periode + `dashboardRanges` murni (S)
- [x] T56: `GET /api/dashboard` (totals + pembanding) (M)
- [x] T57: Format murni, `useDashboard`, resource `dashboard` di cache (M)
- [ ] T58: Halaman dashboard: header, Account Balance, kartu (M)

Urutan: T55 → T56 → T57 → T58. T57 hanya butuh T55 (tipe) dan boleh paralel dengan T56.

## Keputusan

- **Rentang dihitung dari string**, memakai `periodToRange` dan `shiftPeriod` dari `lib/transaction-filters.ts`. Pemotongan period-to-date: `to` periode berjalan = hari ini, `to` pembanding = tanggal yang sama di periode lalu, dipotong ke hari terakhir bulan itu. Untuk mode tahun, bulan dan hari yang sama di tahun lalu (29 Feb → 28 Feb).
- **Pembanding di bawah 2000-01:** `previous` = `1999-12` / `1999` dengan rentang aslinya (dihitung tanpa `shiftPeriod`, yang berhenti di 2000). Tidak ada transaksi sebelum `MIN_TRANSACTION_DATE`, jadi totals 0 dan persen tampil "—" tanpa kasus khusus. Tidak ada 400.
- **`dashboardSummary` menerima `today`** sebagai argumen supaya tes API bisa memakai tanggal tetap tanpa fake timer di route. Route mengisi `todayInJakarta()`.
- **Respons tumbuh secara aditif:** phase ini mengirim `period`, `range`, `previous`, `totals`, `previousTotals`. `activity` dan `categories` ditambahkan di phase 17 (T60, T62). Tipe `DashboardSummary` di `lib/schemas/dashboard.ts` diperluas di sana.
- **`PeriodStepper` mendapat prop `modes?`** (default ketiga mode) supaya dashboard menyembunyikan "Semua". Perilaku `/transactions` tidak berubah.
- **Kartu dan saldo memakai komponen sendiri di `components/dashboard/`.** `TotalsStrip` dari transactions tidak dipakai ulang karena tidak punya pembanding.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Pemotongan hari salah di 31→30, Februari kabisat, atau Desember→Januari | Sedang | T55 mulai dari tes merah untuk semua kasus itu |
| Totals dashboard berbeda dari `/transactions` atau `/budget` | Sedang | T56 memakai `transactionTotals` + `transactionWhere` apa adanya. Invarian vs `budgetUsage` dites |
| Dashboard basi setelah mencatat transaksi | Sedang | Kasus `affectedBy("transactions")` di `cache-invalidation.spec.ts` (T57), dicek manual di checkpoint O |
| `useSearchParams` di `/dashboard` merusak `cacheComponents` | Sedang | `<Suspense>`, `pnpm build` di T58 |

## Checkpoint O

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual 360×800 dan 1024: ganti bulan/tahun, refresh mempertahankan periode, catat expense → kartu dan saldo berubah, tap kartu → `/transactions` dengan total yang sama
- [ ] Review dengan Yogi, termasuk open questions 1–3 dan 5 di spec sebelum phase 17
