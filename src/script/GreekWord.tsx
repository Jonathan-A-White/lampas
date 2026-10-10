// src/script/GreekWord.tsx — a Greek word in the tutor's answer is a word to tap (mw-y3qno5.1), as a Hebrew one is: a tap says it in the Greek voice at the speed he
// chose (the same engine as a long press, speech/greek.ts speakWord; a reading under way is paused and goes on after it). With no Greek voice a line says where to
// get one. A long press says the word too and opens nothing (data-hear-word: the app-wide long press, src/ui/HearAnyWord.tsx, treats this button as text).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { publish } from '../events/bus';
import { hasVoice, noVoiceHelp, speakWord, warmVoices } from '../speech/greek';
import { pauseReading } from '../speech/readAloud';

const HELP_MS = 7000;

export function GreekWord({ children }: { children?: ReactNode }) {
  const word = (Array.isArray(children) ? children.join('') : String(children ?? '')).trim();
  const [help, setHelp] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    void warmVoices();
    return () => clearTimeout(timer.current);
  }, []);
  if (!word) return null;
  const hear = (): void => {
    setHelp(null);
    // with no Greek voice the phone would say it in another one: nothing is spoken, and a reading under way is paused as a spoken word would pause it
    if (hasVoice('greek') !== false && speakWord(word, 'greek')) {
      publish({ kind: 'word-spoken', text: word, language: 'greek', verse: null });
      return;
    }
    pauseReading();
    setHelp(noVoiceHelp('greek'));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHelp(null), HELP_MS);
  };
  return (
    <>
      <button
        type="button"
        data-hear-word=""
        onClick={hear}
        className="inline-block min-h-11 rounded-lg px-1 align-middle text-accent underline decoration-dotted underline-offset-4 active:bg-line"
      >
        <span lang="grc" className="font-greek">
          {word}
        </span>
      </button>
      {help ? (
        <span
          role="status"
          className="pointer-events-none fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 block rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg shadow-lg"
        >
          {help}
        </span>
      ) : null}
    </>
  );
}
