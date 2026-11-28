# Todo phase 41: Koreksi saldo akun transaksi

Plan: [plan-41.md](plan-41.md) · Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md) § Koreksi saldo

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga `pnpm build` dan cek manual di 360×800 dan desktop.

---

### T145: Finalisasi spec koreksi saldo

**Description:** Perbarui kontrak modul akun untuk fitur koreksi saldo yang hanya berlaku untuk akun `transaction`. Tegaskan kalkulasi terhadap saldo saat ini, saldo aktual, transaksi adjustment bertanda, deskripsi, perilaku delta nol, atomisitas, dan API khusus. Tandai keputusan sebelumnya sebagai tetap berlaku untuk edit saldo awal.

**Acceptance criteria:**

- [ ] SPEC mencakup kriteria +100.000 dan −100.000 yang menghasilkan saldo sama dengan saldo aktual.
- [ ] SPEC menyebut delta nol tidak membuat transaksi, akun `asset` ditolak, dan tidak ada perubahan saldo awal/transaksi lama.
- [ ] Kontrak endpoint dan format error dinyatakan.

**Verification:**

- [ ] Tinjau konsistensi dengan kontrak adjustment dan saldo di SPEC akun.

**Dependencies:** Persetujuan plan ini.

**Files likely touched:** `SPEC-accounts-categories.md`

**Estimated scope:** XS

---

### T146: Endpoint koreksi saldo atomik

**Description:** Implementasikan endpoint khusus koreksi saldo, validasi autentikasi/body/ownership/jenis akun, kunci baris akun, hitung delta dari saldo `account_balances`, dan buat transaksi `adjustment` secara atomik. Tambahkan tes API untuk hasil positif, negatif, nol, akun asset, isolasi user, dan konsistensi saldo.

**Acceptance criteria:**

- [ ] Input saldo aktual membuat delta `saldo aktual − saldo saat ini`; saldo respons tepat sama dengan target.
- [ ] Delta nol tidak menambah baris adjustment; akun `asset` tidak bisa dikoreksi.
- [ ] Transaksi dan saldo akun tersimpan atomik serta dibatasi pada akun milik user.

**Verification:**

- [ ] Tes merah sebelum implementasi: `pnpm vitest run tests/api/accounts.spec.ts`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test`.

**Dependencies:** T145

**Files likely touched:** `app/api/accounts/[id]/reconcile/route.ts`, `lib/server/accounts.ts`, schema request akun bila perlu, `tests/api/accounts.spec.ts`.

**Estimated scope:** M

---

### T147: UI koreksi saldo

**Description:** Tambahkan aksi koreksi saldo pada pengelolaan akun transaksi. Pengguna mengisi saldo aktual, melihat/menyetujui selisih, lalu mengirimkannya melalui hook; invalidasi akun dan transaksi harus menjaga saldo serta riwayat tetap segar. Jangan tampilkan aksi pada akun asset.

**Acceptance criteria:**

- [ ] Aksi hanya tersedia untuk akun `transaction`, dan formulir menerima nominal sesuai pola input saldo yang ada.
- [ ] Sukses menampilkan saldo hasil yang cocok dengan saldo aktual dan adjustment terlihat di riwayat tanpa reload.
- [ ] Gagal validasi/server ditampilkan sesuai pola error form yang ada.

**Verification:**

- [ ] Tes unit untuk hook/validasi dan invalidasi cache yang diperlukan.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- [ ] Cek manual pada 360×800 dan desktop.

**Dependencies:** T146

**Files likely touched:** `components/modals/manage-accounts.tsx` atau form terkait, `hooks/use-accounts.ts`, tes unit terkait.

**Estimated scope:** M

---

## Checkpoint Server

- [ ] Kriteria API T145–T146 dipenuhi dan seluruh tes lint/typecheck/test lulus.

## Checkpoint Complete

- [ ] Kriteria UI T147 dipenuhi; build dan pemeriksaan responsif selesai atau keterbatasan sesi dicatat.
- [ ] Plan/spec diindeks di `tasks/plan.md` dan `SPEC.md` bila sesuai konvensi modul.
