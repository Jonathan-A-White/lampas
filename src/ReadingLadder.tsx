// src/ReadingLadder.tsx — the reading ladder on screen (mw-neuq78.4, docs/reading-ladder.md): the 'Reading ladder' button that starts it (in the Verse view's Read it
// aloud panel, and two on the Goal screen, one per language), the line 'Number N of M on the ladder' while he is on it, and what to do after a reading: 'Next verse' after a good one,
// 'Try again' and 'Skip for now' after one with words to fix or only part of the verse. The place is worked out from his readings (src/data/readingLadder.ts); this
// file keeps which verse the ladder has on screen and moves the Verse view to the next one. Greek, English and Hebrew each have a list and a place.
import { useRef, useState } from 'react';
import { currentLadderPlace, refParts, type LadderLang } from './data/readingLadder';
import { setLadderShowing, setReaderView, skipLadderVerse, type ReaderView, type VerseReading } from './data/repositories';
import { moveVerse, openVerseAt } from './nav/route';
import { NextBar } from './ui/NextBar';
import { useSettled } from './ui/settle';
import type { LadderHere } from './useLadder';
import { setVerseAction } from './verse/action';

/** What each list is called on screen. */
export const LADDER_NAMES: Record<LadderLang, string> = { el: 'Greek', en: 'English', he: 'Hebrew' };
const NAMES = LADDER_NAMES;
/** The Reader's view a list is read in: the source text (Greek, or the Hebrew of an Old Testament chapter) or English. */
const VIEWS: Record<LadderLang, ReaderView> = { el: 'greek', en: 'english', he: 'greek' };
const BUTTON = 'min-h-12 w-full rounded-xl border border-line px-3 text-lg font-medium';
// Try again | Skip for now side by side: at 130 % text on a 360 px phone 'Skip for now' wraps at text-lg and the bar is a line taller than it need be (mw-5r3p30.642)
const PAIR = 'min-h-12 w-full rounded-xl border border-line px-2 text-base font-medium';
const LOADING = 'Loading the ladder…';

/** Moves the Verse view to a ladder verse: on its own history entry (`here`, as the arrows do) or as a new Back step from another screen. */
function goTo(ref: string, how: 'here' | 'push'): void {
  const at = refParts(ref);
  if (!at) return;
  if (how === 'here') moveVerse(at);
  else openVerseAt(at);
}

/**
 * The 'Reading ladder' button: opens the verse the list says to read now, on the Read it aloud action. `how` is `here` inside the Verse view, `push` from another screen.
 * The list is fetched at the first tap and is large (mw-neuq78.17: seconds on a slow connection), so until the verse opens the button reads LOADING and takes no second tap.
 */
export function LadderStart({ lang, how, label = 'Reading ladder' }: { lang: LadderLang; how: 'here' | 'push'; label?: string }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const start = async (): Promise<void> => {
    setProblem(null);
    setDone(false);
    setLoading(true);
    try {
      const place = await currentLadderPlace(lang);
      if (place === null) {
        setDone(true);
        return;
      }
      await setLadderShowing(lang, place);
      if (how === 'push') {
        setVerseAction('read');
        await setReaderView(VIEWS[lang]);
      }
      goTo(place, how);
    } catch {
      setProblem(navigator.onLine === false ? 'The ladder is not on this phone yet, and you are offline.' : 'Could not load the ladder. Try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-1">
      <button type="button" data-ladder-start={lang} onClick={() => void start()} disabled={loading} aria-busy={loading} className={`${BUTTON} disabled:text-muted`}>
        {loading ? LOADING : label}
      </button>
      {done ? <p role="status" className="text-base text-muted">Every verse on the {NAMES[lang]} ladder is read well.</p> : null}
      {problem ? <p role="alert" className="text-base text-bad">{problem}</p> : null}
    </div>
  );
}

/** 'Number N of M on the ladder': where the verse stands on the list, with the ladder's name. It never says 'verse' for the rank: the verse's own number in its chapter is on the Hold bar beneath (mw-neuq78.19). */
export function LadderPosition({ lang, here }: { lang: LadderLang; here: LadderHere }) {
  return (
    <p data-ladder-position className="text-base font-semibold text-accent">
      <span className="text-muted font-medium">Reading ladder, {NAMES[lang]}: </span>
      {here.m > 0 ? `Number ${here.n} of ${here.m} on the ladder` : 'Number…'}
    </p>
  );
}

/**
 * What to do next on the ladder: after a good reading 'Next verse'; after one with words to fix or only part of the verse 'Try again' and 'Skip for now'; with no
 * result (a verse not yet read, or Try again) 'Skip for now'. The place moves by itself when a reading is well read, so Next verse only opens it.
 * The bar stands where it stood when the verse moves, so the second tap of a double tap would land on the new verse's own Skip for now and skip a verse he never
 * saw (mw-neuq78.16): a new verse, or a new result for it, takes no tap for a moment (src/ui/settle.ts), and a tap while a move is under way is dropped.
 */
export function LadderActions({ lang, here, verseKey, verdict, onTryAgain }: { lang: LadderLang; here: LadderHere; verseKey: string; verdict: VerseReading['verdict'] | undefined; onTryAgain: () => void }) {
  const settled = useSettled(`${verseKey}:${verdict ?? ''}`);
  const moving = useRef(false);
  const move = async (skip: boolean): Promise<void> => {
    if (moving.current || !settled()) return;
    moving.current = true;
    try {
      if (skip) await skipLadderVerse(lang, verseKey);
      const place = await currentLadderPlace(lang);
      await setLadderShowing(lang, place);
      if (place) goTo(place, 'here');
    } finally {
      moving.current = false;
    }
  };
  // until the list has loaded the ladder cannot say whether a verse is left
  if (here.m === 0) return null;
  if (verdict === 'well-read') {
    return here.place === null ? (
      <p role="status" className="text-base text-muted">Every verse on the {NAMES[lang]} ladder is read well.</p>
    ) : (
      <NextBar where="view">
        <button type="button" onClick={() => void move(false)} className={`${BUTTON} bg-accent text-accent-fg`}>
          Next verse
        </button>
      </NextBar>
    );
  }
  return (
    <NextBar where="view">
      {/* side by side: the bar stands over the foot of the text, and two rows of it would hide the Next word card of a partial reading */}
      <div className="grid grid-cols-2 gap-2 has-[:only-child]:grid-cols-1">
        {verdict ? (
          <button type="button" onClick={() => settled() && onTryAgain()} className={PAIR}>
            Try again
          </button>
        ) : null}
        <button type="button" onClick={() => void move(true)} className={PAIR}>
          Skip for now
        </button>
      </div>
    </NextBar>
  );
}
