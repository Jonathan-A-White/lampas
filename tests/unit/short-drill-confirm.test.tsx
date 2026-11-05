// A miss in a short drill is a miss before (mw-74h98vg.3, docs/grammar.md 'Confirming a missed idea'): the short drill's wrong answers never reached the idea's row, which is all missedBefore read, so a right answer
// on the repeat marked nothing to confirm. No review row and no mark is seeded here: the idea is missed in the drill itself, on a clean profile, as the Governor's phone met it.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { buildDrillItemsRequest, checkedItems, type AnsweredItem, type DrillItemsRequest } from '../../src/data/grammar/fetchedItems';
import { ideaOf } from '../../src/data/grammar/ladder';
import { saveDrillPlan, answerPlanItem } from '../../src/data/repositories/drillPlans';
import { shortDrill, type DrillPlan } from '../../src/data/grammar/drillPlan';
import type { DrillQuestion } from '../../src/data/grammar/drillIt';
import { isToConfirm, markConfirmed, missedBefore, reviewsOf, saveFetchedItems } from '../../src/data/repositories';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { PlanDrillScreen } from '../../src/PlanDrillScreen';
import { whenIdle } from '../../src/review/moreItems';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../support/fake-postern';

afterAll(() => cleanup());

const PHONE_KEY = '00'.repeat(31) + '0e';
const IDEA = 'declension-2';
const chapter = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const passage = [chapter];
const MILL: AnsweredItem = {
  idea: IDEA,
  kind: 'tap-form',
  ref: '1 John 1:1',
  prompt: 'Tap the genitive singular noun',
  options: ['ἀρχῆς', 'λόγου', 'ζωῆς', 'ὀφθαλμοῖς'],
  right: 'λόγου',
};
const item = { id: 'facet:meaning', kind: 'facet' as const, facet: { id: 'meaning', label: 'What it is' }, step: 1, done: false };

let postern: FakePostern;

beforeEach(async () => {
  cleanup();
  const chapterFetch = (stubChapterFetch(), globalThis.fetch);
  postern = makeFakePostern();
  postern.autoReply = { status: 'answered', answer: { items: [MILL] } };
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? postern.fetch(input, init) : chapterFetch(input, init)));
  tutorTimings.pollMs = 20;
  setCurrentLicence('licensed');
  localStorage.clear();
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  await db.open();
  await Promise.all([db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.words.clear()]);
});
afterEach(async () => {
  cleanup();
  await whenIdle();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-option]')];

/** Plays a short drill to its Done: `pickRight` says, for each question, whether he answers it right. */
async function play(questions: readonly DrillQuestion[], pickRight: (n: number) => boolean, plan: DrillPlan): Promise<void> {
  let passed = false;
  let finished = false;
  render(
    <PlanDrillScreen
      ideaId={IDEA}
      facetLabel="What it is"
      questions={questions}
      onFinish={(ok) => {
        passed = ok;
        finished = true;
      }}
      onClose={() => undefined}
    />,
  );
  for (let n = 0; n < questions.length; n += 1) {
    await waitFor(() => expect(screen.getByTestId('plan-drill-step').textContent).toContain(`Question ${n + 1} of`));
    await screen.findByTestId('grammar-prompt');
    // the question as asked now (a kept item may stand in for a built one)
    const buttons = options();
    const asked = buttons.map((b) => b.textContent?.trim());
    const right = questions.map((q) => q.right).find((r) => asked.includes(r)) ?? '';
    const pick = pickRight(n) ? buttons[asked.indexOf(right)] : buttons[asked.findIndex((a) => a !== right)];
    fireEvent.click(pick);
    fireEvent.click(await screen.findByTestId('plan-drill-next'));
  }
  fireEvent.click(await screen.findByTestId('plan-drill-done'));
  await waitFor(() => expect(finished).toBe(true));
  await answerPlanItem(IDEA, plan.at, item.id, passed);
  cleanup();
}

const PLAN: DrillPlan = { ideaId: IDEA, at: 1000, items: [item, { id: 'prove', kind: 'prove', step: 2, done: false }] };

describe('a miss in a short drill', () => {
  it('counts as missed before, so a right answer on the repeat marks the idea to confirm and the next ask is a kept, different question', async () => {
    const questions = shortDrill(IDEA, item, { passage, seed: 1 });
    expect(questions.length).toBeGreaterThanOrEqual(4);
    await saveDrillPlan(PLAN);
    expect(await reviewsOf([{ kind: 'grammar', id: IDEA }])).toEqual([]);

    // the drill: every answer a miss; the step is not done, so it comes back
    await play(questions, () => false, PLAN);
    expect(await missedBefore(IDEA)).toBe(true);
    expect(await isToConfirm(IDEA)).toBe(false);

    // the repeat: every answer right
    await play(questions, () => true, PLAN);
    expect(await isToConfirm(IDEA)).toBe(true);
    // the ask for fresh questions went out, naming the idea
    await whenIdle();
    expect(postern.received).toHaveLength(1);
    expect(postern.received[0].grist).toMatchObject({ app: 'lampas', kind: 'drill-items' });
    expect((postern.received[0].input as unknown as DrillItemsRequest).ideas.map((i) => i.id)).toEqual([IDEA]);

    // the mill's question comes (kept as the phone keeps one): the next short drill asks it, in place of a built one, and it is not one he has been asked
    const [kept] = checkedItems({ items: [MILL] }, buildDrillItemsRequest([ideaOf(IDEA)], new Map([[IDEA, 1]]), [{ ...chapter, verses: chapter.verses.slice(0, 1) }]) as DrillItemsRequest, [{ ...chapter, verses: chapter.verses.slice(0, 1) }]);
    await saveFetchedItems([kept]);
    render(<PlanDrillScreen ideaId={IDEA} facetLabel="What it is" questions={questions} onFinish={() => undefined} onClose={() => undefined} />);
    await waitFor(() => expect(document.querySelector('[data-testid="grammar-prompt"]')?.textContent).toBe(MILL.prompt));
    expect(questions.map((q) => q.prompt)).not.toContain(MILL.prompt);
  });

  it('counts inside the same drill: a right answer after a miss marks the idea to confirm before the drill is over', async () => {
    const questions = shortDrill(IDEA, item, { passage, seed: 1 });
    await saveDrillPlan(PLAN);
    // a miss, then every other answer right: the first right answer follows a miss of this drill
    await play(questions, (n) => n > 0, PLAN);
    expect(await isToConfirm(IDEA)).toBe(true);
  });

  it('is not a miss before once a fresh question has confirmed the idea', async () => {
    const questions = shortDrill(IDEA, item, { passage, seed: 1 });
    await saveDrillPlan(PLAN);
    await play(questions, () => false, PLAN);
    expect(await missedBefore(IDEA)).toBe(true);
    await markConfirmed(IDEA);
    expect(await missedBefore(IDEA)).toBe(false);
    // a right answer now marks nothing
    await play(questions, () => true, PLAN);
    expect(await isToConfirm(IDEA)).toBe(false);
  });
});
