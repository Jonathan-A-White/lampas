// src/script/HebrewWord.tsx — a Hebrew word in the tutor's answer, tappable like a Greek one (mw-5r3p30.98, docs/hebrew.md): a tap says it in the phone's Hebrew
// voice (he-IL) and opens the pronunciation guide (HebrewGuide.tsx). With no Hebrew voice nothing is spoken and the guide says so.
import { useEffect, useState, type ReactNode } from 'react';
import { stopIfSpeaking, warmVoices } from '../speech/greek';
import { HebrewGuide } from './HebrewGuide';
import { hebrewKey, speakHebrew } from './hebrewSpeech';
import { HEBREW } from './scripts';

export function HebrewWord({ children }: { children?: ReactNode }) {
  const word = (Array.isArray(children) ? children.join('') : String(children ?? '')).trim();
  const [guide, setGuide] = useState<{ noVoice: boolean } | null>(null);
  useEffect(() => {
    void warmVoices();
    return () => stopIfSpeaking(hebrewKey(word));
  }, [word]);
  if (!word) return null;
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setGuide({ noVoice: !speakHebrew(word) })}
        className="inline-block min-h-11 rounded-lg px-1 align-middle text-accent underline decoration-dotted underline-offset-4 active:bg-line"
      >
        <span lang={HEBREW.id} dir={HEBREW.dir} className={HEBREW.className}>
          {word}
        </span>
      </button>
      {guide ? <HebrewGuide word={word} noVoice={guide.noVoice} onClose={() => setGuide(null)} /> : null}
    </>
  );
}
