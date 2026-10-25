# Plan phase 20: Antrean transaksi offline

Index: [plan.md](plan.md) · Todo: [todo-20.md](todo-20.md) · Spec: [SPEC-pwa-offline.md](../SPEC-pwa-offline.md) § Keputusan 6–11, 14, Kontrak API, Deliverables 2–3

## Tujuan

Pemilik mencatat income, expense, saving, atau transfer (dengan biaya admin) saat offline. Transaksi menunggu di perangkat, terlihat di bagian "Menunggu dikirim", lalu terkirim sendiri saat online, tanpa duplikat walau koneksi putus di tengah request atau dua tab terbuka. Item yang ditolak server tampil sebagai gagal dan bisa dicoba lagi atau dibuang.

## Task

- [x] T70: `POST /api/transactions` idempoten dengan `id` dari client (M)
- [x] T71: Outbox dan `replayOutbox` murni (M)
- [x] T72: Create mengantre saat offline + replay otomatis (M) (cek manual tertunda)
- [x] T73: Bagian "Menunggu dikirim" dan catatan di dashboard (M) (cek manual tertunda)
- [ ] T74: Sign-out dengan item tertunda (S)

Urutan: T70 dan T71 paralel → T72 → T73 → T74.

## Keputusan

- **Kontrak API dikunci dulu (T70)**, dengan tes Supabase untuk replay, balapan paralel, dan isolasi A/B. Client baru boleh mengirim `id` setelah route menerimanya. Tanpa `id` perilaku lama tidak berubah, jadi tes transaksi yang ada tidak disentuh.
- **Outbox dan replay murni dengan dependensi diinjeksi** (adapter penyimpanan, `send`). Vitest berjalan di `environment: "node"`, jadi tidak perlu `fake-indexeddb` (dependency baru, Ask first). Web Lock, event `online`, dan interval ada di hook tipis yang dicek manual.
- **`createTransaction` selalu mengirim `id`**, termasuk saat online. Body yang sama (id yang sama) yang diantrekan jika request gagal di jaringan.
- **Open questions #3, #4, #6 memakai default spec** (hanya create, "Coba lagi"/"Buang" tanpa "Buka di form", tertunda tidak mengubah saldo). Jika Yogi memilih lain di checkpoint R, task di phase ini disesuaikan sebelum dimulai.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Transaksi ganda saat replay (respons hilang, dua tab) | Tinggi | T70: replay 200, dua `POST` paralel dengan id sama → satu baris. T72: Web Lock + id tetap. Dicek manual dengan throttle Offline setelah Simpan |
| `id` milik user lain membocorkan data | Tinggi | T70: 409 tanpa isi baris, tes isolasi A/B untuk `id` dan `fee.id` |
| Replay gagal permanen setelah akun diarsipkan | Sedang | Cek replay sebelum cek referensi (T70). Item baru yang ditolak → `failed` dengan pesan (T71, T73) |
| Transaksi tertunda hilang saat sign-out | Sedang | Konfirmasi di T74 |
| Saldo terlihat salah karena item tertunda tidak dihitung | Rendah | Catatan "belum masuk saldo dan ringkasan" di dashboard (T73) |

## Checkpoint S

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual (ponsel Android + iPhone, `pnpm build && pnpm start` atau preview): offline catat expense dan transfer + biaya → "Menunggu dikirim (2)" → online → terkirim ≤ 5 s, saldo dan dashboard berubah, tanpa duplikat
- [ ] Throttle Offline tepat setelah Simpan → tetap satu baris. Dua tab → tetap satu baris
- [ ] Item dengan akun terarsip → gagal, "Coba lagi" setelah dipulihkan berhasil, "Buang" menghapus
- [ ] Review dengan Yogi sebelum phase 21
