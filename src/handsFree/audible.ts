// src/handsFree/audible.ts — 'read John 3 in Audible' (mw-rl10piw.11): his audio Bible, The Word of Promise, opened in the Audible app at the chapter, by voice. Plain 'read John 3' stays the
// recorded or phone voice inside Lampas (src/handsFree/commands.ts, story .7); the words 'in Audible' or 'on Audible' at the end (src/handsFree/passage.ts audiblePlaceOf) come here.
//  - Audio Bible Off in Settings: 'Turn on Audio Bible in Settings first', nothing is opened and what was playing goes on at the close.
//  - Otherwise it takes the sound over (Lampas's own reading stops, nothing is left for the close to resume), opens the Reader at the chapter, says the place and 'in Audible', and opens the
//    link audibleListen gives for the chapter, made at the moment it opens. It goes through the one door of the Listen in Audible tap (src/plan/useSendOff.ts openInAudible): for the Reading
//    plan's next chapter the listening session is begun before the link opens, with no send-off sheet (he cannot tap); for any other chapter there is none. A chapter with no start known
//    opens what the link opens today and names the Audible chapter to pick (audibleChapterLabel).
//  - A browser may refuse to open another app when no finger touched the screen (NOT KNOWN on his phone). When the page is still in front after openApp's wait it says
//    'Touch the screen once to open Audible', and the next touch anywhere in the following 30 s opens the same link, made anew at that touch. After 30 s, or when the page goes away, it lets go.
//  - While Audible is in front Lampas is behind it and does not hear 'Hey Lampas' (a known limit). When Lampas is in front again the wake listening runs again (src/handsFree/session.ts, the
//    document's visibility, which tests/unit/hands-free-session.test.tsx and features/hands-free-audible.feature hold).
import { titleOf } from '../data/books';
import { forgetRead } from '../nav/readerRequest';
import { openReader } from '../nav/route';
import { isPlanNext, openInAudible, type SendOffTarget } from '../plan/useSendOff';
import { audibleChapterLabel, audibleListen, audibleStartOf, audioBibleOf } from '../resources/audioBible';
import { browserEnv, type OpenEnv } from '../resources/openApp';
import { audioBibleSetting } from '../settings/definitions/audioBible';
import { getSetting } from '../settings/store';
import { stopSound } from './playback';

/** What it says when Audio Bible is Off in Settings. */
export const TURN_ON_AUDIO_BIBLE = 'Turn on Audio Bible in Settings first';

/** What it says when the page is still in front after the wait: the browser may have wanted a touch to open another app. */
export const TOUCH_TO_OPEN = 'Touch the screen once to open Audible';

/** How long after that a touch opens the link (PROVISIONAL, the Governor to confirm). */
export const TOUCH_WINDOW_MS = 30_000;

/** For tests: the OpenEnv the link is opened through (the browser's by default) and the clock the touch window runs on (real time by default). */
export const audibleSeam: { env?: OpenEnv; clock?: { setTimeout: (fn: () => void, ms: number) => unknown; clearTimeout: (handle: unknown) => void } } = {};

/** Lets go of the touch being waited for and the page being watched, if any. */
let release: (() => void) | null = null;

/** Forgets what is waited for (a new command; tests). */
export function forgetAudible(): void {
  release?.();
  release = null;
}

/** The page is still in front after the wait: says so, and the next touch within TOUCH_WINDOW_MS opens the link again, made at that touch. */
function askForTouch(target: SendOffTarget, env: OpenEnv, say: (text: string) => Promise<void>): void {
  void say(TOUCH_TO_OPEN);
  const clock = audibleSeam.clock ?? { setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms), clearTimeout: (h: unknown) => globalThis.clearTimeout(h as number) };
  let stopAway = (): void => {};
  const stop = (): void => {
    document.removeEventListener('pointerup', touched, true);
    clock.clearTimeout(timer);
    stopAway();
    if (release === stop) release = null;
  };
  // pointerup, not pointerdown: a touch counts as a user's tap for opening another app when the finger lifts (and a swipe, which ends in pointercancel, is not a tap)
  function touched(): void {
    stop();
    env.open(audibleListen(target.audio, target.code, target.chapter, Date.now()).href);
  }
  document.addEventListener('pointerup', touched, true);
  const timer = clock.setTimeout(stop, TOUCH_WINDOW_MS);
  // the page going away (he opened Audible himself) lets go of the touch too: a touch after he comes back must not open the link again from the start
  stopAway = env.onAway(stop);
  release = stop;
}

/** After the link was opened: if the page goes away (Audible took the screen) nothing more is done; if it is still in front after the wait, it asks for a touch. */
function watchPage(target: SendOffTarget, env: OpenEnv, say: (text: string) => Promise<void>): void {
  let stopAway = (): void => {};
  const cancel = env.after(() => {
    stopAway();
    askForTouch(target, env, say);
  });
  const stop = (): void => {
    cancel();
    stopAway();
    if (release === stop) release = null;
  };
  stopAway = env.onAway(stop);
  release = stop;
}

/** 'read John 3 in Audible': `say` speaks a sentence and resolves when it has been said. */
export async function listenInAudible(book: string, chapter: number, say: (text: string) => Promise<void>): Promise<void> {
  const audio = audioBibleOf(await getSetting(audioBibleSetting));
  if (!audio) return say(TURN_ON_AUDIO_BIBLE);
  forgetAudible();
  const env = audibleSeam.env ?? browserEnv;
  // the sound is his to take: Lampas's own reading stops and nothing is left for the close to go on with
  stopSound();
  forgetRead();
  openReader({ book, chapter });
  await say(`${titleOf(book, chapter)}, in Audible`);
  // a chapter with no start known opens the book: the Audible chapter to pick is said before the app takes the screen
  const label = audibleStartOf(book, chapter) === undefined ? audibleChapterLabel(book, chapter) : undefined;
  if (label !== undefined) await say(`Pick ${label} in the Audible chapters`);
  const target: SendOffTarget = { audio, code: book, chapter };
  await openInAudible(target, await isPlanNext(book, chapter), env);
  watchPage(target, env, say);
}
