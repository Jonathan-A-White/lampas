// src/library/useShelf.ts — his shelf as the Library screens read it: the state of every book he has touched, by Resource ID, kept live as he taps. Undefined while the shelf is read.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { shelfOf, type ShelfState } from '../data/repositories';
import { shelfStates } from './kinds';

export function useShelf(): ReadonlyMap<string, ShelfState> | undefined {
  const rows = useLiveQuery(() => shelfOf(), []);
  return useMemo(() => (rows === undefined ? undefined : shelfStates(rows)), [rows]);
}
