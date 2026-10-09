// features/steps/inference.steps.tsx — runs features/inference.feature: what his right answers show of the letters, sounds and marks (placement, Review),
// the alphabet that is solid when its 24 letters are, and the Goal screen's Learn next naming the weak letters. A placement step finds the right answer
// by building the question the screen asked, from the kept state, as features/steps/placement.steps.tsx does.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { db, type GrammarLevelName } from '../../src/data/db';
import { LETTER_IDS, lettersText, weakLetters } from '../../src/data/grammar/inference';
import { questionFor } from '../../src/data/grammar/placementQuestion';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { readPlacement } from '../../src/data/placementKeep';
import { mulberry32 } from '../../src/data/quiz';
import { setLevel } from '../../src/data/repositories/grammarLevels';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { setGoal } from '../../src/data/repositories/settings';
import { seedWordsIfFirstOpen } from '../../src/data/repositories/words';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
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

/** Empties every store; only what a step puts is there. */
async function freshStore(goal: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  previous = null;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await setGoal(goal.replace(/^Read /, ''));
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

async function answerPlacement(right: boolean): Promise<void> {
  const asked = readPlacement()?.state.asked.length ?? 0;
  await waitFor(() => expect(screen.getByTestId('placement-question')).toHaveTextContent(`Question ${asked + 1} ·`));
  await screen.findByTestId('grammar-prompt');
  const question = expected();
  const target = [...document.querySelectorAll<HTMLElement>('[data-option]')].find((o) => (o.textContent === question.right) === right);
  if (!target) throw new Error('no such option');
  await user.click(target);
  await user.click(await screen.findByTestId('next'));
}

const row = (id: string) => db.grammarLevels.get(id);
const levelsNow = async () => new Map((await db.grammarLevels.toArray()).map((r): [string, GrammarLevelName] => [r.id, r.level]));
const learnNext = () => screen.findByTestId('learn-next');

const feature = await loadFeature('features/inference.feature');

describeFeature(feature, ({ Scenario }) => {
  const givenGoal = async (_: unknown, goal: string) => freshStore(goal);
  const openGoal = () => openAt('#/goal');
  const solidInferred = async (_: unknown, id: string) => expect(await row(id)).toMatchObject({ level: 'solid', how: 'inferred' });
  const GIVEN_GOAL_NOTHING = 'the goal is {string} and he knows no word and no idea';

  Scenario('A placement that reads right credits the letters its forms use', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and he knows nothing yet', givenGoal);
    When('he opens the placement', () => openAt('#/placement'));
    And('he starts the placement', async () => user.click(await screen.findByRole('button', { name: 'Start' })));
    And('he answers {int} questions right', async (_, n: number) => {
      for (let i = 0; i < n; i += 1) await answerPlacement(true);
    });
    And('he answers {int} questions wrong', async (_, n: number) => {
      for (let i = 0; i < n; i += 1) await answerPlacement(false);
    });
    Then('the letter {string} is solid, inferred from his answers', solidInferred);
    And('the placement did not ask the letter {string}', async (_, id: string) => {
      expect(await db.reviews.get(['grammar', id])).toMatchObject({ rights: 0, lapses: 0 });
    });
    And('the letter {string} has no level', async (_, id: string) => expect(await row(id)).toBeUndefined());
    When('he opens the Goal screen', openGoal);
    Then('Learn next does not say {string}', async (_, text: string) => {
      await waitFor(async () => expect(await learnNext()).not.toHaveTextContent(text));
    });
    And('Learn next names the letters that are not solid', async () => {
      const levels = await levelsNow();
      const weak = lettersText(weakLetters(levels));
      expect(weak).toMatch(/^β/);
      expect(LETTER_IDS.filter((id) => levels.get(id) === 'solid').length).toBeGreaterThan(3);
      await waitFor(async () => expect(await learnNext()).toHaveTextContent(`Learn next: ${weak} · The Greek letters`));
    });
  });

  Scenario('Learn next names the weak letters, not the alphabet', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL_NOTHING, givenGoal);
    And('all the letters are solid but ξ and ψ', async () => {
      for (const id of LETTER_IDS.filter((l) => l !== 'letter-xi' && l !== 'letter-psi')) await setLevel(id, 'solid', 'marked');
    });
    When('he opens the Goal screen', openGoal);
    Then('Learn next says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await learnNext()).toHaveTextContent(text));
    });
    And('the idea {string} is not solid', async (_, id: string) => expect((await row(id))?.level).not.toBe('solid'));
  });

  Scenario('With all 24 letters solid the alphabet is solid', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL_NOTHING, givenGoal);
    And('all the letters are solid but ξ and ψ', async () => {
      for (const id of LETTER_IDS.filter((l) => l !== 'letter-xi' && l !== 'letter-psi')) await setLevel(id, 'solid', 'marked');
    });
    When('he makes the letters ξ and ψ solid', async () => {
      await setLevel('letter-xi', 'solid', 'marked');
      await setLevel('letter-psi', 'solid', 'marked');
    });
    Then('the idea {string} is solid, inferred from his answers', solidInferred);
    When('he opens the Goal screen', openGoal);
    Then('Learn next says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await learnNext()).toHaveTextContent(text));
    });
  });

  Scenario('Right answers in Review after the placement move a foundation idea to solid', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL_NOTHING, givenGoal);
    And('the placement left {string} not yet', async (_, id: string) => setLevel(id, 'notYet', 'placement'));
    And('{int} of his words are due', async (_, n: number) => {
      await db.meta.bulkDelete(['wordsSeeded', 'reviewsSeeded']);
      await seedWordsIfFirstOpen();
      await seedScheduleIfFirstOpen();
      await db.reviews.clear();
      const lemmas = ['λέγω', 'εἰμί', 'ἀγαπάω'].slice(0, n);
      const now = Date.now();
      await db.reviews.bulkPut(lemmas.map((lemma, i) => ({ kind: 'word', id: lemma, step: 0, rights: 0, due: now - (lemmas.length - i) * 60_000, lastWhen: now - 3 * DAY, lapses: 0 })));
    });
    When('he opens Review and starts', async () => {
      await openAt('#/review');
      await user.click(await screen.findByRole('button', { name: 'Start' }));
      await screen.findByTestId('prompt');
    });
    And('he answers {int} questions right', async (_, n: number) => {
      for (let i = 0; i < n; i += 1) {
        const lemma = screen.getByTestId('prompt').getAttribute('data-lemma') ?? '';
        const gloss = (await db.words.get(lemma))?.gloss;
        const target = [...document.querySelectorAll<HTMLElement>('[data-option]')].find((o) => o.textContent === gloss);
        if (!target) throw new Error(`no right option for ${lemma}`);
        await user.click(target);
        await user.click(await screen.findByTestId('next'));
      }
    });
    Then('the idea {string} is solid, inferred from his answers', solidInferred);
    When('he opens the Goal screen', openGoal);
    Then('the grammar bar says solid {int}, frontier {int} and not yet {int}', async (_, solid: number, frontier: number, notYet: number) => {
      await waitFor(async () => expect(await screen.findByTestId('ideas-legend')).toHaveTextContent(`Solid ${solid} · Frontier ${frontier} · Not yet ${notYet}`));
    });
  });
});
