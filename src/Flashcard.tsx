// src/Flashcard.tsx — a word asked as a flashcard (Review, once the word is strong enough: data/schedule.ts modeFor): the
// dictionary form large with the Tap to hear bar, a Show button that reveals the meaning (and the picture), then
// 'Know it well' / 'Kind of' / 'Don't know' (mw-5r3p30.787), which grade the answer: the schedule counts each differently (learn-kit's Grade).
import { useState } from 'react';
import type { Question } from './data/quiz';
import { gradeOfLabel } from './review/kinds';
import { SelfGrade } from './ui/SelfGrade';
import { TapToHear } from './TapToHear';
import { WordPicture } from './WordPicture';
import { GREEK_LANG } from './script/greekLang';
import { HeartOfWord } from './HeartOfWord';

interface Props {
  question: Question;
  /** the label of the button he tapped (review/kinds.ts WORD_GRADES), or null */
  picked: string | null;
  onPick: (grade: string) => void;
}

export function Flashcard({ question, picked, onPick }: Props) {
  const [shown, setShown] = useState(false);
  const graded = picked !== null;
  const missed = graded && gradeOfLabel(picked) === 'not';
  return (
    <>
      <div className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-4">
          {shown ? <WordPicture lemma={question.lemma} size={80} testId="picture" /> : null}
          {/* always the dictionary form, never the form the chapter has */}
          <p data-testid="prompt" data-lemma={question.lemma} {...GREEK_LANG} className="min-w-0 break-words font-greek text-5xl">
            {question.lemma}
          </p>
        </div>
        <p data-testid="flash-gloss" className="mt-3 min-h-8 text-2xl">
          {shown ? question.gloss : ''}
        </p>
      </div>
      <div className="mt-4">
        <TapToHear text={question.lemma} />
      </div>
      <SelfGrade shown={shown} onShow={() => setShown(true)} picked={picked} onPick={onPick} threeWay />
      <p data-testid="feedback" role="status" className="mt-4 min-h-12 text-center text-lg">
        {!graded ? '' : missed ? 'It comes back tomorrow.' : 'Right.'}
      </p>
      {/* Don't know shows the heart of the word under the answer (mw-bsf54t.14) */}
      {missed ? <HeartOfWord lemma={question.lemma} className="mt-2" /> : null}
    </>
  );
}
