// src/tips/useOpenTip.ts — the tip waiting for him, when Tips is On (the 'Tip' chip and its card in the Reader read it).
import { useLiveQuery } from 'dexie-react-hooks';
import { getTips, openTip, type TipRow } from '../data/repositories';

export function useOpenTip(): TipRow | undefined {
  const tips = useLiveQuery(getTips, []);
  const tip = useLiveQuery(openTip, []);
  return tips === 'on' ? tip : undefined;
}
