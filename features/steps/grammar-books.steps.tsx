// features/steps/grammar-books.steps.tsx — runs features/grammar-books.feature: Read more on the idea sheet, a line for each ticked grammar
// book of his Logos library that teaches the idea (src/resources/grammarBooks.ts), and the Grammar books ticks under Logos in Settings.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { APPROACHES } from '../../src/approaches';
import { db } from '../../src/data/db';
import { ideaOf } from '../../src/data/grammar/ladder';
import { getGrammarBooks, getStudyResources } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { IdeaSheet } from '../../src/IdeaSheet';
import { forgetTrail } from '../../src/nav/lastRoute';
import { GRAMMAR_BOOKS, readMoreFor } from '../../src/resources/grammarBooks';
import { browserEnv } from '../../src/resources/openApp';
import type { GrammarBook } from '../../src/resources/types';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { fixturePath } from '../../tests/support/fixture-path';
import { seedHisWords } from '../../tests/support/his-words';

const user = userEvent.setup();

// A tap on a Logos link arms a wait for the page to stay in front: nothing here waits for real time or leaves the page.
const real = { ...browserEnv };
browserEnv.after = () => () => {};

afterAll(() => {
  Object.assign(browserEnv, real);
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

/** Four books of the test's own, each teaching The noun in one section. */
const testBook = (id: string): GrammarBook => ({
  id,
  short: `Book ${id}`,
  name: `The book called ${id}`,
  resource: `LLS:TEST${id.toUpperCase()}`,
  source: 'the test',
  sections: [{ title: `Chapter ${id}`, ref: 'Page.p_1', ideas: ['noun'] }],
});
const FOUR = ['one', 'two', 'three', 'four'].map(testBook);

/** Empties the store and keeps Logos on or off and the books ticked, as Settings keeps them. */
async function keep(logos: boolean, ticked: string[]): Promise<void> {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.settings.clear(), db.grammarLevels.clear()]);
  await db.settings.put({ key: 'resource.logos', value: logos ? 'on' : 'off' });
  await db.settings.put({ key: 'grammarBooks', value: JSON.stringify(ticked) });
}

const ideaSheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Idea' });
const readMore = (): HTMLElement | null => within(ideaSheet()).queryByRole('region', { name: 'Read more' });
/** The book lines in view (a folded line is hidden). */
const lines = (): HTMLElement[] => within(readMore()!).queryAllByRole('group');

async function opens(id: string, books?: readonly GrammarBook[]): Promise<void> {
  render(<IdeaSheet idea={ideaOf(id)} onClose={() => undefined} onWord={() => undefined} books={books} />);
  await screen.findByRole('dialog', { name: 'Idea' });
  await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
}
// With Read more expected, wait for it (the sheet reads the store after it mounts); with none, let the sheet's own reads finish first.
const opensAndSettles = async (id: string, books?: readonly GrammarBook[]): Promise<void> => {
  await opens(id, books);
  await act(async () => {
    await getStudyResources();
    await getGrammarBooks();
  });
};

const feature = await loadFeature('features/grammar-books.feature');

