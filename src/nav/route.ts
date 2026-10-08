// src/nav/route.ts — four screens, told apart by the address hash, so the phone's Back button walks them.
import { useSyncExternalStore } from 'react';

export type Route = 'home' | 'words' | 'import' | 'test' | 'about';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('hashchange', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('hashchange', listener);
  };
}

export function routeOf(hash: string): Route {
  if (hash === '#/words') return 'words';
  if (hash === '#/import') return 'import';
  if (hash === '#/test') return 'test';
  if (hash === '#/about') return 'about';
  return 'home';
}

const hashFor = (route: Route) => (route === 'home' ? '#/' : `#/${route}`);

/** Opens a screen; `replace` swaps the current history entry instead of adding one. */
export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const url = `${window.location.pathname}${window.location.search}${hashFor(route)}`;
  if (options.replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  notify();
}

export function useRoute(): Route {
  return routeOf(useSyncExternalStore(subscribe, () => window.location.hash));
}
