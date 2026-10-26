// src/ReaderChips.tsx — the Reader's one slim row under the header (mw-5r3p30.119): Today, Goal, Tip and New words as compact chips, so the reading
// text starts high. The row is one line, 40 px, and scrolls sideways if the chips outgrow the phone; a chip with nothing to show is not drawn. Each chip does what its strip did and keeps the strip's text as its accessible name.
// The Today chip (src/today/TodayChip.tsx, mw-1fwagb.6) replaced the Due and Plan chips: 'Today · 2 of 6' with Tick boxes On, 'Today' with them Off, and a tap opens Today, where Review and
// the reading plan's chapter now are. It is drawn while any Daily piece is On (all are to start), so the row is there then; with every piece Off it has no chip, and a reader with no Greek activity
// has no Goal or Tip chip beside it (the 'New' words chip is the chapter's own and was always drawn).
// The count of words woven into Greek ('<n> words in Greek', a status, not a control) sits at the row's right end. A chapter being read aloud
// hides the chips, as it hid the strips; the count stays.
import type { SourceLanguage } from './data/chapter';
import { GoalChip } from './GoalStrip';
import { NewWordsChip } from './NewWordsStrip';
import { TipChip } from './tips/TipCard';
import { useOpenTip } from './tips/useOpenTip';
import { TodayChip } from './today/TodayChip';
import { useGoalProgress } from './useGoalProgress';

export function ReaderChips({
  hidden,
  newWords,
  onTeach,
  tipOpen,
  onTip,
  wovenCount,
  source = 'grc',
}: {
  hidden: boolean;
  newWords: number;
  onTeach: () => void;
  tipOpen: boolean;
  onTip: () => void;
  /** words shown in Greek by the weave, or null when the text is not woven */
  wovenCount: number | null;
  /** the language the woven words are in: 'Greek', or 'Hebrew' on an Old Testament chapter */
  source?: SourceLanguage;
}) {
  const goal = useGoalProgress();
  const tip = useOpenTip();
  const any = !hidden;
  if (!any && wovenCount === null) return null;
  return (
    <div
      data-testid="reader-chips"
      className="flex h-10 shrink-0 items-stretch gap-1.5 overflow-x-auto overflow-y-hidden border-b border-line px-2 [scrollbar-width:none]"
    >
      {hidden ? null : (
        <>
          <TodayChip />
          <GoalChip progress={goal} />
          <TipChip tip={tip} open={tipOpen} onToggle={onTip} />
          <NewWordsChip count={newWords} onOpen={onTeach} />
        </>
      )}
      {wovenCount === null ? null : (
        <p data-testid="weave-count" className="ml-auto flex shrink-0 items-center whitespace-nowrap pl-2 text-sm text-muted">
          {wovenCount} {wovenCount === 1 ? 'word' : 'words'} in {source === 'hbo' ? 'Hebrew' : 'Greek'}
        </p>
      )}
    </div>
  );
}
