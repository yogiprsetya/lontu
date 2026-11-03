# Plan phase 40: Histori nilai aset

Index: [plan.md](plan.md) § Modul `asset-history` · Todo: [todo-40.md](todo-40.md) · Spec: [SPEC-asset-history.md](../SPEC-asset-history.md)

## Tujuan

Section "Histori nilai" di `/net-worth` menjawab "aset saya naik atau turun, dan karena apa?": kalimat ringkasan, grafik Nilai vs Disetor, dan tabel per bulan (Setoran · Pasar · Nilai), untuk gabungan atau satu akun aset, rentang 6/12/Semua. Semua angka diturunkan dari `transactions` di SQL, tanpa tabel atau migrasi. Asal: sesi idea-refine + `/spec` 2026-11-03.

## Task

- [x] T139: Query `assetHistory` (M)
- [x] T140: Route `GET /api/valuations/history` (S)
- [x] T141: Section Histori nilai: ringkasan dan tabel (M)
- [x] T142: Kontrol rentang dan akun (S)
- [ ] T143: Grafik Nilai vs Disetor (S)
- [ ] T144: Verifikasi dan status (S)

Urutan: T139 → T140 → T141 → T142, T143 (saling bebas) → T144.

Sebelum T139: satu commit `docs(asset-history)` berisi SPEC-asset-history.md, baris capability map di SPEC.md, rujukan di SPEC-goals.md, plan-40.md, todo-40.md, dan bagian modul + baris indeks di plan.md.

## Dependency graph

```
docs(asset-history) spec + plan
   │
   └─► T139 tipe + withChanges + query SQL (tes dengan baris langsung di DB)
          │
          └─► T140 query schema + route (400/404/401/isolasi)
                 │
                 └─► T141 summary murni + hook + section (ringkasan, tabel, 12 bln gabungan)
                        │
                        ├─► T142 ToggleGroup rentang + Select akun
                        ├─► T143 grafik (next/dynamic) + ukuran bundle
                        │
                        └─► T144 verifikasi (butuh T142, T143)
```

## Keputusan

- **SQL dulu, dikunci tes, sebelum route** (sama dengan T129 untuk `goalProgress`). Risiko terbesar modul ini adalah angka kumulatif yang salah (bulan pertama akun, transfer dua sisi, revaluasi terhapus, akun terarsip). T139 menulis tes merah dengan angka tabel SPEC § Acceptance criteria lebih dulu.
- **Bentuk SQL:** CTE `assets` (akun aset aktif user, opsional satu id; bulan pertama = `least(to_char(created_at at time zone 'Asia/Jakarta', 'YYYY-MM'), bulan transaksi hidup tertua)`), CTE `deltas` per bulan (join transaksi dari sisi `account_id` dan `to_account_id` seperti `flows` di `goal-progress.ts`, `revaluation` terpisah, `initial_balance` di bulan pertama), `generate_series` di atas `timestamp` dengan label `to_char` seperti `expenseActivity`, `sum() over (order by month)`. Jendela 6/12 dan `opening` dipotong di TS dari seri penuh: barisnya paling banyak beberapa ratus, dan aritmetika jendela cukup dengan `addMonths`.
- **`assetHistory` mengembalikan `null`** jika `accountId` bukan akun aset aktif milik user. Route memetakannya ke `accountNotFound()`. Query tidak tahu soal HTTP.
- **Fungsi murni di `lib/asset-history.ts`:** `withChanges` di T139 (dipakai query), `assetHistorySummary` + `summarySentence` di T141 (dipakai UI). Satu file, dites di `tests/unit/asset-history.spec.ts`.
- **Hook mengekspor `assetHistoryKey()`**, sama dengan `valuationsKey()`. Tes cache memakai fungsi itu, jadi key histori yang benar-benar dipakai yang dikunci cocok dengan resource `valuations`.
- **Komponen yang dipakai ulang:** `ToggleGroup`/`ToggleGroupItem` (pola `account-form.tsx`: `value={[v]}`, `onValueChange={(next) => next[0] && …}`), `Select` (pola `filter-panel.tsx`), `SectionTitle`, `LoadError`, `Skeleton`, `formatBucket`, `abbreviateIDR`, `useAmountFormat`. Tidak ada komponen shadcn baru.
- **Nominal tabel responsif:** dua `<span>` (`sm:hidden` berisi `abbreviateIDR`, `hidden sm:inline` berisi `formatIDR`). Hanya satu yang tampil, jadi screen reader membaca satu angka.
- **Domain sumbu Y** dicek di `.d.ts` Recharts terpasang sebelum ditulis (`["dataMin", "dataMax"]` atau fungsi), bukan dari ingatan.
- **Branch `feat/asset-history` dari `feat/goals`** (30 commit di depan master, belum di-merge). Rebase ke master setelah PR goals masuk.

## Risiko

| Risiko                                                                        | Dampak | Mitigasi                                                                                                    |
| ----------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Angka kumulatif salah (bulan pertama, transfer antar aset, soft delete, arsip) | Tinggi | T139 tes merah dulu dengan tabel SPEC, kasus backdate, invarian terhadap `assetValuations`                 |
| Bulan pertama bergeser karena zona waktu `created_at`                         | Sedang | `at time zone 'Asia/Jakarta'` seperti `first_month` di `goal-progress.ts`; tes akun dibuat 2026-07-01      |
| Tabel empat kolom tidak muat di 360 px                                        | Sedang | Angka singkatan di bawah `sm`, `tabular-nums`; cek manual di T141 (boleh tertunda)                          |
| Recharts masuk first load `/net-worth`                                        | Sedang | `next/dynamic` di T143; ukur sebelum/sesudah dengan metode Catatan ukuran dashboard                         |
| Tes API baru menambah tunggu koneksi pooler (Temuan T134, T138)               | Rendah | Satu `beforeAll` per skenario, baris ditulis langsung lewat `db.insert`; run ulang sebelum dianggap gagal   |

## Checkpoint AM (sesudah T140)

- [x] Semua butir API/query di SPEC-asset-history § Acceptance criteria hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau, jumlah tes dicatat (sebelumnya 1512, sekarang 1543)
- [x] Tidak ada tes lama yang diubah

## Checkpoint AN (sesudah T144)

- [ ] Butir UI SPEC-asset-history dicentang atau ditandai "tertunda: sesi tanpa browser"
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; ukuran first load `/net-worth` sebelum/sesudah dicatat
- [ ] Status SPEC-asset-history.md dan baris `asset-history` di plan.md diperbarui
- [ ] Review dengan Yogi
