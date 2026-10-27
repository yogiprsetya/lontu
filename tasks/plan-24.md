# Plan phase 24: Proyeksi gajian

Index: [plan.md](plan.md) · Todo: [todo-24.md](todo-24.md) · Spec: [SPEC-recurring.md](../SPEC-recurring.md) § Keputusan 4, 6, Tipe (`PaydayForecast`), Fungsi murni (`payday-forecast`), Query, Deliverables (`payday-card`)

## Tujuan

Nilai inti modul ini: dashboard menjawab "berapa yang boleh saya pakai sampai gajian". Kartu gajian menampilkan hari tersisa, total terikat, dan uang bebas, dengan rincian yang bisa dibuka. Modul selesai setelah ukuran dan aksesibilitas diverifikasi.

## Task

- [x] T87: `paydayForecast` murni + saldo `spendable` + `forecast` di `GET` (M, risiko sedang)
- [ ] T88: Kartu gajian di dashboard (M)
- [ ] T89: Penyelesaian modul: ukuran, NFR, verifikasi (S)

Urutan berantai: T87 → T88 → T89.

## Keputusan

- **`forecast` ditambahkan aditif** ke respons `GET /api/recurring` yang sudah ada sejak T78, mengikuti pola `GET /api/dashboard` di modul dashboard. Tidak ada endpoint baru, jadi dashboard tetap satu key SWR.
- **`spendable` dihitung di DB** (`sum(balance)` dari view `account_balances` join `accounts`, filter `archived_at is null`, `type = 'transaction'`, `subtype is distinct from 'credit_card'`), bukan dijumlahkan dari `useAccounts` di client.
- **Kejadian dalam satu siklus bisa lebih dari satu.** `paydayForecast` mengulang `advanceDate` per aturan selama `< payday`, jadi aturan dua-mingguan palsu (dua aturan tanggal berbeda) dan aturan yang tertinggal tetap terhitung utuh.
- **Batas `< payday`, bukan `<= payday`.** Tagihan yang jatuh tepat di hari gajian dihitung di siklus berikutnya, karena uang gaji sudah masuk saat itu.
- **Income selain gajian tidak dihitung** (spec Open question #2, default spec konservatif). Terkunci di satu fungsi, jadi perubahannya nanti hanya menyentuh `paydayForecast` dan tesnya.
- **`daysLeft` dihitung dari string tanggal** (selisih hari UTC dari dua `YYYY-MM-DD`), bukan `Date` lokal.
- **Ukuran:** metode sama dengan Catatan ukuran dashboard dan pwa-offline (chunk JS yang dirujuk HTML prerender, gzip). Target tambahan modul ini < 5 KB gzip di `/dashboard`, diukur di T89.

## Risiko

| Risiko                                                                   | Dampak | Mitigasi                                                                                                                      |
| ------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Angka "bebas" salah sehingga pemilik tidak mempercayainya (asumsi inti)  | Tinggi | T87 mulai dari tes merah dengan skenario lengkap di spec § Acceptance criteria, plus invarian `spendable` terhadap `/api/accounts` |
| Filter akun salah (kartu kredit, aset, atau akun terarsip ikut terhitung) | Tinggi | Tes T87 memuat kelima jenis akun sekaligus, termasuk saldo negatif kartu kredit dan akun terarsip                             |
| `free` negatif tampil membingungkan                                      | Sedang | Ditampilkan sebagai "Kurang Rp…" dengan teks, dites manual di T88                                                            |
| Tambahan bundle `/dashboard` melewati anggaran                           | Sedang | Diukur di T86, T88, dirangkum di T89. Target < 5 KB gzip untuk seluruh modul                                                  |
| CLS saat kartu selesai memuat                                            | Rendah | Skeleton bertinggi tetap, sama dengan kartu dashboard lain. Lighthouse di T89                                                 |

## Catatan ukuran (diisi saat dikerjakan)

Metode sama dengan [plan.md](plan.md) § Catatan ukuran (chunk JS yang dirujuk HTML prerender, gzip level 9). Sebelum = commit terakhir sebelum T86.

| Titik                        | `/dashboard` | `/recurring` |
| ---------------------------- | ------------ | ------------ |
| Sebelum modul                | tidak diukur | —            |
| T85 (sebelum T86)            | 377,1 KB     | 372,2 KB     |
| T86 (kotak Jatuh tempo)      | 379,1 KB (+2,0; form di-lazy-load) | 372,7 KB |
| T88 (kartu gajian)           | —            | —            |

## Checkpoint W (modul selesai)

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual 360×800 dan 1024: kartu gajian menampilkan hari tersisa, terikat, dan bebas yang benar untuk data uji di spec § Acceptance criteria
- [ ] Angka "bebas" cocok dengan hitungan tangan Yogi (selisih ≤ 10%) — kriteria sukses modul
- [ ] Gaji jatuh tempo → "Gaji belum dicatat" + Catat memulihkan proyeksi ke siklus berikutnya
- [ ] `no_payday` dengan aturan lain → ajakan menandai aturan gaji. Tanpa aturan sama sekali → ajakan ke `/recurring`
- [ ] `hideAmounts` menyamarkan nominal di kedua kartu. Lighthouse mobile dan axe tidak turun dari baseline sebelum modul
- [ ] Tambahan JS first load `/dashboard` < 5 KB gzip, dicatat di tabel di atas
- [ ] Review dengan Yogi, dan asumsi "sering membuka dashboard" diukur ulang setelah dua siklus gajian
