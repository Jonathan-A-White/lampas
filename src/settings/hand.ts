// src/settings/hand.ts — which hand he holds his phone in (Settings > Reading > Layout > Hand, mw-5r3p30.879): one app-wide preference every screen reads through this file
// (getHand, useHand), so the floating tutor button and anything else that sits at the thumb can go to that side. PROVISIONAL. Right until he says. No grip detection: a web
// app cannot read it reliably, so he says it in Settings (src/settings/controls/hand.tsx). Not a talkable setting: a row of its own (extraRows/hand.ts HAND_ROW).
import { useEffect } from 'react';
import { defineSetting } from './define';
import { getSetting, setSetting, useSetting } from './store';

export type Hand = 'left' | 'right';

export const handSetting = defineSetting<Hand>({
  key: 'hand',
  default: 'right',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' },
    ],
  },
  section: 'layout',
  label: 'Hand',
  hint: 'The hand you hold your phone in, so what sits at your thumb goes to that side.',
  help: 'Left or Right: the hand you hold your phone in. The floating ? button, the one way to the tutor, sits on that side, within reach of your thumb. Right by default. Lampas cannot tell how you hold the phone, so you say it here.',
});

/** The hand he holds the phone in: Right until he has said. */
export const getHand = (): Promise<Hand> => getSetting(handSetting);

/** Where the last hand read is kept for the first render of the next start (the store answers a moment later: a read from IndexedDB is never in the first render). */
const REMEMBERED_KEY = 'lampas.hand';

const rememberedHand = (): Hand | undefined => {
  try {
    const kept = window.localStorage.getItem(REMEMBERED_KEY);
    return kept === 'left' || kept === 'right' ? kept : undefined;
  } catch {
    return undefined;
  }
};

const rememberHand = (hand: Hand): void => {
  try {
    window.localStorage.setItem(REMEMBERED_KEY, hand);
  } catch {
    // a phone that keeps nothing here draws the default side first, as a first start does
  }
};

/** Saves the hand (Settings' Hand row). */
export const setHand = async (hand: Hand): Promise<void> => {
  rememberHand(hand);
  await setSetting(handSetting, hand);
};

/** The hand, following every change; undefined until it has been read. */
export const useHand = (): Hand | undefined => useSetting(handSetting);

/** The hand for whatever must be drawn with the first render (the floating ?, mw-fnvjof.17.153): the one read from the store when it is here, else the one the last start read, else Right (the default,
 * which is what a phone that has never been told gives). It is never undefined, so nothing waits for the store. */
export function useHandAtOnce(): Hand {
  const read = useHand();
  useEffect(() => {
    if (read) rememberHand(read);
  }, [read]);
  return read ?? rememberedHand() ?? 'right';
}
