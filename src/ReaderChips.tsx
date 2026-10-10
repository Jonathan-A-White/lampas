// src/ReaderChips.tsx — the Reader's one slim row under the header (mw-5r3p30.119): Due, Goal, Tip and New words as compact chips, so the reading
// text starts high. The row is one line, 40 px, and scrolls sideways if the chips outgrow the phone; a chip with nothing to show is not drawn,
// and with no chip (and no woven-words count) there is no row. Each chip does what its strip did and keeps the strip's text as its accessible name.
// The count of words woven into Greek ('<n> words in Greek', a status, not a control) sits at the row's right end. A chapter being read aloud
// hides the chips, as it hid the strips; the count stays.
import { useLiveQuery } from 'dexie-react-hooks';
import { countDue } from './data/repositories';
import { DueChip } from './DueBadge';
import { GoalChip } from './GoalStrip';
import { NewWordsChip } from './NewWordsStrip';
import { TipChip } from './tips/TipCard';
import { useOpenTip } from './tips/useOpenTip';
import { useGoalProgress } from './useGoalProgress';

export function ReaderChips({
  hidden,
  newWords,
  onTeach,
  tipOpen,
  onTip,
  wovenCount,
}: {
  hidden: boolean;
  newWords: number;
  onTeach: () => void;
  tipOpen: boolean;
  onTip: () => void;
  /** words shown in Greek by the weave, or null when the text is not woven */
  wovenCount: number | null;
}) {
  const due = useLiveQuery(() => countDue(), []);
  const goal = useGoalProgress();
  const tip = useOpenTip();
  const any = !hidden && (Boolean(due) || goal.status === 'ready' || tip !== undefined || newWords > 0);
  if (!any && wovenCount === null) return null;
  return (
    <div
      data-testid="reader-chips"
      className="flex h-10 shrink-0 items-stretch gap-1.5 overflow-x-auto overflow-y-hidden border-b border-line px-2 [scrollbar-width:none]"
    >
      {hidden ? null : (
        <>
          <DueChip due={due} />
          <GoalChip progress={goal} />
          <TipChip tip={tip} open={tipOpen} onToggle={onTip} />
          <NewWordsChip count={newWords} onOpen={onTeach} />
        </>
      )}
      {wovenCount === null ? null : (
        <p data-testid="weave-count" className="ml-auto flex shrink-0 items-center whitespace-nowrap pl-2 text-sm text-muted">
          {wovenCount} {wovenCount === 1 ? 'word' : 'words'} in Greek
        </p>
      )}
    </div>
  );
}
