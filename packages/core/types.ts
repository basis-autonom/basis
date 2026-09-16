export type Address = `0x${string}`;
export type Window = '24h' | '7d' | '30d';

export interface StockToken {
  address: Address;
  symbol: string;
  name: string;
  feed: Address;
  multiplier: number;
  totalSupply: bigint; // raw
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
  lockedRaw: bigint;
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
  kind: 'dividend' | 'split';
  oldMultiplier: number;
  newMultiplier: number;
  effectiveAt: number;
  valueChangePct: number;
  poolsAffected: number;
  valueAtRiskUsd: number;
}
