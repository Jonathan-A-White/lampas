// features/steps/drill-it.steps.tsx — runs features/drill-it.feature: the level slider on the idea sheet, Drill it (src/DrillItScreen.tsx) and what a run does to the
// idea's level, and the line that says an idea builds on one that is not solid yet.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { loadChapter, type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { drillSteps, type DrillQuestion } from '../../src/data/grammar/drillIt';
import { PLAN_KIND, PROVE_ID, rowId } from '../../src/data/grammar/drillPlan';
import { getDrillPlan } from '../../src/data/repositories';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import { DAY, STEP_DAYS } from '../../src/data/schedule';
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { clearBus, subscribe, type EventOf } from '../../src/events/bus';
import { expectPublished } from '../../tests/support/published';
import { mulberry32 } from '../../src/data/quiz';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GRAMMAR_TERM_ANSWER, makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const SEED = 7;
/** The Laptop's wall clock steps back by about a second now and then: a bound on a stored time allows for it. */
const CLOCK_SLACK = 3000;
const STOPS = ['Not yet', 'Learning', 'I know it'];

let fake: FakePostern;
let taught: EventOf<'idea-taught'>[] = [];
let startedAt = 0;
let passage: Chapter[] = [];
/** The facet of the first question he answered wrong in a run, and the step of the last one. */
let firstMissed: string | undefined;
let missedStep = 0;

type Start = 'solid' | 'frontier' | 'notYet' | 'none';

const idOfTitle = (title: string): string => {
  const found = LADDER.find((i) => i.title === title);
  if (!found) throw new Error(`no idea titled ${title}`);
  return found.id;
};

/** What The noun builds on beside Accents and stress (mw-5r3p30.234). */
const OTHER_FOUNDATIONS = ['Breathing marks', 'The iota under a letter'];

/** Opens the app on Romans 8 with every store emptied, `goal` saved, and the levels `levels` (title -> where it stands) put in place. */
async function open(goal: string, levels: Record<string, Start>): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  taught = [];
  firstMissed = undefined;
  randomSpy?.mockRestore();
  randomSpy = undefined;
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  drillSeed.next = () => SEED;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_TERM_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([
    db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.grammarKnown.clear(),
    db.grammarLevels.clear(), db.reviews.clear(), db.drillRuns.clear(),
  ]);
  await db.settings.put({ key: 'goal', value: goal });
  const now = Date.now();
  // the noun's other foundations, solid in every scenario: the one a scenario names, Accents and stress, decides (features/drill-it.feature)
  for (const title of OTHER_FOUNDATIONS) await db.grammarLevels.put({ id: idOfTitle(title), level: 'solid', since: now, how: 'placement' });
  for (const [title, start] of Object.entries(levels)) {
    if (start !== 'none') await db.grammarLevels.put({ id: idOfTitle(title), level: start, since: now, how: 'placement' });
  }
  passage = [await loadChapter('1jn', 1)];
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  subscribe('idea-taught', (event) => taught.push(event));
  startedAt = Date.now();
}

const ideaSheet = () => screen.getByRole('dialog', { name: 'Idea' });
const drillDialog = () => screen.getByRole('dialog', { name: 'Drill it' });
const slider = () => within(ideaSheet()).getByRole('slider', { name: 'Your level' });

/** From the Goal screen's ideas list: opens the sheet of the idea `id`. */
async function opensIdeaFromGoal(id: string): Promise<void> {
  window.location.hash = '#/goal';
  await user.click(await screen.findByTestId('ideas-bar'));
  await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: ideaOf(id).title }));
  await screen.findByRole('dialog', { name: 'Idea' });
  await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
}

const slideTo = (label: string) => {
  fireEvent.change(slider(), { target: { value: String(STOPS.indexOf(label)) } });
};

/** The question on screen in `dialog`, found among the steps the seed gives. */
function questionOnScreen(ideaId: string, dialog: HTMLElement = drillDialog(), seeds: number | number[] = SEED): DrillQuestion {
  const prompt = within(dialog).getByTestId('grammar-prompt').textContent ?? '';
  const form = within(dialog).queryByTestId('grammar-form')?.textContent ?? '';
  const options = Array.from(dialog.querySelectorAll('[data-option]')).map((o) => o.textContent ?? '');
  let found: DrillQuestion | undefined;
  for (const seed of [seeds].flat()) {
    found = drillSteps(ideaId, { passage, seed })
      .flatMap((s) => s.questions)
      .find((q) => q.prompt === prompt && (q.form ?? '') === form && q.options.join('|') === options.join('|'));
    if (found) {
      matchedSeed = seed;
      break;
    }
  }
  if (!found) throw new Error(`question not among the steps: ${prompt} / ${form} / ${options.join(', ')}`);
  return found;
}

