// src/reader/VariantSheet.tsx — the sheet a tap on a variant's brace opens (mw-9ji6ek0.6, src/reader/VariantBrace.tsx): the text's own reading and the other reading(s) of the
// unit, each in Greek and in English, the witness of each spelled out one line apiece (src/reader/witness.ts), and Ask the tutor, which opens the verse's talk as the Verse view's
// Ask does (the tutor's own variant story comes later), and under the readings 'Go deeper' (src/reader/goDeeper.ts, mw-9ji6ek0.20): the lessons, the apparatus, the 2005 edition and his Logos
// Greek texts at the verse. Each reading has 'Read this' (mw-9ji6ek0.24): it lays that reading into the text in place and closes the sheet; the one in place says 'Reading this'. Each word of a reading's Greek and English lines is a Tap like a word of the text and opens the word card over the sheet (mw-9ji6ek0.22). Done, Back, Escape, a swipe down or a tap outside close it. A portal: the brace is in the Reader's scrolling text.
import { Fragment, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { SourceLanguage, Verse } from '../data/chapter';
import { wordOrderOnlyUnit } from '../data/variantVerse';
import { AnotherBookButton } from '../library/InLogosDoors';
import { navigate, openVariantLesson } from '../nav/route';
import { GREEK_LANG } from '../script/greekLang';
import { focusOnMount } from '../ui/focus';
import { closeAllSheets, useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { APPARATUS_LABEL, EDITION_2005, GO_DEEPER_ENTRIES, GO_DEEPER_HEADING, LESSONS_LABEL, LOGOS_LABEL, apparatusUrl, goDeeperPlace } from './goDeeper';
import type { Lookup } from '../WordSheet';
import { sayWord } from './sayWord';
import { SOURCE_CAPTION, SOURCE_LINK, SOURCE_SAYS, textReadsEnglish, unitSource, type EnglishLine, type EnglishSource } from './englishSource';
import { Tap, TAP_PAD } from './Tap';
import { BASE } from './readingSets';
import { braceReadings, type ShownUnit } from './variants';
import { readingTokens, variantLabel, variantLookup, type WordReading } from './variantWords';
import { readingsOf } from './witness';

const LEFT_OUT = 'left out';
export const READ_THIS = 'Read this';
export const READING_THIS = 'Reading this';
/** The line over Ask the tutor on a unit whose other readings are the text's own words in another order (mw-9ji6ek0.31). */
export const WORD_ORDER_ONLY = 'Word order only: emphasis, not meaning';
/** The one line under the readings that says what Read this does not change in this wave (the plan's Q6). */
export const READ_THIS_NOTE = 'Read aloud, Read check and the diagram keep the Byzantine words; Copy, as you read it, gives your reading.';

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

/** What a reading that leaves the unit out says: 'NA leaves out “in” (ἐπὶ)', the English the build gives the words (none: the Greek alone). */
function leftOutLine(chips: readonly string[], english: string, greek: string): string {
  const who = chips.length > 1 ? `${chips.slice(0, -1).join(', ')} and ${chips[chips.length - 1]}` : chips[0] ?? 'This reading';
  return `${who} ${chips.length > 1 ? 'leave' : 'leaves'} out ${english ? `“${english}” (${greek})` : greek}`;
}

/** The foot of a reading: 'Reading this' (not a button) on the one in place, else the 'Read this' button when the sheet can lay a reading in. */
function ReadThis({ inPlace, onRead }: { inPlace: boolean; onRead?: () => void }) {
  if (inPlace) {
    return (
      <p data-reading-this="" className="pt-1 text-base font-medium text-accent">
        {READING_THIS}
      </p>
    );
  }
  if (!onRead) return null;
  return (
    <button type="button" data-read-this="" onClick={onRead} className="mt-1 min-h-11 rounded-lg border border-accent px-4 text-base font-medium text-accent active:bg-line">
      {READ_THIS}
    </button>
  );
}

/** The small muted caption under an English line: where the words come from. A tap says in one line what the source is, with a link to the Preface. */
function SourceCaption({ source, open, onToggle }: { source: EnglishSource; open: boolean; onToggle: () => void }) {
  return (
    <>
      <button
        type="button"
        data-english-source={source}
        aria-expanded={open}
        onClick={onToggle}
        className="-mt-1 flex min-h-11 items-center text-sm text-muted underline decoration-dotted underline-offset-4"
      >
        {SOURCE_CAPTION[source]}
      </button>
      {open ? (
        <div data-english-source-says="" className="pb-1 text-sm text-muted">
          <p>{SOURCE_SAYS[source]}</p>
          <button
            type="button"
            onClick={() => {
              closeAllSheets();
              navigate('preface');
            }}
            className="flex min-h-11 items-center text-base font-medium text-accent underline"
          >
            {SOURCE_LINK}
          </button>
        </div>
      ) : null}
    </>
  );
}

/** Every English line of a reading names its source: the lines are the reading's English, each with its source and the actions of a tap on its words. */
interface ReadingEnglish extends EnglishLine {
  actions?: WordActions;
}

/** What the MSB's own footnote says the critical text reads where the reading leaves the unit out: 'The MSB reads the NA text: “they all”' (the MSB's English of the sentence, not of a reading; mw-9ji6ek0.36). */
function msbReadsLine(chips: readonly string[], text: string): string {
  const who = chips.length > 1 ? `${chips.slice(0, -1).join(', ')} and ${chips[chips.length - 1]}` : chips[0] ?? 'critical';
  return `The MSB reads the ${who} text: “${text}”`;
}

function Reading({
  label,
  greek,
  english,
  lines,
  actions,
  leftOut,
  leftOutSource,
  msbReads,
  foot,
  openSource,
  onSource,
}: {
  label: string;
  greek: string;
  english: ReadingEnglish[];
  lines?: string[];
  actions?: WordActions;
  leftOut?: string;
  leftOutSource?: EnglishSource;
  /** the MSB's English of the critical text's sentence at an omission (VariantEnglish.ctReads), already worded */
  msbReads?: string;
  foot?: ReactNode;
  openSource: string | null;
  onSource: (key: string | null) => void;
}) {
  const caption = (source: EnglishSource, key: string) => <SourceCaption source={source} open={openSource === key} onToggle={() => onSource(openSource === key ? null : key)} />;
  return (
    <section data-variant-reading="" className="border-t border-line py-3">
      <h3 className="pb-1 text-base font-medium text-muted">{label}</h3>
      {leftOut ? (
        <>
          <p data-left-out="" lang="en" className="text-lg text-fg">
            {leftOut}
          </p>
          {leftOutSource ? caption(leftOutSource, `${label}:out`) : null}
          {msbReads ? (
            <>
              <p data-msb-reads="" lang="en" className="pt-1 text-lg text-fg">
                {msbReads}
              </p>
              {caption('msb', `${label}:msb`)}
            </>
          ) : null}
        </>
      ) : (
        <>
          <p data-reading-greek="" {...(greek ? GREEK_LANG : { lang: 'en' })} className={greek ? 'font-greek text-2xl text-fg' : 'text-lg italic text-muted'}>
            {greek ? <Words text={greek} language="greek" actions={actions} /> : LEFT_OUT}
          </p>
          {english.length ? (
            english.map((line, i) => (
              <Fragment key={i}>
                <p data-reading-english="" {...(line.verse ? { 'data-in-verse': '' } : {})} lang="en" className="text-lg text-fg">
                  <Words text={line.text} language="english" actions={line.actions} />
                </p>
                {caption(line.source, `${label}:${i}`)}
              </Fragment>
            ))
          ) : (
            <p data-reading-english="" lang="en" className="text-lg italic text-muted">
              {LEFT_OUT}
            </p>
          )}
        </>
      )}
      {lines?.map((line) => (
        <p key={line} data-witness-line="" className="pt-1 text-base text-muted">
          {line}
        </p>
      ))}
      {foot}
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
  /** the language the unit's chapter is in: an Old Testament card (Hebrew) names the Berean Standard Bible as the English's source, the New Testament's the Majority Standard Bible */
  lang?: SourceLanguage;
  /** lays a reading into the text in place: the index of the alternative in the unit's `alts`, BASE (-1) for the text's own; without it no reading has Read this */
  onRead?: (index: number) => void;
}

function Sheet({ shown, reference, place, verse, lang, onLook, onClose, onAsk, onRead }: SheetProps) {
  const { drag, handle } = useSheetDrag(onClose);
  const [openSource, setOpenSource] = useState<string | null>(null);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const others = readingsOf(shown);
  // braceReadings keys a reading as readingsOf does (its Greek), so the two lists run in step: this one has each reading's tagged words and chips
  const tagged = braceReadings({ ...shown, chosen: undefined }, 'greek');
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
          <Reading
            label="The text reads"
            greek={shown.unit.base}
            english={textReadsEnglish(shown.unit, verse, lang).map((line) => ({ ...line, actions: actionsFor({ ...own, english: line.text }) }))}
            actions={actionsFor(own)}
            openSource={openSource}
            onSource={setOpenSource}
            foot={onRead && shown.chosen !== undefined ? <ReadThis inPlace={false} onRead={() => onRead(BASE)} /> : undefined}
          />
          {others.map((r, i) => (
            <Reading
              key={i}
              label={others.length > 1 ? `Other reading ${i + 1}` : 'Other reading'}
              greek={r.greek}
              english={r.english ? [{ text: r.english, source: unitSource(shown.unit, lang), actions: actionsFor({ greek: r.greek, english: r.english, g: tagged[i]?.g }, tagged[i] ? variantLabel(tagged[i].chips) : undefined) }] : []}
              openSource={openSource}
              onSource={setOpenSource}
              lines={r.lines}
              actions={actionsFor({ greek: r.greek, english: r.english, g: tagged[i]?.g }, tagged[i] ? variantLabel(tagged[i].chips) : undefined)}
              leftOutSource={shown.unit.english.base ? unitSource(shown.unit, lang) : undefined}
              leftOut={r.greek ? undefined : leftOutLine(tagged[i]?.chips ?? [], shown.unit.english.base, shown.unit.base)}
              msbReads={r.greek || !shown.unit.english.ctReads ? undefined : msbReadsLine(tagged[i]?.chips ?? [], shown.unit.english.ctReads)}
              foot={
                onRead && !r.apart ? <ReadThis inPlace={shown.chosen !== undefined && r.indexes.includes(shown.chosen)} onRead={() => onRead(r.index)} /> : undefined
              }
            />
          ))}
          {onRead ? (
            <p data-read-this-note="" className="border-t border-line py-3 text-base text-muted">
              {READ_THIS_NOTE}
            </p>
          ) : null}
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
        {wordOrderOnlyUnit(shown.unit, verse) ? (
          <p data-word-order-only="" className="pt-2 text-base text-muted">
            {WORD_ORDER_ONLY}
          </p>
        ) : null}
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
