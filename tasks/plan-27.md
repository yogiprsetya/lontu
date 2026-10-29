# Plan phase 27: Key cache dan invalidasi

Index: [plan.md](plan.md) § Refactor arsitektur · Todo: [todo-27.md](todo-27.md) · Spec: [SPEC-dashboard.md](../SPEC-dashboard.md) § Kontrak (`KEYS`, `AFFECTS`), [SPEC-transactions.md](../SPEC-transactions.md) § optimistic update

## Tujuan

`lib/cache-invalidation.ts` memiliki seluruh ruang key SWR: membangun key, mencocokkannya, menghitung apa yang ikut basi, dan alur hapus optimistic dengan rollback. Hook hanya menyebut URL, method, dan resource yang berubah. `AFFECTS` jujur: setiap entri mendaftar lengkap apa yang basi, jadi pemanggil tidak perlu tahu kedalaman graf.

## Task

- [x] T97: `AFFECTS` lengkap, tanpa sisi `recurring → transactions` (S, butuh jawaban Open question #2)
- [x] T98: Key dibangun dari tabel yang sama dengan pencocoknya (M)
- [x] T99: Satu alur hapus optimistic dengan rollback (S)
- [ ] T100: Satu toast undo (S)

Urutan: T97 → T98 → T99; T100 bebas.

## Keputusan

- **Tanpa closure.** Review mengusulkan `AFFECTS` transitif, tetapi saat direncanakan ternyata closure memperparah masalah: `invalidate("recurring")` sudah mencapai `transactions` lewat sisi `recurring → transactions`, jadi edit nama aturan me-refetch semua daftar transaksi, dan closure akan menambah `accounts`, `budgets`, `dashboard`. Akar masalahnya sisi itu: aturan berubah tidak membuat transaksi basi; Catat adalah perubahan `transactions`. Jadi sisi itu dihapus dan aturan "setiap entri lengkap" ditulis di spec dan komentar.
- **Dampak:** edit/arsip/pulihkan aturan dan Lewati berhenti me-revalidate transaksi (lebih sedikit request). Catat tidak berubah. Resource lain tidak berubah.
- **Builder key per resource** (`apiKey("accounts", { includeArchived })`) tinggal di modul ini, satu tabel `{ base, params }` per resource; regex `KEYS` diturunkan dari `base`. Nama param query tetap sama dengan sekarang (kontrak API tidak berubah).
- **`removeOptimistically({ match, update, send, resource, except? })`**: terapkan `update` ke key yang cocok tanpa revalidasi, kirim, lalu `invalidate(resource, { except })` saat berhasil atau `invalidate(resource)` saat gagal, lalu lempar ulang. Updater murni (`removeFromPages`, `removeBudgetFromUsage`) tetap di tempatnya.
- **Toast undo:** `undoToast({ message, restore, failure })` di `lib/undo-toast.ts` (client), memegang label "Urungkan", durasi 6000 ms, dan pesan gagal.

## Risiko

| Risiko                                                         | Dampak | Mitigasi                                                                                           |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| Data basi karena key yang dibangun tidak cocok regex           | Tinggi | Tes T98: setiap key dari setiap builder cocok dengan resource-nya dan tidak cocok resource lain    |
| Ada layar yang diam-diam bergantung pada refetch transaksi setelah edit aturan | Rendah | Disetujui di Open question #2 sebelum T97; cek manual `/recurring` dan dashboard setelah edit aturan |
| Rollback hilang di salah satu hook                             | Sedang | `use-transactions.spec.ts` dan `use-budgets.spec.ts` (kasus server menolak) hijau tanpa diubah     |

## Checkpoint Z

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Tidak ada string `"/api/` di `hooks/` selain argumen URL `sendJSON`
- [ ] Manual: hapus transaksi → hilang seketika → Urungkan mengembalikannya, saldo dan dashboard ikut; hapus budget → sama; Catat dari kotak Jatuh tempo → saldo, budget, dashboard, kartu gajian terbarui tanpa reload
- [ ] Review dengan Yogi sebelum phase 28
