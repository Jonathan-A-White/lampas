// src/reader/ReaderHeader.tsx — the Reader's header (docs/module-map.md R1, part d): the chapter's title (a button that opens the picker),
// English | Weave | Greek, the Play button of Read aloud and the Menu (three lines) that opens Tools or Settings. While a reading the speaking bar does not hold waits for Pause
// or Play, the header gives its room to those and Stop; the title stays for screen readers.
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SourceLanguage } from '../data/chapter';
import { chooseReaderLanguage, type ReaderLanguage, type ReaderView, type Weave } from '../data/repositories';
import { weaveOrderSetting } from '../settings/definitions';
import type { WeaveOrder } from '../settings/definitions/weaveOrder';
import { setSetting } from '../settings/store';
import { NO_SELECT, useLongPress } from '../ui/longPress';
import type { ReadingState } from '../speech/readAloud';
import { ReadFromButton } from '../speech/ReadControls';
import { ReaderMenu } from './ReaderMenu';

const TOAST_MS = 2500;
const WORD_ORDER_NAME: Record<SourceLanguage, Record<WeaveOrder, string>> = {
  grc: { english: 'English word order', greek: 'Greek word order' },
  hbo: { english: 'English word order', greek: 'Hebrew word order' },
};
/** What the switch calls the chapter's own words: its source view's label. */
const SOURCE_NAME: Record<SourceLanguage, string> = { grc: 'Greek', hbo: 'Hebrew' };

/** Under 390 px (a narrow phone or a split-screen window, mw-5r3p30.768) the header cannot hold the title, the switch, Play and the Menu on one line: the switch (the
 * widest, `order-1` below) goes to a line of its own, and the title, Play and the Menu stay together on the first, so no line holds a lone button.
 *
 * English | Weave | Greek while the Weave is on (English | Greek with it Off): English is plain English, Weave the woven English, and a long press on
 * Weave flips the woven text between the English and the Greek word order (the Weave's Order setting) and says which in a toast (mw-5r3p30.651). On an Old
 * Testament chapter the last choice, the chapter's source view, reads Hebrew and the order's name is the Hebrew word order (mw-5vvlay.1). A long press on that last button flips
 * the Septuagint setting (`onFlip`, src/reader/flipSeptuagint.ts) and says in a toast which text is on now, or why nothing changed (mw-u2w5klk.293).
 * A long press on Weave in a chapter whose Weave draws nothing woven (`weaves` false: a Septuagint chapter with no aligned English) does nothing (mw-u2w5klk.300). */
