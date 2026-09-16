# BASIS — Serah terima konteks

Dibaca oleh agent baru yang melanjutkan proyek ini. Ringkas, tidak menggantikan dokumen lain.

## Baca dulu, berurutan

1. `AGENTS.md` di root — aturan tetap
2. `design/BRIEF.md` — spesifikasi lengkap
3. `design/FRAMING.md` — revisi framing produk, belum dikerjakan
4. `design/AUTONOMOUS.md` — lapisan autonomous, belum dikerjakan
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
- **Belum ada database.** Cache pakai `unstable_cache` Next.js 5 menit.

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
3. **Autonomous** — `design/AUTONOMOUS.md`. Watcher tiap 15 menit, panel Findings di `/terminal`, penyimpanan temuan ke Postgres. Database wajib menyala sejak watcher pertama jalan, karena temuan yang tidak tersimpan hilang selamanya.
4. **Landing** — `app/page.tsx` dari `design/index.html`, dipecah per section ke `components/landing/`
5. **Halaman `/hours` dan `/actions`** — masih EmptyState berlabel soon

## Larangan tetap

Tidak ada wallet connect, tombol trade, eksekusi transaksi, smart contract, token, staking, akun, login, multi-chain.

Tidak pernah menampilkan angka karangan, nilai default, atau nol di tempat angka hasil hitungan. Kalau tidak bisa dihitung, kembalikan null dan tampilkan em dash.
