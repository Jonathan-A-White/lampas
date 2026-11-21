// src/handsFree/switch.ts — the Hands-free switch (mw-rl10piw.5): reading the setting and turning it On or Off. The Settings row (src/settings/controls/voice.tsx) and the three-finger tap
// (src/handsFree/HandsFreeGate.tsx) both go through setHandsFree, so both write the one setting and both say 'Hands-free on' or 'Hands-free off' aloud, in the English voice, through the
// app's own speech (src/speech/greek.ts speakText: beside a reading, if one is under way). Saying it is a plain sentence the phone speaks; this opens no microphone.
import { handsFreeSetting } from '../settings/definitions';
import { getSetting, setSetting, useSetting } from '../settings/store';
import { SETTING_SAID_KEY, speakText } from '../speech/greek';
import { getReading, resumeReading, subscribeReading } from '../speech/readAloud';

/** The words said when the switch goes On, and when it goes Off. */
export const HANDS_FREE_ON = 'Hands-free on';
export const HANDS_FREE_OFF = 'Hands-free off';

/** The key the sentence is spoken under (a second tap says its own sentence at once). */
const SAID_KEY = SETTING_SAID_KEY;

/** Whether Hands-free is On now, as saved. */
export async function getHandsFree(): Promise<boolean> {
  return (await getSetting(handsFreeSetting)) === 'on';
}

/** Whether Hands-free is On, following every change; undefined until the saved value is read. */
export function useHandsFree(): boolean | undefined {
  const value = useSetting(handsFreeSetting);
  return value === undefined ? undefined : value === 'on';
}

/** Stops watching the reading for the words last said (a second sentence replaces it, or the words are over). */
let unwatch: (() => void) | null = null;

/** Says the new state aloud in the English voice. A Bible reading under way is paused by the words (speech/greek.ts speakBeside), so when they are said it goes on from where it
 * stopped, as the session's close does (playback.ts goOnAtClose); a reading he had paused himself, or that nothing was reading, is left as it was. A reading he takes in hand while
 * the words are said (Resume, Pause, Stop, another reading) is his from then on: the words' end does not touch it. */
export function sayHandsFree(on: boolean): void {
  unwatch?.();
  unwatch = null;
  const wasReading = getReading().status === 'reading';
  let touched = false;
  if (wasReading) {
    // the words' own Pause is the one change to 'paused' that is not his; any other status afterwards (reading again, or idle) is his hand
    const off = subscribeReading(() => {
      if (getReading().status !== 'paused') touched = true;
    });
    unwatch = off;
  }
  const done = () => {
    if (unwatch !== null && wasReading) unwatch();
    unwatch = null;
  };
  speakText(on ? HANDS_FREE_ON : HANDS_FREE_OFF, SAID_KEY, {
    language: 'english',
    onEnd: wasReading
      ? () => {
          done();
          if (!touched && getReading().status === 'paused') resumeReading();
        }
      : undefined,
  });
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
