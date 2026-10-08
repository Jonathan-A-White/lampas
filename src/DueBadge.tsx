// src/DueBadge.tsx — 'Due: N' under the Reader's header: how many items are due on the back-off schedule; it opens Review.
// Not drawn at 0. It is a strip of its own because the header has no room for it at 360 px (the title already truncates).
import { useLiveQuery } from 'dexie-react-hooks';
import { countDue } from './data/repositories';
import { navigate } from './nav/route';

export function DueBadge() {
  const due = useLiveQuery(() => countDue(), []);
  if (!due) return null;
  return (
    <button
      type="button"
      onClick={() => navigate('review')}
      className="chrome-small min-h-12 w-full shrink-0 border-b border-line bg-accent/10 px-3 text-center font-semibold text-accent active:bg-line"
    >
      Due: {due}
    </button>
  );
}
