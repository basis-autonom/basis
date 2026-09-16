import React from 'react';
import { EmptyState } from '@/components/primitives/EmptyState';

export default function ActionsPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState 
        title="Corporate Actions" 
        message="Stock splits and dividend impact tracking." 
      />
    </div>
  );
}
