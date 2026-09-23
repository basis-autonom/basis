<div align="center">
  <img src="public/og.png" alt="Basis banner" width="100%" />
</div>

# Basis — On-chain attribution for stock-paired memecoins

Basis is a read-only forensic terminal for memecoins on Robinhood Chain.

On this chain, a memecoin can be quoted in a tokenized stock instead of a
stablecoin. When the stock moves, the memecoin reprices even if nobody trades
the pool. Basis separates those two effects so you can see which half of the
move actually came from the meme.

[**Live site**](https://basis.tools) · [**Robinhood Chain Explorer**](https://robinhoodchain.blockscout.com)

## What Basis shows

- **Split attribution** — how much of a move came from the meme and how much came from its stock pair.
- **Float grip** — how much of a stock token's on-chain supply is locked inside the AMM.
- **Market hours** — whether the stock leg is updating or frozen while the pool keeps moving.
- **Corporate actions** — scheduled and historical multiplier changes, including dividends and splits.
- **Findings** — recurring cases where a large price move is mostly explained by the stock leg.

## What Basis is — and is not

### Basis is

- An observability layer for Robinhood Chain liquidity pools.
- A calculator that reads public chain state and makes the attribution explicit.
- A method-first dashboard where every displayed number has a documented source.

### Basis is not

- A trading terminal or execution interface.
- A wallet, broker, exchange, or custody product.
- A price prediction system or a promise of returns.
- A smart contract. Basis does not deploy contracts or send transactions.

Basis is read-only. It does not ask for a wallet, hold funds, route trades, or
store personal query history or wallet data.

## The attribution identity

For a pool quoted in a tokenized stock:

```text
price_usd       = pool_ratio × stock_price
stock_component = stock_price(t) / stock_price(t-n) - 1
meme_component  = pool_ratio(t) / pool_ratio(t-n) - 1
total           = (1 + meme_component) × (1 + stock_component) - 1
```

`pool_ratio` is defined as the number of stock-token units per one memecoin
unit. The two components multiply because they act on the same price; adding
them would increasingly misstate the total as either leg moves further.

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                              BROWSER                             │
│   Landing · Terminal · Report · Float · Hours · Actions · Method │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                         NEXT.JS APP ROUTER                       │
│             Server-rendered pages · API route handlers            │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                         PACKAGES / CORE                          │
│  Pool discovery · StateView reads · Chainlink history · formulas │
└───────┬───────────────────┬───────────────────┬──────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌─────────────────────────┐
│ Robinhood RPC │  │ Chainlink feeds│  │ RH assets + pool indexer │
│ chain 4663    │  │ stock prices   │  │ discovery only           │
└───────────────┘  └────────────────┘  └─────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ PostgreSQL — pool snapshots, findings, watcher settings, X posts │
└──────────────────────────────────────────────────────────────────┘
```

The application uses an indexer to discover candidate pools, but the numbers
shown in the product come from Robinhood Chain state or the mapped Chainlink
feed. Pool ratios are read from Uniswap v4 `StateView.getSlot0`, not from a
v2-style reserves contract.

## Data sources and chain constants

| Data | Source |
| :--- | :--- |
| Stock-token registry | Robinhood `GET /rhj/assets` |
| Stock prices | Explicit Chainlink feed mappings in `packages/core/registry.ts` |
| Pool discovery | GeckoTerminal / DexScreener-style pool indexer |
| Pool ratio | Uniswap v4 `StateView` on Robinhood Chain |
| Stock-token supply | `totalSupply()` on the stock token |
| AMM-locked stock supply | `balanceOf(PoolManager)` |
| Corporate actions | ERC-8056 multiplier reads and `UIMultiplierUpdated` logs |

| Network | Value |
| :--- | :--- |
| Chain | Robinhood Chain mainnet |
| Chain ID | `4663` |
| RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` |
| DEX model | Uniswap v4 singleton `PoolManager` |

Stock-token addresses are recognized from the official registry, never from a
symbol or token name alone. This prevents lookalike contracts from being
treated as real stock tokens.

## Repository structure

```text
basis/
├─ app/
│  ├─ page.tsx                         # landing page
│  ├─ (terminal)/                      # terminal shell and product pages
│  │  ├─ terminal/page.tsx             # attribution board
│  │  ├─ float/page.tsx                # float grip
│  │  ├─ hours/page.tsx                # market hours
│  │  ├─ actions/page.tsx              # corporate actions
│  │  ├─ method/page.tsx               # methodology
│  │  └─ c/[ca]/page.tsx                # contract report
│  └─ api/                             # JSON route handlers
├─ components/                         # shell, tables, charts, and views
├─ packages/
│  ├─ core/                            # chain reads and pure domain logic
│  └─ db/                              # Drizzle client, schema, and queries
├─ jobs/                               # watcher, recon, migration utilities
├─ drizzle/                            # database migrations
├─ design/                             # product brief and visual references
├─ public/                             # static assets
├─ .env.example                        # environment variable template
└─ vercel.json                         # deployment configuration
```

`packages/core` is shared by the web app and background jobs. It contains no
React components and no Bun-specific APIs so the same logic can run in the
Next.js Node runtime or from a Bun script.

## Getting started

### Prerequisites

- Node.js 20 or newer for the Next.js runtime.
- Bun 1.3+ for package management and utility jobs.
- PostgreSQL for snapshots, findings, and watcher state.

### 1. Install

```bash
git clone <repository-url> basis
cd basis
bun install
```

### 2. Configure the environment

```bash
cp .env.example .env.local
```

Set the values needed for your environment:

```bash
RPC_URL=                                  # optional RPC override
DATABASE_URL=                             # PostgreSQL connection string
CRON_SECRET=                               # protects /api/cron/watch
WATCHER_ENABLED=true                      # set false to disable findings
WATCHER_POST_X=false                      # optional X posting switch
NEXT_PUBLIC_SITE_URL=https://basis.tools
X_DRY_RUN=true                             # keep true while testing
X_USER_ACCESS_TOKEN=                       # optional X API token
```

### 3. Run database migrations

```bash
bun run db:migrate
```

To create a new migration after changing the schema:

```bash
bun run db:generate
```

### 4. Start the app

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful commands

```bash
bun run lint       # lint the application
bun run build      # create a production build
bun run start      # serve the production build
bun run watcher    # scan the board and record new findings
bun run x:dry-run  # preview optional X posts without publishing
```

The read-only recon scripts and one-off utilities live in `jobs/`. Run them
only when you understand the RPC and database cost of the operation.

## API surface

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/split/[ca]?window=24h\|7d\|30d` | Compute attribution for one contract address |
| `GET` | `/api/split/[ca]/hourly?window=...` | Return hourly meme/stock contribution points |
| `GET` | `/api/board` | Return the current stock-paired board |
| `GET` | `/api/float` | Return stock-token float grip data |
| `GET` | `/api/hours` | Return market-hours data and feed availability |
| `GET` | `/api/actions` | Return scheduled and historical corporate actions |
| `GET` | `/api/findings?limit=20` | Return watcher findings |
| `GET` | `/api/cron/watch` | Refresh snapshots, board data, float data, and findings |

The cron route requires:

```text
Authorization: Bearer <CRON_SECRET>
```

The route is safe to call only from a trusted scheduler. It does not write to
the blockchain; its writes are limited to the configured PostgreSQL database
and optional X-post records.

## Important limitations

- Attribution uses the deepest discovered stock-paired pool for a token.
- A token quoted in a stablecoin has no stock leg to separate.
- Thin liquidity can make the ratio noisy and historical state incomplete.
- If a Chainlink history point or pool snapshot is unavailable, Basis leaves the
  value unavailable instead of substituting zero.
- Float grip is measured at the AMM level: stock-token balance held by the
  Uniswap v4 `PoolManager` divided by the token's raw `totalSupply`.
- Market-hours state is inferred from feed updates; a frozen stock leg does not
  stop the memecoin side of the pool from moving.

## License and disclaimer

MIT.

Basis is an open-source, read-only analytics project. Its attribution numbers
describe observed historical movements; they are not investment advice,
predictions, or a guarantee of future returns.
