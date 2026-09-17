'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function LiveLandingRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };

    const interval = window.setInterval(refresh, REFRESH_INTERVAL);
    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}