const stepNow = (): number => {
  const text = within(drillDialog()).getByTestId('drill-step').textContent ?? '';
  const match = /Step (\d+) of (\d+)/.exec(text);
  if (!match) throw new Error(`no step in ${text}`);
  return Number(match[1]);
};

async function answer(ideaId: string, right: boolean): Promise<void> {
  const q = questionOnScreen(ideaId);
  const pick = right ? q.right : (q.options.find((o) => o !== q.right) as string);
  if (!right && firstMissed === undefined) firstMissed = q.facet.label;
  const button = Array.from(drillDialog().querySelectorAll<HTMLButtonElement>('[data-option]')).find((b) => b.textContent === pick && !b.disabled);
  if (!button) throw new Error(`no answer ${pick} to tap`);
  await user.click(button);
}
const next = async () => user.click(await within(drillDialog()).findByTestId('drill-next'));

/** Answers until Drill it ends; `right` says whether the question at that place (from 0) is answered right. */
async function answerUntilEnd(ideaId: string, right: boolean | ((index: number) => boolean)): Promise<void> {
  for (let guard = 0; guard < 40; guard += 1) {
    if (within(drillDialog()).queryByTestId('drill-result')) return;
    await answer(ideaId, typeof right === 'function' ? right(guard) : right);
    await next();
  }
  throw new Error('Drill it did not end');
}

// ---- Your drill plan ----
/** While a Review round is drawn Math.random is a seeded one that records what it gave: a plan step's questions are drawn from a seed taken from it, so they are found among the steps of those. */
let randomSpy: { mockRestore: () => void } | undefined;
let randomSeen: number[] = [];
const reviewSeeds = (): number[] => randomSeen.slice(0, 6).map((v) => Math.floor(v * 0x100000000));
let matchedSeed = SEED;
const shortDialog = () => screen.getByRole('dialog', { name: 'Short drill' });

/** Answers the short drill on screen until its result shows: every question right or every one wrong. `seeds` are the ones its questions may have been drawn from. */
async function answerShortDrill(right: boolean, seeds: number | number[]): Promise<void> {
  for (let guard = 0; guard < 10; guard += 1) {
    const dialog = shortDialog();
    if (within(dialog).queryByTestId('plan-drill-result')) return;
    const q = questionOnScreen('noun', dialog, guard === 0 ? seeds : matchedSeed);
    const pick = right ? q.right : (q.options.find((o) => o !== q.right) as string);
    const button = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-option]')).find((b) => b.textContent === pick && !b.disabled);
    if (!button) throw new Error(`no answer ${pick} to tap`);
    await user.click(button);
    await user.click(await within(dialog).findByTestId('plan-drill-next'));
  }
  throw new Error('the short drill did not end');
}
const tapsShortDone = async () => {
  await user.click(within(shortDialog()).getByTestId('plan-drill-done'));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Short drill' })).toBeNull());
};

/** The Goal screen's lines about drill plans (it is opened if another screen is up). */
async function goalPlanLine(): Promise<string> {
  if (!document.querySelector('[data-testid=goal-title]')) window.location.hash = '#/goal';
  await screen.findByTestId('goal-title');
  return document.querySelector('[data-testid=drill-plan-line]')?.textContent ?? '';
}

/** Moves every drill plan step on the schedule to now: a day has passed. */
async function aDayPasses(): Promise<void> {
  const rows = await db.reviews.where('kind').equals(PLAN_KIND).toArray();
  await db.reviews.bulkPut(rows.map((r) => ({ ...r, due: Date.now() - 1000 })));
}

const toGoNow = (plan: { items: { done: boolean }[] } | undefined): number => plan?.items.filter((i) => !i.done).length ?? -1;

const review = async (id: string) => {
  const row = await db.reviews.get(['grammar', id]);
  if (!row) throw new Error(`no review row for ${id}`);
  return row;
};
const lastRun = async () => {
  const runs = await db.drillRuns.toArray();
  if (runs.length === 0) throw new Error('no drill run is kept');
  return runs[runs.length - 1];
};

const feature = await loadFeature('features/drill-it.feature');

