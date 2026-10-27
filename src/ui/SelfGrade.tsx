// src/ui/SelfGrade.tsx — the end of a flashcard: a Show button that reveals the answer, then 'I knew it' / 'Not yet', which grade it like a right
// or a wrong tap on a question. The word flashcard (src/Flashcard.tsx) and the grammar card (src/GrammarCard.tsx) share it. `Grades` is the pair of grade
// buttons alone, with their words given: the paradigm table's Drill asks 'Had it' / 'Missed' with it (mw-irpgqi.2, docs/paradigm-components.md). `WordGrades` is a word's three
// ('Know it well', 'Kind of', 'Don't know', mw-5r3p30.787): the word flashcard asks them in place of the two, and Review's multiple choice shows them under 'Right.'.
import { KNEW_IT, NOT_YET, WORD_GRADES } from '../review/kinds';
import { useEffect, useRef } from 'react';
import { revealAboveStack } from './reveal';
import { useSettled } from './settle';

const GRADE_BASE = 'min-h-14 rounded-xl border px-4 py-3 text-lg font-medium disabled:opacity-100';

interface Props {
  shown: boolean;
  onShow: () => void;
  /** KNEW_IT or NOT_YET once he has graded it, or null */
  picked: string | null;
  onPick: (grade: string) => void;
  /** three buttons ('Know it well', 'Kind of', 'Don't know': WordGrades) in place of the two; a word's flashcard asks them */
  threeWay?: boolean;
}

interface GradesProps {
  /** the words on the two buttons: the good one ('I knew it', 'Had it') and the bad one ('Not yet', 'Missed') */
  right: string;
  wrong: string;
  /** `right` or `wrong` once he has graded it, or null */
  picked: string | null;
  onPick: (grade: string) => void;
  /** the buttons ignore a tap in the moment after `settleKey` changes (they have just appeared under the tap that showed them, src/ui/settle.ts) */
  settleKey?: unknown;
  className?: string;
}

/** The two grade buttons: the good one green, the bad one red; once picked, the other goes quiet. */
export function Grades({ right, wrong, picked, onPick, settleKey = 0, className = 'mt-4' }: GradesProps) {
  const graded = picked !== null;
  const settled = useSettled(settleKey);
  const grades = [
    { label: right, look: 'border-good bg-good/20', result: 'right' },
    { label: wrong, look: 'border-bad bg-bad/20', result: 'wrong' },
  ];
  return (
    <div className={`${className} grid grid-cols-2 gap-3`}>
      {grades.map(({ label, look, result }) => (
        <button
          key={label}
          type="button"
          disabled={graded}
          data-result={picked === label ? result : undefined}
          onClick={() => settled() && onPick(label)}
          className={`${GRADE_BASE} ${picked === null || picked === label ? look : 'border-line bg-surface text-muted'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const WORD_GRADE_BASE = 'min-h-14 rounded-xl border px-2 py-2 text-base font-medium leading-tight disabled:opacity-100';
const WORD_GRADE_LOOK = { well: 'border-good bg-good/20', some: 'border-accent bg-accent/10', not: 'border-bad bg-bad/20' };

interface WordGradesProps {
  /** the label of the one he tapped (WORD_GRADES), or null while he has not */
  picked: string | null;
  onPick: (label: string) => void;
  /** the buttons ignore a tap in the moment after `settleKey` changes (they have just appeared under the tap that showed them, src/ui/settle.ts) */
  settleKey?: unknown;
  className?: string;
}

/** The three grade buttons of a word (mw-5r3p30.787): in one row, each at least 56 px tall; once picked, the other two go quiet. */
export function WordGrades({ picked, onPick, settleKey = 0, className = 'mt-4' }: WordGradesProps) {
  const graded = picked !== null;
  const settled = useSettled(settleKey);
  // the buttons come in under the options, where the Next bar that a pick brings may cover them: they scroll into view above it
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    revealAboveStack(row.current);
  }, []);
  return (
    <div ref={row} data-testid="word-grades" className={`${className} grid grid-cols-3 gap-2`}>
      {WORD_GRADES.map(({ label, grade }) => (
        <button
          key={label}
          type="button"
          disabled={graded}
          data-grade={grade}
          data-result={picked === label ? (grade === 'not' ? 'wrong' : 'right') : undefined}
          onClick={() => settled() && onPick(label)}
          className={`${WORD_GRADE_BASE} ${picked === null || picked === label ? WORD_GRADE_LOOK[grade] : 'border-line bg-surface text-muted'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SelfGrade({ shown, onShow, picked, onPick, threeWay }: Props) {
  // Show ignores the tap that comes in the moment after it appears: the second tap of a double tap on Next (src/ui/settle.ts); the grades the one after Show
  const settled = useSettled(shown);
  if (!shown) {
    return (
      <button type="button" onClick={() => settled() && onShow()} className="mt-4 min-h-14 w-full rounded-xl border border-line bg-surface text-lg font-medium">
        Show
      </button>
    );
  }
  if (threeWay) return <WordGrades picked={picked} onPick={onPick} settleKey={shown} />;
  return <Grades right={KNEW_IT} wrong={NOT_YET} picked={picked} onPick={onPick} settleKey={shown} />;
}
