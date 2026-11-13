// src/review/StudyLayer.tsx — a full-screen layer over the question or the end card, as a drill's own is: its title, a button back, and a box that scrolls (the 'Study this' row and the Study list open a table and
// how to remember a word in one; src/review/useStudyPlaces.tsx).
import type { ReactNode } from 'react';
import { DialogAskTutor } from '../AskTutor';
import { GreekRuns } from '../FacetLabel';
import { useSheetTalk, type SheetTalk } from '../tutor/sheetTalk';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';

/** A full-screen layer over the question, as a drill's own is: its title, a button back, and a box that scrolls. */
export function Layer({ title, back, talk, onClose, children }: { title: string; back: string; talk: SheetTalk; onClose: () => void; children: ReactNode }) {
  useSheetBack(onClose);
  const asked = useSheetTalk(talk);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-40 flex flex-col bg-surface text-left">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
        <h2 className="title-wrap min-w-0 flex-1 text-lg font-bold">
          <GreekRuns text={title} />
        </h2>
        <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
          {back}
        </button>
      </header>
      <div className="screen min-h-0 flex-1 px-4 pt-3">{children}</div>
      {/* the floating ? asks about this layer, its Talk in front of it: what it shows and the miss it was opened from (tests/unit/door-guard.test.ts) */}
      <DialogAskTutor {...asked} />
    </div>
  );
}
