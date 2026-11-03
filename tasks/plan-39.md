# Plan phase 39: Check-in hari ini dan deskripsi

Index: [plan.md](plan.md) § Modul `goals` · Todo: [todo-39.md](todo-39.md) · Spec: [SPEC-goals.md](../SPEC-goals.md) keputusan #6, #7, #23, § Validasi, Aturan tulis, UI

## Tujuan

"Perbarui nilai" selalu mencatat nilai **hari ini**: client tidak mengirim tanggal, server memakai `todayInJakarta()`, dan sheet tidak punya picker. Pemilik bisa menambah deskripsi opsional per check-in, dan baris aset yang sudah dinilai hari ini tidak menawarkan tombol yang pasti ditolak. Asal: sesi idea-refine 2026-11-02.

## Task

- [x] T135: Check-in bertanggal server (M)
- [x] T136: Deskripsi opsional di check-in (M)
- [x] T137: Baris aset "diperbarui hari ini" (S)
- [x] T138: Verifikasi dan status (S)

Urutan: T135 → T136 → T138. T137 tidak bergantung pada T135/T136 dan boleh dikerjakan kapan saja sebelum T138.

Sebelum T135: satu commit `docs(goals)` berisi revisi SPEC-goals.md, plan-39.md, todo-39.md, dan baris indeks plan.md.

## Dependency graph

```
docs(goals) spec + plan
   │
   ├─► T135 schema tanpa date ─► server: today + saldo dari view ─► sheet tanpa picker
   │      │
   │      └─► T136 note di schema ─► description di insert ─► field Deskripsi + cek client
   │
   ├─► T137 valuedLabel "hari ini" ─► baris aset tanpa tombol   (independen)
   │
   └─► T138 verifikasi (butuh T135, T136, T137)
```

## Keputusan

- **Kontrak dan sheet di satu task (T135).** Begitu `date` dihapus dari `valuationSchema`, sheet lama mendapat 400 (`strictObject`). Memisahkan server dan client akan meninggalkan commit yang rusak.
- **Saldo dari `accountBalances`**, dengan join seperti `asset-valuations.ts`, di query terpisah sesudah lock (snapshot baru di READ COMMITTED, sama seperti sekarang). `balancesOn` dihapus.
- **`dateProblem` jadi satu pesan:** revaluasi terakhir ≥ `today` → "Nilai sudah diperbarui hari ini. Revaluasi hanya sekali sehari." di `fields["items.<i>"]`. Perbandingan `≥` (bukan `===`) murah dan menutup data aneh bertanggal masa depan.
- **Hint tanggal di sheet** memakai `formatShortDate(today, today)` yang sudah dipakai `valuedLabel`, bukan format baru.
- **Deskripsi memakai schema `description` transaksi**: di-export dari `lib/schemas/transaction.ts` jika belum, tidak disalin.
- **Cek "deskripsi tanpa perubahan nilai" hanya di client**, di cabang `value === undefined || value === asset.balance` yang sudah ada di `submit`. Server tidak menolak, demi idempotensi (keputusan #23).

## Tes yang ditulis ulang (kontrak berubah, bukan dilemahkan)

| Tes sekarang (`tests/api/valuations.spec.ts`)                                           | Sesudah                                                                                       |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| records the difference … as one dated revaluation (`date "2026-10-31"`)                 | sama, tanpa `date`; tanggal baris = `todayInJakarta()`                                        |
| rejects a new value dated before the latest revaluation                                 | diganti: body berisi `date` → 400                                                             |
| rejects a second new value on the same date                                             | sama, hari ini, error di `fields["items.0"]`                                                  |
| checks only the items that change, each against its own account                         | sama; revaluasi hari ini untuk akun A disisipkan langsung di DB                               |
| accepts a new value dated after the latest revaluation                                  | revaluasi kemarin disisipkan langsung di DB, lalu check-in → 200                              |
| counts every adjustment whatever its date, but not transactions after the date          | bagian adjustment tetap; bagian "transaksi sesudah tanggal" dihapus bersama keputusan #7      |
| rejects a date after today                                                              | digabung ke "body berisi `date` → 400"                                                        |

`tests/unit/valuation-schema.spec.ts`: tiga tes `date` diganti satu tes "`date` adalah field tak dikenal". Tes lain di kedua berkas tidak berubah selain body tanpa `date`.

## Risiko

| Risiko                                                                  | Dampak | Mitigasi                                                                                                   |
| ----------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Saldo dari view berbeda dari `balancesOn` untuk data bertanggal masa depan | Rendah | Tidak bisa dibuat lewat API (`date ≤ hari ini`); view adalah saldo yang dilihat pemilik, jadi delta konsisten |
| Tes flaky saat run melewati tengah malam Jakarta                         | Rendah | Tanggal yang diharapkan dihitung sekali per tes; diterima (spec § Tes)                                      |
| Deskripsi hilang diam-diam saat nilai tidak berubah                      | Sedang | Error di field deskripsi sebelum request (T136), cek manual                                                 |
| Konflik dengan sheet hasil commit `541d55f` (DateField popover)          | Rendah | T135 hanya menghapus pemakaian `DateField` di sheet; komponennya tetap dipakai form lain                    |

## Checkpoint AL

- [x] Butir SPEC-goals § Acceptance criteria yang dibuka lagi (revisi 2026-11-02) hijau (API) atau ditandai tertunda (UI)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; tidak ada tes di luar `valuations.spec.ts`, `valuation-schema.spec.ts`, `valuation-format.spec.ts` yang diubah (kecuali `cache-invalidation.spec.ts`, lihat Temuan verifikasi T138 di plan.md)
- [x] `rg -n "balancesOn|valuation-date|Pembaruan nilai" lib components` kosong
- [x] SPEC-goals.md Status dan plan.md baris `goals` diperbarui
- [ ] Review dengan Yogi
