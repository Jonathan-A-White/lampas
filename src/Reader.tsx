// src/Reader.tsx — a chapter verse by verse (Romans 8 on a fresh install; the title opens the picker, src/ChapterPicker.tsx).
// The header switches English (the MSB) | Greek (Byzantine); every word is tappable and opens the word sheet; a verse number selects the verse. The gear opens Settings
// (src/SettingsScreen.tsx), where the Weave (Off | Solid words | Solid and learning words) is switched: with it on, the English view shows the
// Greek of his solid words in place of their English (src/data/weave.ts).
// Settings also holds the Layout (Verse by verse | Paragraph, src/layout/layouts.ts cuts the verses into blocks) and Section
// headings (On | Off): the MSB's heading (verses[].h) is drawn above its block in either view, in English.
// A tapped verse number opens the Verse view (src/VerseView.tsx, mw-5r3p30.79) over the Reader: the verse big at the top, one row of actions
// (Listen, Read it aloud, Ask the tutor, Copy link) and one hold bar at the foot. The view is a Back step of its own (src/nav/route.ts openVerse),
// so Back returns to the Reader where it was; the verse is in the address (v), the address is the truth, and the verse is "selected" while the view
// is open. A tap on a section heading opens the same view for the passage under it (mw-5r3p30.73, src/data/passage.ts; the address `p` is the
// passage's first verse). The selection, the view and the weave are told to the rest of the app on the event bus (src/events/bus.ts, docs/events.md).
// The chapter comes from /data/<book>/<n>.json (Romans 8 is precached, any other is fetched when first opened and then kept by the
// worker), the view and the weave are kept in the settings store. Which chapter is open is the address's (b and c), else the one
// last open (src/data/readerChapter.ts); a chapter is a ReaderBody keyed by it, so choosing another starts the screen afresh.
import { useLiveQuery } from 'dexie-react-hooks';
import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReadHold } from './ReadCheck';
import { VerseView } from './VerseView';
import { useVerseAction } from './verse/action';
import { TalkBar, TalkSheet } from './Talk';
import { type Chapter, type EnglishChunk, type GreekWord, type Verse, loadChapter } from './data/chapter';
import { formPasses } from './data/grammar/formLevel';
import { listLevels } from './data/repositories/grammarLevels';
import {
  getLayout,
  getGreekPronunciation,
  getReadSpan,
  getReaderView,
  getSectionHeadings,
  getWeave,
  getWeaveGrammar,
  listLearningLemmas,
  listSolidLemmas,
  setReaderView,
  listTurns,
  setWeave,
  talkRef,
  type ReaderView,
} from './data/repositories';
import { chapterOf, getOpenChapter, setOpenChapter, type OpenChapter } from './data/readerChapter';
import { verseNeighbours } from './data/neighbours';
import { type Passage, passageAt, passageVerse, passagesOf, unitId } from './data/passage';
import { ChapterNav } from './ChapterNav';
import { ChapterPicker } from './ChapterPicker';
import { weaveVerse, type Woven } from './data/weave';
import { BuildVersion } from './BuildVersion';
import { latest, publish, useLatest } from './events/bus';
import { blocksOf } from './layout/layouts';
import { LinkOpener } from './nav/LinkOpener';
import { pendingLink, takeLink } from './nav/linkRequest';
import { lemmaSheet, linkOf } from './nav/links';
import { pendingRequest, takeRequest } from './nav/readerRequest';
import { closeVerse, movePassage, moveVerse, navigate, openPassage, openVerse, readerOf, useAddress } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { useAsks } from './useAsks';
import { useReadChecks } from './useReadChecks';
import { useTalk } from './useTalk';
import { helpQuestion, newWordQuestion, paradigmQuestion, quizMeQuestion, scopeRef, scopeTitle, termQuestion, type TalkScope, type WordFocus } from './services/talk';
import { useVoice } from './useVoice';
import { useHoldPress } from './ui/holdPress';
import { NO_SELECT, useLongPress } from './ui/longPress';
import { HeaderButton } from './ScreenHeader';
import { continueReading, getReading, pauseReading, planOf, startAnswer, startReading, stopReading, updatePlan, useReading } from './speech/readAloud';
import { answerRuns, syllableRuns } from './speech/answerRuns';
import { DueBadge } from './DueBadge';
import { NewWordsStrip } from './NewWordsStrip';
import { TeachSheet, type NewWordAsk } from './TeachSheet';
import { useNewWords } from './useNewWords';
import { usePace } from './usePace';
import { GoalStrip } from './GoalStrip';
import { TipCard } from './tips/TipCard';
import { ReadFromButton, ReadingBar, VersePlay } from './speech/ReadControls';
import { speakWord, warmVoices } from './speech/greek';
import type { SpeechLanguage } from './speech/languages';
import { WordSheet, type Lookup, type TermAsk, type WordHelp } from './WordSheet';

// 44 px (--lp-tap) minus 1 em, halved, top and bottom. Every face's content area is taller than 1 em (Gentium Plus
// about 1.11 em, a phone's sans about 1.1 em), so an inline word is never under 44 px whatever the font, and the line
// box stays --lp-tap tall, so the spare pixels cost no layout.
const TAP_PAD = 'py-[calc((var(--lp-tap)-1em)/2)]';

/** A word he can tap: a span with role button and no chrome. The caller pads it to a 44 px tap height (an inline box
 * is as tall as its font's content area, so the padding is 44 px minus that, which differs by face). The trailing
 * space is inside so the gap between two words is tappable too. A finger held on it for half a second (`onLongPress`)
 * is a press, not a tap: the click that follows is dropped, and so is one after the finger wandered over 10 px
 * (src/ui/longPress.ts). The word never selects text and never raises the phone's callout menu, so the hold is free for the press. */
