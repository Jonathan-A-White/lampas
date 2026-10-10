// src/VerseView.tsx — the Verse view (mw-5r3p30.79): a tapped verse number opens the verse on a screen of its own, over the Reader, which stays
// where it was underneath (the phone's Back closes the view, src/nav/route.ts openVerse). At the top the verse big, drawn by the Reader's own
// VerseText (so the view and the weave follow the Reader, and its words are tappable); under it one row of actions (Listen, Read it aloud,
// Ask the tutor, Quiz me and Copy link); then what the chosen action shows; and at the foot ONE control
// that does the chosen action: Hold to read verse N (the reading check, src/ReadCheck.tsx, a src/ui/HoldBar.tsx), or for Ask the tutor bsv-kit's Composer
// (src/Ask.tsx AskComposer, mw-jtzpw0.3: the Hold to ask bar with his words above it, and Type a question beneath). Listen is not a hold
// (mw-5r3p30.130): its foot is a Play button, and while it plays or waits the speaking bar above has Pause / Resume, Restart and Stop.
// Quiz me (mw-5r3p30.74) has no hold: its foot is the Start the quiz / Continue the quiz button, which opens the Talk sheet in quiz mode.
// The Reader's Talk bar is not drawn while the view is open, so two bars never stack. The chosen action is kept (src/verse/action.ts); the
// arrows go to the verse before and the verse after, across a chapter's end. The action bodies draw their bar into `slot`, the foot of the view.
// A section heading opens the same view for its passage (mw-5r3p30.73): `verse` is then the passage as one Verse (src/data/passage.ts: `n` its
// first verse, `to` its last), the title is the heading and its range, every action works on the whole passage, and the arrows go to the passage
// before and after in the chapter. Nothing else differs, so there is one view engine.
import { type ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnswerCards, AskComposer, AskStatus } from './Ask';
import { ReadCheckPanel, type ReadHold } from './ReadCheck';
import type { Verse } from './data/chapter';
import { unitId, unitName, unitReference } from './data/passage';
import { passageUrl, referenceUrl } from './nav/links';
import { focusOnMount } from './ui/focus';
import { Icon as PlayIcon } from './speech/ReadControls';
import { LinkActions } from './ui/LinkActions';
import type { UseReadChecks } from './useReadChecks';
import { BarSlot } from './speech/SpeakingBarSlot';
import type { AskState } from './useAsks';
import { VERSE_ACTIONS, type VerseAction } from './verse/action';

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
  /** the verse shown, or the passage under a heading as one Verse (`to` set) */
  verse: Verse;
  view: 'english' | 'greek';
  /** the verse as the Reader draws it (the Reader's VerseText: the view, the weave and the tappable words follow the Reader) */
  text: ReactNode;
  /** the arrows: go to the verse (or, for a passage, the passage) before and after; null when there is none */
  previous: (() => void) | null;
  next: (() => void) | null;
  onClose: () => void;
  action: VerseAction;
  onAction: (action: VerseAction) => void;
  listen: ListenPlayer;
  checks: Pick<UseReadChecks, 'states'>;
  read: ReadHold;
  onRetryRead: () => void;
  /** the question in flight for this verse (Ask the tutor), and the way to send one (the composer at the foot, by voice or by hand) */
  ask: AskState | undefined;
  onAsk: (verse: Verse, question: string) => void;
  prefill: { verse: number; text: string } | null;
  /** Talk about this verse: the Bible talk's sheet (src/Talk.tsx) on the verse, for a talk with history */
  onTalk: () => void;
  /** Quiz me: opens the Talk sheet in quiz mode on this verse or passage (src/Talk.tsx, the bible-talk grind's `mode` quiz); `started` once the quiz has a turn or one on its way */
  quiz: { started: boolean; onOpen: () => void };
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
  const { title, book, chapter, verse, view, text, previous, next, onClose, action, onAction, listen, checks, read, onRetryRead, ask, onAsk, prefill, onTalk, quiz } = props;
  // The foot of the view, where the chosen action draws its bar.
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const reference = unitReference(title, verse);
  const passage = verse.to !== undefined;
  const name = unitName(verse);
  const noun = passage ? 'passage' : 'verse';
  const canShare = typeof navigator.share === 'function';
  const big = view === 'greek' ? 'font-greek [--lp-greek-size:2.25rem]' : 'font-sans [--lp-english-size:1.75rem] [--lp-greek-size:2.25rem]';
  const size = view === 'greek' ? 'text-[length:var(--lp-greek-size)]' : 'text-[length:var(--lp-english-size)]';
  return (
    <section aria-label="Verse view" data-verse-view={unitId(verse)} className="fixed inset-0 z-5 flex flex-col bg-canvas pt-[env(safe-area-inset-top)]">
      <header className="flex shrink-0 items-center gap-1 border-b border-line px-2 py-2">
        {/* The Reader beneath is inert, so focus starts here and a keyboard or screen reader finds the view first. */}
        <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-12 shrink-0 rounded-lg px-2 chrome-text font-medium text-accent active:bg-line">
          ‹ Reader
        </button>
        {passage ? (
          // the heading on top (two lines at most), the range under it on one line of its own
          <h2 aria-label={`${verse.h}, ${reference}`} className="chrome-title min-w-0 flex-1 text-center font-semibold leading-tight">
            <span className="line-clamp-2 break-words">{verse.h}</span>
            <span className="block truncate text-sm font-medium text-muted">{reference}</span>
          </h2>
        ) : (
          <h2 className="chrome-title min-w-0 flex-1 truncate text-center font-semibold">{reference}</h2>
        )}
        <Arrow move={previous} name={`Previous ${noun}`} glyph="‹" />
        <Arrow move={next} name={`Next ${noun}`} glyph="›" />
      </header>
      <div className="screen min-h-0 flex-1 px-3 pt-3">
        {/* A passage is long: its text scrolls in a box of its own so the row of actions stays in reach under it. */}
        <div {...(passage ? { 'data-passage-box': '' } : {})} className={passage ? 'max-h-[40dvh] overflow-y-auto overscroll-contain rounded-xl border border-line px-2' : undefined}>
          <p
            data-sheet-verse
            data-size="big"
            lang={view === 'greek' ? 'grc' : 'en'}
            className={`break-words leading-(--lp-leading) ${big} ${size}`}
          >
            {text}
          </p>
        </div>
        {/* One line while every label has room for two lines of its own (a container query in rem, so a larger text size wraps sooner), else
            three to a row over two rows; a phone with Share draws a sixth button, which needs more room. */}
        <div className="@container">
          <div
            role="group"
            aria-label="Actions"
            className={`relative mt-3 grid grid-cols-3 items-stretch gap-1 ${canShare ? '@[25rem]:grid-flow-col @[25rem]:grid-cols-none @[25rem]:auto-cols-fr' : '@[21rem]:grid-flow-col @[21rem]:grid-cols-none @[21rem]:auto-cols-fr'}`}
          >
            {VERSE_ACTIONS.map((a) => (
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
              className={`contents [&_button]:min-h-12 [&_button]:rounded-xl [&_button]:border [&_button]:border-line [&_button]:px-1 [&_button]:text-sm [&_button]:leading-tight [&_button]:text-fg [&>div]:contents [&_input]:col-span-3 [&_input]:col-start-1 [&_input]:row-start-3 ${canShare ? '[&_input]:@[25rem]:col-span-6 [&_input]:@[25rem]:row-start-2' : '[&_input]:@[21rem]:col-span-6 [&_input]:@[21rem]:row-start-2'}`}
              statusClassName="absolute right-0 top-full mt-0.5 rounded-lg bg-surface px-2 py-0.5 text-sm text-muted"
            />
          </div>
        </div>
        <div className="mt-3">
          {action === 'listen' ? (
            <p data-action-help className="px-1 text-sm text-muted">
              Tap Play to hear {name}.
            </p>
          ) : null}
          {action === 'read' ? (
            <ReadCheckPanel key={unitId(verse)} verse={verse} view={view} book={book} chapter={chapter} checks={checks} hold={read} onRetry={onRetryRead} slot={slot} />
          ) : null}
          {action === 'ask' ? (
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
          {action === 'quiz' ? (
            <p data-action-help className="px-1 text-sm text-muted">
              The tutor asks you about {name} one question at a time, in order, then helps you map how it is built.
            </p>
          ) : null}
        </div>
      </div>
      <BarSlot level={2} />
      <div ref={setSlot} data-verse-bar className="shrink-0 border-t border-line bg-surface px-3 pt-2 pb-[calc(0.5rem+var(--lp-bar-inset))] empty:hidden">
        {slot && action === 'listen' && !listen.playing ? (
          createPortal(
            // Not a hold: a tap starts it and it runs on by itself. Same size and place as the hold bars.
            <button
              type="button"
              onClick={listen.onPlay}
              className="mx-auto flex h-24 w-full max-w-xl select-none flex-col items-center justify-center gap-1 rounded-3xl bg-accent text-[16px] font-semibold text-accent-fg"
            >
              <PlayIcon kind="play" />
              <span>{listen.again ? 'Play again' : `Play ${name}`}</span>
            </button>,
            slot,
          )
        ) : null}
        {slot && action === 'ask' ? (
          createPortal(
            // bsv-kit's Composer (mw-jtzpw0.3): the one Hold to ask bar with his words above it, and Type a question beneath
            <AskComposer verse={verse} state={ask} onAsk={onAsk} prefill={prefill} />,
            slot,
          )
        ) : null}
        {slot && action === 'quiz' ? (
          createPortal(
            // Not a hold: the answers are given in the Talk sheet it opens, which has the hold bar for them. Same size and place as the bar.
            <button
              type="button"
              onClick={quiz.onOpen}
              className="mx-auto flex h-24 w-full max-w-xl select-none items-center justify-center rounded-3xl bg-accent text-[16px] font-semibold text-accent-fg"
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
