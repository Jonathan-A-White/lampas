// src/gate/LicenceTip.tsx — the one quiet line at the foot of the Reader that tells a free reader what a licence adds (mw-8m9dyu.6). Not a dialog and no
// other nudge anywhere: it is drawn on a phone with no licence from its third visit (src/gate/licenceTip.ts), once ever. The close and 'Learn more' end it;
// 'Learn more' opens the Licence page as a Back step, so Back returns to the Reader where he was. In a short window (a phone held sideways) it is one slim row, the
// sentence, Learn more and × side by side, with no inset band under it: sideways the phone's bar is at its side (mw-8m9dyu.11). On a slow licence check it arrives long after the
// chapter, under a thumb already reading: it slides in (src/index.css .lp-sheet-in) and for TIP_SETTLE_MS takes no tap, so a verse tapped near the foot
// as it appears is not turned into Learn more (mw-8m9dyu.13).
import { useCallback, useEffect, useRef, useState } from 'react';
import { openLicence } from '../nav/route';
import { useLicence } from './licenceContext';
import { useHeldSpace } from '../ui/heldSpace';
import { settle } from '../ui/settle';
import { endLicenceTip, licenceTipDue, markLicenceTipShown } from './licenceTip';

/** How long the tip ignores taps once it is on screen. Scaled to nothing where tests hold the settle seam (src/ui/settle.ts) at 0. PROVISIONAL */
export const TIP_SETTLE_MS = 500;

export const LICENCE_TIP_TEXT = 'Lampas is free to read. A licence adds a tutor you can ask about any word or verse, and one that listens to you read a verse aloud.';

export function LicenceTip() {
  const licence = useLicence();
  // due is read as the Reader opens; the check's answer (licensed or not) arrives later, and only 'not-licensed' shows it (never while it is still 'checking')
  const [due] = useState(() => licenceTipDue());
  const [closed, setClosed] = useState(false);
  const shown = due && !closed && licence === 'not-licensed';
  // the tip's place stays empty for a moment after it goes, so a double tap on its × does not land on the Greek that slides into it (mw-8m9dyu.10)
  const held = useHeldSpace();
  const since = useRef(0);
  useEffect(() => {
    if (!shown) return;
    since.current = performance.now();
    markLicenceTipShown();
  }, [shown]);
  const settled = useCallback(() => settle.ms <= 0 || performance.now() - since.current >= TIP_SETTLE_MS, []);
  if (!shown) return held.space;
  const end = (card: Element | null) => {
    held.hold(card);
    endLicenceTip();
    setClosed(true);
  };
  return (
    <aside
      role="note"
      aria-label="About a licence"
      data-licence-tip
      className="lp-sheet-in flex shrink-0 items-start gap-1 border-t border-line bg-surface pt-1 pl-4 pr-1 pb-[calc(0.25rem+var(--lp-bar-inset))] text-base text-muted short:items-center short:pt-0 short:pb-0 short:text-sm"
    >
      <div className="min-w-0 flex-1 py-2 short:flex short:items-center short:gap-2 short:py-0">
        <p className="leading-snug short:min-w-0 short:flex-1">{LICENCE_TIP_TEXT}</p>
        <button
          type="button"
          onClick={(e) => {
            if (!settled()) return;
            end(e.currentTarget.closest('aside'));
            openLicence('reader');
          }}
          className="-ml-1 min-h-12 px-1 font-medium text-accent underline short:ml-0 short:min-h-11 short:shrink-0 short:whitespace-nowrap"
        >
          Learn more
        </button>
      </div>
      <button type="button" aria-label="Close" onClick={(e) => settled() && end(e.currentTarget.closest('aside'))} className="min-h-12 min-w-12 shrink-0 rounded-lg text-2xl leading-none short:min-h-11 short:min-w-11">
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}
