# BASIS — Autonomous

Dokumen tambahan untuk `design/BRIEF.md` dan `design/FRAMING.md`.

**Mencabut sebagian larangan di bagian 15 BRIEF.md**: alert, notifikasi, dan proses terjadwal sekarang dikerjakan. Yang TETAP dilarang: wallet connect, tombol trade, eksekusi transaksi, smart contract, token, staking. Basis tidak pernah memegang dana dan tidak pernah mengirim transaksi.

---

## 1. Fokus produk, supaya tidak melebar

Basis mengukur satu hal:

> **Seberapa besar pergerakan harga sebuah memecoin di Robinhood Chain sebenarnya berasal dari saham pasangannya, bukan dari memenya sendiri.**

Satu kemampuan. Satu angka inti. Semua yang ada di produk ini adalah turunan dari kalimat itu.

## 2. Apa yang berubah

Sampai sekarang Basis adalah **alat yang ditanya**: pengguna menempel contract address, keluar jawaban. Tidak ada yang berjalan sendiri.

Autonomous berarti Basis berubah jadi **sistem yang mengawasi**: memantau seluruh pool berpasangan saham terus-menerus, dan mengeluarkan temuan sendiri tanpa ada yang bertanya.

Ini bukan fitur tambahan di samping produk. Ini perubahan sifat produknya.

| Sekarang                            | Setelah autonomous                                             |
| ----------------------------------- | -------------------------------------------------------------- |
| Menunggu ditanya                    | Mengawasi terus                                                |
| Jawaban muncul kalau ada yang paste | Temuan muncul sendiri                                          |
| Paste box adalah isi utama          | Feed temuan adalah isi utama, paste box salah satu pintu masuk |

## 3. Satu hal yang diawasi

Watcher hanya mencari satu kondisi, karena itulah fokus produknya:

> **Sebuah coin bergerak signifikan, tapi pergerakan itu bukan berasal dari memenya.**

Ambang, ditulis eksplisit supaya bisa dibantah orang:

```
harga coin bergerak      >= 3% dalam 24 jam
komponen meme            <= 1% (absolut)
likuiditas pool          >= $10.000
```

Kalau ketiganya terpenuhi, itu temuan. Kalau tidak, diam.

Jangan tambah kondisi lain sekarang. Satu kondisi yang benar lebih berguna daripada empat kondisi yang setengah jadi.

## 4. Temuan muncul di mana

Tiga saluran, dari sumber yang sama. Urutan pengerjaan dari atas ke bawah.

### 4.1 Di dalam produk — WAJIB, ini yang bikin autonomous jadi inti

Halaman `/terminal` dapat **panel Findings** di bagian atas, di atas tabel. Isinya temuan terbaru dari watcher, urut waktu.

```
17:42   $X moved 6.2%. Its meme did 0.1. The rest is NVDA.
16:10   $Y moved -4.4%. Its meme did 0.2. The rest is TSLA.
```

Tiap baris menautkan ke halaman report coin itu.

Kalau belum ada temuan, tampilkan keadaan tenang secara jujur, bukan kosong:

> Watching 412 stock-paired pools. Nothing moving on its stock right now.

Panel ini yang mengubah kesan produk dari alat jadi sistem. Kerjakan ini lebih dulu sebelum saluran lain.

### 4.2 Status watcher di status bar

Segmen baru di status bar, semua halaman:

```
watching 412 pools · last finding 14m ago
```

Kecil, tapi ini yang bikin orang percaya ada sesuatu yang benar-benar jalan.

### 4.3 Ke luar — X

Temuan yang sama diposting ke X. Ini saluran terakhir yang dikerjakan, bukan yang pertama.

Format postingan:

```
$X moved 6.2% today. Its meme did 0.1 of that.
The rest is NVDA.

basis.tools/c/0x...
```

Aturan isi:

- Angka harus dari sumber yang sama dengan yang tampil di situs. Tidak boleh ada jalur perhitungan kedua.
- Jangan pernah menyebut beli, jual, target, atau prediksi harga.
- Kalau ada angka bernilai null, temuan itu dilewati. Jangan pernah memposting em dash atau nilai default.
- Maksimal 3 posting per hari. Kalau temuan lebih banyak, ambil yang likuiditasnya terbesar.

## 4.4 Temuan menumpuk — ini bagian paling berharga

