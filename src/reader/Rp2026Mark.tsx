// src/reader/Rp2026Mark.tsx — the mark after English that Lampas wrote for a place the 2026 Greek changes (mw-9ji6ek0.33, Settings > Reading > English from the 2026 Greek): 'RP 2026',
// a 44 px target like a variant's siglum (src/reader/VariantBrace.tsx). A tap opens the sheet (src/reader/Rp2026Sheet.tsx) with the MSB's words, Lampas's, the Greek and where each comes from.
import { NO_SELECT } from '../ui/longPress';

export const RP_LABEL = 'RP 2026';

export function Rp2026Mark({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      data-rp2026-mark=""
      aria-label="English from the 2026 Greek: the MSB’s words and where they come from"
      onClick={onOpen}
      className={`inline-flex min-h-(--lp-tap) min-w-(--lp-tap) items-center justify-center rounded align-middle font-sans ${NO_SELECT} active:bg-line`}
    >
      <span aria-hidden="true" className="whitespace-nowrap rounded border border-accent/60 px-1 text-[0.75em] font-semibold leading-tight text-accent">
        {RP_LABEL}
      </span>
    </button>
  );
}
