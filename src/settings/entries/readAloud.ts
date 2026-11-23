// src/settings/entries/readAloud.ts — the registry entries of Play to and Read the tutor's responses aloud, written by hand (SETTINGS slots 180 and 200, src/settings/entry.ts).
import { getReadSpan, getReadTutor, setReadSpan, setReadTutor, type ReadTutor } from '../../data/repositories';
import { publish } from '../../events/bus';
import { PLAY_TOS, type PlayTo } from '../../speech/readSpan';
import { choice, slotted } from '../entry';

export const readSpanSlot = slotted(
  180,
  choice(
    'readSpan',
    'Play to',
    'Play goes on from here. To hear less, tap a verse, a section heading or the place line.',
    PLAY_TOS.map((s) => ({ value: s.id, label: s.label })),
    getReadSpan,
    async (value) => {
      await setReadSpan(value as PlayTo);
      publish({ kind: 'read-span-changed', span: value as PlayTo });
    },
    {
      section: 'readAloud',
      help: `Where the header's Play stops; it always goes on from the verse he is at:\n\n${PLAY_TOS.map((s) => `- **${s.label}** stops ${s.stops}`).join('\n')}\n\nA shorter reading comes from what he taps: the play button or Listen on a verse reads that verse only, a section heading's view reads that section, the place line's chapter view reads that chapter.`,
    },
  ),
);

export const readTutorSlot = slotted(
  200,
  choice(
    'readTutor',
    "Read the tutor's responses aloud",
    'The tutor\'s answers and reading verdicts are spoken as they arrive.',
    [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    getReadTutor,
    async (value) => {
      await setReadTutor(value as ReadTutor);
      publish({ kind: 'read-tutor-changed', readTutor: value as ReadTutor });
    },
    {
      section: 'readTutor',
      ai: true,
      help: "Whether the tutor's responses are spoken the moment they arrive, with no tap: the reading check's verdict (its heading, its note and each word to fix with its tip, never the verse itself) and the answers to what he asks. On by default; Off speaks nothing by itself (the speaker on an answer still reads it).",
    },
  ),
);
