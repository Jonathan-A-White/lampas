// src/reader/EnglishOnlySheet.tsx — the small sheet a tap on a Septuagint English word with no Greek word of its own opens (mw-u2w5klk.349.67, the Governor's report 2026-11-20: Genesis 1:1 'the' in the Weave
// opened the Verse view). It names the word and says why there is no Greek word to open: the English adds it ('Added in English: the Greek has no word here') or the aligner has not matched it yet; for an added word
// it offers the nearest Greek word's sheet. Done, Back, Escape, a swipe down or a tap outside close it. A portal: the word is in the Reader's scrolling text.
import { createPortal } from 'react-dom';
import type { GreekWord } from '../data/chapter';
import { GREEK_LANG } from '../script/greekLang';
import { focusOnMount } from '../ui/focus';
import { DialogAskTutor } from '../AskTutor';
import { useSheetTalk } from '../tutor/sheetTalk';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { ENGLISH_ADDED, ENGLISH_NOT_MATCHED, withoutMarks, type NearGreek } from './septuagint';

/** What the sheet is about: the English word (or chunk) tapped, why it has no Greek word, and the Greek word nearest it. */
export interface EnglishOnly {
  word: string;
  kind: 'added' | 'unmatched';
  near?: NearGreek;
}

function Sheet({ tap, onClose, onGreek }: { tap: EnglishOnly; onClose: () => void; onGreek: (word: GreekWord) => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const near = tap.near;
  const line = tap.kind === 'added' ? ENGLISH_ADDED : ENGLISH_NOT_MATCHED;
  // z-30, above the Talk sheet (z-10): the ? asks about the English word the sheet shows, in a Talk drawn inside this layer so it stands in front (as Rp2026Sheet does)
  const ask = useSheetTalk({
    name: tap.word,
    facts: [
      { label: 'English word', value: tap.word },
      { label: 'What the sheet says', value: line },
      ...(near ? [{ label: near.before ? 'Nearest Greek word before it' : 'Next Greek word', value: withoutMarks(near.word.t) }] : []),
    ],
    suggestions: tap.kind === 'added' ? ['Why does the English add this word?'] : ['Which Greek word does this English word stand for?'],
  });
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tap.word}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 lang="en" className="min-w-0 flex-1 title-wrap text-xl font-semibold">
              {tap.word}
            </h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p data-english-only={tap.kind} className="pb-3 text-base">
            {line}
          </p>
          {near ? (
            <button type="button" onClick={() => onGreek(near.word)} className="block min-h-11 w-full border-t border-line py-2 text-start text-base font-medium leading-8 text-accent">
              <span>{near.before ? 'Previous Greek word:' : 'Next Greek word:'}</span>{' '}
              <span {...GREEK_LANG} className="font-greek text-xl">
                {withoutMarks(near.word.t)}
              </span>
            </button>
          ) : null}
        </div>
      </div>
      <DialogAskTutor {...ask} />
    </div>
  );
}

/** The sheet for a tapped English word with no Greek word, drawn over everything; `onGreek` opens the nearest Greek word's own sheet (the caller closes this one). */
export function EnglishOnlySheet(props: { tap: EnglishOnly; onClose: () => void; onGreek: (word: GreekWord) => void }) {
  return createPortal(<Sheet {...props} />, document.body);
}