function ViewSwitch({ view, weave, weaveShown, weaves, weaveOrder, source, onFlip }: { view: ReaderView; weave: Weave; weaveShown: boolean; weaves: boolean; weaveOrder: WeaveOrder; source: SourceLanguage; onFlip?: () => Promise<string> }) {
  const [toast, setToast] = useState<{ text: string; top: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const weaveOn = weave !== 'off';
  const chosen: ReaderLanguage = view === 'greek' ? 'greek' : weaveOn && weaveShown ? 'weave' : 'english';
  const choose = (value: ReaderLanguage) => void chooseReaderLanguage(value, weave);
  const say = (text: string) => {
    // the toast stands under the header (or the switch's own line, where a narrow window makes the header `display: contents`), so it never hides the switch it speaks of
    setToast({ text, top: Math.max(box.current?.closest('header')?.getBoundingClientRect().bottom ?? 0, box.current?.getBoundingClientRect().bottom ?? 0) });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  };
  const flip = () => {
    // a chapter whose Weave draws nothing woven has no word order to change: the hold is ignored, and the Order every other book is laid out by is left as it was (mw-u2w5klk.300)
    if (!weaves) return;
    const next: WeaveOrder = weaveOrder === 'greek' ? 'english' : 'greek';
    void setSetting(weaveOrderSetting, next);
    choose('weave');
    say(WORD_ORDER_NAME[source][next]);
  };
  const press = useLongPress(() => choose('weave'), flip);
  const sourcePress = useLongPress(() => choose('greek'), () => void onFlip?.().then(say));
  const button = (value: ReaderLanguage, label: string) => (
    <button
      type="button"
      aria-pressed={chosen === value}
      {...(value === 'weave' ? press : value === 'greek' && onFlip ? sourcePress : { onClick: () => choose(value) })}
      className={`min-h-11 min-w-11 rounded-lg px-1 chrome-text font-medium ${value === 'weave' || (value === 'greek' && onFlip) ? NO_SELECT : ''} ${chosen === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
    >
      {label}
    </button>
  );
  return (
    <>
      <div ref={box} role="group" aria-label="Language" className="flex shrink-0 rounded-xl border border-line p-0.5 max-[389px]:order-1">
        {button('english', 'English')}
        {weaveOn ? button('weave', 'Weave') : null}
        {button('greek', SOURCE_NAME[source])}
      </div>
      {toast ? (
        <p role="status" style={{ top: toast.top + 8 }} className="pointer-events-none fixed inset-x-3 z-20 rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg shadow-lg">
          {toast.text}
        </p>
      ) : null}
    </>
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
  /** undefined while the settings load: the English | Weave | Greek switch is not drawn */
  view: ReaderView | undefined;
  /** the language of the chapter's own words: the switch's last choice is its name (Greek unless the chapter is Hebrew) */
  source?: SourceLanguage;
  weave: Weave;
  /** the woven English is shown (useReaderSettings weaveShown) */
  weaveShown: boolean;
  /** the Weave lays Greek words in the English of this chapter; false for a Septuagint chapter with no aligned English, whose Weave is the Greek alone and has no word order to flip (default true) */
  weaves?: boolean;
  weaveOrder: WeaveOrder;
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
  /** a long press on the switch's last button (Greek or Hebrew): flips the Septuagint setting and answers the words for the toast (src/reader/flipSeptuagint.ts); without it the button takes only a tap */
  onFlip?: () => Promise<string>;
}

// In rem, so the title follows the phone's own text size (at 200% it is twice as large, mw-cwf538.5), and the room it needs does too.
const TITLE_MIN_REM = 0.6875;
const TITLE_MAX_REM = 1.125;

/** The title as its two halves: the book's name ('1 Thessalonians', never broken) and the chapter ('5'; a Septuagint chapter's '23 (Greek 22)'), which may drop to a second line. */
function partsOf(title: string): { name: string; chapter: string } {
  const at = title.search(/\s\d+(?: \(Greek \d+(?: and \d+)?\))?$/);
  return at < 0 ? { name: title, chapter: '' } : { name: title.slice(0, at), chapter: title.slice(at + 1) };
}

/** The title as the pieces that are never broken, with a space between them where a line may end. An ordinary title is its name and its chapter ('1 Thessalonians', '5'). A Septuagint
 * chapter's '23 (Greek 22)' is two pieces, 'Psalms 23' and '(Greek 22)', so the title is two lines at most beside the switch, never 'Psalms / 23 / (Greek / 22)' (mw-fnvjof.17.55); the
 * room the title is given holds the wider of the two (titleRoom), and the row wraps the switch to a line of its own before it breaks one. The last piece carries the chevron. */
function titlePieces(name: string, chapter: string): string[] {
  const greek = /^(\d+) (\(Greek .+\))$/.exec(chapter);
  if (greek) return [`${name} ${greek[1]}`, greek[2]];
  return chapter ? [name, chapter] : [name];
}

/** The units that are never broken inside a title's piece: a line may end between them. In a Septuagint chapter 'Psalms 23' is the name and the number, '(Greek 114 and 115)' is '(Greek', '114' and
 * 'and 115)'. In any title the book's name is its words ('Song' 'of' 'Solomon', '1' 'Thessalonians'), so a long name goes onto a second line before it widens the title past the room beside English | Weave | Greek,
 * Play and the Menu and drops the Menu to a row of its own (mw-fnvjof.17.70, .73, .79); a word is never broken. A chapter number stands alone. */
function unitsOf(piece: string, septuagint: boolean, first: boolean): string[] {
  if (first) return piece.split(' ');
  if (!septuagint) return [piece];
  return piece.split(/ (?=and )/).flatMap((part) => (part.startsWith('(Greek ') ? [part.slice(0, 6), part.slice(7)] : [part]));
}

/** What a character of a semibold name measures, in em: the advance widths of DejaVu Bold, the wide sans of the phones this was measured on (a phone's own sans is narrower), and a little over (EM_SLACK) so a name
 * the room holds to the pixel is not wrapped by a rounding. The first estimate here, 0.72 for every lower-case letter, held 'Chronicles' 11% too wide and the Menu dropped to a row of its own for a name
 * that fits (mw-fnvjof.17.79). A digit 0.696, a space 0.348, anything not listed (a bracket) 0.46. */
const LOWER = [0.675, 0.716, 0.593, 0.716, 0.678, 0.435, 0.716, 0.712, 0.343, 0.343, 0.665, 0.343, 1.042, 0.712, 0.687, 0.716, 0.716, 0.493, 0.595, 0.478, 0.712, 0.652, 0.924, 0.645, 0.652, 0.582];
const UPPER = [0.774, 0.762, 0.734, 0.83, 0.683, 0.683, 0.821, 0.837, 0.372, 0.372, 0.775, 0.637, 0.995, 0.837, 0.85, 0.733, 0.85, 0.77, 0.72, 0.682, 0.812, 0.774, 1.103, 0.774, 0.724, 0.725];
const EM_SLACK = 1.02;
function emOf(text: string): number {
  let em = 0;
  for (const ch of text) {
    const at = ch.charCodeAt(0);
    if (ch >= '0' && ch <= '9') em += 0.696;
    else if (ch === ' ') em += 0.348;
    else if (ch >= 'a' && ch <= 'z') em += LOWER[at - 97];
    else if (ch >= 'A' && ch <= 'Z') em += UPPER[at - 65];
    else em += 0.46;
  }
  return em * EM_SLACK;
}

/** The floor of the title's type size is its rem floor, but never more than this: at Large and Largest text the floor would grow with the phone's text size (17.6 px at Largest), and beside English | Weave | Greek, Play
 * and the Menu (89 px of room at 390 px) the Menu dropped to a row of its own and the header doubled (mw-fnvjof.17.73). The switch does not grow with the text size, so neither does the title's floor past this. */
const TITLE_FLOOR_CAP_PX = 11;
/** The smallest the title goes, for the one name whose longest word does not stand in the room at the floor (beside English | Weave | Greek, Play and the Menu: 1 and 2 Thessalonians in 89 px, Lamentations and
 * Deuteronomy in the 75 px that Hebrew leaves): it shrinks to fit that word, never past this, and a row that still cannot hold it wraps. A name is never cut (mw-fnvjof.17.79). */
const TITLE_SMALLEST_REM = 0.5;
const TITLE_SMALLEST_CAP_PX = 8;
/** What the title button takes beside its text, in px: its side padding (px-1, 8) and the chevron with its margin (12 + 2). */
const TITLE_CHROME_PX = 22;
/** …of which the side padding alone (px-1). */
const TITLE_PAD_PX = 8;
const TITLE_FLOOR = `min(${TITLE_MIN_REM}rem, ${TITLE_FLOOR_CAP_PX}px)`;
const TITLE_SMALLEST = `min(${TITLE_SMALLEST_REM}rem, ${TITLE_SMALLEST_CAP_PX}px)`;

/** The title's type size: the largest the header holds, smaller only as far as the title needs to stand on one line in the room it has (`100cqw` is the title box's width, less the button's own padding and chevron);
 * where the whole title does not fit one line at the floor it stays at the floor and breaks between its words; where the widest word does not fit even there, it shrinks to that word, to TITLE_SMALLEST at the least. */
function titleSize(wholeEm: number, unitEm: number, lastEm: number): string {
  const wholeFits = `(100cqw - ${TITLE_CHROME_PX}px) / ${wholeEm.toFixed(2)}`;
  const wordFits = `min((100cqw - ${TITLE_PAD_PX}px) / ${unitEm.toFixed(2)}, (100cqw - ${TITLE_CHROME_PX}px) / ${lastEm.toFixed(2)})`;
  return `min(${TITLE_MAX_REM}rem, max(calc(${wholeFits}), min(${TITLE_FLOOR}, max(calc(${wordFits}), ${TITLE_SMALLEST}))))`;
}

/** The least room the title box is given at a type size: the widest unit at that size, whole, with the button's padding, and the chevron's room for the last unit, which carries it. A row that cannot hold it wraps, so no unit is cut. */
function titleRoom(size: string, unitEm: number, lastEm: number): string {
  return `max(calc(${size} * ${unitEm.toFixed(2)} + ${TITLE_PAD_PX}px), calc(${size} * ${lastEm.toFixed(2)} + ${TITLE_CHROME_PX}px))`;
}

// The room is the widest unit at the floor, as the switch's wrap under 390 px has it (the switch goes to a line of its own, mw-5r3p30.768); from 390 px up it is the widest unit at the smallest size, so a long name
// shrinks before it drops the Menu to a row of its own (mw-fnvjof.17.79).
export function ReaderHeader({ title, view, source = 'grc', weave, weaveShown, weaves = true, weaveOrder, chapterReading, reading, from, canRead, inert, onPick, onRead, onFlip }: ReaderHeaderProps) {
  const headerButtons = chapterReading && !reading.onBar;
  const { name, chapter } = partsOf(title);
  const pieces = titlePieces(name, chapter);
  const septuagint = /^\d+ \(Greek /.test(chapter);
  const unitsIn = (piece: string, i: number) => unitsOf(piece, septuagint, i === 0);
  // a Septuagint title's pieces stand on lines of their own beside the switch; any other title stands on one line where it can
  const wholeEm = septuagint ? Math.max(...pieces.map(emOf)) : emOf(pieces.join(' '));
  const units = pieces.flatMap(unitsIn);
  const unitEm = Math.max(...units.map(emOf));
  const lastEm = emOf(units[units.length - 1]);
  return (
    <header inert={inert} className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line px-1">
      <h1
        style={headerButtons ? undefined : ({ '--title-room': titleRoom(TITLE_FLOOR, unitEm, lastEm), '--title-room-least': titleRoom(TITLE_SMALLEST, unitEm, lastEm) } as CSSProperties)}
        className={`font-semibold leading-tight [container-type:inline-size] ${headerButtons ? 'sr-only' : 'min-w-[var(--title-room)] min-[390px]:min-w-[var(--title-room-least)] flex-1'}`}
      >
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onPick}
          className="flex min-h-12 w-full items-center rounded-lg px-1 text-left font-semibold active:bg-line"
        >
          <span className="title-wrap" style={{ fontSize: titleSize(wholeEm, unitEm, lastEm) }}>
            {pieces.map((piece, i) => (
              <Fragment key={piece}>
                {i > 0 ? ' ' : null}
                <span>
                  {unitsIn(piece, i).map((unit, u, units) => (
                    <Fragment key={unit}>
                      {u > 0 ? ' ' : null}
                      <span className="whitespace-nowrap">
                        {unit}
                        {i === pieces.length - 1 && u === units.length - 1 ? (
                          <span className="ml-0.5 inline-block align-middle text-accent">
                            <ChevronIcon />
                          </span>
                        ) : null}
                      </span>
                    </Fragment>
                  ))}
                </span>
              </Fragment>
            ))}
          </span>
        </button>
      </h1>
      {headerButtons ? <span className="flex-1" /> : null}
      {view ? <ViewSwitch view={view} weave={weave} weaveShown={weaveShown} weaves={weaves} weaveOrder={weaveOrder} source={source} onFlip={onFlip} /> : null}
      {canRead ? <ReadFromButton from={from} reading={reading} onRead={onRead} /> : null}
      <ReaderMenu />
    </header>
  );
}
