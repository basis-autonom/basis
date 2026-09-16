# BASIS — Build Brief

Terminal forensik untuk memecoin yang dipasangkan ke token saham di Robinhood Chain.

Dokumen ini dibaca oleh coding agent (Antigravity / Codex) dan manusia. Semua nama file, fungsi, dan tipe di sini adalah nama final — jangan diganti. Prosa Indonesia, semua kode dan copy produk Inggris.

---

## 0. Produk dalam satu halaman

**Masalah.** Di Robinhood Chain, banyak memecoin punya liquidity pool yang dipasangkan ke token saham (NVDA, HIMS, GME) alih-alih ke stablecoin. Akibatnya harga memecoin bergerak setiap kali saham bergerak, tanpa ada satu pun transaksi di pool itu. Trader melihat coin-nya hijau 40% dan mengira ada yang beli. Yang sebenarnya terjadi: Nvidia naik.

**Produk.** Paste contract address, Basis memisahkan pergerakan harga jadi dua komponen: berapa dari meme-nya, berapa dari sahamnya.

**Empat output:**

| Output            | Pertanyaan yang dijawab                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| Attribution       | Kenaikan ini sebenarnya berapa persen meme, berapa persen saham?        |
| Float grip        | Pool ini nyekek berapa persen dari seluruh suplai token saham di chain? |
| Market hours      | Apa yang dilakukan pool selama pasar saham tutup?                       |
| Corporate actions | Kapan pengali token saham berubah, dan pool mana yang kena?             |

**Batasan tegas.** Read-only. Tidak ada wallet, login, smart contract, eksekusi transaksi, atau penyimpanan query user.

**Target user.** Trader memecoin di Robinhood Chain. Bahasa UI: Inggris.

---

## 1. Keputusan arsitektur

### 1.1 Apakah backend perlu project terpisah?

**Tidak.** Satu repo, satu Next.js app.

Alasannya bukan soal hemat, tapi soal bentuk masalahnya:

- Tidak ada penulisan data. Tidak ada akun user, transaksi, atau state milik user.
- Tidak ada autentikasi. Tidak ada session atau rahasia yang perlu dijaga di service terpisah selain URL RPC.
- Semua kerja backend yang dibutuhkan adalah: baca RPC, hitung, balikan JSON. Itu persis yang dilakukan Next.js Route Handler.

Memisahkan backend menambah deployment kedua, CORS, duplikasi tipe, dan satu tempat lagi yang bisa mati — tanpa menambah kemampuan apa pun.

### 1.2 Lalu bagian mana yang jadi backend?

Dua jenis pekerjaan, dua penanganan berbeda:

**A. On-demand.** Report untuk satu contract address. User paste CA, baca satu pool, hitung, balikan. Cukup di Route Handler dengan cache pendek.

**B. Terjadwal.** Split board 432 pool, float grip 108 ticker, freeze log, corporate action. Ini **tidak boleh** dihitung saat request — 432 pool dikali beberapa panggilan RPC berarti timeout dan RPC kena rate limit.

Solusi B: job terjadwal di repo yang sama, jalan tiap 5 menit, hasilnya ditulis ke key-value store, dibaca halaman sebagai JSON siap pakai.

```
Browser  ->  Next.js Route Handler  ->  RPC          (on-demand, satu pool)
Cron     ->  script di jobs/        ->  KV  ->  Page  (terjadwal, semua pool)
```

### 1.3 Perlu database?

**Fase 1: tidak.** Key-value store (Vercel KV / Upstash Redis) cukup. Yang disimpan cuma snapshot terbaru, bukan riwayat.

**Fase 2: ya, kalau freeze log dan drift 30 hari masuk.** Dua fitur itu butuh riwayat yang tidak murah dihitung ulang terus-menerus. Saat itu tambahkan Postgres (Neon / Supabase), tetap di repo yang sama, migrasi pakai Drizzle.

Jangan tambahkan database di fase 1. Menambahkannya sekarang berarti memelihara skema untuk data yang belum tentu dipakai.

### 1.4 Toolchain dan runtime

**Bun** dipakai sebagai package manager dan sebagai runtime untuk semua script di `jobs/`. Alasannya konkret: `jobs/recon.ts` dan keempat job refresh ditulis dalam TypeScript dan dijalankan langsung tanpa langkah build. Tanpa Bun kita perlu `tsx` atau `ts-node` hanya untuk itu.

```
bun install
bun run dev
bun run jobs/recon.ts
bun run split <ca> --window 7d
```

**Tapi Next.js sendiri tetap berjalan di atas Node.** Di hosting seperti Vercel, API route dijalankan oleh runtime Node, bukan Bun. Ini bukan masalah, tapi melahirkan satu aturan yang harus dipatuhi:

> `packages/core` harus netral terhadap runtime. Dilarang memakai API khusus Bun (`Bun.file`, `Bun.serve`, `Bun.env`, dan sejenisnya) di dalamnya.

Alasannya: kode yang sama dipanggil dari dua tempat — dari `jobs/` yang jalan di Bun, dan dari API route yang jalan di Node. Kalau `packages/core` menyentuh API khusus Bun, job-nya jalan lancar tapi API route-nya gagal di produksi, dan kegagalannya baru muncul setelah deploy.

Pakai `process.env` biasa, `fetch` standar, dan modul Node standar. Batasi pemakaian khusus Bun di dalam file `jobs/` saja.

Kalau nanti diputuskan pindah hosting ke tempat yang menjalankan Bun sepenuhnya, aturan ini tidak perlu dicabut — kode netral tetap jalan di mana pun.

