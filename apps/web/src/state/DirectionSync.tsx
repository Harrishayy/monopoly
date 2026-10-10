'use client';

import { useEffect } from 'react';
import { useUi } from './ui';

/** Mirrors the chosen direction onto <html data-dir>, which switches every token. */
export function DirectionSync() {
  const direction = useUi((s) => s.direction);
  useEffect(() => {
    document.documentElement.dataset.dir = direction;
  }, [direction]);
  return null;
}