describeFeature(feature, ({ Scenario }) => {
  const KEEP = 'Lampas has Logos on and the grammar books {string} ticked';
  const keepTicked = (_: unknown, ids: string) => keep(true, ids.split(',').map((s) => s.trim()));
  const OPEN = 'he opens the idea sheet of {string}';
  const opensIdea = (_: unknown, id: string) => opens(id);
  const opensQuiet = (_: unknown, id: string) => opensAndSettles(id);

  Scenario("With Logos on and Black ticked, The noun shows Read more with Black's section", ({ Given, When, Then, And }) => {
    let link: HTMLElement;
    Given(KEEP, keepTicked);
    When(OPEN, opensIdea);
    Then('the idea sheet shows Read more with {int} book line', async (_, n: number) => {
      await within(ideaSheet()).findByRole('region', { name: 'Read more' });
      expect(lines()).toHaveLength(n);
    });
    And('the line of {string} links {string} to {string}', (_, book: string, section: string, href: string) => {
      const line = within(readMore()!).getByRole('group', { name: book });
      link = within(line).getByRole('link', { name: `Open in Logos: ${book}, ${section}` });
      expect(link).toHaveTextContent(section);
      expect(link).toHaveAttribute('href', href);
    });
    And('that link falls back to {string}', async (_, fallback: string) => {
      expect(link).toHaveAttribute('data-fallback', fallback);
      const opened: string[] = [];
      const was = { after: browserEnv.after, open: browserEnv.open };
      browserEnv.after = (fn) => {
        fn();
        return () => {};
      };
      browserEnv.open = (url) => opened.push(url);
      link.addEventListener('click', (e) => e.preventDefault());
      await user.click(link);
      Object.assign(browserEnv, was);
      expect(opened).toEqual([fallback]);
    });
  });

  Scenario('With four books ticked and mapped, three lines show and More books unfolds the fourth', ({ Given, When, Then }) => {
    Given('Lampas has Logos on and the four test books {string} ticked, each mapping {string}', (_, ids: string, idea: string) => {
      for (const b of FOUR) expect(b.sections[0].ideas).toContain(idea);
      return keep(true, ids.split(',').map((s) => s.trim()));
    });
    When('he opens the idea sheet of {string} with the four test books', (_, id: string) => opens(id, FOUR));
    Then('the idea sheet shows Read more with {int} book lines and a button {string}', async (_, n: number, label: string) => {
      await within(ideaSheet()).findByRole('region', { name: 'Read more' });
      expect(lines().map((l) => l.getAttribute('aria-label'))).toEqual(FOUR.slice(0, n).map((b) => b.short));
      expect(within(readMore()!).getByRole('button', { name: label })).toBeInTheDocument();
    });
    When('he taps {string}', async (_, label: string) => {
      await user.click(within(readMore()!).getByRole('button', { name: label }));
    });
    Then('the idea sheet shows Read more with {int} book lines and no More books button', (_, n: number) => {
      expect(lines().map((l) => l.getAttribute('aria-label'))).toEqual(FOUR.slice(0, n).map((b) => b.short));
      expect(within(readMore()!).queryByRole('button', { name: /^More books/ })).toBeNull();
    });
  });

  Scenario('With Black unticked there is no Read more', ({ Given, When, Then }) => {
    Given('Lampas has Logos on and no grammar book ticked', () => keep(true, []));
    When(OPEN, opensQuiet);
    Then('the idea sheet shows no Read more', () => {
      expect(readMore()).toBeNull();
    });
  });

  Scenario('With Logos off there is no Read more', ({ Given, When, Then }) => {
    Given('Lampas has Logos off and the grammar books {string} ticked', (_, ids: string) => keep(false, ids.split(',')));
    When(OPEN, opensQuiet);
    Then('the idea sheet shows no Read more', () => {
      expect(readMore()).toBeNull();
    });
  });

  Scenario('Settings ticks Black among the grammar books once Logos is on, and unticking it is kept', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', async () => {
      cleanup();
      clearBus();
      forgetTrail();
      localStorage.clear();
      vi.unstubAllGlobals();
      stubChapterFetch();
      window.history.replaceState(null, '', '/');
      await db.open();
      await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
      await seedHisWords();
      render(<App />);
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
    });
    When('he turns Logos on in Settings', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
      const logos = await screen.findByRole('switch', { name: 'Logos' });
      await user.click(logos);
      await waitFor(() => expect(logos).toHaveAttribute('aria-checked', 'true'));
    });
    Then('Settings shows the grammar book {string} ticked', async (_, name: string) => {
      const group = await screen.findByRole('group', { name: 'Grammar books' });
      expect(within(group).getByRole('checkbox', { name })).toHaveAttribute('aria-checked', 'true');
    });
    When('he taps the grammar book {string}', async (_, name: string) => {
      const box = within(screen.getByRole('group', { name: 'Grammar books' })).getByRole('checkbox', { name });
      await user.click(box);
      await waitFor(() => expect(box).toHaveAttribute('aria-checked', 'false'));
    });
    Then('the grammar books kept are none', async () => {
      await waitFor(async () => expect(await getGrammarBooks()).toEqual([]));
    });
  });

  Scenario('An idea from a lesson of the BMA Tutor order shows the same Read more lines', ({ Given, When, Then, And }) => {
    let id = '';
    Given(KEEP, keepTicked);
    When("he opens the idea sheet of the first idea Black maps in the BMA Tutor order's lessons", async () => {
      // tests/support/fixture-path.ts is the record of BMA Tutor's order under a test name (BMA Tutor itself is no longer listed, mw-foy5mb.1)
      const lessonIdeas = fixturePath.stages.flatMap((s) => s.levels.flatMap((l) => l.lessons.flatMap((lesson) => lesson.ideas)));
      id = lessonIdeas.find((idea) => readMoreFor(idea, ['black']).length > 0) ?? '';
      expect(id).not.toBe('');
      await opens(id);
    });
    Then('the idea sheet shows the lines Black gives that idea', async () => {
      await within(ideaSheet()).findByRole('region', { name: 'Read more' });
      const expected = readMoreFor(id, ['black']).flatMap((line) => line.links.map((l) => l.label));
      expect(within(readMore()!).getAllByRole('link').map((a) => a.getAttribute('aria-label'))).toEqual(expected);
    });
    And('no grammar approach is named for a grammar book', () => {
      const names = new Set(GRAMMAR_BOOKS.flatMap((b) => [b.id, b.short, b.name]));
      for (const a of APPROACHES) expect(names.has(a.name) || names.has(a.id)).toBe(false);
    });
  });
});