describeFeature(feature, ({ Scenario }) => {
  const GOAL = 'Lampas is opened on Romans 8 with the goal {string}, ';
  const FAKE = ' and a fake Postern';
  const levels = (a: [string, Start], b: [string, Start]) => Object.fromEntries([a, b]);
  /** The Given of each way the feature words the starting levels. */
  const givens = {
    solidFrontier: [GOAL + '{string} solid, {string} at the frontier' + FAKE, (_: unknown, g: string, a: string, b: string) => open(g, levels([a, 'solid'], [b, 'frontier']))],
    solidNone: [GOAL + '{string} solid, no level for {string}' + FAKE, (_: unknown, g: string, a: string, b: string) => open(g, levels([a, 'solid'], [b, 'none']))],
    solidSolid: [GOAL + '{string} solid, {string} solid' + FAKE, (_: unknown, g: string, a: string, b: string) => open(g, levels([a, 'solid'], [b, 'solid']))],
    frontierFrontier: [GOAL + '{string} at the frontier, {string} at the frontier' + FAKE, (_: unknown, g: string, a: string, b: string) => open(g, levels([a, 'frontier'], [b, 'frontier']))],
    notYetFrontier: [GOAL + '{string} not yet, {string} at the frontier' + FAKE, (_: unknown, g: string, a: string, b: string) => open(g, levels([a, 'notYet'], [b, 'frontier']))],
    frontierNone: [GOAL + '{string} at the frontier, no level for {string}' + FAKE, (_: unknown, g: string, a: string, b: string) => open(g, levels([a, 'frontier'], [b, 'none']))],
  } as const;

  const opensIdea = (_: unknown, id: string) => opensIdeaFromGoal(id);
  const OPENS = 'he opens the idea sheet of {string} from the Goal screen';
  const SLIDES = 'he slides to {string}';
  const slides = async (_: unknown, label: string) => slideTo(label);
  const restsOn = async (_: unknown, label: string) => {
    await waitFor(() => expect(slider()).toHaveAttribute('aria-valuetext', label));
  };
  const CHIP = 'the idea sheet shows the chip {string}';
  const chip = async (_: unknown, text: string) => {
    await waitFor(() => expect(within(ideaSheet()).getByTestId('idea-level')).toHaveTextContent(text));
  };
  const FROZEN = 'the idea {string} is frontier, set by the sheet, and its review is due in 1 day at step 0';
  const frontierDueTomorrow = async (_: unknown, id: string) => {
    await waitFor(async () => expect(await db.grammarLevels.get(id)).toBeDefined());
    await waitFor(async () => expect(await db.grammarLevels.get(id)).toMatchObject({ level: 'frontier', how: 'sheet' }));
    const row = await review(id);
    expect(row.step).toBe(0);
    expect(row.due).toBeGreaterThanOrEqual(startedAt + DAY - CLOCK_SLACK);
    expect(row.due).toBeLessThanOrEqual(Date.now() + DAY + CLOCK_SLACK);
  };
  const TAPS = 'he taps {string}';
  const taps = async (_: unknown, name: string) => {
    await user.click(await screen.findByRole('button', { name, exact: true }));
  };
  const DONE = 'he taps Done on Drill it';
  const done = async () => {
    await user.click(within(drillDialog()).getByRole('button', { name: 'Done', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Drill it' })).toBeNull());
  };
  const GONE = 'Drill it is gone';
  const gone = () => expect(screen.queryByRole('dialog', { name: 'Drill it' })).toBeNull();
  const NO_RUN = 'no drill run is kept';
  const noRun = async () => expect(await db.drillRuns.count()).toBe(0);
  const SECOND = 'a second idea sheet titled {string} opens over the first';
  const second = async (_: unknown, title: string) => {
    await waitFor(() => expect(screen.getAllByRole('dialog', { name: 'Idea' })).toHaveLength(2));
    expect(within(screen.getAllByRole('dialog', { name: 'Idea' })[1]).getByRole('heading', { name: title })).toBeInTheDocument();
  };
  const OPENED = 'Drill it opens on {string} and says {string}';
  const drillOpened = async (_: unknown, title: string, says: string) => {
    const dialog = await screen.findByRole('dialog', { name: 'Drill it' });
    expect(within(dialog).getByRole('heading', { name: title })).toBeInTheDocument();
    expect(within(dialog).getByTestId('drill-step')).toHaveTextContent(says);
  };
  const ALL_RIGHT = 'he answers every question right until Drill it ends';
  const ALL_WRONG = 'he answers every question wrong until Drill it ends';

  Scenario('The sheet for The noun has a slider with three stops, resting on its level, and no Got it or I know this button', ({ Given, When, Then, And }) => {
    Given(...givens.solidFrontier);
    When(OPENS, opensIdea);
    Then('the idea sheet has a slider {string} with the stops {string}, {string} and {string}', (_, name: string, a: string, b: string, c: string) => {
      expect(within(ideaSheet()).getByRole('slider', { name })).toBeInTheDocument();
      const stops = within(ideaSheet()).getByTestId('level-stops');
      expect(Array.from(stops.children).map((s) => s.textContent)).toEqual([a, b, c]);
    });
    And('the slider rests on {string}', restsOn);
    And('the idea sheet has no button {string} and no button {string}', (_, a: string, b: string) => {
      expect(within(ideaSheet()).queryByRole('button', { name: a, exact: true })).toBeNull();
      expect(within(ideaSheet()).queryByRole('button', { name: b, exact: true })).toBeNull();
    });
  });

  Scenario('The slider rests on Not yet for an idea with no level', ({ Given, When, Then }) => {
    Given(...givens.solidNone);
    When(OPENS, opensIdea);
    Then('the slider rests on {string}', restsOn);
  });

  Scenario('The slider moves with the arrow keys', ({ Given, And, When, Then }) => {
    Given(...givens.solidNone);
    And(OPENS, opensIdea);
    When('he presses the right arrow on the slider', async () => {
      slider().focus();
      await user.keyboard('{ArrowRight}');
    });
    Then('the slider rests on {string}', restsOn);
    And(FROZEN, frontierDueTomorrow);
    When('he presses the left arrow on the slider', async () => {
      slider().focus();
      await user.keyboard('{ArrowLeft}');
    });
    Then('the slider now rests on {string}', restsOn);
    And('the idea {string} is not yet and has no review', async (_, id: string) => {
      await waitFor(async () => expect(await db.grammarLevels.get(id)).toMatchObject({ level: 'notYet' }));
      expect(await db.reviews.get(['grammar', id])).toBeUndefined();
    });
  });

  Scenario('Sliding to Learning makes the idea frontier with a review due tomorrow', ({ Given, And, When, Then }) => {
    Given(...givens.solidNone);
    And(OPENS, opensIdea);
    When(SLIDES, slides);
    Then(FROZEN, frontierDueTomorrow);
    And('the slider rests on {string}', restsOn);
    And(CHIP, chip);
  });

  Scenario('Sliding to I know it starts Drill it at step 1', ({ Given, And, When, Then }) => {
    Given(...givens.solidFrontier);
    And(OPENS, opensIdea);
    When(SLIDES, slides);
    Then(OPENED, drillOpened);
    And('it shows a question with its answers, a Hint and Stop', () => {
      const dialog = drillDialog();
      expect(within(dialog).getByTestId('grammar-prompt')).toBeInTheDocument();
      expect(dialog.querySelectorAll('[data-option]').length).toBeGreaterThanOrEqual(2);
      expect(within(dialog).getByRole('button', { name: 'Hint', exact: true })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Stop', exact: true })).toBeInTheDocument();
    });
  });

  Scenario('Answering every question right proves the idea, and the slider stays on I know it', ({ Given, And, When, Then }) => {
    Given(...givens.solidFrontier);
    And(OPENS, opensIdea);
    When(SLIDES, slides);
    And(ALL_RIGHT, () => answerUntilEnd('noun', true));
    Then('Drill it says {string}', (_, text: string) => {
      expect(within(drillDialog()).getByTestId('drill-result')).toHaveTextContent(text);
    });
    When(DONE, done);
    Then('the slider rests on {string}', restsOn);
    And(CHIP, chip);
    And('the idea {string} is solid, proved by drill, and its run is kept as proved', async (_, id: string) => {
      await waitFor(async () => expect(await db.grammarLevels.get(id)).toMatchObject({ level: 'solid', how: 'drill' }));
      await waitFor(async () => expect(await db.drillRuns.count()).toBe(1));
      expect(await lastRun()).toMatchObject({ ideaId: id, proved: true });
      expect((await review(id)).step).toBe(STEP_DAYS.indexOf(30));
    });
    And('an idea-taught event for {string} with the outcome {string} was published', async (_, id: string, outcome: string) => {
      await expectPublished(() => taught, [{ kind: 'idea-taught', id, outcome }]);
    });
  });

  Scenario("Omicron's sound step shows four short choices of one shape", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with the goal {string} and a fake Postern', (_, goal: string) => open(goal, {}));
    When('he opens the letter sheet of {string} from the alphabet sheet', async (_, name: string) => {
      await opensIdeaFromGoal('alphabet');
      const tile = within(ideaSheet()).getAllByTestId('teach-tile').find((t) => t.getAttribute('data-name') === name);
      if (!tile) throw new Error(`no tile ${name} on the alphabet sheet`);
      await user.click(within(tile).getByRole('button', { name: `About ${name}` }));
      await waitFor(() => expect(screen.getAllByRole('dialog', { name: 'Idea' })).toHaveLength(2));
    });
    And('he taps Drill it on the letter sheet', async () => {
      const letterSheet = screen.getAllByRole('dialog', { name: 'Idea' })[1];
      await user.click(await within(letterSheet).findByRole('button', { name: 'Drill it', exact: true }));
      await screen.findByRole('dialog', { name: 'Drill it' });
    });
    And('he answers right until step {int} of Drill it', async (_, step: number) => {
      for (let guard = 0; guard < 20 && stepNow() < step; guard += 1) {
        await answer('letter-omicron', true);
        await next();
      }
      expect(stepNow()).toBe(step);
    });
    Then('step {int} asks {string} with four short choices, one of them {string}', (_, step: number, prompt: string, right: string) => {
      expect(stepNow()).toBe(step);
      expect(within(drillDialog()).getByTestId('grammar-prompt')).toHaveTextContent(prompt);
      const options = Array.from(drillDialog().querySelectorAll('[data-option]')).map((o) => o.textContent ?? '');
      expect(options).toHaveLength(4);
      expect(options).toContain(right);
      for (const option of options) {
        expect(option, option).toMatch(/^\S+, /);
        expect(option, option).not.toMatch(/\(| before | after /);
        expect(option.length, option).toBeLessThanOrEqual(32);
      }
    });
  });

  Scenario('A miss takes the next question to an easier step', ({ Given, And, When, Then }) => {
    Given(...givens.solidFrontier);
    And(OPENS, opensIdea);
    And(SLIDES, slides);
    When('he answers the first question right and the second one wrong', async () => {
      await answer('noun', true);
      await next();
      missedStep = stepNow();
      expect(missedStep).toBeGreaterThan(1);
      await answer('noun', false);
      await next();
    });
    Then('the next question is at a step lower than the one he missed', () => {
      expect(stepNow()).toBeLessThan(missedStep);
    });
  });

  Scenario('A failed run shows what was weak, and the slider goes back to Learning', ({ Given, And, When, Then }) => {
    Given(...givens.solidNone);
    And(OPENS, opensIdea);
    When(SLIDES, slides);
    And(ALL_WRONG, () => answerUntilEnd('noun', false));
    Then('Drill it says {string}', (_, text: string) => {
      expect(within(drillDialog()).getByTestId('drill-result')).toHaveTextContent(text);
    });
    And('Drill it lists {string} with the facet of the first question he missed', (_, heading: string) => {
      const weak = within(drillDialog()).getByTestId('drill-weak');
      expect(weak).toHaveTextContent(heading);
      expect(firstMissed).toBeDefined();
      expect(weak).toHaveTextContent(firstMissed as string);
    });
    When(DONE, done);
    Then('the slider rests on {string}', restsOn);
    And('the idea {string} is frontier, set by a drill, and its run is kept as not proved', async (_, id: string) => {
      await waitFor(async () => expect(await db.grammarLevels.get(id)).toMatchObject({ level: 'frontier', how: 'drill' }));
      await waitFor(async () => expect(await db.drillRuns.count()).toBe(1));
      expect(await lastRun()).toMatchObject({ ideaId: id, proved: false });
    });
  });

  Scenario('Stop leaves the idea where it was and keeps no run', ({ Given, And, When, Then }) => {
    Given(...givens.solidFrontier);
    And(OPENS, opensIdea);
    And(SLIDES, slides);
    When('he taps Stop on Drill it', async () => {
      await user.click(within(drillDialog()).getByRole('button', { name: 'Stop', exact: true }));
    });
    Then(GONE, async () => {
      await waitFor(gone);
    });
    And('the slider rests on {string}', restsOn);
    And(NO_RUN, noRun);
  });

  Scenario('A Hint marks the answer hinted, strikes the wrong answers it takes away and says so', ({ Given, And, When, Then }) => {
    Given(...givens.solidFrontier);
    And(OPENS, opensIdea);
    And('he taps Drill it on the idea sheet', async () => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'Drill it', exact: true }));
      await screen.findByRole('dialog', { name: 'Drill it' });
    });
    When('he taps Hint, sees the answers struck through and the line, and answers the question right', async () => {
      await user.click(within(drillDialog()).getByRole('button', { name: 'Hint', exact: true }));
      const q = questionOnScreen('noun');
      const taken = drillDialog().querySelectorAll('[data-option][data-taken]');
      expect(taken.length).toBeGreaterThan(0);
      for (const option of Array.from(taken)) expect(option.className).toContain('line-through');
      expect(within(drillDialog()).getByTestId('hint-line')).toHaveTextContent(`Hint: ${taken.length} wrong ${taken.length === 1 ? 'answer' : 'answers'} taken away`);
      expect(within(drillDialog()).getByRole('button', { name: 'Hint used', exact: true })).toBeDisabled();
      await answer('noun', true);
      expect(q.right).toBeTruthy();
      await next();
    });
    And(ALL_RIGHT, () => answerUntilEnd('noun', true));
    Then("the kept run's first answer is marked hinted", async () => {
      await waitFor(async () => expect(await db.drillRuns.count()).toBe(1));
      expect((await lastRun()).answers[0]).toMatchObject({ right: true, hinted: true });
    });
  });

  Scenario('Mark known without a drill makes it solid with no drill', ({ Given, And, When, Then }) => {
    Given(...givens.solidNone);
    And(OPENS, opensIdea);
    When(TAPS, taps);
    Then(GONE, gone);
    And('the idea {string} is solid, set by the sheet, and its review is due in 30 days at the 30-day step', async (_, id: string) => {
      await waitFor(async () => expect(await db.grammarLevels.get(id)).toMatchObject({ level: 'solid', how: 'sheet' }));
      const row = await review(id);
      expect(row.step).toBe(STEP_DAYS.indexOf(30));
      expect(row.due).toBeGreaterThanOrEqual(startedAt + 30 * DAY - CLOCK_SLACK);
      expect(row.due).toBeLessThanOrEqual(Date.now() + 30 * DAY + CLOCK_SLACK);
    });
    And('the slider rests on {string}', restsOn);
    And(CHIP, chip);
    And(NO_RUN, noRun);
  });

  Scenario('The Drill it button opens Drill it, and a run that is not a proof leaves a solid idea solid', ({ Given, And, When, Then }) => {
    Given(...givens.solidSolid);
    And(OPENS, opensIdea);
    When('he taps Drill it on the idea sheet', async () => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'Drill it', exact: true }));
    });
    Then(OPENED, drillOpened);
    When(ALL_WRONG, () => answerUntilEnd('noun', false));
    And(DONE, done);
    Then('the slider rests on {string}', restsOn);
    And('the idea {string} is solid, set by the sheet, and its run is kept as not proved', async (_, id: string) => {
      await waitFor(async () => expect(await db.drillRuns.count()).toBe(1));
      expect(await db.grammarLevels.get(id)).toMatchObject({ level: 'solid', how: 'placement' });
      expect(await lastRun()).toMatchObject({ ideaId: id, proved: false });
    });
  });

  Scenario('With Accents and stress at the frontier, The noun says it builds on it and the button goes there', ({ Given, When, Then }) => {
    Given(...givens.frontierFrontier);
    When(OPENS, opensIdea);
    Then('the idea sheet says {string}', (_, text: string) => {
      expect(ideaSheet()).toHaveTextContent(text);
    });
    When(TAPS, taps);
    Then(SECOND, second);
  });

  Scenario('With Accents and stress not yet, The noun says it builds on it', ({ Given, When, Then }) => {
    Given(...givens.notYetFrontier);
    When(OPENS, opensIdea);
    Then('the idea sheet says {string}', (_, text: string) => {
      expect(ideaSheet()).toHaveTextContent(text);
    });
  });

  Scenario('With Accents and stress solid, The noun does not say it builds on anything', ({ Given, When, Then }) => {
    Given(...givens.solidFrontier);
    When(OPENS, opensIdea);
    Then('the idea sheet does not say {string}', (_, text: string) => {
      expect(ideaSheet().textContent).not.toContain(text);
    });
  });

  Scenario('Sliding up with a foundation that is not solid asks whether to go there first, and Stay here goes on', ({ Given, And, When, Then }) => {
    Given(...givens.frontierNone);
    And(OPENS, opensIdea);
    When(SLIDES, slides);
    Then('he is asked {string}', async (_, question: string) => {
      expect(await screen.findByText(question)).toBeInTheDocument();
    });
    When(TAPS, taps);
    Then('he is then asked {string}', async (_, question: string) => {
      expect(await screen.findByText(question)).toBeInTheDocument();
    });
    And('he taps the button {string}', taps);
    Then(FROZEN, frontierDueTomorrow);
  });

  Scenario('Go there opens the foundation and leaves the level as it was', ({ Given, And, When, Then }) => {
    Given(...givens.frontierNone);
    And(OPENS, opensIdea);
    When(SLIDES, slides);
    And(TAPS, taps);
    Then(SECOND, second);
    And(GONE, gone);
    And('the idea {string} has no level', async (_, id: string) => {
      expect(await db.grammarLevels.get(id)).toBeUndefined();
    });
  });
  // ---- Your drill plan ----
  const FIRST_RIGHT_REST_WRONG = 'he answers the first question right and every other one wrong until Drill it ends';
  const firstRightRestWrong = () => answerUntilEnd('noun', (index) => index === 0);
  const GOAL_SAYS = 'the Goal screen says {string}';
  const goalSays = async (_: unknown, text: string) => {
    await waitFor(async () => expect(await goalPlanLine()).toBe(text));
  };
  const planRow = async (facet: string) => {
    const plan = await getDrillPlan('noun');
    const item = plan?.items.find((i) => i.facet?.label === facet || (facet === 'Prove it' && i.id === PROVE_ID));
    if (!item) throw new Error(`no plan step ${facet}`);
    return db.reviews.get([PLAN_KIND, rowId('noun', item.id)]);
  };
  const START_REVIEW = 'a day passes and he starts a Review round';
  const startsReview = async () => {
    await aDayPasses();
    randomSpy?.mockRestore();
    randomSeen = [];
    const random = mulberry32(12345);
    randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      const value = random();
      randomSeen.push(value);
      return value;
    });
    window.location.hash = '#/review';
    await user.click(await screen.findByRole('button', { name: 'Start', exact: true }));
  };
  const FIRST_CARD = "Review's first card is the plan step {string} of {string}";
  const firstCard = async (_: unknown, step: string, title: string) => {
    const card = await screen.findByTestId('drill-plan-card');
    randomSpy?.mockRestore();
    randomSpy = undefined;
    expect(within(card).getByTestId('drill-plan-step')).toHaveTextContent(step);
    expect(card).toHaveTextContent(title);
    expect(card.closest('main')?.querySelector('[data-testid=drill-plan-card]')).toBe(card);
  };

  Scenario('A failed run makes a drill plan, shown on the result and on the Goal screen', ({ Given, And, When, Then }) => {
    Given(...givens.solidNone);
    And(OPENS, opensIdea);
    When(SLIDES, slides);
    And(FIRST_RIGHT_REST_WRONG, firstRightRestWrong);
    Then('Drill it shows {string} with the steps {string}, {string} and {string}', async (_, heading: string, a: string, b: string, c: string) => {
      const plan = await within(drillDialog()).findByTestId('drill-plan');
      expect(within(plan).getByRole('heading', { name: heading })).toBeInTheDocument();
      expect(Array.from(plan.querySelectorAll('li')).map((li) => li.textContent)).toEqual([a, b, c]);
    });
    And('Drill it has a button {string}', async (_, name: string) => {
      expect(await within(drillDialog()).findByRole('button', { name, exact: true })).toBeInTheDocument();
    });
    And(GOAL_SAYS, goalSays);
    And('no request went to the tutor', () => {
      expect(fake.received).toHaveLength(0);
    });
  });

  Scenario('A short drill of the plan is done on the result, and the next one is due tomorrow', ({ Given, And, When, Then }) => {
    Given(...givens.solidNone);
    And(OPENS, opensIdea);
    And(SLIDES, slides);
    And(FIRST_RIGHT_REST_WRONG, firstRightRestWrong);
    When(TAPS, async (_: unknown, name: string) => {
      await user.click(await within(drillDialog()).findByRole('button', { name, exact: true }));
    });
    Then('a short drill opens on {string} about {string}', async (_, title: string, facet: string) => {
      const dialog = await screen.findByRole('dialog', { name: 'Short drill' });
      expect(within(dialog).getByRole('heading', { name: title })).toBeInTheDocument();
      expect(within(dialog).getByTestId('plan-drill-step')).toHaveTextContent(facet);
    });
    When('he answers every question of the short drill right and taps Done', async () => {
      await answerShortDrill(true, SEED);
      await tapsShortDone();
    });
    Then(GOAL_SAYS, goalSays);
    And('the plan\'s step {string} is due in 1 day', async (_, facet: string) => {
      const row = await planRow(facet);
      expect(row?.due).toBeGreaterThanOrEqual(startedAt + DAY - CLOCK_SLACK);
      expect(row?.due).toBeLessThanOrEqual(Date.now() + DAY + CLOCK_SLACK);
    });
    And('Drill it no longer has a button {string}', (_, name: string) => {
      expect(within(drillDialog()).queryByRole('button', { name, exact: true })).toBeNull();
    });
  });

  Scenario('A short drill answered with misses stays on the plan and comes back tomorrow', ({ Given, And, When, Then }) => {
    Given(...givens.solidNone);
    And(OPENS, opensIdea);
    And(SLIDES, slides);
    And(FIRST_RIGHT_REST_WRONG, firstRightRestWrong);
    When(TAPS, async (_: unknown, name: string) => {
      await user.click(await within(drillDialog()).findByRole('button', { name, exact: true }));
    });
    And('he answers every question of the short drill wrong and taps Done', async () => {
      await answerShortDrill(false, SEED);
      await tapsShortDone();
    });
    Then(GOAL_SAYS, goalSays);
    And('the plan\'s step {string} is due in 1 day', async (_, facet: string) => {
      await waitFor(async () => expect((await planRow(facet))?.lapses).toBe(1));
      const row = await planRow(facet);
      expect(row?.due).toBeGreaterThanOrEqual(startedAt + DAY - CLOCK_SLACK);
      expect(row?.due).toBeLessThanOrEqual(Date.now() + DAY + CLOCK_SLACK);
    });
  });

  Scenario("The plan's steps come up in Review, and a passed Prove it makes the noun solid and ends the plan", ({ Given, And, When, Then }) => {
    Given(...givens.solidNone);
    And(OPENS, opensIdea);
    And(SLIDES, slides);
    And(FIRST_RIGHT_REST_WRONG, firstRightRestWrong);
    And(TAPS, async (_: unknown, name: string) => {
      await user.click(await within(drillDialog()).findByRole('button', { name, exact: true }));
    });
    And('he answers every question of the short drill right and taps Done', async () => {
      await answerShortDrill(true, SEED);
      await tapsShortDone();
      await waitFor(async () => expect(toGoNow(await getDrillPlan('noun'))).toBe(2));
    });
    When(START_REVIEW, startsReview);
    Then(FIRST_CARD, firstCard);
    When('he starts the drill on the card and answers every question of the short drill right and taps Done', async () => {
      await user.click(screen.getByRole('button', { name: 'Start the drill', exact: true }));
      await screen.findByRole('dialog', { name: 'Short drill' });
      await answerShortDrill(true, reviewSeeds());
      await tapsShortDone();
      await waitFor(async () => expect(toGoNow(await getDrillPlan('noun'))).toBe(1));
    });
    Then(GOAL_SAYS, goalSays);
    When('another day passes and he starts a Review round', startsReview);
    Then("Review's first card is now the plan step {string} of {string}", firstCard);
    When('he starts the drill on the card and answers every question right until Drill it ends', async () => {
      await user.click(screen.getByRole('button', { name: 'Start Prove it', exact: true }));
      await screen.findByRole('dialog', { name: 'Drill it' });
      await answerUntilEnd('noun', true);
    });
    And(DONE, done);
    Then('the card says {string}', async (_, text: string) => {
      await waitFor(() => expect(within(screen.getByTestId('drill-plan-card')).getByTestId('feedback')).toHaveTextContent(text));
    });
    And('the idea {string} is solid, proved by drill, and its run is kept as proved', async (_, id: string) => {
      await waitFor(async () => expect(await db.grammarLevels.get(id)).toMatchObject({ level: 'solid', how: 'drill' }));
      expect((await lastRun()).proved).toBe(true);
    });
    And('no drill plan is kept for {string}', async (_, id: string) => {
      await waitFor(async () => expect(await getDrillPlan(id)).toBeUndefined());
      expect(await db.reviews.where('kind').equals(PLAN_KIND).count()).toBe(0);
    });
    And('the Goal screen has no line {string}', async (_, text: string) => {
      window.location.hash = '#/goal';
      await screen.findByTestId('goal-title');
      await waitFor(() => expect(document.body.textContent).not.toContain(text));
    });
  });
});
