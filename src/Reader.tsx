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
import { setImmersiveReader } from './appearance/appearanceSync';
import { moveBox, useImmersive, useImmersiveSetting, useScrolledPercent } from './immersive';
import { PlaceLine } from './PlaceLine';
import { useCopyHold } from './copy/useCopyHold';
import { ImmersiveHint } from './ImmersiveHint';
import { ReaderControls } from './ReaderControls';
import { useAiAllowed } from './gate/licenceContext';
import { LicenceTip } from './gate/LicenceTip';
import { TalkSheet } from './Talk';
import { ErrorBoundary } from './ErrorBoundary';
import { sourceLanguage, type SourceLanguage, type Verse } from './data/chapter';
import { chooseReading, getGrammarApproach, getGreekPronunciation, setReaderView, talkRef, type ReaderView } from './data/repositories';
import { chapterOf, getOpenChapter, setOpenChapter, type OpenChapter } from './data/readerChapter';
import { neighbours, verseNeighbours } from './data/neighbours';
import { passageAt, passageVerse, passagesOf, rangeOf, unitId, type Passage } from './data/passage';
import { approachOf, DEFAULT_APPROACH, lessonForRange, passageLabel } from './approaches';
import { ChapterNav } from './ChapterNav';
import { ChapterPicker } from './ChapterPicker';
import { latest, publish, useLatest } from './events/bus';
import { blocksOf, DEFAULT_LAYOUT } from './layout/layouts';
import { LinkOpener } from './nav/LinkOpener';
import { pendingLink, takeLink } from './nav/linkRequest';
import { lemmaSheet, linkOf } from './nav/links';
import { pendingRequest, reopenTalk, takeRequest } from './nav/readerRequest';
import { closeVerse, openPassage, openVerse, openVerseRange, readerOf, routeOf, useAddress } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { useReadChecks } from './useReadChecks';
import { stepOf, stepOfVerse } from './reader/steps';
import { LinkNotice } from './reader/LinkNotice';
import { SwipeNote } from './reader/SwipeNote';
import { type SwipeEnd, useChapterSwipe } from './reader/useChapterSwipe';
import { canCross, crossChapter } from './reader/crossChapter';
import { useBringVerse } from './reader/useBringVerse';
import { useKeepTopVerse, weavedWordsKey } from './reader/useKeepTopVerse';
import { usePages } from './reader/usePages';
import { useSetting } from './settings/store';
import { layRp2026English } from './data/rp2026English';
import { Rp2026Sheet } from './reader/Rp2026Sheet';
import { readingModeSetting, rp2026EnglishSetting, septuagintSetting } from './settings/definitions';
import { useSheetOpen } from './ui/sheetBack';
import { BOOKS, bookOf, isHebrewBook } from './data/books';
import { ChapterFailed } from './reader/ChapterFailed';
import { ChapterStill } from './reader/ChapterStill';
import { useStillLoading } from './reader/useStillLoading';
import { useDbBlocked } from './data/dbBlocked';
import { db } from './data/db';
import { useChapter } from './reader/useChapter';
import { useReadFrom } from './reader/useReadFrom';
import { useWoven } from './reader/useWoven';
import { wovenReading } from './services/reading';
import { chosenHebrewPronunciation, pronunciationOf } from './speech/pronunciation';
import { GREEK_VIEW_FROM } from './settings/definitions/greekInterest';
import { ReaderHeader } from './reader/ReaderHeader';
import { useReaderSettings, useSettingsLate, type ReaderSettings } from './reader/useReaderSettings';
import { useReaderVariants, variantsLayoutKey, type ShownUnit } from './reader/variants';
import { VariantSheet } from './reader/VariantSheet';
import { VariantKeyBar, VariantKeySheet } from './reader/VariantKey';
import { VariantKeyContext } from './reader/variantKeyContext';
import { sharingKeys, unitKey } from './reader/readingSets';
import { readDraft, talkDraftKey, writeDraft } from './ui/unsentDraft';
import { useAppearanceKey } from './ui/useAppearanceKey';
import { askAboutVariant, clearVariantAsked, VARIANT_QUESTION } from './tutor/variantFacts';
import { useReaderTutor } from './reader/useReaderTutor';
import { READER_SUGGESTIONS } from './tutor/screen';
import { useDoorTarget } from './tutor/door';
import { useTalk } from './useTalk';
import { speakTutor, startAnswerWhenSeen } from './speech/tutorVoice';
import { continueReading, getReading, isReadingOf, pauseReading, stopReading, updatePlan, useReading } from './speech/readAloud';
import { answerRuns, syllableRuns } from './speech/answerRuns';
import { ReaderChips } from './ReaderChips';
import { TeachSheet } from './TeachSheet';
import { useNewWords } from './useNewWords';
import { usePace } from './usePace';
import { TipCard } from './tips/TipCard';
import { SeptuagintNote } from './reader/SeptuagintNote';
import { SeptuagintSources } from './reader/SeptuagintSources';
import { isSeptuagint, SEPTUAGINT_SUBTITLE, septuagintAligned, septuagintSettings, septuagintTitle, septuagintView, septuagintWeaveNoted } from './reader/septuagint';
import type { InterestLang } from './settings/definitions/interest';
import { ReadingBar } from './speech/ReadControls';
import { BarSlot } from './speech/SpeakingBarSlot';
import { useBarShown } from './speech/barShown';
import { warmVoices } from './speech/greek';
import { WordSheet, type Lookup } from './WordSheet';
import { PassageText, ParagraphView, SectionHeading, VerseLine } from './reader/ChapterText';
import { VerseText } from './reader/VerseText';
import { isHolding } from './talk/holding';

