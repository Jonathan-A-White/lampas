// src/reader/SeptuagintSources.tsx — the sheet a tap on a Septuagint chapter's header line opens (mw-u2w5klk.276): whose texts these are. Its words are SEPTUAGINT_SOURCES of src/tutor/credits.ts,
// the one place they are written. Done, Back, Escape, a swipe down or a tap outside close it. A portal: the line is in the Reader's header.
import { createPortal } from 'react-dom';
import { focusOnMount } from '../ui/focus';
import { useNoDoor } from '../tutor/door';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { SEPTUAGINT_SOURCES } from '../tutor/credits';
import { SEPTUAGINT_SHEET_TITLE } from './septuagint';

function Sheet({ onClose }: { onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  useNoDoor(); // z-30, above the Talk sheet (z-10): no ? over it (mw-5r3p30.953)
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={SEPTUAGINT_SHEET_TITLE}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 className="min-w-0 flex-1 title-wrap text-xl font-semibold">{SEPTUAGINT_SHEET_TITLE}</h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {SEPTUAGINT_SOURCES.map((source) => (
            <section key={source.label} data-lxx-source={source.label} className="border-t border-line py-3">
              <h3 className="text-base font-semibold text-muted">{source.label}</h3>
              <p lang="en" className="text-base">
                {source.text}
                {source.link ? (
                  <>
                    {' '}
                    <a href={source.link.href} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">
                      {source.link.name}
                    </a>
                  </>
                ) : null}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The sheet of whose texts a Septuagint chapter is, drawn over everything. */
export function SeptuagintSources({ onClose }: { onClose: () => void }) {
  return createPortal(<Sheet onClose={onClose} />, document.body);
}
