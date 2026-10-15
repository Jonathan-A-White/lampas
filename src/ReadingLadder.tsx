// src/ReadingLadder.tsx — the reading ladder on screen (mw-neuq78.4, docs/reading-ladder.md): the 'Reading ladder' button that starts it (in the Verse view's Read it
// aloud panel, and two on the Goal screen, one per language), the line 'Verse N of M' while he is on it, and what to do after a reading: 'Next verse' after a good one,
// 'Try again' and 'Skip for now' after one with words to fix or only part of the verse. The place is worked out from his readings (src/data/readingLadder.ts); this
// file keeps which verse the ladder has on screen and moves the Verse view to the next one. Greek and English each have a list and a place.
import { useState } from 'react';
import { currentLadderPlace, refParts, type LadderLang } from './data/readingLadder';
import { setLadderShowing, setReaderView, skipLadderVerse, type ReaderView, type VerseReading } from './data/repositories';
import { moveVerse, openVerseAt } from './nav/route';
import { NextBar } from './ui/NextBar';
import type { LadderHere } from './useLadder';
import { setVerseAction } from './verse/action';

const NAMES: Record<LadderLang, string> = { el: 'Greek', en: 'English' };
const VIEWS: Record<LadderLang, ReaderView> = { el: 'greek', en: 'english' };
const BUTTON = 'min-h-12 w-full rounded-xl border border-line px-5 text-lg font-medium';

/** Moves the Verse view to a ladder verse: on its own history entry (`here`, as the arrows do) or as a new Back step from another screen. */
function goTo(ref: string, how: 'here' | 'push'): void {
  const at = refParts(ref);
  if (!at) return;
  if (how === 'here') moveVerse(at);
  else openVerseAt(at);
}

/** The 'Reading ladder' button: opens the verse the list says to read now, on the Read it aloud action. `how` is `here` inside the Verse view, `push` from another screen. */
export function LadderStart({ lang, how, label = 'Reading ladder' }: { lang: LadderLang; how: 'here' | 'push'; label?: string }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const start = async (): Promise<void> => {
    setProblem(null);
    setDone(false);
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
    }
  };
  return (
    <div className="space-y-1">
      <button type="button" data-ladder-start={lang} onClick={() => void start()} className={BUTTON}>
        {label}
      </button>
      {done ? <p role="status" className="text-base text-muted">Every verse on the {NAMES[lang]} ladder is read well.</p> : null}
      {problem ? <p role="alert" className="text-base text-bad">{problem}</p> : null}
    </div>
  );
}

/** 'Verse N of M': where the verse stands on the list, with the ladder's name. */
export function LadderPosition({ lang, here }: { lang: LadderLang; here: LadderHere }) {
  return (
    <p data-ladder-position className="text-base font-semibold text-accent">
      <span className="text-muted font-medium">Reading ladder, {NAMES[lang]}: </span>
      {here.m > 0 ? `Verse ${here.n} of ${here.m}` : 'Verse…'}
    </p>
  );
}

/**
 * What to do next on the ladder: after a good reading 'Next verse'; after one with words to fix or only part of the verse 'Try again' and 'Skip for now'; with no
 * result (a verse not yet read, or Try again) 'Skip for now'. The place moves by itself when a reading is well read, so Next verse only opens it.
 */
export function LadderActions({ lang, here, verseKey, verdict, onTryAgain }: { lang: LadderLang; here: LadderHere; verseKey: string; verdict: VerseReading['verdict'] | undefined; onTryAgain: () => void }) {
  const move = async (skip: boolean): Promise<void> => {
    if (skip) await skipLadderVerse(lang, verseKey);
    const place = await currentLadderPlace(lang);
    await setLadderShowing(lang, place);
    if (place) goTo(place, 'here');
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
      <div className="space-y-2">
        {verdict ? (
          <button type="button" onClick={onTryAgain} className={BUTTON}>
            Try again
          </button>
        ) : null}
        <button type="button" onClick={() => void move(true)} className={BUTTON}>
          Skip for now
        </button>
      </div>
    </NextBar>
  );
}
