# Todo phase 35: Spec dan persetujuan

Plan: [plan-35.md](plan-35.md) · Index: [plan.md](plan.md) · Spec: [SPEC-goals.md](../SPEC-goals.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task dokumen cukup `pnpm format:check`.

---

### T123: Persetujuan spec dan revisi spec terkait

**Description:** Review SPEC-goals.md bersama Yogi, catat jawaban Open questions 1–5, lalu perbarui spec yang terdampak. SPEC.md: baris `goals` di capability map (bergantung pada `accounts-categories`, `transactions`), urutan build (Fase 2, setelah `recurring`), keputusan terkunci #8 menjadi 7 tabel, Objective menyebut target. SPEC-transactions.md: tipe `revaluation` di tabel aturan domain, tipe respons, filter, keputusan #12 (totals), label "Revaluasi". SPEC-accounts-categories.md: subtype `gold` di keputusan #4 dan tipe `Account`, baris `revaluation` di tabel constraint § Transaksi penyesuaian. Tanpa perubahan kode. Berhenti untuk review Yogi.

**Acceptance criteria:**

- [ ] Yogi menyetujui perubahan skema (tabel `goals`, constraint `transactions`, view) dan capability map; persetujuan bertanggal dicatat di SPEC-goals.md § Keputusan dan plan-35 § Keputusan
- [ ] Open questions 1–5 dijawab di SPEC-goals.md dan plan.md § Modul `goals`; jika #1 berubah, plan-37 direvisi sebelum checkpoint AH
- [ ] SPEC.md, SPEC-transactions.md, SPEC-accounts-categories.md tidak bertentangan dengan SPEC-goals.md (`rg -n "6 tabel|adjustment" SPEC*.md` diperiksa satu per satu)

**Verification:**

- [ ] `pnpm format:check` hijau
- [ ] Review dokumen bersama Yogi (tanpa perubahan kode)

**Dependencies:** None

**Files likely touched:** `SPEC-goals.md`, `SPEC.md`, `SPEC-transactions.md`, `SPEC-accounts-categories.md`, `tasks/plan.md`, `tasks/plan-35.md`

**Estimated scope:** S
