// src/data/dbBlocked.ts — whether opening the database is blocked by an older Lampas tab still holding it (mw-5r3p30.846). Dexie fires 'blocked' when an upgrade
// waits on another connection; until that tab closes (or reloads onto this build) nothing stored loads, and the screens wait on it. The Reader says so after 8 s.
import { useSyncExternalStore } from 'react';

let blocked = false;
const listeners = new Set<() => void>();

export function setDbBlocked(value: boolean): void {
  if (blocked === value) return;
  blocked = value;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** True while the database's open is waiting on another tab. */
export const useDbBlocked = (): boolean => useSyncExternalStore(subscribe, () => blocked);
