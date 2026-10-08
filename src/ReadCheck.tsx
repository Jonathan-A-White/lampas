// src/ReadCheck.tsx — the reading check under the selected verse (the 'Reading check' region) and the Read button on the
// verse itself. English view: hold Read while reading the verse aloud, let go to send; the verse comes back with the words
// to fix marked, each tappable for its chunks and a speaker; 'Read these again' walks them one by one and ends on 'Read
// the whole verse again'. The Greek view is the same check on the verse's Greek: the words to fix are Greek, their chunks are
// Greek syllables, and the speaker is the Greek voice. The state is src/useReadChecks.ts's.
import { useLiveQuery } from 'dexie-react-hooks';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { Verse } from './data/chapter';
import { getGreekPronunciation, getVerseReading, verseRef, type FixWord, type VerseReading } from './data/repositories';
import { readingLang, readingText, type ReadingView } from './services/reading';
import { FAILURE_TITLES } from './services/tutor';
import { pronunciationOf } from './speech/pronunciation';
import { SpeakButton } from './speech/SpeakButton';
import { HoldBar } from './ui/HoldBar';
import { useHoldPress } from './ui/holdPress';
import { useElapsed } from './ui/useElapsed';
import { revealInScrollBox } from './ui/reveal';
import { DROPPED_NOTE, TAP_HINT, type ReadState, type UseReadChecks } from './useReadChecks';

const CHUNK_JOINER = ' · ';

/** The chunks of a word as he says them: 'to · geth · er'. */
const chunksLine = (chunks: string[]): string => chunks.join(CHUNK_JOINER);

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2Z" />
    </svg>
  );
}

/** The two things a Read button needs from the reading checks: the hold, and whether this verse's reading is out. */
export interface ReadHold {
  onPress: () => void;
  onRelease: () => void;
  onDrop: () => void;
  /** this verse's reading is out with the mill: it cannot be held again until the answer comes */
  disabled: boolean;
}

/** A button held to record: the press is a hold from the first touch (the first words are not lost), and a hold under half a
 * second is a tap, which the reading check answers with 'Hold while you read'. */
function HoldButton({ hold, label, className, children }: { hold: ReadHold; label: string; className: string; children: ReactNode }) {
  const press = useHoldPress({ onHold: hold.onPress, onRelease: hold.onRelease, onDrop: hold.onDrop }, 0);
  return (
    <button
      type="button"
      {...press}
      aria-label={label}
      disabled={hold.disabled}
      className={`touch-none select-none [-webkit-touch-callout:none] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** Postern's bar (src/ui/HoldBar.tsx) as the reading check's hold: a hold from the first touch, so the first words are kept. */
function ReadBar({ hold, label, recording }: { hold: ReadHold; label: string; recording: boolean }) {
  return (
    <HoldBar
      hold={{ onHold: hold.onPress, onRelease: hold.onRelease, onDrop: hold.onDrop }}
      holdMs={0}
      name={label}
      label={recording ? 'Release to send' : label}
      listening={recording}
      disabled={hold.disabled}
    />
  );
}

/** The Read button on a verse, beside its play button (English view). Holding it selects the verse so its result shows below. */
export function VerseRead({ verse, hold, className }: { verse: number; hold: ReadHold; className?: string }) {
  return (
    <HoldButton
      hold={hold}
      label={`Read verse ${verse} aloud`}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-accent active:bg-line ${className ?? ''}`}
    >
      <MicIcon />
    </HoldButton>
  );
}

/** What the reading is doing, in words: recording, the tap hint, dropped, sending, waiting, or failed with Retry. */
function Status({ state, onRetry }: { state: ReadState | undefined; onRetry: () => void }) {
  if (!state) return null;
  if (state.phase === 'recording') {
    return (
      <p role="status" className="text-base font-semibold text-accent">
        Listening… let go when you finish
      </p>
    );
  }
  if (state.phase === 'tap') return <p role="status" className="text-base text-muted">{TAP_HINT}</p>;
  if (state.phase === 'dropped') return <p role="status" className="text-base text-muted">{DROPPED_NOTE}</p>;
  if (state.phase !== 'failed') return <Waiting state={state} />;
  const title = state.failure === 'mic' ? 'Could not record' : FAILURE_TITLES[state.failure];
  const canRetry = state.recording !== undefined && state.failure !== 'mic' && state.failure !== 'not-sent';
  return (
    <div role="alert" className="space-y-2">
      <p className="text-base font-semibold text-bad">{title}</p>
      <p className="break-words text-sm text-muted">{state.detail}</p>
      {canRetry ? (
        <button type="button" onClick={onRetry} className="min-h-12 rounded-xl border border-line px-5 text-base font-medium">
          Retry
        </button>
      ) : null}
    </div>
  );
}

