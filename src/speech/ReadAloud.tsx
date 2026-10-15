// src/speech/ReadAloud.tsx — the small speaker beside a block of prose he or a learner may want heard (mw-5r3p30.238): the idea and grammar sheets, a
// new word's sheet, each tutor answer, a What's new entry. ONE component for them all: icon only, aria-label 'Read aloud', and 'Stop reading' while its
// text is being read. It hands the text to the one reading engine (readAloud.ts startReading, from the tap itself: docs/pwa-best-practices.md section 12),
// so each stretch of Greek goes to the Greek voice and the rest to the English one, at his speed and in his voices, the package's bar has Pause, Resume and
// Stop, and a one-letter Greek word is a clip. The words stay on screen: nothing here hides or replaces them. With no Greek voice on the phone the English is
// read and the Greek is left out, with the one line of help (noVoiceHelp) that SpeakButton shows.
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasGreekVoice, hasVoice, noVoiceHelp, warmVoices } from './greek';
import { pageRuns } from './pageRuns';
import { getReading, startReading, stopAnswer, useReading, type Run } from './readAloud';
import { Icon } from './SpeakButton';

const HELP_MS = 7000;

/** Ids of what is read under a name (a string): far below any stored answer's, VERDICT_ID's or a page's (PageActions), one number to a name. */
const NAMED_FROM = -3_000_000_000;
const named = new Map<string, number>();
const readingIdOf = (id: string | number): number => {
  if (typeof id === 'number') return id;
  let n = named.get(id);
  if (n === undefined) {
    n = NAMED_FROM - named.size;
    named.set(id, n);
  }
  return n;
};

export function ReadAloud({ id, text, runs, className }: {
  /** names what is read: two buttons with the same id agree on whether it is playing (a number is the id of a tutor answer read by useTalk or useAsks) */
  id: string | number;
  /** the prose to read, its Greek found by its letters */
  text?: string;
  /** or the runs already cut (a tutor's answer, whose Markdown answerRuns strips) */
  runs?: Run[];
  className?: string;
}) {
  const mine = readingIdOf(id);
  const reading = useReading();
  const playing = reading.status !== 'idle' && reading.answer === mine;
  const [help, setHelp] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showHelp = useCallback((line: string) => {
    setHelp(line);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHelp(null), HELP_MS);
  }, []);

  useEffect(() => {
    void warmVoices();
    return () => {
      clearTimeout(timer.current);
      // leaving the screen ends its own reading, and only that
      if (getReading().answer === mine) stopAnswer();
    };
  }, [mine]);

  const onTap = () => {
    setHelp(null);
    if (playing) return stopAnswer();
    let say = runs ?? pageRuns(text ?? '');
    if (hasVoice('english') === false) return showHelp('No voice on this phone to read aloud');
    if (hasGreekVoice() === false && say.some((run) => run.language === 'greek')) {
      showHelp(noVoiceHelp('greek'));
      say = say.filter((run) => run.language !== 'greek');
    }
    if (say.length === 0) return;
    startReading({ chapter: 0, plan: [{ n: mine, runs: say }], from: mine, continuous: false, answer: mine });
  };

  return (
    <>
      <button
        type="button"
        data-read-aloud
        aria-label={playing ? 'Stop reading' : 'Read aloud'}
        aria-pressed={playing}
        onClick={onTap}
        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted active:bg-line ${playing ? 'text-accent' : ''} ${className ?? ''}`}
      >
        <Icon kind={playing ? 'stop' : 'speaker'} />
      </button>
      {help ? (
        <p
          role="status"
          className="pointer-events-none fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg shadow-lg"
        >
          {help}
        </p>
      ) : null}
    </>
  );
}
