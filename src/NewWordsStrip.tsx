// src/NewWordsStrip.tsx — the 'New 3' chip in the Reader's row under the header (src/ReaderChips.tsx): how many new words the chapter has for him today;
// a tap opens the teach sheet (src/TeachSheet.tsx). Not drawn at 0. Its accessible name is 'New 3 words' (it holds the visible text, as WCAG 2.5.3 asks, mw-cwf538.2).
import { CHIP, CHIP_ACCENT } from './chipStyle';

export function NewWordsChip({ count, onOpen }: { count: number; onOpen: () => void }) {
  if (count <= 0) return null;
  return (
    <button type="button" data-testid="new-words" aria-label={`New ${count} words`} onClick={onOpen} className={`${CHIP} ${CHIP_ACCENT}`}>
      New {count}
    </button>
  );
}
