// src/reader/split/SplitChooser.tsx — the sheet 'Beside Genesis 14' (mw-5r3p30.1130, docs/design/reader-split.md 'Opening and closing'): one row per text the chapter can be read beside, each with whose it is on a second line,
// and 'A map' last (with the chapter's maps counted) when the chapter has maps. The Verse view's Split opens it over the verse; the dock's name opens it again with the text it holds ticked, so a second text changes
// without leaving the split. Done, Back, Escape, a swipe down or a tap outside close it. A portal, above the Verse view and the dock.
import { createPortal } from 'react-dom';
import { DialogAskTutor } from '../../AskTutor';
import { useMaps } from '../../maps/useMaps';
import { useSheetTalk } from '../../tutor/sheetTalk';
import { focusOnMount } from '../../ui/focus';
import { useSheetBack } from '../../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../../ui/sheetDrag';
import { splitTextsFor, type SplitTextKey } from './splitTexts';
import { useSeptuagintShipped } from './useDockedText';

const ROW = 'flex min-h-11 w-full items-center gap-2 rounded-xl border border-line px-4 py-2 text-left active:bg-line';

function Sheet({ book, chapter, title, current, onChoose, onMap, onClose }: SplitChooserProps) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const shipped = useSeptuagintShipped(book, chapter);
  const maps = useMaps({ book, chapter });
  const texts = splitTextsFor(book, shipped === true);
  const label = `Beside ${title}`;
  // z-50, over the Talk sheet (z-10) and the Verse view: the ? asks about the texts offered, in a Talk drawn inside this layer so it stands in front
  const ask = useSheetTalk({
    name: label,
    facts: [
      { label: 'Passage', value: title },
      { label: 'Texts offered', value: texts.map((t) => t.label).join(', ') },
    ],
    suggestions: ['Which of these texts is the best one to compare this chapter with?'],
  });
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 className="min-w-0 flex-1 title-wrap text-xl font-semibold">{label}</h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2">
          {texts.map((text) => (
            <button key={text.key} type="button" data-split-text={text.key} aria-current={current === text.key ? 'true' : undefined} onClick={() => onChoose(text.key)} className={`${ROW} ${current === text.key ? 'bg-accent/15' : ''}`}>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-fg">{text.label}</span>
                <span className="block text-sm text-muted">{text.whose}</span>
              </span>
              {current === text.key ? <span aria-hidden="true" className="text-accent">✓</span> : null}
            </button>
          ))}
          {maps && maps.length > 0 ? (
            <button type="button" data-split-text="map" onClick={onMap} className={ROW}>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-fg">A map</span>
                <span className="block text-sm text-muted">{`Maps for ${title} · ${maps.length}`}</span>
              </span>
              <span aria-hidden="true" className="text-muted">›</span>
            </button>
          ) : null}
        </div>
      </div>
      <DialogAskTutor {...ask} />
    </div>
  );
}

export interface SplitChooserProps {
  /** Lampas's book code and chapter */
  book: string;
  chapter: number;
  /** the chapter as the sheet names it: 'Genesis 14' */
  title: string;
  /** the text the dock holds now, ticked; none from the Verse view */
  current?: SplitTextKey | null;
  onChoose(key: SplitTextKey): void;
  onMap(): void;
  onClose(): void;
}

export function SplitChooser(props: SplitChooserProps) {
  return createPortal(<Sheet {...props} />, document.body);
}
