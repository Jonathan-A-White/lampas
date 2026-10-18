// features/steps/passage-lesson.steps.tsx — runs features/passage-lesson.feature: a passage lesson opens in the Verse view with a Lesson strip, and Check passes it by reading
// (mw-z370x5.2). The questions are the ones the sheet draws: the step works them out as the sheet does, from the drill seed it fixes, before the first answer moves a level.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { JOHN_LESSONS } from '../../src/approaches/john-lessons';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import { loadChapter, type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { ALWAYS_NEEDED, groupOfItem, IDEA_KIND, ideaOf, LADDER } from '../../src/data/grammar/ladder';
import { passageNeeds } from '../../src/data/grammar/needs';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { setGoal } from '../../src/data/repositories/settings';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { drawCheck } from '../../src/review/lessonCheck';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, QUIZ_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';

/** The seed the Check draws its questions from (src/data/grammar/drillSeed.ts), so a step knows them. */
const CHECK_SEED = 1;
const KEY = 'passage:1jn.1.1-4';
const PHONE_KEY = '00'.repeat(31) + '02';
const realSeed = drillSeed.next;
let fake: FakePostern;

afterAll(async () => {
  cleanup();
  await usageWritesSettled();
  stopReading();
  clearBus();
  drillSeed.next = realSeed;
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const chapterFile = (book: string, n: number) => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** Every store empty but what the goal and his levels need: the ideas 1 John needs are solid but `frontier`; a licence and a fake Postern behind the tutor. */
async function freshStore(goal: string, frontier: string): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  localStorage.clear();
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  drillSeed.next = () => CHECK_SEED;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: QUIZ_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.passageLessons.clear(), db.talks.clear(), db.answers.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await setGoal(goal);
  await setReaderView('english');
  await setWeave('off');
  const needs = await passageNeeds({ book: '1jn' }, async (_, n) => chapterFile('1jn', n), BOOK_INDEX);
  // the letters, pairs and breathings are solid too: a right answer in a Check credits some of them, and a group part solid would make Learn next name the rest
  const ids = [...new Set([...ALWAYS_NEEDED, ...needs.ideas.map((i) => i.id), ...LADDER.filter((i) => groupOfItem(i)).map((i) => i.id)])];
  await db.grammarLevels.bulkPut(ids.map((id) => ({ id, level: id === frontier ? ('frontier' as const) : ('solid' as const), since: Date.now(), how: 'marked' as const })));
}

async function openAt(hash: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.history.replaceState(null, '', `/${hash}`);
  await seedHisWords();
  render(<App />);
}

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const checkSheet = () => screen.getByRole('dialog', { name: 'Check' });
const optionIn = async (dialog: HTMLElement, text: string): Promise<HTMLElement> => {
  let found: HTMLElement | undefined;
  await waitFor(() => {
    found = Array.from(dialog.querySelectorAll<HTMLElement>('[data-option]')).find((o) => o.textContent === text && !(o as HTMLButtonElement).disabled);
    expect(found, `option ${text}`).toBeDefined();
  });
  return found as HTMLElement;
};

/** The questions the sheet will ask, worked out as it works them out: before the first answer moves a level. */
let expected: GrammarQuestion[] = [];
let asked = 0;
const expectedCheck = async (): Promise<GrammarQuestion[]> => drawCheck(await loadChapter('1jn', 1), 1, 4, JOHN_LESSONS[0].ideas, mulberry32(CHECK_SEED));

/** Answers the question on screen right, or wrong (a wrong choice, or a wrong first step of a parsing), and moves on. */
async function answer(right: boolean): Promise<void> {
  const question = expected[asked];
  const dialog = checkSheet();
  if (question.kind === 'parse') {
    const steps = question.steps!;
    if (right) for (const step of steps) await user.click(await optionIn(dialog, step.right));
    else await user.click(await optionIn(dialog, steps[0].options.find((o) => o !== steps[0].right) as string));
  } else {
    await user.click(await optionIn(dialog, right ? question.right : (question.options.find((o) => o !== question.right) as string)));
  }
  asked += 1;
  await user.click(await within(dialog).findByTestId('check-next'));
}

const feature = await loadFeature('features/passage-lesson.feature');

describeFeature(feature, ({ Scenario }) => {
  const GIVEN_GOAL = 'the goal is {string} and every idea it needs is solid but {string}, which is frontier';
  const givenGoal = async (_: unknown, goal: string, frontier: string) => freshStore(goal, frontier);
  const opensGoal = async () => openAt('#/goal');
  const learnNextSays = async (_: unknown, text: string) => {
    await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
  };
  const headed = async (_: unknown, heading: string) => {
    await screen.findByRole('region', { name: 'Verse view' });
    expect(within(viewEl()).getByRole('heading', { name: heading, level: 2 })).toBeInTheDocument();
  };
  const opensView = async () => {
    await openAt('#/?b=1jn&c=1&p=1&pt=4');
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const taps = async (_: unknown, name: string) => {
    await user.click(await within(await screen.findByRole('region', { name: 'Verse view' })).findByRole('button', { name, exact: true }));
  };
  const endCardSays = async (_: unknown, text: string) => {
    expect(await within(checkSheet()).findByRole('heading', { name: text })).toBeInTheDocument();
  };
  // the sheet swallows taps for a moment as it opens and as the card changes (src/ui/settle.ts)
  const tapsOnCard = async (_: unknown, name: string) => {
    await sleep(350);
    await user.click(within(checkSheet()).getByRole('button', { name, exact: true }));
  };
  const openSheet = async () => {
    expected = await expectedCheck();
    asked = 0;
    await screen.findByRole('dialog', { name: 'Check' });
  };

  Scenario('A lesson opens its passage', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, givenGoal);
    When('he opens the Goal screen', opensGoal);
    Then('Learn next says {string}', learnNextSays);
    When('he taps Learn next', async () => {
      await user.click(await screen.findByTestId('learn-next'));
    });
    Then('the Verse view is open, headed {string}', headed);
    And('the Verse view shows verses 1 to 4 of 1 John 1 and no other', () => {
      expect(Array.from(viewEl().querySelectorAll('[data-passage-verse]')).map((el) => el.getAttribute('data-passage-verse'))).toEqual(['1', '2', '3', '4']);
    });
    And("the Lesson strip names the lesson's ideas as chips and offers {string}", (_, name: string) => {
      const strip = within(viewEl()).getByRole('region', { name: 'Lesson strip' });
      expect(strip).toHaveTextContent(JOHN_LESSONS[0].title);
      const chips = Array.from(strip.querySelectorAll<HTMLElement>('[data-idea]'));
      expect(chips.map((c) => c.getAttribute('data-idea'))).toEqual(JOHN_LESSONS[0].ideas);
      expect(chips.map((c) => c.textContent)).toEqual(JOHN_LESSONS[0].ideas.map((id) => ideaOf(id).title));
      expect(within(strip).getByRole('button', { name })).toBeInTheDocument();
      expect(strip).toHaveTextContent('Read it, then Check');
    });
    And('no lesson is marked read or passed', async () => {
      expect(await db.passageLessons.count()).toBe(0);
    });
    When("he presses the phone's Back", async () => {
      act(() => window.history.back());
      await sleep(30);
    });
    Then('the Goal screen is open', async () => {
      expect(await screen.findByTestId('goal-title')).toBeInTheDocument();
    });
  });

  Scenario('Check passes the lesson by reading', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    And('the Verse view is open on the lesson {string}', opensView);
    When('he taps {string} in the Lesson strip', taps);
    Then('the sheet {string} asks 8 questions on verses 1 to 4, a meaning and a parsing of each', async (_, title: string) => {
      await openSheet();
      expect(await within(checkSheet()).findByTestId('check-title')).toHaveTextContent(title);
      expect(await within(checkSheet()).findByTestId('check-step')).toHaveTextContent('Question 1 of 8');
      expect(expected).toHaveLength(8);
      for (const verse of [1, 2, 3, 4]) {
        expect(expected.filter((q) => q.ref === `1 John 1:${verse}`).map((q) => q.kind).sort()).toEqual(['meaning', 'parse']);
      }
    });
    When('he answers 7 of them right and the last wrong', async () => {
      for (let i = 0; i < 7; i += 1) await answer(true);
      await answer(false);
    });
    Then('the end card says {string}', endCardSays);
    And('the lesson {string} is passed in the table with the score 7 of 8', async () => {
      await waitFor(async () => expect(await db.passageLessons.get(KEY)).toMatchObject({ state: 'passed', score: 7 / 8 }));
    });
    And('each idea asked has a review recorded', async () => {
      const ideas = [...new Set(expected.map((q) => q.ideaId))];
      expect(ideas.length).toBeGreaterThan(0);
      for (const id of ideas) expect(await db.reviews.get([IDEA_KIND, id]), id).toBeDefined();
    });
    When('he opens the Goal screen', opensGoal);
    Then('Learn next says {string}', learnNextSays);
  });

  Scenario('A miss keeps it read', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    And('the Verse view is open on the lesson {string} with a quiz behind a fake Postern', opensView);
    When('he taps {string} in the Lesson strip', taps);
    And('he answers {int} of {int} questions right', async (_, right: number, total: number) => {
      await openSheet();
      expect(expected).toHaveLength(total);
      for (let i = 0; i < total; i += 1) await answer(i < right);
    });
    Then('the end card says {string}', endCardSays);
    And('the end card names the ideas he missed', () => {
      const missed = [...new Set(expected.slice(4).map((q) => ideaOf(q.ideaId).title.replace(/^The /, 'the ')))];
      expect(missed.length).toBeGreaterThan(0);
      expect(squash(within(checkSheet()).getByTestId('check-result').textContent)).toContain(`Weak: ${missed.join(', ')}`);
    });
    And('the lesson {string} is read in the table', async () => {
      await waitFor(async () => expect(await db.passageLessons.get(KEY)).toMatchObject({ state: 'read', score: null }));
    });
    When('he taps {string} on the end card', tapsOnCard);
    Then('a lesson row is on the schedule, due in 1 day', async () => {
      await waitFor(async () => expect(await db.reviews.get(['lesson', KEY])).toBeDefined());
      const row = (await db.reviews.get(['lesson', KEY]))!;
      expect(Math.abs(row.due - (Date.now() + DAY))).toBeLessThan(5000);
    });
    When('he chooses {string} on the end card', tapsOnCard);
    Then('the mill received one grist for the lampas app, kind bible-talk, in quiz mode about {string}', async (_, reference: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
      expect(fake.received[0].input.mode).toBe('quiz');
      expect(fake.received[0].input.reference).toBe(reference);
      // the answer is shown and its usage kept before the scenario goes on, so nothing writes after the store closes
      await waitFor(() => expect(screen.getByRole('dialog', { name: `Quiz on ${reference}` }).querySelectorAll('[data-turn]')).toHaveLength(1));
      await sleep(100);
    });
    When('a day passes and he opens Review', async () => {
      const row = (await db.reviews.get(['lesson', KEY]))!;
      await db.reviews.put({ ...row, due: row.due - DAY });
      await openAt('#/review');
    });
    Then('Review says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('due-today')).toHaveTextContent(text));
    });
    When('he taps the due lesson {string}', async (_, label: string) => {
      await user.click(await within(await screen.findByTestId('due-lessons')).findByRole('button', { name: new RegExp(label) }));
    });
    Then('the Verse view is open, headed {string}', headed);
  });
});
