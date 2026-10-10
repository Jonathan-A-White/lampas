// src/DueBadge.tsx — the 'Due 9' chip in the Reader's row under the header (src/ReaderChips.tsx): how many items are due on the back-off
// schedule; it opens Review. Not drawn at 0. Its accessible name is the old strip's text, 'Due: 9'.
import { navigate } from './nav/route';
import { CHIP, CHIP_ACCENT } from './chipStyle';

export function DueChip({ due }: { due: number | undefined }) {
  if (!due) return null;
  return (
    <button type="button" aria-label={`Due: ${due}`} onClick={() => navigate('review')} className={`${CHIP} ${CHIP_ACCENT}`}>
      Due {due}
    </button>
  );
}
