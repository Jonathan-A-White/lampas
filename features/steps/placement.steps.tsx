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
import { LADDER } from '../../src/data/grammar/ladder';
import { questionFor } from '../../src/data/grammar/placementQuestion';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { readPlacement } from '../../src/data/placementKeep';
import { mulberry32 } from '../../src/data/quiz';
import { teachIdea } from '../../src/data/repositories/grammarLevels';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { setGoal } from '../../src/data/repositories/settings';
import { seedWordsIfFirstOpen } from '../../src/data/repositories/words';
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
  const reopened = async () => {
    cleanup();
    clearBus();
    forgetTrail();
    window.history.replaceState(null, '', '/');
    restoreLastRoute();
    render(<App newRandom={() => mulberry32(7)} />);
  };
  const lineSays = async (_: unknown, text: string) => {
    await waitFor(() => expect(screen.getByTestId('letters-note')).toHaveTextContent(text));
  };
  const asks = async (_: unknown, text: string) => {
    await waitFor(() => expect(screen.getByTestId('placement-question')).toHaveTextContent(text));
  };
  // The App's first-open seed puts every word he has on the schedule (reviews of kind 'word') whenever it finishes: only a grammar review is the placement's.
  const noIdeaHasALevel = async () => {
    expect(await db.grammarLevels.toArray()).toEqual([]);
    expect((await db.reviews.toArray()).filter((r) => r.kind === 'grammar')).toEqual([]);
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

  Scenario('When I miss the easy things it goes easier, down to the letters and marks of the words I missed', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers {int} questions wrong', wrong);
    Then('the question line says {string}', asks);
    And('the idea {string} is not yet', async (_, id: string) => expect(await levelOf(id)).toBe('notYet'));
    And('the idea {string} is also not yet', async (_, id: string) => expect(await levelOf(id)).toBe('notYet'));
    And('the alphabet as a whole was not asked', async () => {
      expect(await levelOf('alphabet')).toBeUndefined();
      expect(await db.reviews.get(['grammar', 'alphabet'])).toBeUndefined();
    });
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
      expect((await db.reviews.toArray()).filter((r) => r.kind === 'grammar' && after.includes(r.id))).toEqual([]);
    });
    And('the idea {string} is solid', async (_, id: string) => expect(await levelOf(id)).toBe('solid'));
  });

  Scenario('The end card says where I am', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers {int} questions wrong', wrong);
    And('he answers {int} questions right', right);
    Then('the question line says {string}', asks);
    // the walk reached the letters, so the quick round (features/quick-round.feature) comes before the end card
    When('he stops the quick round', async () => user.click(await screen.findByRole('button', { name: 'Stop here' })));
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
      expect(heard).toMatchObject({ goal: '1 John 1:1', approach: 'bma-tutor', solid: 12, frontier: 0, notYet: 1 });
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

  Scenario('The intro says plainly what Start from the letters is', ({ Given, When, Then, And }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    Then('the screen offers {string}', says);
    And('the intro line says {string}', lineSays);
    And('the intro line also says {string}', lineSays);
  });

  Scenario('The intro with kept answers has no line about Start from the letters', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers {int} questions right', right);
    And('Lampas is closed and opened again', reopened);
    Then('the screen offers {string}', says);
    And('the intro has no line about Start from the letters', async () => {
      await screen.findByRole('button', { name: 'Go on' });
      expect(screen.queryByTestId('letters-note')).toBeNull();
    });
  });

  Scenario('Placement is remembered across a reopen', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers {int} questions right', right);
    And('Lampas is closed and opened again', reopened);
    Then('it says {string}', says);
    And('the screen offers {string}', says);
  });

  const goalScreen = () => openAt('#/goal');
  const tapped = async (_: unknown, name: string) => user.click(await screen.findByRole('button', { name }));

  Scenario('A paused placement has the way back to the goal, and the Goal screen shows the new answers', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the Goal screen', goalScreen);
    And('he taps {string}', tapped);
    And('he starts the placement', started);
    And('he answers {int} questions right', right);
    Then('it says {string}', says);
    When('he taps {string}', tapped);
    Then('the Goal screen is open', async () => {
      await screen.findByRole('heading', { name: 'Goal', level: 1 });
    });
    And('the Goal screen counts some solid ideas', async () => {
      const bar = await screen.findByTestId('ideas-bar');
      await waitFor(() => expect(bar.getAttribute('aria-label')).not.toMatch(/: 0 solid/));
    });
  });

  Scenario('Go on another day returns to the Goal screen when the placement was started there', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the Goal screen', goalScreen);
    And('he taps {string}', tapped);
    And('he starts the placement', started);
    And('he answers {int} questions right', right);
    Then('it says {string}', says);
    When('he taps {string}', tapped);
    Then('the Goal screen is open', async () => {
      await screen.findByRole('heading', { name: 'Goal', level: 1 });
    });
  });

  Scenario('Go on another day returns to Settings when the placement was started there', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens Settings', () => openAt('#/settings'));
    And('he taps {string}', tapped);
    And('he starts the placement', started);
    And('he answers {int} questions right', right);
    Then('it says {string}', says);
    When('he taps {string}', tapped);
    Then('Settings is open', async () => {
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
  });

  Scenario('A total beginner starts from the letters', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    When('he opens the placement', opened);
    Then('the screen offers {string}', says);
    When('he taps {string}', tapped);
    Then('the end card says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(text));
    });
    And('no idea has a level', noIdeaHasALevel);
    And('the placement is no longer kept', () => expect(readPlacement()).toBeNull());
    And('the screen says he starts with {string}', async (_, title: string) => {
      await waitFor(() => expect(screen.getByTestId('from-letters')).toHaveTextContent(`You start with ${title}`));
    });
    When('he goes back to the goal', async () => user.click(await screen.findByRole('button', { name: 'Back to the goal' })));
    Then('Learn next says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
    });
  });

  Scenario('Start from the letters keeps the progress he has and the card says so', ({ Given, And, When, Then }) => {
    let before: unknown[] = [];
    let card = '';
    Given('his goal is {string} and he knows nothing yet', given);
    And('he has marked {string} as I know this', async (_, title: string) => {
      const id = LADDER.find((i) => i.title === title)!.id;
      await teachIdea(id, 'known');
      before = await db.grammarLevels.toArray();
      expect(before.length).toBeGreaterThan(0);
    });
    When('he opens the placement', opened);
    Then('the screen offers {string}', says);
    When('he taps {string}', tapped);
    Then('the end card says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(text));
      card = screen.getByTestId('where').textContent ?? '';
    });
    And('the screen says he has {string} solid and Learn next opens {string}', async (_, solid: string, next: string) => {
      await waitFor(() => expect(screen.getByTestId('from-letters')).toHaveTextContent(`Already solid: ${solid}. Learn next on the Goal screen opens ${next}.`));
      expect(screen.getByTestId('from-letters')).not.toHaveTextContent('You start with');
    });
    And('no stored level changed', async () => expect(await db.grammarLevels.toArray()).toEqual(before));
    And('the placement is no longer kept', () => expect(readPlacement()).toBeNull());
    When('he goes back to the goal', async () => user.click(await screen.findByRole('button', { name: 'Back to the goal' })));
    Then('Learn next says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
    });
    And('the Goal screen counts the grammar ideas as the card did', async () => {
      const [solid, frontier, notYet, untested] = (card.match(/\d+/g) ?? []).map(Number);
      // the Goal screen counts an idea with no level as not yet
      await waitFor(() => expect(screen.getByTestId('ideas-legend')).toHaveTextContent(`Solid ${solid} · Frontier ${frontier} · Not yet ${notYet + untested}`));
    });
  });

  // The App seeds the word list and puts its words on the schedule in the background, whenever that finishes, and a loaded host lets it win. Here the seed is
  // done before the check; 'A total beginner starts from the letters' leaves it to race. Both must pass.
  Scenario("A total beginner's placement gives no idea a level, with his word list already on the schedule", ({ Given, And, When, Then }) => {
    Given('his goal is {string} and he knows nothing yet', given);
    And('his word list is already on the schedule', async () => {
      await seedWordsIfFirstOpen();
      await seedScheduleIfFirstOpen();
      expect((await db.reviews.toArray()).some((r) => r.kind === 'word')).toBe(true);
    });
    When('he opens the placement', opened);
    Then('the screen offers {string}', says);
    When('he taps {string}', tapped);
    Then('the end card says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(text));
    });
    And('no idea has a level', noIdeaHasALevel);
  });
});
