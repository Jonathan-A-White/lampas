// src/reader/ReaderHeader.tsx — the Reader's header (docs/module-map.md R1, part d): the chapter's title (a button that opens the picker),
// English | Greek, the Play button of Read aloud and the gear that opens Settings. While a reading the speaking bar does not hold waits for Pause
// or Play, the header gives its room to those and Stop; the title stays for screen readers.
import { setReaderView, type ReaderView } from '../data/repositories';
import { navigate } from '../nav/route';
import type { ReadingState } from '../speech/readAloud';
import { ReadFromButton } from '../speech/ReadControls';

function ViewSwitch({ view }: { view: ReaderView }) {
  const choice = (value: ReaderView, label: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => void setReaderView(value)}
      className={`min-h-11 min-w-11 rounded-lg px-1 chrome-text font-medium ${view === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
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

export interface ReaderHeaderProps {
  title: string;
  /** undefined while the settings load: the English | Greek switch is not drawn */
  view: ReaderView | undefined;
  /** a chapter reading is under way (not a tutor answer being read) */
  chapterReading: boolean;
  reading: ReadingState;
  /** the selected verse, which the Play button reads from; null reads from the top */
  from: number | null;
  /** whether there is a plan to read (or a reading crossing into this chapter): the Play button is drawn only then */
  canRead: boolean;
  /** the Verse view is open over the Reader */
  inert: boolean;
  onPick(): void;
  onRead(): void;
}

// In rem, so the title follows the phone's own text size (at 200% it is twice as large, mw-cwf538.5), and the room it needs does too.
const TITLE_MIN_REM = 0.6875;
const TITLE_MAX_REM = 1.125;
/** A letter of a semibold name, in em, at the most (the phone's own wide sans, DejaVu, measures 0.75 on 'Romans'): a name's room is its length times this. */
const LETTER_EM = 0.8;

/** The title as its two halves: the book's name ('1 Thessalonians', never broken) and the chapter ('5'), which may drop to a second line. */
function partsOf(title: string): { name: string; chapter: string } {
  const at = title.search(/\s\d+$/);
  return at < 0 ? { name: title, chapter: '' } : { name: title.slice(0, at), chapter: title.slice(at + 1) };
}

/** The title's type size: the largest the header holds, smaller only as far as the book's name needs to stand whole on a line in the room the
 * title has (`100cqw` is the title box's width; a name's letters average up to about 0.8 em in semibold). The chapter is never cut. */
function titleSize(name: string): string {
  return `clamp(${TITLE_MIN_REM}rem, calc(100cqw / ${(name.length * LETTER_EM).toFixed(2)}), ${TITLE_MAX_REM}rem)`;
}

/** The least room the title box is given: the book's name at the smallest size, whole. A row that cannot hold it wraps, so the name is never cut. */
function titleRoom(name: string): string {
  return `${(name.length * LETTER_EM * TITLE_MIN_REM).toFixed(2)}rem`;
}

export function ReaderHeader({ title, view, chapterReading, reading, from, canRead, inert, onPick, onRead }: ReaderHeaderProps) {
  const headerButtons = chapterReading && !reading.onBar;
  const { name, chapter } = partsOf(title);
  return (
    <header inert={inert} className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line px-1">
      <h1 style={headerButtons ? undefined : { minWidth: titleRoom(name) }} className={`font-semibold leading-tight [container-type:inline-size] ${headerButtons ? 'sr-only' : 'flex-1'}`}>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onPick}
          className="flex min-h-12 w-full items-center rounded-lg px-1 text-left font-semibold active:bg-line"
        >
          <span className="min-w-0" style={{ fontSize: titleSize(name) }}>
            <span className="whitespace-nowrap">{name}</span>
            {chapter ? ' ' : null}
            <span className="whitespace-nowrap">
              {chapter}
              <span className="ml-0.5 inline-block align-middle text-accent">
                <ChevronIcon />
              </span>
            </span>
          </span>
        </button>
      </h1>
      {headerButtons ? <span className="flex-1" /> : null}
      {view ? <ViewSwitch view={view} /> : null}
      {canRead ? <ReadFromButton from={from} reading={reading} onRead={onRead} /> : null}
      <button
        type="button"
        aria-label="Settings"
        onClick={() => navigate('settings')}
        className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-lg text-accent active:bg-line"
      >
        <GearIcon />
      </button>
    </header>
  );
}
