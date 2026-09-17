'use client';

import React, { useEffect, useRef, useState } from 'react';

type RevealState = 'before' | 'visible' | 'after';

export function ScrollReveal({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef<'down' | 'up'>('down');
  const lastScrollY = useRef(0);
  const [state, setState] = useState<RevealState>('before');

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY !== lastScrollY.current) {
        directionRef.current = currentScrollY > lastScrollY.current ? 'down' : 'up';
        lastScrollY.current = currentScrollY;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('visible');
        } else {
          setState(directionRef.current === 'down' ? 'after' : 'before');
        }
      },
      { threshold: 0.14, rootMargin: '-8% 0px -8% 0px' },
    );

    window.addEventListener('scroll', handleScroll, { passive: true });
    observer.observe(element);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={elementRef} className={`landing-reveal landing-reveal--${state} ${className}`}>
      {children}
    </div>
  );
}
