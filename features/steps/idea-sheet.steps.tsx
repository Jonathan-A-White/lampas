// features/steps/idea-sheet.steps.tsx — runs features/idea-sheet.feature: the idea sheet a Grammar sheet's Learn this idea opens, with
// its text, its examples from the goal's passage (or the open chapter), the paradigm table, Got it, I know this and Ask the tutor.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { ideaOf } from '../../src/data/grammar/ladder';
import { DAY, STEP_DAYS } from '../../src/data/schedule';
import { clearBus, subscribe, type EventOf } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GRAMMAR_TERM_ANSWER, makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;
let taught: EventOf<'idea-taught'>[] = [];
let startedAt = 0;
/** The Laptop's wall clock steps back by about a second now and then: a bound on a stored time allows for it. */
const CLOCK_SLACK = 3000;

/** Opens the app on Romans 8 with every store emptied, `goal` saved as the goal setting when there is one, and a fake Postern. */
async function open(goal: string | undefined): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  taught = [];
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_TERM_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.grammarKnown.clear(), db.grammarLevels.clear(), db.reviews.clear()]);
  if (goal !== undefined) await db.settings.put({ key: 'goal', value: goal });
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  subscribe('idea-taught', (event) => taught.push(event));
  startedAt = Date.now();
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const wordSheet = () => screen.getByRole('dialog', { name: 'Word' });
const grammarSheet = () => screen.getByRole('dialog', { name: 'Grammar' });
const ideaSheet = () => screen.getByRole('dialog', { name: 'Idea' });
const talkSheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const examples = () => within(ideaSheet()).getAllByTestId('idea-example');

async function tapsWordAndTerm(text: string, verse: number, term: string): Promise<void> {
  await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
  await screen.findByRole('dialog', { name: 'Word' });
  await user.click(within(wordSheet()).getByRole('button', { name: term, exact: true }));
  await screen.findByRole('dialog', { name: 'Grammar' });
}
async function opensIdeaSheet(text: string, verse: number, term: string): Promise<void> {
  await tapsWordAndTerm(text, verse, term);
  await user.click(within(grammarSheet()).getByRole('button', { name: 'Learn this idea' }));
  await screen.findByRole('dialog', { name: 'Idea' });
  await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
}
/** The filled cells of the paradigm table, in reading order. */
const cells = (): string[] =>
  Array.from(within(ideaSheet()).getByTestId('idea-paradigm').querySelectorAll<HTMLElement>('[data-cell]'))
    .map((c) => c.textContent ?? '')
    .filter((t) => t !== '' && t !== '–');
const review = async (id: string) => {
  const row = await db.reviews.get(['grammar', id]);
  if (!row) throw new Error(`no review row for ${id}`);
  return row;
};

const feature = await loadFeature('features/idea-sheet.feature');

