// src/reader/Rp2026Sheet.tsx — the sheet a tap on the 'RP 2026' mark opens (mw-9ji6ek0.33, src/reader/Rp2026Mark.tsx): at a place where the 2026 Greek changes what the English says, the MSB's
// English, Lampas's English and the Greek (the 2018 words and the 2026 words), each with where it comes from and its licence (data/rp2026-english.json's provenance). Done, Back, Escape, a swipe
// down or a tap outside close it. A portal: the mark is in the Reader's scrolling text.
import { createPortal } from 'react-dom';
import { rp2026EntryByKey, type Rp2026Entry } from '../data/rp2026English';
import { navigate } from '../nav/route';
import { GREEK_LANG } from '../script/greekLang';
import { focusOnMount } from '../ui/focus';
import { closeAllSheets, useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { SOURCE_LINK } from './englishSource';
import { RP_LABEL } from './Rp2026Mark';

/** One thing the sheet shows: its name, the words, and where they come from. */
function Part({ name, words, greek, source, licence }: { name: string; words: string; greek?: boolean; source: string; licence?: string }) {
  return (
    <section data-rp2026-part={name} className="border-t border-line py-3">
      <h3 className="text-base font-semibold text-muted">{name}</h3>
      <p {...(greek ? GREEK_LANG : { lang: 'en' })} className={`text-xl ${greek ? 'font-greek' : ''}`}>
        {words}
      </p>
      <p data-rp2026-source className="pt-1 text-sm text-muted">
        {source}
      </p>
      {licence ? (
        <p data-rp2026-licence className="text-sm text-muted">
          {licence}
        </p>
      ) : null}
    </section>
  );
}

function Sheet({ entry, onClose }: { entry: Rp2026Entry; onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const { provenance: p } = entry;
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${RP_LABEL}: English from the 2026 Greek`}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 className="min-w-0 flex-1 title-wrap text-xl font-semibold">
              {entry.ref}: {RP_LABEL}
            </h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p data-rp2026-note className="pb-3 text-base">
            {entry.note}
          </p>
          <Part name="The MSB’s English" words={entry.msb} source={p.msb} />
          <Part name="Lampas’s English" words={entry.lampas ?? ''} source={`${p.rendering?.kind ?? ''}: ${p.rendering?.model ?? ''}, ${p.rendering?.date ?? ''}`} />
          <Part name="The Greek, 2018" words={entry.from.join(' ')} source="Robinson-Pierpont 2018, the text the apparatus is of (byztxt v3.3.2); public domain" />
          <Part name="The Greek, 2026" words={entry.to.join(' ')} greek source={p.greek.source} licence={p.greek.licence} />
          <button
            type="button"
            onClick={() => {
              closeAllSheets();
              navigate('preface');
            }}
            className="flex min-h-11 items-center border-t border-line text-base font-medium text-accent underline"
          >
            {SOURCE_LINK}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The sheet for the entry filed under `entryKey`, drawn over everything; nothing for a key the data does not have. */
export function Rp2026Sheet({ entryKey, onClose }: { entryKey: string; onClose: () => void }) {
  const entry = rp2026EntryByKey(entryKey);
  return entry ? createPortal(<Sheet entry={entry} onClose={onClose} />, document.body) : null;
}
