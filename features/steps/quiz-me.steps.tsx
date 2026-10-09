// features/steps/quiz-me.steps.tsx — runs features/quiz-me.feature: the Verse view's Quiz me action (mw-5r3p30.74). It starts the Talk sheet in quiz
// mode on a verse or a passage; the grist is the bible-talk grind's, with the whole passage's Greek and English and `mode: 'quiz'`. Postern is the fake
// (tests/support/fake-postern.ts) whose mill answers every grist with QUIZ_ANSWER; fetch serves the chapter files from disk.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { markSupplied } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { MAX_REQUEST_BYTES } from '../../src/services/talk';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, QUIZ_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;

interface RawVerse {
  n: number;
  e: { t: string }[];
  g: { t: string }[];
}
const ROMANS_8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as { verses: RawVerse[] };
const englishOf = (from: number, to: number): string =>
  ROMANS_8.verses.filter((v) => v.n >= from && v.n <= to).map((v) => v.e.map(markSupplied).join(' ')).join(' ');
const greekOf = (from: number, to: number): string =>
  ROMANS_8.verses.filter((v) => v.n >= from && v.n <= to).map((v) => v.g.map((w) => w.t).join(' ')).join(' ');
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** The fields a bible-talk request may hold: the app's text and the reader's own data, nothing fetched from anywhere. */
const REQUEST_FIELDS = ['reference', 'greek', 'english', 'question', 'history', 'solid_words', 'settings', 'mode', 'learner', 'learner_grammar', 'focus', 'study_way', 'screen'];

async function open(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: QUIZ_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear()]);
  await setReaderView('english');
  await setWeave('off');
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const sheet = () => screen.getByRole('dialog');
const bars = () => Array.from(document.querySelectorAll<HTMLElement>('[data-hold-bar]'));
const received = (i: number) => {
  const got = fake.received[i];
  if (!got) throw new Error(`the mill received no grist number ${i + 1}`);
  return got;
};
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));

const feature = await loadFeature('features/quiz-me.feature');

