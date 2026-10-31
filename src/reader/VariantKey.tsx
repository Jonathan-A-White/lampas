// src/reader/VariantKey.tsx — the key to the marks of a variant brace (mw-9ji6ek0.43; his post of 2026-10-31: what is the dotted ring, what is the plain one, what are NA and B?).
// Two parts: a quiet line under the Reader's chips row, shown while the chapter has braces and until he puts it away with its × (kept on this phone, for every chapter), and a sheet that says it
// in full, one tap from any brace (its opening '{' opens it, through VariantKeyContext, which the Reader provides; a brace on a card has none) and from the line's own 'What the marks mean'.
// The samples take their class from variantEnglishClass (src/reader/englishSource.ts), the text's own, so a later change of look changes the key. PROVISIONAL (the Governor confirms the wording).
import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { dismissVariantKey, getVariantKeyDismissed, getVariantLessonsOfferAnswered } from '../data/repositories';
import { openVariantLesson } from '../nav/route';
import { variantLessonsOfferSetting } from '../settings/definitions';
import { useSetting } from '../settings/store';
import { focusOnMount } from '../ui/focus';
import { closeAllSheets, useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { variantEnglishClass, type EnglishSource } from './englishSource';

/** Opens the key's sheet. The Reader provides it; without it (a brace on a card) the brace draws no button. */
export const VariantKeyContext = createContext<(() => void) | undefined>(undefined);
export const useOpenVariantKey = () => useContext(VariantKeyContext);

/** The accessible name of the button that opens the key, on a brace and on the line. */
export const KEY_OPEN = 'What the marks mean';
/** The link at the foot of the sheet: the fourth lesson, whose last section says where the English comes from. */
export const KEY_LINK = 'Where the English comes from, in the lessons';
const LESSON = 4;

/** The class of a sample of the English of `source`: the one the text gives it. */
const sampleClass = (source: 'lampas' | 'msb'): string => variantEnglishClass({ english: { source, base: '', alts: [] } });

/** A sample of the English of one source, in the style of the text. */
function Sample({ source, children }: { source: Extract<EnglishSource, 'lampas' | 'msb'>; children: ReactNode }) {
  return (
    <span data-testid={`variant-key-sample-${source}`} className={`text-fg ${sampleClass(source)}`}>
      {children}
    </span>
  );
}

/** A sample of a witness chip, as the brace draws it. */
function Chip({ children }: { children: string }) {
  return (
    <span data-key-chip="" className="rounded border border-accent/60 px-1 text-[0.75em] font-semibold leading-tight text-accent">
      {children}
    </span>
  );
}

/** The line under the chips row: a sample of each look and the witness letters in a few words, with a way to read more and a × to put it away. */
export function VariantKeyLine({ onMore, onDismiss }: { onMore: () => void; onDismiss: () => void }) {
  return (
    <aside role="note" aria-label="Key to the marks of a variant" data-testid="variant-key-line" className="flex shrink-0 items-start border-b border-line pl-3 text-sm text-muted">
      <p className="min-w-0 flex-1 py-2 leading-relaxed">
        <Sample source="lampas">dotted</Sample>: Lampas’s English · <Sample source="msb">plain</Sample>: the MSB’s footnote · <Chip>NA</Chip> <Chip>B</Chip>: which Greek text reads it.{' '}
        <button type="button" onClick={onMore} className="inline-flex min-h-11 items-center font-medium text-accent underline">
          {KEY_OPEN}
        </button>
      </p>
      <button type="button" onClick={onDismiss} aria-label="Put the key away" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-lg text-muted active:bg-line">
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}

/** The line, while it is wanted: the chapter has braces on show, he has not put it away, and the card that offers the lessons (src/reader/VariantLessonsOffer.tsx) is not up: one quiet note
 * at a time under the chips row, so the first sight of a brace is the offer and the key comes under it once he has answered. */
export function VariantKeyBar({ braces, onMore }: { braces: boolean; onMore: () => void }) {
  const away = useLiveQuery(getVariantKeyDismissed, []);
  const offer = useSetting(variantLessonsOfferSetting);
  const answered = useLiveQuery(getVariantLessonsOfferAnswered, []);
  if (!braces || away !== false || offer === undefined || answered === undefined || (offer === 'on' && !answered)) return null;
  return <VariantKeyLine onMore={onMore} onDismiss={() => void dismissVariantKey()} />;
}

function Row({ mark, children }: { mark: ReactNode; children: ReactNode }) {
  return (
    <div data-key-row="" className="flex gap-3 border-t border-line py-3">
      <div className="w-24 shrink-0 text-base">{mark}</div>
      <p className="min-w-0 flex-1 text-base">{children}</p>
    </div>
  );
}

/** The sheet: every mark the Reader draws for a variant, in words. A portal: the brace is in the Reader's scrolling text. */
export function VariantKeySheet({ onClose }: { onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  return createPortal(
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="What the marks in a brace mean"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 className="min-w-0 flex-1 title-wrap text-xl font-semibold">What the marks in a brace mean</h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="pb-3 text-base text-muted">A brace, like {'{'}through NA{'}'}, gives the other reading of the words just before it.</p>
          <Row mark={<Sample source="lampas">dotted</Sample>}>English that Lampas’s model wrote when the app was built, word for word from the Greek. Treat it as a guide to the Greek, not a translation.</Row>
          <Row mark={<Sample source="msb">plain</Sample>}>English from the Majority Standard Bible’s own footnote, which gives the critical text’s reading.</Row>
          <Row mark={<span className="flex flex-wrap gap-1"><Chip>NA</Chip><Chip>ECM</Chip></span>}>The editions of the Greek that read it: Nestle-Aland, or the Editio Critica Maior.</Row>
          <Row mark={<Chip>B</Chip>}>The Byzantine manuscripts are split here.</Row>
          <Row mark={<Chip>RP</Chip>}>The Robinson-Pierpont text, the Greek this app reads, shown in the brace when you have laid another reading into the text.</Row>
          <Row mark={<span className="underline decoration-dotted decoration-accent decoration-2 underline-offset-4">words</span>}>A dotted line under the words of the text marks where the manuscripts differ.</Row>
          <Row mark={<span className="underline decoration-accent underline-offset-4">words</span>}>A thin solid line marks a reading you laid into the text with Read this.</Row>
          <p className="border-t border-line py-3 text-base text-muted">Tap the opening brace {'{'} of any variant to see this again, or a letter to see where the manuscripts differ.</p>
          <button
            type="button"
            onClick={() => {
              closeAllSheets();
              openVariantLesson(LESSON);
            }}
            className="flex min-h-11 items-center border-t border-line text-base font-medium text-accent underline"
          >
            {KEY_LINK}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
