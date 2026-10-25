// src/VerseView.tsx — the Verse view (mw-5r3p30.79): a tapped verse number opens the verse on a screen of its own, over the Reader, which stays
// where it was underneath (the phone's Back closes the view, src/nav/route.ts openVerse). At the top the verse big, drawn by the Reader's own
// VerseText (so the view and the weave follow the Reader, and its words are tappable); under it one row of actions (Listen, Read it aloud,
// Ask the tutor, Quiz me, Diagram and Copy link); then what the chosen action shows; and at the foot ONE control
// that does the chosen action: Hold to read verse N (the reading check, src/ReadCheck.tsx, a src/talk/Bars.tsx RecordBar), or for Ask the tutor voice-kit's Composer
// (src/Ask.tsx AskComposer, mw-jtzpw0.3: the Hold to ask bar with his words above it, and Type a question beneath). Listen is not a hold
// (mw-5r3p30.130): its foot is a Play button, and while it plays or waits the speaking bar above has Pause / Resume, Restart and Stop.
// Quiz me (mw-5r3p30.74) has no hold: its foot is the Start the quiz / Continue the quiz button, which opens the Talk sheet in quiz mode.
// Diagram (mw-souyao.3) has no foot: its pane (src/diagram/DiagramPane.tsx) is drawn under the row, and a tapped word of it opens the Reader's WordSheet through `onLook`.
// The Reader's Talk bar is not drawn while the view is open, so two bars never stack. The chosen action is kept (src/verse/action.ts); the
// arrows go to the verse before and the verse after, across a chapter's end. The action bodies draw their bar into `slot`, the foot of the view.
// A section heading opens the same view for its passage (mw-5r3p30.73): `verse` is then the passage as one Verse (src/data/passage.ts: `n` its
// first verse, `to` its last), the title is the heading and its range, every action works on the whole passage, and the arrows go to the passage
// before and after in the chapter. Nothing else differs, so there is one view engine.
import { type ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnswerCards, AskComposer, AskStatus } from './Ask';
import { CheckSheet, type CheckLesson } from './CheckSheet';
import { LessonStrip } from './LessonStrip';
import { InLogosDoors } from './library/InLogosDoors';
import { ReadCheckPanel, type ReadHold } from './ReadCheck';
import type { Chapter, Verse } from './data/chapter';
import { DiagramPane } from './diagram/DiagramPane';
import type { Lookup } from './WordSheet';
import { unitId, unitName, unitReference } from './data/passage';
import { MemorizeControl } from './memorize/MemorizeControl';
import { ProgressMarks } from './memorize/ProgressMark';
import { OSIS, passageUrl, referenceUrl } from './nav/links';
import { SHORT_BAR } from './ui/barClass';
import { focusOnMount } from './ui/focus';
import { Icon as PlayIcon } from './speech/ReadControls';
import { LinkActions } from './ui/LinkActions';
import type { UseReadChecks } from './useReadChecks';
import { BarSlot } from './speech/SpeakingBarSlot';
import type { AskState } from './useAsks';
import { actionsFor, type VerseAction } from './verse/action';
import { useAiAllowed } from './gate/licenceContext';
import { audibleChapterLabel, audibleListen, audioBibleOf } from './resources/audioBible';
import { SendOff } from './plan/SendOff';
import { useSendOff } from './plan/useSendOff';
import { audioBibleSetting } from './settings/definitions';
import { useSetting } from './settings/store';
import { langOf } from './script/greekLang';
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
  onRetryRead: () => void;
  /** the question in flight for this verse (Ask the tutor), and the way to send one (the composer at the foot, by voice or by hand) */
  ask: AskState | undefined;
  onAsk: (verse: Verse, question: string) => void;
  prefill: { verse: number; text: string } | null;
  /** Talk about this verse: the Bible talk's sheet (src/Talk.tsx) on the verse, for a talk with history */
  onTalk: () => void;
  /** Quiz me: opens the Talk sheet in quiz mode on this verse or passage (src/Talk.tsx, the bible-talk grind's `mode` quiz); `started` once the quiz has a turn or one on its way */
  quiz: { started: boolean; onOpen: () => void };
  /** the view shows a passage lesson's range (src/approaches): the Lesson strip draws under the heading and its Check passes the lesson by reading it (src/CheckSheet.tsx) */
  lesson?: CheckLesson & { title: string };
}

const ARROW = 'flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-lg text-2xl text-accent active:bg-line disabled:opacity-30';