### 1.5 Ringkasan jawaban

- Backend project terpisah: **tidak**
- Jumlah repo: **satu**
- Isi repo: satu Next.js app + folder `jobs/` + folder `packages/core` untuk logika murni
- Database: **belum**, KV dulu
- Package manager dan runtime script: **Bun**
- Runtime Next.js di produksi: **Node** — lihat aturan di 1.4

---

## 2. Struktur repo

```
basis/
├─ app/
│  ├─ layout.tsx                 # html, font, globals
│  ├─ page.tsx                   # landing  (dari index.html)
│  ├─ globals.css                # token warna + reset
│  │
│  ├─ (terminal)/                # route group, semua pakai AppShell
│  │  ├─ layout.tsx              # AppShell: Topbar + Sidebar + StatusBar
│  │  ├─ terminal/page.tsx       # split board      (market.html)
│  │  ├─ float/page.tsx          # float grip       (float.html)
│  │  ├─ hours/page.tsx          # market hours     (hours.html)
│  │  ├─ actions/page.tsx        # corporate action (actions.html)
│  │  ├─ method/page.tsx         # method           (method.html)
│  │  └─ c/[ca]/page.tsx         # report           (report.html)
│  │
│  └─ api/
│     ├─ split/[ca]/route.ts     # attribution satu pool, on-demand
│     ├─ board/route.ts          # baca KV
│     ├─ float/route.ts          # baca KV
│     ├─ hours/route.ts          # baca KV
│     ├─ actions/route.ts        # baca KV
│     └─ cron/refresh/route.ts   # dipanggil scheduler
│
├─ components/
│  ├─ shell/
│  │  ├─ Topbar.tsx
│  │  ├─ Sidebar.tsx
│  │  ├─ StatusBar.tsx
│  │  └─ SearchBox.tsx
│  ├─ primitives/                # lintas halaman, bikin SEKALI
│  │  ├─ SplitBar.tsx
│  │  ├─ StatCell.tsx
│  │  ├─ KVRow.tsx
│  │  ├─ DataTable.tsx
│  │  ├─ Gauge.tsx
│  │  ├─ Sparkline.tsx
│  │  ├─ EmptyState.tsx
│  │  └─ ErrorState.tsx
│  ├─ charts/
│  │  ├─ SplitAreaChart.tsx      # stacked area, terminal
│  │  ├─ HourlyBars.tsx          # bar per jam, report
│  │  ├─ WeekGrid.tsx            # kalender minggu, hours + landing
│  │  └─ DriftStrip.tsx          # 30 kotak, report
│  ├─ terminal/
│  │  ├─ PairHeader.tsx
│  │  ├─ PoolTable.tsx
│  │  ├─ SplitInspector.tsx
│  │  └─ SwapFeed.tsx
│  ├─ float/FloatTable.tsx
│  ├─ hours/FreezeLog.tsx
│  ├─ actions/ScheduledCard.tsx
│  ├─ actions/ActionHistory.tsx
│  ├─ report/VerdictCard.tsx
│  ├─ report/PoolComposition.tsx
│  ├─ report/ActionStrip.tsx
│  └─ landing/                   # HANYA untuk landing
│     ├─ Hero.tsx
│     ├─ TickerTape.tsx
│     ├─ TerminalPreview.tsx
│     ├─ StatBand.tsx
│     ├─ SplitLab.tsx
│     ├─ GripBoard.tsx
│     └─ MethodBlock.tsx
│
├─ packages/core/                # LOGIKA MURNI, tanpa React, tanpa Next
│  ├─ chain.ts
│  ├─ registry.ts
│  ├─ pools.ts
│  ├─ prices.ts
│  ├─ attribution.ts
│  ├─ float.ts
│  ├─ hours.ts
│  ├─ actions.ts
│  ├─ blocks.ts
│  └─ types.ts
│
├─ jobs/
│  ├─ refresh-board.ts
│  ├─ refresh-float.ts
│  ├─ refresh-hours.ts
│  ├─ refresh-actions.ts
│  └─ recon.ts
│
├─ abi/
│  ├─ erc20.ts
│  ├─ stockToken.ts              # ERC-8056
│  ├─ chainlink.ts
│  └─ pool.ts                    # sesuai DEX hasil recon
│
├─ design/                       # BRIEF.md + 8 file HTML referensi, JANGAN dihapus
└─ README.md
```

**Aturan keras untuk agent:** `packages/core` tidak boleh mengimpor apa pun dari React, Next.js, atau `components/`. Semua fungsi di sana harus bisa dipanggil dari script Node biasa. Ini yang bikin `jobs/` dan API route pakai kode yang sama persis, dan bikin orang lain bisa memverifikasi angka kita tanpa menjalankan web-nya.

---

## 3. Konversi HTML ke Next.js

### 3.1 Pemetaan file

| File HTML      | Tujuan                             | Catatan                                                  |
| -------------- | ---------------------------------- | -------------------------------------------------------- |
| `index.html`   | `app/page.tsx`                     | Satu-satunya yang **tidak** pakai AppShell. Nav sendiri. |
| `market.html`  | `app/(terminal)/terminal/page.tsx` | 3 kolom, rail kanan aktif                                |
| `float.html`   | `app/(terminal)/float/page.tsx`    | 2 kolom                                                  |
| `hours.html`   | `app/(terminal)/hours/page.tsx`    | 2 kolom                                                  |
| `actions.html` | `app/(terminal)/actions/page.tsx`  | 2 kolom                                                  |
| `method.html`  | `app/(terminal)/method/page.tsx`   | Statis, tanpa fetch                                      |
| `report.html`  | `app/(terminal)/c/[ca]/page.tsx`   | 2 kolom, sidebar berisi blok kontrak                     |

