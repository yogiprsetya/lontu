# Todo phase 38: Target, UI dan penutupan

Plan: [plan-38.md](plan-38.md) · Index: [plan.md](plan.md) · Spec: [SPEC-goals.md](../SPEC-goals.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T132: Kartu target dan buat target

**Description:** `hooks/use-goals.ts` (`useGoals`, `createGoal`), resource `goals` di `lib/cache-invalidation.ts` (edge dari `transactions` dan `accounts`), `lib/goal-format.ts` (`goalProjectionText`), `components/goals/goal-card.tsx` (nama, `current` dari `targetAmount`, bar + persen teks, "Disetor · Pasar", kalimat proyeksi, baris basi dengan tautan ke sheet), `components/forms/goal-form.tsx` (mode buat), dan pemasangan di `goals-view.tsx` dengan tombol "Tambah target" dan empty state.

**Acceptance criteria:**

- [ ] Buat target dari `/goals` → kartu muncul dengan progres, porsi disetor/pasar, dan kalimat proyeksi tanpa reload; check-in sesudahnya memperbarui kartu
- [ ] Form: akun milik target lain tampil nonaktif "Dipakai {target}", kartu kredit tidak tampil, saldo tampil di samping nama; error server terpasang lewat `applyServerErrors`
- [ ] `goalProjectionText` mencakup semua cabang SPEC-goals § UI; status basi, terlambat, dan pasar negatif terbaca tanpa warna; `hideAmounts` menyamarkan nominal; offline → simpan nonaktif

**Verification:**

- [ ] `pnpm vitest run tests/unit/goal-format.spec.ts tests/unit/cache-invalidation.spec.ts` hijau
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual (boleh tertunda: sesi tanpa browser): skenario dasar SPEC-goals dibuat lewat UI di 360×800 dan 1024

**Dependencies:** T127, T130

**Files likely touched:** `hooks/use-goals.ts`, `lib/cache-invalidation.ts`, `lib/goal-format.ts`, `components/goals/goal-card.tsx`, `components/forms/goal-form.tsx`, `components/goals/goals-view.tsx`, `tests/unit/goal-format.spec.ts`

**Estimated scope:** M

---

### T133: Edit, arsip, Urungkan, dan daftar arsip

**Description:** Mutasi `updateGoal`, `archiveGoal`, `restoreGoal` di `hooks/use-goals.ts`. Tap kartu → `goal-form.tsx` mode edit (akun terarsip yang sudah ada tampil "(arsip)" dan tetap tercentang). Menu kartu → Arsipkan dengan toast "Target diarsipkan · Urungkan" (6 detik, `removeOptimistically` seperti arsip aturan). "Lihat arsip" menampilkan target terarsip dengan tombol Pulihkan; 409 `GOAL_RESTORE_CONFLICT` → toast pesan server.

**Acceptance criteria:**

- [ ] Edit nama, nominal, bulan target, dan akun → kartu dan proyeksi berubah tanpa reload; menghapus bulan target menghilangkan kalimat "Butuh … /bulan"
- [ ] Arsip → kartu hilang seketika, akun bebas di form target lain; Urungkan mengembalikannya; Urungkan offline → toast gagal
- [ ] Pulihkan dari daftar arsip berhasil, atau menampilkan pesan bentrok tanpa mengubah data

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual (boleh tertunda: sesi tanpa browser): skenario di atas di 360×800

**Dependencies:** T131, T132

**Files likely touched:** `hooks/use-goals.ts`, `components/goals/goal-card.tsx`, `components/forms/goal-form.tsx`, `components/goals/goals-view.tsx`

**Estimated scope:** M

---

### T134: Verifikasi akhir modul `goals`

**Description:** Jalankan semua Acceptance criteria SPEC-goals (API lewat tes, UI manual atau tertunda), catat temuan di plan.md § Modul `goals` (seperti "Temuan verifikasi T89"), ukur JS first load `/goals` dan `/dashboard` sebelum/sesudah, perbarui status di plan.md dan SPEC-goals.md. Perbaikan yang ditemukan menjadi commit `fix` terpisah dengan tes yang mereproduksi.

**Acceptance criteria:**

- [ ] Setiap butir Acceptance criteria SPEC-goals dicentang atau ditandai "tertunda: sesi tanpa browser" dengan alasan
- [ ] Tabel ukuran sebelum/sesudah di plan.md; `/goals` < 200 KB gzip, `/dashboard` ≤ +0,5 KB
- [ ] plan.md baris `goals` → "Selesai (T123–T134)"; SPEC-goals.md Status diperbarui

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; jumlah tes akhir dicatat
- [ ] Review bersama Yogi

**Dependencies:** T126, T133

**Files likely touched:** `tasks/plan.md`, `tasks/plan-38.md`, `SPEC-goals.md`

**Estimated scope:** S
