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
  lockedRaw: string;
  gripPct: number;
  poolCount: number;
  largestPool: { address: Address; symbol: string; pct: number };
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
    stock: StockToken;
    pool: Pool;
    window: Window;
    prices: {
      stockNow: number;
      stockOld: number;
      poolRatioNow: number;
      poolRatioOld: number;
    };
    attribution: {
      stockComponent: number;
      memeComponent: number;
      total: number;
    };
    grip: FloatGrip;
  };
}