describeFeature(feature, ({ Scenario }) => {
  const opensWithGoal = (_: unknown, goal: string) => open(goal);
  const opensNoGoal = () => open(undefined);
  const GIVEN_GOAL = 'Lampas is opened on Romans 8 with the goal {string}, no idea level and a fake Postern';
  const GIVEN_OPEN = 'he opens the idea sheet from the Grammar sheet of {string} on the word {string} in verse {int}';
  const opensTheIdea = (_: unknown, term: string, text: string, verse: number) => opensIdeaSheet(text, verse, term);

  Scenario("The genitive idea's sheet shows its text and three examples from 1 John 1 with their verses", ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When(GIVEN_OPEN, opensTheIdea);
    Then('the idea sheet is titled {string} and shows the plain text of that idea', (_, title: string) => {
      expect(within(ideaSheet()).getByRole('heading', { name: title })).toBeInTheDocument();
      expect(within(ideaSheet()).getByTestId('idea-text')).toHaveTextContent(ideaOf('case-genitive').text);
    });
    And('the idea sheet shows 3 examples {string}, {string} and {string} with the verses {string}, {string} and {string}', (_, a: string, b: string, c: string, x: string, y: string, z: string) => {
      const found = examples();
      expect(found.map((e) => e.getAttribute('data-form'))).toEqual([a, b, c]);
      expect(found.map((e) => within(e).getByTestId('idea-verse').textContent)).toEqual([x, y, z]);
      expect(within(ideaSheet()).getByText('Examples from 1 John 1')).toBeInTheDocument();
    });
    And('each example has a speaker', () => {
      for (const example of examples()) {
        const form = example.getAttribute('data-form');
        const row = example.closest('li') as HTMLElement;
        expect(within(row).getByRole('button', { name: `Hear ${form}` })).toBeInTheDocument();
      }
    });
    And('the paradigm table of the genitive has {string} and {string} in its cells', (_, a: string, b: string) => {
      expect(cells()).toEqual(expect.arrayContaining([a, b]));
    });
    And('the idea sheet shows no level', () => {
      expect(within(ideaSheet()).queryByTestId('idea-level')).toBeNull();
    });
  });

  Scenario('With no goal the examples come from the open chapter', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with no goal, no idea level and a fake Postern', opensNoGoal);
    When(GIVEN_OPEN, opensTheIdea);
    Then('the idea sheet shows 3 examples that are genitives of {string}', (_, title: string) => {
      expect(within(ideaSheet()).getByText(`Examples from ${title}`)).toBeInTheDocument();
      const found = examples();
      expect(found).toHaveLength(3);
      for (const example of found) expect(within(example).getByTestId('idea-verse').textContent).toMatch(/^Romans 8:\d+$/);
    });
    And('the paradigm table of the genitive has {string} and {string} in its cells', (_, a: string, b: string) => {
      expect(cells()).toEqual(expect.arrayContaining([a, b]));
    });
  });

  Scenario('An example opens its own word sheet', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    And(GIVEN_OPEN, opensTheIdea);
    When('he taps the example {string} on the idea sheet', async (_, form: string) => {
      await user.click(examples().find((e) => e.getAttribute('data-form') === form) as HTMLElement);
    });
    Then('the word sheet is of {string} and its Parsing names a genitive', async (_, form: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Idea' })).toBeNull());
      expect(screen.queryByRole('dialog', { name: 'Grammar' })).toBeNull();
      expect(within(wordSheet()).getByTestId('sheet-word')).toHaveTextContent(form);
      expect(within(wordSheet()).getByTestId('sheet-parse')).toHaveTextContent('genitive');
    });
  });

  Scenario('Got it makes the idea frontier and due tomorrow', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    And(GIVEN_OPEN, opensTheIdea);
    When('he taps Got it on the idea sheet', async () => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'Got it' }));
    });
    Then('the idea {string} is frontier, set by the sheet, and its review is due in 1 day at step 0', async (_, id: string) => {
      await waitFor(async () => expect(await db.grammarLevels.get(id)).toBeDefined());
      expect(await db.grammarLevels.get(id)).toMatchObject({ level: 'frontier', how: 'sheet' });
      const row = await review(id);
      expect(row.step).toBe(0);
      expect(row.due).toBeGreaterThanOrEqual(startedAt + DAY - CLOCK_SLACK);
      expect(row.due).toBeLessThanOrEqual(Date.now() + DAY + CLOCK_SLACK);
    });
    And('an idea-taught event for {string} with the outcome {string} was published', (_, id: string, outcome: string) => {
      expect(taught).toEqual([{ kind: 'idea-taught', id, outcome }]);
    });
    And('the idea sheet shows the chip {string}', async (_, chip: string) => {
      await waitFor(() => expect(within(ideaSheet()).getByTestId('idea-level')).toHaveTextContent(chip));
    });
  });

  Scenario('I know this makes it solid at the 30-day step', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    And(GIVEN_OPEN, opensTheIdea);
    When('he taps I know this on the idea sheet', async () => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'I know this' }));
    });
    Then('the idea {string} is solid, set by the sheet, and its review is due in 30 days at the 30-day step', async (_, id: string) => {
      await waitFor(async () => expect(await db.grammarLevels.get(id)).toBeDefined());
      expect(await db.grammarLevels.get(id)).toMatchObject({ level: 'solid', how: 'sheet' });
      const row = await review(id);
      expect(row.step).toBe(STEP_DAYS.indexOf(30));
      expect(row.due).toBeGreaterThanOrEqual(startedAt + 30 * DAY - CLOCK_SLACK);
      expect(row.due).toBeLessThanOrEqual(Date.now() + 30 * DAY + CLOCK_SLACK);
    });
    And('an idea-taught event for {string} with the outcome {string} was published', (_, id: string, outcome: string) => {
      expect(taught).toEqual([{ kind: 'idea-taught', id, outcome }]);
    });
    And('the idea sheet shows the chip {string}', async (_, chip: string) => {
      await waitFor(() => expect(within(ideaSheet()).getByTestId('idea-level')).toHaveTextContent(chip));
    });
  });

  Scenario('Learn this idea on the Grammar sheet of genitive opens the idea sheet', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    And('he taps {string} in verse {int} and the term {string} on the word sheet', (_, text: string, verse: number, term: string) => tapsWordAndTerm(text, verse, term));
    Then('the Grammar sheet has a button Learn this idea', () => {
      expect(within(grammarSheet()).getByRole('button', { name: 'Learn this idea' })).toBeInTheDocument();
    });
    When('he taps Learn this idea', async () => {
      await user.click(within(grammarSheet()).getByRole('button', { name: 'Learn this idea' }));
    });
    Then('the idea sheet opens over the Grammar sheet and the word sheet', async () => {
      await screen.findByRole('dialog', { name: 'Idea' });
      expect(within(ideaSheet()).getByRole('heading', { name: 'The genitive case' })).toBeInTheDocument();
      expect(grammarSheet()).toBeInTheDocument();
      expect(wordSheet()).toBeInTheDocument();
    });
  });

  Scenario('Ask the tutor opens the Talk sheet with the term in focus', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    And(GIVEN_OPEN, opensTheIdea);
    When('he taps Ask the tutor on the idea sheet', async () => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'Ask the tutor' }));
    });
    Then('the idea, Grammar and word sheets are gone and the sheet is titled {string}', async (_, title: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
      expect(screen.queryByRole('dialog', { name: 'Grammar' })).toBeNull();
      expect(screen.queryByRole('dialog', { name: 'Idea' })).toBeNull();
      expect(talkSheet()).toHaveAccessibleName(title);
    });
    And('the grist carries the focus term {string} and kind grammar-term', async (_, term: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].input.focus).toEqual({ term, kind: 'grammar-term' });
    });
  });
});
