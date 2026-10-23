# Plan phase 15: Saran 50/30/20

Index: [plan.md](plan.md) · Todo: [todo-15.md](todo-15.md) · Spec: [SPEC-budgets.md](../SPEC-budgets.md) § Keputusan 4, Saran 50/30/20, Kontrak API (`suggestion`), Deliverables (panel saran)

## Tujuan

Pemilik membuka "Saran 50/30/20", melihat pool Needs/Wants/Saving dari income bulan lalu (atau angka yang diketik), melihat nominal per kategori dan baris mana yang akan menimpa budget yang ada, memilih, lalu menerapkan dengan satu tap. Phase ini menutup modul `budgets`.

## Task

- [x] T52: `suggestBudgets` murni (S)
- [ ] T53: `GET /api/budgets/suggestion` + query riwayat (M)
- [ ] T54: Panel saran di UI (M)

Urutan: T52 → T53 → T54. T52 bisa dikerjakan kapan saja setelah T42.

## Keputusan

- **Pembagian di TS murni, data dari DB.** `budget-history.ts` mengembalikan dua angka teragregasi: income bulan sebelumnya, dan `sum(expense)` per kategori spending aktif selama 3 bulan penuh sebelum `period` (dibagi 3 di TS). Tidak ada baris transaksi yang dibawa ke TS.
- **Sisa terbesar dalam satuan 1.000:** pool → `floor(pool / 1000)` unit, kuota per kategori = unit × bobot / total bobot, `floor` dulu, sisa unit dibagikan ke pecahan terbesar, seri diputus `categoryId` naik.
- **`income` di query** menggantikan dasar (`basisSource = "input"`). Panel me-refetch dengan debounce 400 ms, key SWR memuat `income`.
- **Default centang:** kategori tanpa budget tercentang, yang punya budget tidak tercentang dan diberi label "Ganti Rp…". "Terapkan" mengirim satu `PUT` (T44) berisi baris tercentang, maksimal 100 (jumlah kategori jauh di bawahnya).

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Jumlah per grup tidak sama dengan pool | Rendah | Properti diuji di T52 dengan beberapa bobot acak tetap (seed tetap, tanpa dependency baru) |
| Batas "3 bulan penuh" bergeser di Januari/Februari | Sedang | Rentang dari `shiftPeriod` + `monthRange`, dites lintas tahun |
| Refetch tiap ketukan membebani DB | Rendah | Debounce, dan query hanya dua agregat |

## Checkpoint N (modul selesai)

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Semua acceptance criteria di SPEC-budgets.md tercentang
- [ ] Manual 360×800 dan 1024, light dan dark: atur → lihat → hapus/urungkan → salin → saran → terapkan, tanpa horizontal scroll, target ≥ 44 px
- [ ] Review dengan Yogi (termasuk open questions 5–7 di spec), lalu tulis `SPEC-dashboard.md`
