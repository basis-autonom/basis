"use client";

import React, { useState, useEffect } from 'react';

export function RotatingQuote({ quotes }: { quotes: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (quotes.length <= 1) return;
    
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % quotes.length);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [quotes]);

  return (
    <span 
      key={index} 
      className="landing-mono landing-highlight" 
      style={{ 
        display: 'inline-block',
        minWidth: '3ch',
        animation: 'basis-status-in 300ms ease-out both'
      }}
    >
      {quotes[index] || '—'}
    </span>
  );
}
