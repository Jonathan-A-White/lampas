// src/talkSettings.ts — the one settings object of every hold-to-talk control in Lampas (voice-kit/composer ComposerSettings, mw-06ggew.7): the Talk
// sheet's bar, the Reader's Talk bar and verse numbers, Welcome, the letter drill and Ask the tutor's Composer all work the same way. Settings > Talk
// (mw-06ggew.8) chooses it: Talk Hold | Tap and Send On release | By button, kept on the device. A talk control calls `useTalkSettings()` and passes
// that and nothing of its own; LAMPAS_TALK_SETTINGS is what it holds until he has chosen (and while the choice is being read).
import { useMemo } from 'react';
import type { ComposerSettings } from 'voice-kit/composer';
import { sendSetting, talkSetting } from './settings/definitions';
import { useSetting } from './settings/store';

export const LAMPAS_TALK_SETTINGS = { talk: 'hold', send: 'release' } as const satisfies Partial<ComposerSettings>;

/** The talk bars' settings now: Settings > Talk, following every change. */
export function useTalkSettings(): Pick<ComposerSettings, 'talk' | 'send'> {
  const talk = useSetting(talkSetting) ?? LAMPAS_TALK_SETTINGS.talk;
  const send = useSetting(sendSetting) ?? LAMPAS_TALK_SETTINGS.send;
  return useMemo(() => ({ talk, send }), [talk, send]);
}

/** A bar's resting words for the way it is worked: with Talk set to Tap a bar that says Hold to ask says Tap to ask (a label without Hold is left as it is). */
export function tapWord(label: string, talk: ComposerSettings['talk']): string {
  return talk === 'tap' ? label.replace(/^Hold\b/, 'Tap') : label;
}
