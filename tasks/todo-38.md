# Todo phase 38: Target, UI dan penutupan

Plan: [plan-38.md](plan-38.md) · Index: [plan.md](plan.md) · Spec: [SPEC-goals.md](../SPEC-goals.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T132: Kartu target dan buat target

**Description:** `hooks/use-goals.ts` (`useGoals`, `createGoal`), resource `goals` di `lib/cache-invalidation.ts` (edge dari `transactions` dan `accounts`), `lib/goal-format.ts` (`goalProjectionText`), `components/goals/goal-card.tsx` (nama, `current` dari `targetAmount`, bar + persen teks, "Disetor · Pasar", kalimat proyeksi, baris basi dengan tautan ke sheet), `components/forms/goal-form.tsx` (mode buat), dan pemasangan di `goals-view.tsx` dengan tombol "Tambah target" dan empty state.

**Acceptance criteria:**

- [x] Buat target dari `/goals` → kartu muncul dengan progres, porsi disetor/pasar, dan kalimat proyeksi tanpa reload; check-in sesudahnya memperbarui kartu
- [x] Form: akun milik target lain tampil nonaktif "Dipakai {target}", kartu kredit tidak tampil, saldo tampil di samping nama; error server terpasang lewat `applyServerErrors`
- [x] `goalProjectionText` mencakup semua cabang SPEC-goals § UI; status basi, terlambat, dan pasar negatif terbaca tanpa warna; `hideAmounts` menyamarkan nominal; offline → simpan nonaktif

**Verification:**

- [x] `pnpm vitest run tests/unit/goal-format.spec.ts tests/unit/cache-invalidation.spec.ts` hijau
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual (tertunda: sesi tanpa browser): skenario dasar SPEC-goals dibuat lewat UI di 360×800 dan 1024

**Dependencies:** T127, T130

**Files likely touched:** `hooks/use-goals.ts`, `lib/cache-invalidation.ts`, `lib/goal-format.ts`, `components/goals/goal-card.tsx`, `components/forms/goal-form.tsx`, `components/goals/goals-view.tsx`, `tests/unit/goal-format.spec.ts`

**Estimated scope:** M

**Catatan (2026-11-02):** `AFFECTS.goals = ["valuations"]` (spec menulis `[]`), karena `GET /api/valuations` memuat `goalId` sejak T129. Daftar akun form dari `goalAccountOptions` (diuji unit). Bar memakai ulang `BudgetProgress` dengan status `ok`. JS first load `/goals` 331,2 KB gzip (form lazy). Tes: 1477 lulus (87 berkas).

---

### T133: Edit, arsip, Urungkan, dan daftar arsip

**Description:** Mutasi `updateGoal`, `archiveGoal`, `restoreGoal` di `hooks/use-goals.ts`. Tap kartu → `goal-form.tsx` mode edit (akun terarsip yang sudah ada tampil "(arsip)" dan tetap tercentang). Menu kartu → Arsipkan dengan toast "Target diarsipkan · Urungkan" (6 detik, `removeOptimistically` seperti arsip aturan). "Lihat arsip" menampilkan target terarsip dengan tombol Pulihkan; 409 `GOAL_RESTORE_CONFLICT` → toast pesan server.

**Acceptance criteria:**

- [x] Edit nama, nominal, bulan target, dan akun → kartu dan proyeksi berubah tanpa reload; menghapus bulan target menghilangkan kalimat "Butuh … /bulan"
- [x] Arsip → kartu hilang seketika, akun bebas di form target lain; Urungkan mengembalikannya; Urungkan offline → toast gagal
- [x] Pulihkan dari daftar arsip berhasil, atau menampilkan pesan bentrok tanpa mengubah data

**Verification:**

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual (tertunda: sesi tanpa browser): skenario di atas di 360×800

**Dependencies:** T131, T132

**Files likely touched:** `hooks/use-goals.ts`, `components/goals/goal-card.tsx`, `components/forms/goal-form.tsx`, `components/goals/goals-view.tsx`

**Estimated scope:** M

**Catatan (2026-11-02):** edit dibuka dari tombol ikon "Ubah" di kartu (bukan tap seluruh kartu, karena kartu memuat tombol "Perbarui" untuk nilai basi). Arsip memakai pola `archiving` + `undoToast` dari `/recurring`. Pulihkan dan Urungkan menampilkan pesan 409 server apa adanya. Form edit memakai `goalEditSchema(bulan tersimpan)` supaya target yang bulannya sudah lewat tetap bisa diubah namanya; PATCH hanya mengirim field yang berubah (`goalChanges`). Saklar arsip memakai `ShowArchivedSwitch` ("Tampilkan arsip"). JS first load `/goals` 336,1 KB gzip. Tes: 1485 lulus (87 berkas).

---

### T134: Verifikasi akhir modul `goals`

**Description:** Jalankan semua Acceptance criteria SPEC-goals (API lewat tes, UI manual atau tertunda), catat temuan di plan.md § Modul `goals` (seperti "Temuan verifikasi T89"), ukur JS first load `/goals` dan `/dashboard` sebelum/sesudah, perbarui status di plan.md dan SPEC-goals.md. Perbaikan yang ditemukan menjadi commit `fix` terpisah dengan tes yang mereproduksi.

**Acceptance criteria:**

- [x] Setiap butir Acceptance criteria SPEC-goals dicentang atau ditandai "tertunda: sesi tanpa browser" dengan alasan
- [ ] Tabel ukuran sebelum/sesudah di plan.md; `/goals` < 200 KB gzip, `/dashboard` ≤ +0,5 KB (tabel ada; `/dashboard` +0,3 KB lulus; `/goals` 336,1 KB tidak lulus karena app shell bersama)
- [x] plan.md baris `goals` → "Selesai (T123–T134)"; SPEC-goals.md Status diperbarui

**Verification:**

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; jumlah tes akhir dicatat (1486)
- [ ] Review bersama Yogi (tertunda)

**Dependencies:** T126, T133

**Files likely touched:** `tasks/plan.md`, `tasks/plan-38.md`, `SPEC-goals.md`

**Estimated scope:** S