### 3.2 Tiga variabel global di file HTML

Di bawah tiap file terminal ada tiga variabel. Itu bukan sisa kodingan, itu **spesifikasi props AppShell**:

| Di HTML            | Jadi apa di Next.js                                            |
| ------------------ | -------------------------------------------------------------- |
| `window.PAGE`      | ditentukan otomatis dari `usePathname()`, tidak perlu props    |
| `window.STATUS`    | `<AppShell status={string[]}>` — item terakhir rata kanan      |
| `window.SIDEEXTRA` | `<AppShell sideExtra={ReactNode}>` — blok di bawah nav sidebar |

### 3.3 Komponen lintas halaman

Ini yang paling sering dikacaukan agent: dia bikin versi sendiri di tiap halaman. Bikin **sekali**, pakai di semua:

- `SplitBar` — landing, terminal, inspector, report. Props: `memePct`, `stockPct`, `size`, `quoteSymbol`
- `StatCell` — blok angka di semua header halaman. Props: `label`, `value`, `tone?`
- `KVRow` — baris kiri-kanan di semua panel
- `DataTable` — semua tabel. Props: `columns`, `rows`, `sortable`, `onRowClick`
- `WeekGrid` — dipakai landing **dan** halaman hours

### 3.4 Aturan visual yang tidak boleh dilanggar

- Angka selalu `font-mono` dengan `tabular-nums`. Label selalu sans. Tidak pernah dicampur.
- Urutan SplitBar selalu meme di kiri, saham di kanan. Di halaman mana pun. Tidak pernah dibalik.
- Hanya dua warna aksen: `--meme` dan `--stock`. Merah `--down` hanya untuk peringatan (grip di atas 10%, gap besar, angka turun). Tidak ada warna kelima.
- Tidak ada animasi masuk per section. Tidak ada glow, neon, glassmorphism.
- Tidak ada dark/light toggle. Satu mode.
- Label tidak pakai huruf kapital semua. Tombol tidak pakai panah.

### 3.5 Token warna dan font

Ambil persis dari `:root` di file HTML mana pun, taruh di `globals.css` sebagai CSS variable, lalu map ke Tailwind lewat `tailwind.config.ts` supaya bisa dipakai sebagai `text-meme`, `bg-stock`, dan seterusnya. Jangan tulis nilai hex di dua tempat.

Font: `Instrument Sans` dan `IBM Plex Mono` lewat `next/font/google`.

---

## 4. Lapisan data

### 4.1 Chain

| Item             | Nilai                                     |
| ---------------- | ----------------------------------------- |
| Chain ID mainnet | `4663`                                    |
| RPC mainnet      | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer         | `https://robinhoodchain.blockscout.com`   |
| Chain ID testnet | `46630`                                   |
| Gas              | ETH                                       |

Testnet **tidak dipakai** di produk ini karena kita tidak men-deploy apa pun. Testnet hanya dipakai sekali, untuk verifikasi mekanisme corporate action (bagian 11).

Semua nilai di atas hidup di `packages/core/chain.ts`, tidak di-hardcode di tempat lain.

### 4.2 Sumber data

Hanya dua. Jangan tambah sumber ketiga tanpa alasan kuat.

| Data               | Sumber                                     | Cara baca                                                                         |
| ------------------ | ------------------------------------------ | --------------------------------------------------------------------------------- |
| Daftar token saham | `GET https://api.robinhood.com/rhj/assets` | HTTP, cache harian                                                                |
| Harga saham        | Chainlink feed per token                   | `latestRoundData()`, `getRoundData()`                                             |
| Rasio pool         | Event Swap di pool                         | `eth_getLogs`                                                                     |
| Suplai token saham | Token saham                                | `totalSupply()`                                                                   |
| Saldo pool         | Token saham                                | `balanceOf(poolAddress)`                                                          |
| Corporate action   | Token saham (ERC-8056)                     | `uiMultiplier()`, `newUIMultiplier()`, `effectiveAt()`, log `UIMultiplierUpdated` |

### 4.2b Endpoint Stock Token API

Tiga endpoint, tanpa API key:

| Endpoint                                              | Isi                                                                                                                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET https://api.robinhood.com/rhj/assets`            | metadata semua Stock Token: `tokenSymbol`, `tokenName`, `deployments[]` (berisi `contractAddress` dan `chainId`), `currentMultiplier`, `pendingMultiplier`, `logoUrl` |
| `GET https://api.robinhood.com/rhj/quotes`            | bid/ask, volume harian, `isTradingHalt`, `generatedAt`                                                                                                                |
| `GET https://api.robinhood.com/rhj/corporate-actions` | aksi korporasi terproses, terbaru dulu, dengan `oldRate`/`newRate` — dipakai untuk menjelaskan kenapa `uiMultiplier()` berubah onchain                                |

Saring `deployments[]` ke `chainId: 4663` saja. Satu aset bisa punya deployment di beberapa chain.

Daftar alamat juga tersedia di halaman Token Contracts pada dokumentasi Robinhood Chain, tapi API di atas lebih baik karena membawa `currentMultiplier` dan `pendingMultiplier` sekaligus.

### 4.2c Peringatan token palsu — WAJIB

Token saham asli adalah BeaconProxy yang dideploy oleh satu StockFactory resmi. **Di chain ini ada token tiruan yang namanya dibuat mirip** — siapa pun bisa menamai kontraknya "Apple • Robinhood Token".

