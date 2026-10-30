// src/settings/hand.ts — which hand he holds his phone in (Settings > Reading > Layout > Hand, mw-5r3p30.879): one app-wide preference every screen reads through this file
// (getHand, useHand), so the floating tutor button and anything else that sits at the thumb can go to that side. PROVISIONAL. Right until he says. No grip detection: a web
// app cannot read it reliably, so he says it, once, when he first picks the floating Tutor door (src/settings/controls/tutorDoor.tsx). Not a talkable setting: a row of its own (rows.ts HAND_ROW).
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
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
  help: 'Left or Right: the hand you hold your phone in. The floating ? button of the Tutor door sits on that side, within reach of your thumb. Right by default. Lampas cannot tell how you hold the phone, so it asks once, the first time you choose Floating ?, and here you can change the answer.',
});

/** The hand he holds the phone in: Right until he has said. */
export const getHand = (): Promise<Hand> => getSetting(handSetting);

/** Saves the hand (Settings' Hand row, or the one-time question); it counts as answered from then on. */
export const setHand = (hand: Hand): Promise<void> => setSetting(handSetting, hand);

/** The hand, following every change; undefined until it has been read. */
export const useHand = (): Hand | undefined => useSetting(handSetting);

/** Whether he has said which hand (the one-time question was answered, or the Hand row was set): the question is not asked again. */
export const handAsked = async (): Promise<boolean> => (await db.settings.get(handSetting.key)) !== undefined;

/** handAsked, following every change; undefined until it has been read. */
export const useHandAsked = (): boolean | undefined => useLiveQuery(handAsked, []);
