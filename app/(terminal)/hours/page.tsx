import React from 'react';
import { MarketHoursView } from '@/components/hours/MarketHoursView';
import { getCachedWeekFeedObservations } from '@/packages/core/hours';

export const revalidate = 300;

export default async function HoursPage() {
  const initialWeekHistory = await getCachedWeekFeedObservations();
  return <MarketHoursView initialWeekHistory={initialWeekHistory} />;
}