Konsekuensinya untuk kita: **jangan pernah mengenali kaki saham dari nama atau simbol.** Satu-satunya cara yang sah adalah mencocokkan alamat kontrak dengan daftar dari `/rhj/assets`.

Kalau ini dilanggar, sebuah memecoin yang dipasangkan ke token saham palsu akan dilaporkan seolah punya kaki saham asli, lengkap dengan angka atribusi yang meyakinkan dan sepenuhnya salah. Kesalahan ini tidak memunculkan error.

### 4.2d Batasan RPC publik

Blok di chain ini sekitar 100 ms, dan RPC publiknya dibatasi laju. Dua akibat:

- **Gabungkan pembacaan dengan multicall viem.** Job board membaca ratusan pool; tanpa multicall pasti kena rate limit.
- **Pakai timestamp, bukan nomor blok**, untuk menentukan rentang waktu. Dengan blok 100 ms, nomor blok bergerak sangat cepat dan tidak stabil dijadikan patokan.

### 4.3 Yang harus dipastikan duluan

Recon (bagian 11) harus menjawab ini sebelum kode produk ditulis:

1. DEX mana yang dipakai pool-pool ini? Indikasi awal dari sumber pihak ketiga menyebut **Uniswap v4**, dan ada UniversalRouter hasil fork dengan struct swap yang berbeda dari Uniswap standar. Recon harus mengonfirmasi ini langsung dari chain, bukan menerimanya begitu saja. Cara baca rasio berbeda total antar versi.
2. Berapa range block maksimal yang diterima `eth_getLogs` di RPC publik?
3. Seberapa rapat update Chainlink feed, dan bagaimana polanya saat pasar tutup?

---

## 5. Logika inti

Semua di `packages/core`. Ditulis sebagai fungsi murni yang menerima client dan alamat, bukan yang membaca env sendiri.

### 5.1 Attribution — `attribution.ts`

Jantungnya. Rumusnya:

```
price_usd       = pool_ratio * stock_price
stock_component = stock_price(t) / stock_price(t-n) - 1
meme_component  = pool_ratio(t) / pool_ratio(t-n) - 1
total           = (1 + meme_component) * (1 + stock_component) - 1
```

`pool_ratio` didefinisikan sebagai **berapa unit token saham per satu unit memecoin**. Definisi ini harus konsisten di seluruh kode — kalau terbalik, semua angka terbalik tanpa memunculkan error.

Dua komponen **dikalikan, bukan dijumlahkan**. Kalau dijumlahkan, total meleset makin jauh seiring besarnya pergerakan.

```ts
async function computeSplit(
  client: PublicClient,
  tokenAddress: Address,
  window: "24h" | "7d" | "30d",
): Promise<SplitResponse> {
  const pool = await findDeepestPool(client, tokenAddress);
  if (!pool) return { kind: "no-pool" };

  const stock = identifyStockLeg(pool);
  if (!stock)
    return {
      kind: "no-stock-leg",
      quoteSymbol: pool.otherSymbol,
      suggestions: topPools(),
    };

  const tEnd = await latestTimestamp(client);
  const tStart = tEnd - windowSeconds(window);
  const clamped = pool.createdAt > tStart;
  const from = clamped ? pool.createdAt : tStart;

  const ratioEnd = await poolRatioAt(client, pool, "latest");
  const ratioStart = await poolRatioAt(client, pool, from);

  const priceEnd = await stockPriceAt(client, stock, tEnd);
  const priceStart = await stockPriceAt(client, stock, from);

  const meme = ratioEnd / ratioStart - 1;
  const stockC = priceEnd / priceStart - 1;
  const total = (1 + meme) * (1 + stockC) - 1;

  return {
    kind: "ok",
    memeComponent: meme,
    stockComponent: stockC,
    total,
    clamped /* ... */,
  };
}
```

**Cara membaca rasio pool di block masa lalu.** Dua jalan:

- **Jalan A — panggilan historis.** `eth_call` dengan parameter block. Butuh RPC yang menyimpan state lama. Kode paling sederhana.
- **Jalan B — rekonstruksi dari event.** Ambil semua event Swap di rentang waktu, hitung rasio di tiap swap. Selalu bekerja, lebih berat, dan sekalian menghasilkan deret waktu untuk chart.

Pakai **Jalan B**. Chart per jam di report dan drift 30 hari sama-sama butuh deret waktu itu, jadi Jalan A hanya akan jadi jalan pintas yang nanti dibuang.

**Harga saham historis.** Chainlink menyimpan riwayat per round. Jalan mundur dari `latestRoundData()` pakai `getRoundData(roundId - 1)` sampai melewati `tStart`. Perhatikan: round ID Chainlink tersusun dari nomor fase dan nomor round. Kalau fase berganti di tengah rentang, pengurangan sederhana akan gagal. Tangani eksplisit, jangan asumsi round ID selalu berurutan mulus.

### 5.2 Float grip — `float.ts`

```
grip = balanceOf(stockToken, poolAddress) / totalSupply(stockToken)
```

**Peringatan ERC-8056.** Token saham Robinhood punya dua lapis angka: saldo mentah dan saldo terskala (sudah dikali `uiMultiplier`). `balanceOf` dan `totalSupply` mengembalikan angka mentah. Karena grip adalah rasio dua angka dari token yang sama, pengalinya saling menghapus dan hasilnya benar — **asalkan kedua sisi pakai jenis yang sama**. Jangan campur saldo mentah dengan suplai terskala. Kesalahan ini tidak memunculkan error, cuma angka yang salah diam-diam.