function Waiting({ state }: { state: Extract<ReadState, { phase: 'sending' | 'waiting' }> }) {
  const seconds = useElapsed(state.startedAt);
  return (
    <p role="status" className="text-base text-muted">
      {state.phase === 'sending' ? 'Sending…' : `Waiting for the tutor… ${seconds} s`}
    </p>
  );
}

/** What the verse and its words are set in: English in the sans face, Greek (lang grc) in the Greek one at its own size. */
const typeOf = (view: ReadingView) =>
  view === 'greek'
    ? { lang: 'grc', face: 'font-greek text-[length:var(--lp-greek-size)]', chunks: 'font-greek' }
    : { lang: 'en', face: 'font-sans text-[length:var(--lp-english-size)]', chunks: '' };

/** A word's chunks, big, with the tip and a speaker that says the whole word in the voice of the language read. */
function Fix({ fix, view, large }: { fix: FixWord; view: ReadingView; large?: boolean }) {
  const type = typeOf(view);
  return (
    <div className="space-y-1">
      <p data-chunks lang={type.lang} className={`${large ? 'text-3xl' : 'text-2xl'} ${type.chunks} font-semibold tracking-wide`}>
        {chunksLine(fix.chunks)}
      </p>
      <p className="break-words text-base text-muted">{fix.tip}</p>
      <SpeakButton
        text={fix.word}
        id={`fix-${view}-${fix.word}`}
        label="Hear it"
        kind="speaker"
        language={view === 'greek' ? 'greek' : 'english'}
        className="align-baseline"
      />
    </div>
  );
}

const WORD_PARTS = /^([^\p{L}\p{N}\p{M}]*)(.*?)([^\p{L}\p{N}\p{M}]*)$/u;
/** A word as it is compared: no case, no accents or breathings, a final sigma as a sigma, no punctuation. The mill may write
 * a Greek word without its accents, and that must still find the word in the verse. */
const normal = (word: string): string =>
  word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^\p{L}\p{N}]/gu, '');

/** The verse as he read it, every word of it, with the words the mill marked as buttons. A marked word that cannot be found
 * in the verse (the mill wrote it differently) is offered after it, so no mark is lost. */
function MarkedVerse({ text, view, words, open, onOpen }: { text: string; view: ReadingView; words: FixWord[]; open: string | null; onOpen: (word: string | null) => void }) {
  const type = typeOf(view);
  const tokens = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const marks = useMemo(() => new Set(words.map((w) => normal(w.word))), [words]);
  const found = new Set(tokens.map((t) => normal(t)).filter((t) => marks.has(t)));
  const lost = words.filter((w) => !found.has(normal(w.word)));
  const markButton = (word: string, label: string, key: string) => (
    <button
      key={key}
      type="button"
      data-fix={normal(word)}
      aria-pressed={open === normal(word)}
      onClick={() => onOpen(open === normal(word) ? null : normal(word))}
      className="inline-block min-h-11 rounded-lg bg-bad/15 px-1 font-semibold text-bad underline decoration-2 underline-offset-4"
    >
      {label}
    </button>
  );
  return (
    <>
      <p data-reading-verse lang={type.lang} className={`break-words ${type.face} leading-(--lp-leading)`}>
        {tokens.map((token, i) => {
          const [, before, core, after] = WORD_PARTS.exec(token) ?? ['', '', token, ''];
          return (
            <span key={i}>
              {before}
              {marks.has(normal(core)) ? markButton(core, core, `m${i}`) : core}
              {after}{' '}
            </span>
          );
        })}
      </p>
      {lost.length > 0 ? (
        <p className="text-base text-muted">
          Also to fix:{' '}
          {lost.map((w) => (
            <span key={w.word} className="mr-2">
              {markButton(w.word, w.word, `l-${w.word}`)}
            </span>
          ))}
        </p>
      ) : null}
    </>
  );
}

