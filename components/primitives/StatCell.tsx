import React from 'react';

interface StatCellProps {
  label: string;
  value: React.ReactNode;
  tone?: 'meme' | 'stock' | 'up' | 'down' | 'hot' | 'neutral';
  valueClassName?: string;
}

export function StatCell({ label, value, tone = 'neutral', valueClassName = '' }: StatCellProps) {
  const getToneColor = () => {
    switch (tone) {
      case 'meme': return 'text-meme';
      case 'stock': return 'text-stock';
      case 'up': return 'text-up';
      case 'down':
      case 'hot': return 'text-down';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col gap-[2px]">
      <span className="text-[10px] text-fg3">{label}</span>
      <span className={`font-mono text-[12px] ${getToneColor()} ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}
