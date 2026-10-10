// src/Reader.tsx — a chapter verse by verse (Romans 8 on a fresh install; the title opens the picker, src/ChapterPicker.tsx): the composition (docs/module-map.md R1).
// It draws with src/reader/ (ChapterText, VerseText, ReaderHeader, ChapterFailed), reads through useReaderSettings, useChapter, useWoven, useReadFrom and
// useReaderTutor, and keeps the scroll, reading-position and selection effects. English (the MSB) | Greek (Byzantine); every word is tappable and opens the
// word sheet; a tapped verse number opens the Verse view (src/VerseView.tsx, docs/verse-view.md) over the Reader as a Back step of its own (src/nav/route.ts
// openVerse), and a section heading opens it for its passage (src/data/passage.ts). The address is the truth: its verse (v) is "selected" while the view is open.
// The selection, the view and the weave are told to the rest of the app on the event bus (src/events/bus.ts, docs/events.md). The chapter comes from
// /data/<book>/<n>.json; which chapter is open is the address's (b and c), else the one last open (src/data/readerChapter.ts); a chapter is a
// ReaderBody keyed by it, so choosing another starts the screen afresh.
import { useLiveQuery } from 'dexie-react-hooks';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReadHold } from './ReadCheck';
import { VerseView } from './VerseView';
import { useVerseAction } from './verse/action';
import { Away } from './Away';
import { useImmersive } from './immersive';
import { ASK_BUTTON_ROOM, AskTutorButton, TALK_BAR_LIFT } from './AskTutor';
import { TalkBar, TalkSheet } from './Talk';
import { ErrorBoundary } from './ErrorBoundary';
import type { Verse } from './data/chapter';
import { getGreekPronunciation, getImmersive, setReaderView, talkRef } from './data/repositories';
import { chapterOf, getOpenChapter, setOpenChapter, type OpenChapter } from './data/readerChapter';
import { verseNeighbours } from './data/neighbours';
import { passageAt, passageVerse, passagesOf, unitId } from './data/passage';
import { ChapterNav } from './ChapterNav';
import { ChapterPicker } from './ChapterPicker';
import { BuildVersion } from './BuildVersion';
import { latest, publish, useLatest } from './events/bus';
import { blocksOf } from './layout/layouts';
import { LinkOpener } from './nav/LinkOpener';
import { pendingLink, takeLink } from './nav/linkRequest';
import { lemmaSheet, linkOf } from './nav/links';
import { pendingRequest, takeRequest } from './nav/readerRequest';
import { closeVerse, navigate, openPassage, openVerse, readerOf, routeOf, useAddress } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { useAsks } from './useAsks';
import { useReadChecks } from './useReadChecks';
import { stepOf, stepOfVerse } from './reader/steps';
import { LinkNotice } from './reader/LinkNotice';
import { SwipeNote } from './reader/SwipeNote';
import { type SwipeEnd, useChapterSwipe } from './reader/useChapterSwipe';
import { useSheetOpen } from './ui/sheetBack';
import { BOOKS } from './data/books';
import { ChapterFailed } from './reader/ChapterFailed';
import { useChapter } from './reader/useChapter';
import { useReadFrom } from './reader/useReadFrom';
import { useWoven } from './reader/useWoven';
import { ReaderHeader } from './reader/ReaderHeader';
import { useReaderSettings, type ReaderSettings } from './reader/useReaderSettings';
import { useReaderTutor } from './reader/useReaderTutor';
import { READER_SUGGESTIONS } from './tutor/screen';
import { useTalk } from './useTalk';
import { useVoice } from './useVoice';
import { HeaderButton } from './ScreenHeader';
import { speakTutor } from './speech/tutorVoice';
import { continueReading, getReading, isReadingOf, pauseReading, startAnswer, stopReading, updatePlan, useReading } from './speech/readAloud';
import { answerRuns, syllableRuns } from './speech/answerRuns';
import { ReaderChips } from './ReaderChips';
import { TeachSheet } from './TeachSheet';
import { useNewWords } from './useNewWords';
import { usePace } from './usePace';
import { TipCard } from './tips/TipCard';
import { ReadingBar } from './speech/ReadControls';
import { BarSlot } from './speech/SpeakingBarSlot';
import { warmVoices } from './speech/greek';
import { WordSheet, type Lookup } from './WordSheet';
import { PassageText, ParagraphView, SectionHeading, VerseLine } from './reader/ChapterText';
import { VerseText, type VerseTalk } from './reader/VerseText';
import { takeWaitingPictures } from './talk/outbox';

