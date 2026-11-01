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
import { holdBarsIn } from '../../tests/support/composer';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { stubMic } from '../../tests/support/fake-mic';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const ROMANS_8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as { verses: { n: number; e: { t: string }[] }[] };
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;
let synth: FakeSynth | undefined;
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
  // Ask the tutor's composer shows its Hold to ask bar only on a phone with a recogniser
  if (tutor || !hears) stubRecognizer();
  if (hears) stubMic();
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
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.readings.clear()]);
  await setReaderView('english');
  await setWeave(weave);
  await seedHisWords();
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
/** The one bar at the view's foot: the kit's TalkBar, or for Ask the tutor the Composer's Hold to ask bar. */
const bars = () => [...Array.from(document.querySelectorAll<HTMLElement>('.lp-bar')), ...holdBarsIn(document.body)];
const foot = (): HTMLElement => viewEl().querySelector<HTMLElement>('[data-verse-bar]') as HTMLElement;
const bar = () => {
  expect(bars()).toHaveLength(1);
  return bars()[0];
};
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
    // the bar says its words: a Read bar and the composer's alike
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

  Scenario('One row of actions, the tools under the text, exactly one control at the foot, and no Talk bar', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    Then('the row of actions is {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string) => {
      const row = within(viewEl()).getByRole('group', { name: 'Actions' });
      const names = within(row)
        .getAllByRole('button')
        .map((button) => button.textContent);
      expect(names).toEqual([a, b, c, d]);
    });
    And('{string} is one of the tools under the text, not an action', (_, name: string) => {
      // the quiet line under the text (Copy, Share, Memorize, the Logos doors, Maps) is a group of its own, apart from the row of actions (mw-5r3p30.896)
      expect(within(within(viewEl()).getByRole('group', { name: 'Tools' })).getByRole('button', { name, exact: true })).toBeInTheDocument();
      expect(within(within(viewEl()).getByRole('group', { name: 'Actions' })).queryByRole('button', { name, exact: true })).toBeNull();
    });
    And('exactly one control sits at the foot, the Play button of Listen, and there is no hold bar', () => {
      expect(bars()).toHaveLength(0);
      expect(within(foot()).getAllByRole('button')).toHaveLength(1);
      expect(within(foot()).getByRole('button')).toHaveTextContent('Play verse 11');
    });
    And("the Reader's Talk bar is not on screen", () => {
      expect(document.querySelector('[data-talk-bar]')).toBeNull();
    });
  });

  Scenario('Listen: Play reads the verse aloud to its end by itself', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string} and a phone that speaks', (_, weave: string) => open(weaveOf(weave), { speaks: true }));
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he chooses {string}', choose);
    Then('the Play button says {string}', (_, label: string) => {
      expect(within(foot()).getByRole('button', { name: label, exact: true })).toHaveTextContent(label);
    });
    When('he taps the Play button', async () => {
      await user.click(within(foot()).getByRole('button'));
    });
    Then('the phone is reading verse 11 aloud', async () => {
      await waitFor(() => expect(getReading().status).toBe('reading'));
      expect(getReading().verse).toBe(11);
      expect(synth?.spoken.length).toBeGreaterThan(0);
    });
    When('a minute goes by', () => {
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

  Scenario('Copy copies the verse with its link on the last line', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he taps {string}', async (_, name: string) => {
      await user.click(within(viewEl()).getByRole('button', { name, exact: true }));
    });
    Then("the phone's clipboard ends with the link of Romans 8:11", () => {
      expect(copied).toHaveLength(1);
      expect(copied[0].split('\n').at(-1)).toBe(referenceUrl('rom', 8, 11));
    });
    And('the Verse view says {string}', async (_, words: string) => {
      expect(await within(viewEl()).findByText(words)).toBeInTheDocument();
    });
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

  Scenario('There is no arrow before the first verse of Genesis', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 in the English view with the weave {string}', (_, weave: string) => open(weaveOf(weave), { hash: '#/?b=gen&c=1' }));
    When('he taps the number of verse 1', (ctx) => tapNumber(ctx, 1));
    Then('the previous verse arrow is off', arrow('previous', false));
    And('the next verse arrow is on', arrow('next', true));
  });
});

