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
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReadHold } from './ReadCheck';
import { VerseView } from './VerseView';
import { useVerseAction } from './verse/action';
import { ASK_BUTTON_ROOM, AskTutorButton, TALK_BAR_LIFT } from './AskTutor';
import { TalkBar, TalkSheet } from './Talk';
import { ErrorBoundary } from './ErrorBoundary';
import { type Chapter, type GreekWord, type Verse, loadChapter } from './data/chapter';
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
  setWeave,
  talkRef,
  type ReaderView,
} from './data/repositories';
import { chapterOf, getOpenChapter, setOpenChapter, type OpenChapter } from './data/readerChapter';
import { verseNeighbours } from './data/neighbours';
import { type Passage, passageAt, passageVerse, passagesOf, unitId } from './data/passage';
import { ChapterNav } from './ChapterNav';
import { ChapterPicker } from './ChapterPicker';
import { weaveVerse } from './data/weave';
import { BuildVersion } from './BuildVersion';
import { latest, publish, useLatest } from './events/bus';
import { blocksOf } from './layout/layouts';
import { LinkOpener } from './nav/LinkOpener';
import { pendingLink, takeLink } from './nav/linkRequest';
import { lemmaSheet, linkOf } from './nav/links';
import { pendingRequest, takeRequest } from './nav/readerRequest';
import { closeVerse, movePassage, moveVerse, navigate, openPassage, openVerse, readerOf, routeOf, useAddress } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { useAsks } from './useAsks';
import { useReadChecks } from './useReadChecks';
import { useReaderTutor } from './reader/useReaderTutor';
import { READER_SUGGESTIONS } from './tutor/screen';
import { useTalk } from './useTalk';
import { useVoice } from './useVoice';
import { HeaderButton } from './ScreenHeader';
import { speakTutor } from './speech/tutorVoice';
import { continueReading, getReading, isReadingOf, pauseReading, planOf, startAnswer, startReading, stopReading, updatePlan, useReading } from './speech/readAloud';
import { answerRuns, syllableRuns } from './speech/answerRuns';
import { ReaderChips } from './ReaderChips';
import { TeachSheet } from './TeachSheet';
import { useNewWords } from './useNewWords';
import { usePace } from './usePace';
import { TipCard } from './tips/TipCard';
import { ReadFromButton, ReadingBar } from './speech/ReadControls';
import { BarSlot } from './speech/SpeakingBarSlot';
import { warmVoices } from './speech/greek';
import { WordSheet, type Lookup } from './WordSheet';
import { PassageText, ParagraphView, SectionHeading, VerseLine } from './reader/ChapterText';
import { VerseText, type VerseTalk } from './reader/VerseText';

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
  // A throw while the chapter draws shows the error screen with Reload, not a black page (src/ErrorBoundary.tsx); another chapter starts afresh.
  return (
    <ErrorBoundary key={`${book}/${chapter}`} where="reader">
      <ReaderBody open={open} />
    </ErrorBoundary>
  );
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
  // The teach sheet (src/TeachSheet.tsx), opened by the 'New N' chip.
  const [teaching, setTeaching] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
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
  // The conversation the Talk sheet is open on (kept current by useReaderTutor); an answer that comes while its sheet is open is read aloud.
  const openTalkRef = useRef<string | null>(null);
  // Push-to-talk (src/useVoice.ts): what he says goes as the turn of the conversation the sheet is open on.
  const sayAbout = useRef<(message: string) => void>(() => {});
  const voice = useVoice((message) => sayAbout.current(message));
  const holding = useRef(false);
  useEffect(() => {
    holding.current = voice.listening;
  });
  const talk = useTalk(BOOK, CHAPTER, (ref, id, answer, info) => {
    // an answer that comes while he holds waits: page audio can take the microphone from the recogniser
    if (openTalkRef.current !== ref || holding.current) return;
    // Sound it out: the word was said before the answer; now each syllable it lists, slowly, one after another.
    if (info.focus?.kind === 'sound' && !info.focus.language && info.syllables?.length) startAnswer(id, syllableRuns(info.syllables));
    else speakTutor(id, answerRuns(answer), () => openTalkRef.current === ref);
  });
  // A tap on a verse number opens the Verse view as a Back step of its own; the address then names the verse and the effect below tells the bus.
  const selectVerse = useCallback((n: number) => openVerse(n), []);
  const [action, chooseAction] = useVerseAction();
  // The Parsing drill's Ask the tutor opens the view on the Ask action, holding the question.
  useEffect(() => {
    if (request?.action === 'ask') chooseAction('ask');
  }, [request, chooseAction]);
  const closeSheet = useCallback(() => setLookup(null), []);
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
  const tutor = useReaderTutor(open, chapter, talk, voice, { request, viewUnit, openTalkRef });
  const { talkScope, talkKey, talkAbout, setTalkAbout, holdTalk } = tutor;
  // What he says goes to the open Talk sheet; with none open, to the tutor about the verse of the open Verse view (its Ask the tutor bar).
  useEffect(() => {
    sayAbout.current = (message) => {
      if (talkScope) talk.say(talkScope, message);
      else if (viewAsking && viewUnit) ask(viewUnit, message);
    };
  });
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
      if (plan) startReading({ inBook: BOOK, chapter: CHAPTER, plan: plan.filter((v) => v.n >= passage.first && v.n <= passage.last), from: passage.first, continuous: true, span: 'passage' });
    },
    [plan, BOOK, CHAPTER],
  );
  const chapterReading = reading.status !== 'idle' && reading.answer === null;
  const readingVerse = chapterReading ? reading.verse : null;
  const headerButtons = chapterReading && !reading.onBar;
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
  // Leaving this screen for another pauses the reading, and coming back offers Resume on the bar (bsv-kit/speech); opening another chapter ends it,
  // and so does coming to a chapter that is not the one a paused reading belongs to. Going on into the next chapter is not leaving.
  useEffect(() => {
    void warmVoices();
    const paused = getReading();
    if (paused.status === 'paused' && paused.answer === null && !paused.crossing && !isReadingOf(BOOK, CHAPTER)) stopReading();
    return () => {
      if (getReading().crossing) return;
      if (routeOf(window.location.hash) === 'home') stopReading();
      else pauseReading();
    };
  }, [BOOK, CHAPTER]);
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
      <header inert={viewUnit !== undefined} className="flex shrink-0 items-center gap-1 border-b border-line px-2">
        {/* While a reading the bar does not hold waits for Pause or Play, the header gives its room to those and Stop; the title stays for screen readers. */}
        <h1 className={`chrome-title min-w-0 font-semibold ${headerButtons ? 'sr-only' : 'flex-1'}`}>
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
        {headerButtons ? <span className="flex-1" /> : null}
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
      <ReaderChips
        hidden={chapterReading}
        newWords={newWords?.length ?? 0}
        onTeach={() => setTeaching(true)}
        tipOpen={tipOpen}
        onTip={() => setTipOpen((open) => !open)}
        wovenCount={woven ? wovenCount : null}
      />
      {chapterReading || !tipOpen ? null : <TipCard onClose={() => setTipOpen(false)} />}
      {notice ? (
        <div role="status" data-link-notice className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-1 text-sm">
          <p className="min-w-0 flex-1">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent active:bg-line">
            Dismiss
          </button>
        </div>
      ) : null}
      <ReadingBar reading={reading} />
      <main ref={mainRef} inert={viewUnit !== undefined} data-reader data-view={view} data-weave={weave} data-layout={layout} data-headings={headings} data-read-span={readSpan} style={chapter ? { marginBottom: `calc(${ASK_BUTTON_ROOM})` } : undefined} className="screen min-h-0 flex-1 px-1 pt-2">
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
      <BarSlot level={1} />
      {chapter && !viewUnit ? (
        <TalkBar
          hold={{
            onPress: pauseReading,
            onTap: () => setTalkAbout(selected),
            onHold: () => holdTalk(selected),
            onRelease: () => void voice.release(),
            onDrop: voice.abort,
          }}
        />
      ) : null}
      {chapter && !viewUnit ? (
        <AskTutorButton
          lift={TALK_BAR_LIFT}
          onClick={() => {
            stopReading();
            voice.abort();
            setTalkAbout(null);
          }}
        />
      ) : null}
      {talkScope && talkAbout !== undefined ? (
        <TalkSheet
          scope={talkScope}
          suggestions={talkScope.verse === null && !talkScope.quiz ? READER_SUGGESTIONS : undefined}
          talkRef={talkKey ?? talkRef(BOOK, CHAPTER, talkAbout)}
          state={talk.states[talkKey ?? talkRef(BOOK, CHAPTER, talkAbout)]}
          voice={voice}
          onSay={(message, focus) => talk.say(talkScope, message, focus)}
          onHelp={tutor.helpWithWord}
          onAskTerm={tutor.askAboutTerm}
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
          onAsk={tutor.askAboutNewWord}
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
          listen={viewPassage ? { onHold: () => listenTo(viewPassage), onRelease: stopReading } : { onHold: () => readFrom(viewUnit.n, false), onRelease: stopReading }}
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
          quiz={{ started: tutor.quizStarted, onOpen: tutor.openQuiz }}
        />
      ) : null}
      {picking ? <ChapterPicker current={open} onClose={closePicker} /> : null}
      {linked ? <WordSheet chapter={linked.chapter} lookup={linked.lookup} onClose={() => setLinked(null)} /> : null}
      {chapter && lookup ? <WordSheet chapter={chapter} lookup={lookup} onClose={closeSheet} onHelp={tutor.helpWithWord} onAskTerm={tutor.askAboutTerm} /> : null}
    </>
  );
}
