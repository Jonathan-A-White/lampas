// features/steps/hebrew-grammar.steps.tsx — runs features/hebrew-grammar.feature: the Hebrew grammar tiers on the Goal, the article's card taught from its sheet in Hebrew type, and the Grammar sheet of a Hebrew term
// (Qal) with Hebrew examples from Genesis 1 and its note In Hebrew; a Greek term's sheet beside it, unchanged. The word sheet does not link a Hebrew parsing's terms yet (story j2), so the Grammar sheet is opened
// over a chapter directly, with the callbacks the word sheet would give it.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { GrammarSheet } from '../../src/GrammarSheet';
import { db } from '../../src/data/db';
import { loadChapter, type Chapter, type GreekWord } from '../../src/data/chapter';
import { ladderFor } from '../../src/data/grammar/ladders';
import { hebrewParseSegments, parseSegments } from '../../src/data/parseCode';
import { setLanguages } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import type { Languages } from '../../src/settings/definitions/interest';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
Element.prototype.scrollIntoView = () => {};

async function fresh(languages: Languages): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.passageLessons.clear(), db.grammarKnown.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await setLanguages(languages);
}

async function openGoal(): Promise<void> {
  window.history.replaceState(null, '', '/#/goal');
  await seedHisWords();
  render(<App />);
}

const ideasList = () => screen.findByTestId('hebrew-ideas');
const hebrewRow = async (title: string) => within(await ideasList()).getByText(title).closest('li') as HTMLElement;
const rowTitles = async (): Promise<string[]> => [...(await ideasList()).querySelectorAll('li')].map((li) => li.querySelector('.title-wrap')?.textContent?.trim() ?? '');
const sheet = () => screen.findByRole('dialog', { name: 'Idea' });
const grammar = () => screen.findByRole('dialog', { name: 'Grammar' });

let chapter: Chapter;
let asked: string[] = [];
let taught: string[] = [];

/** The sheet opened over `chapter`, with the word sheet's callbacks recorded. */
async function openSheet(book: string, number: number, term: string): Promise<void> {
  cleanup();
  clearBus();
  stubChapterFetch();
  asked = [];
  taught = [];
  chapter = await loadChapter(book, number);
  const word: GreekWord = chapter.verses[0].g[0];
  render(
    <GrammarSheet
      chapter={chapter}
      term={term}
      word={word}
      known={false}
      onClose={() => undefined}
      onTerm={(t) => asked.push(t)}
      onWord={() => undefined}
      onLearn={(t) => taught.push(t)}
    />,
  );
  await grammar();
}

const feature = await loadFeature('features/hebrew-grammar.feature');

