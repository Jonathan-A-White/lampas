// src/tips/useOpenTip.ts — the tip waiting for him, when Tips is On and the phone is licensed (the 'Tip' chip and its card in the Reader read it):
// a tip is the mill's (mw-8m9dyu.2), so one kept from a licensed day is not shown on a phone that has lost its licence.
import { useLiveQuery } from 'dexie-react-hooks';
import { useAiAllowed } from '../gate/licenceContext';
import { getTips, openTip, type TipRow } from '../data/repositories';

export function useOpenTip(): TipRow | undefined {
  const tips = useLiveQuery(getTips, []);
  const tip = useLiveQuery(openTip, []);
  const ai = useAiAllowed();
  return ai && tips === 'on' ? tip : undefined;
}