Ambang warna, tetap dan diumumkan di UI:

| Grip        | Status                |
| ----------- | --------------------- |
| di bawah 5% | normal                |
| 5–10%       | watch                 |
| 10% ke atas | ditandai merah        |
| 50% ke atas | pool adalah float-nya |

### 5.3 Jam pasar — `hours.ts`

**Jangan hardcode kalender bursa.** Libur, penutupan setengah hari, dan perubahan jadwal akan bikin kalender statis salah dan lo tidak akan sadar.

Deteksi dari data: pasar dianggap **buka** kalau Chainlink feed untuk ticker itu update dalam N menit terakhir, dan **beku** kalau tidak. Ambil N dari hasil recon, kemungkinan sekitar 2–3 kali interval heartbeat normal.

Keuntungannya: libur nasional, penutupan darurat, dan perubahan jam tertangani otomatis tanpa pernah menyentuh kode.

### 5.4 Freeze log — dan satu koreksi penting

Perhatian khusus, ini keputusan produk bukan teknis.

Di mockup `hours.html` ada kolom **"implied stock"** — harga saham yang seolah-olah dikutip pool selama pasar tutup:

```
implied_stock_at_open = frozen_stock_price * (1 + meme_drift_during_freeze)
```

**Angka ini bersandar pada satu asumsi: nilai wajar memecoin-nya sendiri tidak berubah selama jendela beku.** Asumsi itu tidak bisa dibuktikan. Kalau selama weekend memecoin-nya memang naik karena alasan meme, angka implied jadi menyesatkan.

Dua pilihan:

- **Pilihan 1, aman.** Buang kolom implied. Tampilkan dua kolom faktual saja: berapa rasio pool bergerak selama beku, dan berapa saham benar-benar bergerak saat dibuka. Biarkan pembaca menyimpulkan sendiri.
- **Pilihan 2, menarik tapi berisiko.** Pertahankan kolom implied dengan label eksplisit di UI: _"assumes the meme's own value was unchanged"_. Jangan pernah menyebutnya prediksi atau sinyal.

**Rekomendasi: Pilihan 1 untuk peluncuran.** Kolom implied bisa ditambahkan nanti setelah ada cukup data untuk mengukur seberapa sering asumsinya bertahan. Kalau klaim akurasi prediksi dipublikasikan lalu ada yang membongkar asumsinya, kredibilitas seluruh situs kena — termasuk angka-angka yang sebenarnya benar.

### 5.5 Corporate action — `actions.ts`

Baca `newUIMultiplier()` dan `effectiveAt()` di setiap token saham untuk event terjadwal. Baca log `UIMultiplierUpdated` dari genesis untuk riwayat.

Klasifikasi:

- **Dividen** — pengali naik sedikit, biasanya di bawah 3%. Nilai token naik sebesar itu. Pool tidak tahu, jadi ada nilai yang bocor ke arbitrase.
- **Split** — pengali berubah dengan faktor besar dan harga saham turun dengan faktor yang sama. **Nilai token tidak berubah, pool tidak bergerak sama sekali.**

Tulis fakta kedua itu di UI. Banyak orang mengira split peristiwa besar; di sistem ini split netral total.

Perkiraan nilai yang bocor:

```
value_at_risk = pool_stock_leg_value * (new_multiplier / old_multiplier - 1)
```

### 5.6 Menemukan pool — `pools.ts`

`findDeepestPool(client, tokenAddress)` — scan event pembuatan pool di factory DEX (nama event tergantung versi, pastikan dari recon). Untuk tiap pool yang memuat token itu, hitung likuiditas USD, ambil yang terdalam.

Kalau satu memecoin punya beberapa pool, atribusi **hanya** dihitung dari pool terdalam, dan fakta itu harus terlihat di UI. Ini batasan nyata, tulis di halaman method.

---

## 6. Spesifikasi API

Semua mengembalikan JSON, semua punya `Cache-Control`.

### `GET /api/split/[ca]?window=7d`

```ts
type SplitResponse =
  | {
      kind: "ok";
      token: { address: Address; symbol: string; name: string };
      quote: { address: Address; symbol: string; feed: Address };
      window: "24h" | "7d" | "30d";
      clamped: boolean;
      priceUsd: number;
      priceInQuote: number;
      memeComponent: number;
      stockComponent: number;
      total: number;
      beta: number;
      floatGrip: number;
      liquidityUsd: number;
      lpBurned: boolean;
      hourly: Array<{ t: number; meme: number; stock: number }>;
      stockLegFrozen: boolean;
      frozenForSeconds: number;
      computedAt: number;
    }
  | { kind: "no-stock-leg"; quoteSymbol: string; suggestions: TokenRef[] }
  | { kind: "no-pool" }
  | { kind: "not-a-token" }
  | { kind: "thin-pool"; liquidityUsd: number };
```

Cache 60 detik. Keempat varian selain `ok` wajib ada, masing-masing punya tampilan sendiri (bagian 7).

### `GET /api/board?window=24h&sort=volume`

Baca dari KV, tidak menyentuh RPC. Cache 30 detik.

### `GET /api/float`, `GET /api/hours`, `GET /api/actions`

Sama, baca KV.

### `POST /api/cron/refresh`

Dilindungi header rahasia. Menjalankan semua job di `jobs/`. Dipanggil scheduler tiap 5 menit.

---

## 7. State kosong dan state rusak

**Ini tidak ada di file HTML mana pun, dan wajib dikerjakan.** Data asli tidak serapi mockup.