function Arrow({ move, name, glyph }: { move: (() => void) | null; name: string; glyph: string }) {
  return (
    <button type="button" aria-label={name} disabled={move === null} onClick={() => move?.()} className={ARROW}>
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}

export function VerseView(props: VerseViewProps) {
  const { title, book, chapter, chapterText, onLook, verse, view, immersive, text, previous, next, onClose, action, onAction, listen, checks, read, weave, onRetryRead, ask, onAsk, prefill, onTalk, quiz, lesson } = props;
  // the key of the lesson whose Check is open: moving to another passage leaves it closed
  const [checking, setChecking] = useState<string | null>(null);
  // The foot of the view, where the chosen action draws its bar.
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  // Read it aloud, Ask the tutor and Quiz me are the AI: not offered, and nothing of theirs drawn, without a licence (mw-8m9dyu.2).
  const ai = useAiAllowed();
  const reference = unitReference(title, verse);
  const audioBible = audioBibleOf(useSetting(audioBibleSetting) ?? 'off');
  // The Audible Bible is in English: in Greek view no English audio is offered (mw-5r3p30.653); English and the Weave keep it.
  const audibleChapter = view === 'greek' ? undefined : audibleChapterLabel(book, chapter);
  const audioListen = action === 'listen' && !!audioBible && !!audibleChapter;
  const sendOff = useSendOff();
  const passage = verse.to !== undefined;
  const name = unitName(verse);
  const memorizeRef = `${OSIS[book] ?? book}.${chapter}.${verse.n}${verse.to === undefined ? '' : `-${verse.to}`}`;
  const noun = passage ? 'passage' : 'verse';
  const canShare = typeof navigator.share === 'function';
  // A verse is shown big; a passage is set as the Reader sets its text, in the Reader's blocks (PassageText: the face and size of textClass, the Reader's leading,
  // and with Immersive on the book look of src/index.css, which [data-passage-text] shares with the Reader's verses), under his own size settings.
  const big = view === 'greek' ? 'font-greek [--lp-greek-size:2.25rem]' : 'font-sans [--lp-english-size:1.75rem] [--lp-greek-size:2.25rem]';
  const size = view === 'greek' ? 'text-[length:var(--lp-greek-size)]' : 'text-[length:var(--lp-english-size)]';
  const typeClass = `leading-(--lp-leading) ${big} ${size}`;
  return (
    <section aria-label="Verse view" data-verse-view={unitId(verse)} data-immersive={immersive ? 'on' : 'off'} className="fixed inset-0 z-5 flex flex-col bg-canvas pt-[env(safe-area-inset-top)]">
      {/* At 20 rem or less of the phone's own text (390 px at 200%) the title takes a row of its own under ‹ Reader and the arrows, so a passage's heading has the whole width and is not clamped (mw-cwf538.9). */}
      <div className="@container shrink-0 border-b border-line">
      <header className="flex flex-wrap items-center gap-1 px-2 py-2">
        {/* The Reader beneath is inert, so focus starts here and a keyboard or screen reader finds the view first. */}
        <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-12 shrink-0 rounded-lg px-2 chrome-text font-medium text-accent active:bg-line @max-[20rem]:mr-auto">
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
      <div className="screen min-h-0 flex-1 px-3 pt-3">
        {lesson ? <LessonStrip title={lesson.title} ideas={lesson.ideas} onCheck={() => setChecking(lesson.key)} /> : null}
        {/* A passage is long: its text scrolls in a box of its own so the row of actions stays in reach under it. Its blocks (PassageText) are the Reader's own,
            each a [data-passage-text] with the type of its own; a verse is one big [data-size='big'] paragraph. */}
        <div {...(passage ? { 'data-passage-box': '' } : {})} className={passage ? 'max-h-[40dvh] overflow-y-auto overscroll-contain px-2' : undefined}>
          {passage ? (
            <div data-sheet-verse>{text}</div>
          ) : (
            <p data-sheet-verse data-size="big" {...langOf(view === 'greek')} className={`break-words ${typeClass}`}>
              {text}
            </p>
          )}
        </div>
        {/* One line while every label has room for two lines of its own (a container query in rem, so a larger text size wraps sooner), else
            three to a row over two rows: the five actions and Copy link are six cells. A phone with Share keeps two rows by putting Share beside Copy link in the sixth cell
            (mw-souyao.3); only a wide row spreads them into seven. */}
        <div className="flex flex-col">
        <div className="@container">
          <div
            role="group"
            aria-label="Actions"
            className={`relative mt-3 grid grid-cols-3 items-stretch gap-1 ${canShare ? '@[29rem]:grid-flow-col @[29rem]:grid-cols-none @[29rem]:auto-cols-fr' : '@[25rem]:grid-flow-col @[25rem]:grid-cols-none @[25rem]:auto-cols-fr'}`}
          >
            {actionsFor(ai).map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={action === a.id}
                onClick={() => onAction(a.id)}
                className={`min-h-12 rounded-xl border px-1 text-sm font-medium leading-tight ${action === a.id ? 'border-accent bg-accent text-accent-fg' : 'border-line text-fg active:bg-line'}`}
              >
                {a.label}
              </button>
            ))}
            <LinkActions
              url={verse.to === undefined ? referenceUrl(book, chapter, verse.n) : passageUrl(book, chapter, verse.n, verse.to)}
              title={reference}
              className={`contents [&_button]:min-h-12 [&_button]:rounded-xl [&_button]:border [&_button]:border-line [&_button]:px-1 [&_button]:text-sm [&_button]:leading-tight [&_button]:text-fg [&_input]:col-span-3 [&_input]:col-start-1 [&_input]:row-start-3 ${canShare ? '[&>div]:flex [&>div]:flex-nowrap [&>div]:gap-1 [&>div]:@[29rem]:contents [&_button]:flex-1 [&_input]:@[29rem]:col-span-7 [&_input]:@[29rem]:row-start-2' : '[&>div]:contents [&_input]:@[25rem]:col-span-6 [&_input]:@[25rem]:row-start-2'}`}
              statusClassName="absolute right-0 top-full mt-0.5 rounded-lg bg-surface px-2 py-0.5 text-sm text-muted"
            />
          </div>
        </div>
        {/* Sideways on Listen with the Audio Bible row, the row has no room under Memorize and the Logos doors, so they go under it (mw-5r3p30.746). */}
        <div className={audioListen ? 'short:order-last' : undefined}>
          {/* Memorize (mw-fu7dqf.5): the verse, or the passage's range as one reference; the New Testament only (there is no Old Testament view), no licence */}
          <MemorizeControl canonical={memorizeRef} className="mt-1 w-full" />
          <ProgressMarks canonical={memorizeRef} className="mt-1 px-1" />
          {/* His Bible in Logos at the verse (a passage: at its first verse), and the chooser of the rest of his shelf behind In another book… (docs/design/library-at-scale.md 3.6) */}
          <InLogosDoors place={{ book, chapter, verse: verse.n }} name={`${title}:${verse.n}`} className="mt-1" />
        </div>
        <div className="mt-3">
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
          {action === 'ask' && ai ? (
            <>
              <AnswerCards verse={unitId(verse)} book={book} chapter={chapter} />
              <AskStatus verse={verse} state={ask} onAsk={onAsk} />
              {passage ? null : (
                <button type="button" onClick={onTalk} className="min-h-12 w-full rounded-xl border border-line px-5 text-lg font-medium active:bg-line">
                  Talk about verse {verse.n}
                </button>
              )}
            </>
          ) : null}
          {action === 'quiz' && ai ? (
            <p data-action-help className="px-1 text-sm text-muted">
              The tutor asks you about {name} one question at a time, in order, then helps you map how it is built.
            </p>
          ) : null}
          {action === 'diagram' && ai ? <DiagramPane key={`${unitId(verse)}:${view}`} chapter={chapterText} verse={verse} view={view} onLook={onLook} /> : null}
        </div>
        </div>
      </div>
      {lesson && checking === lesson.key ? (
        <CheckSheet
          lesson={lesson}
          onClose={() => setChecking(null)}
          onQuiz={
            ai
              ? () => {
                  setChecking(null);
                  onAction('quiz');
                  quiz.onOpen();
                }
              : undefined
          }
        />
      ) : null}
      <BarSlot level={2} />
      <div ref={setSlot} data-verse-bar className="shrink-0 border-t border-line bg-surface px-3 pt-2 pb-[calc(0.5rem+var(--lp-bar-inset))] empty:hidden">
        {slot && action === 'listen' && !listen.playing ? (
          createPortal(
            // Not a hold: a tap starts it and it runs on by itself. Same size and place as the hold bars.
            <button
              type="button"
              onClick={listen.onPlay}
              className={`mx-auto flex h-24 w-full max-w-xl select-none flex-col items-center justify-center gap-1 rounded-3xl bg-accent chrome-text font-semibold text-accent-fg ${SHORT_BAR}`}
            >
              <PlayIcon kind="play" />
              <span>{listen.again ? 'Play again' : `Play ${name}`}</span>
            </button>,
            slot,
          )
        ) : null}
        {slot && action === 'ask' && ai ? (
          createPortal(
            // voice-kit's Composer (mw-jtzpw0.3): the one Hold to ask bar with his words above it, and Type a question beneath
            <AskComposer book={book} chapter={chapter} verse={verse} reference={reference} state={ask} onAsk={onAsk} prefill={prefill} />,
            slot,
          )
        ) : null}
        {slot && action === 'quiz' && ai ? (
          createPortal(
            // Not a hold: the answers are given in the Talk sheet it opens, which has the hold bar for them. Same size and place as the bar.
            <button
              type="button"
              onClick={quiz.onOpen}
              className={`mx-auto flex h-24 w-full max-w-xl select-none items-center justify-center rounded-3xl bg-accent chrome-text font-semibold text-accent-fg ${SHORT_BAR}`}
            >
              {quiz.started ? 'Continue the quiz' : 'Start the quiz'}
            </button>,
            slot,
          )
        ) : null}
      </div>
    </section>
  );
}
