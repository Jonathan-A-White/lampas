// src/GrammarCard.tsx — one grammar question in Review (mw-hqd5bz.6): what is asked, the Greek form large, Hold to hear for a letter or a word,
// then the choices. Multiple choice while the idea is weak: four endings, glyphs or syllables to tap, or the words of a verse as buttons
// (tap the form) that wrap; a flashcard once it is strong: the prompt and the form, Show reveals the answer, then I knew it / Not yet.
import { useState } from 'react';
import type { GrammarQuestion } from './data/grammar/questions';
import type { QuestionMode } from './data/schedule';
import { KNEW_IT } from './review/kinds';
import { HoldToHear } from './HoldToHear';
import { useSettled } from './ui/settle';
import { SelfGrade } from './ui/SelfGrade';

const LOOK = {
  idle: 'border-line bg-surface',
  right: 'border-good bg-good/20 font-medium',
  wrong: 'border-bad bg-bad/20 font-medium',
  other: 'border-line bg-surface text-muted',
};

const GREEK = /[Ͱ-Ͽἀ-῿]/;

interface Props {
  question: GrammarQuestion;
  mode: QuestionMode;
  /** what he tapped (an option, or KNEW_IT / NOT_YET on a flashcard), or null while he has not answered */
  picked: string | null;
  onPick: (option: string) => void;
}

/** What Show reveals: the whole form for an ending, else the right answer. */
const answerOf = (q: GrammarQuestion): string => (q.kind === 'ending' && q.form ? q.form.replace('_', q.right) : q.right);

function Heading({ question, mode }: { question: GrammarQuestion; mode: QuestionMode }) {
  return (
    <>
      <div className="text-center">
        <p data-testid="grammar-prompt" data-idea={question.ideaId} data-kind={question.kind} data-mode={mode} className="text-xl font-medium">
          {question.prompt}
        </p>
        {question.form ? (
          <p data-testid="grammar-form" lang="grc" className="mt-3 min-w-0 break-words font-greek text-5xl">
            {question.form}
          </p>
        ) : null}
        <p data-testid="grammar-ref" className="mt-1 min-h-6 text-base text-muted">
          {question.ref ?? ''}
        </p>
      </div>
      {question.say ? (
        <div className="mt-4">
          <HoldToHear text={question.say} />
        </div>
      ) : null}
    </>
  );
}

function Flash({ question, picked, onPick }: Omit<Props, 'mode'>) {
  const [shown, setShown] = useState(false);
  const graded = picked !== null;
  return (
    <>
      <Heading question={question} mode="flashcard" />
      {question.kind === 'tap-form' ? (
        <p data-testid="verse-words" lang="grc" className="mt-4 text-center font-greek text-2xl">
          {question.options.map((word, i) => (
            <span key={i} className={shown && word === question.right ? 'rounded bg-good/20 px-1 font-medium' : 'px-1'}>
              {word}{' '}
            </span>
          ))}
        </p>
      ) : null}
      <p data-testid="grammar-answer" lang={GREEK.test(question.right) ? 'grc' : undefined} className="mt-3 min-h-10 text-center font-greek text-3xl">
        {shown ? answerOf(question) : ''}
      </p>
      <SelfGrade shown={shown} onShow={() => setShown(true)} picked={picked} onPick={onPick} />
      <p data-testid="feedback" role="status" className="mt-4 min-h-12 text-center text-lg">
        {!graded ? '' : picked === KNEW_IT ? 'Right.' : 'It comes back tomorrow.'}
      </p>
    </>
  );
}

function Choice({ question, picked, onPick }: Omit<Props, 'mode'>) {
  // the place he tapped: a verse can hold the same word twice, and only the one he tapped is wrong
  const [at, setAt] = useState<number | null>(null);
  const answered = picked !== null;
  // a tap in the moment after the card appears is the second tap of a double tap on Next (src/ui/settle.ts)
  const settled = useSettled();
  const tapForm = question.kind === 'tap-form';
  const lookOf = (option: string, i: number): keyof typeof LOOK => {
    if (!answered) return 'idle';
    if (option === question.right) return 'right';
    return i === at ? 'wrong' : 'other';
  };
  const buttons = question.options.map((option, i) => {
    const look = lookOf(option, i);
    const greek = GREEK.test(option);
    return (
      <button
        key={i}
        type="button"
        data-option
        data-result={look === 'right' || look === 'wrong' ? look : undefined}
        lang={greek ? 'grc' : undefined}
        disabled={answered}
        onClick={() => {
          if (!settled()) return;
          setAt(i);
          onPick(option);
        }}
        className={`${LOOK[look]} rounded-xl border disabled:opacity-100 ${
          tapForm ? 'min-h-12 min-w-12 px-3 font-greek text-2xl' : `min-h-14 w-full px-4 py-3 text-lg ${greek ? 'font-greek text-3xl' : 'text-left'}`
        }`}
      >
        {option}
      </button>
    );
  });
  const short = !tapForm && question.options.every((o) => o.length <= 6);
  return (
    <>
      <Heading question={question} mode="choice" />
      {tapForm ? (
        <div data-testid="verse-words" className="mt-4 flex flex-wrap justify-center gap-2">
          {buttons}
        </div>
      ) : (
        <div className={`mt-4 ${short ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>{buttons}</div>
      )}
      <p data-testid="feedback" role="status" className="mt-4 min-h-12 text-center text-lg">
        {!answered ? '' : picked === question.right ? 'Right.' : `Not quite. ${tapForm ? 'The word is' : 'It is'} ${answerOf(question)}.`}
      </p>
    </>
  );
}

export function GrammarCard({ question, mode, picked, onPick }: Props) {
  return mode === 'flashcard' ? <Flash question={question} picked={picked} onPick={onPick} /> : <Choice question={question} picked={picked} onPick={onPick} />;
}
