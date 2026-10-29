// src/reader/VariantSheet.tsx — the sheet a tap on a variant's brace opens (mw-9ji6ek0.6, src/reader/VariantBrace.tsx): the text's own reading and the other reading(s) of the
// unit, each in Greek and in English, the witness of each spelled out one line apiece (src/reader/witness.ts), and Ask the tutor, which opens the verse's talk as the Verse view's
// Ask does (the tutor's own variant story comes later), and under the readings 'Go deeper' (src/reader/goDeeper.ts, mw-9ji6ek0.20): the lessons, the apparatus, the 2005 edition and his Logos
// Greek texts at the verse. Each word of a reading's Greek and English lines is a Tap like a word of the text and opens the word card over the sheet (mw-9ji6ek0.22). Done, Back, Escape, a swipe down or a tap outside close it. A portal: the brace is in the Reader's scrolling text.
import { Fragment } from 'react';
import { createPortal } from 'react-dom';
import type { Verse } from '../data/chapter';
import { AnotherBookButton } from '../library/InLogosDoors';
import { openVariantLesson } from '../nav/route';
import { GREEK_LANG } from '../script/greekLang';
import { focusOnMount } from '../ui/focus';
import { closeAllSheets, useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { APPARATUS_LABEL, EDITION_2005, GO_DEEPER_ENTRIES, GO_DEEPER_HEADING, LESSONS_LABEL, LOGOS_LABEL, apparatusUrl, goDeeperPlace } from './goDeeper';
import type { Lookup } from '../WordSheet';
import { sayWord } from './sayWord';
import { Tap, TAP_PAD } from './Tap';
import { braceReadings, type ShownUnit } from './variants';
import { readingTokens, variantLabel, variantLookup, type WordReading } from './variantWords';
import { readingsOf } from './witness';

const LEFT_OUT = 'left out';

/** What a tap or a long press on a word of a reading does: the word, the language it is drawn in. */
interface WordActions {
  onWord: (word: string, language: 'greek' | 'english') => void;
  onSay: (word: string, language: 'greek' | 'english') => void;
}

/** A line of a reading: each word a Tap (44 px tall, a long press says it) when the sheet has the verse to look them up in, else the plain text. */
function Words({ text, language, actions }: { text: string; language: 'greek' | 'english'; actions?: WordActions }) {
  if (!actions) return <>{text}</>;
  const all = text.split(/\s+/).filter(Boolean);
  const tappable = new Set(readingTokens(text));
  return (
    <>
      {all.map((word, k) =>
        tappable.has(word) ? (
          <Tap key={k} data-sheet-word="" className={TAP_PAD} onTap={() => actions.onWord(word, language)} onLongPress={() => actions.onSay(word, language)}>
            {word}
          </Tap>
        ) : (
          <Fragment key={k}>{`${word} `}</Fragment>
        ),
      )}
    </>
  );
}

function Reading({ label, greek, english, lines, actions }: { label: string; greek: string; english: string; lines?: string[]; actions?: WordActions }) {
  return (
    <section data-variant-reading="" className="border-t border-line py-3">
      <h3 className="pb-1 text-base font-medium text-muted">{label}</h3>
      <p data-reading-greek="" {...(greek ? GREEK_LANG : { lang: 'en' })} className={greek ? 'font-greek text-2xl text-fg' : 'text-lg italic text-muted'}>
        {greek ? <Words text={greek} language="greek" actions={actions} /> : LEFT_OUT}
      </p>
      <p data-reading-english="" lang="en" className={english ? 'text-lg text-fg' : 'text-lg italic text-muted'}>
        {english ? <Words text={english} language="english" actions={actions} /> : LEFT_OUT}
      </p>
      {lines?.map((line) => (
        <p key={line} data-witness-line="" className="pt-1 text-base text-muted">
          {line}
        </p>
      ))}
    </section>
  );
}

const ROW = 'flex min-h-11 items-center text-lg font-medium text-accent underline';

/** 'Go deeper': the lessons, the apparatus of the unit's book, the 2005 edition and, while Logos is On and a Greek text of his shelf opens there, the Greek texts at the verse. Web links open outside the app. */
function GoDeeper({ place, onLessons }: { place: VariantPlace; onLessons: () => void }) {
  const apparatus = apparatusUrl(place.book);
  const { place: studyPlace, name } = goDeeperPlace(place.book, place.chapter, place.verse);
  return (
    <section data-go-deeper="" aria-labelledby="go-deeper-heading" className="border-t border-line py-3">
      <h3 id="go-deeper-heading" className="pb-1 text-base font-medium text-muted">
        {GO_DEEPER_HEADING}
      </h3>
      <button type="button" onClick={onLessons} className={`${ROW} w-full text-left`}>
        {LESSONS_LABEL}
      </button>
      {apparatus ? (
        <a href={apparatus} target="_blank" rel="noreferrer" className={ROW}>
          {APPARATUS_LABEL}
        </a>
      ) : null}
      <a href={EDITION_2005.url} target="_blank" rel="noreferrer" className={ROW}>
        {EDITION_2005.label}
      </a>
      <AnotherBookButton place={studyPlace} name={name} entries={GO_DEEPER_ENTRIES} label={LOGOS_LABEL} className={`${ROW} w-full`} />
    </section>
  );
}

/** Where the unit is: its book (our code) and chapter; the verse is the unit's own. */
export interface VariantPlace {
  book: string;
  chapter: number;
  verse: number;
}

interface SheetProps {
  shown: ShownUnit;
  reference: string;
  place?: VariantPlace;
  /** the verse of the unit: with it and `onLook` the words of the readings are Taps that open the word card over the sheet */
  verse?: Verse;
  onLook?: (lookup: Lookup) => void;
  onClose: () => void;
  onAsk?: () => void;
}

function Sheet({ shown, reference, place, verse, onLook, onClose, onAsk }: SheetProps) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const others = readingsOf(shown);
  // braceReadings keys a reading as readingsOf does (its Greek), so the two lists run in step: this one has each reading's tagged words and chips
  const tagged = braceReadings(shown, 'greek');
  const actionsFor = (reading: WordReading, variant?: string): WordActions | undefined =>
    verse && onLook
      ? {
          onWord: (word, language) => {
            const look = variantLookup(verse, word, reading, language, variant);
            if (look) onLook(look);
          },
          onSay: (word, language) => sayWord(word, language, verse.n),
        }
      : undefined;
  const own: WordReading = { greek: shown.unit.base, english: shown.unit.english.base, g: verse ? shown.unit.w.map((i) => verse.g[i]).filter(Boolean) : undefined };
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
          <Reading label="The text reads" greek={shown.unit.base} english={shown.unit.english.base} actions={actionsFor(own)} />
          {others.map((r, i) => (
            <Reading
              key={i}
              label={others.length > 1 ? `Other reading ${i + 1}` : 'Other reading'}
              greek={r.greek}
              english={r.english}
              lines={r.lines}
              actions={actionsFor({ greek: r.greek, english: r.english, g: tagged[i]?.g }, tagged[i] ? variantLabel(tagged[i].chips) : undefined)}
            />
          ))}
          {place ? (
            <GoDeeper
              place={place}
              onLessons={() => {
                closeAllSheets();
                openVariantLesson();
              }}
            />
          ) : null}
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

/** The sheet, drawn over everything. `place` is the unit's book, chapter and verse (Go deeper is left out without it). `verse` and `onLook` make the words of the readings Taps. `onAsk` is left out when the tutor is not allowed (no licence): the button is then not drawn. */
export function VariantSheet(props: SheetProps) {
  return createPortal(<Sheet {...props} />, document.body);
}
