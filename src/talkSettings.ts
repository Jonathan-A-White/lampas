// src/talkSettings.ts — the one settings object of every hold-to-talk control in Lampas (voice-kit/composer ComposerSettings, mw-06ggew.7): the Talk
// sheet's bar, the Reader's Talk bar and verse numbers, Welcome, the letter drill and Ask the tutor's Composer all hold the same way: hold the bar to
// talk, and what he said goes when he lets go. A new talk control passes this and nothing of its own.
import type { ComposerSettings } from 'voice-kit/composer';

export const LAMPAS_TALK_SETTINGS = { talk: 'hold', send: 'release' } as const satisfies Partial<ComposerSettings>;
