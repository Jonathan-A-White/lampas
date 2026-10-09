// src/GoalStrip.tsx — 'Goal: 1 John 1:1 · 12 of 31 words · 8 of 14 ideas' under the Reader's header, next to Due (mw-hqd5bz.10): how many of the words and
// grammar ideas his goal needs are solid. A strip of its own for the same reason as DueBadge (the header has no room at 360 px). Not drawn with no goal,
// or while the passage is still being counted; a tap opens the Goal screen.
import { goalText } from './data/goal';
import { navigate } from './nav/route';
import { useGoalProgress } from './useGoalProgress';

export function GoalStrip() {
  const progress = useGoalProgress();
  if (progress.status !== 'ready') return null;
  const { words, grammar } = progress.progress;
  return (
    <button
      type="button"
      data-testid="goal-strip"
      onClick={() => navigate('goal')}
      className="chrome-small min-h-12 w-full shrink-0 truncate border-b border-line bg-surface px-3 text-center font-semibold text-accent active:bg-line"
    >
      Goal: {goalText(progress.goal)} · {words.solid} of {words.total} words · {grammar.solid} of {grammar.total} ideas
    </button>
  );
}
