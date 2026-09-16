import React from 'react';

interface KVRowProps {
  label: string;
  value: React.ReactNode;
  tone?: 'up' | 'down' | 'hot' | 'neutral';
  last?: boolean;
}

export function KVRow({ label, value, tone = 'neutral', last = false }: KVRowProps) {
  const getToneColor = () => {
    switch (tone) {
      case 'up': return 'text-up';
      case 'down':
      case 'hot': return 'text-down';
      default: return '';
    }
  };

  return (
    <div className={`flex justify-between py-[7px] text-[12px] ${!last ? 'border-b border-line' : ''}`}>
      <span className="text-fg2">{label}</span>
      <span className={`font-mono ${getToneColor()}`}>
        {value}
      </span>
    </div>
  );
}
