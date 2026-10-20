// features/steps/idea-sheet.steps.tsx — runs features/idea-sheet.feature: the idea sheet a Grammar sheet's Learn this idea opens, with
// its text, its examples from the goal's passage (or the open chapter), the paradigm table, the level slider, Mark known without a drill and Ask the tutor.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { loadChapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { tryItOn, type TryIt } from '../../src/data/grammar/ideaSheet';
import { ideaOf, itemsOf } from '../../src/data/grammar/ladder';
import { teachOf } from '../../src/data/grammar/teach';
import { IdeaSheet } from '../../src/IdeaSheet';
import { listOpenedParadigms } from '../../src/data/repositories';
import { mulberry32 } from '../../src/data/quiz';
import { gradingOf } from '../../src/review/kinds';
import { DAY, STEP_DAYS } from '../../src/data/schedule';
import { clearBus, subscribe, type EventOf } from '../../src/events/bus';
import { expectLatest, expectPublished } from '../../tests/support/published';
import { chooseAccent, DEFAULT_ACCENT } from '../../src/speech/accents';
import { pronunciationOf, registerPronunciation, type Pronunciation } from '../../src/speech/pronunciation';
import { stopReading } from '../../src/speech/readAloud';
import { MODERN } from '../../src/speech/schemes/modern';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { GRAMMAR_TERM_ANSWER, makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';
import { asSpoken, isOneLetter } from '../../tests/support/lone-word';

let unregisterTestish: (() => void) | undefined;

afterAll(() => {
  unregisterTestish?.();
  chooseAccent(DEFAULT_ACCENT);
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
/** The seed Try it on a verse draws its questions from (src/data/grammar/drillSeed.ts), so a step knows them. */
const TRY_SEED = 11;
/** The phone's fake speech engine, put in place only when a scenario says the phone has a Greek voice. */
let synth: FakeSynth | undefined;
/** The Laptop's wall clock steps back by about a second now and then: a bound on a stored time allows for it. */
const CLOCK_SLACK = 3000;

/** A second pronunciation with lessons of its own for the breathings (mw-5r3p30.229), the accents and the marks that change a word (mw-5r3p30.312). */
const TESTISH: Pronunciation = {
  ...MODERN,
  id: 'testish',
  label: 'Testish',
  lessons: () => ({
    breathings: { text: 'Testish says the rough breathing as a hum.' },
    accents: { also: 'Testish sings the accented syllable high.' },
    'marks-change-word': { also: 'Testish says ἡ and ἤ apart by their pitch.' },
  }),
};

/** Opens the app on Romans 8 with every store emptied, `goal` saved as the goal setting when there is one, the pronunciation `chosen` saved, a fake Postern and, with `greekVoice`, a phone that has a Greek voice. */
async function open(goal: string | undefined, chosen?: string, greekVoice = false, accent?: string, link = ''): Promise<void> {
  unregisterTestish?.();
  unregisterTestish = undefined;
  chooseAccent(DEFAULT_ACCENT);
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  synth = greekVoice ? stubSpeech([GREEK_VOICE]) : undefined;
  taught = [];
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  if (link) window.history.replaceState(null, '', `/${link}`);
  tutorTimings.pollMs = 20;
  drillSeed.next = () => TRY_SEED;
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
  if (accent !== undefined) await db.settings.put({ key: 'englishAccent', value: accent });
  await seedHisWords();
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

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
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
    And('an idea-taught event for {string} with the outcome {string} was published', async (_, id: string, outcome: string) => {
      await expectPublished(() => taught, [{ kind: 'idea-taught', id, outcome }]);
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
    And('an idea-taught event for {string} with the outcome {string} was published', async (_, id: string, outcome: string) => {
      await expectPublished(() => taught, [{ kind: 'idea-taught', id, outcome }]);
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

  Scenario("Learn this idea on the Grammar sheet of preposition opens the tapped preposition's own idea", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on 1 John 1 in Greek with no goal, no idea level and a fake Postern', async () => {
      await open(undefined, undefined, false, undefined, '#/?ref=1John.1.1&view=greek');
      await waitFor(() => expect(within(verseEl(1)).getByRole('button', { name: 'περὶ' })).toBeInTheDocument());
    });
    And('he taps {string} in verse {int} and the term {string} on the word sheet', (_, text: string, verse: number, term: string) => tapsWordAndTerm(text, verse, term));
    When('he taps Learn this idea', async () => {
      await user.click(within(grammarSheet()).getByRole('button', { name: 'Learn this idea' }));
    });
    Then('the idea sheet is headed {string}', async (_, title: string) => {
      await screen.findByRole('dialog', { name: 'Idea' });
      expect(await within(ideaSheet()).findByRole('heading', { name: title })).toBeInTheDocument();
    });
    And('the idea sheet says {string}', (_, text: string) => {
      expect(ideaSheet()).toHaveTextContent(text);
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

  ScenarioOutline("Another pronunciation teaches its own lesson of a mark on the sheet, never Modern Greek's", ({ Given, When, Then, And }, row) => {
    Given('Lampas is opened on Romans 8 with the goal "1 John 1:1", no idea level, a fake Postern and the pronunciation "testish" chosen', () => open('1 John 1:1', TESTISH.id));
    When('the idea sheet of "<idea>" is opened', async () => {
      render(<IdeaSheet idea={ideaOf(String(row.idea))} onClose={() => undefined} onWord={() => undefined} />);
      await screen.findByRole('dialog', { name: 'Idea' });
      await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
    });
    Then('the idea sheet text says "<lesson>"', async () => {
      await waitFor(() => expect(within(ideaSheet()).getByTestId('idea-text')).toHaveTextContent(String(row.lesson)));
    });
    And('the idea sheet text does not say "Modern Greek"', () => {
      expect(within(ideaSheet()).getByTestId('idea-text').textContent).not.toContain('Modern Greek');
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
      // a letter tile names its letter; a word goes as a word said alone, in monotonic marks with '!' (mw-5r3p30.357)
      await waitFor(() => expect(lastSpoken()).toBe(isOneLetter(text) ? text : asSpoken(text)));
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
      // a letter tile names its letter; a word goes as a word said alone, in monotonic marks with '!' (mw-5r3p30.357)
      await waitFor(() => expect(lastSpoken()).toBe(isOneLetter(text) ? text : asSpoken(text)));
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

  Scenario('The augment sheet says which past forms have the augment and that only the indicative has it', ({ Given, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the idea sheet of {string} from the Goal screen', opensIdeaOfGoal);
    Then(
      'How to spot it names the imperfect, the aorist and the form of {string} {string} as having the augment, and only in the indicative, and never says {string}',
      (_, word: string, gloss: string, phrase: string) => {
        const spot = within(ideaSheet()).getByTestId('idea-spot').textContent ?? '';
        expect(spot).toMatch(/imperfect/);
        expect(spot).toMatch(/aorist/);
        expect(spot).toContain(word);
        expect(spot).toContain(`“${gloss}”`);
        expect(spot).toMatch(/only (?:in )?the indicative/i);
        expect(spot).not.toContain(phrase);
      },
    );
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

  const shownForms = (): string[] => within(letterSheet()).getAllByTestId('idea-example').map((e) => e.getAttribute('data-form') ?? '');
  const examplesFrom = async (_: unknown, title: string): Promise<void> => {
    await waitFor(() => expect(within(letterSheet()).getByText(`Examples from ${title}`)).toBeInTheDocument());
    // each example names the verse it stands in, which lies within the heading's place
    expect(shownForms().length).toBeGreaterThan(0);
  };
  const noExample = async (_: unknown, form: string): Promise<void> => {
    await waitFor(() => expect(within(letterSheet()).queryByTestId('idea-loading')).toBeNull());
    expect(shownForms()).not.toContain(form);
  };

  Scenario('The Omicron sheet shows only words where ο is said alone, and says on purpose what a pair does', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then('the idea sheet shows examples from {string}', examplesFrom);
    And('the idea sheet shows the example {string} first', (_, form: string) => {
      expect(shownForms()[0]).toBe(form);
    });
    And('the idea sheet shows no example {string}', noExample);
    And('the idea sheet does not list {string}', noExample);
    And('the idea sheet says {string}', (_, line: string) => {
      expect(within(letterSheet()).getByTestId('pair-line').textContent?.replace(/\s+/g, ' ').trim()).toBe(line);
    });
    When('he taps the word {string} of that line', async (_, word: string) => {
      await user.click(within(within(letterSheet()).getByTestId('pair-line')).getByRole('button', { name: word }));
    });
    Then('a third idea sheet titled {string} opens over the letter sheet', async (_, title: string) => {
      await waitFor(() => expect(screen.getAllByRole('dialog', { name: 'Idea' })).toHaveLength(3));
      expect(within(screen.getAllByRole('dialog', { name: 'Idea' })[2]).getByRole('heading', { name: title })).toBeInTheDocument();
    });
  });

  Scenario('The Upsilon sheet shows no word where υ is half of ου', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then('the idea sheet shows no example {string}', noExample);
    And('the idea sheet does not list {string}', noExample);
    And("the letter sheet's How it sounds says {string}", (_, text: string) => {
      expect(letterSheet().textContent).toContain(text);
    });
  });

  Scenario('The Phi sheet puts a short easy word before a hard cluster, even from further away', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then('the idea sheet shows examples from {string}', examplesFrom);
    And('the idea sheet shows no example {string}', noExample);
    And('the idea sheet does not list {string}', noExample);
  });
  const ownTile = (): HTMLElement => within(letterSheet()).getAllByTestId('teach-tile')[0];
  const howItSounds = (): HTMLElement => within(letterSheet()).getByTestId('idea-text');

  Scenario('The Omicron sheet says its o the way an American says it', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then("the letter sheet's tile reads {string}", (_, sound: string) => {
      expect(ownTile().querySelector('[data-sound]')?.textContent).toBe(sound);
    });
    And("the letter sheet's How it sounds reads {string}", (_, text: string) => {
      expect(howItSounds().textContent).toBe(text);
    });
    And('the letter sheet does not say {string}', (_, word: string) => {
      expect(letterSheet().textContent).not.toMatch(new RegExp(`\\b${word}\\b`));
    });
  });

  Scenario('With British English the Omicron sheet keys its o to "lot"', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the goal {string}, no idea level, a fake Postern and the English accent {string}', async (_, goal: string, accent: string) => {
      await open(goal);
      chooseAccent(accent);
    });
    When('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then("the letter sheet's tile reads {string}", (_, sound: string) => {
      expect(ownTile().querySelector('[data-sound]')?.textContent).toBe(sound);
    });
    And("the letter sheet's How it sounds reads {string}", (_, text: string) => {
      expect(howItSounds().textContent).toBe(text);
    });
  });
  const chooseInSettings = async (_: unknown, choice: string, group: string): Promise<void> => {
    window.location.hash = '#/settings?group=listening';
    const box = await screen.findByRole('group', { name: group });
    await user.click(within(box).getByRole('button', { name: choice, exact: true }));
    await waitFor(() => expect(within(box).getByRole('button', { name: choice, exact: true })).toHaveAttribute('aria-pressed', 'true'));
  };
  const savedAccent = async (_: unknown, id: string): Promise<void> => {
    await waitFor(async () => expect((await db.settings.get('englishAccent'))?.value).toBe(id));
  };

  Scenario('Choosing British in Settings makes the Omicron sheet read the British hint, and American brings the American one back', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he chooses {string} in the group {string} in Settings', chooseInSettings);
    And('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then("the letter sheet's tile reads {string}", (_, sound: string) => {
      expect(ownTile().querySelector('[data-sound]')?.textContent).toBe(sound);
    });
    And("the letter sheet's How it sounds reads {string}", (_, text: string) => {
      expect(howItSounds().textContent).toBe(text);
    });
    And('the English accent is saved as {string}', savedAccent);
  });

  Scenario('A phone that kept British starts on it, and choosing American again puts the American hint back', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the goal {string}, no idea level, a fake Postern and the English accent {string} saved', async (_, goal: string, accent: string) => {
      await open(goal, undefined, false, accent);
    });
    Then('the group {string} in Settings has {string} chosen', async (_, group: string, choice: string) => {
      window.location.hash = '#/settings?group=listening';
      const box = await screen.findByRole('group', { name: group });
      await waitFor(() => expect(within(box).getByRole('button', { name: choice, exact: true })).toHaveAttribute('aria-pressed', 'true'));
    });
    When('he chooses {string} in the group {string} in Settings', chooseInSettings);
    And('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then("the letter sheet's tile reads {string}", (_, sound: string) => {
      expect(ownTile().querySelector('[data-sound]')?.textContent).toBe(sound);
    });
    And('the English accent is saved as {string}', savedAccent);
  });

  Scenario('Choosing IPA (the standard) shows the standard id instead of a key word', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he chooses {string} in the group {string} in Settings', chooseInSettings);
    And('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then("the letter sheet's tile reads {string}", (_, sound: string) => {
      expect(ownTile().querySelector('[data-sound]')?.textContent).toBe(sound);
    });
    And("the letter sheet's How it sounds reads {string}", (_, text: string) => {
      expect(howItSounds().textContent).toBe(text);
    });
    And('the letter sheet does not say {string}', (_, word: string) => {
      expect(letterSheet().textContent).not.toMatch(new RegExp(`\\b${word}\\b`));
    });
  });
  Scenario('An idea links to its table', ({ Given, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the idea sheet of {string} from the Goal screen', opensIdeaOfGoal);
    Then('the idea sheet shows the button {string}', (_, name: string) => {
      expect(within(ideaSheet()).getByRole('button', { name })).toBeInTheDocument();
    });
    When('he taps {string} on the idea sheet', async (_, name: string) => user.click(within(ideaSheet()).getByRole('button', { name })));
    Then('the address is {string} and the table {string} is open in Study mode', async (_, hash: string, name: string) => {
      expect(window.location.hash).toBe(hash);
      expect(await screen.findByRole('heading', { name, level: 1 })).toBeInTheDocument();
      // in Study mode the one switch button names the mode it goes to; the line under the title may say the cells are locked (mw-svw421.23)
      expect(screen.getByRole('button', { name: 'Review mode' })).toBeInTheDocument();
    });
    When('he goes Back', async () => {
      window.history.back();
    });
    Then('the idea sheet {string} is on screen over the Goal screen', async (_, title: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Idea' });
      expect(within(sheet).getByRole('heading', { name: title })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/goal');
      // Back closes it as it closes any sheet, and leaves him on the Goal screen
      window.history.back();
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Idea' })).toBeNull());
      expect(window.location.hash).toBe('#/goal');
    });
  });

  Scenario('The Chi sheet draws its first three examples and folds the rest under Show N more', ({ Given, When, Then }) => {
    // a folded row stays in the page, hidden, so every example is still one tap away
    const drawn = (): HTMLElement[] => shownRows().filter((row) => !row.closest('li')?.hidden);
    const shownRows = (): HTMLElement[] => within(letterSheet()).getAllByTestId('idea-example');
    const showRest = (): HTMLElement | null => within(letterSheet()).queryByRole('button', { name: /^Show \d+ more$/ });
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the letter sheet of {string} from the alphabet sheet', openLetterSheet);
    Then('the letter sheet draws its first {int} examples and a button that shows the rest', async (_, shown: number) => {
      await waitFor(() => expect(within(letterSheet()).queryByTestId('idea-loading')).toBeNull());
      const all = shownRows();
      expect(all.length).toBeGreaterThan(shown);
      expect(drawn()).toEqual(all.slice(0, shown));
      expect(showRest()).toHaveTextContent(`Show ${all.length - shown} more`);
    });
    When('he taps the button that shows the rest', async () => user.click(showRest() as HTMLElement));
    Then('the letter sheet draws every example and no such button', () => {
      expect(drawn()).toEqual(shownRows());
      expect(showRest()).toBeNull();
    });
  });

  Scenario('An idea no table teaches has no table link', ({ Given, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the idea sheet of {string} from the Goal screen', opensIdeaOfGoal);
    Then('the idea sheet shows no button that starts {string}', (_, start: string) => {
      expect(within(ideaSheet()).queryAllByRole('button').filter((b) => b.textContent?.startsWith(start))).toEqual([]);
    });
  });

  // ---- Try it on a verse (mw-emk3xt.4) ----
  const tryDialog = () => screen.getByRole('dialog', { name: 'Try it' });
  /** The verse and questions the sheet will ask, worked out as it works them out: before the first answer moves a level. */
  let expectedTry: TryIt | null = null;
  let tryIndex = 0;
  const optionIn = async (dialog: HTMLElement, text: string): Promise<HTMLElement> => {
    let found: HTMLElement | undefined;
    await waitFor(() => {
      found = Array.from(dialog.querySelectorAll<HTMLElement>('[data-option]')).find((o) => o.textContent === text && !(o as HTMLButtonElement).disabled);
      expect(found, `option ${text}`).toBeDefined();
    });
    return found as HTMLElement;
  };
  /** Answers the question on screen: right, or wrong (a wrong choice, or a wrong first step of a parsing). */
  async function answerTry(right: boolean): Promise<void> {
    const question = expectedTry!.questions[tryIndex];
    const dialog = tryDialog();
    if (question.kind === 'parse') {
      const steps = question.steps!;
      if (right) for (const step of steps) await user.click(await optionIn(dialog, step.right));
      else await user.click(await optionIn(dialog, steps[0].options.find((o) => o !== steps[0].right) as string));
    } else {
      await user.click(await optionIn(dialog, right ? question.right : (question.options.find((o) => o !== question.right) as string)));
    }
    tryIndex += 1;
    await user.click(await within(dialog).findByTestId('try-it-next'));
  }

  Scenario('Try it on a verse', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    And('{string} is the idea he is learning', async (_, id: string) => {
      await db.grammarLevels.put({ id, level: 'frontier', since: Date.now(), how: 'sheet' });
    });
    And(GIVEN_OPEN, opensTheIdea);
    Then('the idea sheet shows the button {string}', async (_, name: string) => {
      expect(await within(ideaSheet()).findByRole('button', { name })).toBeInTheDocument();
    });
    When('he taps {string} on the idea sheet', async (_, name: string) => {
      const chapters = [await loadChapter('1jn', 1)];
      const { graded, passes } = await gradingOf(chapters);
      expectedTry = tryItOn(ideaOf('case-genitive'), chapters, graded, passes, new Set(await listOpenedParadigms()), mulberry32(TRY_SEED));
      tryIndex = 0;
      await user.click(within(ideaSheet()).getByRole('button', { name }));
    });
    Then('the sheet {string} opens with a meaning question first', async (_, title: string) => {
      const dialog = await screen.findByRole('dialog', { name: 'Try it' });
      expect(await within(dialog).findByTestId('try-it-title')).toHaveTextContent(title);
      expect(expectedTry?.ref).toBe(title.replace('Try it: ', ''));
      expect(expectedTry?.questions).toHaveLength(3);
      expect(expectedTry?.questions[0].kind).toBe('meaning');
      expect(await within(dialog).findByTestId('grammar-prompt')).toHaveTextContent('What does this say?');
      expect(within(dialog).getByTestId('try-it-step')).toHaveTextContent('Question 1 of 3');
    });
    When('he answers the three questions right, right and wrong', async () => {
      await answerTry(true);
      await answerTry(true);
      await answerTry(false);
    });
    Then('the sheet says {string} and offers {string} and {string}', async (_, text: string, read: string, done: string) => {
      const dialog = tryDialog();
      expect(await within(dialog).findByTestId('try-it-result')).toHaveTextContent(text);
      expect(within(dialog).getByRole('button', { name: read })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: done })).toBeInTheDocument();
    });
    And('an idea-tried event for {string} with 2 right of 3 was published', async (_, id: string) => {
      await expectLatest('idea-tried', (event) => expect(event).toEqual({ kind: 'idea-tried', id, right: 2, total: 3 }));
    });
    And('the idea {string} has two right and one wrong review', async (_, id: string) => {
      await waitFor(async () => expect((await review(id)).recent?.map((r) => r.right)).toEqual([true, true, false]));
      expect(await review(id)).toMatchObject({ lapses: 1 });
    });
    When('he taps {string} on the Try it sheet', async (_, name: string) => {
      await user.click(within(tryDialog()).getByRole('button', { name }));
    });
    Then('the Reader is open on 1 John 1:4 with no sheet open', async () => {
      const view = await screen.findByRole('region', { name: 'Verse view' });
      expect(view).toHaveAttribute('data-verse-view', '4');
      expect(within(view).getByRole('heading', { level: 2 })).toHaveTextContent('1 John 1:4');
      await waitFor(() => expect(screen.queryAllByRole('dialog')).toEqual([]));
    });
  });

  Scenario('An idea of the letters has no verse to try it on', ({ Given, When, Then }) => {
    Given(GIVEN_GOAL, opensWithGoal);
    When('he opens the idea sheet of {string} from the Goal screen', opensIdeaOfGoal);
    Then('the idea sheet shows the button {string} and no button {string}', (_, has: string, lacks: string) => {
      expect(within(ideaSheet()).getByRole('button', { name: has })).toBeInTheDocument();
      expect(within(ideaSheet()).queryByRole('button', { name: lacks })).toBeNull();
    });
  });
});
