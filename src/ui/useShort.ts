// src/ui/useShort.ts — whether the window is short (sideways: the `short:` variant of src/index.css, max-height 500px), for a piece that must move to another place in
// the tree when it is, since a class can restyle an element but not give it another parent. One query, the CSS's own number.
import { useSyncExternalStore } from 'react';

const QUERY = '(max-height: 500px)';

const query = (): MediaQueryList | null => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null);

const subscribe = (notify: () => void): (() => void) => {
  const list = query();
  list?.addEventListener('change', notify);
  return () => list?.removeEventListener('change', notify);
};

/** True while the window is as short as a phone on its side. Never true where there is no matchMedia (a test's jsdom). */
export function useShort(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? false, () => false);
}
