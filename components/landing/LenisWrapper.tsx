'use client';
import { ReactLenis } from '@studio-freight/react-lenis';
import React from 'react';

export function LenisWrapper({ children }: { children: React.ReactElement }) {
  const Lenis = ReactLenis as unknown as React.ComponentType<{ root?: boolean; children?: React.ReactNode }>;
  return <Lenis root>{children}</Lenis>;
}
