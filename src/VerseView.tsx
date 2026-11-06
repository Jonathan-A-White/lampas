// src/VerseView.tsx — the Verse view (mw-5r3p30.79): a tapped verse number opens the verse on a screen of its own, over the Reader, which stays
// where it was underneath (the phone's Back closes the view, src/nav/route.ts openVerse). At the top the verse big, drawn by the Reader's own
// VerseText (so the view and the weave follow the Reader, and its words are tappable), in a box that takes what the controls under it leave and scrolls;
// under it what the chosen action shows (the reading check, the diagram, Listen's help line); under that a quiet line of TOOLS that act on the text (Copy and Share, Memorize, In Logos and In another book…, Maps, Sermons: plain accent words, no border, mw-5r3p30.896);
// under that the row of ACTIONS that choose what the foot does (Listen, Read it aloud, Practise and Diagram; an Old Testament verse has the quiz door of Practise only with some Hebrew, mw-uqlxea.3, and Diagram in its Hebrew, mw-5r3p30.887, and no Read it aloud in the Hebrew view, mw-gdcyf98.4; its Ask the tutor sends the Hebrew, mw-5vvlay.3; the verse is drawn in the Reader's view, the Hebrew big and right to left),
// the chosen one marked with the accent's border and a tint, never filled; and at the foot ONE control, the one thing on the screen filled in the accent,
// that does the chosen action: Hold to read verse N (the reading check, src/ReadCheck.tsx, a src/talk/Bars.tsx RecordBar). The Ask the tutor action and its composer are gone (mw-5r3p30.882): the floating ? is the one door. Listen is not a hold
// (mw-5r3p30.130): its foot is a Play button, and while it plays or waits the speaking bar above has Pause / Resume, Restart and Stop.
// Practise (mw-5r3p30.899, src/practise/) is a door: Copywork, Narration, Dictation, Summary and Quiz, in Susan Wise Bauer's order. Dictation (mw-5r3p30.900) hides the verse in this view's text box until his page is judged. Narration (mw-5r3p30.901) shows the verse in English there and its foot is a hold bar he tells it back into; Copywork and Dictation can then work on his written-down narration in its place. Summary (mw-5r3p30.902) shows the verse, passage or chapter in English there, with a box under it to type the main points in and a foot of Check my summary or Take a photo. Copywork shows the verse to copy in the script he picks, in this view's text box
// in place of the Reader's text, and its foot is Take a photo / Try again; the Quiz (mw-5r3p30.74, once the action Quiz me) has no hold: its foot is the Start the quiz / Continue the quiz button, which opens the Talk sheet in quiz mode.
// Diagram (mw-souyao.3, offered only for one verse, mw-5r3p30.895) has no foot: its pane (src/diagram/DiagramPane.tsx) is drawn under the row, and a tapped word of it opens the Reader's WordSheet through `onLook`.
// The Reader has no Talk bar (mw-5r3p30.882); the floating ? is the one tutor door, over the view. The chosen action is kept (src/verse/action.ts); the
// arrows go to the verse before and the verse after, across a chapter's end. The action bodies draw their bar into `slot`, the foot of the view.
// A section heading opens the same view for its passage (mw-5r3p30.73): `verse` is then the passage as one Verse (src/data/passage.ts: `n` its
// first verse, `to` its last), the title is the heading and its range, every action but Diagram (a diagram is of one verse) works on the whole passage, and the arrows go to the passage
// before and after in the chapter. Nothing else differs, so there is one view engine.
//
// The layout (mw-5r3p30.896, his "this UI needs a makeover"): upright the text box is the flexible part (flex-1 with a floor of 8 rem), so the tools, the row and the foot are
// always on screen and the text takes the rest; what the action shows sits under the text, in the scroll box, and the tools and the row stand OUTSIDE that box (data-verse-controls,
// between it and the foot), so a result or a drawn diagram only shortens the text and never moves the controls under his finger; in a window of 20 rem or less (a 360 px phone at
// 130 % text or more, src/ui/useNarrow.ts) they end the scrolling flow instead, the text's box at most 40 % of the window; a passage scrolls inside its box ([data-passage-box], which the lit verse of a Listen is kept in view in). Sideways (`short:`)
// the box is its content, at most 40 % of the window, and the screen scrolls as it did, so the Audio Bible row keeps its place above the Play bar (tests/e2e/audio-bible-landscape.spec.ts).
// The row is three cells to a row, the last row's cells stretched over it so no row has a hole; two to a row under 15 rem of room (a phone at 200 % text, where a third of
// the row is too narrow for 'Read it aloud'), and one row from 30 rem (a phone sideways), where five labels have a line each.
import { type ReactNode, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckSheet, type CheckLesson } from './CheckSheet';
import { LessonStrip } from './LessonStrip';
import { InLogosDoors } from './library/InLogosDoors';
import { MapsDoor } from './maps/MapsDoor';
import { sermonPlaceOf } from './sermons/place';
import { SermonsDoor } from './sermons/SermonsDoor';
import { ReadCheckPanel, type ReadHold } from './ReadCheck';
import { sourceLanguage, type Chapter, type Verse } from './data/chapter';
import { DiagramPane } from './diagram/DiagramPane';
import type { Lookup } from './WordSheet';
import { isOneVerse, unitId, unitName, unitReference } from './data/passage';
import { MemorizeControl } from './memorize/MemorizeControl';
import { ProgressMarks } from './memorize/ProgressMark';
import { osisOf } from './nav/links';
import { SHORT_BAR } from './ui/barClass';
import { focusOnMount } from './ui/focus';
import { useNarrow } from './ui/useNarrow';
import { Icon as PlayIcon } from './speech/ReadControls';
import { stopReading } from './speech/readAloud';
import { oneTap } from './ui/settle';
import { LinkActions } from './ui/LinkActions';
import { COPY_DEFAULTS, copyLink, copyText, copyUnitOf, sharePieces } from './copy/format';
import { useCopyFormat } from './copy/useCopyFormat';
import { takeByHand } from './copy/useCopyHold';
import type { UseReadChecks } from './useReadChecks';
import { BarSlot } from './speech/SpeakingBarSlot';
import { actionsFor, quizOffered, useHebrewOn, type VerseAction } from './verse/action';
import { PractisePane } from './practise/PractisePane';
import { freshPractice, type PracticeState } from './practise/practiceState';
import { copyAttrs, copyLanguagesOf, copyTextOf as modelTextOf, type CopyLanguage } from './practise/copywork';
import { cellSpan } from './verse/cells';
import { useAiAllowed } from './gate/licenceContext';
import { useDoorRoom } from './tutor/doorRoom';
import { audibleChapterLabel, audibleListen, audioBibleOf } from './resources/audioBible';
import { SendOff } from './plan/SendOff';
import { useSendOff } from './plan/useSendOff';
import { audioBibleSetting } from './settings/definitions';
import { useSetting } from './settings/store';
import { isOrdered, rowAttrs } from './reader/sourceText';
import { useReaderVariants } from './reader/variants';
import type { WovenVerse } from './data/weave';
import type { WovenReading } from './services/reading';

