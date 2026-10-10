// features/steps/ask-tutor.steps.tsx — runs features/ask-tutor.feature: the round Ask the tutor control of every full screen, the Talk sheet it
// opens, the `screen` field of the request (read from the grist a fake Postern opened), the suggested questions and the talk kept under the
// screen's ref. The Goal screen's numbers are compared with progressToward worked out in the step from the stores.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { attribution, plainText } from '../../src/attribution';
import { CREDITS } from '../../src/tutor/credits';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { passageNeeds, progressToward, type Level } from '../../src/data/grammar/needs';
import { setGoal } from '../../src/data/repositories/settings';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { ROWS } from '../../src/settings/rows';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { validate, type Schema } from '../../tests/support/schema-validate';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const CONTROL = 'Ask the tutor about this screen';
const SIMPLEST = "What's the simplest verse in the New Testament for me to learn first, given where I am?";
const inputSchema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;
const chapterFile = (book: string, n: number) => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
let fake: FakePostern;

/** Opens the app at `address` with the goal saved and a fake Postern behind it; his seed words and levels are the first open's. */
async function openAt(address: string, goal: string | undefined = '1 John 1:1'): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/${address}`);
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  if (goal !== undefined) await setGoal(goal);
  render(<App />);
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
}

const control = () => screen.queryAllByRole('button', { name: CONTROL });
const taps = async () => {
  await user.click(await screen.findByRole('button', { name: CONTROL }));
};
const sheet = () => screen.getByRole('dialog', { name: /^(Ask the tutor: |Talk about )/ });
const sent = (i: number) => {
  const got = fake.received[i];
  if (!got) throw new Error(`the mill received no grist number ${i + 1}`);
  return got.input;
};
const facts = (i = 0) => (sent(i).screen as { name: string; facts: { label: string; value: string }[] }).facts;
const factOf = (label: string, i = 0): string => {
  const fact = facts(i).find((f) => f.label === label);
  if (!fact) throw new Error(`the screen facts have no "${label}": ${JSON.stringify(facts(i))}`);
  return fact.value;
};

async function send(question: string): Promise<void> {
  await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), question);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));
const suggestions = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-suggestion]'));
const ABOUT_SUGGESTIONS = ['Why do you credit all these?', 'What does each of these do for Lampas?', 'What does STEPBible give me?'];
const tapsSuggestion = async (question: string) => {
  await user.click(suggestions().find((s) => s.textContent === question)!);
};
const answerArrived = async (n: number) => {
  await waitFor(() => expect(turns()).toHaveLength(n));
};
const canBeTapped = async (question: string) => {
  const found = suggestions().find((s) => s.textContent === question);
  expect(found, question).toBeDefined();
  expect(found).toBeEnabled();
};
const closeSheet = async () => {
  await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
};

/** The counts progressToward gives for 1 John 1:1 from what the stores hold now. */
async function expectedProgress() {
  const needs = await passageNeeds({ book: '1jn', chapter: 1, verse: 1 }, async (_, n) => chapterFile('1jn', n), BOOK_INDEX);
  const states = new Map((await db.words.toArray()).map((w) => [w.lemma, w.state] as const));
  const levels = new Map((await db.grammarLevels.toArray()).map((row): [string, Level] => [row.id, row.level]));
  return progressToward(needs, states, levels);
}

const counts = (c: { solid: number; frontier: number; notYet: number }) => `Solid ${c.solid} · Frontier ${c.frontier} · Not yet ${c.notYet}`;

const FULL_SCREENS: [string, string][] = [
  ['Goal', '#/goal'],
  ['Words', '#/words'],
  ['Review', '#/review'],
  ['Quick test', '#/test'],
  ['Parsing drill', '#/drill'],
  ['Paradigms', '#/paradigms'],
  ['Placement', '#/placement'],
  ['Settings', '#/settings'],
  ['My study way', '#/studyway'],
  ['Import', '#/import'],
  ['About', '#/about'],
  ['Preface', '#/preface'],
];

const feature = await loadFeature('features/ask-tutor.feature');

describeFeature(feature, ({ ScenarioOutline, Scenario }) => {
  ScenarioOutline('The control on <screen> opens the Talk sheet', ({ Given, Then, When, And }, row) => {
    Given('Lampas is opened on <address> with the goal {string} behind a fake Postern', (_, goal: string) => openAt(row.address, goal));
    Then('the screen has one control named {string}', async (_, name: string) => {
      expect(name).toBe(CONTROL);
      await waitFor(() => expect(control()).toHaveLength(1));
    });
    When('he taps the Ask the tutor control', taps);
    Then('the Talk sheet is titled for <screen>', async () => {
      expect(await screen.findByRole('dialog', { name: `Ask the tutor: ${row.screen}` })).toBeInTheDocument();
    });
    And('the control is hidden while the sheet is open', async () => {
      await waitFor(() => expect(control()).toHaveLength(0));
    });
  });

  Scenario("Every full screen has the control, and the Reader's opens its chapter talk", ({ Given, Then, When }) => {
    Given('Lampas is opened on the Reader behind a fake Postern', async () => {
      await openAt('', undefined);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    Then('the screen has one control named {string}', async (_, name: string) => {
      expect(name).toBe(CONTROL);
      await waitFor(() => expect(control()).toHaveLength(1));
    });
    When('he taps the Ask the tutor control', taps);
    Then('the Talk sheet is titled {string}', async (_, title: string) => {
      expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument();
    });
    When('he closes the Talk sheet', closeSheet);
    Then('every other full screen has the control: Goal, Words, Review, Quick test, Parsing drill, Paradigms, Placement, Settings, My study way, Import and About', async () => {
      for (const [name, address] of FULL_SCREENS) {
        cleanup();
        forgetTrail();
        window.history.replaceState(null, '', `/${address}`);
        render(<App />);
        await waitFor(() => expect(control(), name).toHaveLength(1));
        await user.click(control()[0]);
        expect(await screen.findByRole('dialog', { name: `Ask the tutor: ${name}` })).toBeInTheDocument();
      }
    });
  });

  Scenario('From Goal the request carries the goal, the counts, Learn next and the Next words', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on #/goal with the goal {string} behind a fake Postern', (_, goal: string) => openAt('#/goal', goal));
    And('the Goal screen shows its counts, Learn next and Next words', async () => {
      await screen.findByTestId('learn-next');
      // the screen settles on his seeded words before it is asked from: its legends say what progressToward gives
      const { words, grammar } = await expectedProgress();
      await waitFor(() => expect(screen.getByTestId('words-legend')).toHaveTextContent(counts(words)));
      await waitFor(() => expect(screen.getByTestId('ideas-legend')).toHaveTextContent(counts(grammar)));
      await waitFor(() => expect(screen.queryAllByTestId('next-word').length).toBe(3));
    });
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', (_, question: string) => send(question));
    Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
      expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
    });
    And('the grist is for the screen {string} and has no verse text', (_, name: string) => {
      expect(sent(0).screen).toMatchObject({ name });
      expect(sent(0).reference).toBe(name);
      expect(sent(0)).not.toHaveProperty('greek');
      expect(sent(0)).not.toHaveProperty('english');
    });
    And("the grist's screen facts carry the goal {string}", (_, goal: string) => {
      expect(factOf('Goal')).toBe(goal);
    });
    And("the grist's screen facts carry the counts the Goal screen shows for words and for ideas", async () => {
      const { words, grammar } = await expectedProgress();
      expect(words.total).toBeGreaterThan(0);
      expect(factOf('Words')).toBe(counts(words));
      expect(factOf('Grammar ideas')).toBe(counts(grammar));
    });
    And("the grist's screen facts carry Learn next as the Goal screen shows it", () => {
      const shown = screen.queryByTestId('learn-next');
      // The control is on the Goal screen; the sheet covers it, so the text is read from the screen's own button
      expect(shown).not.toBeNull();
      expect(`Learn next: ${factOf('Learn next')}`).toBe(shown?.textContent);
    });
    And("the grist's screen facts carry the Next words the Goal screen shows", () => {
      const lemmas = screen.queryAllByTestId('next-word').map((el) => el.getAttribute('data-lemma') ?? '');
      expect(lemmas).toHaveLength(3);
      const value = factOf('Next words');
      let at = -1;
      for (const lemma of lemmas) {
        const found = value.indexOf(lemma, at + 1);
        expect(found, `${lemma} in ${value}`).toBeGreaterThan(at);
        at = found;
      }
    });
    And('the grist still carries what he knows: his solid words, the learner line and the learner grammar', () => {
      expect(Array.isArray(sent(0).solid_words)).toBe(true);
      expect(typeof sent(0).learner).toBe('string');
      expect(sent(0).learner_grammar).toMatchObject({ goal: 'Read 1 John 1:1' });
    });
    And('the grist carries only fields the input schema allows', () => {
      expect(validate(sent(0), inputSchema)).toEqual([]);
    });
  });

  Scenario('The sheet opens with questions fitted to the screen and a tap sends one', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on #/goal with the goal {string} behind a fake Postern', (_, goal: string) => openAt('#/goal', goal));
    When('he taps the Ask the tutor control', taps);
    Then('the sheet suggests two or three questions', async () => {
      await screen.findByRole('dialog', { name: 'Ask the tutor: Goal' });
      expect(suggestions().length).toBeGreaterThanOrEqual(2);
      expect(suggestions().length).toBeLessThanOrEqual(3);
    });
    And('one of them asks for the simplest verse in the New Testament to learn first, given where he is', () => {
      expect(suggestions().map((s) => s.textContent)).toContain(SIMPLEST);
    });
    When('he taps that suggested question', async () => {
      await user.click(suggestions().find((s) => s.textContent === SIMPLEST)!);
    });
    Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
    });
    And('the grist carries the question {string}', (_, question: string) => {
      expect(question).toBe(SIMPLEST);
      expect(sent(0).question).toBe(question);
      expect(sent(0).screen).toMatchObject({ name: 'Goal' });
    });
    And('the answer shows in the sheet under his question', async () => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      expect(within(turns()[0]).getByText(SIMPLEST)).toBeInTheDocument();
      expect(turns()[0]).toHaveTextContent(TALK_ANSWER.answer);
    });
    And('the empty state is gone', () => {
      expect(sheet().querySelector('[data-talk-empty]')).toBeNull();
    });
  });

  Scenario('On Settings the request carries every setting, its value and its help, and the sheet suggests questions about settings', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on #/settings with the goal {string} behind a fake Postern', (_, goal: string) => openAt('#/settings', goal));
    When('he taps the Ask the tutor control', taps);
    Then('the sheet suggests a question about Accordance, {string}', async (_, question: string) => {
      await screen.findByRole('dialog', { name: 'Ask the tutor: Settings' });
      expect(suggestions().map((s) => s.textContent)).toContain(question);
    });
    When('he taps that suggested question', async () => {
      await user.click(suggestions().find((s) => s.textContent === 'What would Accordance give me?')!);
    });
    Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
    });
    And('the grist carries the question {string}', (_, question: string) => {
      expect(sent(0).question).toBe(question);
    });
    And('the grist is for the screen {string} and has no verse text', (_, name: string) => {
      expect(sent(0).screen).toMatchObject({ name });
      expect(sent(0)).not.toHaveProperty('greek');
    });
    And("the grist's screen settings name every setting and study resource with its value now and its help", () => {
      const got = (sent(0).screen as { settings: { name: string; value: string; help: string }[] }).settings;
      const wanted = ROWS.filter((r) => !r.key.startsWith('link.') && r.key !== 'developer');
      expect(got.map((s) => s.name)).toEqual(wanted.map((r) => r.label));
      for (const s of got) {
        expect(s.value, s.name).not.toBe('');
        expect(s.help, s.name).toBe(wanted.find((r) => r.label === s.name)?.hint);
      }
    });
    And("the grist's screen settings say Accordance is Off and what it adds", () => {
      const got = (sent(0).screen as { settings: { name: string; value: string; help: string }[] }).settings;
      expect(got.find((s) => s.name === 'Accordance')).toMatchObject({ value: 'Off', help: expect.stringContaining('Open in Accordance') });
    });
    And('the grist carries only fields the input schema allows', () => {
      expect(validate(sent(0), inputSchema)).toEqual([]);
    });
  });

  Scenario('After the first question the other suggestions are still there and a tap sends one', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on #/about with the goal {string} behind a fake Postern', (_, goal: string) => openAt('#/about', goal));
    When('he taps the Ask the tutor control', taps);
    And('he taps the suggested question {string}', (_, question: string) => tapsSuggestion(question));
    And('the answer number {int} has arrived', (_, n: number) => answerArrived(n));
    Then('the suggested question {string} can still be tapped', (_, question: string) => canBeTapped(question));
    And('the suggested question {string} is not offered again', async (_, question: string) => {
      expect(suggestions().map((s) => s.textContent)).not.toContain(question);
    });
    When('he taps the suggested question {string}', (_, question: string) => tapsSuggestion(question));
    Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
    });
    And('the second grist carries the question {string}', (_, question: string) => {
      expect(sent(1).question).toBe(question);
    });
  });

  Scenario('New talk clears the kept talk and brings back the empty state with all three suggestions, also after a reload', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on #/about with the goal {string} behind a fake Postern', (_, goal: string) => openAt('#/about', goal));
    When('he taps the Ask the tutor control', taps);
    And('he taps the suggested question {string}', (_, question: string) => tapsSuggestion(question));
    And('the answer number {int} has arrived', (_, n: number) => answerArrived(n));
    And('he taps New talk', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'New talk' }));
    });
    Then('the sheet shows the empty state with all three suggestions and no earlier turn', async () => {
      await waitFor(() => expect(turns()).toHaveLength(0));
      expect(sheet().querySelector('[data-talk-empty]')).not.toBeNull();
      expect(suggestions().map((s) => s.textContent)).toEqual(ABOUT_SUGGESTIONS);
      expect(within(sheet()).queryByRole('button', { name: 'New talk' })).toBeNull();
    });
    When('Lampas is reloaded on #/about', async () => {
      cleanup();
      stopReading();
      clearBus();
      window.history.replaceState(null, '', '/#/about');
      render(<App />);
    });
    And('he taps the Ask the tutor control after the reload', taps);
    Then('after the reload the sheet shows the empty state with all three suggestions and no earlier turn', async () => {
      await screen.findByRole('dialog', { name: 'Ask the tutor: About' });
      await waitFor(() => expect(sheet().querySelector('[data-talk-empty]')).not.toBeNull());
      expect(turns()).toHaveLength(0);
      expect(suggestions().map((s) => s.textContent)).toEqual(ABOUT_SUGGESTIONS);
    });
  });

  Scenario('A first question that fails offline still leaves the other suggestions reachable', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on #/about with the goal {string} behind a fake Postern', (_, goal: string) => openAt('#/about', goal));
    When('he taps the Ask the tutor control', taps);
    And('the mill goes down', () => {
      fake.down = true;
    });
    And('he taps the suggested question {string}', (_, question: string) => tapsSuggestion(question));
    Then('the sheet says {string} with a Retry button', async (_, title: string) => {
      expect(await within(sheet()).findByText(title)).toBeInTheDocument();
      expect(within(sheet()).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
    And('the suggested question {string} can still be tapped', (_, question: string) => canBeTapped(question));
    When('the mill is back and he taps the suggested question {string}', async (_, question: string) => {
      fake.down = false;
      await tapsSuggestion(question);
    });
    Then('the answer shows under his question {string}', async (_, question: string) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      expect(within(turns()[0]).getByText(question)).toBeInTheDocument();
    });
  });

  Scenario('On About the request carries every credit and the sheet suggests questions about the credits', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on #/about with the goal {string} behind a fake Postern', (_, goal: string) => openAt('#/about', goal));
    When('he taps the Ask the tutor control', taps);
    Then('the sheet suggests questions about the credits, one of them {string}', async (_, question: string) => {
      await screen.findByRole('dialog', { name: 'Ask the tutor: About' });
      expect(suggestions().length).toBeGreaterThanOrEqual(2);
      expect(suggestions().map((s) => s.textContent)).toContain(question);
    });
    When('he taps the suggested question {string}', async (_, question: string) => {
      await user.click(suggestions().find((s) => s.textContent === question)!);
    });
    Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
    });
    And('the grist carries the question {string}', (_, question: string) => {
      expect(sent(0).question).toBe(question);
    });
    And('the grist is for the screen {string} and has no verse text', (_, name: string) => {
      expect(sent(0).screen).toMatchObject({ name });
      expect(sent(0)).not.toHaveProperty('greek');
    });
    And("the grist's screen credits name every source About lists, each with what it gives, its licence and its link", () => {
      const got = (sent(0).screen as { credits: { name: string; use: string; licence: string; link: string }[] }).credits;
      expect(got).toEqual(CREDITS);
      for (const entry of attribution.entries) {
        expect(got.some((c) => plainText(entry).includes(c.name) && entry.includes(c.link)), plainText(entry).slice(0, 50)).toBe(true);
      }
    });
    And("the grist's screen credits say TBESG is CC BY 4.0", () => {
      const got = (sent(0).screen as { credits: { name: string; licence: string }[] }).credits;
      expect(got.find((c) => c.name === 'TBESG')?.licence).toBe('CC BY 4.0');
    });
    And('the grist carries only fields the input schema allows', () => {
      expect(validate(sent(0), inputSchema)).toEqual([]);
    });
  });

  Scenario('Other screens suggest their own questions', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on #/words with the goal {string} behind a fake Postern', (_, goal: string) => openAt('#/words', goal));
    When('he taps the Ask the tutor control', taps);
    Then('the sheet suggests two or three questions', async () => {
      await screen.findByRole('dialog', { name: 'Ask the tutor: Words' });
      expect(suggestions().length).toBeGreaterThanOrEqual(2);
      expect(suggestions().length).toBeLessThanOrEqual(3);
    });
    And('none of them is the simplest verse question', () => {
      expect(suggestions().map((s) => s.textContent)).not.toContain(SIMPLEST);
    });
  });

  Scenario('A talk from a screen is kept under the screen, and is there on return', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal with the goal {string} behind a fake Postern', (_, goal: string) => openAt('#/goal', goal));
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', (_, question: string) => send(question));
    And('the answer number {int} has arrived', async (_, n: number) => {
      await waitFor(() => expect(turns()).toHaveLength(n));
    });
    Then('the talk is kept under {string} and under no verse or chapter', async (_, ref: string) => {
      const rows = await db.talks.toArray();
      expect(rows.map((r) => r.ref)).toEqual([ref]);
    });
    When('he closes the Talk sheet', closeSheet);
    And('he opens the Words screen and then the Goal screen again', async () => {
      await act(async () => {
        window.location.hash = '#/words';
      });
      await screen.findByRole('heading', { name: 'Words', level: 1 });
      await act(async () => {
        window.location.hash = '#/goal';
      });
      await screen.findByTestId('learn-next');
    });
    And('he taps the Ask the tutor control on return', taps);
    Then('the sheet shows his question {string} and its answer', async (_, question: string) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      expect(within(turns()[0]).getByText(question)).toBeInTheDocument();
      expect(turns()[0]).toHaveTextContent(TALK_ANSWER.answer);
    });
    When('he closes the sheet once more', closeSheet);
    And('he opens the Words screen', async () => {
      await act(async () => {
        window.location.hash = '#/words';
      });
      await screen.findByRole('heading', { name: 'Words', level: 1 });
    });
    And('he taps the Ask the tutor control there', taps);
    Then('the sheet shows no earlier turn', async () => {
      await screen.findByRole('dialog', { name: 'Ask the tutor: Words' });
      expect(turns()).toHaveLength(0);
    });
  });
});
