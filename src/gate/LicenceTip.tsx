// src/gate/LicenceTip.tsx — the one quiet line at the foot of the Reader that tells a free reader what a licence adds (mw-8m9dyu.6). Not a dialog and no
// other nudge anywhere: it is drawn on a phone with no licence from its third visit (src/gate/licenceTip.ts), once ever. The close and 'Learn more' end it;
// 'Learn more' opens the Licence page as a Back step, so Back returns to the Reader where he was.
import { useEffect, useState } from 'react';
import { openLicence } from '../nav/route';
import { useLicence } from './licenceContext';
import { useHeldSpace } from '../ui/heldSpace';
import { endLicenceTip, licenceTipDue, markLicenceTipShown } from './licenceTip';

export const LICENCE_TIP_TEXT = 'Lampas is free to read. A licence adds a tutor you can ask about any word or verse, and Read it aloud.';

export function LicenceTip() {
  const licence = useLicence();
  // due is read as the Reader opens; the check's answer (licensed or not) arrives later, and only 'not-licensed' shows it (never while it is still 'checking')
  const [due] = useState(() => licenceTipDue());
  const [closed, setClosed] = useState(false);
  const shown = due && !closed && licence === 'not-licensed';
  // the tip's place stays empty for a moment after it goes, so a double tap on its × does not land on the Greek that slides into it (mw-8m9dyu.10)
  const held = useHeldSpace<HTMLElement>();
  useEffect(() => {
    if (shown) markLicenceTipShown();
  }, [shown]);
  if (!shown) return held.space;
  const end = () => {
    held.hold();
    endLicenceTip();
    setClosed(true);
  };
  return (
    <aside
      ref={held.ref}
      role="note"
      aria-label="About a licence"
      data-licence-tip
      className="flex shrink-0 items-start gap-1 border-t border-line bg-surface pt-1 pl-4 pr-1 pb-[calc(0.25rem+var(--lp-bar-inset))] text-base text-muted"
    >
      <div className="min-w-0 flex-1 py-2">
        <p className="leading-snug">{LICENCE_TIP_TEXT}</p>
        <button
          type="button"
          onClick={() => {
            end();
            openLicence('reader');
          }}
          className="-ml-1 min-h-12 px-1 font-medium text-accent underline"
        >
          Learn more
        </button>
      </div>
      <button type="button" aria-label="Close" onClick={end} className="min-h-12 min-w-12 shrink-0 rounded-lg text-2xl leading-none">
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}