function Tap({ onTap, onLongPress, lang, className, children, ...data }: {
  onTap: () => void;
  onLongPress: () => void;
  lang?: string;
  className?: string;
  children: ReactNode;
  'data-chunk'?: string;
  'data-woven'?: string;
  'data-learning'?: string;
  'data-word'?: string;
}) {
  const press = useLongPress(onTap, onLongPress);
  return (
    <span
      role="button"
      tabIndex={0}
      lang={lang}
      {...data}
      {...press}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      className={`cursor-pointer ${NO_SELECT} rounded px-[0.1em] active:bg-line ${className ?? ''}`}
    >
      {children}{' '}
    </span>
  );
}

function ViewSwitch({ view }: { view: ReaderView }) {
  const choice = (value: ReaderView, label: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => void setReaderView(value)}
      className={`min-h-11 min-w-11 rounded-lg px-2.5 chrome-text font-medium ${view === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Language" className="flex shrink-0 rounded-xl border border-line p-0.5">
      {choice('english', 'English')}
      {choice('greek', 'Greek')}
    </div>
  );
}

const EMPTY_LEMMAS: ReadonlySet<string> = new Set();

/** The arrow to the passage `by` places from `passage` in the chapter's passages: null at the chapter's first and last. */
function stepOf(passages: Passage[], passage: Passage, by: 1 | -1): (() => void) | null {
  const to = passages[passages.findIndex((p) => p.first === passage.first) + by];
  return to ? () => movePassage(to.first) : null;
}

/** The arrow to a verse place (src/data/neighbours.ts), or null when there is none. */
function stepOfVerse(place: { book: string; chapter: number; verse: number } | null): (() => void) | null {
  return place ? () => moveVerse(place) : null;
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

/** What a held verse number does: open the talk about that verse and listen, send on release, drop on a slide-away. */
interface VerseTalk {
  onHold: (n: number) => void;
  onRelease: () => void;
  onDrop: () => void;
}

/** The button with a verse's number: a tap selects the verse, a hold (half a second) talks about it. */
function VerseNumber({ n, selected, onSelect, talk, className, children }: {
  n: number;
  selected: boolean;
  onSelect: () => void;
  talk: VerseTalk;
  className: string;
  children: ReactNode;
}) {
  const press = useHoldPress({ onTap: onSelect, onHold: () => talk.onHold(n), onRelease: talk.onRelease, onDrop: talk.onDrop });
  return (
    <button
      type="button"
      {...press}
      aria-label={`Verse ${n}`}
      aria-pressed={selected}
      className={`select-none [-webkit-touch-callout:none] ${className}`}
    >
      {children}
    </button>
  );
}

interface VerseProps {
  verse: Verse;
  view: ReaderView;
  /** per English chunk, the Greek words shown in its place or null; null for the whole verse when the weave is off */
  woven: Woven[] | null;
  selected: boolean;
  /** this verse is the one being read aloud */
  reading: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onLook: (lookup: Lookup) => void;
  talk: VerseTalk;
}

/** The words of one verse, every one tappable: the Greek in Greek order, or the English chunks (woven or not). */
function VerseText({ verse, view, woven, onLook }: Pick<VerseProps, 'verse' | 'view' | 'woven' | 'onLook'>) {
  const lookGreek = (w: GreekWord) =>
    onLook({ words: [w], english: w.e === undefined ? undefined : verse.e[w.e]?.t, fromEnglish: false });
  const lookEnglish = (c: EnglishChunk) => onLook({ words: c.g.map((i) => verse.g[i]), english: c.t, fromEnglish: true });
  // A long press says the word alone, in its own language, straight from the press (docs/pwa-best-practices.md section 12).
  // A reading under way is paused first: it would have the speech taken from it anyway.
  const say = (text: string, language: SpeechLanguage) => {
    pauseReading();
    if (speakWord(text, language)) publish({ kind: 'word-spoken', text, language, verse: verse.n });
  };
  return (
    <span data-text>
      {view === 'greek'
        ? verse.g.map((w, i) => (
            <Tap key={i} data-word={String(i)} className={TAP_PAD} onTap={() => lookGreek(w)} onLongPress={() => say(w.t, 'greek')}>
              {w.t}
            </Tap>
          ))
        : verse.e.map((c, i) => {
            const weft = woven?.[i];
            return weft ? (
              <Tap
                key={i}
                data-chunk={String(i)}
                data-woven=""
                data-learning={weft.learning ? '' : undefined}
                lang="grc"
                className={`font-greek text-[length:var(--lp-greek-size)] text-accent ${TAP_PAD}`}
                onTap={() => lookEnglish(c)}
                onLongPress={() => say(weft.words.map((w) => w.t).join(' '), 'greek')}
              >
                {weft.learning ? (
                  <span className="inline-flex flex-col items-center align-top leading-tight">
                    <span data-greek>{weft.words.map((w) => w.t).join(' ')}</span>
                    <span data-hint lang="en" className="whitespace-nowrap font-sans text-sm font-normal text-muted">
                      {c.t}
                    </span>
                  </span>
                ) : (
                  weft.words.map((w) => w.t).join(' ')
                )}
              </Tap>
            ) : (
              <Tap key={i} data-chunk={String(i)} className={`${TAP_PAD} ${c.s ? 'italic' : ''}`} onTap={() => lookEnglish(c)} onLongPress={() => say(c.t, 'english')}>
                {c.t}
              </Tap>
            );
          })}
    </span>
  );
}

const textClass = (view: ReaderView) =>
  view === 'greek' ? 'font-greek text-[length:var(--lp-greek-size)]' : 'font-sans text-[length:var(--lp-english-size)]';

const READING_CLASS = 'bg-accent/30';


/** Verse by verse: one verse per line, its number a button before it (a tap opens the Verse view, src/VerseView.tsx). */
function VerseLine(props: VerseProps) {
  const { verse, view, selected, reading, onSelect, onPlay, talk } = props;
  return (
    <p
      data-verse={verse.n}
      data-selected={selected}
      data-reading={reading || undefined}
      lang={view === 'greek' ? 'grc' : 'en'}
      className={`mb-1 break-words rounded-xl px-2 leading-(--lp-leading) ${reading ? READING_CLASS : selected ? 'bg-accent/15' : ''} ${textClass(view)}`}
    >
      <VerseNumber
        n={verse.n}
        selected={selected}
        onSelect={onSelect}
        talk={talk}
        className="inline-block min-h-(--lp-tap) min-w-(--lp-tap) pr-1 text-left align-baseline font-sans text-sm font-semibold leading-(--lp-tap) text-muted"
      >
        {verse.n}
      </VerseNumber>
      <VerseText {...props} />
      <VersePlay playing={reading} onPlay={onPlay} className="align-baseline font-sans" />
    </p>
  );
}

/** Paragraph: the verses of one MSB paragraph run on, each number a small superscript. The button is still 44 px square
 * (its side margins pull the neighbours back in), and a verse is still selected by its number. The play button of a
 * verse shows only while it is selected, so a paragraph reads as running text. */
function ParagraphView({ verses, view, woven, selected, reading, onSelect, onPlay, onLook, talk }: {
  verses: Verse[];
  view: ReaderView;
  woven: (Woven[] | null)[];
  selected: number | null;
  /** the verse being read aloud */
  reading: number | null;
  onSelect: (n: number) => void;
  onPlay: (n: number) => void;
  onLook: (lookup: Lookup) => void;
  talk: VerseTalk;
}) {
  return (
    <p data-paragraph lang={view === 'greek' ? 'grc' : 'en'} className={`mb-2 break-words px-2 leading-(--lp-leading) ${textClass(view)}`}>
      {verses.map((verse, i) => (
        <span key={verse.n} data-verse={verse.n} data-selected={selected === verse.n} data-reading={reading === verse.n || undefined} className={`rounded-xl ${reading === verse.n ? READING_CLASS : selected === verse.n ? 'bg-accent/15' : ''}`}>
          <VerseNumber
            n={verse.n}
            selected={selected === verse.n}
            onSelect={() => onSelect(verse.n)}
            talk={talk}
            className="-mx-3 inline-block min-h-(--lp-tap) min-w-(--lp-tap) text-center align-baseline font-sans leading-(--lp-tap)"
          >
            <sup className="text-xs font-semibold text-muted">{verse.n}</sup>
          </VerseNumber>
          <VerseText verse={verse} view={view} woven={woven[i]} onLook={onLook} />
          {selected === verse.n || reading === verse.n ? (
            <VersePlay playing={reading === verse.n} onPlay={() => onPlay(verse.n)} className="align-baseline font-sans" />
          ) : null}
        </span>
      ))}
    </p>
  );
}

/** A section heading: the MSB's own English, whichever view is on. The whole heading is a button that opens the Verse view for its passage; its
 * padding (the heading's own side padding moved onto it, so it spans the whole width) and the negative margin that takes the vertical padding back keep the text where it was and give a thumb 44 px (`flow-root` keeps the margin inside). */
function SectionHeading({ text, onOpen }: { text: string; onOpen: () => void }) {
  return (
    <h2 data-heading lang="en" className="mb-1 mt-5 flow-root font-sans text-lg font-semibold leading-snug text-accent">
      <button type="button" onClick={onOpen} className="-my-2.5 block w-full rounded-lg px-2 py-2.5 text-left active:bg-line">
        {text}
      </button>
    </h2>
  );
}

/** The verses of a passage for the Verse view, one after another with a small number before each, the one being read highlighted; the reading is
 * followed down the box the view scrolls the passage in (data-passage-box), by moving that box and nothing else. Each verse is the Reader's own VerseText, so the weave and the tappable words follow it. */
function PassageText({ passage, view, wovenOf, reading, onLook }: {
  passage: Passage;
  view: ReaderView;
  wovenOf: (verse: Verse) => Woven[] | null;
  reading: number | null;
  onLook: (lookup: Lookup) => void;
}) {
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = reading === null ? null : box.current?.querySelector<HTMLElement>(`[data-passage-verse="${reading}"]`);
    const scroller = el?.closest<HTMLElement>('[data-passage-box]');
    if (!el || !scroller) return;
    const inner = el.getBoundingClientRect();
    const outer = scroller.getBoundingClientRect();
    if (inner.top < outer.top || inner.bottom > outer.bottom) scroller.scrollTop += inner.top - outer.top - 8;
  }, [reading]);
  return (
    <span ref={box} data-passage={passage.first}>
      {passage.verses.map((verse) => (
        <span key={verse.n} data-passage-verse={verse.n} data-reading={reading === verse.n || undefined} className={`rounded-xl ${reading === verse.n ? READING_CLASS : ''}`}>
          <sup className="mr-1 font-sans text-xs font-semibold text-muted">{verse.n}</sup>
          <VerseText verse={verse} view={view} woven={wovenOf(verse)} onLook={onLook} />
        </span>
      ))}
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** The chapter the Reader shows: the one the address names (a book and chapter; a chapter alone is Romans), else the one last open. */
function openFrom(address: string): OpenChapter {
  const named = readerOf(address);
  if (named.book === undefined && named.chapter === undefined) return getOpenChapter();
  return chapterOf(named.book ?? 'rom', named.chapter ?? 1) ?? getOpenChapter();
}

export function Reader() {
  const address = useAddress();
  // A link in the address (#/?ref=… or #/?word=…) is resolved first and replaced by the plain reader address (src/nav/LinkOpener.tsx).
  const link = linkOf(address);
  if (link) return <LinkOpener link={link} />;
  return <ReaderAt address={address} />;
}

function ReaderAt({ address }: { address: string }) {
  const open = openFrom(address);
  // What he has open is kept, so Quick test, the Parsing drill and Review (which draw from it) and the next open follow it.
  const { book, chapter } = open;
  useEffect(() => setOpenChapter(book, chapter), [book, chapter]);
  // Leaving the reader stops the reading. A reading that goes on into the next chapter outlives the chapter's ReaderBody, not this.
  useEffect(() => () => stopReading(), []);
  return <ReaderBody key={`${book}/${chapter}`} open={open} />;
}

/** Whether an address is of this chapter: it says so, or says nothing of the chapter (a bare open). */
const isHere = (a: { book?: string; chapter?: number }, book: string, chapter: number): boolean =>
  a.chapter === undefined || (a.chapter === chapter && (a.book ?? 'rom') === book);

function ReaderBody({ open }: { open: OpenChapter }) {
  const { book: BOOK, chapter: CHAPTER, title: TITLE } = open;
  const [picking, setPicking] = useState(false);
  const closePicker = useCallback(() => setPicking(false), []);
  const view = useLiveQuery(getReaderView, []);
  const weave = useLiveQuery(getWeave, []);
  const weaveGrammar = useLiveQuery(getWeaveGrammar, []);
  const grammarLevels = useLiveQuery(listLevels, []);
  const solid = useLiveQuery(listSolidLemmas, []);
  const learning = useLiveQuery(listLearningLemmas, []);
  const layout = useLiveQuery(getLayout, []);
  const headings = useLiveQuery(getSectionHeadings, []);
  const readSpan = useLiveQuery(getReadSpan, []);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // What the address said when the reader opened (a reopen, Back to an earlier place): the selected verse, and the view
  // and weave to put back in the settings. The address is the place; the settings follow it.
  const [opened] = useState(() => readerOf(window.location.hash));
  const wantView = useRef(opened.view);
  // The weave is switched in Settings, so a reader reached by Back from there must not put an older address's weave
  // back: once the bus has told a weave, the saved setting is the truth and the address only follows it.
  const wantWeave = useRef(latest('weave-changed') ? undefined : opened.weave);
  const scrollRef = useScrollMemory('reader');
  const main = useRef<HTMLElement | null>(null);
  const mainRef = useCallback(
    (el: HTMLElement | null) => {
      main.current = el;
      scrollRef(el);
    },
    [scrollRef],
  );
  const reading = useReading();
  const address = useAddress();
  const current = useRef({ view });
  useEffect(() => {
    current.current = { view };
  });
  const selectedEvent = useLatest('verse-selected');
  const selected = selectedEvent?.chapter === CHAPTER ? selectedEvent.verse : null;
  const [lookup, setLookup] = useState<Lookup | null>(null);
  // The teach sheet (src/TeachSheet.tsx), opened by the 'New words: N' strip.
  const [teaching, setTeaching] = useState(false);
  const pace = usePace();
  const newWords = useNewWords(chapter, solid, learning, pace?.count);
  const { asks, ask } = useAsks(BOOK, CHAPTER, TITLE);
  // A request from another screen (the Parsing drill's links) is met once, as the Reader opens: the Talk sheet on that verse,
  // or the Ask box on it holding the question.
  const [request] = useState(() => {
    const pending = pendingRequest();
    return pending?.chapter === CHAPTER && pending.book === BOOK ? pending : undefined;
  });
  useEffect(() => {
    if (request) takeRequest(request);
  }, [request]);
  // A link in the address (src/nav/linkRequest.ts) is met once, as the Reader opens: its notice, and for a word link the word's sheet.
  const [link] = useState(() => pendingLink(BOOK, CHAPTER));
  useEffect(() => {
    if (link) takeLink(link);
  }, [link]);
  const [notice, setNotice] = useState(link?.notice ?? null);
  const [linked, setLinked] = useState(() => (link?.word ? lemmaSheet(link.word) : null));
  const [prefill, setPrefill] = useState(() => (request?.action === 'ask' ? { verse: request.verse, text: request.question } : null));
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  const checks = useReadChecks(BOOK, CHAPTER, TITLE, view ?? 'english', pronunciation);
  // The Talk sheet: undefined is closed, a number the verse it was opened on, null the chapter. An answer that arrives while
  // its conversation is open on the sheet is read aloud.
  const [talkAbout, setTalkAboutRaw] = useState<number | null | undefined>(() =>
    request?.action === 'talk' || request?.action === 'word' ? request.verse : request?.action === 'paradigm' ? null : undefined,
  );
  // The quiz (the Verse view's Quiz me, mw-5r3p30.74): the verse or passage the open Talk sheet quizzes, else null. Every other way of opening
  // or closing the sheet goes through setTalkAbout, which ends the quiz.
  const [quizUnit, setQuizUnit] = useState<Verse | null>(null);
  const setTalkAbout = useCallback((about: number | null | undefined) => {
    setQuizUnit(null);
    setTalkAboutRaw(about);
  }, []);
  const openTalk = useRef<string | null>(null);
  useEffect(() => {
    openTalk.current = talkAbout === undefined ? null : quizUnit ? scopeRef(BOOK, CHAPTER, { verse: quizUnit, quiz: true }) : talkRef(BOOK, CHAPTER, talkAbout);
  }, [talkAbout, quizUnit, BOOK, CHAPTER]);
  // Push-to-talk (src/useVoice.ts): what he says goes as the turn of the conversation the sheet is open on.
  const sayAbout = useRef<(message: string) => void>(() => {});
  const voice = useVoice((message) => sayAbout.current(message));
  const holding = useRef(false);
  useEffect(() => {
    holding.current = voice.listening;
  });
  const { states: talkStates, say } = useTalk(BOOK, CHAPTER, (ref, id, answer, info) => {
    // an answer that comes while he holds waits: page audio can take the microphone from the recogniser
    if (openTalk.current !== ref || holding.current) return;
    // Sound it out: the word was said before the answer; now each syllable it lists, slowly, one after another.
    if (info.focus?.kind === 'sound' && info.syllables?.length) startAnswer(id, syllableRuns(info.syllables));
    else startAnswer(id, answerRuns(answer));
  });
  // A tap on a verse number opens the Verse view as a Back step of its own; the address then names the verse and the effect below tells the bus.
  const selectVerse = useCallback((n: number) => openVerse(n), []);
  const [action, chooseAction] = useVerseAction();
  // The Parsing drill's Ask the tutor opens the view on the Ask action, holding the question.
  useEffect(() => {
    if (request?.action === 'ask') chooseAction('ask');
  }, [request, chooseAction]);
  const closeSheet = useCallback(() => setLookup(null), []);
  const talkScope: TalkScope | null =
    chapter && talkAbout !== undefined
      ? quizUnit
        ? { title: TITLE, chapter, verse: quizUnit, quiz: true }
        : { title: TITLE, chapter, verse: chapter.verses.find((v) => v.n === talkAbout) ?? null }
      : null;
  const talkKey = talkScope ? scopeRef(BOOK, CHAPTER, talkScope) : null;
  // What he says goes to the open Talk sheet; with none open, to the tutor about the verse of the open Verse view (its Ask the tutor bar).
  const viewVerse = chapter && selected !== null ? chapter.verses.find((v) => v.n === selected) : undefined;
  // A heading's passage (the address `p`) opens the same view, with the passage as one Verse; a verse in the address wins.
  const named = readerOf(address);
  const wantedPassage = isHere(named, BOOK, CHAPTER) ? named.passage : undefined;
  const viewPassage = useMemo(
    () => (chapter && viewVerse === undefined && wantedPassage !== undefined ? passageAt(chapter.verses, wantedPassage) : undefined),
    [chapter, viewVerse, wantedPassage],
  );
  const viewUnit = useMemo(() => viewVerse ?? (viewPassage ? passageVerse(viewPassage) : undefined), [viewVerse, viewPassage]);
  const viewAsking = viewUnit !== undefined && action === 'ask';
  // Quiz me: the quiz about the unit the view shows is begun when it has no turn yet and nothing is on its way; the button then says Continue.
  const quizKey = viewUnit ? scopeRef(BOOK, CHAPTER, { verse: viewUnit, quiz: true }) : null;
  const quizTurns = useLiveQuery(() => (quizKey ? listTurns(quizKey) : Promise.resolve([])), [quizKey]);
  const openQuiz = useCallback(() => {
    if (!chapter || !viewUnit || !quizKey) return;
    voice.abort();
    setQuizUnit(viewUnit);
    setTalkAboutRaw(viewUnit.n);
    if (quizTurns?.length === 0 && !talkStates[quizKey]) {
      say({ title: TITLE, chapter, verse: viewUnit, quiz: true }, quizMeQuestion(scopeTitle({ title: TITLE, verse: viewUnit })));
    }
  }, [chapter, viewUnit, quizKey, quizTurns, talkStates, voice, say, TITLE]);
  useEffect(() => {
    sayAbout.current = (message) => {
      if (talkScope) say(talkScope, message);
      else if (viewAsking && viewUnit) ask(viewUnit, message);
    };
  });
  // Ask the tutor on a paradigm table (src/ParadigmsScreen.tsx): the Talk sheet is open on the chapter; once the chapter is here the first
  // question goes with the table's name and the forms he revealed.
  const paradigmSent = useRef(false);
  useEffect(() => {
    if (request?.action !== 'paradigm' || !chapter || paradigmSent.current) return;
    paradigmSent.current = true;
    say({ title: TITLE, chapter, verse: null }, paradigmQuestion(request.table, request.revealed.length), {
      kind: 'paradigm',
      table: request.table,
      revealed: request.revealed,
    });
  }, [request, chapter, say, TITLE]);
  // The Quick test's Ask the tutor: the Talk sheet is open on the word's verse; once the chapter is here the first question goes with
  // the focus it was asked with (the word, the question, his answers so far).
  const wordSent = useRef(false);
  useEffect(() => {
    if (request?.action !== 'word' || !chapter || wordSent.current) return;
    wordSent.current = true;
    const verse = chapter.verses.find((v) => v.n === request.verse) ?? null;
    say({ title: TITLE, chapter, verse }, request.question, request.focus);
  }, [request, chapter, say, TITLE]);
  // A hold opens the sheet about `about` and listens, unless that conversation is still waiting for its answer.
  const holdTalk = useCallback(
    (about: number | null) => {
      setTalkAbout(about);
      const state = talkStates[talkRef(BOOK, CHAPTER, about)];
      if (state?.phase === 'sending' || state?.phase === 'waiting') return;
      voice.press();
    },
    [talkStates, voice, setTalkAbout, BOOK, CHAPTER],
  );
  // Help with this word (the word sheet's Grammar | Sound it out): the Talk sheet on the word's verse, the first question sent.
  // Sound it out says the word, slowly, now (straight from the tap); a conversation still waiting for its answer is only shown.
  const helpWithWord = useCallback(
    (help: WordHelp) => {
      if (!chapter) return;
      const verse = chapter.verses.find((v) => v.n === help.verse) ?? null;
      const scope = { title: TITLE, chapter, verse };
      const focus: WordFocus = { form: help.form, lemma: help.lemma, parse: help.parse, kind: help.kind };
      publish({ kind: 'word-help', help: help.kind, form: focus.form, lemma: focus.lemma, parse: focus.parse, chapter: CHAPTER, verse: help.verse });
      voice.abort();
      setTalkAbout(help.verse);
      const state = talkStates[talkRef(BOOK, CHAPTER, help.verse)];
      if (state?.phase === 'sending' || state?.phase === 'waiting') return;
      if (help.kind === 'sound') speakWord(help.form, 'greek', true);
      say(scope, helpQuestion(focus, scopeTitle(scope)), focus);
    },
    [chapter, talkStates, voice, say, setTalkAbout, BOOK, CHAPTER, TITLE],
  );
  // Ask the tutor on a Grammar sheet: the Talk sheet on the verse of the word the term was tapped on, the first question sent.
  const askAboutTerm = useCallback(
    (ask: TermAsk) => {
      if (!chapter) return;
      const verse = chapter.verses.find((v) => v.n === ask.verse) ?? null;
      const scope = { title: TITLE, chapter, verse };
      voice.abort();
      setTalkAbout(ask.verse);
      const state = talkStates[talkRef(BOOK, CHAPTER, ask.verse)];
      if (state?.phase === 'sending' || state?.phase === 'waiting') return;
      say(scope, termQuestion(ask.term, scopeTitle(scope)), { term: ask.term, kind: 'grammar-term' });
    },
    [chapter, talkStates, voice, say, setTalkAbout, BOOK, CHAPTER, TITLE],
  );
  // Ask the tutor on the teach sheet: the Talk sheet on the verse the new word was shown in, the first question sent.
  const askAboutNewWord = useCallback(
    (asked: NewWordAsk) => {
      if (!chapter) return;
      const verse = chapter.verses.find((v) => v.n === asked.verse) ?? null;
      const scope = { title: TITLE, chapter, verse };
      voice.abort();
      setTalkAbout(asked.verse);
      const state = talkStates[talkRef(BOOK, CHAPTER, asked.verse)];
      if (state?.phase === 'sending' || state?.phase === 'waiting') return;
      say(scope, newWordQuestion(asked.lemma, asked.gloss, scopeTitle(scope)));
    },
    [chapter, talkStates, voice, say, setTalkAbout, BOOK, CHAPTER, TITLE],
  );
  // The verse number on the teach sheet: the reading box is scrolled so that verse stands at its top. The verse is not selected: that
  // would open its Verse view over the Reader.
  const showVerse = useCallback((n: number) => {
    const box = main.current;
    const el = box?.querySelector<HTMLElement>(`[data-verse="${n}"]`);
    if (box && el) box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
  }, []);
  const closeTeach = useCallback(() => setTeaching(false), []);
  const verseTalk: VerseTalk = { onHold: holdTalk, onRelease: () => void voice.release(), onDrop: voice.abort };
  // The Verse view's Read bar: the hold of the reading check for the verse the view shows.
  const readOf = (verse: Verse): ReadHold => {
    const phase = checks.states[unitId(verse)]?.phase;
    return {
      onPress: () => checks.press(verse),
      onRelease: checks.release,
      onDrop: checks.drop,
      disabled: phase === 'sending' || phase === 'waiting',
    };
  };
  const weaving = view === 'english' && (weave === 'solid' || weave === 'solid+learning');
  const withLearning = weave === 'solid+learning';
  // The grammar dial: with it on, a form stays English unless every idea its parsing needs is at that level (the dial is not in the address).
  const woven = useMemo(() => {
    if (!chapter || !weaving) return null;
    const formOk =
      weaveGrammar === undefined || grammarLevels === undefined
        ? () => false // the dial is still loading: weave nothing rather than flash a verse that then narrows
        : weaveGrammar === 'any'
          ? undefined
          : (w: GreekWord) => formPasses(w.p, grammarLevels, weaveGrammar);
    return chapter.verses.map((v) =>
      weaveVerse(v, { solid: solid ?? EMPTY_LEMMAS, learning: withLearning ? learning ?? EMPTY_LEMMAS : undefined, formPasses: formOk }),
    );
  }, [chapter, weaving, withLearning, solid, learning, weaveGrammar, grammarLevels]);
  // What is read is what is shown: the plan follows the view and the weave.
  const plan = useMemo(() => (chapter && view ? planOf(chapter.verses, view, woven) : null), [chapter, view, woven]);
  const readFrom = useCallback(
    (from: number, continuous: boolean) => {
      if (plan) startReading({ book: BOOK, chapter: CHAPTER, plan, from, continuous, span: readSpan });
    },
    [plan, BOOK, CHAPTER, readSpan],
  );
  // Listen on a passage: its verses only, to the end of the passage and no further, whatever Settings > Read aloud says.
  const listenTo = useCallback(
    (passage: Passage) => {
      if (plan) startReading({ chapter: CHAPTER, plan: plan.filter((v) => v.n >= passage.first && v.n <= passage.last), from: passage.first, continuous: true, span: 'passage' });
    },
    [plan, CHAPTER],
  );
  const chapterReading = reading.status !== 'idle' && reading.answer === null;
  const readingVerse = chapterReading ? reading.verse : null;
  const passages = useMemo(() => (chapter ? passagesOf(chapter.verses) : []), [chapter]);
  const blocks = useMemo(() => (chapter && layout ? blocksOf(chapter.verses, layout) : []), [chapter, layout]);
  const wovenCount = woven ? woven.reduce((n, w) => n + w.filter(Boolean).length, 0) : 0;

  // The selection is not kept when the reader goes away; the bus holds it only while the reader is on screen.
  useEffect(() => {
    const verse = isHere(opened, BOOK, CHAPTER) ? opened.verse ?? null : null;
    publish({ kind: 'chapter-opened', book: BOOK, chapter: CHAPTER });
    publish({ kind: 'verse-selected', chapter: CHAPTER, verse });
    return () => publish({ kind: 'verse-selected', chapter: CHAPTER, verse: null });
  }, [opened, BOOK, CHAPTER]);
  // Back or Forward to another entry of the reader (the verse, view or weave of that entry) puts that entry's state back.
  useEffect(() => {
    const here = readerOf(address);
    const verse = isHere(here, BOOK, CHAPTER) ? here.verse ?? null : null;
    if ((latest('verse-selected')?.verse ?? null) !== verse) publish({ kind: 'verse-selected', chapter: CHAPTER, verse });
    const { view: shown } = current.current;
    if (here.view && shown && here.view !== shown) void setReaderView(here.view);
  }, [address, BOOK, CHAPTER]);
  useEffect(() => {
    if (!view) return;
    if (wantView.current && wantView.current !== view) {
      void setReaderView(wantView.current);
      return;
    }
    wantView.current = undefined;
    publish({ kind: 'view-changed', view });
  }, [view]);
  useEffect(() => {
    if (!weave) return;
    if (wantWeave.current && wantWeave.current !== weave) {
      void setWeave(wantWeave.current);
      return;
    }
    wantWeave.current = undefined;
    publish({ kind: 'weave-changed', weave });
  }, [weave]);

  useEffect(() => {
    if (plan) updatePlan(plan);
  }, [plan]);
  // A reading that went on into this chapter (the Read aloud span, src/speech/readAloud.ts) starts its first verse once the plan is here.
  const crossing = reading.crossing;
  const crossingHere = crossing !== null && crossing.book === BOOK && crossing.chapter === CHAPTER;
  const readingStatus = reading.status;
  useEffect(() => {
    if (plan && crossingHere && readingStatus === 'reading') continueReading({ book: BOOK, chapter: CHAPTER, plan });
  }, [plan, crossingHere, readingStatus, BOOK, CHAPTER]);
  // A chapter that cannot be fetched ends the reading that was going on into it.
  useEffect(() => {
    if (failed && crossingHere) stopReading();
  }, [failed, crossingHere]);
  // Choosing another chapter than the one a reading was going on into ends it; going on into this one is not leaving it.
  useEffect(() => {
    const going = getReading().crossing;
    if (going && !(going.book === BOOK && going.chapter === CHAPTER)) stopReading();
  }, [BOOK, CHAPTER]);
  // Leaving this chapter stops the reading, unless it is going on into the next (ReaderAt stops it when the reader is left).
  useEffect(() => {
    void warmVoices();
    return () => {
      if (!getReading().crossing) stopReading();
    };
  }, []);
  // The verse being read is kept in view, by moving this box and nothing else.
  useEffect(() => {
    const box = main.current;
    const el = readingVerse === null ? null : box?.querySelector<HTMLElement>(`[data-verse="${readingVerse}"]`);
    if (!box || !el) return;
    const margin = 16;
    const bar = box.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    if (rect.top < bar.top + margin || rect.bottom > bar.bottom - margin) box.scrollTop += rect.top - bar.top - margin;
  }, [readingVerse]);

  useEffect(() => {
    if (layout) publish({ kind: 'layout-changed', layout });
  }, [layout]);
  useEffect(() => {
    if (headings) publish({ kind: 'headings-changed', headings });
  }, [headings]);

  useEffect(() => {
    let current = true;
    loadChapter(BOOK, CHAPTER).then(
      (c) => current && (setFailed(false), setChapter(c)),
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [attempt, BOOK, CHAPTER]);

  return (
    <>
      <header inert={viewUnit !== undefined} className="flex shrink-0 items-center gap-1 border-b border-line px-2 py-2">
        {/* While the chapter is read the header gives its room to Pause and Stop; the title stays for screen readers. */}
        <h1 className={`chrome-title min-w-0 font-semibold ${chapterReading ? 'sr-only' : 'flex-1'}`}>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setPicking(true)}
            className="flex min-h-12 max-w-full items-center gap-0.5 rounded-lg text-left font-semibold active:bg-line"
          >
            <span className="truncate">{TITLE}</span>
            <span className="shrink-0 text-accent">
              <ChevronIcon />
            </span>
          </button>
        </h1>
        {chapterReading ? <span className="flex-1" /> : null}
        {view ? <ViewSwitch view={view} /> : null}
        {plan || crossingHere ? <ReadFromButton from={selected} reading={reading} onRead={() => readFrom(selected ?? 1, true)} /> : null}
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate('settings')}
          className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-lg text-accent active:bg-line"
        >
          <GearIcon />
        </button>
      </header>
      {chapterReading ? null : <DueBadge />}
      {chapterReading ? null : <GoalStrip />}
      {chapterReading ? null : <TipCard />}
      {chapterReading ? null : <NewWordsStrip count={newWords?.length ?? 0} onOpen={() => setTeaching(true)} />}
      {notice ? (
        <div role="status" data-link-notice className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-1 text-sm">
          <p className="min-w-0 flex-1">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent active:bg-line">
            Dismiss
          </button>
        </div>
      ) : null}
      <ReadingBar reading={reading} />
      {woven ? (
        <p data-testid="weave-count" className="shrink-0 border-b border-line px-3 py-1 text-right text-sm text-muted">
          {wovenCount} {wovenCount === 1 ? 'word' : 'words'} in Greek
        </p>
      ) : null}
      <main ref={mainRef} inert={viewUnit !== undefined} data-reader data-view={view} data-weave={weave} data-layout={layout} data-headings={headings} data-read-span={readSpan} className="screen min-h-0 flex-1 px-1 pt-2">
        <div>
        {failed ? (
          <div role="alert" className="px-4 pt-6 text-center">
            {navigator.onLine === false ? (
              <p className="text-lg">{TITLE} is not on this phone yet, and you are offline. Connect to read it.</p>
            ) : (
              <p className="text-lg">Could not load {TITLE}.</p>
            )}
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-4 min-h-12 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="mt-3 block min-h-12 w-full rounded-xl border border-line text-lg font-medium"
            >
              Choose another chapter
            </button>
          </div>
        ) : chapter && view && layout && headings ? (
          <>
            {blocks.map((block) => {
              const first = block[0];
              const wovenOf = (v: Verse) => woven?.[chapter.verses.indexOf(v)] ?? null;
              return (
                <Fragment key={first.n}>
                  {headings === 'on' && first.h ? <SectionHeading text={first.h} onOpen={() => openPassage(first.n)} /> : null}
                  {layout === 'paragraph' ? (
                    <ParagraphView
                      verses={block}
                      view={view}
                      woven={block.map(wovenOf)}
                      selected={selected}
                      reading={readingVerse}
                      onSelect={selectVerse}
                      onPlay={(n) => readFrom(n, false)}
                      onLook={setLookup}
                      talk={verseTalk}
                    />
                  ) : (
                    <VerseLine
                      verse={first}
                      view={view}
                      woven={wovenOf(first)}
                      selected={selected === first.n}
                      reading={readingVerse === first.n}
                      onSelect={() => selectVerse(first.n)}
                      onPlay={() => readFrom(first.n, false)}
                      onLook={setLookup}
                      talk={verseTalk}
                    />
                  )}
                </Fragment>
              );
            })}
            <ChapterNav book={BOOK} chapter={CHAPTER} />
            <BuildVersion className="px-3 pt-6" />
            <div className="flex justify-center pb-4">
              <HeaderButton onClick={() => navigate('about')}>About</HeaderButton>
            </div>
          </>
        ) : (
          <p role="status" className="px-4 pt-6 text-center text-muted">
            Loading {TITLE}…
          </p>
        )}
        </div>
      </main>
      {chapter && !viewUnit ? (
        <TalkBar
          hold={{
            onPress: stopReading,
            onTap: () => setTalkAbout(selected),
            onHold: () => holdTalk(selected),
            onRelease: () => void voice.release(),
            onDrop: voice.abort,
          }}
        />
      ) : null}
      {talkScope && talkAbout !== undefined ? (
        <TalkSheet
          scope={talkScope}
          talkRef={talkKey ?? talkRef(BOOK, CHAPTER, talkAbout)}
          state={talkStates[talkKey ?? talkRef(BOOK, CHAPTER, talkAbout)]}
          voice={voice}
          onSay={(message) => say(talkScope, message)}
          onHelp={helpWithWord}
          onAskTerm={askAboutTerm}
          onClose={() => {
            voice.abort();
            voice.clearNotice();
            setTalkAbout(undefined);
          }}
        />
      ) : null}
      {chapter && teaching && newWords ? (
        <TeachSheet
          chapter={chapter}
          title={TITLE}
          candidates={newWords}
          solid={solid ?? EMPTY_LEMMAS}
          onClose={closeTeach}
          onShowVerse={showVerse}
          onAsk={askAboutNewWord}
        />
      ) : null}
      {chapter && viewUnit && view ? (
        <VerseView
          title={TITLE}
          book={BOOK}
          chapter={CHAPTER}
          verse={viewUnit}
          view={view}
          text={
            viewPassage ? (
              <PassageText
                passage={viewPassage}
                view={view}
                wovenOf={(v) => woven?.[chapter.verses.indexOf(v)] ?? null}
                reading={readingVerse}
                onLook={setLookup}
              />
            ) : (
              <VerseText verse={viewUnit} view={view} woven={woven?.[chapter.verses.indexOf(viewUnit)] ?? null} onLook={setLookup} />
            )
          }
          previous={viewPassage ? stepOf(passages, viewPassage, -1) : stepOfVerse(verseNeighbours(BOOK, CHAPTER, viewUnit.n).previous)}
          next={viewPassage ? stepOf(passages, viewPassage, 1) : stepOfVerse(verseNeighbours(BOOK, CHAPTER, viewUnit.n).next)}
          onClose={closeVerse}
          action={action}
          onAction={chooseAction}
          listen={viewPassage ? { onHold: () => listenTo(viewPassage), onRelease: stopReading } : { onHold: () => readFrom(viewUnit.n, true), onRelease: stopReading }}
          checks={checks}
          read={readOf(viewUnit)}
          onRetryRead={() => checks.retry(viewUnit)}
          ask={asks[unitId(viewUnit)]}
          onAsk={(verse, question) => {
            setPrefill(null);
            ask(verse, question);
          }}
          prefill={prefill}
          voice={voice}
          onTalk={() => setTalkAbout(viewUnit.n)}
          quiz={{ started: (quizTurns?.length ?? 0) > 0 || (quizKey !== null && talkStates[quizKey] !== undefined), onOpen: openQuiz }}
        />
      ) : null}
      {picking ? <ChapterPicker current={open} onClose={closePicker} /> : null}
      {linked ? <WordSheet chapter={linked.chapter} lookup={linked.lookup} onClose={() => setLinked(null)} /> : null}
      {chapter && lookup ? <WordSheet chapter={chapter} lookup={lookup} onClose={closeSheet} onHelp={helpWithWord} onAskTerm={askAboutTerm} /> : null}
    </>
  );
}
