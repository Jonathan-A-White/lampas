// features/steps/quick-round.steps.tsx — runs features/quick-round.feature: the quick round at the end of the placement (mw-hqd5bz.18). A step finds the right
// option by building the question the screen asked, from the state the placement kept.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { gapsOf } from '../../src/data/grammar/inference';
import { LADDER, ITEM_GROUPS, itemName, itemsOf } from '../../src/data/grammar/ladder';
import { currentQuick, quickQuestion, quickSeed } from '../../src/data/grammar/quickRound';
import { readPlacement } from '../../src/data/placementKeep';
import { mulberry32 } from '../../src/data/quiz';
import { setGoal } from '../../src/data/repositories/settings';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { drawReviewRound } from '../../src/review/round';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';

let synth: FakeSynth;

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const ITEMS = ITEM_GROUPS.flatMap((g) => itemsOf(g));
const idOf = (name: string): string => {
  const found = ITEMS.find((i) => itemName(i) === name);
  if (!found) throw new Error(`no letter or combination called ${name}`);
  return found.id;
};
const names = (list: string): string[] => list.split(',').map((n) => n.trim());

/** Everything the ladder has is solid (marked), except these items and the groups that stand for them. */
async function freshStore(goal: string, except: string[]): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  stubChapterFetch();
  synth = stubSpeech([{ lang: 'el-GR', name: 'Greek (Greece)' }]);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  await db.meta.put({ key: 'grammarLevelsSeeded', value: '1' });
  await setGoal(goal.replace(/^Read /, ''));
  const missing = new Set(except.map(idOf));
  const groups = new Set(ITEM_GROUPS.filter((g) => itemsOf(g).some((i) => missing.has(i.id))));
  await db.grammarLevels.bulkPut(
    LADDER.filter((i) => !missing.has(i.id) && !groups.has(i.id)).map((i) => ({ id: i.id, level: 'solid' as const, since: 1, how: 'marked' as const })),
  );
}

async function openAt(hash: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.history.replaceState(null, '', `/${hash}`);
  render(<App newRandom={() => mulberry32(7)} />);
}

/** Answers the item on screen, as the screen asked it: the option that is right (or not), then Next. Returns the question. */
async function answerQuick(right: boolean) {
  const round = readPlacement()!.state.quick!;
  await waitFor(() => expect(screen.getByTestId('placement-question')).toHaveTextContent(`Quick round ${round.at + 1} of ${round.items.length}`));
  await screen.findByTestId('grammar-prompt');
  const item = currentQuick(round)!;
  const question = quickQuestion(item, mulberry32(quickSeed(round)));
  const options = [...document.querySelectorAll<HTMLElement>('[data-option]')];
  const target = options.find((o) => (o.textContent === question.right) === right);
  if (!target) throw new Error('no such option');
  await user.click(target);
  await user.click(await screen.findByTestId('next'));
  // the last Finish writes the answers and clears the kept placement a moment later: wait for the end card so nothing is left to run in the next scenario
  if (round.at + 1 === round.items.length) await screen.findByTestId('where');
  return { item, question };
}

const rowOf = (name: string) => db.grammarLevels.get(idOf(name));

const feature = await loadFeature('features/quick-round.feature');