| Situasi                              | Yang ditampilkan                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quote-nya stablecoin                 | Satu baris: _"This coin is quoted in USDG. There's no stock leg to separate."_ plus tiga saran coin berpasangan saham yang ramai. Bukan halaman error. |
| CA tidak valid / bukan chain ini     | Satu baris, tanpa stack trace, tanpa minta maaf                                                                                                        |
| Likuiditas di bawah $10K             | Tampilkan angkanya, beri label bahwa rasio pada likuiditas segitu adalah derau                                                                         |
| Pool lebih muda dari window          | Tampilkan hasil dari umur pool, tandai jelas: _"measured from first swap, N days"_                                                                     |
| Riwayat Chainlink tidak cukup        | Komponen saham tidak bisa dihitung. Katakan itu. Jangan tampilkan nol.                                                                                 |
| RPC gagal / timeout                  | Tampilkan kapan data terakhir berhasil dibaca. Jangan tampilkan angka basi seolah baru.                                                                |
| Token tanpa nama atau simbol         | Tampilkan alamat terpotong. Jangan tulis "Unknown Token".                                                                                              |
| Board kosong, job belum pernah jalan | Skeleton, bukan tabel kosong yang terbaca seperti tidak ada pool sama sekali                                                                           |

Aturan penulisan pesan: jelaskan apa yang terjadi dan apa yang bisa dilakukan. Tidak minta maaf, tidak samar.

**Dilarang keras:** menampilkan angka contoh atau nol saat data tidak ada. Edge Protocol mati di titik ini — dia memajang "Total Volume $0" dan "0 Active Traders" di halaman depan. Kalau data belum ada, kosongkan sectionnya.

---

## 8. Cache dan job terjadwal

| Data                 | Cara       | Frekuensi |
| -------------------- | ---------- | --------- |
| Registry token saham | KV         | 1x sehari |
| Daftar pool          | KV         | 15 menit  |
| Board                | KV         | 5 menit   |
| Float grip           | KV         | 5 menit   |
| Status jam pasar     | KV         | 1 menit   |
| Corporate action     | KV         | 15 menit  |
| Split satu pool      | cache HTTP | 60 detik  |

Setiap objek yang ditulis ke KV wajib membawa `computedAt`. Status bar menampilkan umur data itu, dan halaman tidak boleh berpura-pura data masih baru kalau job terakhir gagal.

---

## 9. Tipe bersama

Di `packages/core/types.ts`. Halaman, API route, dan job semuanya mengimpor dari sini. Tidak ada tipe yang didefinisikan dua kali.

```ts
type Address = `0x${string}`;
type Window = "24h" | "7d" | "30d";

interface StockToken {
  address: Address;
  symbol: string;
  name: string;
  feed: Address;
  multiplier: number;
  totalSupply: bigint; // raw
}

interface Pool {
  address: Address;
  token0: Address;
  token1: Address;
  stockSide: 0 | 1;
  createdAt: number;
  liquidityUsd: number;
  lpBurned: boolean;
  venue: string;
}

interface FloatGrip {
  stock: StockToken;
  lockedRaw: bigint;
  gripPct: number;
  poolCount: number;
  largestPool: { address: Address; symbol: string; pct: number };
}

interface MarketState {
  symbol: string;
  frozen: boolean;
  lastFeedUpdate: number;
  frozenForSeconds: number;
}

interface CorporateAction {
  stock: string;
  kind: "dividend" | "split";
  oldMultiplier: number;
  newMultiplier: number;
  effectiveAt: number;
  valueChangePct: number;
  poolsAffected: number;
  valueAtRiskUsd: number;
}
```

---

## 10. Fase kerja

Urutannya sengaja tidak dimulai dari UI. Kalau datanya tidak bisa diambil, UI secantik apa pun tidak berguna.

### Fase 0 — Recon (setengah hari, wajib duluan)

Jalankan `jobs/recon.ts`. Tidak ada kode produk ditulis sebelum ini lolos. Detail di bagian 11.

### Fase 1 — Inti (1–2 hari)

- `packages/core`: registry, pools, prices, blocks, attribution, types
- `GET /api/split/[ca]` jalan
- Satu halaman kasar: input CA, keluar tiga angka

Selesai kalau paste CA asli keluar angka masuk akal, dan lo bisa verifikasi manual satu pool lewat explorer.

### Fase 2 — Shell dan board (2 hari)

- AppShell + semua `components/primitives`
- Job `refresh-board` + KV
- Halaman terminal lengkap

### Fase 3 — Halaman sisa (2 hari)

- Float, hours, actions, method
- Report lengkap dengan chart per jam dan drift

### Fase 4 — Landing (1 hari)

Terakhir, bukan pertama. Landing menjual sesuatu yang harus sudah ada dulu, dan angka di proof strip harus data asli.

### Fase 5 — Sebelum publik

- Semua state di bagian 7
- Responsive sampai layar HP
- Fokus keyboard terlihat
- `prefers-reduced-motion` dihormati
- README + cara menjalankan recon sendiri
- Repo dipublikasikan

---

## 11. Gerbang verifikasi — `jobs/recon.ts`

Satu script, sekali jalan, tanpa UI. Harus menjawab enam hal dan mencetak hasilnya sebagai JSON. Kalau ada yang gagal, berhenti dan laporkan — jangan lanjut ke Fase 1.

