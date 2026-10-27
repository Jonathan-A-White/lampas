// src/SoundWordCard.tsx — an English (or Hebrew, mw-gdcyf98.14) word he drilled after misreading it (src/ReadingDrill.tsx), asked in Review (src/review/kinds.ts SOUNDS): the word large with a speaker, he says it
// aloud, Show says it for him to check against, then 'I knew it' / 'Not yet' grade it like a flashcard. (A Greek sound is asked by GrammarCard.)
import { useState } from 'react';
import { KNEW_IT } from './review/kinds';
import { speakWord } from './speech/greek';
import { SpeakButton } from './speech/SpeakButton';
import { langOfSource } from './script/greekLang';
import { SelfGrade } from './ui/SelfGrade';

export function SoundWordCard({ word, hebrew = false, picked, onPick }: { word: string; hebrew?: boolean; picked: string | null; onPick: (grade: string) => void }) {
  const language = hebrew ? 'hebrew' : 'english';
  const [shown, setShown] = useState(false);
  const graded = picked !== null;
  return (
    <>
      <div className="text-center">
        <p data-testid="grammar-prompt" data-kind="word-aloud" className="text-xl font-medium">
          Say this word aloud
        </p>
        <p data-testid="sound-word" {...langOfSource(hebrew ? 'hbo' : 'en')} className={`mt-3 min-w-0 break-words text-5xl font-semibold ${hebrew ? 'script-he' : ''}`}>
          {word}
        </p>
        <p className="mt-2 min-h-6 text-base text-muted">{shown ? 'Did you say it like that?' : 'Say it slowly first, then check.'}</p>
      </div>
      <div className="mt-4 flex justify-center">
        <SpeakButton text={word} id={`review-word-${word}`} label={`Hear ${word}`} kind="speaker" language={language} />
      </div>
      <SelfGrade
        shown={shown}
        onShow={() => {
          setShown(true);
          speakWord(word, language);
        }}
        picked={picked}
        onPick={onPick}
      />
      <p data-testid="feedback" role="status" className="mt-4 min-h-12 text-center text-lg">
        {!graded ? '' : picked === KNEW_IT ? 'Right.' : 'It comes back tomorrow.'}
      </p>
    </>
  );
}
