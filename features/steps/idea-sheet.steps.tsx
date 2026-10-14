// features/steps/idea-sheet.steps.tsx — runs features/idea-sheet.feature: the idea sheet a Grammar sheet's Learn this idea opens, with
// its text, its examples from the goal's passage (or the open chapter), the paradigm table, the level slider, Mark known without a drill and Ask the tutor.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { ideaOf, itemsOf } from '../../src/data/grammar/ladder';
import { teachOf } from '../../src/data/grammar/teach';
import { DAY, STEP_DAYS } from '../../src/data/schedule';
import { clearBus, subscribe, type EventOf } from '../../src/events/bus';
import { pronunciationOf, registerPronunciation, type Pronunciation } from '../../src/speech/pronunciation';
import { stopReading } from '../../src/speech/readAloud';
import { MODERN } from '../../src/speech/schemes/modern';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { GRAMMAR_TERM_ANSWER, makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

let unregisterTestish: (() => void) | undefined;

afterAll(() => {
  unregisterTestish?.();
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
/** The phone's fake speech engine, put in place only when a scenario says the phone has a Greek voice. */
let synth: FakeSynth | undefined;
/** The Laptop's wall clock steps back by about a second now and then: a bound on a stored time allows for it. */
const CLOCK_SLACK = 3000;

/** A second pronunciation with a lesson of its own for the breathings only (mw-5r3p30.229). */
const TESTISH: Pronunciation = {
  ...MODERN,
  id: 'testish',
  label: 'Testish',
  lessons: { breathings: { text: 'Testish says the rough breathing as a hum.' } },
};

/** Opens the app on Romans 8 with every store emptied, `goal` saved as the goal setting when there is one, the pronunciation `chosen` saved, a fake Postern and, with `greekVoice`, a phone that has a Greek voice. */
async function open(goal: string | undefined, chosen?: string, greekVoice = false): Promise<void> {
  unregisterTestish?.();
  unregisterTestish = undefined;
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  synth = greekVoice ? stubSpeech([GREEK_VOICE]) : undefined;
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
  if (chosen !== undefined) {
    if (chosen === TESTISH.id) unregisterTestish = registerPronunciation(TESTISH);
    await db.settings.put({ key: 'greekPronunciation', value: chosen });
  }
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
const exampleOf = (form: string): HTMLElement => {
  const found = within(ideaSheet()).getAllByTestId('idea-example').find((e) => e.getAttribute('data-form') === form);
  if (!found) throw new Error(`no example ${form} on the idea sheet`);
  return found;
};
const talkSheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const examples = () => within(ideaSheet()).getAllByTestId('idea-example');

async function openLetterSheet(_: unknown, name: string): Promise<void> {
  await opensIdeaFromGoal('alphabet');
  const tile = within(ideaSheet()).getAllByTestId('teach-tile').find((t) => t.getAttribute('data-name') === name);
  if (!tile) throw new Error(`no tile ${name} on the alphabet sheet`);
  await user.click(within(tile).getByRole('button', { name: `About ${name}` }));
  await waitFor(() => expect(screen.getAllByRole('dialog', { name: 'Idea' })).toHaveLength(2));
}
const letterSheet = (): HTMLElement => screen.getAllByRole('dialog', { name: 'Idea' })[1];

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
/** The filled cells of the card's table, in reading order. */
const cells = (): string[] =>
  Array.from(within(ideaSheet()).getByTestId('idea-table').querySelectorAll<HTMLElement>('[data-cell]'))
    .map((c) => c.textContent ?? '')
    .filter((t) => t !== '' && t !== '–');
const review = async (id: string) => {
  const row = await db.reviews.get(['grammar', id]);
  if (!row) throw new Error(`no review row for ${id}`);
  return row;
};

/** From the Goal screen's ideas list: opens the sheet of the idea `id`. */
async function opensIdeaFromGoal(id: string): Promise<void> {
  window.location.hash = '#/goal';
  await user.click(await screen.findByTestId('ideas-bar'));
  await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: ideaOf(id).title }));
  await screen.findByRole('dialog', { name: 'Idea' });
  await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
}

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
    Then('the idea sheet is titled {string} and says what that idea is', (_, title: string) => {
      expect(within(ideaSheet()).getByRole('heading', { name: title })).toBeInTheDocument();
      expect(within(ideaSheet()).getByTestId('idea-what')).toHaveTextContent(teachOf('case-genitive').whatItIs);
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
    And('the table of the genitive has the endings {string} and {string} in its cells', (_, a: string, b: string) => {
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
    And('the table of the genitive has the endings {string} and {string} in its cells', (_, a: string, b: string) => {
      expect(cells()).toEqual(expect.arrayContaining([a, b]));
    });
  });

  Scenario('An example shows its meaning as it stands in its verse, not the dictionary gloss', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the idea sheet of {string} from the Goal screen', (_, id: string) => opensIdeaFromGoal(id));
    Then('the idea sheet is titled {string}', (_, title: string) => {
      expect(within(ideaSheet()).getByRole('heading', { name: title })).toBeInTheDocument();
    });
    And('the example {string} reads {string} and not {string} alone', (_, form: string, meaning: string, gloss: string) => {
      const text = exampleOf(form).textContent ?? '';
      expect(text).toContain(meaning);
      expect(text).not.toContain(gloss);
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

  Scenario('Sliding to Learning makes the idea frontier and due tomorrow', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    And(GIVEN_OPEN, opensTheIdea);
    And('the ideas that {string} builds on are solid', async (_, id: string) => {
      await db.grammarLevels.bulkPut(ideaOf(id).needs.map((need) => ({ id: need, level: 'solid' as const, since: Date.now(), how: 'placement' as const })));
      await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-builds-on')).toBeNull());
    });
    When('he slides the level to {string}', async (_, label: string) => {
      fireEvent.change(within(ideaSheet()).getByRole('slider', { name: 'Your level' }), { target: { value: String(['Not yet', 'Learning', 'I know it'].indexOf(label)) } });
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

  Scenario('Mark known without a drill makes it solid at the 30-day step', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    And(GIVEN_OPEN, opensTheIdea);
    When('he taps Mark known without a drill on the idea sheet', async () => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'Mark known without a drill' }));
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

  Scenario('The sheet for The Greek alphabet shows examples from the verse', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the Goal screen and taps Learn next', async () => {
      window.location.hash = '#/goal';
      await user.click(await screen.findByTestId('learn-next'));
      await screen.findByRole('dialog', { name: 'Idea' });
      await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
    });
    Then('the idea sheet is titled {string} and says what that idea is', (_, title: string) => {
      expect(within(ideaSheet()).getByRole('heading', { name: title })).toBeInTheDocument();
      expect(within(ideaSheet()).getByTestId('idea-what')).toHaveTextContent(teachOf('alphabet').whatItIs);
    });
    And('the idea sheet shows examples from {string}', (_, title: string) => {
      expect(within(ideaSheet()).getByText(`Examples from ${title}`)).toBeInTheDocument();
      const found = examples();
      expect(found.length).toBeGreaterThan(0);
      for (const example of found) expect(within(example).getByTestId('idea-verse').textContent).toBe(title);
    });
    And('the idea sheet has no line {string}', (_, text: string) => {
      expect(ideaSheet().textContent).not.toContain(text);
    });
  });

  Scenario('A pair of vowels is marked in each example', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the idea sheet of {string} from the Goal screen', async (_, id: string) => {
      window.location.hash = '#/goal';
      await user.click(await screen.findByTestId('ideas-bar'));
      await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: ideaOf(id).title }));
      await screen.findByRole('dialog', { name: 'Idea' });
      await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
    });
    Then('the idea sheet shows the example {string} with {string} marked', (_, form: string, pair: string) => {
      const marked = Array.from(exampleOf(form).querySelectorAll('[data-marked]')).map((m) => m.textContent);
      expect(marked).toEqual([pair]);
    });
    And('the idea sheet shows the example {string} with {string} marked', (_, form: string, pair: string) => {
      const marked = Array.from(exampleOf(form).querySelectorAll('[data-marked]')).map((m) => m.textContent);
      expect(marked).toEqual([pair]);
    });
    And('the idea sheet has no line {string}', (_, text: string) => {
      expect(ideaSheet().textContent).not.toContain(text);
    });
  });

  Scenario("The Breathing marks sheet lists the verse's words that carry a breathing", ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the idea sheet of {string} from the Goal screen', async (_, id: string) => {
      window.location.hash = '#/goal';
      await user.click(await screen.findByTestId('ideas-bar'));
      await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: ideaOf(id).title }));
      await screen.findByRole('dialog', { name: 'Idea' });
      await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
    });
    Then('the idea sheet shows the example {string} with {string} marked', (_, form: string, mark: string) => {
      const marked = Array.from(exampleOf(form).querySelectorAll('[data-marked]')).map((m) => m.textContent);
      expect(marked).toEqual([mark]);
    });
    And('the idea sheet shows the example {string} with {string} marked', (_, form: string, mark: string) => {
      const marked = Array.from(exampleOf(form).querySelectorAll('[data-marked]')).map((m) => m.textContent);
      expect(marked).toEqual([mark]);
    });
    And('the idea sheet has no line {string}', (_, text: string) => {
      expect(ideaSheet().textContent).not.toContain(text);
    });
  });

  Scenario('The Pairs of vowels sheet gives every sound an English key word', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the idea sheet of {string} from the Goal screen', async (_, id: string) => {
      window.location.hash = '#/goal';
      await user.click(await screen.findByTestId('ideas-bar'));
      await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: ideaOf(id).title }));
      await screen.findByRole('dialog', { name: 'Idea' });
      await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
    });
    Then('the idea sheet text says {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      const text = within(ideaSheet()).getByTestId('idea-text');
      for (const phrase of [a, b, c]) expect(text).toHaveTextContent(phrase);
    });
    And('the idea sheet text says it follows {string}', (_, way: string) => {
      expect(within(ideaSheet()).getByTestId('idea-text')).toHaveTextContent(way);
    });
  });

  Scenario('The Breathing marks sheet teaches the Modern Greek sound, where a breathing is silent', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the idea sheet of {string} from the Goal screen', (_, id: string) => opensIdeaFromGoal(id));
    Then('the idea sheet text says the breathing is silent and gives ὁ as “o”', () => {
      const text = within(ideaSheet()).getByTestId('idea-text');
      expect(text).toHaveTextContent(/silent/);
      expect(text).toHaveTextContent('ὁ is “o”');
    });
    And('the idea sheet text does not say a breathing adds an h or that ὁ is “ho”', () => {
      const text = within(ideaSheet()).getByTestId('idea-text').textContent ?? '';
      expect(text).not.toMatch(/adds an? h/i);
      expect(text).not.toContain('“ho”');
    });
  });

  Scenario('Another pronunciation teaches its own breathing lesson on the sheet', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the goal {string}, no idea level, a fake Postern and the pronunciation {string} chosen', async (_, goal: string, id: string) => {
      await open(goal, id);
    });
    When('he opens the idea sheet of {string} from the Goal screen', (_, id: string) => opensIdeaFromGoal(id));
    Then('the idea sheet text says {string}', async (_, phrase: string) => {
      await waitFor(() => expect(within(ideaSheet()).getByTestId('idea-text')).toHaveTextContent(phrase));
    });
    And('the idea sheet text does not say {string}', (_, phrase: string) => {
      expect(within(ideaSheet()).getByTestId('idea-text').textContent).not.toContain(phrase);
    });
  });
  const tiles = (): HTMLElement[] => within(ideaSheet()).getAllByTestId('teach-tile');
  const tileOf = (name: string): HTMLElement => {
    const found = tiles().find((t) => t.getAttribute('data-name') === name);
    if (!found) throw new Error(`no tile ${name} on the idea sheet`);
    return found;
  };
  const GREEK_VOICE_OPEN = 'Lampas is opened on Romans 8 with the goal {string}, no idea level, a fake Postern and a Greek voice';
  const lastSpoken = (): string | undefined => synth?.spoken[synth.spoken.length - 1]?.text;
  const opensIdeaOfGoal = (_: unknown, id: string) => opensIdeaFromGoal(id);

  Scenario('The Greek alphabet sheet shows 24 tiles, each with its name and sound, and a tap says the letter', ({ Given, When, Then, And }) => {
    Given(GREEK_VOICE_OPEN, async (_, goal: string) => open(goal, undefined, true));
    When('he opens the idea sheet of {string} from the Goal screen', opensIdeaOfGoal);
    Then('the idea sheet shows 24 tiles in alphabet order, the first reading {string}, {string} and {string}', (_, form: string, name: string, sound: string) => {
      const found = tiles();
      expect(found).toHaveLength(24);
      expect(found.map((t) => t.getAttribute('data-id'))).toEqual(itemsOf('alphabet').map((i) => i.id));
      expect(found[0]).toHaveTextContent(form);
      expect(found[0]).toHaveTextContent(name);
      expect(found[0]).toHaveTextContent(sound);
    });
    And('the seven vowels are marked on the tiles', () => {
      const marked = tiles().filter((t) => t.hasAttribute('data-vowel'));
      expect(marked.map((t) => t.getAttribute('data-name'))).toEqual(['alpha', 'epsilon', 'eta', 'iota', 'omicron', 'upsilon', 'omega']);
      for (const tile of marked) expect(tile).toHaveTextContent('vowel');
      for (const tile of tiles().filter((t) => !t.hasAttribute('data-vowel'))) expect(tile).not.toHaveTextContent('vowel');
    });
    And('the tiles come above what the idea is', () => {
      const grid = within(ideaSheet()).getByTestId('teach-tiles');
      const text = within(ideaSheet()).getByTestId('idea-what');
      expect(grid.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    When('he taps the tile {string}', async (_, name: string) => {
      await user.click(within(tileOf(name)).getByRole('button', { name: `Hear ${name}` }));
    });
    Then('the Greek voice is asked to say {string}', async (_, text: string) => {
      await waitFor(() => expect(lastSpoken()).toBe(text));
      expect(synth?.spoken[synth.spoken.length - 1].lang).toBe('el-GR');
    });
  });

  Scenario('The Breathing marks sheet shows a tile for each breathing with its sound and an example word to hear', ({ Given, When, Then, And }) => {
    Given(GREEK_VOICE_OPEN, async (_, goal: string) => open(goal, undefined, true));
    When('he opens the idea sheet of {string} from the Goal screen', opensIdeaOfGoal);
    Then('the idea sheet shows 2 tiles, {string} the rough breathing and {string} the smooth breathing, each with the sound {string}', (_, rough: string, smooth: string, sound: string) => {
      const found = tiles();
      expect(found).toHaveLength(2);
      expect(found[0]).toHaveTextContent(rough);
      expect(found[0]).toHaveTextContent('rough breathing');
      expect(found[1]).toHaveTextContent(smooth);
      expect(found[1]).toHaveTextContent('smooth breathing');
      for (const tile of found) expect(tile).toHaveTextContent(sound);
    });
    And('each tile has an example word with a play button, {string} and {string}', (_, first: string, second: string) => {
      const found = tiles();
      for (const [tile, word] of [[found[0], first], [found[1], second]] as const) {
        expect(tile).toHaveTextContent(word);
        expect(within(tile).getByRole('button', { name: `Hear ${word}` })).toBeInTheDocument();
      }
    });
    When('he taps the play button of {string}', async (_, word: string) => {
      await user.click(within(ideaSheet()).getByRole('button', { name: `Hear ${word}` }));
    });
    Then('the Greek voice is asked to say {string}', async (_, text: string) => {
      await waitFor(() => expect(lastSpoken()).toBe(text));
    });
  });

  Scenario('A tile opens the idea sheet of its own item', ({ Given, And, When, Then }) => {
    Given(GREEK_VOICE_OPEN, async (_, goal: string) => open(goal, undefined, true));
    And('he opens the idea sheet of {string} from the Goal screen', opensIdeaOfGoal);
    When('he taps the name of the tile {string}', async (_, name: string) => {
      await user.click(within(tileOf(name)).getByRole('button', { name: `About ${name}` }));
    });
    Then('a second idea sheet titled {string} opens over the first and shows one tile, {string}', async (_, title: string, form: string) => {
      await waitFor(() => expect(screen.getAllByRole('dialog', { name: 'Idea' })).toHaveLength(2));
      const [, second] = screen.getAllByRole('dialog', { name: 'Idea' });
      expect(within(second).getByRole('heading', { name: title })).toBeInTheDocument();
      const own = within(second).getAllByTestId('teach-tile');
      expect(own).toHaveLength(1);
      expect(own[0]).toHaveTextContent(form);
      expect(within(own[0]).queryByRole('button', { name: /^About / })).toBeNull();
    });
  });

  Scenario("Another pronunciation gives the tiles its own sounds, and never Modern Greek's", ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with the goal {string}, no idea level, a fake Postern and the pronunciation {string} chosen', async (_, goal: string, id: string) => {
      await open(goal, id);
    });
    When('he opens the idea sheet of {string} from the Goal screen', opensIdeaOfGoal);
    Then('the first tile has no sound line and does not say {string}', async (_, word: string) => {
      await waitFor(() => expect(tiles()).toHaveLength(24));
      expect(tiles()[0]).toHaveTextContent('alpha');
      expect(tiles()[0].textContent).not.toContain(word);
      expect(tiles()[0].querySelector('[data-sound]')).toBeNull();
    });
  });

  Scenario('The noun sheet says what a noun is, shows its endings in a table, and takes a word of 1 John 1:1 apart', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the idea sheet of {string} from the Goal screen', opensIdeaOfGoal);
    Then('the idea sheet has the parts {string}, {string} and {string}, in that order', (_, a: string, b: string, c: string) => {
      const headings = within(ideaSheet()).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
      const at = [a, b, c].map((part) => headings.indexOf(part));
      expect(at.every((i) => i >= 0), headings.join(', ')).toBe(true);
      expect([...at].sort((x, y) => x - y)).toEqual(at);
    });
    And('what a noun is is said in plain English with an English example', () => {
      const what = within(ideaSheet()).getByTestId('idea-what');
      expect(what).toHaveTextContent(teachOf('noun').whatItIs);
      expect(what.textContent).toMatch(/Example:|for example|“[A-Za-z ]+”/);
    });
    And('How to spot it has a table of the case endings, with {string}, {string} and {string} in its cells', (_, a: string, b: string, c: string) => {
      expect(within(ideaSheet()).getByTestId('idea-spot')).toHaveTextContent(teachOf('noun').howToSpot);
      expect(cells()).toEqual(expect.arrayContaining([a, b, c]));
    });
    And('the worked example takes {string} of {string} apart in steps, with the respelling the pronunciation gives it', (_, word: string, reference: string) => {
      const worked = within(ideaSheet()).getByTestId('idea-worked');
      expect(within(worked).getByTestId('worked-word')).toHaveTextContent(word);
      expect(worked).toHaveTextContent(reference);
      expect(within(worked).getAllByRole('listitem').length).toBeGreaterThanOrEqual(2);
      expect(within(worked).getByTestId('worked-respelling')).toHaveTextContent(pronunciationOf('modern').respell(word));
      expect(within(worked).getByRole('button', { name: `Hear ${word}` })).toBeInTheDocument();
    });
  });

  Scenario('Xi has no word in the goal verse, so its examples come from further out and say where', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then('the idea sheet shows examples spelt with ξ from {string}', async (_, title: string) => {
      await waitFor(() => expect(within(letterSheet()).getByText(`Examples from ${title}`)).toBeInTheDocument());
      const found = within(letterSheet()).getAllByTestId('idea-example');
      expect(found.length).toBeGreaterThan(0);
      for (const example of found) expect(example.textContent).toMatch(/[ξΞ]/u);
    });
    And('the idea sheet has no line {string}', (_, text: string) => {
      expect(letterSheet().textContent).not.toContain(text);
    });
  });

  Scenario("An idea the goal verse has keeps the goal verse's examples", ({ Given, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then('the idea sheet shows examples from {string}', (_, title: string) => {
      expect(within(letterSheet()).getByText(`Examples from ${title}`)).toBeInTheDocument();
      for (const example of within(letterSheet()).getAllByTestId('idea-example')) expect(within(example).getByTestId('idea-verse').textContent).toBe(title);
    });
  });
});
