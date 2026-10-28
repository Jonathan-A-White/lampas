// src/reader/VariantChip.tsx — the variants chip of the Reader's top bars (mw-9ji6ek0.5), in the chips row under English | Weave | Greek, after its chips and before
// the count of woven words (src/ReaderChips.tsx), drawn only on a chapter that has variants: '⁑ 3', how many units the filter shows (src/reader/variants.ts), dim while
// Variants is Off. It is not in the header's own line: at 390 px that line is full (the title at its smallest, the switch, Play and the gear), and a second line
// would cost a split-screen window its text (tests/e2e/split-screen-header.spec.ts). A tap turns Variants Off, or On to the value it had last ('Those that change
// the English' the first time, repositories toggleVariants); a long press opens the filter sheet (src/reader/VariantFilterSheet.tsx). One control for all three views.
import { useState } from 'react';
import { toggleVariants } from '../data/repositories';
import { CHIP, CHIP_ACCENT, CHIP_PLAIN } from '../chipStyle';
import { NO_SELECT, useLongPress } from '../ui/longPress';
import { VariantFilterSheet } from './VariantFilterSheet';

export function VariantChip({ count, on }: { count: number; on: boolean }) {
  const [filtering, setFiltering] = useState(false);
  const press = useLongPress(() => void toggleVariants(), () => setFiltering(true));
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={`Variants, ${count} shown`}
        {...press}
        data-testid="variants-chip"
        className={`${CHIP} ${NO_SELECT} min-w-11 justify-center ${on ? CHIP_ACCENT : `${CHIP_PLAIN} font-medium text-muted`}`}
      >
        <span aria-hidden="true">⁑</span> {count}
      </button>
      {filtering ? <VariantFilterSheet onClose={() => setFiltering(false)} /> : null}
    </>
  );
}
