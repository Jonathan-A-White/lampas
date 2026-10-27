// tests/support/recall-probe.tsx — a stand-in for the Memorize session screen (a later story's) for features/steps/memorize-hear.steps.tsx: a bar over useRecallHold for the recall's language, the judge, the
// words it says when a recall cannot be heard (with I had it / Not yet), and the Dexie `recalls` row each way of hearing leaves.
import { useState } from 'react';
import { recordRecall } from '../../src/data/repositories/memorize';
import { asked, judgeReading, judgeSaid, type Judgement } from '../../src/memorize/judge';
import type { MemorizeLang } from '../../src/memorize/languages';
import type { Verses } from '../../src/memorize/refs';
import { sendWeaveRecall } from '../../src/memorize/sendWeave';
import type { Token } from '../../src/memorize/target';
import { useRecallHold, type RecallUnavailable } from '../../src/memorize/useRecallHold';
import type { wovenOf } from '../../src/reader/useWoven';
import { HeldTalkBar, RecordBar } from '../../src/talk/Bars';

const NOTES: Record<RecallUnavailable, string> = {
  'no-greek-dictation': 'This phone cannot hear Greek. Say it, then grade yourself.',
  'no-hebrew-dictation': 'This phone cannot hear Hebrew. Say it, then grade yourself.',
  'no-dictation': 'This phone cannot take dictation. Say it, then grade yourself.',
  offline: 'The speech service cannot be reached. Say it, then grade yourself.',
  'no-microphone': 'The microphone is turned off. Say it, then grade yourself.',
};

export interface Setup {
  ref: string;
  lang: MemorizeLang;
  found: Verses;
  target: Token[];
  woven: ReturnType<typeof wovenOf>;
}


/** The stand-in for the session screen: the bar for the language, what the hold tells it, the judge and the record. */
export function Probe({ s, onJudged }: { s: Setup; onJudged: (j: Judgement) => void }) {
  const [note, setNote] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const keep = async (j: Judgement, how: 'said' | 'mill' | 'self') => {
    onJudged(j);
    await recordRecall({ ref: s.ref, lang: s.lang, rung: 0, score: j.score, missed: j.misses.map((m) => s.target[m].text), asked: j.asked.map((a) => ({ token: a.text, lang: a.lang })), how });
    setNote(j.passed ? 'Passed' : 'Not yet');
  };
  const hold = useRecallHold({
    lang: s.lang,
    onHeard: (words) => void keep(judgeSaid(s.target, words), 'said'),
    onRecording: (recording) =>
      void sendWeaveRecall(s.found.heading, s.found.verses, s.found.verses.map((v) => s.woven?.[s.found.source.verses.indexOf(v)] ?? null), recording, { chapter: s.found.source }).then(
        (answer) => keep(judgeReading(s.target, answer), 'mill'),
        () => {
          setUnavailable(true);
          setNote('The tutor cannot be reached. Say it, then grade yourself.');
        },
      ),
    onUnavailable: (reason) => {
      setUnavailable(true);
      setNote(NOTES[reason]);
    },
  });
  return (
    <div>
      {s.lang === 'weave' ? (
        <RecordBar label="Hold to say it" listening={hold.record.listening} onPress={hold.record.press} onRelease={hold.record.release} onAbort={hold.record.drop} />
      ) : (
        <HeldTalkBar hold={hold.talk} />
      )}
      <p role="status">{note}</p>
      {unavailable ? (
        <>
          <button type="button" onClick={() => void keep({ score: 1, passed: true, misses: [], heardWords: [], asked: asked(s.target) }, 'self')}>
            I had it
          </button>
          <button type="button" onClick={() => void keep({ score: 0, passed: false, misses: s.target.map((_, i) => i), heardWords: [], asked: asked(s.target) }, 'self')}>
            Not yet
          </button>
        </>
      ) : null}
    </div>
  );
}
