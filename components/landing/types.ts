export interface LandingBoardRow {
  ca?: string;
  poolId?: string;
  coin?: string | null;
  coinName?: string | null;
  quote?: string | null;
  priceUsd?: number | null;
  chg24h?: number | null;
  meme7d?: number | null;
  stock7d?: number | null;
  memeRatioPct?: number | null;
  grip?: number | null;
  liquidity?: number | null;
}

export interface LandingGrip {
  coin: string;
  stock: string;
  grip: number;
}

export function displaySymbol(symbol: string | null | undefined) {
  if (!symbol) return '—';
  return symbol.startsWith('$') ? symbol : `$${symbol}`;
}
