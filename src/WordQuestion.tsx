// src/WordQuestion.tsx — one word question: the Greek word (with its picture and the form's verse), the Tap to hear bar,
// four glosses to tap, and the line that says right or wrong. The Quick test and Review both draw their questions with it.
import { useEffect } from 'react';
import type { Question } from './data/quiz';
import { TapToHear } from './TapToHear';
import { announce } from './ui/live';
import { useSettled } from './ui/settle';
import { WordPicture } from './WordPicture';
import { GREEK_LANG } from './script/greekLang';
import { ReferenceLink } from './markdown/ReferenceCard';

const OPTION_BASE = 'block min-h-14 w-full rounded-xl border px-4 py-3 text-left text-lg disabled:opacity-100';
const OPTION_LOOK = {
  idle: 'border-line bg-surface',
  right: 'border-good bg-good/20 font-medium',
  wrong: 'border-bad bg-bad/20 font-medium',
  other: 'border-line bg-surface text-muted',
};

interface Props {
  question: Question;
  /** the question's place in its round: it keys the options so a new question starts fresh */
  index: number;
  /** the gloss he tapped, or null while he has not answered */
  picked: string | null;
  onPick: (gloss: string) => void;
}

export function WordQuestion({ question, index, picked, onPick }: Props) {
  const answered = picked !== null;
  // a tap in the moment after the card appears is the second tap of a double tap on Next (src/ui/settle.ts)
  const settled = useSettled(index);
  const lookOf = (option: string): keyof typeof OPTION_LOOK => {
    if (!answered) return 'idle';
    if (option === question.gloss) return 'right';
    return option === picked ? 'wrong' : 'other';
  };
  // the line under the options is not a live region: the result is said once, when he answers, through the app's one (src/ui/live.ts)
  const feedback = !answered ? '' : picked === question.gloss ? 'Right.' : `Not quite. It means: ${question.gloss}`;
  useEffect(() => announce(feedback), [feedback]);
  return (
    <>
      <div className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <WordPicture lemma={question.lemma} size={80} testId="picture" />
          <p data-testid="prompt" data-lemma={question.lemma} {...GREEK_LANG} className="min-w-0 break-words font-greek text-5xl">
            {question.prompt}
          </p>
        </div>
        <p
          data-testid={answered && question.form ? 'chapter-form' : undefined}
          data-form={answered ? question.form : undefined}
          className="mt-1 min-h-11 text-sm text-muted"
        >
          {answered && question.form ? (
            <>
              in{' '}
              <ReferenceLink written={question.reference ?? ''} mark={question.form} className="inline-flex min-h-11 items-center px-1 text-accent underline underline-offset-4">
                {question.reference}
              </ReferenceLink>{' '}
              as <span {...GREEK_LANG}>{question.form}</span>
            </>
          ) : (
            ''
          )}
        </p>
      </div>
      <div className="mt-4">
        <TapToHear text={question.prompt} />
      </div>
      <ul className="mt-4 space-y-3">
        {question.options.map((option) => {
          const look = lookOf(option);
          return (
            <li key={`${index}:${option}`}>
              <button
                type="button"
                data-option
                data-result={look === 'right' || look === 'wrong' ? look : undefined}
                disabled={answered}
                onClick={() => settled() && onPick(option)}
                className={`${OPTION_BASE} ${OPTION_LOOK[look]}`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>
      <p data-testid="feedback" className="mt-4 min-h-12 text-center text-lg">
        {feedback}
      </p>
    </>
  );
}
