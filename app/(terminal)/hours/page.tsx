import React from 'react';
import { EmptyState } from '@/components/primitives/EmptyState';

export default function HoursPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState 
        title="Market Hours" 
        message="Tracking pre-market, after-hours, and trading halts for underlying stocks." 
      />
    </div>
  );
}
