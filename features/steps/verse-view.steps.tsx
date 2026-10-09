// features/steps/verse-view.steps.tsx — runs features/verse-view.feature: the Verse view a tapped verse number opens (mw-5r3p30.79):
// the verse big and woven, one row of actions, ONE hold bar at the bottom, Back, the arrows. Speech, the recogniser and Postern are fakes
// (tests tests/support/fake-speech.ts, fake-recognizer.ts, fake-postern.ts); the press is user-event pointer input.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { referenceUrl } from '../../src/nav/links';
import { readerOf } from '../../src/nav/route';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { type StubbedMic, stubMic } from '../../tests/support/fake-mic';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const ROMANS_8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as { verses: { n: number; e: { t: string }[] }[] };
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
let fake: FakePostern;
let synth: FakeSynth | undefined;
let mic: StubbedMic | undefined;
let copied: string[] = [];

interface Options {
  speaks?: boolean;
  tutor?: boolean;
  mic?: boolean;
  hash?: string;
}

async function open(weave: 'off' | 'solid', { speaks = false, tutor = false, mic: hears = false, hash = '' }: Options = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/${hash}`);
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
  synth = speaks ? stubSpeech([GREEK_VOICE, ENGLISH_VOICE]) : undefined;
  if (tutor) stubRecognizer();
  mic = hears ? stubMic() : undefined;
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  copied = [];
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (text: string) => (copied.push(text), Promise.resolve()) },
  });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear(), db.readings.clear()]);
  await setReaderView('english');
  await setWeave(weave);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  if (weave === 'solid') await waitFor(() => expect(document.querySelectorAll('[data-reader] [data-woven]').length).toBeGreaterThan(0));
}

const weaveOf = (label: string): 'off' | 'solid' => (label === 'Solid words' ? 'solid' : 'off');
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const queryView = () => screen.queryByRole('region', { name: 'Verse view' });
const readerLine = (n: number): HTMLElement => document.querySelector<HTMLElement>(`[data-verse="${n}"] [data-text]`) as HTMLElement;
const verseOfView = () => viewEl().querySelector<HTMLElement>('[data-sheet-verse]') as HTMLElement;
const bars = () => Array.from(document.querySelectorAll<HTMLElement>('[data-hold-bar]'));
const bar = () => {
  expect(bars()).toHaveLength(1);
  return bars()[0];
};
/** The words he has said so far, as the Verse view shows them while he holds. */
const askLive = (): string => viewEl().querySelector('[data-ask-live]')?.textContent?.trim() ?? '';
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const feature = await loadFeature('features/verse-view.feature');

describeFeature(feature, ({ Scenario }) => {
  const openWith = (_: unknown, weave: string) => open(weaveOf(weave));
  const tapNumber = async (_: unknown, n: number) => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const headed = async (_: unknown, reference: string) => {
    await waitFor(() => expect(within(viewEl()).getByRole('heading', { name: reference })).toBeInTheDocument());
  };
  const closed = () => waitFor(() => expect(queryView()).toBeNull());
  const back = async () => {
    act(() => window.history.back());
    await sleep(30);
  };
  const choose = async (_: unknown, action: string) => {
    await user.click(within(viewEl()).getByRole('button', { name: action, exact: true }));
  };
  const labelled = (_: unknown, label: string) => {
    expect(bar()).toHaveAttribute('aria-label', label);
    expect(bar()).toHaveTextContent(label);
  };
  const oneBar = () => {
    expect(bars()).toHaveLength(1);
    expect(viewEl().contains(bars()[0])).toBe(true);
  };
  const step = (name: 'next' | 'previous') => async () => {
    await user.click(within(viewEl()).getByRole('button', { name: `${name === 'next' ? 'Next' : 'Previous'} verse` }));
  };
  const arrow = (name: 'next' | 'previous', on: boolean) => () => {
    const button = within(viewEl()).getByRole('button', { name: `${name === 'next' ? 'Next' : 'Previous'} verse` });
    if (on) expect(button).toBeEnabled();
    else expect(button).toBeDisabled();
  };

  Scenario('Tapping verse 11 opens the Verse view with the verse big and woven', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    And('the Reader is scrolled a little down', () => {
      (document.querySelector('[data-reader]') as HTMLElement).scrollTop = 120;
    });
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    Then('the Verse view is open, headed {string}', headed);
    And("the Verse view's verse has the same words as the Reader's line for verse 11", () =>
      waitFor(() => expect(squash(verseOfView().textContent)).toBe(squash(readerLine(11).textContent))),
    );
    And("the Verse view's verse has a Greek word woven in", () => {
      expect(verseOfView().querySelectorAll('[data-woven]').length).toBeGreaterThan(0);
    });
    And("the Verse view's verse is set bigger than the Reader's line", () => {
      // jsdom has no layout: the type size is proven at 390 px by tests/e2e/verse-view.spec.ts
      expect(verseOfView()).toHaveAttribute('data-size', 'big');
      expect(verseOfView().className).toContain('[--lp-english-size:1.75rem]');
    });
    When("he presses the phone's Back", back);
    Then('the Verse view is closed', closed);
    And('the Reader is still scrolled to the same place', () => {
      expect((document.querySelector('[data-reader]') as HTMLElement).scrollTop).toBe(120);
    });
  });

  Scenario('Back is a step of its own and the Verse view does not keep the verse selected', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And("he presses the phone's Back", back);
    Then('the Verse view is closed', closed);
    And('the address names no verse', () => {
      expect(readerOf(window.location.hash).verse).toBeUndefined();
    });
  });

  Scenario('One row of actions and exactly one hold bar, and no Talk bar', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    Then('the row of actions is {string}, {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string, e: string) => {
      const row = within(viewEl()).getByRole('group', { name: 'Actions' });
      const names = within(row)
        .getAllByRole('button')
        .map((button) => button.textContent);
      expect(names).toEqual([a, b, c, d, e]);
    });
    And('exactly one hold bar is on screen', oneBar);
    And("the Reader's Talk bar is not on screen", () => {
      expect(document.querySelector('[data-talk-bar]')).toBeNull();
    });
  });

  Scenario('Listen: the bar says Hold to listen and the verse is read aloud while it is held', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string} and a phone that speaks', (_, weave: string) => open(weaveOf(weave), { speaks: true }));
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he chooses {string}', choose);
    Then('the hold bar is labelled {string}', labelled);
    When('he holds the hold bar', async () => {
      await user.pointer({ keys: '[MouseLeft>]', target: bar(), coords: AT });
    });
    Then('the phone is reading verse 11 aloud', async () => {
      await waitFor(() => expect(getReading().status).toBe('reading'));
      expect(getReading().verse).toBe(11);
      expect(synth?.spoken.length).toBeGreaterThan(0);
    });
    When('he lets go of the hold bar', async () => {
      await user.pointer({ keys: '[/MouseLeft]', target: bar(), coords: AT });
    });
    Then('the phone has stopped reading', async () => {
      await waitFor(() => expect(getReading().status).toBe('idle'));
      expect(synth?.calls[synth.calls.length - 1]).toBe('cancel');
    });
  });

  Scenario('Listen stops at the end of the verse even while the bar is still held', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string} and a phone that speaks', (_, weave: string) => open(weaveOf(weave), { speaks: true }));
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he chooses {string}', choose);
    And('he holds the hold bar', async () => {
      await user.pointer({ keys: '[MouseLeft>]', target: bar(), coords: AT });
    });
    Then('the phone is reading verse 11 aloud', async () => {
      await waitFor(() => expect(getReading().status).toBe('reading'));
      expect(getReading().verse).toBe(11);
    });
    When('a minute goes by with the bar still held', () => {
      act(() => synth?.advance(60_000));
    });
    Then('the phone has stopped reading', async () => {
      await waitFor(() => expect(getReading().status).toBe('idle'));
    });
    And('the phone never spoke verse 12', () => {
      const spoken = (synth?.spoken ?? []).map((u) => u.text.replace(/\s+/g, ' ').trim());
      const verse = (n: number): string => ROMANS_8.verses.find((v) => v.n === n)?.e.map((c) => c.t.trim()).join(' ') ?? '';
      expect(spoken).toEqual([verse(11)]);
    });
    And('the phone said verse 11 to its end', () => {
      // it ended by itself, nobody cut it off: the honest engine's log says how each utterance went
      expect(synth?.honest.log.map((e) => e.outcome)).toEqual(['ended']);
      expect(synth?.speaking).toBe(false);
    });
  });

  Scenario('Read it aloud: the bar says Hold to read verse 11 and the reading check shows above it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he chooses {string}', choose);
    Then('the hold bar is labelled {string}', labelled);
    And('the reading check is shown', () => {
      expect(within(viewEl()).getByRole('region', { name: 'Reading check' })).toBeInTheDocument();
    });
    And('exactly one hold bar is on screen', oneBar);
  });

  Scenario('Hold to ask shows his words as he says them, not only when the clip ends', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string} and a tutor and a microphone that hears a clip', (_, weave: string) =>
      open(weaveOf(weave), { mic: true }),
    );
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he chooses {string}', choose);
    And('he holds the hold bar', async () => {
      await user.pointer({ keys: '[MouseLeft>]', target: bar(), coords: AT });
    });
    And('a second goes by', () => {
      act(() => mic?.advance(1000));
    });
    Then('the words on screen are the start of the clip, and not all of it', async () => {
      const whole = mic?.transcript ?? '';
      await waitFor(() => expect(askLive()).not.toBe(''));
      expect(askLive()).not.toBe('Listening…');
      expect(whole.startsWith(askLive())).toBe(true);
      expect(askLive()).not.toBe(whole);
    });
    When('the clip plays to its end', () => {
      act(() => mic?.advance(2000));
    });
    Then('the words on screen are the whole clip', () => {
      expect(askLive()).toBe(mic?.transcript);
    });
    When('he lets go of the hold bar', async () => {
      await user.pointer({ keys: '[/MouseLeft]', target: bar(), coords: AT });
    });
    And('a moment goes by', () => {
      act(() => mic?.advance(50));
    });
    Then('the mill received one grist for the lampas app, kind verse-ask, about {string} with the question of the whole clip', async (_, reference: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'verse-ask' });
      expect(fake.received[0].input.reference).toBe(reference);
      expect(fake.received[0].input.question).toBe(mic?.transcript);
    });
  });

  Scenario('Ask the tutor: the bar says Hold to ask and what he says goes to the tutor about the verse', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string} and a tutor and a recogniser behind a fake Postern', (_, weave: string) =>
      open(weaveOf(weave), { tutor: true }),
    );
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he chooses {string}', choose);
    Then('the hold bar is labelled {string}', labelled);
    When('he holds the hold bar and says {string} and lets go', async (_, words: string) => {
      await user.pointer({ keys: '[MouseLeft>]', target: bar(), coords: AT });
      await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
      act(() => {
        FakeRecognizer.last().open();
        FakeRecognizer.last().say([result(words, false)]);
      });
      await user.pointer({ keys: '[/MouseLeft]', target: bar(), coords: AT });
    });
    Then('the mill received one grist for the lampas app, kind verse-ask, about {string} with the question {string}', async (_, reference: string, question: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'verse-ask' });
      expect(fake.received[0].input.reference).toBe(reference);
      expect(fake.received[0].input.question).toBe(question);
    });
    And('the answer shows in the Verse view', async () => {
      await waitFor(() => expect(viewEl().querySelectorAll('[data-answer]')).toHaveLength(1));
      expect(viewEl().querySelector('[data-answer]')).toHaveTextContent(SYNERGEI_ANSWER.answer);
    });
  });

  Scenario('Copy link copies the verse\'s link', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he taps {string}', async (_, name: string) => {
      await user.click(within(viewEl()).getByRole('button', { name, exact: true }));
    });
    Then("the phone's clipboard holds the link of Romans 8:11", () => {
      expect(copied).toEqual([referenceUrl('rom', 8, 11)]);
    });
    And('the Verse view says {string}', async (_, words: string) => {
      expect(await within(viewEl()).findByText(words)).toBeInTheDocument();
    });
  });

  Scenario('The chosen action is remembered from verse to verse', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he chooses {string}', choose);
    And('he goes to the next verse', step('next'));
    Then('the Verse view is headed {string}', headed);
    And('the hold bar is labelled {string}', labelled);
  });

  Scenario('The arrows go to the verse before and the verse after', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he goes to the next verse', step('next'));
    Then('the Verse view is headed {string}', headed);
    When('he goes to the previous verse', step('previous'));
    Then('the Verse view is again headed {string}', headed);
    When("he presses the phone's Back", back);
    Then('the Verse view is closed', closed);
  });

  Scenario('Across a chapter end the arrow goes from Romans 8:39 to Romans 9:1 and back', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the number of verse 39', (ctx) => tapNumber(ctx, 39));
    Then('the next verse arrow is on', arrow('next', true));
    When('he goes to the next verse', step('next'));
    Then('the Verse view is headed {string}', headed);
    And('the previous verse arrow is on', arrow('previous', true));
    When('he goes to the previous verse', step('previous'));
    Then('the Verse view is again headed {string}', headed);
  });

  Scenario('There is no arrow before the first verse of Matthew', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Matthew 1 in the English view with the weave {string}', (_, weave: string) => open(weaveOf(weave), { hash: '#/?b=mat&c=1' }));
    When('he taps the number of verse 1', (ctx) => tapNumber(ctx, 1));
    Then('the previous verse arrow is off', arrow('previous', false));
    And('the next verse arrow is on', arrow('next', true));
  });
});

