# BASIS — Serah terima konteks final

Snapshot 2026-09-18. Dibaca oleh Claude/agent berikutnya. Ringkas, tidak menggantikan dokumen spesifikasi.

## Prompt siap dikirim ke Claude

Kamu melanjutkan proyek Basis. Baca `AGENTS.md`, `design/BRIEF.md`, `design/FRAMING.md`, dan `design/Autonomous.md` sebelum memberi saran.

Scope saat ini hanya keputusan scheduler dan deployment autonomous. Jangan mengubah komponen UI, halaman, styling, rumus di `packages/core`, atau membuat data contoh.

Keputusan yang sedang diminta:

1. Scheduler target adalah GitHub Actions scheduled workflow (`.github/workflows/watcher.yml`) yang memanggil `GET /api/cron/watch` setiap 15 menit.
2. Jangan mengandalkan Vercel Hobby Cron untuk `*/15 * * * *`; Hobby hanya mendukung cron harian.
3. `CRON_SECRET` adalah shared bearer secret, bukan database password. Nilainya sama di Vercel Environment Variables dan GitHub Actions Repository Secret.
4. Database memakai `DATABASE_URL` Neon/Supabase. Setelah env tersedia, migrasikan dengan `bun run db:migrate`.
5. `WATCHER_ENABLED` default `true`; `WATCHER_POST_X` default `false`. Jangan mengerjakan X.

Validasi apakah keputusan di atas sudah tepat, tunjukkan risiko GitHub Actions schedule, lalu berikan checklist deployment paling pendek. Jangan mengarang angka atau temuan.

## Baca dulu, berurutan

1. `AGENTS.md` di root — aturan tetap
2. `design/BRIEF.md` — spesifikasi lengkap
3. `design/FRAMING.md` — revisi framing produk, belum dikerjakan
4. `design/Autonomous.md` — lapisan autonomous dan ambang watcher
5. `recon-output.json` — fakta chain yang sudah terbukti, jangan diuji ulang

## Produk dalam satu kalimat

Basis mengukur seberapa besar pergerakan harga memecoin di Robinhood Chain berasal dari saham pasangannya, bukan dari memenya sendiri.

## Keadaan sekarang

### Sudah jalan dan benar

- `packages/core` lengkap: registry, pools, blocks, prices, attribution, float, board
- `/api/split/[ca]`, `/api/board`, `/api/float` — data asli dari chain
- `/terminal` — 8-9 pool, harga wajar, stablecoin tersaring, split inspector interaktif
- `/float` — 32 ticker
- `/c/[ca]` — laporan per coin, nama coin terbaca, harga saham benar
- AppShell: Topbar, Sidebar, StatusBar

### Autonomous/backend yang sudah disiapkan

- `packages/db/schema.ts` — satu tabel `findings` dengan waktu, alamat token, simbol, pasangan saham, pergerakan harga, komponen meme, komponen saham, likuiditas, dan tanggal deduplikasi.
- `drizzle/0000_sleepy_ser_duncan.sql` — migrasi Drizzle yang sudah tergenerate.
- `jobs/watcher.ts` — membaca hasil `getBoardData`, memeriksa persis tiga ambang: pergerakan harga absolut >= 3%, komponen meme absolut <= 1%, likuiditas >= $10.000.
- Deduplikasi memakai unique `(token_address, reported_on)` sehingga coin yang sama tidak disimpan berulang pada hari UTC yang sama.
- `app/api/cron/watch/route.ts` — route Node.js yang membutuhkan `Authorization: Bearer $CRON_SECRET`, menjalankan watcher, lalu refresh board dan float.
- `app/api/findings/route.ts` — `GET /api/findings?limit=20` untuk temuan terbaru.
- `app/api/findings/[ca]/route.ts` — `GET /api/findings/[ca]` untuk riwayat coin dan `totalDetections`.
- Bentuk respons kedua endpoint sudah ditulis di komentar route untuk agent UI.
- `.env.example` berisi `DATABASE_URL`, `CRON_SECRET`, `WATCHER_ENABLED=true`, dan `WATCHER_POST_X=false`.

### Status deployment autonomous

- `DATABASE_URL` belum tersedia di `.env`; migrasi belum diterapkan ke Neon/Supabase.
- Setelah mendapat connection string Postgres, jalankan `bun run db:migrate`.
- `CRON_SECRET` harus dibuat random, minimal 16 karakter, lalu dipasang di Vercel dan GitHub dengan nilai sama.
- `vercel.json` sebelumnya berisi cron 15 menit. Jika deploy memakai Vercel Hobby, jangan gunakan konfigurasi itu untuk jadwal 15 menit karena Hobby hanya mengizinkan jadwal harian.
- Scheduler yang direkomendasikan: GitHub Actions YAML memanggil URL production `/api/cron/watch`. GitHub schedule menggunakan UTC dan dapat terlambat ketika load tinggi.
- Belum ada `.github/workflows/watcher.yml`; jangan membuatnya sebelum keputusan scheduler ini dikonfirmasi.

