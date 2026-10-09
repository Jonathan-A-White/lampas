// features/steps/placement.steps.tsx — runs features/placement.feature: the grammar placement (#/placement), its walk down and up the ideas of 1 John 1:1,
// what it writes, the end card, the pause and the reopen. A step finds the right answer by building the question the screen asked, from the kept state.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { approachOf, orderOf } from '../../src/approaches';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { questionFor } from '../../src/data/grammar/placementQuestion';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { readPlacement } from '../../src/data/placementKeep';
import { mulberry32 } from '../../src/data/quiz';
import { setGoal } from '../../src/data/repositories/settings';
import { clearBus, latest } from '../../src/events/bus';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const chapter = (file: string) => JSON.parse(readFileSync(`public/data/${file}.json`, 'utf8')) as Chapter;

/** The question the screen showed last, which the next one on the same idea must differ from. */
let previous: GrammarQuestion | null = null;

async function freshStore(goal: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  stubChapterFetch();
  previous = null;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  await db.meta.put({ key: 'grammarLevelsSeeded', value: '1' });
  await setGoal(goal);
}

async function openAt(hash: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.history.replaceState(null, '', `/${hash}`);
  render(<App newRandom={() => mulberry32(7)} />);
}

/** The question on screen: the same the screen built from the kept state. */
function expected(): GrammarQuestion {
  const saved = readPlacement();
  if (!saved) throw new Error('no placement is kept');
  const question = questionFor(saved.state, [chapter('1jn/1')], previous);
  previous = question;
  return question;
}

async function answerOne(right: boolean): Promise<void> {
  // the screen moves on after the last Next, a moment later: wait for the question that follows the answers kept so far
  const asked = readPlacement()?.state.asked.length ?? 0;
  await waitFor(() => expect(screen.getByTestId('placement-question')).toHaveTextContent(`Question ${asked + 1} ·`));
  await screen.findByTestId('grammar-prompt');
  const question = expected();
  const options = [...document.querySelectorAll<HTMLElement>('[data-option]')];
  const target = options.find((o) => (o.textContent === question.right) === right);
  if (!target) throw new Error('no such option');
  await user.click(target);
  await user.click(await screen.findByTestId('next'));
}

async function answerMany(n: number, right: boolean): Promise<void> {
  for (let i = 0; i < n; i += 1) await answerOne(right);
}

const levelOf = async (id: string) => (await db.grammarLevels.get(id))?.level;

const feature = await loadFeature('features/placement.feature');

describeFeature(feature, ({ Scenario }) => {
  const given = async (_: unknown, goal: string) => freshStore(goal.replace(/^Read /, ''));
  const opened = async () => openAt('#/placement');
  const started = async () => user.click(await screen.findByRole('button', { name: 'Start' }));
  const says = async (_: unknown, text: string) => {
    await waitFor(() => expect(document.body).toHaveTextContent(text));
  };
  const asks = async (_: unknown, text: string) => {
    await waitFor(() => expect(screen.getByTestId('placement-question')).toHaveTextContent(text));
  };
  const wrong = (_: unknown, n: number) => answerMany(n, false);
  const right = (_: unknown, n: number) => answerMany(n, true);

  Scenario('The test starts on the grammar 1 John 1:1 needs, in the order of my approach', ({ Given, When, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    Then('it says {string}', says);
    When('he starts the placement', started);
    Then('the question line says {string}', asks);
  });

  Scenario('When I miss the easy things it goes easier, down to the letters', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers {int} questions wrong', wrong);
    Then('the question line says {string}', asks);
    And('the idea {string} is not yet', async (_, id: string) => expect(await levelOf(id)).toBe('notYet'));
    And('the idea {string} is also not yet', async (_, id: string) => expect(await levelOf(id)).toBe('notYet'));
  });

  Scenario('It does not ask the harder things after that', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers {int} questions wrong', wrong);
    And('he answers {int} questions right', right);
    Then('no idea after the noun has a level', async () => {
      const order = orderOf(approachOf('bma-tutor')!);
      const after = order.slice(order.indexOf('noun') + 1);
      const rows = await db.grammarLevels.toArray();
      expect(rows.filter((r) => after.includes(r.id))).toEqual([]);
      expect((await db.reviews.toArray()).filter((r) => after.includes(r.id))).toEqual([]);
    });
    And('the idea {string} is solid', async (_, id: string) => expect(await levelOf(id)).toBe('solid'));
  });

  Scenario('The end card says where I am', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers {int} questions wrong', wrong);
    And('he answers {int} questions right', right);
    Then('the end card says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(text));
      expect(screen.getByTestId('where').textContent).toMatch(/untested \d+$/);
    });
    And('the end card lists {string} as {string} under Nouns', (_, title: string, level: string) => {
      const nouns = screen.getByRole('region', { name: 'nouns' });
      const row = within(nouns).getByText(title).closest('li');
      expect(row).toHaveTextContent(level);
    });
    And('the bus has heard the placement is done', () => {
      const heard = latest('placement-done');
      expect(heard).toMatchObject({ goal: '1 John 1:1', approach: 'bma-tutor', solid: 1, frontier: 0, notYet: 2 });
      expect(heard?.untested).toBeGreaterThan(10);
    });
    When('he taps {string}', async (_, name: string) => user.click(await screen.findByRole('button', { name })));
    Then('the Goal screen is open', async () => {
      await screen.findByRole('heading', { name: 'Goal', level: 1 });
    });
  });

  Scenario('Place me in Settings opens it', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens Settings', () => openAt('#/settings'));
    And('he taps {string}', async (_, name: string) => user.click(await screen.findByRole('button', { name })));
    Then('it says {string}', says);
  });

  Scenario('A paused placement goes on tomorrow', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers {int} questions right', right);
    Then('it says {string}', says);
    When('he comes back tomorrow', async () => {
      previous = null;
      await openAt('#/placement');
    });
    Then('the screen offers {string}', says);
    When('he taps {string}', async (_, name: string) => user.click(await screen.findByRole('button', { name })));
    Then('the question line says {string}', asks);
  });

  Scenario('Placement is remembered across a reopen', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers {int} questions right', right);
    And('Lampas is closed and opened again', async () => {
      cleanup();
      clearBus();
      forgetTrail();
      window.history.replaceState(null, '', '/');
      restoreLastRoute();
      render(<App newRandom={() => mulberry32(7)} />);
    });
    Then('it says {string}', says);
    And('the screen offers {string}', says);
  });
});