describeFeature(feature, ({ Scenario }) => {
  const openWith = () => open();
  const tapHeading = async (_: unknown, text: string) => {
    const heading = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => squash(h.textContent) === text);
    if (!heading) throw new Error(`no heading ${text}`);
    await user.click(within(heading).getByRole('button'));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const tapNumber = async (_: unknown, n: number) => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}` }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const choose = async (_: unknown, action: string) => {
    await user.click(within(viewEl()).getByRole('button', { name: action, exact: true }));
  };
  const tapsInView = async (_: unknown, name: string) => {
    await user.click(within(viewEl()).getByRole('button', { name, exact: true }));
  };
  const titled = async (_: unknown, title: string) => {
    expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument();
  };
  const turnsKept = (n: number) => waitFor(() => expect(turns()).toHaveLength(n));
  const sent = (count: number) => waitFor(() => expect(fake.received).toHaveLength(count));
  const keptOnly = async (_: unknown, ref: string) => {
    await waitFor(async () => expect((await db.talks.toArray()).map((t) => t.ref)).toEqual([ref]));
  };

  Scenario('Quiz me on Romans 8:1-11 sends the whole passage with the quiz marker', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern', openWith);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    Then('the Verse view shows a {string} button and no hold bar', (_, name: string) => {
      expect(within(viewEl()).getByRole('button', { name, exact: true })).toBeInTheDocument();
      expect(bars()).toHaveLength(0);
    });
    When('he taps {string}', tapsInView);
    Then('the sheet is titled {string}', titled);
    And('the mill received one grist for the lampas app, kind bible-talk, in quiz mode about {string}', async (_, reference: string) => {
      await sent(1);
      expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
      expect(received(0).input.mode).toBe('quiz');
      expect(received(0).input.reference).toBe(reference);
    });
    And('that grist carries the Greek and the English of verses 1 to 11 and no other', () => {
      expect(received(0).input.greek).toBe(greekOf(1, 11));
      expect(received(0).input.english).toBe(englishOf(1, 11));
      expect(new TextEncoder().encode(JSON.stringify(received(0).input)).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    });
    And('that grist carries his solid words and what Lampas knows of him', async () => {
      const solid = (await db.words.where('state').equals('solid').toArray()).map((w) => w.lemma);
      expect(solid.length).toBeGreaterThan(0);
      expect([...(received(0).input.solid_words as string[])].sort()).toEqual([...solid].sort());
      expect(typeof received(0).input.learner).toBe('string');
    });
    And("that grist carries nothing but the app's own text and the reader's own data", () => {
      for (const key of Object.keys(received(0).input)) expect(REQUEST_FIELDS).toContain(key);
    });
    And('the first question shows in the sheet under his {string}', async (_, said: string) => {
      await turnsKept(1);
      const [turn] = turns();
      expect(within(turn).getByText(said)).toBeInTheDocument();
      expect(turn).toHaveTextContent(QUIZ_ANSWER.answer);
    });
    And('the quiz is kept under {string} and not under the chapter, verse 1 or the passage\'s talk', keptOnly);
  });

  Scenario('An answer in the quiz carries the marker and the earlier turn', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern', openWith);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    And('he taps {string}', tapsInView);
    And('the quiz answer number {int} has arrived', (_, n: number) => turnsKept(n));
    And('he sends {string}', async (_, said: string) => {
      await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), said);
      await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
    });
    Then('the mill received {int} grists for the lampas app, kind bible-talk', (_, count: number) => sent(count));
    And('the second grist is in quiz mode about {string} with the question {string}', (_, reference: string, question: string) => {
      expect(received(1).input).toMatchObject({ mode: 'quiz', reference, question });
    });
    And('the second grist carries the first question and its answer as the earlier turn', () => {
      expect(received(1).input.history).toEqual([{ q: 'Quiz me on Romans 8:1-11.', a: QUIZ_ANSWER.answer }]);
    });
  });

  Scenario('Quiz me on one verse', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern', openWith);
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he chooses {string}', choose);
    And('he taps {string}', tapsInView);
    Then('the sheet is titled {string}', titled);
    And('the mill received one grist for the lampas app, kind bible-talk, in quiz mode about {string}', async (_, reference: string) => {
      await sent(1);
      expect(received(0).input.mode).toBe('quiz');
      expect(received(0).input.reference).toBe(reference);
    });
    And('that grist carries the Greek and the English of verse 11 alone', () => {
      expect(received(0).input.greek).toBe(greekOf(11, 11));
      expect(received(0).input.english).toBe(englishOf(11, 11));
    });
    And('the quiz is kept under {string} and not under the chapter, verse 1 or the passage\'s talk', keptOnly);
  });

  Scenario('A quiz that is already begun is continued, not begun again', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern', openWith);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    And('he taps {string}', tapsInView);
    And('the quiz answer number {int} has arrived', (_, n: number) => turnsKept(n));
    And('he taps Done on the sheet', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
    });
    Then('the Verse view shows a {string} button and no hold bar', async (_, name: string) => {
      expect(await within(viewEl()).findByRole('button', { name, exact: true })).toBeInTheDocument();
      expect(bars()).toHaveLength(0);
    });
    When('he taps {string}', tapsInView);
    Then('the sheet is titled {string}', titled);
    And('the sheet shows {int} turn', (_, n: number) => turnsKept(n));
    And('the mill received one grist for the lampas app, kind bible-talk, in quiz mode about {string}', async (_, reference: string) => {
      await sent(1);
      expect(received(0).input).toMatchObject({ mode: 'quiz', reference });
    });
  });

  Scenario('An ordinary talk about a verse is not in quiz mode', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern', openWith);
    When('he taps the number of verse 11', (ctx) => tapNumber(ctx, 11));
    And('he chooses {string}', choose);
    And('he taps {string}', tapsInView);
    And('he sends {string}', async (_, said: string) => {
      await screen.findByRole('dialog', { name: 'Talk about Romans 8:11' });
      await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), said);
      await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
    });
    Then('the mill received one grist for the lampas app, kind bible-talk, not in quiz mode', async () => {
      await sent(1);
      expect(received(0).grist).toMatchObject({ kind: 'bible-talk' });
      expect('mode' in received(0).input).toBe(false);
    });
  });
});