describeFeature(feature, ({ Scenario }) => {
  const titledAndExplained = async (term: string) => {
    const dialog = await grammar();
    expect(within(dialog).getByRole('heading', { name: term })).toBeInTheDocument();
    expect(within(dialog).getByTestId('grammar-explanation').textContent!.trim().split(/\s+/).length).toBeGreaterThan(8);
  };

  Scenario('With Hebrew chosen the Goal lists the article after the letters', ({ Given, Then, And }) => {
    Given('Hebrew is the only language chosen and the Goal screen is open', async () => {
      await fresh('hebrew');
      await openGoal();
    });
    Then('the Goal lists {string} as Not yet', async (_, title: string) => {
      const row = await hebrewRow(title);
      expect(row).toHaveAttribute('data-level', 'notYet');
      expect(row).toHaveTextContent('Not yet');
    });
    And('the Goal lists {string} after {string} and {string}', async (_, title: string, letter: string, mark: string) => {
      const titles = await rowTitles();
      expect(titles.indexOf(title), title).toBeGreaterThan(titles.indexOf(letter));
      expect(titles.indexOf(title), title).toBeGreaterThan(titles.indexOf(mark));
      expect(titles.indexOf(letter), letter).toBeGreaterThan(0);
    });
    And('the Goal lists the grammar ideas from {string} to {string} in order', async (_, first: string, last: string) => {
      const titles = await rowTitles();
      const grammarIdeas = ladderFor('hbo').ideas.filter((i) => !['letters', 'sounds', 'marks'].includes(i.tier)).map((i) => i.title);
      expect(grammarIdeas).toHaveLength(26);
      expect(grammarIdeas[0]).toBe(first);
      expect(grammarIdeas.at(-1)).toBe(last);
      expect(titles.slice(titles.indexOf(first))).toEqual(grammarIdeas);
    });
  });

  Scenario("The article's card teaches with the earth of Genesis 1:1", ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen and the Goal screen is open', async () => {
      await fresh('hebrew');
      await openGoal();
    });
    When('he opens {string}', async (_, title: string) => {
      await user.click(within(await hebrewRow(title)).getByRole('button'));
    });
    Then('the sheet teaches the article with the Hebrew word {string} from {string} right to left in lang he', async (_, word: string, ref: string) => {
      const dialog = await sheet();
      expect(await within(dialog).findByTestId('idea-what')).toHaveTextContent('Hebrew has a word for ‘the’');
      const worked = within(dialog).getByTestId('worked-word');
      expect(worked).toHaveTextContent(word);
      expect(worked).toHaveAttribute('lang', 'he');
      expect(worked).toHaveAttribute('dir', 'rtl');
      expect(within(dialog).getByTestId('idea-worked')).toHaveTextContent(ref);
    });
    And("the card's table shows {string} in Hebrew type", async (_, word: string) => {
      const cell = within(await sheet()).getByTestId('idea-table').querySelector('[data-cell="the article"] [lang="he"]');
      expect(cell).not.toBeNull();
      expect([...(await sheet()).querySelectorAll('[data-testid="idea-table"] [lang="he"]')].map((e) => e.textContent)).toContain(word);
    });
    And('the sheet offers no Drill it', async () => {
      expect(within(await sheet()).queryByRole('button', { name: 'Drill it' })).toBeNull();
    });
  });

  Scenario('The Grammar sheet for Qal shows the concept with a Hebrew example', ({ Given, Then, And }) => {
    Given('Genesis 1 is open and the Grammar sheet of {string} is open', async (_, term: string) => {
      await openSheet('gen', 1, term);
    });
    Then('the Grammar sheet is titled {string} and explains it in plain words', async (_, term: string) => titledAndExplained(term));
    And('the note under {string} has Hebrew in lang he', async (_, heading: string) => {
      const dialog = await grammar();
      expect(within(dialog).getByText(heading)).toBeInTheDocument();
      const note = within(dialog).getByTestId('grammar-hebrew');
      const hebrew = note.querySelector('[lang="he"]');
      expect(hebrew).not.toBeNull();
      expect(hebrew).toHaveAttribute('dir', 'rtl');
      expect(within(dialog).queryByTestId('grammar-greek')).toBeNull();
    });
    And('the Grammar sheet shows {int} examples from Genesis 1, each a Hebrew word in lang he whose parsing has Qal', async (_, count: number) => {
      const examples = within(await grammar()).getAllByTestId('grammar-example');
      expect(examples).toHaveLength(count);
      for (const example of examples) {
        const word = example.querySelector('[lang="he"]');
        expect(word).toHaveAttribute('dir', 'rtl');
        expect(word).toHaveClass('script-he');
        const form = example.getAttribute('data-form')!;
        const found = chapter.verses.flatMap((v) => v.g).find((w) => w.t === form)!;
        expect(hebrewParseSegments(chapter.parse[found.p]).some((s) => s.term === 'Qal')).toBe(true);
      }
    });
    And('the term {string} belongs to the idea {string}', (_, term: string, id: string) => {
      expect(ladderFor('hbo').ideaOfTerm(term)).toBe(id);
      expect(ladderFor('hbo').ideaOf(id).terms).toContain(term);
    });
  });

  Scenario('A related term opens its own sheet and Learn this idea names the term', ({ Given, When, Then }) => {
    Given('Genesis 1 is open and the Grammar sheet of {string} is open', async (_, term: string) => {
      await openSheet('gen', 1, term);
    });
    When('he taps the related term {string}', async (_, term: string) => {
      await user.click(within(within(await grammar()).getByRole('group', { name: 'Related terms' })).getByRole('button', { name: term }));
    });
    Then('the sheet was asked to open the term {string}', (_, term: string) => {
      expect(asked).toEqual([term]);
    });
    When('he taps Learn this idea', async () => {
      await user.click(within(await grammar()).getByRole('button', { name: 'Learn this idea' }));
    });
    Then('the sheet was asked to teach the term {string}', (_, term: string) => {
      expect(taught).toEqual([term]);
      expect(ladderFor('hbo').ideaOfTerm(term)).toBe('he-qal');
    });
  });

  Scenario("A Greek grammar term's sheet is as it was", ({ Given, Then, And }) => {
    Given('Romans 8 is open and the Grammar sheet of {string} is open', async (_, term: string) => {
      await openSheet('rom', 8, term);
    });
    Then('the Grammar sheet is titled {string} and explains it in plain words', async (_, term: string) => titledAndExplained(term));
    And('the note under {string} has Greek in lang el', async (_, heading: string) => {
      const dialog = await grammar();
      expect(within(dialog).getByText(heading)).toBeInTheDocument();
      expect(within(dialog).getByTestId('grammar-greek').querySelector('[lang="el"]')).not.toBeNull();
    });
    And('the Grammar sheet shows {int} examples from Romans 8, each a Greek word in lang el whose parsing has conjunction', async (_, count: number) => {
      const examples = within(await grammar()).getAllByTestId('grammar-example');
      expect(examples).toHaveLength(count);
      for (const example of examples) {
        expect(example.querySelector('[lang="el"]')).not.toBeNull();
        const found = chapter.verses.flatMap((v) => v.g).find((w) => w.t === example.getAttribute('data-form'))!;
        expect(parseSegments(chapter.parse[found.p]).some((s) => s.term === 'conjunction')).toBe(true);
      }
    });
    And('the sheet has no note under {string}', async (_, heading: string) => {
      const dialog = await grammar();
      expect(within(dialog).queryByText(heading)).toBeNull();
      expect(within(dialog).queryByTestId('grammar-hebrew')).toBeNull();
    });
  });
});
