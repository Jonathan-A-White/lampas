// features/steps/bible-talk/support.tsx — what the bible-talk step files share (features/bible-talk.feature, one steps file per tag): opening Lampas on
// Romans 8 behind a fake Postern (tests/support/fake-postern.ts), the Talk sheet's controls, and endScenario, which ends every scenario clean so that
// nothing it left in flight (a grist, an answer on its way, a voice, a pinned clock) reaches the next one. fetch is stubbed: /data/ files from disk,
// https://postern.allmymind.org to the fake. Speech is a fake engine (tests/support/fake-speech.ts) where a scenario listens.
// Each steps file is its own module instance, so `fake`, `clipboard` and `synth` are that file's alone.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { App } from '../../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../../src/config';
import { db } from '../../../src/data/db';
import { clearBus } from '../../../src/events/bus';
import { tutorTimings } from '../../../src/services/tutor';
import { stopReading } from '../../../src/speech/readAloud';
import { stubChapterFetch } from '../../../tests/support/chapter-fetch';
import { messageBox } from '../../../tests/support/composer';
import { stubClipboard } from '../../../tests/support/exchange';
import { type FakePostern, POSTERN_ORIGIN, TALK_ANSWER, makeFakePostern } from '../../../tests/support/fake-postern';
import { ENGLISH_VOICE, type FakeSynth, GREEK_VOICE, stubSpeech } from '../../../tests/support/fake-speech';
import { seedHisWords } from '../../../tests/support/his-words';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

export const user = userEvent.setup();
export const PHONE_KEY = '00'.repeat(31) + '02';
export const QUESTION = 'What does συνεργεῖ mean here?';
export let fake: FakePostern;
export let clipboard = stubClipboard();
export let synth: FakeSynth | undefined;

/**
 * Ends a scenario clean, so nothing it started reaches the next one. The scenario may have ended with its answer still on the way (a step
 * that only checked the grist), or failed before its held grist was answered, which would leave the field off for good and every later
 * scenario failing at its start: end what its fake still has in flight as a failure first, so it lands at once, then let it land, kept and
 * spoken or not, before the screen goes, so it cannot write a turn or start a voice in the next scenario (mw-5r3p30.370, mw-skwocd.9).
 * Run after every scenario (AfterEachScenario) and again by `open`, so a step that opens twice starts clean too; a second run finds nothing.
 */
export async function endScenario(): Promise<void> {
  if (fake) fake.endAll({ status: 'failed', reason: 'the scenario ended' });
  const asking = screen.queryByRole('textbox', { name: 'Your message' });
  if (asking) await waitFor(() => expect(asking).toBeEnabled());
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  // learnWordToday pins the clock at noon (tests/support/learner.ts); no later scenario keeps it
  vi.useRealTimers();
  synth = undefined;
}

/** `place` is the address to open on ('' for the Reader where it opens: Romans 8). */
export async function open(configure: (f: FakePostern) => void = (f) => void (f.autoReply = { status: 'answered', answer: TALK_ANSWER }), speaks = false, place = ''): Promise<void> {
  await endScenario();
  synth = speaks ? stubSpeech([GREEK_VOICE, ENGLISH_VOICE]) : undefined;
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = place;
  tutorTimings.pollMs = 20;
  clipboard = stubClipboard();
  fake = makeFakePostern();
  configure(fake);
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

export async function selectVerse28(): Promise<void> {
  // beside verse 28's own line, not through the whole Reader: a role query on `screen` walks every word of the chapter (5 s on a loaded host, mw-5r3p30.555)
  const verse28 = await waitFor(() => {
    const found = document.querySelector<HTMLElement>('[data-verse="28"]');
    if (!found) throw new Error('verse 28 is not drawn yet');
    return found;
  });
  const numberOf = () => within(verse28).getByRole('button', { name: 'Verse 28' });
  const number = await within(verse28).findByRole('button', { name: 'Verse 28' });
  if (number.getAttribute('aria-pressed') !== 'true') await user.click(number);
  await screen.findByRole('region', { name: 'Verse view' });
  await waitFor(() => expect(numberOf()).toHaveAttribute('aria-pressed', 'true'));
}

/** Opens the Talk sheet: from the Talk bar, or, with a verse's view open, from its Ask the tutor action ('Talk about verse N'). */
export async function openTalk(): Promise<void> {
  const view = screen.queryByRole('region', { name: 'Verse view' });
  if (view) {
    await user.click(within(view).getByRole('button', { name: 'Ask the tutor', exact: true }));
    await user.click(await within(view).findByRole('button', { name: 'Talk about verse 28' }));
  } else {
    // beside the Talk bar, not through the whole Reader: a role query on `screen` for buttons walks every word of the chapter
    const bar = await waitFor(() => {
      const found = document.querySelector<HTMLElement>('[data-talk-bar]');
      if (!found) throw new Error('the Talk bar is not drawn yet');
      return found;
    });
    await user.click(await within(bar).findByRole('button', { name: 'Talk' }));
  }
  const dialog = await screen.findByRole('dialog', { name: /^Talk about / });
  // the sheet's field is drawn a moment after the sheet: wait for it here, so the next step types into it at once
  await within(dialog).findByRole('textbox', { name: 'Your message' });
}

export const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
export const field = () => within(sheet()).getByRole('textbox', { name: 'Your message' });
export const sendButton = () => within(sheet()).getByRole('button', { name: 'Send' });
/** The Talk sheet's input is voice-kit's Composer (mw-06ggew.15): Send is not drawn while nothing is in the box and a sent one's box gives way to the bar. Nothing can be sent while Send is absent or disabled. */
export const sendIsOff = (): boolean => {
  const button = within(sheet()).queryByRole('button', { name: 'Send' });
  return button === null || (button as HTMLButtonElement).disabled;
};
/** The composer takes a message: it is not disabled for a message that is out (its buttons are enabled). */
export const composerIsFree = () => expect(within(sheet()).getByRole('button', { name: 'Attach a picture' })).toBeEnabled();
export const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));

export async function send(question: string): Promise<void> {
  await user.type(await messageBox(user, sheet()), question);
  await user.click(sendButton());
}



/** Sends and waits for the answer: one more turn, and the field free again. */
export async function sendAndWait(question: string): Promise<void> {
  const before = turns().length;
  await send(question);
  await turnsKept(before + 1);
  await waitFor(composerIsFree);
}

export async function turnsKept(n: number): Promise<void> {
  await waitFor(() => expect(turns()).toHaveLength(n));
}

export async function answerShowsUnderQuestion(): Promise<void> {
  await waitFor(() => {
    const [turn] = turns();
    expect(within(turn).getByText(QUESTION)).toBeInTheDocument();
    expect(turn).toHaveTextContent(TALK_ANSWER.answer);
  });
}

/** The utterance the engine was asked to say as number `n` (0 is the first): waits for it, as the voice starts a moment after the answer shows. */
export async function spokenAt(engine: FakeSynth, n: number) {
  await waitFor(() => expect(engine.spoken.length).toBeGreaterThan(n));
  return engine.spoken[n];
}

/** Waits for turn number `index` of the sheet to show `text`: a turn is drawn, and its lines added, a moment after the step before it. */
export const turnShows = (index: number, text: string) => waitFor(() => expect(turns()[index]).toHaveTextContent(text));

export const received = (i: number) => {
  const got = fake.received[i];
  if (!got) throw new Error(`the mill received no grist number ${i + 1}`);
  return got;
};
export const history = (i: number) => received(i).input.history as { q: string; a: string }[];

export async function taps(name: string): Promise<void> {
  await user.click(within(sheet()).getByRole('button', { name }));
}
