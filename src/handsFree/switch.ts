// src/handsFree/switch.ts — the Hands-free switch (mw-rl10piw.5): reading the setting and turning it On or Off. The Settings row (src/settings/controls/voice.tsx) and the three-finger tap
// (src/handsFree/HandsFreeGate.tsx) both go through setHandsFree, so both write the one setting and both say 'Hands-free on' or 'Hands-free off' aloud, in the English voice, through the
// app's own speech (src/speech/greek.ts speakText: beside a reading, if one is under way). Saying it is a plain sentence the phone speaks; this opens no microphone.
import { handsFreeSetting } from '../settings/definitions';
import { getSetting, setSetting, useSetting } from '../settings/store';
import { speakText } from '../speech/greek';

/** The words said when the switch goes On, and when it goes Off. */
export const HANDS_FREE_ON = 'Hands-free on';
export const HANDS_FREE_OFF = 'Hands-free off';

/** The key the sentence is spoken under (a second tap says its own sentence at once). */
const SAID_KEY = 'hands-free';

/** Whether Hands-free is On now, as saved. */
export async function getHandsFree(): Promise<boolean> {
  return (await getSetting(handsFreeSetting)) === 'on';
}

/** Whether Hands-free is On, following every change; undefined until the saved value is read. */
export function useHandsFree(): boolean | undefined {
  const value = useSetting(handsFreeSetting);
  return value === undefined ? undefined : value === 'on';
}

/** Says the new state aloud in the English voice. */
export function sayHandsFree(on: boolean): void {
  speakText(on ? HANDS_FREE_ON : HANDS_FREE_OFF, SAID_KEY, { language: 'english' });
}

/** Turns Hands-free On or Off: saves the setting and says so. Setting it to what it already is changes and says nothing. */
export async function setHandsFree(on: boolean): Promise<void> {
  if ((await getHandsFree()) === on) return;
  await setSetting(handsFreeSetting, on ? 'on' : 'off');
  sayHandsFree(on);
}

/** The other way: On if it is Off, Off if it is On. */
export async function toggleHandsFree(): Promise<void> {
  await setHandsFree(!(await getHandsFree()));
}