1. **Registry.** Ambil daftar token saham dari `GET https://api.robinhood.com/rhj/assets`. Saring `deployments[]` ke `chainId: 4663`. Berapa banyak token? Apakah tiap token punya alamat feed Chainlink, dan kalau tidak, dari mana feed-nya didapat? Catat juga berapa yang punya `pendingMultiplier` terisi.
2. **Pool.** Temukan tiga memecoin yang pool utamanya dipasangkan ke token saham. DEX mana, versi berapa? Cetak alamat pool, token0, token1.
3. **Log historis.** Untuk satu pool, ambil semua event Swap 7 hari terakhir lewat `eth_getLogs`. Berapa jumlah log, berapa lama, apakah RPC publik menolak range-nya? Kalau ditolak, berapa range maksimal yang diterima?
4. **Harga historis.** Ambil riwayat Chainlink 7 hari mundur. Berapa titik data? Berapa jarak antar update saat pasar buka? Berapa panjang periode diam saat tutup? Apakah nomor fase round pernah berganti di rentang itu?
5. **Uji rumus.** Hitung tiga angka attribution untuk pool itu. Cetak apa adanya.
6. **Corporate action.** Untuk 10 token saham, panggil `uiMultiplier()`, `newUIMultiplier()`, `effectiveAt()`. Ambil log `UIMultiplierUpdated` dari genesis. Ada berapa event total, dan apakah `effectiveAt` pernah berisi waktu di masa depan?

Jawaban nomor 3 menentukan apakah butuh RPC berbayar. Nomor 4 menentukan ambang deteksi jam pasar di 5.3. Nomor 6 menentukan apakah halaman corporate action layak dibangun sekarang atau ditunda.

**Catatan testnet.** Kalau nomor 6 menunjukkan `effectiveAt` tidak pernah dijadwalkan di masa depan, satu-satunya cara memverifikasi mekanismenya adalah deploy token ERC-8056 tiruan di testnet `46630`, ubah pengalinya, dan lihat apakah pool bereaksi sesuai dugaan. Itu satu-satunya penggunaan testnet di proyek ini, dan hasilnya sekalian jadi bahan konten demo.

---

## 12. Repo dan lisensi

- Publik sejak hari pertama. Tidak ada kode tersembunyi.
- MIT.
- README berisi rumusnya, bukan cuma cara install. Orang harus bisa membantah angka kita.
- Perintah `bun run split <ca> --window 7d` mencetak angka yang sama persis dengan yang ada di situs. Kalau beda, situsnya yang salah.
- Semua file HTML referensi disimpan di `design/` bersama brief ini. Itu satu-satunya sumber kebenaran soal tampilan. `loading.html` adalah referensi state loading (bagian 14), bukan halaman produk.
- Tidak ada rahasia di repo selain URL RPC dan token cron, keduanya lewat env.

---

## 13. Lampiran — prompt per fase

### Fase 0

```
Baca design/BRIEF.md bagian 11 seluruhnya, lalu buat jobs/recon.ts.

Ini script Node sekali jalan. JANGAN buat UI, JANGAN buat Next.js app,
JANGAN buat database. Cuma script + output JSON + ringkasan di terminal.

Pakai Bun dan viem. Script dijalankan dengan: bun run jobs/recon.ts
Chain: Robinhood Chain mainnet, chainId 4663,
RPC https://rpc.mainnet.chain.robinhood.com
Explorer untuk verifikasi manual: https://robinhoodchain.blockscout.com

Jawab keenam pertanyaan di bagian 11 secara berurutan. Berhenti dan
laporkan penyebabnya kalau ada yang gagal. Jangan lanjut ke pertanyaan
berikutnya dengan data karangan atau nilai default.

Output: recon-output.json + ringkasan yang menyebut jelas langkah mana
yang berhasil, mana yang gagal, dan kenapa.
```

### Fase 1

```
Baca design/BRIEF.md bagian 4, 5, dan 9. Baca juga recon-output.json —
itu menentukan versi DEX, cara baca rasio pool, dan batas range eth_getLogs.

Buat packages/core sesuai struktur di bagian 2. Dua aturan keras:

1. packages/core TIDAK BOLEH mengimpor React, Next.js, atau apa pun dari
   components/. Semua fungsi harus bisa dipanggil dari script biasa.
2. packages/core TIDAK BOLEH memakai API khusus Bun (Bun.file, Bun.env,
   dan sejenisnya). Kode ini dipanggil dari jobs/ yang jalan di Bun DAN
   dari API route yang jalan di Node. Pakai process.env dan fetch standar.
   Baca bagian 1.4.

Implementasikan: chain.ts, registry.ts, pools.ts, prices.ts, blocks.ts,
attribution.ts, types.ts.

Untuk rasio pool historis pakai Jalan B (rekonstruksi dari event Swap),
bukan Jalan A. Alasannya di bagian 5.1.

Perhatikan peringatan round ID Chainlink di bagian 5.1 — tangani pergantian
fase secara eksplisit, jangan asumsi round ID berurutan mulus.

Lalu buat app/api/split/[ca]/route.ts yang mengembalikan SplitResponse
persis seperti bagian 6, termasuk kelima varian kind. Belum perlu UI rapi:
satu halaman kasar dengan input dan tiga angka sudah cukup.
```

### Fase 2

