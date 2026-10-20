// src/hardSounds/TryIt.tsx — the 'Try it' step's words and its recorder (mw-5r3p30.363, PROVISIONAL, the Governor to confirm): each word has its speaker and a
// 'Say <word>' button that picks it; the hold bar below records him saying the picked word, and on letting go he hears his try, then the Greek voice, with
// Again to hear both once more. Nothing leaves the phone: the clip is kept in memory by useTry and dropped when the step closes. With the microphone
// refused the step says so and still plays the Greek voice.
import { useState, type ReactNode } from 'react';
import { RecordBar } from '../talk/Bars';
import { useTry, type TryPhase } from './useTry';

const BUTTON = 'min-h-12 w-full rounded-xl border border-line px-4 text-lg font-medium text-accent active:bg-line';

const SAYING: Record<TryPhase, string> = {
  idle: '',
  recording: 'Listening…',
  tap: 'Hold the bar while you say it.',
  denied: '',
  try: 'Your try',
  voice: 'The Greek voice',
};

/** The hold bar for one word, its status and Again. It is keyed by the picked word, so a new word starts clean and the old try is dropped. */
function TryBar({ word }: { word: string }) {
  const { phase, detail, press, release, drop, again } = useTry(word);
  return (
    <>
      <RecordBar label={phase === 'recording' ? 'Say it…' : `Hold to say ${word}`} listening={phase === 'recording'} onPress={press} onRelease={release} onAbort={drop} />
      {phase === 'denied' ? (
        <p role="alert" className="text-base">
          {detail} Here is the Greek voice instead.
        </p>
      ) : null}
      <p data-testid="try-status" role="status" className="min-h-6 text-base text-muted">
        {SAYING[phase]}
      </p>
      {phase === 'try' || phase === 'voice' || phase === 'denied' ? (
        <button type="button" onClick={again} className={BUTTON}>
          Again
        </button>
      ) : null}
    </>
  );
}

/** `words` are the step's words, drawn by `renderWord` (the lesson's own word with its speaker and marked letters). */
export function TryIt({ words, renderWord }: { words: readonly string[]; renderWord: (word: string, index: number) => ReactNode }) {
  const [picked, setPicked] = useState(0);
  const at = Math.min(picked, words.length - 1);
  return (
    <div className="mt-3 space-y-3">
      <ul className="space-y-2">
        {words.map((w, i) => (
          <li key={`${w}-${i}`} className="flex flex-wrap items-center gap-3">
            {renderWord(w, i)}
            <button
              type="button"
              aria-label={`Say ${w}`}
              aria-pressed={i === at}
              onClick={() => setPicked(i)}
              className={`min-h-11 rounded-lg border px-3 text-base font-medium ${i === at ? 'border-accent bg-accent text-accent-fg' : 'border-line text-accent active:bg-line'}`}
            >
              {i === at ? 'Saying it' : 'Say it'}
            </button>
          </li>
        ))}
      </ul>
      <TryBar key={`${words[at]}-${at}`} word={words[at]} />
    </div>
  );
}
