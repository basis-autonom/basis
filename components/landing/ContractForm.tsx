'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startBasisRouteTransition } from '@/components/shell/routeTransition';

export function ContractForm() {
  const router = useRouter();
  const [address, setAddress] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = address.trim();
    if (value) {
      startBasisRouteTransition(`/c/${value}`);
      router.push(`/c/${value}`);
    }
  }

  return (
    <form className="landing-form" onSubmit={handleSubmit}>
      <input
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="0x… contract address"
        aria-label="Contract address"
        spellCheck={false}
      />
      <button type="submit">Split it</button>
    </form>
  );
}
