import React from 'react';

interface StateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: StateProps) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-[24px] text-center">
      <div className="font-mono text-[14px] text-fg2 mb-[8px]">{title}</div>
      <div className="text-[12px] text-fg3 max-w-[400px] leading-relaxed">{message}</div>
    </div>
  );
}

export function ErrorState({ title, message }: StateProps) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-[24px] text-center">
      <div className="font-mono text-[14px] text-down mb-[8px]">{title}</div>
      <div className="text-[12px] text-fg3 max-w-[400px] leading-relaxed">{message}</div>
    </div>
  );
}