```
Baca design/BRIEF.md bagian 2 dan 3. Buka design/market.html dan
design/float.html untuk melihat rangkanya.

Buat AppShell (Topbar, Sidebar, StatusBar) sebagai app/(terminal)/layout.tsx.
Tiga variabel window.PAGE, window.STATUS, window.SIDEEXTRA di file HTML itu
adalah spesifikasi props — baca bagian 3.2.

Buat semua komponen di components/primitives SEKALI SAJA. Kalau sebuah
komponen dipakai di lebih dari satu halaman (SplitBar, StatCell, KVRow,
DataTable, WeekGrid), jangan bikin versi kedua di halaman lain.

Ambil token warna dari :root di file HTML, taruh di globals.css, map ke
Tailwind. Jangan tulis nilai hex di dua tempat.

Patuhi bagian 3.4 tanpa pengecualian.

Lalu konversi market.html jadi app/(terminal)/terminal/page.tsx dengan data
dari /api/board, dan buat jobs/refresh-board.ts + /api/cron/refresh.
```

### Fase 3

```
Baca design/BRIEF.md bagian 5.2 sampai 5.5 dan bagian 7.

Konversi float.html, hours.html, actions.html, method.html, report.html ke
halaman masing-masing sesuai pemetaan di bagian 3.1.

Untuk halaman hours: ikuti bagian 5.4. Untuk peluncuran pakai Pilihan 1 —
BUANG kolom "implied stock" dari freeze log. Ganti dengan dua kolom faktual:
pergerakan rasio pool selama beku, dan pergerakan saham saat dibuka. Jangan
menambahkan kolom implied atas inisiatif sendiri.

Untuk float: perhatikan peringatan raw vs scaled di bagian 5.2. Kesalahan ini
tidak memunculkan error, cuma angka yang salah diam-diam.

Untuk jam pasar: deteksi dari jeda update feed, JANGAN hardcode kalender
bursa. Alasannya di bagian 5.3.

Kerjakan juga seluruh tabel state kosong dan state rusak di bagian 7. Itu
bukan pekerjaan opsional.
```

---

## 14. Loading state

Referensi: `design/loading.html`, tiga state bisa dilihat lewat tombol di atas.

### 14.1 Tiga state, tiga pekerjaan berbeda

| State                 | Dipakai di                   | File Next.js                                                      |
| --------------------- | ---------------------------- | ----------------------------------------------------------------- |
| A. Route transition   | pindah halaman, paste CA     | `app/(terminal)/loading.tsx`, `app/(terminal)/c/[ca]/loading.tsx` |
| B. Skeleton           | board, float, hours, actions | `loading.tsx` per route                                           |
| C. Progresif bertahap | report                       | streaming di `c/[ca]/page.tsx`                                    |

Semua pakai mekanisme bawaan App Router: file `loading.tsx` muncul otomatis saat navigasi dan hilang otomatis saat data siap. **Tidak ada `setTimeout`, tidak ada durasi minimum, tidak ada splash screen saat pertama buka situs.**

### 14.2 Yang tidak boleh dibuat

- **Splash screen dengan teks boot palsu.** Tidak ada "INITIALIZING SYSTEM", "CONNECTING TO CHAIN", atau sejenisnya kalau tidak ada yang benar-benar sedang dikerjakan. Menambah delay ke halaman yang sebenarnya bisa langsung muncul adalah kebohongan kecil yang menabrak seluruh posisi produk ini.
- **Durasi minimum.** Kalau data siap dalam 200ms, tampilkan dalam 200ms.
- **Spinner di atas halaman kosong.** Selalu skeleton yang bentuknya sama dengan konten aslinya.

### 14.3 Aturan bentuk

- Skeleton harus punya lebar kolom dan tinggi baris yang **sama persis** dengan tabel aslinya. Kalau berbeda, layout melompat saat data masuk, dan lompatan itu terasa lebih lambat daripada menunggu sebentar.
- Teks status menyebut pekerjaan yang benar-benar berjalan: _"reading 412 swap events"_, _"walking chainlink rounds"_, _"168 of 432 pools"_. Angka progres diambil dari hitungan asli, bukan animasi.
- Bar loading memakai dua warna produk: biru dulu, lalu oranye. Bentuknya adalah ide produknya sendiri, bukan hiasan pinjaman.
- `prefers-reduced-motion` dihormati: shimmer dan bar berhenti, bentuk tetap terbaca.

### 14.4 Report harus progresif

Halaman report melakukan beberapa pembacaan berurutan. Tampilkan hasil tiap langkah begitu selesai, jangan tahan semuanya sampai langkah terakhir. Pasangan token muncul di header sebelum angkanya siap. Itu yang membuat terasa cepat, bukan animasinya.

### 14.5 Aceternity dan ReactBits

Boleh, dengan batas keras:

- **Hanya di landing page.** Tidak pernah di halaman terminal. Animasi di belakang tabel padat membuat angka susah dibaca, dan angka adalah produknya.
- **Maksimal satu efek di seluruh situs.** Efek andalan library itu (aurora, spotlight, meteors, beams) sudah sangat sering dipakai sehingga langsung dikenali sebagai milik library, bukan milik kita.
- **Tidak di belakang teks yang harus dibaca.**
- Kalau efeknya menarik framer-motion hanya untuk satu pemakaian, pertimbangkan menulis ulang efeknya dengan CSS. Bundle untuk satu efek jarang sepadan.

Loading state di 14.1 **tidak** memakai library mana pun. Semuanya CSS biasa.

---

## 15. Yang tidak dikerjakan

Ditulis supaya tidak ada yang diam-diam menambahkannya:

- Akun, login, wallet connect
- Watchlist tersimpan, alert, notifikasi
- Tombol trade, routing, integrasi DEX
- Token, staking, poin, airdrop
- Dark/light toggle
- Multi-chain
- Mobile app

Kalau salah satu terasa perlu, itu bahan diskusi produk, bukan tambahan di tengah sprint.
