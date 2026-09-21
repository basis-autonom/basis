import { ImageResponse } from 'next/og';
import { Address, SplitResponse, type Window } from '@/packages/core/types';
import { computeSplit } from '@/packages/core/attribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const size = { width: 1200, height: 630 };

function formatPercent(value: number | null): string {
  return value == null || !Number.isFinite(value)
    ? '—'
    : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function valueOrDash(value: string | null | undefined): string {
  return value && value.trim() ? value : '—';
}

function requestedWindow(value: string | null): Window {
  return value === '24h' || value === '30d' || value === '7d' ? value : '7d';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ca: string }> },
) {
  const { ca } = await params;
  const normalizedCa = ca.trim().toLowerCase();
  const window = requestedWindow(new URL(request.url).searchParams.get('window'));
  let splitResponse: SplitResponse;

  try {
    splitResponse = await computeSplit(normalizedCa as Address, window);
  } catch {
    splitResponse = { kind: 'unknown_token' };
  }

  const data = splitResponse.kind === 'success' ? splitResponse.data : null;
  const coin = data ? `$${data.coinSymbol}` : shortAddress(normalizedCa);
  const quote = data?.stock.symbol ?? (splitResponse.kind === 'no_stock_leg' ? splitResponse.quoteSymbol : null);
  const meme = data ? formatPercent(data.attribution.memeComponent) : '—';
  const stock = data ? formatPercent(data.attribution.stockComponent) : '—';
  const total = data ? formatPercent(data.attribution.total) : '—';
  const status = data
    ? data.windowLabel
    : splitResponse.kind === 'no_stock_leg'
      ? "There's no stock leg to separate."
      : 'Attribution unavailable from verified on-chain data.';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '54px 68px',
          background: '#0d1117',
          color: '#dfe5ec',
          fontFamily: 'Arial',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700 }}>
            ba<span style={{ color: '#5b8def' }}>/</span>sis
          </div>
          <div style={{ display: 'flex', color: '#59636f', fontSize: 20, letterSpacing: 2 }}>
            ROBINHOOD CHAIN / SPLIT REPORT
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 700 }}>{coin}</div>
            <div style={{ display: 'flex', color: '#c89428', fontSize: 32 }}>quoted in {valueOrDash(quote)}</div>
          </div>
          <div style={{ display: 'flex', color: '#8792a0', fontSize: 24 }}>{status}</div>
        </div>

        <div style={{ display: 'flex', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '22px 26px', background: '#16243c', borderLeft: '6px solid #5b8def' }}>
            <div style={{ display: 'flex', color: '#9bbdf7', fontSize: 20 }}>MEME COMPONENT</div>
            <div style={{ display: 'flex', marginTop: 8, color: '#dfe5ec', fontSize: 48 }}>{meme}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '22px 26px', background: '#3a2d13', borderRight: '6px solid #c89428' }}>
            <div style={{ display: 'flex', color: '#e0bc7c', fontSize: 20 }}>STOCK COMPONENT</div>
            <div style={{ display: 'flex', marginTop: 8, color: '#dfe5ec', fontSize: 48 }}>{stock}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: 220, padding: '22px 26px', background: '#11151b', border: '1px solid #2a323d' }}>
            <div style={{ display: 'flex', color: '#8792a0', fontSize: 20 }}>TOTAL</div>
            <div style={{ display: 'flex', marginTop: 8, color: '#dfe5ec', fontSize: 48 }}>{total}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  );
}