### Fakta chain yang sudah terbukti

| Hal                    | Nilai                                                          |
| ---------------------- | -------------------------------------------------------------- |
| Chain                  | Robinhood Chain, chainId 4663                                  |
| RPC                    | Alchemy archive, dari `RPC_URL` di `.env`                      |
| DEX                    | Uniswap v4, singleton PoolManager                              |
| PoolManager            | `0x8366a39CC670B4001A1121B8F6A443A643e40951`                   |
| StateView              | `0xF3334192D15450CdD385c8B70e03f9A6bD9E673b`                   |
| Multicall3             | `0xcA11bde05977b3631167028862bE2a173976CA11`                   |
| Waktu blok             | ~100 ms                                                        |
| Token saham            | 194 total, hanya ~32 punya feed Chainlink                      |
| Registry               | `https://api.robinhood.com/rhj/assets`, saring `chainId: 4663` |
| Feed Chainlink         | dari direktori Chainlink, bukan dari API Robinhood             |
| Pool berpasangan saham | hanya 8-9 setelah stablecoin disaring                          |

### Keputusan teknis yang sudah final, jangan diubah

- **Jalan A**: rasio pool dibaca dari `StateView.getSlot0(poolId)` di blok tertentu. Rekonstruksi dari event Swap mustahil — 7 hari = 6 juta blok.
- **Pencarian pool** lewat DexScreener sebagai direktori saja. Semua angka tetap dibaca dari chain.
- **Kaki saham** dikenali dari alamat kontrak yang cocok dengan registry resmi, tidak pernah dari nama atau simbol. Ada token saham palsu di chain ini.
- **Harga**: rasio dari `sqrtPriceX96` harus dinormalisasi dengan `10^(dec0 - dec1)`, dan Chainlink dibagi `1e8` **sekali saja**. Pembagian ganda pernah bikin semua harga jadi $0.00.
- **Tidak ada chart historis.** Butuh puluhan pembacaan state per titik, menghabiskan kuota RPC free tier. Sudah dihapus, jangan dibuat lagi tanpa perintah.
- **Database findings sudah disiapkan dengan Drizzle/Postgres.** Penerapan migrasi masih menunggu `DATABASE_URL`; cache board lama tetap terpisah dari penyimpanan findings.

## Masalah yang masih ada

### 1. Sidebar menembus area tabel — prioritas

Isi section Watchlist di sidebar tampil menimpa kolom tabel. Teks seperti `$AI $0.2773` dan `CHROME` muncul di atas area tabel, bukan di dalam sidebar.

Sidebar harus lebar tetap 212px dengan `overflow-hidden`, dan isinya tidak boleh keluar dari batas itu. Bandingkan dengan `design/market.html`.

### 2. Layar masih terasa kosong

Mockup dibuat untuk ratusan baris, kenyataannya 8-9 pool. Beberapa putaran perbaikan belum menyelesaikan ini.

Arah yang benar: berhenti menyamakan ke mockup, sesuaikan layout ke jumlah data yang ada. Kalau sebuah panel isinya sedikit, rapatkan, jangan diregangkan sampai kosong.

### 3. Cara verifikasi yang wajib

Agent sebelumnya beberapa kali melaporkan "sudah sama persis" padahal layarnya tidak berubah, karena melapor dari kode bukan dari layar.

Aturannya: ambil screenshot, lihat screenshot itu, baru lapor. Kalau browser tidak bisa dipakai, katakan dan berhenti.

## Yang belum dikerjakan

Urutan yang direncanakan:

1. **Tampilan** — dua masalah di atas
2. **Framing** — `design/FRAMING.md` bagian 5, 6, 7. Kolom Exposure di board, urutan ulang panel report, tab "Real performance". Tidak mengubah `packages/core`.
3. **Scheduler autonomous** — pasang secret, migrasikan Postgres, lalu buat `.github/workflows/watcher.yml` jika GitHub Actions disetujui.
4. **UI autonomous** — agent UI menghubungkan Findings panel/chart ke endpoint yang sudah tersedia.
5. **Landing** — `app/page.tsx` dari `design/index.html`, dipecah per section ke `components/landing/`
6. **Halaman `/hours` dan `/actions`** — masih EmptyState berlabel soon

## Hasil watcher manual terakhir

Perintah: `bun run watcher`

Output apa adanya:

```json
{"enabled":true,"scanned":0,"detected":0,"stored":0,"duplicates":0,"findings":[]}
```

Tidak ada temuan yang dipaksa masuk. Pada lingkungan pengembangan saat itu, registry upstream Robinhood/Chainlink tidak dapat diakses sehingga board yang terbaca berjumlah 0. Ini bukan bukti bahwa chain selalu tidak punya temuan.

## Larangan tetap

Tidak ada wallet connect, tombol trade, eksekusi transaksi, smart contract, token, staking, akun, login, multi-chain.

Tidak pernah menampilkan angka karangan, nilai default, atau nol di tempat angka hasil hitungan. Kalau tidak bisa dihitung, kembalikan null dan tampilkan em dash.
