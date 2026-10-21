// src/ui/SelfGrade.tsx — the end of a flashcard: a Show button that reveals the answer, then 'I knew it' / 'Not yet', which grade it like a right
// or a wrong tap on a question. The word flashcard (src/Flashcard.tsx) and the grammar card (src/GrammarCard.tsx) share it. `Grades` is the pair of grade
// buttons alone, with their words given: the paradigm table's Drill asks 'Had it' / 'Missed' with it (mw-irpgqi.2, docs/paradigm-components.md).
import { KNEW_IT, NOT_YET } from '../review/kinds';
import { useSettled } from './settle';

const GRADE_BASE = 'min-h-14 rounded-xl border px-4 py-3 text-lg font-medium disabled:opacity-100';

interface Props {
  shown: boolean;
  onShow: () => void;
  /** KNEW_IT or NOT_YET once he has graded it, or null */
  picked: string | null;
  onPick: (grade: string) => void;
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

export function SelfGrade({ shown, onShow, picked, onPick }: Props) {
  // Show ignores the tap that comes in the moment after it appears: the second tap of a double tap on Next (src/ui/settle.ts); the grades the one after Show
  const settled = useSettled(shown);
  if (!shown) {
    return (
      <button type="button" onClick={() => settled() && onShow()} className="mt-4 min-h-14 w-full rounded-xl border border-line bg-surface text-lg font-medium">
        Show
      </button>
    );
  }
  return <Grades right={KNEW_IT} wrong={NOT_YET} picked={picked} onPick={onPick} settleKey={shown} />;
}
