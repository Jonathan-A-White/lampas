// features/steps/chapter-swipe.steps.tsx — runs features/chapter-swipe.feature: the swipe left / right on the Reader's text. A drag is
// pointer events on the first verse line (user-event's pointer API); jsdom is 1024 px wide, so the edge band is 0-24 and 1000-1024.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { BOOKS } from '../../src/data/books';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup({ delay: null });

async function openOn(bookName: string, n: number): Promise<void> {
  const code = BOOKS.find((b) => b.name === bookName)?.code;
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  window.history.replaceState(null, '', `/#/?b=${code}&c=${n}`);
  render(<App />);
  await screen.findByRole('heading', { name: `${bookName} ${n}`, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

/** One drag on the first verse line: press, move to the end in a few steps, wait, release. */
async function drag(x1: number, y1: number, x2: number, y2: number, ms: number): Promise<void> {
  const target = document.querySelector<HTMLElement>('[data-reader] [data-verse]');
  if (!target) throw new Error('no verse on screen');
  await user.pointer({ keys: '[MouseLeft>]', target, coords: { clientX: x1, clientY: y1 } });
  for (let i = 1; i <= 3; i++) {
    await user.pointer({ target, coords: { clientX: x1 + ((x2 - x1) * i) / 3, clientY: y1 + ((y2 - y1) * i) / 3 } });
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
  await user.pointer({ keys: '[/MouseLeft]', target, coords: { clientX: x2, clientY: y2 } });
}

const dragged = (_: unknown, x1: number, y1: number, x2: number, y2: number, ms: number) => drag(x1, y1, x2, y2, ms);
// The title is read straight off the page's h1 (findByRole works out every element's accessibility under jsdom, which a loaded host cannot do
// in time), and a failure says which headings were on screen and whether the Verse view had opened over the Reader.
const headed = async (_: unknown, title: string) => {
  await waitFor(() => {
    const titles = [...document.querySelectorAll('h1')].map((h) => h.textContent?.trim());
    const verseView = document.querySelector('[data-verse-view]') !== null;
    expect({ titles, verseView }, `the Reader should be headed ${title}`).toEqual({ titles: expect.arrayContaining([title]), verseView: false });
  });
};
/** After a drag that must do nothing: wait out the slide (140 ms) and a click's chance, then the title must still be the same. */
const stillHeaded = async (_: unknown, title: string) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  await headed(_, title);
};
const notes = () => document.querySelectorAll('[data-swipe-note]');

const feature = await loadFeature('features/chapter-swipe.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A left swipe on Romans 8 opens Romans 9 and Back returns', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
    Then('the reader is headed {string}', headed);
    When('he presses Back', async () => {
      await act(async () => {
        window.history.back();
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
    });
    Then('the reader is back at {string}', headed);
  });

  Scenario('A right swipe on Romans 8 opens Romans 7', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
    Then('the reader is headed {string}', headed);
  });

  Scenario('A left swipe on Romans 16 opens 1 Corinthians 1', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
    Then('the reader is headed {string}', headed);
  });

  Scenario('A right swipe on Romans 1 opens Acts 28', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
    Then('the reader is headed {string}', headed);
  });

  Scenario('A right swipe on Matthew 1 says it is the first chapter', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
    Then('the note says {string}', async (_, text: string) => {
      await waitFor(() => expect(notes()[0]?.textContent).toContain(text));
    });
    And('the note has a link {string}', async (_, name: string) => {
      expect(within(notes()[0] as HTMLElement).getByRole('button', { name })).toBeTruthy();
    });
    And('the reader is headed {string}', headed);
  });

  Scenario('A left swipe on Revelation 22 says he has reached the end', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
    Then('the note says {string}', async (_, text: string) => {
      await waitFor(() => expect(notes()[0]?.textContent).toContain(text));
    });
    And('the reader is headed {string}', headed);
  });

  Scenario('A mostly vertical drag does not change chapter', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
    Then('the reader is headed {string}', stillHeaded);
    And('there is no note', () => {
      expect(notes()).toHaveLength(0);
    });
  });

  Scenario('A short drag does not change chapter', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
    Then('the reader is headed {string}', stillHeaded);
  });

  for (const side of ['left', 'right']) {
    Scenario(`A swipe that starts at the ${side} edge does nothing`, ({ Given, When, Then }) => {
      Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
      When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
      Then('the reader is headed {string}', stillHeaded);
    });
  }

  Scenario('A slow drag does not change chapter', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
    Then('the reader is headed {string}', stillHeaded);
  });

  Scenario('A swipe over an open sheet does not change chapter', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    And('a word sheet is open', async () => {
      const verse = document.querySelector<HTMLElement>('[data-reader] [data-verse]') as HTMLElement;
      await user.click(within(verse).getAllByRole('button')[1]);
      await screen.findByRole('dialog', { name: 'Word' });
    });
    When('he drags from {int},{int} to {int},{int} over {int} ms', dragged);
    Then('the reader is headed {string}', stillHeaded);
  });
});
