// src/GoalStrip.tsx — the 'Goal 6/16' chip in the Reader's row under the header (mw-hqd5bz.10, src/ReaderChips.tsx): how many of the words his goal
// needs are solid. Its accessible name is the old strip's full text, 'Goal: 1 John 1:1, 6 of 16 words, 1 of 30 ideas'. Not drawn with no goal, or
// while the passage is still being counted; a tap opens the Goal screen.
import { goalText } from './data/goal';
import { navigate } from './nav/route';
import { CHIP, CHIP_PLAIN } from './chipStyle';
import type { GoalProgress } from './useGoalProgress';

export function GoalChip({ progress }: { progress: GoalProgress }) {
  if (progress.status !== 'ready') return null;
  const { words, grammar } = progress.progress;
  return (
    <button
      type="button"
      data-testid="goal-strip"
      aria-label={`Goal: ${goalText(progress.goal)}, ${words.solid} of ${words.total} words, ${grammar.solid} of ${grammar.total} ideas`}
      onClick={() => navigate('goal')}
      className={`${CHIP} ${CHIP_PLAIN}`}
    >
      Goal {words.solid}/{words.total}
    </button>
  );
}