/** Listen is a player: Play reads the verse or passage on to its end by itself. */
export interface ListenPlayer {
  onPlay: () => void;
  /** a reading holds the speaking bar (it plays or waits there): the foot has no Play */
  playing: boolean;
  /** the Listen ran to its end by itself: the foot says Play again */
  again: boolean;
}

export interface VerseViewProps {
  /** the chapter's title: 'Romans 8' */
  title: string;
  book: string;
  chapter: number;
  /** the chapter's text: the Diagram action draws the verse's words from it */
  chapterText: Chapter;
  /** a word of the Diagram was tapped: the Reader opens its WordSheet on this Lookup (the way a word of the verse above opens it) */
  onLook: (lookup: Lookup) => void;
  /** the verse shown, or the passage under a heading as one Verse (`to` set) */
  verse: Verse;
  view: 'english' | 'greek';
  /** the verse as the Reader draws it (the Reader's VerseText: the view, the weave and the tappable words follow the Reader) */
  text: ReactNode;
  /** the Immersive reader is On: a passage is set with the Reader's book look */
  immersive: boolean;
  /** the arrows: go to the verse (or, for a passage, the passage) before and after; null when there is none */
  previous: (() => void) | null;
  next: (() => void) | null;
  onClose: () => void;
  action: VerseAction;
  onAction: (action: VerseAction) => void;
  listen: ListenPlayer;
  checks: Pick<UseReadChecks, 'states'>;
  read: ReadHold;
  /** the verse as the weave shows it to be read, when some of its words are shown in Greek: he reads the Greek in Greek and the English in English (services/reading.ts wovenReading) */
  weave?: WovenReading | null;
  /** the Reader's Weave of each verse of the chapter (in step with `chapterText.verses`), or null when it is not woven: the English Diagram draws the words it shows in Greek in Greek */
  wovenChapter?: readonly WovenVerse[] | null;
  onRetryRead: () => void;
  /** the Quiz door of Practise: opens the Talk sheet in quiz mode on this verse or passage (src/Talk.tsx, the bible-talk grind's `mode` quiz); `started` once the quiz has a turn or one on its way */
  quiz: { started: boolean; onOpen: () => void };
  /** the view shows a passage lesson's range (src/approaches): the Lesson strip draws under the heading and its Check passes the lesson by reading it (src/CheckSheet.tsx) */
  lesson?: CheckLesson & { title: string };
}

