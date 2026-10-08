// src/Flashcard.tsx — a word asked as a flashcard (Review, once the word is strong enough: data/schedule.ts modeFor): the
// dictionary form large with the Hold to hear bar, a Show button that reveals the meaning (and the picture), then
// 'I knew it' / 'Not yet', which grade the answer like a right or a wrong tap on a Quick test question.
import { useState } from 'react';
import type { Question } from './data/quiz';
import { KNEW_IT, NOT_YET } from './review/kinds';
import { HoldToHear } from './HoldToHear';
import { WordPicture } from './WordPicture';

interface Props {
  question: Question;
  /** KNEW_IT or NOT_YET once he has graded it, or null */
  picked: string | null;
  onPick: (grade: string) => void;
}

const GRADE_BASE = 'min-h-14 rounded-xl border px-4 py-3 text-lg font-medium disabled:opacity-100';

export function Flashcard({ question, picked, onPick }: Props) {
  const [shown, setShown] = useState(false);
  const graded = picked !== null;
  const grades = [
    { label: KNEW_IT, look: 'border-good bg-good/20' },
    { label: NOT_YET, look: 'border-bad bg-bad/20' },
  ];
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
      {!shown ? (
        <button type="button" onClick={() => setShown(true)} className="mt-4 min-h-14 w-full rounded-xl border border-line bg-surface text-lg font-medium">
          Show
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {grades.map(({ label, look }) => (
            <button
              key={label}
              type="button"
              disabled={graded}
              data-result={picked === label ? (label === KNEW_IT ? 'right' : 'wrong') : undefined}
              onClick={() => onPick(label)}
              className={`${GRADE_BASE} ${picked === null || picked === label ? look : 'border-line bg-surface text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <p data-testid="feedback" role="status" className="mt-4 min-h-12 text-center text-lg">
        {!graded ? '' : picked === KNEW_IT ? 'Right.' : 'It comes back tomorrow.'}
      </p>
    </>
  );
}