const NO_SETTINGS: Partial<ReaderSettings> = {};
const EMPTY_LEMMAS: ReadonlySet<string> = new Set();

/** The chapter the Reader shows: the one the address names (a book and chapter; a chapter alone is Romans), else the one last open. */
function openFrom(address: string): OpenChapter {
  const named = readerOf(address);
  if (named.book === undefined && named.chapter === undefined) return getOpenChapter();
  return chapterOf(named.book ?? 'rom', named.chapter ?? 1) ?? getOpenChapter();
}

/** The section passage the Verse view's arrows step from: the range itself when a heading starts it, else the passage its first verse stands in (a lesson's range runs across headings). */
function arrowsFrom(passages: Passage[], range: Passage): Passage {
  return passages.find((p) => p.first === range.first) ?? passages.find((p) => p.first <= range.first && range.first <= p.last) ?? range;
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
  // An Old Testament chapter ('hbo') is read in English or in its Hebrew (mw-5vvlay.1): the switch's second choice is the chapter's one source view ('greek' in code, the Hebrew of this
  // chapter and the Greek of a New Testament one, so the saved view opens either), and the weave lays the English against the Hebrew. With Settings > Old Testament in Greek (Septuagint) On
  // and the book shipped, the chapter is Swete's Greek with Brenton's English under it (src/reader/septuagint.ts): an 'grc' chapter, read by the Greek dial, so which of the two an Old
  // Testament book is waits for its file; the settings wait with it (useReaderSettings null).
  const { chapter: fetched, failed, retry: retryChapter } = useChapter(BOOK, CHAPTER);
  const ownLang: InterestLang | null = isHebrewBook(BOOK) ? (fetched ? (sourceLanguage(fetched) as InterestLang) : null) : 'grc';
  const hbo = ownLang === 'hbo';
  const settings = useReaderSettings(ownLang) ?? NO_SETTINGS;
  const { level, view, weave, weaveShown, weaveOrder, weaveGrammar, solid, learning, layout, headings, readSpan } = settings;
  const immersive = useImmersiveSetting();
  // English from the 2026 Greek (mw-9ji6ek0.33): with it On, the places where the 2026 Greek changes the English read in Lampas's own words, marked; the chapter waits for the setting, as it waits for the others
  // (a database that is late is not waited for: the default, Off, is read until the saved value comes, mw-5r3p30.1042)
  const savedRp2026 = useSetting(rp2026EnglishSetting);
  const settingsLate = useSettingsLate(savedRp2026 !== undefined);
  const rp2026 = savedRp2026 ?? (settingsLate ? rp2026EnglishSetting.default : undefined);
  const chapter = useMemo(() => (fetched && rp2026 ? layRp2026English(fetched, rp2026) : null), [fetched, rp2026]);
  // The Septuagint chapter: where its verses carry aligned chunks it is woven as the New Testament is; where its English is one chunk a verse the Weave has nothing to lay a Greek word over: the Weave position
  // draws the Greek alone and a note says so, once (septuagintView); a book that is not shipped says so and stays Hebrew
  const septuagint = isSeptuagint(chapter);
  const aligned = septuagint && septuagintAligned(chapter);
  const septuagintOn = useSetting(septuagintSetting) === 'on';
  const wovenSettings = useMemo(() => (septuagint ? septuagintSettings(settings, aligned) : settings), [septuagint, aligned, settings]);
  const heading = chapter ? septuagintTitle(TITLE, CHAPTER, chapter) : TITLE;
  const [rpShown, setRpShown] = useState<string | null>(null);
  const [sourcesShown, setSourcesShown] = useState(false);
  // 'Loading …' that goes on 8 s (the chapter's fetch hangs, or the settings wait on a database an older tab blocks) offers Try again instead of a black screen (mw-5r3p30.846).
  const dbBlocked = useDbBlocked();
  const stillLoading = useStillLoading(!failed && !(chapter && view && layout && headings));
  const retry = useCallback(() => {
    retryChapter();
    if (!db.isOpen()) db.open().catch(() => undefined);
  }, [retryChapter]);
  // the language of the chapter's own words (the switch's last choice, the Hebrew or the Greek view); the book says it before the chapter has loaded
  const source: SourceLanguage = chapter ? sourceLanguage(chapter) : isHebrewBook(BOOK) ? 'hbo' : 'grc';
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
  useEffect(() => {
    setImmersiveReader(immersive);
    return () => setImmersiveReader(false);
  }, [immersive]);
  const reading = useReading();
  const address = useAddress();
  const current = useRef({ view });
  useEffect(() => {
    current.current = { view };
  });
  const selectedEvent = useLatest('verse-selected');
  const selected = selectedEvent?.chapter === CHAPTER ? selectedEvent.verse : null;
  const [lookup, setLookup] = useState<Lookup | null>(null);
  // A tap on a word of an Old Testament chapter opens the word sheet like a Greek word's, but Hebrew (mw-5vvlay.2): a Hebrew word's own sheet, an English chunk's sheet with the Hebrew words it renders
  // and, under them, the English sheet of its words; below the Hebrew dial's Curious step (mw-gdcyf98.3) an English chunk opens the English sheet alone (WordSheet).
  // The teach sheet (src/TeachSheet.tsx), opened by the 'New N' chip.
  const [teaching, setTeaching] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const pace = usePace(source);
  const newWords = useNewWords(chapter, pace?.count);
  // A request from another screen (the Parsing drill's links) is met once, as the Reader opens: the Talk sheet on that verse,
  // or the Ask box on it holding the question.
  const [request] = useState(() => {
    const pending = pendingRequest();
    return pending?.chapter === CHAPTER && pending.book === BOOK ? pending : undefined;
  });
  useEffect(() => {
    // a verse to bring to the top is met when the chapter is on screen (src/reader/useBringVerse.ts), not as the Reader opens
    if (request && request.action !== 'verse') takeRequest(request);
  }, [request]);
  // A link in the address (src/nav/linkRequest.ts) is met once, as the Reader opens: its notice, and for a word link the word's sheet.
  const [link] = useState(() => pendingLink(BOOK, CHAPTER));
  useEffect(() => {
    if (link) takeLink(link);
  }, [link]);
  const [notice, setNotice] = useState(link?.notice ?? (request?.action === 'opened' ? `Opened ${TITLE}` : null));
  // Swiping the text goes to the next or previous chapter (src/reader/useChapterSwipe.ts); past Genesis 1 or Revelation 22 a short note says so.
  const sheetOpen = useSheetOpen();
  const inner = useRef<HTMLDivElement | null>(null);
  const [swipeEnd, setSwipeEnd] = useState<SwipeEnd | null>(null);
  const dismissSwipeNote = useCallback(() => setSwipeEnd(null), []);
  // Turn pages (Settings > Reading, src/reader/usePages.ts): the chapter in pages, turned by a tap on the outer thirds or a swipe; past the first or last
  // page they open the previous or next chapter, the chapter swipe being off. The page he is on is kept per chapter, so he comes back to it from any screen the Reader gives way to (mw-5r3p30.608).
  const readingMode = useSetting(readingModeSetting);
  const paging = readingMode === 'pages';
  // how far through the chapter he is, for the place line (Scroll only: Turn pages says the page)
  const percent = useScrolledPercent(!paging, main);
  useChapterSwipe(main, inner, BOOK, CHAPTER, sheetOpen || paging, setSwipeEnd);
  // with the Immersive reader On, turning to the next page puts the bars away, as scrolling down does (src/immersive.ts, mw-5r3p30.611)
  const hideBars = bars.hide;
  const onTurned = useCallback((by: 1 | -1) => {
    if (by > 0) hideBars();
  }, [hideBars]);
  // past the first or last page the previous or next chapter opens, on its last or first page (src/reader/crossChapter.ts, mw-5r3p30.620)
  const cross = useCallback((by: 1 | -1, swipe: boolean) => crossChapter(BOOK, CHAPTER, by, swipe), [BOOK, CHAPTER]);
  const crossable = useCallback((by: 1 | -1) => canCross(BOOK, CHAPTER, by), [BOOK, CHAPTER]);
  const around = neighbours(BOOK, CHAPTER);
  // the page follows the finger and every turn is drawn as a page of a book turning (src/reader/pageTurn.ts, mw-5r3p30.621)
  const pages = usePages(paging && chapter !== null && !failed, main, inner, sheetOpen, `${BOOK}/${CHAPTER}`, onTurned, cross, crossable);
  const showPage = pages.show;
  // Choose a book's Go to John 18:2: the chapter, with that verse brought to the top of the reading area (no Verse view)
  useBringVerse(main, inner, BOOK, CHAPTER, chapter, paging, showPage);
  // English, Weave and Greek (Hebrew) lay a verse out at different heights: the verse on top before a switch is on top after it (mw-5r3p30.863)
  const [linked, setLinked] = useState(() => (link?.word ? lemmaSheet(link.word) : null));
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  // the reading check follows the view; in an Old Testament chapter the Hebrew view is read in Hebrew (useReadChecks turns the source view into 'hebrew' by the book, mw-gdcyf98.14)
  const checks = useReadChecks(BOOK, CHAPTER, TITLE, view ?? 'english', pronunciation, undefined, chapter);
  // The conversation the Talk sheet is open on (kept current by useReaderTutor); an answer that comes while its sheet is open is read aloud.
  const openTalkRef = useRef<string | null>(null);
  const closeTalk = useRef<() => void>(() => {});
  const leaveTalk = useRef<() => () => void>(() => () => {});
  const talk = useTalk(BOOK, CHAPTER, (ref, id, answer, info) => {
    // an answer that comes while he holds waits: page audio can take the microphone from the recogniser
    if (openTalkRef.current !== ref || isHolding()) return;
    // Sound it out: the word was said before the answer; now each syllable it lists, slowly, one after another.
    if (info.focus?.kind === 'sound' && !info.focus.language && info.syllables?.length) startAnswerWhenSeen(id, syllableRuns(info.syllables));
    else speakTutor(id, answerRuns(answer), () => openTalkRef.current === ref);
  }, {
    // the tutor takes him to a chapter or another place (the answer's `go`) while this talk's sheet is open: the sheet closes, the place opens as a new Back step, and Back opens the sheet again
    allowed: (ref) => openTalkRef.current === ref,
    here: (place) => place.book === BOOK && place.chapter === CHAPTER,
    leave: () => leaveTalk.current(),
  });
  // A tap on a verse number opens the Verse view as a Back step of its own; the address then names the verse and the effect below tells the bus.
  const selectVerse = useCallback((n: number) => openVerse(n), []);
  // A tap on the place line opens the whole chapter in the view a section heading opens (mw-5r3p30.699), as a Back step; Back returns to the reader where it was.
  const openChapter = useCallback(() => {
    const verses = chapter?.verses;
    if (!verses?.length) return;
    const { view: v, weave: w } = readerOf(window.location.hash);
    openVerseRange({ book: BOOK, chapter: CHAPTER, from: verses[0].n, to: verses[verses.length - 1].n, view: v, weave: w });
  }, [chapter, BOOK, CHAPTER]);
  const [action, chooseAction] = useVerseAction();
  const woven = useWoven(chapter, wovenSettings);
  // the variant units Settings > Variants shows (mw-9ji6ek0.5): marked in the text with a brace after them, counted by the chip in the row under the header; the Immersive reader has the marks and braces too (mw-9ji6ek0.12), not the chip
  const variants = useReaderVariants(chapter);
  const variantsOf = useCallback((n: number) => variants.byVerse?.get(n), [variants]);
  // the same for the layout and the section headings (the tutor changes them under an open Reader) and for Variants turned on or off, the filter, the reading set: the braces come into the text and leave it and every line reflows (mw-9ji6ek0.45); Turn pages keeps its own anchor
  // and for the Text size and the Font, which the tutor changes at the root under an open Reader and which the Reader does not read, the weave's grammar dial and the Immersive reader (mw-9ji6ek0.46)
  const appearance = useAppearanceKey();
  // and for his solid and learning words, which the tutor or Words changes under an open Reader: a word goes into the Greek or out of it and a learning word gains or loses its hint line (mw-5r3p30.994)
  const wordsKey = useMemo(() => (weaveShown ? weavedWordsKey(solid, learning, weave === 'solid+learning') : ''), [weaveShown, weave, solid, learning]);
  useKeepTopVerse(main, inner, view ? `${view}|${weave}|${weaveShown}|${weaveOrder}|${layout}|${headings}|${variantsLayoutKey(variants)}|${appearance}|${weaveGrammar}|${immersive}|${wordsKey}` : null, paging, `${BOOK}/${CHAPTER}`);
  // the reading set in force lays its readings into the text in place, with Variants Off too (src/reader/chosenReading.ts, mw-9ji6ek0.24)
  const chosenOf = useCallback((n: number) => variants.chosenByVerse.get(n), [variants]);
  // the unit whose brace he tapped: its sheet (src/reader/VariantSheet.tsx, mw-9ji6ek0.6)
  const [variantShown, setVariantShown] = useState<ShownUnit | null>(null);
  // the key to the marks of a brace (mw-9ji6ek0.43, src/reader/VariantKey.tsx): its sheet, opened by a brace's '{' or by the key line under the chips
  const [keyOpen, setKeyOpen] = useState(false);
  const openKey = useCallback(() => setKeyOpen(true), []);
  // A hold on a verse number, a section heading or the place line copies its verse, passage or the chapter in the view the Reader is in (src/copy/useCopyHold.ts)
  const copyHold = useCopyHold(chapter, view ? { view, woven, variants } : undefined, openChapter);
  const closeSheet = useCallback(() => setLookup(null), []);
  const viewVerse = chapter && selected !== null ? chapter.verses.find((v) => v.n === selected) : undefined;
  // A heading's passage (the address `p`) opens the same view, with the passage as one Verse; a verse in the address wins.
  const named = readerOf(address);
  const wantedPassage = isHere(named, BOOK, CHAPTER) ? named.passage : undefined;
  // Any run of verses (a passage lesson's range, `pt` in the address) opens it too, headed with the lesson's title, else the heading of its first verse, else its reference.
  const wantedTo = isHere(named, BOOK, CHAPTER) ? named.passageTo : undefined;
  const approachId = useLiveQuery(getGrammarApproach, []);
  const approach = approachOf(approachId ?? DEFAULT_APPROACH) ?? approachOf(DEFAULT_APPROACH)!;
  const viewPassage = useMemo(() => {
    if (!chapter || viewVerse !== undefined || wantedPassage === undefined) return undefined;
    if (wantedTo === undefined) return passageAt(chapter.verses, wantedPassage);
    const lesson = lessonForRange(approach, BOOK, CHAPTER, wantedPassage, wantedTo);
    // the whole chapter (the place line opens it, mw-5r3p30.699) is headed with the chapter, not with the heading of its first section
    const whole = wantedPassage === chapter.verses[0]?.n && wantedTo >= chapter.verses[chapter.verses.length - 1].n;
    // a lesson's title never names a whole chapter: a lesson that reads one is the chapter's own range, which the place line opens too (mw-5r3p30.704)
    const heading = (whole ? TITLE : (lesson?.lesson.lesson.title ?? chapter.verses.find((v) => v.n === wantedPassage)?.h)) ?? `${TITLE}:${wantedPassage}-${wantedTo}`;
    return rangeOf(chapter.verses, wantedPassage, wantedTo, heading);
  }, [chapter, viewVerse, wantedPassage, wantedTo, approach, BOOK, CHAPTER, TITLE]);
  // The lesson the view's range reads, when the chosen approach has one for it: the Lesson strip and its Check (src/CheckSheet.tsx).
  const viewLesson = useMemo(() => {
    const step = chapter && viewPassage ? lessonForRange(approach, BOOK, CHAPTER, viewPassage.first, viewPassage.last) : undefined;
    return chapter && viewPassage && step
      ? { key: step.key, label: passageLabel(step.passage), title: step.lesson.lesson.title, from: viewPassage.first, to: viewPassage.last, ideas: step.lesson.lesson.ideas, chapter }
      : undefined;
  }, [chapter, viewPassage, approach, BOOK, CHAPTER]);
  const viewUnit = useMemo(() => viewVerse ?? (viewPassage ? passageVerse(viewPassage) : undefined), [viewVerse, viewPassage]);
  // whichever hold is going on is dropped as one: the sheet closed, or another screen asked
  // The Parsing drill's Ask the tutor opens the Talk sheet on its verse (useReaderTutor) with the question in the box, ready to send: he sends it himself; words he had typed there stay
  useState(() => {
    if (request?.action !== 'ask') return;
    const draftKey = talkDraftKey(talkRef(BOOK, CHAPTER, request.verse));
    if (readDraft(draftKey) === '') writeDraft(draftKey, request.question);
  });
  const tutor = useReaderTutor(open, chapter, talk, { request, viewUnit, openTalkRef });
  const { talkScope, talkKey, talkAbout, setTalkAbout } = tutor;
  // The tutor (the Talk sheet and the floating ?) is the AI: not drawn without a licence (mw-8m9dyu.2).
  const ai = useAiAllowed();
  // The talk about one variant unit, its box holding the question ready to send (words he had typed there are his and stay): the brace sheet's Ask the tutor, and what the tutor door asks on that sheet
  const askVariant = () => {
    if (!variantShown) return;
    stopReading();
    if (chapter) askAboutVariant(chapter, variantShown.unit);
    const draftKey = talkDraftKey(talkRef(BOOK, CHAPTER, variantShown.unit.v));
    if (readDraft(draftKey) === '') writeDraft(draftKey, VARIANT_QUESTION);
    setVariantShown(null);
    setTalkAbout(variantShown.unit.v);
  };
  // The Talk sheet's own close (Done), which the answer's `go` calls before the Reader opens the other chapter.
  useEffect(() => {
    closeTalk.current = () => {
      setTalkAbout(undefined);
    };
    // the tutor takes him elsewhere: the sheet closes as Done does and gives the way to open it again on what it was about, for Back from where he is taken
    leaveTalk.current = () => {
      const about = talkAbout;
      closeTalk.current();
      return () => reopenTalk(BOOK, CHAPTER, about ?? null);
    };
  });
  // The unit a talk was opened on from the brace sheet is forgotten when the Talk sheet closes (src/tutor/variantFacts.ts)
  useEffect(() => {
    if (talkAbout === undefined) clearVariantAsked();
  }, [talkAbout]);
  // The verse number on the teach sheet: the reading box is scrolled so that verse stands at its top. The verse is not selected: that
  // would open its Verse view over the Reader.
  const showVerse = useCallback((n: number) => {
    const box = main.current;
    const el = box?.querySelector<HTMLElement>(`[data-verse="${n}"]`);
    if (box && el && paging) showPage(el);
    else if (box && el) box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
  }, [paging, showPage]);
  const closeTeach = useCallback(() => setTeaching(false), []);
  // what the Verse view shows and reads: what the Reader shows, in a Hebrew chapter's view and weave as in a Greek one's (mw-gdcyf98.4)
  const sheetView: ReaderView | undefined = view;
  const sheetWoven = woven;
  // The Verse view's verse or passage as the weave shows it to be read (mw-5r3p30.411): the words shown in Greek in Greek and the others in English, in the order drawn, each verse
  // of a passage after the one before. The reading check sends them as segments, so the mill scores each word in its own language. null when nothing is shown in Greek.
  const viewWeave = useMemo(() => {
    if (!viewUnit || !chapter || !sheetWoven || sheetView === 'greek') return null;
    const verses = viewPassage ? viewPassage.verses : [viewUnit];
    // an Old Testament chapter's woven words are Hebrew: the mill scores them in the Hebrew scheme's language, the English pieces in English (mw-gdcyf98.14)
    return wovenReading(verses, verses.map((v) => sheetWoven[chapter.verses.indexOf(v)] ?? null), hbo ? chosenHebrewPronunciation().scoringLang : pronunciationOf(pronunciation).scoringLang);
  }, [viewUnit, viewPassage, chapter, sheetWoven, sheetView, pronunciation, hbo]);
  // The Verse view's Read bar: the hold of the reading check for the verse the view shows.
  const readOf = (verse: Verse): ReadHold => {
    const phase = checks.states[unitId(verse)]?.phase;
    return { onPress: () => checks.press(verse, viewWeave), onRelease: checks.release, onDrop: checks.drop, disabled: phase === 'sending' || phase === 'waiting' };
  };
  const { plan, readFrom, listenTo, listenVerse, listenedView } = useReadFrom(BOOK, CHAPTER, chapter, view, woven, readSpan, viewUnit, sheetView ? { view: sheetView, woven: sheetWoven } : undefined);
  const chapterReading = reading.status !== 'idle' && reading.answer === null;
  const readingVerse = chapterReading ? reading.verse : null;
  const headerButtons = chapterReading && !reading.onBar;
  // The bars change only on a two-finger tap (src/immersive.ts); a sheet closing or reading aloud stopping does not bring them back. They stay out
  // of view only while the header holds no reading control.
  const away = bars.away && !headerButtons;
  // The tutor door (src/tutor/door.ts, the floating ?): on the Reader it asks about the verse the Verse view shows or the verse selected, else the chapter; over the brace sheet, about its unit
  useDoorTarget(
    ai && chapter && !failed
      ? () => {
          stopReading();
          setTalkAbout(viewUnit?.n ?? selected);
        }
      : undefined,
    // the immersive reader (the bars away, no sheet over it) is the one screen with no tutor door
    away && viewUnit === undefined,
  );
  useDoorTarget(ai && variantShown ? askVariant : undefined);
  // The foot of the screen keeps the phone's bottom floor on its lowest row (mw-5r3p30.473): the place line of the Immersive reader (under everything), else the
  // speaking bar's slot or the Turn pages line above it. No bar of the tutor's sits under them any more (the Talk bar is gone, mw-5r3p30.882), licensed or not.
  const barUp = useBarShown();
  const placeShown = chapter && !failed && !viewUnit;
  const percentLine = !paging && immersive && placeShown;
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
  // A reading that went on into this chapter (Play to, src/speech/readAloud.ts) starts its first verse once the plan is here.
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
  // Leaving this screen for another pauses the reading, and coming back offers Resume on the bar (voice-kit/speech); opening another chapter ends it,
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
    if (paging) {
      showPage(el);
      return;
    }
    const margin = 16;
    const bar = box.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    if (rect.top < bar.top + margin || rect.bottom > bar.bottom - margin) moveBox(box, box.scrollTop + rect.top - bar.top - margin);
  }, [readingVerse, paging, showPage]);

  return (
    <VariantKeyContext.Provider value={openKey}>
      <Away enabled={immersive} away={away}>
      <div data-reader-top className="reader-top">
      <ReaderHeader
        title={heading}
        view={view && level !== undefined && level >= GREEK_VIEW_FROM ? view : undefined}
        source={source}
        weave={weave ?? 'off'}
        weaveShown={weaveShown ?? false}
        weaveOrder={weaveOrder ?? 'english'}
        chapterReading={chapterReading}
        reading={reading}
        from={selected}
        canRead={plan !== null || crossingHere}
        inert={viewUnit !== undefined}
        onPick={() => setPicking(true)}
        onRead={() => readFrom(selected ?? 1, true)}
      />
      {septuagint && !chapterReading ? (
        <>
          <button
            type="button"
            data-reader-subtitle
            aria-haspopup="dialog"
            onClick={() => setSourcesShown(true)}
            className="chrome-small mx-auto flex min-h-11 items-center px-2 pb-1 text-center text-muted underline decoration-dotted underline-offset-4"
          >
            {SEPTUAGINT_SUBTITLE}
          </button>
          {view !== undefined && septuagintWeaveNoted(view, weaveShown ?? false, aligned) ? <SeptuagintNote className="mx-2 mb-1" /> : null}
        </>
      ) : null}
      {septuagintOn && chapter && !failed && isHebrewBook(BOOK) && sourceLanguage(chapter) === 'hbo' && !chapterReading ? (
        <p role="note" data-septuagint-not-ready className="chrome-small px-2 pb-1 text-center text-muted">
          The Septuagint of {bookOf(BOOK)?.name ?? BOOK} is not ready yet; this is the Hebrew.
        </p>
      ) : null}
      <ReaderChips
        hidden={chapterReading}
        newWords={newWords?.length ?? 0}
        onTeach={() => setTeaching(true)}
        tipOpen={tipOpen}
        onTip={() => setTipOpen((open) => !open)}
        wovenCount={woven ? wovenCount : null}
        source={source}
        variants={variants.any ? { count: variants.count, on: variants.on } : null}
      />
      {chapterReading || !tipOpen ? null : <TipCard onClose={() => setTipOpen(false)} />}
      <VariantKeyBar braces={!chapterReading && variants.byVerse !== null && variants.count > 0} onMore={openKey} />
      </div>
      </Away>
      {/* what a two-finger tap, a tap on the outer thirds and a swipe do, as buttons that show while focused (src/ReaderControls.tsx) */}
      {chapter && !failed ? (
        <ReaderControls
          immersive={immersive}
          away={away}
          onBars={bars.toggle}
          pages={paging ? { page: pages.page, count: pages.count, turn: pages.turn, chapterBefore: around.previous !== null, chapterAfter: around.next !== null } : null}
          inert={sheetOpen || viewUnit !== undefined}
        />
      ) : null}
      {copyHold.said ? (
        <p role="status" data-copied className="pointer-events-none fixed inset-x-3 toast-top z-20 rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg shadow-lg">
          {copyHold.said}
        </p>
      ) : null}
      {notice ? <LinkNotice text={notice} onDismiss={() => setNotice(null)} /> : null}
      {swipeEnd ? <SwipeNote end={swipeEnd} lastBook={BOOKS[BOOKS.length - 1].name} onDismiss={dismissSwipeNote} /> : null}
      <ReadingBar reading={reading} />
      {chapter && !failed ? <ImmersiveHint enabled={immersive} away={away} mode={paging ? 'pages' : 'scroll'} /> : null}
      <main ref={mainRef} inert={viewUnit !== undefined} data-reader data-view={view} data-weave={weave} data-layout={layout} data-headings={headings} data-read-span={readSpan} data-immersive={immersive ? 'on' : 'off'} data-paging={paging ? 'pages' : 'scroll'} data-place-below={percentLine && away ? '' : undefined} className="screen min-h-0 flex-1 touch-pan-y px-1 pt-2">
        <div ref={inner} data-reader-text data-pages={paging ? '' : undefined}>
        {failed ? (
          <ChapterFailed title={TITLE} onRetry={retry} onPick={() => setPicking(true)} />
        ) : chapter && view && layout && headings ? (
          <>
            {blocks.map((block) => {
              const first = block[0];
              const wovenOf = (v: Verse) => woven?.[chapter.verses.indexOf(v)] ?? null;
              return (
                <Fragment key={first.n}>
                  {headings === 'on' && first.h ? <SectionHeading text={first.h} onOpen={() => openPassage(first.n)} onCopy={() => copyHold.passage(first.n)} mirrored={source === 'hbo' && view === 'greek'} /> : null}
                  {layout === 'paragraph' ? (
                    <ParagraphView
                      verses={block}
                      view={septuagint ? septuagintView(view, weaveShown ?? false, aligned) : view}
                      source={source}
                      septuagint={septuagint ? chapter.chapter : undefined}
                      woven={block.map(wovenOf)}
                      selected={selected}
                      reading={readingVerse}
                      onSelect={selectVerse}
                      onCopy={copyHold.verse}
                      onPlay={(n) => readFrom(n, false)}
                      onLook={setLookup}
                      variantsOf={variantsOf}
                      chosenOf={chosenOf}
                      onVariant={setVariantShown}
                      onRp={setRpShown}
                    />
                  ) : (
                    <VerseLine
                      verse={first}
                      view={septuagint ? septuagintView(view, weaveShown ?? false, aligned) : view}
                      source={source}
                      septuagint={septuagint ? chapter.chapter : undefined}
                      woven={wovenOf(first)}
                      selected={selected === first.n}
                      reading={readingVerse === first.n}
                      onSelect={() => selectVerse(first.n)}
                      onCopy={() => copyHold.verse(first.n)}
                      onPlay={() => readFrom(first.n, false)}
                      onLook={setLookup}
                      variants={variantsOf(first.n)}
                      chosen={chosenOf(first.n)}
                      onVariant={setVariantShown}
                      onRp={setRpShown}
                    />
                  )}
                </Fragment>
              );
            })}
            <ChapterNav book={BOOK} chapter={CHAPTER} />
          </>
        ) : (
          stillLoading ? (
            <ChapterStill title={TITLE} blocked={dbBlocked} onRetry={retry} onPick={() => setPicking(true)} />
          ) : (
            <p role="status" className="px-4 pt-6 text-center text-muted">
              Loading {TITLE}…
            </p>
          )
        )}
        </div>
      </main>
      {paging && placeShown ? <PlaceLine title={TITLE} at={`Page ${pages.page} of ${pages.count}`} onOpen={openChapter} onCopy={copyHold.chapter} floor={!barUp} /> : null}
      {/* Scroll with the Immersive reader Off: the line is there all the time, how far through the chapter he is (mw-5r3p30.1028); with it On it comes with the bars away, below */}
      {readingMode !== undefined && !paging && !immersive && placeShown ? <PlaceLine title={TITLE} at={`${percent}%`} onOpen={openChapter} onCopy={copyHold.chapter} floor={!barUp} /> : null}
      <BarSlot level={1} inset={!(percentLine && away)} />
      {chapter && !failed && !viewUnit ? <LicenceTip /> : null}
      {percentLine ? <PlaceLine title={TITLE} at={`${percent}%`} onOpen={openChapter} onCopy={copyHold.chapter} visible={away} floor /> : null}
      {ai && talkScope && talkAbout !== undefined ? (
        <TalkSheet
          scope={talkScope}
          suggestions={talkScope.verse === null && !talkScope.quiz ? READER_SUGGESTIONS : undefined}
          talkRef={talkKey ?? talkRef(BOOK, CHAPTER, talkAbout)}
          state={talk.states[talkKey ?? talkRef(BOOK, CHAPTER, talkAbout)]}
          onSay={(message, focus, pictures) => talk.say(talkScope, message, focus, pictures)}
          onResume={() => talk.resume(talkScope)}
          onHelp={tutor.helpWithWord}
          onAskTerm={tutor.askAboutTerm}
          onClose={() => closeTalk.current()}
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
          onAsk={ai ? tutor.askAboutNewWord : undefined}
        />
      ) : null}
      {chapter && viewUnit && sheetView ? (
        <VerseView
          title={TITLE}
          book={BOOK}
          chapter={CHAPTER}
          chapterText={chapter}
          onLook={setLookup}
          verse={viewUnit}
          view={sheetView}
          immersive={immersive}
          text={
            viewPassage ? (
              <PassageText
                passage={viewPassage}
                view={sheetView}
                source={source}
                layout={layout ?? DEFAULT_LAYOUT}
                wovenOf={(v) => sheetWoven?.[chapter.verses.indexOf(v)] ?? null}
                reading={readingVerse}
                onLook={setLookup}
                onRp={setRpShown}
              />
            ) : (
              <VerseText verse={viewUnit} view={sheetView} source={source} woven={sheetWoven?.[chapter.verses.indexOf(viewUnit)] ?? null} onLook={setLookup} onRp={setRpShown} />
            )
          }
          previous={viewPassage ? stepOf(BOOK, CHAPTER, passages, arrowsFrom(passages, viewPassage), -1) : stepOfVerse(verseNeighbours(BOOK, CHAPTER, viewUnit.n).previous)}
          next={viewPassage ? stepOf(BOOK, CHAPTER, passages, arrowsFrom(passages, viewPassage), 1) : stepOfVerse(verseNeighbours(BOOK, CHAPTER, viewUnit.n).next)}
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
          weave={viewWeave}
          wovenChapter={sheetWoven}
          onRetryRead={() => checks.retry(viewUnit)}
          quiz={{ started: tutor.quizStarted, onOpen: tutor.openQuiz }}
          lesson={viewLesson}
        />
      ) : null}
      {sourcesShown && septuagint ? <SeptuagintSources onClose={() => setSourcesShown(false)} /> : null}
      {rpShown ? <Rp2026Sheet entryKey={rpShown} onClose={() => setRpShown(null)} /> : null}
      {variantShown ? (
        <VariantSheet
          shown={variantShown}
          reference={`${bookOf(BOOK)?.name ?? BOOK} ${CHAPTER}:${variantShown.unit.v}`}
          place={{ book: BOOK, chapter: CHAPTER, verse: variantShown.unit.v }}
          verse={chapter?.verses.find((v) => v.n === variantShown.unit.v)}
          lang={source}
          onLook={setLookup}
          onClose={() => setVariantShown(null)}
          onRead={
            chapter
              ? (index) => {
                  // 'Read this': the reading goes into the set in force (Mine, started from a built-in set) and the text is laid again at once (src/data/repositories/readingSets.ts)
                  const units = chapter.variants ?? [];
                  void chooseReading(unitKey(chapter, variantShown.unit, units), index, sharingKeys(chapter, variantShown.unit, units));
                  setVariantShown(null);
                }
              : undefined
          }
        />
      ) : null}
      {keyOpen ? <VariantKeySheet onClose={() => setKeyOpen(false)} /> : null}
      {picking ? <ChapterPicker current={open} onClose={closePicker} /> : null}
      {linked ? <WordSheet chapter={linked.chapter} lookup={linked.lookup} onClose={() => setLinked(null)} /> : null}
      {chapter && lookup ? (
        <WordSheet chapter={chapter} lookup={lookup} onClose={closeSheet} onHelp={tutor.helpWithWord} onAskTerm={tutor.askAboutTerm} />
      ) : null}
    </VariantKeyContext.Provider>
  );
}