const NO_SETTINGS: Partial<ReaderSettings> = {};
const EMPTY_LEMMAS: ReadonlySet<string> = new Set();

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
  const settings = useReaderSettings() ?? NO_SETTINGS;
  const { view, weave, solid, learning, layout, headings, readSpan } = settings;
  const immersive = useLiveQuery(getImmersive, []) === 'on';
  const { chapter, failed, retry } = useChapter(BOOK, CHAPTER);
  // What the address said when the reader opened (a reopen, Back to an earlier place): the selected verse (the view and weave it names are
  // put back in the settings by useReaderSettings). The address is the place; the settings follow it.
  const [opened] = useState(() => readerOf(window.location.hash));
  const scrollRef = useScrollMemory('reader');
  const main = useRef<HTMLElement | null>(null);
  const mainRef = useCallback(
    (el: HTMLElement | null) => {
      main.current = el;
      scrollRef(el);
    },
    [scrollRef],
  );
  // The Immersive reader (src/immersive.ts): the bars slide away while he scrolls the text down.
  const bars = useImmersive(immersive, main);
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
  // Swiping the text goes to the next or previous chapter (src/reader/useChapterSwipe.ts); past Matthew 1 or Revelation 22 a short note says so.
  const sheetOpen = useSheetOpen();
  const inner = useRef<HTMLDivElement | null>(null);
  const [swipeEnd, setSwipeEnd] = useState<SwipeEnd | null>(null);
  const dismissSwipeNote = useCallback(() => setSwipeEnd(null), []);
  useChapterSwipe(main, inner, BOOK, CHAPTER, sheetOpen, setSwipeEnd);
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
  const tutor = useReaderTutor(open, chapter, talk, voice, { request, viewUnit, openTalkRef });
  const { talkScope, talkKey, talkAbout, setTalkAbout, holdTalk } = tutor;
  // What he says goes to the open Talk sheet (the Verse view's Ask the tutor has its own composer, src/Ask.tsx).
  useEffect(() => {
    sayAbout.current = (message) => {
      if (talkScope) talk.say(talkScope, message, undefined, takeWaitingPictures());
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
    return { onPress: () => checks.press(verse), onRelease: checks.release, onDrop: checks.drop, disabled: phase === 'sending' || phase === 'waiting' };
  };
  const woven = useWoven(chapter, settings);
  const { plan, readFrom, listenTo, listenVerse, listenedView } = useReadFrom(BOOK, CHAPTER, chapter, view, woven, readSpan, viewUnit);
  const chapterReading = reading.status !== 'idle' && reading.answer === null;
  const readingVerse = chapterReading ? reading.verse : null;
  const headerButtons = chapterReading && !reading.onBar;
  // The bars come back whenever a sheet closes (or the Verse view does) and reading aloud stops, and stay away only while the header holds no reading control.
  const covered = Boolean(lookup || linked || talkAbout !== undefined || teaching || picking || viewUnit !== undefined || chapterReading);
  const { show: showBars } = bars;
  useEffect(() => {
    if (!covered) showBars();
  }, [covered, showBars]);
  const away = bars.away && !headerButtons;
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

  return (
    <>
      <Away enabled={immersive} away={away}>
      <ReaderHeader
        title={TITLE}
        view={view}
        chapterReading={chapterReading}
        reading={reading}
        from={selected}
        canRead={plan !== null || crossingHere}
        inert={viewUnit !== undefined}
        onPick={() => setPicking(true)}
        onRead={() => readFrom(selected ?? 1, true)}
      />
      <ReaderChips
        hidden={chapterReading}
        newWords={newWords?.length ?? 0}
        onTeach={() => setTeaching(true)}
        tipOpen={tipOpen}
        onTip={() => setTipOpen((open) => !open)}
        wovenCount={woven ? wovenCount : null}
      />
      {chapterReading || !tipOpen ? null : <TipCard onClose={() => setTipOpen(false)} />}
      </Away>
      {notice ? <LinkNotice text={notice} onDismiss={() => setNotice(null)} /> : null}
      {swipeEnd ? <SwipeNote end={swipeEnd} lastBook={BOOKS[BOOKS.length - 1].name} onDismiss={dismissSwipeNote} /> : null}
      <ReadingBar reading={reading} />
      <main ref={mainRef} inert={viewUnit !== undefined} data-reader data-view={view} data-weave={weave} data-layout={layout} data-headings={headings} data-read-span={readSpan} data-immersive={immersive ? 'on' : 'off'} style={chapter ? { marginBottom: away ? 0 : `calc(${ASK_BUTTON_ROOM})`, transition: immersive ? 'margin-bottom 200ms ease' : undefined } : undefined} className="screen min-h-0 flex-1 touch-pan-y px-1 pt-2">
        <div ref={inner}>
        {failed ? (
          <ChapterFailed title={TITLE} onRetry={retry} onPick={() => setPicking(true)} />
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
        <Away enabled={immersive} away={away}>
          <TalkBar
            hold={{
              onPress: pauseReading,
              onTap: () => setTalkAbout(selected),
              onHold: () => holdTalk(selected),
              onRelease: () => void voice.release(),
              onDrop: voice.abort,
            }}
          />
        </Away>
      ) : null}
      {chapter && !viewUnit ? (
        <AskTutorButton
          away={immersive ? away : undefined}
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
          onSay={(message, focus, pictures) => talk.say(talkScope, message, focus, pictures)}
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
          listen={{
            onPlay: () => (viewPassage ? listenTo(viewPassage) : listenVerse(viewUnit)),
            playing: chapterReading,
            again: listenedView,
          }}
          checks={checks}
          read={readOf(viewUnit)}
          onRetryRead={() => checks.retry(viewUnit)}
          ask={asks[unitId(viewUnit)]}
          onAsk={(verse, question) => {
            setPrefill(null);
            ask(verse, question);
          }}
          prefill={prefill}
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
