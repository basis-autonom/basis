export type Address = `0x${string}`;
export type Window = "24h" | "7d" | "30d";

export interface StockToken {
  address: Address;
  symbol: string;
  name: string;
  feed: Address;
  multiplier: number;
  totalSupply: string; // raw
}

export interface Pool {
  address: Address;
  token0: Address;
  token1: Address;
  stockSide: 0 | 1;
  createdAt: number;
  liquidityUsd: number;
  lpBurned: boolean;
  venue: string;
}

export interface FloatGrip {
  stock: StockToken;
  lockedRaw: string | null;
  totalRaw: string | null;
  gripPct: number | null;
  poolCount: number;
  largestPool: { address: Address; symbol: string; pct: number | null };
}

export interface MarketState {
  symbol: string;
  frozen: boolean;
  lastFeedUpdate: number;
  frozenForSeconds: number;
}

export interface CorporateAction {
  stock: string;
  type: string;
  multiplier: number;
  effect: number;
  date: string;
}

export interface SplitResponse {
  kind: "success" | "unknown_token" | "no_pool" | "no_feed" | "too_new";
  data?: {
    coinSymbol: string;
    coinName: string;
    stock: StockToken;
    pool: Pool;
    window: Window;
    priceUsd: number | null;
    prices: {
      stockNow: number | null;
      stockOld: number | null;
      poolRatioNow: number | null;
      poolRatioOld: number | null;
    };
    attribution: {
      stockComponent: number | null;
      memeComponent: number | null;
      total: number | null;
      beta: number | null;
    };
    grip: FloatGrip;
  };
}
