# Plan phase 41: Koreksi saldo akun transaksi

Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md) § Koreksi saldo (perlu diformalkan sebelum implementasi) · Todo: [todo-41.md](todo-41.md)

## Tujuan

Pemilik akun bertipe `transaction` dapat memasukkan saldo aktual dan menyamakan saldo akun di Lontu dengannya. Sistem mencatat selisih sebagai transaksi `adjustment`, tanpa mengubah transaksi lama atau saldo awal. Akun bertipe `asset` tidak dapat memakai aksi ini.

## Keputusan rancangan

- Koreksi saldo adalah aksi terpisah; edit saldo awal tetap memakai kontrak saat ini.
- `delta = saldo aktual − balance` (saldo saat ini dari `account_balances`). Delta positif/negatif dicatat sebagai `adjustment`; nol tidak membuat transaksi.
- Transaksi diberi deskripsi yang membedakannya dari "Penyesuaian saldo awal"; usulan label: **Koreksi saldo**.
- API khusus `POST /api/accounts/[id]/reconcile` agar makna operasi tidak bercampur dengan `PATCH` akun. Input saldo aktual divalidasi sebagai integer rupiah dalam rentang akun.
- Validasi kepemilikan, tipe akun `transaction`, pembacaan saldo, dan insert adjustment berlangsung aman terhadap konkurensi di transaksi DB dengan lock akun. Hasil operasi mengembalikan akun terbarui.
- Tidak ada perubahan skema/migrasi: tipe `adjustment` dan view saldo sudah mendukung nilai bertanda.
- UI aksi ada pada pengelolaan akun; hanya tampil untuk akun `transaction`. Mengirim aksi langsung untuk akun `asset` ditolak API.

## Dependency graph

```
SPEC akun (kontrak + acceptance criteria)
  └─► route/API + server transaction + tes API
       └─► hook/cache invalidation
            └─► UI koreksi saldo + validasi/manual check
```

## Task list

### Phase 1: Kontrak dan server
- [ ] T145: Finalisasi spec koreksi saldo (XS)
- [ ] T146: Endpoint koreksi saldo atomik dan tes API (M)

### Checkpoint: Server
- [ ] Tes membuktikan koreksi positif, negatif, nol, akun bukan milik user, akun `asset`, serta konsistensi saldo hasil.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` hijau.

### Phase 2: UI
- [ ] T147: Integrasi hook dan aksi UI koreksi saldo (M)

### Checkpoint: Complete
- [ ] Koreksi dapat dilakukan dari pengelolaan akun transaksi dan saldo diperbarui tanpa reload.
- [ ] UI responsif 360 px, input rupiah dan target sentuh mengikuti aturan desain.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau.

## Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Perubahan saldo bersamaan menghasilkan koreksi dari saldo usang | Tinggi | Lock baris akun dan baca saldo setelah lock dalam transaksi; tes konkurensi bila harness mendukung. |
| Pengguna mengira koreksi mengubah saldo awal | Sedang | Aksi/label dan deskripsi transaksi menyebut koreksi saldo; saldo awal tidak disentuh. |
| Cache akun/transaksi tidak ikut diperbarui | Sedang | Gunakan invalidasi resource yang sudah ada dan tes hook/cache; operasi menghasilkan transaksi adjustment. |

## Verifikasi

- API: `pnpm vitest run tests/api/accounts.spec.ts` (atau tes khusus koreksi jika dipisah).
- Gerbang tiap task: `pnpm lint && pnpm typecheck && pnpm test`.
- UI: `pnpm build`; cek manual di 360×800 dan desktop, termasuk akun `asset` tanpa aksi.

## Open questions

- Tidak ada untuk perhitungan/eligibility. Label deskripsi transaksi direncanakan "Koreksi saldo"; boleh disesuaikan saat finalisasi spec.
- Implementasi belum dimulai sampai plan dan spec disetujui.
