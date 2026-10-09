// src/Flashcard.tsx — a word asked as a flashcard (Review, once the word is strong enough: data/schedule.ts modeFor): the
// dictionary form large with the Hold to hear bar, a Show button that reveals the meaning (and the picture), then
// 'I knew it' / 'Not yet', which grade the answer like a right or a wrong tap on a Quick test question.
import { useState } from 'react';
import type { Question } from './data/quiz';
import { KNEW_IT } from './review/kinds';
import { SelfGrade } from './ui/SelfGrade';
import { HoldToHear } from './HoldToHear';
import { WordPicture } from './WordPicture';

interface Props {
  question: Question;
  /** KNEW_IT or NOT_YET once he has graded it, or null */
  picked: string | null;
  onPick: (grade: string) => void;
}

export function Flashcard({ question, picked, onPick }: Props) {
  const [shown, setShown] = useState(false);
  const graded = picked !== null;
  return (
    <>
      <div className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-4">
          {shown ? <WordPicture lemma={question.lemma} size={80} testId="picture" /> : null}
          {/* always the dictionary form, never the form the chapter has */}
          <p data-testid="prompt" data-lemma={question.lemma} lang="grc" className="min-w-0 break-words font-greek text-5xl">
            {question.lemma}
          </p>
        </div>
        <p data-testid="flash-gloss" className="mt-3 min-h-8 text-2xl">
          {shown ? question.gloss : ''}
        </p>
      </div>
      <div className="mt-4">
        <HoldToHear text={question.lemma} />
      </div>
      <SelfGrade shown={shown} onShow={() => setShown(true)} picked={picked} onPick={onPick} />
      <p data-testid="feedback" role="status" className="mt-4 min-h-12 text-center text-lg">
        {!graded ? '' : picked === KNEW_IT ? 'Right.' : 'It comes back tomorrow.'}
      </p>
    </>
  );
}