/** The result of a reading: how it went, the verse with its marked words, a tap shows their chunks, and the walk starts here. */
function Result({ reading, text, view, onWalk }: { reading: VerseReading; text: string; view: ReadingView; onWalk: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const fix = reading.words.find((w) => normal(w.word) === open);
  return (
    <div data-reading-result={reading.verdict} className="space-y-2">
      <h3 className="text-lg font-semibold">{reading.verdict === 'well-read' ? 'Well read' : 'Words to fix'}</h3>
      <p className="break-words text-base">{reading.note}</p>
      {reading.words.length > 0 ? (
        <>
          <MarkedVerse text={text} view={view} words={reading.words} open={open} onOpen={setOpen} />
          {fix ? (
            <div data-fix-detail className="rounded-xl border border-line bg-surface p-3">
              <Fix fix={fix} view={view} />
            </div>
          ) : (
            <p className="text-sm text-muted">Tap a marked word to see it in chunks.</p>
          )}
          <button type="button" onClick={onWalk} className="min-h-12 w-full rounded-xl border border-line px-5 text-lg font-medium">
            Read these again
          </button>
        </>
      ) : null}
    </div>
  );
}

/** 'Read these again': the marked words one at a time, in chunks, then the whole verse with its own hold button. */
function Walk({ words, text, view, hold, recording, onDone }: { words: FixWord[]; text: string; view: ReadingView; hold: ReadHold; recording: boolean; onDone: () => void }) {
  const type = typeOf(view);
  const [step, setStep] = useState(0);
  const last = step >= words.length;
  const word = words[step];
  const button = 'min-h-12 w-full rounded-xl border border-line px-5 text-lg font-medium';
  return (
    <div role="group" aria-label="Read these again" data-walk className="space-y-3">
      {last || !word ? (
        <>
          <p data-walk-verse lang={type.lang} className={`break-words ${type.face} leading-(--lp-leading)`}>
            {text}
          </p>
          <ReadBar hold={hold} label="Read the whole verse again" recording={recording} />
          <p className="text-sm text-muted">Hold the button while you read the whole verse. Let go to send.</p>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            Word {step + 1} of {words.length}
          </p>
          <p data-walk-word lang={type.lang} className={`break-words text-4xl font-semibold ${type.chunks}`}>
            {word.word}
          </p>
          <Fix fix={word} view={view} large />
          <p className="text-sm text-muted">Say it out loud, then go on.</p>
          <button type="button" onClick={() => setStep(step + 1)} className={button}>
            {step + 1 < words.length ? 'Next word' : 'On to the whole verse'}
          </button>
        </>
      )}
      <button type="button" onClick={onDone} className="min-h-11 rounded-lg px-3 text-base text-muted underline">
        Done
      </button>
    </div>
  );
}

/** The reading check for the selected verse. `hold` is the Read button's hold for this verse; `checks` has the states. */
export function ReadCheckPanel({ verse, text: shownText, title, view, book, chapter, checks, hold, onRetry }: {
  verse: Verse;
  /** the verse as the reader draws it (the same component, so the view and the weave show alike); tappable as in the reader */
  text: ReactNode;
  /** the chapter's title ('Romans 8'): the panel is headed by the verse's reference, title and number */
  title: string;
  view: 'english' | 'greek';
  book: string;
  chapter: number;
  checks: Pick<UseReadChecks, 'states'>;
  hold: ReadHold;
  onRetry: () => void;
}) {
  const ref = verseRef(book, chapter, verse.n);
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  const lang = readingLang(view, pronunciation);
  const reading = useLiveQuery(() => getVerseReading(ref, lang), [ref, lang]);
  const state = checks.states[verse.n];
  const sent = state?.phase === 'sending' || state?.phase === 'waiting';
  const out = state?.phase === 'recording' || sent;
  // The walk belongs to the reading it was started on: a new result closes it, and so does sending the next one.
  const [walkFor, setWalkFor] = useState<number | null>(null);
  const text = readingText(verse, view);
  const shown = typeOf(view);
  // A result, or a failure, that arrives is brought into view (never while he holds: the page must not move under his finger).
  const section = useRef<HTMLElement>(null);
  const arrived = state?.phase === 'failed' ? 'failed' : reading?.when;
  const seen = useRef(arrived);
  useEffect(() => {
    if (seen.current === arrived) return;
    seen.current = arrived;
    if (arrived !== undefined) revealInScrollBox(section.current);
  }, [arrived]);

  // The walk stays while its last button is held to record (it would lose the let-go if it went), and ends when the clip is sent.
  const walking = reading !== undefined && walkFor === reading.when && !sent;
  return (
    <section ref={section} aria-label="Reading check" data-readcheck={verse.n} className="mb-3 space-y-3 rounded-xl border border-line px-3 py-3">
      <h3 className="text-lg font-semibold">
        {title}:{verse.n}
      </h3>
      <p
        data-sheet-verse
        lang={shown.lang}
        className={`max-h-52 overflow-y-auto break-words ${shown.face} leading-(--lp-leading)`}
      >
        {shownText}
      </p>
      {walking && reading ? null : (
        <>
          <p className="text-sm text-muted">Read verse {verse.n} aloud{view === 'greek' ? ' in Greek' : ''}</p>
          <ReadBar hold={hold} label="Read" recording={state?.phase === 'recording'} />
          <p className="text-sm text-muted">Hold Read and read the verse aloud. Let go to send.</p>
          {view === 'greek' ? (
            <p className="text-sm text-muted">
              It listens for {pronunciationOf(pronunciation).label} ({pronunciationOf(pronunciation).lang}), the way you chose to hear Greek in Settings.
            </p>
          ) : null}
        </>
      )}
      <Status state={state} onRetry={onRetry} />
      {reading && (walking || !out) ? (
        walking ? (
          <Walk key={reading.when} words={reading.words} text={text} view={view} hold={hold} recording={state?.phase === 'recording'} onDone={() => setWalkFor(null)} />
        ) : (
          <Result key={reading.when} reading={reading} text={text} view={view} onWalk={() => setWalkFor(reading.when)} />
        )
      ) : null}
    </section>
  );
}
