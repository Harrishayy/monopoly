'use client';

import { useEffect, useSyncExternalStore } from 'react';

const RM = '(prefers-reduced-motion: reduce)';

/** True when the person asked for less motion. Animations should show a static end state. */
export function useReducedMotion() {
  return useSyncExternalStore(
    (fn) => {
      const m = matchMedia(RM);
      m.addEventListener('change', fn);
      return () => m.removeEventListener('change', fn);
    },
    () => matchMedia(RM).matches,
    () => false,
  );
}

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * Global single-key and ⌘/Ctrl shortcuts. Ignored while typing in a field.
 * Keys: "/", "j", "k", "mod+k".
 */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = `${mod ? 'mod+' : ''}${e.key.toLowerCase()}`;
      const fn = map[key];
      if (!fn) return;
      if (!mod && typing(e.target)) return;
      e.preventDefault();
      fn(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map, enabled]);
}
