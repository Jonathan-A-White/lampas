// src/speech/ReadAloud.tsx — the small speaker beside a block of prose he or a learner may want heard (mw-5r3p30.238): the idea and grammar sheets, a
// new word's sheet, each tutor answer, a What's new entry. ONE component for them all: icon only, aria-label 'Read aloud', and 'Stop reading' while its
// text is being read ('Reading paused, tap to stop', a speaker not a stop square, while the bar offers Resume). It hands the text to the one reading engine (readAloud.ts startReading, from the tap itself: docs/pwa-best-practices.md section 12),
// so each stretch of Greek goes to the Greek voice and the rest to the English one, at his speed and in his voices, the package's bar has Pause, Resume and
// Stop, and a one-letter Greek word is a clip. The words stay on screen: nothing here hides or replaces them. With no Greek voice on the phone the English is
// read and the Greek is left out, with the one line of help (noVoiceHelp) that SpeakButton shows.
// LessonReadAloud (mw-5r3p30.366) is the same button on a lesson: with Settings > Read aloud > Read lessons to me On it starts the reading by itself when the
// sheet opens (`auto`), the words still on screen. A browser that refuses speech without a tap (the error 'not-allowed', greek.ts onSpeechRefused) turns the
// button into a gently pulsing 'Tap to listen' instead of leaving silence; the tap is then an ordinary one.
import { useCallback, useEffect, useRef, useState } from 'react';
import { readLessonsSetting } from '../settings/definitions';
import { useSetting } from '../settings/store';
import { hasGreekVoice, hasVoice, noVoiceHelp, onSpeechRefused, warmVoices } from './greek';
import { pageRuns } from './pageRuns';
import { getReading, startReading, stopAnswer, stopAnswerSpeech, useReading, type Run } from './readAloud';
import { oneTap } from '../ui/settle';
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

export function ReadAloud({ id, text, runs, className, auto = false }: {
  /** names what is read: two buttons with the same id agree on whether it is playing (a number is the id of a tutor answer read by useTalk or useAsks) */
  id: string | number;
  /** the prose to read, its Greek found by its letters */
  text?: string;
  /** or the runs already cut (a tutor's answer, whose Markdown answerRuns strips) */
  runs?: Run[];
  className?: string;
  /** start reading when this appears (or when `id` changes while it is true), without a tap: a lesson, with Read lessons to me On */
  auto?: boolean;
}) {
  const mine = readingIdOf(id);
  const reading = useReading();
  const playing = reading.status !== 'idle' && reading.answer === mine;
  /** held on the bar (or by leaving the app): the speaker is not a stop square, which would say it is still playing; a tap still stops it */
  const paused = playing && reading.status === 'paused';
  const [help, setHelp] = useState<string | null>(null);
  /** the browser refused to read this by itself: the button asks for a tap */
  const [refusedFor, setRefusedFor] = useState<number | null>(null);
  const refused = refusedFor === mine;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** the reading that began by itself and has not yet been heard to start or refused */
  const byItself = useRef(false);

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
      if (getReading().answer === mine) stopAnswerSpeech();
    };
  }, [mine]);

  useEffect(
    () =>
      onSpeechRefused(() => {
        // the refusal of the reading this button started by itself (the one that holds the voice now), not of another sheet's
        if (!byItself.current || getReading().answer !== mine) return;
        byItself.current = false;
        setRefusedFor(mine);
      }),
    [mine],
  );

  const begin = () => {
    let say = runs ?? pageRuns(text ?? '');
    if (hasVoice('english') === false) return showHelp('No voice on this phone to read aloud');
    if (hasGreekVoice() === false && say.some((run) => run.language === 'greek')) {
      showHelp(noVoiceHelp('greek'));
      say = say.filter((run) => run.language !== 'greek');
    }
    if (say.length === 0) return;
    startReading({ chapter: 0, plan: [{ n: mine, runs: say }], from: mine, continuous: false, answer: mine });
  };
  const beginRef = useRef(begin);
  useEffect(() => {
    beginRef.current = begin;
  });

  useEffect(() => {
    if (!auto) return;
    byItself.current = true;
    beginRef.current();
    return () => {
      byItself.current = false;
    };
  }, [auto, mine]);

  const onTap = () => {
    setHelp(null);
    setRefusedFor(null);
    byItself.current = false;
    if (playing) return stopAnswer();
    begin();
  };

  return (
    <>
      <button
        type="button"
        data-read-aloud
        aria-label={refused ? 'Tap to listen' : paused ? 'Reading paused, tap to stop' : playing ? 'Stop reading' : 'Read aloud'}
        aria-pressed={playing}
        onClick={() => oneTap(`read-aloud:${mine}`, onTap)}
        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg text-muted active:bg-line ${playing || refused ? 'text-accent' : ''} ${refused ? 'px-3 motion-safe:animate-pulse' : ''} ${className ?? ''}`}
      >
        <Icon kind={playing && !paused ? 'stop' : 'speaker'} />
        {refused ? <span className="text-base font-medium">Tap to listen</span> : null}
      </button>
      {help ? (
        <p
          role="status"
          className="pointer-events-none fixed inset-x-3 toast-top z-50 rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg shadow-lg"
        >
          {help}
        </p>
      ) : null}
    </>
  );
}

/** The Read aloud button of a lesson (an idea sheet, a Grammar sheet, a new word's sheet): with Read lessons to me On it reads by itself once `ready` (the text is
 * final) and when it appears; with it Off it is the plain button. */
export function LessonReadAloud({ ready = true, ...props }: Omit<Parameters<typeof ReadAloud>[0], 'auto'> & { ready?: boolean }) {
  const on = useSetting(readLessonsSetting) === 'on';
  return <ReadAloud {...props} auto={on && ready} />;
}
