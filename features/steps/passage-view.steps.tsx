// features/steps/passage-view.steps.tsx — runs features/passage-view.feature: a section heading opens the Verse view for its passage
// (mw-5r3p30.73). The same view as a verse's (features/verse-view.feature), so these steps prove what is different: the heading and range at the
// top, the whole passage's verses, and each action working on the whole passage. Speech, the recorder, the recogniser and Postern are fakes
// (tests/support/fake-speech.ts, fake-recorder.ts, fake-recognizer.ts, fake-postern.ts); the press is user-event pointer input.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY, LINK_ORIGIN } from '../../src/config';
import { markSupplied } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { readerOf } from '../../src/nav/route';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { holdBarsIn } from '../../tests/support/composer';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { FakeRecorder, stubRecorder } from '../../tests/support/fake-recorder';
import { makeFakePostern, POSTERN_ORIGIN, READING_ANSWER, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
let fake: FakePostern;
let synth: FakeSynth | undefined;
let copied: string[] = [];

interface RawVerse {
  n: number;
  e: { t: string }[];
  g: { t: string }[];
}
const ROMANS_8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as { verses: RawVerse[] };
/** The text the app sends for verses `from` to `to`: each verse's chunks trimmed and joined by a space, the verses joined by a space. */
const englishOf = (from: number, to: number): string =>
  ROMANS_8.verses.filter((v) => v.n >= from && v.n <= to).map((v) => v.e.map((c) => c.t.trim()).join(' ')).join(' ');
/** what the tutor is sent: the supplied words between asterisks */
const markedEnglishOf = (from: number, to: number): string =>
  ROMANS_8.verses.filter((v) => v.n >= from && v.n <= to).map((v) => v.e.map(markSupplied).join(' ')).join(' ');
const greekOf = (from: number, to: number): string =>
  ROMANS_8.verses.filter((v) => v.n >= from && v.n <= to).map((v) => v.g.map((w) => w.t).join(' ')).join(' ');
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

interface Options {
  speaks?: boolean;
  tutor?: boolean;
  recorder?: boolean;
  hash?: string;
}

async function open({ speaks = false, tutor = false, recorder = false, hash = '' }: Options = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/${hash}`);
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: recorder ? READING_ANSWER : SYNERGEI_ANSWER };
  synth = speaks ? stubSpeech([GREEK_VOICE, ENGLISH_VOICE]) : undefined;
  if (tutor) stubRecognizer();
  if (recorder) stubRecorder();
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
  await setWeave('off');
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const queryView = () => screen.queryByRole('region', { name: 'Verse view' });
/** The one bar at the view's foot: a HoldBar, or for Ask the tutor the Composer's Hold to ask bar. */
const bars = () => [...Array.from(document.querySelectorAll<HTMLElement>('[data-hold-bar]')), ...holdBarsIn(document.body)];
const foot = (): HTMLElement => viewEl().querySelector<HTMLElement>('[data-verse-bar]') as HTMLElement;
const bar = () => {
  expect(bars()).toHaveLength(1);
  return bars()[0];
};
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const headingEl = (text: string): HTMLElement => {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => squash(h.textContent) === text);
  if (!found) throw new Error(`no heading ${text}`);
  return found;
};
const passageVerses = () => Array.from(viewEl().querySelectorAll<HTMLElement>('[data-passage-verse]'));

const feature = await loadFeature('features/passage-view.feature');

describeFeature(feature, ({ Scenario }) => {
  const openWith = () => open();
  const tapHeading = async (_: unknown, text: string) => {
    await user.click(within(headingEl(text)).getByRole('button'));
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
    // a HoldBar is named by its aria-label; the composer's bar by the words on it
    if (bar().hasAttribute('data-hold-bar')) expect(bar()).toHaveAttribute('aria-label', label);
    expect(bar()).toHaveTextContent(label);
  };
  const oneBar = () => {
    expect(bars()).toHaveLength(1);
    expect(viewEl().contains(bars()[0])).toBe(true);
  };
  const step = (name: 'next' | 'previous') => async () => {
    await user.click(within(viewEl()).getByRole('button', { name: `${name === 'next' ? 'Next' : 'Previous'} passage` }));
  };
  const arrowOff = (name: 'next' | 'previous') => () => {
    expect(within(viewEl()).getByRole('button', { name: `${name === 'next' ? 'Next' : 'Previous'} passage` })).toBeDisabled();
  };
  const holdBar = async () => {
    await user.pointer({ keys: '[MouseLeft>]', target: bar(), coords: AT });
  };
  const letGo = async () => {
    await user.pointer({ keys: '[/MouseLeft]', target: bar(), coords: AT });
  };
  Scenario('Tapping the heading of Romans 8:1-11 opens the Verse view headed with the heading and its range', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    And('the Reader is scrolled a little down', () => {
      (document.querySelector('[data-reader]') as HTMLElement).scrollTop = 120;
    });
    When('he taps the heading {string}', tapHeading);
    Then('the Verse view is open, headed {string}', headed);
    And('the Verse view shows verses 1 to 11 of the chapter and no other', () => {
      expect(passageVerses().map((el) => el.getAttribute('data-passage-verse'))).toEqual(Array.from({ length: 11 }, (_, i) => String(i + 1)));
      expect(squash(viewEl().querySelector('[data-sheet-verse]')?.textContent)).toContain(englishOf(11, 11).split(' ').slice(0, 3).join(' '));
    });
    And("the Reader's Talk bar is not on screen", () => {
      expect(document.querySelector('[data-talk-bar]')).toBeNull();
    });
    When("he presses the phone's Back", back);
    Then('the Verse view is closed', closed);
    And('the Reader is still scrolled to the same place', () => {
      expect((document.querySelector('[data-reader]') as HTMLElement).scrollTop).toBe(120);
    });
    And('the address names no passage', () => {
      expect(readerOf(window.location.hash).passage).toBeUndefined();
    });
  });

  Scenario('The whole heading is the tap target and it looks as before', ({ Given, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    Then('every section heading is one button holding its whole text', () => {
      const headings = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]'));
      expect(headings).toHaveLength(5);
      for (const h of headings) {
        expect(h.children).toHaveLength(1);
        expect(h.children[0].tagName).toBe('BUTTON');
        expect(h.children[0].textContent).toBe(h.textContent);
        expect(h.className).toContain('text-accent');
      }
    });
    And('the heading {string} is still a level 2 heading', (_, text: string) => {
      expect(headingEl(text).tagName).toBe('H2');
    });
  });

  Scenario('The passage has the same one row of actions and exactly one control at the foot', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the heading {string}', tapHeading);
    Then('the row of actions is {string}, {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string, e: string) => {
      const row = within(viewEl()).getByRole('group', { name: 'Actions' });
      expect(within(row).getAllByRole('button').map((button) => button.textContent)).toEqual([a, b, c, d, e]);
    });
    And('exactly one control sits at the foot, the Play button of Listen, and there is no hold bar', () => {
      expect(bars()).toHaveLength(0);
      expect(within(foot()).getAllByRole('button')).toHaveLength(1);
      expect(within(foot()).getByRole('button')).toHaveTextContent('Play verses 1-11');
    });
  });

  Scenario('Listen reads the whole passage aloud to its end by itself', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string} and a phone that speaks', () => open({ speaks: true }));
    When('he taps the heading {string}', tapHeading);
    Then('the Play button says {string}', (_, label: string) => {
      expect(within(foot()).getByRole('button', { name: label, exact: true })).toHaveTextContent(label);
    });
    When('he taps the Play button', async () => {
      await user.click(within(foot()).getByRole('button'));
    });
    Then('the phone is reading verse 1 aloud', async () => {
      await waitFor(() => expect(getReading().status).toBe('reading'));
      expect(getReading().verse).toBe(1);
      expect(squash(synth?.spoken[0].text)).toBe(englishOf(1, 1));
    });
    When('the phone finishes speaking until verse 11 is being read', () => {
      for (let i = 0; i < 40 && getReading().verse !== 11; i++) act(() => synth?.finish());
      expect(getReading().verse).toBe(11);
    });
    Then('verse 11 is the one highlighted in the Verse view', async () => {
      await waitFor(() => expect(viewEl().querySelector('[data-passage-verse="11"]')).toHaveAttribute('data-reading'));
      expect(viewEl().querySelectorAll('[data-reading]')).toHaveLength(1);
    });
    When('the phone finishes speaking', () => {
      act(() => synth?.finishAll());
    });
    Then('the phone has stopped reading', async () => {
      await waitFor(() => expect(getReading().status).toBe('idle'));
    });
    And('the phone never spoke verse 12', () => {
      // the package speaks a verse a sentence at a time: what was spoken, put together, is verses 1 to 11 and nothing of verse 12
      const spoken = squash(synth?.spoken.map((u) => u.text).join(' '));
      expect(spoken).toBe(squash(englishOf(1, 11)));
      expect(spoken).not.toContain(squash(englishOf(12, 12)).slice(0, 30));
    });
  });

  Scenario("Read it aloud sends the whole passage's English to be scored", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string} and a reading check behind a fake Postern', () => open({ recorder: true }));
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    Then('the hold bar is labelled {string}', labelled);
    And('the reading check is shown', () => {
      expect(within(viewEl()).getByRole('region', { name: 'Reading check' })).toBeInTheDocument();
    });
    And('exactly one hold bar is on screen', oneBar);
    When('he holds the hold bar for 2 seconds and lets go', async () => {
      FakeRecorder.durationMs = 2000;
      await user.pointer([
        { keys: '[MouseLeft>]', target: bar(), coords: AT },
        { keys: '[/MouseLeft]', target: bar(), coords: AT },
      ]);
    });
    Then(
      'the mill received one grist for the lampas app, kind verse-read, about {string} whose target_text holds the English of verses 1 to 11 and no other',
      async (_, reference: string) => {
        await waitFor(() => expect(fake.received).toHaveLength(1));
        expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'verse-read' });
        expect(fake.received[0].input).toEqual({ reference, target_text: englishOf(1, 11), lang: 'en' });
      },
    );
    And('the reading of the passage is kept under {string} and not under verse 1', async (_, ref: string) => {
      await waitFor(async () => expect(await db.readings.get(ref)).toBeDefined());
      expect(await db.readings.get('rom.8.1')).toBeUndefined();
    });
  });

  Scenario('Ask the tutor about the passage carries its reference and text', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string} and a tutor and a recogniser behind a fake Postern', () =>
      open({ tutor: true }),
    );
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    Then('the hold bar is labelled {string}', labelled);
    When('he holds the hold bar and says {string} and lets go', async (_, words: string) => {
      await holdBar();
      await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
      act(() => {
        FakeRecognizer.last().open();
        FakeRecognizer.last().say([result(words, false)]);
      });
      await letGo();
    });
    Then('the mill received one grist for the lampas app, kind verse-ask, about {string} with the question {string}', async (_, reference: string, question: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'verse-ask' });
      expect(fake.received[0].input.reference).toBe(reference);
      expect(fake.received[0].input.question).toBe(question);
    });
    And('that grist carries the Greek and the English of verses 1 to 11 and no other', () => {
      expect(fake.received[0].input.greek).toBe(greekOf(1, 11));
      expect(fake.received[0].input.english).toBe(markedEnglishOf(1, 11));
    });
    And('the answer shows in the Verse view', async () => {
      await waitFor(() => expect(viewEl().querySelectorAll('[data-answer]')).toHaveLength(1));
      expect(viewEl().querySelector('[data-answer]')).toHaveTextContent(SYNERGEI_ANSWER.answer);
    });
    And('the answer is kept under {string} and not under verse 1', async (_, ref: string) => {
      const refs = (await db.answers.toArray()).map((a) => a.ref);
      expect(refs).toEqual([ref]);
    });
  });

  Scenario("Copy link copies the passage's link", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', async (_, name: string) => {
      await user.click(within(viewEl()).getByRole('button', { name, exact: true }));
    });
    Then("the phone's clipboard holds the link of Romans 8:1-11", () => {
      expect(copied).toEqual([`${LINK_ORIGIN}/#/?ref=Rom.8.1-11`]);
    });
    And('the Verse view says {string}', async (_, words: string) => {
      expect(await within(viewEl()).findByText(words)).toBeInTheDocument();
    });
  });

  Scenario("The arrows go to the passage before and the passage after, and are off at the chapter's ends", ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the heading {string}', tapHeading);
    Then('the previous passage arrow is off', arrowOff('previous'));
    When('he goes to the next passage', step('next'));
    Then('the Verse view is headed {string}', headed);
    When('he goes to the previous passage', step('previous'));
    Then('the Verse view is again headed {string}', headed);
  });

  Scenario('The last passage of the chapter has no next passage', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith);
    When('he taps the heading {string}', tapHeading);
    Then('the Verse view is open, headed {string}', headed);
    And('the next passage arrow is off', arrowOff('next'));
  });

  Scenario('A link or a reopen at a passage opens its view', ({ Given, Then }) => {
    Given('Lampas is opened on Romans 8 at the passage that starts at verse 12', () => open({ hash: '#/?b=rom&c=8&view=english&weave=off&p=12' }));
    Then('the Verse view is open, headed {string}', headed);
  });
});
