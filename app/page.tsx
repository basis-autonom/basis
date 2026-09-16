import React from 'react';
import { getBoardData } from '@/packages/core/board';
import { ContractForm } from '@/components/landing/ContractForm';
import { GripBoard } from '@/components/landing/GripBoard';
import { Hero } from '@/components/landing/Hero';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingBoardRow } from '@/components/landing/types';
import { MarketHours } from '@/components/landing/MarketHours';
import { MethodBlock } from '@/components/landing/MethodBlock';
import { LenisWrapper } from '@/components/landing/LenisWrapper';
import { SplitLab } from '@/components/landing/SplitLab';
import { StatBand } from '@/components/landing/StatBand';
import { TickerTape } from '@/components/landing/TickerTape';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  let board: LandingBoardRow[] = [];

  try {
    board = await getBoardData(25);
  } catch (error) {
    console.error('Error fetching landing board data', error);
  }

  const greenStock = board.filter((row) => (row.stock7d ?? 0) > 0 && (row.meme7d ?? 0) <= 0).length;
  const gripRows = board
    .filter((row) => row.grip != null)
    .sort((a, b) => (b.grip ?? 0) - (a.grip ?? 0));
  const largestGrip = gripRows[0]?.grip ?? null;
  const grips = gripRows.slice(0, 5).map((row) => ({
    coin: row.coin || '—',
    stock: row.quote || '—',
    grip: row.grip ?? 0,
  }));

  return (
    <LenisWrapper>
      <div className="landing-page">
        <LandingNav />
        <TickerTape rows={board} />
        <Hero rows={board} />
        <StatBand poolCount={board.length} greenStock={greenStock} largestGrip={largestGrip} />
        <SplitLab />
        <GripBoard grips={grips} />
        <MarketHours />
        <MethodBlock />
        <div className="landing-cta">
          <div className="landing-frame">
            <h2>Paste a contract.</h2>
            <ContractForm />
          </div>
        </div>
        <footer className="landing-footer">
          <div className="landing-frame landing-footer-inner">
            <span>chain 4663 · read-only · MIT</span>
            <span>basis.tools</span>
          </div>
        </footer>
      </div>
    </LenisWrapper>
  );
}