describeFeature(feature, ({ Scenario }) => {
  const given = (_: unknown, goal: string, except: string) => freshStore(goal, names(except));
  const opened = () => openAt('#/placement');
  const started = async () => user.click(await screen.findByRole('button', { name: 'Start' }));
  const roundSays = async (_: unknown, text: string) => {
    await waitFor(() => expect(screen.getByTestId('placement-question')).toHaveTextContent(text));
  };
  const taps = async (_: unknown, name: string) => user.click(await screen.findByRole('button', { name }));
  const solidFrom = async (_: unknown, name: string) => waitFor(async () => expect(await rowOf(name)).toMatchObject({ level: 'solid', how: 'placement' }));
  const gaps = async (_: unknown, text: string) => {
    await waitFor(() => expect(screen.getByTestId('gaps')).toHaveTextContent(`Gaps to work on: ${text}`));
  };

  Scenario('The quick round asks only the letters and combinations that are not solid, and each answer writes its own level', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and his grammar is known except {string}', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    Then('the quick round says {string}', roundSays);
    When('he answers the quick round right, right and wrong', async () => {
      await answerQuick(true);
      await answerQuick(true);
      await answerQuick(false);
    });
    Then('the item {string} is solid from the placement', solidFrom);
    And('the item {string} is solid from the placement', solidFrom);
    And('the item {string} is not yet from the placement', async (_, name: string) => waitFor(async () => expect(await rowOf(name)).toMatchObject({ level: 'notYet', how: 'placement' })));
    And('the end card names the gaps {string}', gaps);
  });

  Scenario('Stop here keeps what was answered', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and his grammar is known except {string}', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers the quick round right', () => answerQuick(true).then(() => undefined));
    And('he taps {string}', taps);
    Then('the item {string} is solid from the placement', solidFrom);
    And('the item {string} has no level', async (_, name: string) => expect(await rowOf(name)).toBeUndefined());
    And('the item {string} also has no level', async (_, name: string) => expect(await rowOf(name)).toBeUndefined());
    And('the end card names the gaps {string}', gaps);
  });

  Scenario('Hear and pick says the sound and See and pick shows it', ({ Given, When, And, Then }) => {
    const seen: { hear: boolean; said: string[]; glyph: string; shown: string | null }[] = [];
    Given('his goal is {string} and his grammar is known except {string}', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers every question of the quick round right', async () => {
      for (let n = 0; n < 3; n += 1) {
        const round = readPlacement()!.state.quick!;
        await waitFor(() => expect(screen.getByTestId('placement-question')).toHaveTextContent(`Quick round ${round.at + 1} of`));
        await screen.findByTestId('grammar-prompt');
        const line = screen.getByTestId('placement-question').textContent ?? '';
        const item = currentQuick(round)!;
        const glyph = LADDER.find((i) => i.id === item.id)!.glyphs?.[0] ?? LADDER.find((i) => i.id === item.id)!.pair!;
        seen.push({
          hear: line.includes('Hear and pick'),
          said: synth.spoken.map((s) => s.text),
          glyph,
          shown: screen.queryByTestId('grammar-form')?.textContent ?? null,
        });
        await answerQuick(true);
      }
    });
    Then('each Hear and pick question was said in Greek, and each See and pick question showed its letter or pair', () => {
      expect(seen.map((s) => s.hear)).toEqual([true, false, true]);
      for (const s of seen) {
        if (s.hear) {
          expect(s.said).toContain(s.glyph);
          expect(s.shown).toBeNull();
        } else {
          expect(s.shown).toBe(s.glyph);
        }
      }
      // a See and pick question does not say its letter before the answer
      expect(seen[1].said).not.toContain(seen[1].glyph);
    });
    And('the item {string} is solid from the placement', solidFrom);
  });

  Scenario('The end card, Learn next and Review name the gaps', ({ Given, When, And, Then }) => {
    Given('his goal is {string} and his grammar is known except {string}', given);
    When('he opens the placement', opened);
    And('he starts the placement', started);
    And('he answers the quick round wrong, wrong and wrong', async () => {
      await answerQuick(false);
      await answerQuick(false);
      await answerQuick(false);
    });
    Then('the end card names the gaps {string}', gaps);
    When('he taps {string}', taps);
    Then('Learn next says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
      expect(gapsOf(new Map((await db.grammarLevels.toArray()).map((r) => [r.id, r.level])))).toHaveLength(3);
    });
    And("Review's next grammar questions are on {string}", async (_, ids: string) => {
      const round = await drawReviewRound(mulberry32(1));
      expect(round.items.slice(0, 3).map((i) => i.id)).toEqual(names(ids));
    });
  });
});
