// src/reader/VariantSheet.tsx — the sheet a tap on a variant's brace opens (mw-9ji6ek0.6, src/reader/VariantBrace.tsx): the text's own reading and the other reading(s) of the
// unit, each in Greek and in English, the witness of each spelled out one line apiece (src/reader/witness.ts), and Ask the tutor, which opens the verse's talk as the Verse view's
// Ask does (the tutor's own variant story comes later). Done, Back, Escape, a swipe down or a tap outside close it. A portal: the brace is in the Reader's scrolling text.
import { createPortal } from 'react-dom';
import { GREEK_LANG } from '../script/greekLang';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import type { ShownUnit } from './variants';
import { readingsOf } from './witness';

const LEFT_OUT = 'left out';

function Reading({ label, greek, english, lines }: { label: string; greek: string; english: string; lines?: string[] }) {
  return (
    <section data-variant-reading="" className="border-t border-line py-3">
      <h3 className="pb-1 text-base font-medium text-muted">{label}</h3>
      <p data-reading-greek="" {...(greek ? GREEK_LANG : { lang: 'en' })} className={greek ? 'font-greek text-2xl text-fg' : 'text-lg italic text-muted'}>
        {greek || LEFT_OUT}
      </p>
      <p data-reading-english="" lang="en" className={english ? 'text-lg text-fg' : 'text-lg italic text-muted'}>
        {english || LEFT_OUT}
      </p>
      {lines?.map((line) => (
        <p key={line} data-witness-line="" className="pt-1 text-base text-muted">
          {line}
        </p>
      ))}
    </section>
  );
}

function Sheet({ shown, reference, onClose, onAsk }: { shown: ShownUnit; reference: string; onClose: () => void; onAsk?: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const others = readingsOf(shown);
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Variant reading"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 className="min-w-0 flex-1 title-wrap text-xl font-semibold">{reference}: where the manuscripts differ</h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Reading label="The text reads" greek={shown.unit.base} english={shown.unit.english.base} />
          {others.map((r, i) => (
            <Reading key={i} label={others.length > 1 ? `Other reading ${i + 1}` : 'Other reading'} greek={r.greek} english={r.english} lines={r.lines} />
          ))}
        </div>
        {onAsk ? (
          <button type="button" onClick={onAsk} className="mt-2 min-h-12 w-full rounded-xl border border-line px-5 text-lg font-medium active:bg-line">
            Ask the tutor
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** The sheet, drawn over everything. `onAsk` is left out when the tutor is not allowed (no licence): the button is then not drawn. */
export function VariantSheet(props: { shown: ShownUnit; reference: string; onClose: () => void; onAsk?: () => void }) {
  return createPortal(<Sheet {...props} />, document.body);
}
