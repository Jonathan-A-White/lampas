// src/GrammarCard.tsx — one grammar question in Review (mw-hqd5bz.6): what is asked, the Greek form large, Tap to hear for a letter or a word,
// then the choices. Multiple choice while the idea is weak: four endings, glyphs or syllables to tap, or the words of a verse as buttons
// (tap the form) that wrap; who does it, what is done, what it is done to (kind 'roles', mw-emk3xt.3): the verse's words, the same buttons; what a chunk or clause says (kind 'meaning'): the Greek large with Tap to hear, four English chunks;
// a full parsing (kind 'parse', mw-emk3xt.3): the word large and the Parsing drill's steps one after the other, '2 of 5: tense', right only when every step is, never a flashcard; a flashcard once it is strong: the prompt and the form, Show reveals the answer, then I knew it / Not yet.
import { useState } from 'react';
import type { ParseStep } from './data/drill';
import type { GrammarQuestion } from './data/grammar/questions';
import type { QuestionMode } from './data/schedule';
import { hintLine } from './data/grammar/hint';
import { GreekRuns } from './FacetLabel';
import { KNEW_IT, NOT_PARSED } from './review/kinds';
import { TapToHear } from './TapToHear';
import { useSettled } from './ui/settle';
import { SelfGrade } from './ui/SelfGrade';

const LOOK = {
  idle: 'border-line bg-surface',
  right: 'border-good bg-good/20 font-medium',
  wrong: 'border-bad bg-bad/20 font-medium',
  other: 'border-line bg-surface text-muted',
  // a Hint took it away: struck through and faded, so it plainly is not in play (on the dark theme muted text alone looked unchanged)
  taken: 'border-line bg-surface text-muted line-through opacity-40',
};

const GREEK = /[Ͱ-Ͽἀ-῿]/;

/** The kinds that show the words of a verse as buttons to tap. */
const showsVerse = (q: GrammarQuestion): boolean => q.kind === 'tap-form' || q.kind === 'roles';

interface Props {
  question: GrammarQuestion;
  mode: QuestionMode;
  /** what he tapped (an option, or KNEW_IT / NOT_YET on a flashcard), or null while he has not answered */
  picked: string | null;
  onPick: (option: string) => void;
  /** options (by place) a Hint took away: drawn struck through and faded, not to be tapped, with a line under the question saying how many (Drill it, src/DrillItScreen.tsx) */
  taken?: ReadonlySet<number>;
  /** in a short window (sideways) the question stands at the left and the answers at the right, with tighter buttons (Drill it) */
  sideBySide?: boolean;
  /** after an ending is answered, 'See the table' opens the table that holds it (Review, mw-svw421.5); without it the card has no such button */
  onSeeTable?: (table: string) => void;
  /** a full parsing: one of its steps was answered (Review writes it to the Parsing drill's answers); `onPick` comes after the last step, or the first wrong one */
  onStep?: (step: ParseStep, right: boolean) => void;
}

const SEE_TABLE = 'mt-3 min-h-12 w-full rounded-xl border border-line px-4 text-lg font-medium text-accent active:bg-line';

/** 'See the table' under the answer of an ending (mw-svw421.5): the table the form is in, to look at now that he has been asked it. */
function SeeTable({ question, onSeeTable }: { question: GrammarQuestion; onSeeTable?: (table: string) => void }) {
  if (!onSeeTable || question.kind !== 'ending' || !question.table) return null;
  const table = question.table;
  return (
    <button type="button" data-testid="see-table" data-table={table} onClick={() => onSeeTable(table)} className={SEE_TABLE}>
      See the table
    </button>
  );
}

/** What Show reveals: the whole form for an ending, else the right answer. */
const answerOf = (q: GrammarQuestion): string => (q.kind === 'ending' && q.form ? q.form.replace('_', q.right) : q.right);

