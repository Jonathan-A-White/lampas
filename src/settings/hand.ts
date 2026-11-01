// src/settings/hand.ts — which hand he holds his phone in (Settings > Reading > Layout > Hand, mw-5r3p30.879): one app-wide preference every screen reads through this file
// (getHand, useHand), so the floating tutor button and anything else that sits at the thumb can go to that side. PROVISIONAL. Right until he says. No grip detection: a web
// app cannot read it reliably, so he says it in Settings (src/settings/controls/hand.tsx). Not a talkable setting: a row of its own (rows.ts HAND_ROW).
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

/** Saves the hand (Settings' Hand row). */
export const setHand = (hand: Hand): Promise<void> => setSetting(handSetting, hand);

/** The hand, following every change; undefined until it has been read. */
export const useHand = (): Hand | undefined => useSetting(handSetting);
