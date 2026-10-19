// features/steps/reading-plan-return.steps.tsx — runs features/reading-plan-return.feature: back in Lampas with a listening session open, the return sheet asks
// 'Where did you get to?' (src/plan/WhereDidYouGetTo.tsx). Only Date is faked (pinClockAtNoon's way), so the time away is the clock moved on by whole chapters of
// listening; leaving and coming back are the page's own visibilitychange events.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { OT_BOOKS } from '../../src/data/otBooks';
import { planOf, type PlanChapter } from '../../src/data/plans';
import { beginSession, nextChapter, openSession, progress, startPlan } from '../../src/data/repositories/readingPlan';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { chapterLength } from '../../src/plan/estimate';
import { readingPlanSetting } from '../../src/settings/definitions/readingPlan';
import { setSetting } from '../../src/settings/store';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { sheetEntriesGone } from '../../tests/support/sheet-history';

afterAll(() => {
  setVisibility('visible');
  vi.useRealTimers();
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const SHEET = 'Where did you get to?';

/** the time the session began (ms): the clock is set to this plus the chapters' worth of listening */
let sessionStart = 0;
/** where the plan was started: the session begins at this chapter unless a step says another */
let startedAt: PlanChapter = { code: 'lev', chapter: 1 };

/** 'Leviticus 1' -> its book code and chapter number */
function chapterNamed(name: string): PlanChapter {
  const at = name.lastIndexOf(' ');
  const book = [...OT_BOOKS, ...BOOKS].find((b) => b.name === name.slice(0, at));
  if (!book) throw new Error(`no book named in ${name}`);
  return { code: book.code, chapter: Number(name.slice(at + 1)) };
}

function setVisibility(state: 'hidden' | 'visible'): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  Object.defineProperty(document, 'hidden', { value: state === 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

async function openFresh(): Promise<void> {
  cleanup();
  // Unmounting the last scenario's open sheet steps history back (useSheetBack); jsdom lands that popstate a moment later, and it must land before this one.
  await sheetEntriesGone();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  setVisibility('visible');
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-16T12:00:00Z') });
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  window.history.replaceState(null, '', '/');
}

async function startedPlanAt(name: string): Promise<void> {
  await openFresh();
  startedAt = chapterNamed(name);
  await startPlan('whole-bible', startedAt);
}

async function openTheReader(): Promise<void> {
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function listeningAt(name: string): Promise<void> {
  const at = chapterNamed(name);
  sessionStart = Date.now();
  await beginSession({ ...at, startedAt: sessionStart });
}

/** She leaves for Audible and, `chapters` later, comes back: the clock is `chapters` chapters of listening, from the session's chapter, after the session began. */
async function awayAndBack(_: unknown, chapters: number): Promise<void> {
  const whole = planOf('whole-bible')!.chapters();
  const from = whole.findIndex((c) => c.code === startedAt.code && c.chapter === startedAt.chapter);
  const time = whole.slice(from, from + chapters).reduce((sum, c) => sum + chapterLength(c), 0);
  await act(async () => setVisibility('hidden'));
  vi.setSystemTime((sessionStart || Date.now()) + time + 1000);
  await act(async () => setVisibility('visible'));
}

const sheet = (): HTMLElement | null => screen.queryByRole('dialog', { name: SHEET });

const planAndReader = async (_: unknown, name: string): Promise<void> => {
  await startedPlanAt(name);
  await openTheReader();
};
const sessionAt = (_: unknown, name: string): Promise<void> => listeningAt(name);
const sheetIsOpen = async (_: unknown, name: string): Promise<void> => {
  expect(await screen.findByRole('dialog', { name })).toBeInTheDocument();
};
const proposes = async (_: unknown, name: string): Promise<void> => {
  const dialog = await screen.findByRole('dialog', { name: SHEET });
  const proposal = dialog.querySelectorAll('[data-proposal]');
  expect(proposal).toHaveLength(1);
  expect(proposal[0]).toHaveAccessibleName(`Stopped in: ${name}`);
  expect(proposal[0]).toHaveAttribute('aria-current', 'true');
};
const taps = async (_: unknown, name: string): Promise<void> => {
  const dialog = await screen.findByRole('dialog', { name: SHEET });
  await user.click(within(dialog).getByRole('button', { name }));
};
const sheetIsClosed = (): Promise<void> => waitFor(() => expect(sheet()).toBeNull());
const nextIs = (_: unknown, name: string, done: number): Promise<void> =>
  waitFor(async () => {
    expect(await nextChapter()).toEqual(chapterNamed(name));
    expect((await progress()).done).toBe(done);
  });
const noSession = (): Promise<void> => waitFor(async () => expect(await openSession()).toBeUndefined());
const aSession = (): Promise<void> => waitFor(async () => expect(await openSession()).toBeDefined());

const opensToday = async (): Promise<void> => {
  await user.click(await screen.findByTestId('today-chip'));
  await screen.findByRole('heading', { name: 'Today', level: 1 });
};
const pieceSays = async (_: unknown, text: string): Promise<void> => {
  const piece = await screen.findByRole('region', { name: 'Reading plan', exact: true });
  await waitFor(() => expect(piece).toHaveTextContent(text));
};
const tapsListen = async (): Promise<void> => {
  const piece = await screen.findByRole('region', { name: 'Reading plan', exact: true });
  await user.click(await within(piece).findByRole('link', { name: /^Listen in Audible/ }));
};

const feature = await loadFeature('features/reading-plan-return.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Back after two chapters of listening, the sheet proposes the chapter two on', ({ Given, And, When, Then }) => {
    Given('a plan started at {string} with the Reader open', planAndReader);
    And('a listening session opened at {string}', sessionAt);
    When('she is away for {int} chapters of listening and comes back to Lampas', awayAndBack);
    Then('the sheet {string} is open', sheetIsOpen);
    And('the sheet proposes {string}', proposes);
    And('the sheet offers {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      const dialog = await screen.findByRole('dialog', { name: SHEET });
      for (const name of [a, b, c]) expect(within(dialog).getByRole('button', { name })).toBeInTheDocument();
    });
    And('the sheet offers {string} for the 5 chapters from {string} to {string}', async (_, group: string, first: string, last: string) => {
      const dialog = await screen.findByRole('dialog', { name: SHEET });
      const names = within(within(dialog).getByRole('group', { name: group })).getAllByRole('button').map((b) => b.textContent?.trim());
      expect(names).toEqual([first, ...names.slice(1, 4), last]);
      expect(names).toHaveLength(5);
    });
  });

  Scenario('Finished the chapter she began marks it done', ({ Given, And, When, Then }) => {
    Given('a plan started at {string} with the Reader open', planAndReader);
    And('a listening session opened at {string}', sessionAt);
    When('she is away for {int} chapters of listening and comes back to Lampas', awayAndBack);
    And('she taps {string}', taps);
    Then('the sheet is closed', sheetIsClosed);
    And('the next chapter is {string} with {int} of 1189 done', nextIs);
    And('no listening session is open', noSession);
  });

  Scenario('Stopped in a chapter marks the plan done through the chapter before it', ({ Given, And, When, Then }) => {
    Given('a plan started at {string} with the Reader open', planAndReader);
    And('a listening session opened at {string}', sessionAt);
    When('she is away for {int} chapters of listening and comes back to Lampas', awayAndBack);
    And('she taps {string}', taps);
    Then('the sheet is closed', sheetIsClosed);
    And('the next chapter is {string} with {int} of 1189 done', nextIs);
    And('no listening session is open', noSession);
  });

  Scenario('Stopped in the chapter she set off from keeps it next, and the send-off names it', ({ Given, And, When, Then }) => {
    Given('a plan started at {string} with the Reader open', planAndReader);
    And('a listening session opened at {string}', sessionAt);
    When('she is away for {int} chapters of listening and comes back to Lampas', awayAndBack);
    And('she taps {string}', taps);
    Then('the sheet is closed', sheetIsClosed);
    And('the next chapter is {string} with {int} of 1189 done', nextIs);
    When('she opens Today from the Reader', opensToday);
    Then('the Reading plan piece says {string}', pieceSays);
    When('she taps Listen in Audible on Today', tapsListen);
    Then('the sheet {string} is open', sheetIsOpen);
  });

  Scenario('Pick it myself opens the chapter picker, and the chapter she chooses is the one she stopped in', ({ Given, And, When, Then }) => {
    Given('a plan started at {string} with the Reader open', planAndReader);
    And('a listening session opened at {string}', sessionAt);
    When('she is away for {int} chapters of listening and comes back to Lampas', awayAndBack);
    And('she taps {string}', taps);
    And('she chooses the book {string} and the chapter {int} in the picker', async (_, book: string, chapter: number) => {
      const picker = await screen.findByRole('dialog', { name: 'Which chapter did you stop in?' });
      await user.click(within(picker).getByRole('button', { name: new RegExp(`^${book}`) }));
      await user.click(await within(picker).findByRole('button', { name: `Chapter ${chapter}` }));
    });
    Then('the sheet is closed', sheetIsClosed);
    And('the next chapter is {string} with {int} of 1189 done', nextIs);
    And('no listening session is open', noSession);
  });

  Scenario('Stopped partway with no chapter ends the session and marks nothing', ({ Given, And, When, Then }) => {
    Given('a plan started at {string} with the Reader open', planAndReader);
    And('a listening session opened at {string}', sessionAt);
    When('she is away for {int} chapters of listening and comes back to Lampas', awayAndBack);
    And('she taps {string}', taps);
    Then('the sheet is closed', sheetIsClosed);
    And('the next chapter is {string} with {int} of 1189 done', nextIs);
    And('no listening session is open', noSession);
  });

  Scenario('Back again after an answer, the sheet does not reopen', ({ Given, And, When, Then }) => {
    Given('a plan started at {string} with the Reader open', planAndReader);
    And('a listening session opened at {string}', sessionAt);
    When('she is away for {int} chapters of listening and comes back to Lampas', awayAndBack);
    And('she taps {string}', taps);
    And('she is away again for {int} chapters of listening and comes back to Lampas', awayAndBack);
    Then('the sheet is closed', sheetIsClosed);
  });

  Scenario('Closing the sheet without answering keeps the session, and the next return asks again', ({ Given, And, When, Then }) => {
    Given('a plan started at {string} with the Reader open', planAndReader);
    And('a listening session opened at {string}', sessionAt);
    When('she is away for {int} chapters of listening and comes back to Lampas', awayAndBack);
    And('she taps {string}', taps);
    Then('the sheet is closed', sheetIsClosed);
    And('a listening session is open', aSession);
    When('she is away again for {int} chapters of listening and comes back to Lampas', awayAndBack);
    Then('the sheet {string} is open', sheetIsOpen);
    And('the sheet proposes {string}', proposes);
  });

  Scenario('Coming back with no listening session opens nothing', ({ Given, When, Then }) => {
    Given('a plan started at {string} with the Reader open', planAndReader);
    When('she is away for {int} chapters of listening and comes back to Lampas', awayAndBack);
    Then('the sheet is closed', sheetIsClosed);
  });

  Scenario('With the Reading plan setting Off the sheet does not open', ({ Given, And, When, Then }) => {
    Given('a plan started at {string} with the Reader open', planAndReader);
    And('a listening session opened at {string}', sessionAt);
    And('the Reading plan setting is Off', () => setSetting(readingPlanSetting, 'off'));
    When('she is away for {int} chapters of listening and comes back to Lampas', awayAndBack);
    Then('the sheet is closed', sheetIsClosed);
  });

  Scenario('Lampas opened afresh with a session still open asks at once', ({ Given, Then }) => {
    Given('a plan started at {string} with a listening session open before Lampas opens', async (_, name: string) => {
      await startedPlanAt(name);
      await listeningAt(name);
      await openTheReader();
    });
    Then('the sheet {string} is open', sheetIsOpen);
  });
});