const ARROW = 'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-accent active:bg-line disabled:opacity-30';

function Arrow({ move, name, glyph }: { move: (() => void) | null; name: string; glyph: string }) {
  return (
    <button type="button" aria-label={name} disabled={move === null} onClick={() => move?.()} className={ARROW}>
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}

/** The look of a cell of the row: the chosen action has the accent's border and a tint of it, the rest a quiet line; nothing in the row is filled (the foot's one control is). */
const CELL = 'min-h-11 rounded-xl border px-1 text-sm font-medium leading-tight';
const CELL_CHOSEN = 'border-accent bg-accent/15 text-fg';
const CELL_REST = 'border-line text-fg active:bg-line';

export function VerseView(props: VerseViewProps) {
  const { title, book, chapter, chapterText, onLook, verse, view, immersive, text, previous, next, onClose, action: chosen, onAction, listen, checks, read, weave, wovenChapter, onRetryRead, quiz, lesson } = props;
  // the key of the lesson whose Check is open: moving to another passage leaves it closed
  const [checking, setChecking] = useState<string | null>(null);
  // The foot of the view, where the chosen action draws its bar.
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  // A diagram is of one verse: a passage or a range has no Diagram, and a phone left on it by a verse opens the passage on Listen (the kept action is not changed)
  const oneVerse = isOneVerse(verse);
  const action = !oneVerse && chosen === 'diagram' ? 'listen' : chosen;
  // Read it aloud, Practise and Diagram are the AI: not offered, and nothing of theirs drawn, without a licence (mw-8m9dyu.2).
  const ai = useAiAllowed();
  // the floating ? is over the full-width controls under the text: the tools (Maps · 4 ...) and what the action shows (its help line) keep the ?'s side clear while it is drawn (mw-5r3p30.1002).
  // The text itself uses the full width (mw-5r3p30.1005): a word may be under the ?, and a two-finger tap hides it.
  const doorPad = useDoorRoom();
  const controlsRoom = ai ? doorPad : '';
  const hebrewOn = useHebrewOn();
  const reference = unitReference(title, verse);
  // The Practise door that is open (src/practise/PractisePane.tsx): kept for the verse or passage it was opened on, so the next one opens at the door.
  const unitKey = `${book}.${chapter}.${unitId(verse)}`;
  const [kept, setPractice] = useState<PracticeState>(() => freshPractice(unitKey));
  const practice = kept.key === unitKey ? kept : freshPractice(unitKey);
  const audioBible = audioBibleOf(useSetting(audioBibleSetting) ?? 'off');
  // The Audible Bible is in English: in Greek view no English audio is offered (mw-5r3p30.653); English and the Weave keep it.
  const audibleChapter = view === 'greek' ? undefined : audibleChapterLabel(book, chapter);
  const audioListen = action === 'listen' && !!audioBible && !!audibleChapter;
  const sendOff = useSendOff();
  // 20 rem of window or less (a 360 px phone at 130 % text or more): the controls cannot stand under the text's box, so they join the scrolling flow, the text's box at most 40 % of the window (src/ui/useNarrow.ts)
  const narrow = useNarrow();
  const passage = verse.to !== undefined;
  const name = unitName(verse);
  const memorizeRef = `${osisOf(book)}.${chapter}.${verse.n}${verse.to === undefined ? '' : `-${verse.to}`}`;
  const noun = passage ? 'passage' : 'verse';
  // Copy and Share give the unit in the format of Settings > Reading > When you copy (src/copy/format.ts); the defaults until the three rows are read
  const copyFormat = useCopyFormat() ?? COPY_DEFAULTS;
  // a hold in the Reader that the clipboard refused opens the view with its text shown selected, to copy by hand (src/copy/useCopyHold.ts)
  const [startByHand] = useState(takeByHand);
  // 'As you read it' is the view the Reader draws this verse in: its view, in the Weave its woven chunks, and the variant units and readings in place it shows (mw-5r3p30.866)
  const variants = useReaderVariants(chapterText);
  const copyUnit = useMemo(() => copyUnitOf(chapterText, verse, { view, woven: wovenChapter ?? null, variants }), [chapterText, verse, view, wovenChapter, variants]);
  // what Share offers on its sheet: the whole, just the link, just the text, just the reference (mw-5r3p30.1026)
  // the Sermons door asks for the whole chapter when the view is the place line's (a Septuagint chapter by the Lampas verses it answers, src/sermons/place.ts)
  const sermonPlace = useMemo(() => sermonPlaceOf(chapterText, verse, book, chapter, copyUnit.kind === 'chapter'), [chapterText, verse, book, chapter, copyUnit.kind]);
  const pieces = useMemo(() => sharePieces(copyUnit, copyFormat), [copyUnit, copyFormat]);
  // A verse is shown big; a passage is set as the Reader sets its text, in the Reader's blocks (PassageText: the face and size of textClass, the Reader's leading,
  // and with Immersive on the book look of src/index.css, which [data-passage-text] shares with the Reader's verses), under his own size settings.
  // A Hebrew verse is set as big as the Greek one, in the app's Hebrew face (.script-he, whose .reader-hebrew gives the Greek size and the Reader's leading), right to left; the English view is English whatever the chapter.
  const source = sourceLanguage(chapterText);
  const offeredActions = actionsFor(ai, oneVerse);
  const hebrewView = view === 'greek' && source === 'hbo';
  // Copywork shows the verse in the script he picked, where the Reader's text stands (copy languages: English and the verse's own)
  const copying = action === 'practise' && ai && practice.door === 'copywork';
  // Dictation hides the verse while he writes it from hearing it, and shows it (in the language he dictated in) beside the marks once his page is judged (mw-5r3p30.900)
  const dictating = action === 'practise' && ai && practice.door === 'dictation';
  // Narration (mw-5r3p30.901) shows the verse in English to read first, and Copywork or Dictation of his written-down narration work on it, in English, in place of the verse
  const narrating = action === 'practise' && ai && practice.door === 'narration';
  const ownNarration = practice.fromNarration ? practice.narration : undefined;
  // Summary (mw-5r3p30.902) shows the verse, passage or chapter in English too: he gives its main points in English
  const summarizing = action === 'practise' && ai && practice.door === 'summary';
  const copyLanguages = ownNarration || narrating || summarizing ? (['en'] as CopyLanguage[]) : copyLanguagesOf(source);
  const copyLanguage: CopyLanguage = copyLanguages.includes(practice.language) ? practice.language : 'en';
  const modelText = ownNarration ? ownNarration.text : modelTextOf(verse, copyLanguage);
  const big = hebrewView ? 'script-he reader-hebrew [--lp-greek-size:2.25rem]' : view === 'greek' ? 'font-greek [--lp-greek-size:2.25rem]' : 'font-sans [--lp-english-size:1.75rem] [--lp-greek-size:2.25rem]';
  const size = hebrewView ? '' : view === 'greek' ? 'text-[length:var(--lp-greek-size)]' : 'text-[length:var(--lp-english-size)]';
  const typeClass = `leading-(--lp-leading) ${big} ${size}`;
  // The controls: the tools, the marks of a memorized verse and the row of actions. They stand outside the scroll box, above the foot, so they never move whatever the text and the
  // action's body do (mw-5r3p30.896); sideways the tools and the row share one line where the window is wide enough (short:flex-row), so the Audio Bible row of Listen stays above the
  // Play bar at rest (tests/e2e/audio-bible-landscape.spec.ts). In a narrow window they are the end of the scrolling flow instead.
  const controls = (
    <div data-verse-controls className={narrow ? 'shrink-0' : 'flex shrink-0 flex-col px-3 pb-1 short:flex-row short:items-start short:gap-x-2'}>
      {/* The tools: what acts on the text itself, plain accent words that wrap as a line of words does (mw-5r3p30.896). Copy and Share (Copied says so above the line; the text to copy by hand
          takes a line of its own), Memorize (mw-fu7dqf.5: the verse, or the passage's range as one reference; an Old Testament verse is learned in the languages its Hebrew dial allows, no licence),
          his Bible in Logos at the verse (a passage: at its first verse) and the chooser of the rest of his shelf behind In another book… (docs/design/library-at-scale.md 3.6), and the Maps door
          (mw-zbjgn3r.2: the maps of the verse, or of the passage's range) and the Sermons door after it (mw-qtu3zvz.2: the sermons preached on the verse, the passage or the chapter). The Audio Bible row of Listen is in the scroll box above, so the line is under it at every size (mw-5r3p30.746, .775). */}
      <div role="group" aria-label="Tools" data-verse-tools className={`relative mt-0.5 flex shrink-0 flex-wrap items-center gap-x-1 short:min-w-0 short:max-w-[40%] ${controlsRoom}`}>
        <LinkActions
          url={copyLink(copyUnit)}
          title={reference}
          text={copyText(copyUnit, copyFormat)}
          startByHand={startByHand}
          pieces={pieces}
          className="contents [&_button]:min-h-11 [&_button]:px-2.5 [&_button]:text-sm [&_:is(input,textarea)]:basis-full"
          statusClassName="absolute right-0 bottom-full mb-1 rounded-lg border border-line bg-surface px-2 py-0.5 text-sm text-muted"
        />
        <MemorizeControl canonical={memorizeRef} quiet />
        <InLogosDoors place={{ book, chapter, verse: verse.n }} name={`${title}:${verse.n}`} quiet />
        <MapsDoor mapRef={{ book, chapter, from: verse.n, ...(verse.to === undefined ? {} : { to: verse.to }) }} quiet />
        <SermonsDoor place={sermonPlace} quiet />
      </div>
      <ProgressMarks canonical={memorizeRef} className="mt-1 shrink-0 px-2" />
      {/* The row of actions: the chosen one is marked, not filled (the one filled control is at the foot). Three to a row, two under 15 rem of room, one row from 30 rem; the last row's
          cells stretch over it (cellSpan), so a short last row has no hole. */}
      <div className="@container mt-1 shrink-0 short:min-w-0 short:flex-1">
        <div role="group" aria-label="Actions" className="grid grid-cols-6 items-stretch gap-1 @[30rem]:grid-flow-col @[30rem]:auto-cols-fr @[30rem]:grid-cols-none">
          {offeredActions.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={action === a.id}
              onClick={() => {
                if (a.id === 'practise' && action === 'practise') setPractice(freshPractice(unitKey));
                onAction(a.id);
              }}
              className={`${CELL} ${cellSpan(i, offeredActions.length)} ${action === a.id ? CELL_CHOSEN : CELL_REST}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <section aria-label="Verse view" data-verse-view={unitId(verse)} data-immersive={immersive ? 'on' : 'off'} className="fixed inset-0 z-5 flex flex-col bg-canvas pt-[env(safe-area-inset-top)]">
      {/* No box of its own, except in a window under 300 px tall with the Ask open (src/index.css): there the header and the text scroll together above the composer (mw-5r3p30.773). */}
      <div data-verse-scroll className="contents">
      {/* At 20 rem or less of the phone's own text (390 px at 200%) the title takes a row of its own under ‹ Reader and the arrows, so a passage's heading has the whole width and is not clamped (mw-cwf538.9). */}
      <div className="@container shrink-0 border-b border-line">
      <header className="flex flex-wrap items-center gap-1 px-2 py-1.5">
        {/* The Reader beneath is inert, so focus starts here and a keyboard or screen reader finds the view first. */}
        <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 shrink-0 rounded-lg px-2 chrome-text font-medium text-accent active:bg-line @max-[20rem]:mr-auto">
          ‹ Reader
        </button>
        {passage ? (
          // the heading on top (two lines at most), the range under it on one line of its own
          // a lesson's range is headed with its own range, which the heading then says once
          <h2 aria-label={verse.h === reference ? reference : `${verse.h}, ${reference}`} className="chrome-title min-w-0 flex-1 text-center font-semibold leading-tight @max-[20rem]:order-last @max-[20rem]:basis-full">
            <span className="line-clamp-2 break-words">{verse.h}</span>
            {verse.h === reference ? null : <span className="block break-words text-sm font-medium text-muted">{reference}</span>}
          </h2>
        ) : (
          // the whole reference, wrapped (two lines at most) rather than cut: on the ladder the book changes at every verse, so '1 Thessalonians 5:16' is the only place that says where he is (mw-neuq78.19)
          <h2 className="chrome-title min-w-0 flex-1 line-clamp-2 break-words text-center font-semibold leading-tight @max-[20rem]:order-last @max-[20rem]:basis-full">{reference}</h2>
        )}
        <Arrow move={previous} name={`Previous ${noun}`} glyph="‹" />
        <Arrow move={next} name={`Next ${noun}`} glyph="›" />
      </header>
      </div>
      {/* The scroll box: the text's box, the flexible part upright, and what the chosen action shows; the controls stand under it, or in a narrow window end it. */}
      <div className="screen flex min-h-0 flex-1 flex-col px-3 pt-2">
        {lesson ? <LessonStrip title={lesson.title} ideas={lesson.ideas} onCheck={() => setChecking(lesson.key)} /> : null}
        {/* The text's box: a verse is one big [data-size='big'] paragraph; a passage's blocks (PassageText) are the Reader's own, each a [data-passage-text] with the type of its own, and
            the verse being read is kept in view by moving this box ([data-passage-box], src/reader/ChapterText.tsx). Upright it is the flexible part of the screen, never under 8 rem;
            sideways it is its content, at most 40 % of the window, and the screen scrolls. */}
        <div
          data-verse-text
          {...(passage ? { 'data-passage-box': '' } : {})}
          className={narrow ? 'max-h-[40dvh] shrink-0 overflow-y-auto overscroll-contain px-2' : 'min-h-[8rem] flex-1 overflow-y-auto overscroll-contain px-2 short:max-h-[40dvh] short:min-h-0 short:flex-none'}
        >
          {dictating && !practice.revealed ? (
            <p data-dictation-hidden className="px-1 text-base text-muted">
              The verse is hidden while you write. Listen to each phrase, write it on paper, then photograph your page.
            </p>
          ) : copying || dictating || narrating || summarizing ? (
            <p
              data-sheet-verse
              {...(copying ? { 'data-copywork-text': '' } : dictating ? { 'data-dictation-text': '' } : narrating ? { 'data-narration-text': '' } : { 'data-summary-text': '' })}
              data-size="big"
              {...copyAttrs(copyLanguage)}
              className={`break-words leading-(--lp-leading) ${copyLanguage === 'hbo' ? 'script-he reader-hebrew [--lp-greek-size:2.25rem]' : copyLanguage === 'grc' ? 'font-greek [--lp-greek-size:2.25rem] text-[length:var(--lp-greek-size)]' : 'font-sans [--lp-english-size:1.75rem] text-[length:var(--lp-english-size)]'}`}
            >
              {modelText}
            </p>
          ) : passage ? (
            <div data-sheet-verse>{text}</div>
          ) : (
            <p data-sheet-verse data-size="big" {...rowAttrs(view, source, isOrdered(wovenChapter))} className={`break-words ${typeClass}`}>
              {text}
            </p>
          )}
        </div>
        {/* What the chosen action shows, under the text it is about (the reading check marks its words, the diagram draws them, Listen's help line, the verse's talk door): nothing at all
            (no room taken) when it shows nothing. It comes before the tools and the row, so what arrives in it (a reading's result, a drawn diagram) only shortens the text's box: the
            controls under it keep their place above the foot and never move under his finger (mw-5r3p30.896). */}
        {/* The reading check keeps the ?'s side clear part by part (src/ReadCheck.tsx, mw-5r3p30.1002 and its sweep): its Next word card takes the full width, a column narrower
            makes its tip a line taller and the card no longer fits above the bar at 360x740 (mw-5r3p30.1037). Diagram must keep the full width too (DiagramPane pads its own rows,
            mw-5r3p30.1036). Every other action's block keeps the room. */}
        <div className={`mt-1 shrink-0 empty:hidden ${action === 'diagram' || action === 'read' ? '' : controlsRoom}`}>
          {action === 'listen' ? (
            // sideways the Play bar says it, and the line's room goes to the Audio Bible row under it (mw-5r3p30.468)
            <p data-action-help className={`px-1 text-sm text-muted ${audioListen ? 'short:hidden' : ''}`}>
              Tap Play to hear {name}.
            </p>
          ) : null}
          {action === 'listen' && audioBible && audibleChapter ? (
            <div data-audio-bible className="mt-3 rounded-xl border border-line p-3">
              <a
                href={audibleListen(audioBible, book, chapter).href}
                aria-label={`Listen in Audible: ${audioBible.name}, ${audibleChapter}`}
                onClick={(e) => sendOff.tap(e, { audio: audioBible, code: book, chapter })}
                className="flex min-h-12 items-center rounded-lg bg-surface px-3 text-base font-medium text-accent active:bg-line"
              >
                Listen in Audible
              </a>
              <p className="px-1 pt-2 text-base">{`In Audible: Chapters > ${audibleChapter}`}</p>
              <p className="px-1 pt-1 text-sm text-muted">{audioBible.credit}</p>
              <SendOff send={sendOff} />
            </div>
          ) : null}
          {action === 'read' && ai ? (
            <ReadCheckPanel key={unitId(verse)} verse={verse} view={view} book={book} chapter={chapter} checks={checks} hold={read} weave={weave} onRetry={onRetryRead} slot={slot} />
          ) : null}
          {action === 'practise' && ai ? (
            <PractisePane
              state={{ ...practice, language: copyLanguage }}
              onState={setPractice}
              reference={reference}
              name={name}
              languages={copyLanguages}
              copyText={modelText}
              quizOffered={quizOffered(source, hebrewOn)}
              quiz={quiz}
              slot={slot}
            />
          ) : null}
          {action === 'diagram' && ai ? <DiagramPane key={`${book}.${chapter}.${unitId(verse)}:${view}`} chapter={chapterText} verse={verse} view={view} woven={wovenChapter} onLook={onLook} /> : null}
        </div>
        {narrow ? controls : null}
      </div>
      {narrow ? null : controls}
      </div>
      {lesson && checking === lesson.key ? (
        <CheckSheet
          lesson={lesson}
          onClose={() => setChecking(null)}
          onQuiz={
            ai
              ? () => {
                  setChecking(null);
                  onAction('practise');
                  quiz.onOpen();
                }
              : undefined
          }
        />
      ) : null}
      <BarSlot level={2} />
      <div ref={setSlot} data-verse-bar className="shrink-0 border-t border-line bg-surface px-3 pt-1 pb-[calc(0.25rem+var(--lp-bar-inset))] empty:hidden">
        {slot && action === 'listen' && !listen.playing ? (
          createPortal(
            // Not a hold: a tap starts it and it runs on by itself. Same size and place as the hold bars.
            <button
              type="button"
              onClick={() => oneTap('listen-play-stop', listen.onPlay)}
              className={`mx-auto flex h-24 w-full max-w-xl select-none flex-col items-center justify-center gap-1 rounded-3xl bg-accent chrome-text font-semibold text-accent-fg ${SHORT_BAR}`}
            >
              <PlayIcon kind="play" />
              <span>{listen.again ? 'Play again' : `Play ${name}`}</span>
            </button>,
            slot,
          )
        ) : null}
        {slot && action === 'listen' && listen.playing ? (
          createPortal(
            // The Play button stays where it was, now plainly Stop (a cancel for the listening): one tap ends the reading and the speaking bar goes. The bar keeps its own Stop. Play and Stop share a oneTap key: the second tap of a double tap on Play must not stop it.
            <button
              type="button"
              data-listen-stop
              onClick={() => oneTap('listen-play-stop', stopReading)}
              className={`mx-auto flex h-24 w-full max-w-xl select-none flex-col items-center justify-center gap-1 rounded-3xl bg-accent chrome-text font-semibold text-accent-fg ${SHORT_BAR}`}
            >
              <PlayIcon kind="stop" />
              <span>Stop</span>
            </button>,
            slot,
          )
        ) : null}
      </div>
    </section>
  );
}