Setiap temuan **disimpan permanen**, bukan cuma ditampilkan lalu hilang.

Setelah watcher jalan beberapa hari, produk punya sesuatu yang tidak bisa dihitung dari chain kapan pun: riwayat coin mana yang berulang kali bergerak bukan karena memenya.

Dua hal yang muncul dari situ:

**a. Riwayat per coin.** Di halaman report, panel baru:

> Detected 14 times this month. 11 of those were pure NVDA movement.

**b. Peringkat "paling bukan miliknya".** Tab di halaman board: coin yang paling sering terdeteksi bergerak bukan karena memenya. Urut berdasarkan jumlah deteksi, bukan harga.

Kenapa ini penting melebihi fiturnya sendiri: angka ini **hanya ada kalau ada yang mengamati sejak hari pertama**. Tidak bisa dihitung ulang dari chain, tidak bisa diambil dari indexer. Siapa pun yang meniru Basis besok mulai dari nol dan butuh berminggu-minggu untuk mengejar.

Ini satu-satunya bagian produk yang tidak bisa ditiru cepat. Karena itu penyimpanan temuan **wajib ada sejak watcher pertama kali dinyalakan**, walaupun tampilan riwayatnya menyusul belakangan. Yang tidak disimpan hari ini hilang selamanya.

Simpan minimal: waktu, alamat token, simbol, pasangan saham, pergerakan harga, komponen meme, komponen saham, likuiditas saat itu.

## 5. Cara kerja teknis

- `jobs/watcher.ts` — membaca board, memeriksa kondisi di bagian 3, menyimpan temuan
- Dipanggil dari `app/api/cron/watch/route.ts` tiap 15 menit lewat Vercel Cron, dilindungi header rahasia
- Temuan disimpan permanen (lihat 4.4) dan dibaca oleh panel Findings, status bar, riwayat di report, dan peringkat di board
- Penyimpanan temuan adalah satu-satunya alasan proyek ini butuh database. Pakai Postgres (Neon atau Supabase), satu tabel, di repo yang sama. Nyalakan sejak hari pertama watcher jalan.
- Simpan juga kondisi yang sudah pernah dilaporkan, supaya coin yang sama tidak muncul berulang dalam satu hari

Watcher **tidak menghitung apa pun sendiri**. Dia hanya membaca hasil yang sudah ada dari `packages/core` dan memeriksa ambang. Tidak ada rumus baru, tidak ada sumber data baru.

## 6. Saluran keluar dan saklarnya

Dua saklar terpisah di env:

| Saklar            | Default | Artinya                                   |
| ----------------- | ------- | ----------------------------------------- |
| `WATCHER_ENABLED` | `true`  | watcher berjalan, temuan muncul di produk |
| `WATCHER_POST_X`  | `false` | temuan diposting ke X                     |

Produk boleh langsung hidup dengan watcher menyala. Yang ditahan hanya posting keluar, sampai angkanya terbukti bersih beberapa hari.

Catatan biaya: X sudah tidak punya tier gratis untuk developer baru. Posting berisi tautan sekitar $0,20 per posting, jadi 3 posting sehari sekitar $18 sebulan. Harga ini berubah beberapa kali di 2026, cek di developer console sebelum dikunci.

## 7. Syarat sebelum `WATCHER_POST_X` dinyalakan

1. Board dan report bersih dari angka rusak — tidak ada harga di luar akal, tidak ada −100% palsu, tidak ada "UNKNOWN"
2. Watcher sudah jalan minimal 24 jam dan isi temuannya sudah dibaca manusia
3. Bisa dimatikan dengan satu perubahan env, tanpa deploy ulang

Autonomous menggandakan apa pun yang dihasilkan sistem. Kalau yang digandakan angka salah, kesalahannya ikut berlipat dan tidak bisa ditarik kembali.

## 8. Yang tidak dikerjakan sekarang

Ditulis supaya tidak diam-diam ditambahkan:

- MCP server
- API publik berdokumentasi untuk agent pihak ketiga
- Saluran Telegram atau Discord
- Kondisi pengawasan selain satu yang di bagian 3
- Langganan, akun, atau alert per pengguna

Semua itu bisa menyusul kalau memang ada yang meminta. Sekarang satu kondisi, tiga saluran, selesai.
