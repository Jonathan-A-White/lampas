// src/ui/SelfGrade.tsx — the end of a flashcard: a Show button that reveals the answer, then 'I knew it' / 'Not yet', which grade it like a right
// or a wrong tap on a question. The word flashcard (src/Flashcard.tsx) and the grammar card (src/GrammarCard.tsx) share it.
import { KNEW_IT, NOT_YET } from '../review/kinds';

const GRADE_BASE = 'min-h-14 rounded-xl border px-4 py-3 text-lg font-medium disabled:opacity-100';

interface Props {
  shown: boolean;
  onShow: () => void;
  /** KNEW_IT or NOT_YET once he has graded it, or null */
  picked: string | null;
  onPick: (grade: string) => void;
}

export function SelfGrade({ shown, onShow, picked, onPick }: Props) {
  const graded = picked !== null;
  const grades = [
    { label: KNEW_IT, look: 'border-good bg-good/20' },
    { label: NOT_YET, look: 'border-bad bg-bad/20' },
  ];
  if (!shown) {
    return (
      <button type="button" onClick={onShow} className="mt-4 min-h-14 w-full rounded-xl border border-line bg-surface text-lg font-medium">
        Show
      </button>
    );
  }
  return (
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
  );
}
