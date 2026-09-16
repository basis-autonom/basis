# BASIS — Revisi framing produk

Dokumen tambahan untuk `design/BRIEF.md`. Tidak membatalkan brief. Yang berubah hanya **angka mana yang jadi utama dan kalimat di sebelahnya**. Semua perhitungan di `packages/core` tetap sama persis.

Baca ini sebelum mengerjakan halaman report, board, dan landing.

---

## 1. Kenapa framing lama lemah

Framing lama menjawab: _"kenaikan kemarin berapa persen dari meme, berapa dari saham?"_

Masalahnya, trader tidak peduli pembagian keuntungan yang sudah terjadi. Kalau bag-nya naik, dia senang, titik. Menjelaskan bahwa kenaikannya "milik Nvidia" tidak mengubah apa pun yang bisa dia lakukan.

Produk yang menjelaskan masa lalu dibaca sekali. Produk yang memberi tahu risiko yang sedang berjalan dibuka berkali-kali.

## 2. Framing baru

Pertanyaan yang dijawab berubah jadi:

> **Sebenarnya kamu sedang memegang apa, dan apa yang bisa menggerakkannya besok?**

Fakta intinya: trader membeli memecoin pakai ETH, tapi karena pool-nya dipasangkan ke token saham, posisinya otomatis jadi **saham + meme**. Dia tidak pernah memilih itu dan kemungkinan besar tidak tahu.

Kalau Nvidia jatuh 8% semalam, bag-nya ikut turun 8% walau tidak ada satu orang pun yang menjual coinnya.

Itu bukan sejarah. Itu risiko yang sedang dia tanggung.

## 3. Pergeseran kalimat

| Lama                                     | Baru                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| "Naik 40,1%. Meme-nya cuma 11,8%."       | "Bag ini 71% terekspos NVDA. Kamu tidak memilih itu."                           |
| "Komponen saham +25,4%"                  | "NVDA turun 5% → coin ini turun ~3,6%, tanpa ada penjual"                       |
| "Selama beku, semua gerakan adalah meme" | "Pasar tutup 14 jam lagi. Sampai itu, coin ini kehilangan separuh penggeraknya" |
| Laporan                                  | Peringatan                                                                      |

Larangan kata: hindari "was", "did", "over the last 7 days" sebagai kalimat utama. Angka historis tetap ditampilkan, tapi sebagai bukti di bawah, bukan judul.

## 4. Tiga angka utama yang baru

Semuanya dihitung dari data yang sudah ada. Tidak ada sumber baru.

### 4.1 Exposure — angka hero

```
exposure = stock_beta        (sudah dihitung, jangan hitung ulang)
```

Tampilkan sebagai persentase pengaruh, bukan sebagai koefisien.

Kalimat hero di report:

> **This coin is 71% Nvidia.**
> You bought a memecoin. You are holding an Nvidia position.

### 4.2 Sensitivitas — pengganti kolom komponen saham

Tabel kecil yang menjawab "kalau sahamnya gerak, aku kena berapa":

| Kalau NVDA | Coin ini |
| ---------- | -------- |
| +5%        | +3,6%    |
| −5%        | −3,6%    |
| −10%       | −7,1%    |

Rumusnya cuma `stock_move × beta`. Sudah punya betanya.

Ini kolom yang paling sering akan di-screenshot, karena menjawab pertanyaan yang benar-benar ada di kepala orang.

### 4.3 Jam mati — dibuat jadi hitung mundur, bukan kalender

Pasar saham buka 40 dari 168 jam seminggu. Sisanya sisi saham beku.

Tampilkan sebagai status hidup, bukan tabel:

> **Stock leg frozen. 14h 12m until it can move again.**
> Until then this coin can only move on its own.

Ini berguna untuk keputusan waktu masuk, bukan laporan.

## 5. Urutan baru halaman report

Ganti urutan panel. Isi panelnya sebagian besar sudah ada.

1. **Exposure** — angka hero, kalimat "This coin is X% [TICKER]"
2. **Sensitivity** — tabel kalau-saham-gerak
3. **Stock leg status** — beku atau hidup, dengan hitung mundur
4. **What actually moved it** — di sinilah split lama ditaruh. Tetap ada, tapi turun ke posisi keempat sebagai bukti, bukan judul.
5. Sisanya seperti sebelumnya

## 6. Perubahan di board (`/terminal`)

Tambah satu kolom, ubah satu judul:

- Kolom baru **Exposure** — persentase, diurutkan menurun secara default. Ini jadi kolom yang orang pakai untuk scan.
- Kolom split meme/saham tetap ada, judulnya ganti jadi **What moved it**.
- Urutan default board berubah dari volume ke **Exposure tertinggi**. Alasannya: yang menarik adalah coin yang paling diam-diam jadi taruhan saham.

## 7. Satu halaman baru yang ringan — perbandingan jujur

Ini fitur paling berguna dari framing baru dan paling murah dibuat, karena datanya sudah ada di board.

Masalah nyata: coin A naik 40% (pasangan NVDA), coin B naik 25% (pasangan USDG). Kelihatannya A menang. Setelah dipisah, meme A cuma 11%, meme B 25%. **B sebenarnya lebih kuat.**

Tampilkan sebagai satu tabel: semua coin diurutkan berdasarkan **kekuatan meme saja**, bukan harga mentah. Judul kolom: "Real performance".

Kalimat pengantar satu baris:

> Price rankings lie when half the coins are quoted in stocks. This one doesn't.

Taruh ini sebagai tab kedua di halaman board, bukan halaman baru — supaya tidak menambah route.

## 8. Landing page

Hero lama:

> $AI is up 40%. Its meme did 11.8.

Hero baru:

> **You bought a memecoin.
> You are holding Nvidia.**

Sub:

> On Robinhood Chain hundreds of memecoins are quoted in tokenized stocks, not dollars. That makes every holder a stock holder, whether they know it or not. Paste a contract to see what you are actually exposed to.

Section "Move the stock, the coin follows" tetap, karena itu justru memperagakan risiko, bukan sejarah. Ganti judulnya:

> **Nvidia moves. Your bag moves. Nobody traded.**

## 9. Yang tidak berubah

Supaya jelas ruang lingkup revisinya:

- Seluruh `packages/core` — tidak ada perubahan perhitungan
- Endpoint API dan bentuk `SplitResponse` — tidak berubah, `beta` sudah ada di dalamnya
- Struktur komponen, AppShell, primitives — tidak berubah
- Aturan visual di bagian 3.4 brief — tetap berlaku penuh
- Halaman float — tetap seperti revisi 5.2b

Yang berubah hanya copy, urutan panel, satu kolom baru di board, dan satu tab tambahan.