function Heading({ question, mode, hint }: { question: GrammarQuestion; mode: QuestionMode; hint?: string }) {
  return (
    <>
      <div className="text-center">
        <p data-testid="grammar-prompt" data-idea={question.ideaId} data-kind={question.kind} data-mode={mode} className="text-xl font-medium">
          {question.prompt}
        </p>
        {question.form ? (
          <p data-testid="grammar-form" lang="grc" className={`mt-3 min-w-0 break-words font-greek ${question.kind === 'meaning' && question.form.length > 16 ? 'text-4xl' : 'text-5xl'}`}>
            {question.form}
          </p>
        ) : null}
        <p data-testid="grammar-ref" className="mt-1 min-h-6 text-base text-muted">
          {question.ref ?? ''}
        </p>
        {hint ? (
          <p data-testid="hint-line" className="mt-1 text-base font-medium text-accent">
            {hint}
          </p>
        ) : null}
      </div>
      {question.say ? (
        <div className="mt-4">
          <TapToHear text={question.say} letter={question.kind === 'sound'} />
        </div>
      ) : null}
    </>
  );
}

function Flash({ question, picked, onPick, onSeeTable }: Omit<Props, 'mode'>) {
  const [shown, setShown] = useState(false);
  const graded = picked !== null;
  return (
    <>
      <Heading question={question} mode="flashcard" />
      {showsVerse(question) ? (
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
      {graded ? <SeeTable question={question} onSeeTable={onSeeTable} /> : null}
    </>
  );
}

function Choice({ question, picked, onPick, taken, sideBySide, onSeeTable }: Omit<Props, 'mode'>) {
  // the place he tapped: a verse can hold the same word twice, and only the one he tapped is wrong
  const [at, setAt] = useState<number | null>(null);
  const answered = picked !== null;
  // a tap in the moment after the card appears is the second tap of a double tap on Next (src/ui/settle.ts)
  const settled = useSettled();
  const tapForm = showsVerse(question);
  const lookOf = (option: string, i: number): keyof typeof LOOK => {
    if (taken?.has(i)) return 'taken';
    if (!answered) return 'idle';
    if (option === question.right) return 'right';
    return i === at ? 'wrong' : 'other';
  };
  const hint = taken && taken.size > 0 ? hintLine(taken.size) : undefined;
  const buttons = question.options.map((option, i) => {
    const look = lookOf(option, i);
    const greek = GREEK.test(option);
    return (
      <button
        key={i}
        type="button"
        data-option
        data-taken={look === 'taken' ? '' : undefined}
        data-result={look === 'right' || look === 'wrong' ? look : undefined}
        lang={greek ? 'grc' : undefined}
        disabled={answered || taken?.has(i)}
        onClick={() => {
          if (!settled()) return;
          setAt(i);
          onPick(option);
        }}
        className={`${LOOK[look]} rounded-xl border ${look === 'taken' ? 'disabled:opacity-40' : 'disabled:opacity-100'} ${
          tapForm
            ? 'min-h-12 min-w-12 px-3 font-greek text-2xl'
            : `${sideBySide ? 'min-h-14 short:min-h-12 short:py-1' : 'min-h-14 py-3'} w-full px-4 text-lg ${greek ? `font-greek ${sideBySide ? 'text-3xl short:text-2xl' : 'text-3xl'}` : 'text-left'}`
        }`}
      >
        {option}
      </button>
    );
  });
  const short = !tapForm && question.options.every((o) => o.length <= 6);
  const gap = sideBySide ? 'gap-3 short:gap-2' : 'gap-3';
  const stacked = sideBySide ? `flex flex-col ${gap}` : 'space-y-3';
  const answers = (
    <>
      {tapForm ? (
        <div data-testid="verse-words" className="mt-4 flex flex-wrap justify-center gap-2">
          {buttons}
        </div>
      ) : (
        <div className={`mt-4 ${sideBySide ? 'short:mt-0' : ''} ${short ? `grid grid-cols-2 ${gap}` : stacked}`}>{buttons}</div>
      )}
      <p data-testid="feedback" role="status" className={`mt-4 text-center text-lg ${sideBySide ? 'min-h-12 short:mt-1 short:min-h-8' : 'min-h-12'}`}>
        {!answered ? '' : picked === question.right ? 'Right.' : `Not quite. ${tapForm ? 'The word is' : 'It is'} ${answerOf(question)}.`}
      </p>
      {answered ? <SeeTable question={question} onSeeTable={onSeeTable} /> : null}
      {answered && picked !== question.right && question.rule ? (
        <p data-testid="rule-line" className="mt-1 text-center text-base">
          <GreekRuns text={question.rule} />
        </p>
      ) : null}
    </>
  );
  if (!sideBySide) {
    return (
      <>
        <Heading question={question} mode="choice" hint={hint} />
        {answers}
      </>
    );
  }
  return (
    <div className="short:grid short:grid-cols-2 short:items-start short:gap-x-6">
      <div>
        <Heading question={question} mode="choice" hint={hint} />
      </div>
      <div>{answers}</div>
    </div>
  );
}

const STEP_BASE = 'min-h-14 w-full rounded-xl border px-4 py-3 text-left text-lg disabled:opacity-100';

/**
 * A full parsing (mw-emk3xt.3): the word large, then the Parsing drill's steps one after the other ('2 of 5: tense', four choices each). A right step goes on to the next at once, with what is
 * right so far shown above the choices; the last step right, or the first wrong one, ends the question: `onPick` gets the parsing in plain words (the question's `right`) when every step
 * was right and NOT_PARSED when one was not, and the full parsing is shown in plain words with the wrong step marked. Each step answered goes to `onStep`.
 */
function Parse({ question, picked, onPick, onStep }: Pick<Props, 'question' | 'picked' | 'onPick' | 'onStep'>) {
  const steps = question.steps ?? [];
  const [at, setAt] = useState(0);
  // what he tapped at each step so far
  const [taps, setTaps] = useState<string[]>([]);
  const settled = useSettled(at);
  const answered = picked !== null;
  const step = steps[Math.min(at, steps.length - 1)];
  if (!step) return null;
  const wrong = answered && picked !== question.right;
  const lookOf = (option: string): keyof typeof LOOK => {
    if (!answered) return 'idle';
    if (option === step.right) return 'right';
    return option === taps[at] ? 'wrong' : 'other';
  };
  const tap = (option: string) => {
    if (answered || !settled()) return;
    const right = option === step.right;
    setTaps([...taps, option]);
    onStep?.(step, right);
    if (!right) onPick(NOT_PARSED);
    else if (at === steps.length - 1) onPick(question.right);
    else setAt(at + 1);
  };
  return (
    <>
      <Heading question={question} mode="choice" />
      <p data-testid="parse-step" data-step-id={step.id} className="mt-4 text-center text-lg font-medium">
        {at + 1} of {steps.length}: {step.label.toLowerCase()}
      </p>
      <p data-testid="parse-so-far" className="mt-1 min-h-6 text-center text-base text-muted">
        {steps.slice(0, at).map((s) => s.right).join(' · ')}
      </p>
      <div className="mt-2 space-y-3">
        {step.options.map((option, i) => {
          const look = lookOf(option);
          return (
            <button
              key={`${at}:${i}`}
              type="button"
              data-option
              data-result={look === 'right' || look === 'wrong' ? look : undefined}
              disabled={answered}
              onClick={() => tap(option)}
              className={`${LOOK[look]} ${STEP_BASE}`}
            >
              {option}
            </button>
          );
        })}
      </div>
      <p data-testid="feedback" role="status" className="mt-4 min-h-12 text-center text-lg">
        {!answered ? '' : wrong ? `Not quite. It is ${step.right}.` : 'Right.'}
      </p>
      {answered ? (
        <p data-testid="parse-full" className="mt-1 text-center text-base">
          <span className="text-muted">Full parsing: </span>
          {question.right}
        </p>
      ) : null}
    </>
  );
}

export function GrammarCard({ question, mode, picked, onPick, taken, sideBySide, onSeeTable, onStep }: Props) {
  if (question.kind === 'parse') return <Parse question={question} picked={picked} onPick={onPick} onStep={onStep} />;
  return mode === 'flashcard' ? (
    <Flash question={question} picked={picked} onPick={onPick} onSeeTable={onSeeTable} />
  ) : (
    <Choice question={question} picked={picked} onPick={onPick} taken={taken} sideBySide={sideBySide} onSeeTable={onSeeTable} />
  );
}
