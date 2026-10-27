// src/data/repositories/welcome.ts — the welcome of a new licensed reader (mw-yrmkdf.3, docs/ask-tutor.md 'The welcome'). The first time a phone's licence is found
// (src/Welcome.tsx calls startWelcomeIfFirst) a phone with nothing of the reader's kept is put on the English defaults (the English view, the Weave Off, New words a day
// Off) and a welcome talk with the tutor is due: the flag is 'pending' until the tutor ends the talk ('done') or he taps Skip ('skipped', with the index line
// 'skipped the welcome'). A phone that already has a profile, any setting or any talk is a reader from before: its flag is 'done' and nothing changes.
// The flag is the phone's own, in localStorage 'lampas.welcome' (the way the tips' day is), so a test can mark a phone welcomed before the app opens.
import { deleteTurns, screenRef } from './talks';
import { appendToIndex } from './memory';
import { holdsAReader, setGreekInterest, setHebrewInterest } from './greekInterest';

export type WelcomeStatus = 'pending' | 'done' | 'skipped';

/** localStorage key of the flag. */
export const WELCOME_KEY = 'lampas.welcome';

/** The key the welcome talk is kept under ('screen.welcome'). */
export const WELCOME_REF = screenRef('welcome');

/** What the app says to open the talk, so the tutor's first question is the first thing he reads. */
export const WELCOME_OPENING = 'Hello, I have just started using Lampas.';

/** The index line Skip writes. */
export const WELCOME_SKIPPED_LINE = 'skipped the welcome';

const isStatus = (value: unknown): value is WelcomeStatus => value === 'pending' || value === 'done' || value === 'skipped';

/** The flag as kept: null when this phone has not been looked at yet. */
export function getWelcome(): WelcomeStatus | null {
  const value = window.localStorage.getItem(WELCOME_KEY);
  return isStatus(value) ? value : null;
}

// Whoever shows the welcome follows the flag (src/Welcome.tsx useSyncExternalStore): `epoch` moves with every write, so asking for it again while it is already pending is seen.
const listeners = new Set<() => void>();
let epoch = 0;
export const subscribeWelcome = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
/** One string that changes with every write of the flag: its status, and how many writes there have been. */
export const welcomeSnapshot = (): string => `${getWelcome() ?? ''}:${epoch}`;

/** Keeps the flag (null forgets it) and tells whoever follows it. */
export async function setWelcome(status: WelcomeStatus | null): Promise<void> {
  if (status === null) window.localStorage.removeItem(WELCOME_KEY);
  else window.localStorage.setItem(WELCOME_KEY, status);
  epoch += 1;
  listeners.forEach((listener) => listener());
}

/** What the flag becomes on the first look at a phone: unchanged once it is set, 'done' for a reader from before, 'pending' for a new one. Pure. */
export function welcomeStartFor(kept: WelcomeStatus | null, existingReader: boolean): WelcomeStatus {
  if (kept !== null) return kept;
  return existingReader ? 'done' : 'pending';
}

/** True when the phone holds anything of a reader: a profile, any setting (the Greek dial's own aside) or any talk. */
export const isExistingReader = holdsAReader;

/** The English defaults of a new reader: step 0 of both dials, Just English (the English view, no Weave, no new words offered, and the rest of what the dial hides
 * turned off). Written once, when the welcome begins (and again by showWelcomeAgain). The one function: the dials' step 0 is this preset (mw-3ased2.2). Hebrew first: the Greek move
 * is the one that turns the shared settings off once both dials stand at 0. */
const putEnglishDefaults = async (): Promise<void> => {
  await setHebrewInterest(0);
  await setGreekInterest(0);
};

let starting: Promise<WelcomeStatus> | undefined;

/** Called when the licence is first found: decides the flag for a phone that has none (see welcomeStartFor) and, for a new reader, writes the English defaults. Calls
 * that overlap are one. Returns the flag. */
export function startWelcomeIfFirst(): Promise<WelcomeStatus> {
  starting ??= (async () => {
    const kept = getWelcome();
    if (kept !== null) return kept;
    // the profile is a setting too: one count covers it. The check comes before the defaults are written, which are settings themselves.
    const next = welcomeStartFor(kept, await isExistingReader());
    if (next === 'pending') await putEnglishDefaults();
    await setWelcome(next);
    return next;
  })().finally(() => {
    starting = undefined;
  });
  return starting;
}

/** The tutor ended the welcome. */
export const finishWelcome = (): Promise<void> => setWelcome('done');

/** Skip: the welcome ends with the English defaults, and the index says so. */
export async function skipWelcome(): Promise<void> {
  await appendToIndex(WELCOME_SKIPPED_LINE, 'me').catch(() => undefined);
  await setWelcome('skipped');
}

/** The Developer row's Show the welcome again, for the demo: the talk is forgotten, the English defaults are put back and the welcome is due again. */
export async function showWelcomeAgain(): Promise<void> {
  await deleteTurns(WELCOME_REF);
  await putEnglishDefaults();
  await setWelcome('pending');
}
