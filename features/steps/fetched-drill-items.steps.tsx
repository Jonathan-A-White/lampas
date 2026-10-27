// features/steps/fetched-drill-items.steps.tsx — runs features/fetched-drill-items.feature: after a Review round the mill is asked, in the background, for more items on the ideas he
// missed (the drill-items grind, src/review/moreItems.ts), they are kept (checked against the verses sent), and the next round starts with one. fetch is stubbed: /data/ files from disk,
// https://postern.allmymind.org to the fake mill (tests/support/fake-postern.ts), which holds each grist until a step answers it with items made from the verses the grist carried.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { shortDrill } from '../../src/data/grammar/drillPlan';
import { buildDrillItemsRequest, checkedItems, type DrillItemsRequest } from '../../src/data/grammar/fetchedItems';
import { ideaOf } from '../../src/data/grammar/ladder';
import { mulberry32 } from '../../src/data/quiz';
import { countFetchedItems, listSeen, saveFetchedItems } from '../../src/data/repositories';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { PlanDrillScreen } from '../../src/PlanDrillScreen';
import { whenIdle } from '../../src/review/moreItems';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { tutorTimings } from '../../src/services/tutor';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(async () => {
  cleanup();
  clearBus();
  setCurrentLicence('licensed');
  await whenIdle();
  fake?.endAll({ status: 'failed', reason: 'the scenario is over' });
  await usageWritesSettled();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '0d';
const IDEA = 'declension-2';
/** The prompt the scenarios give the item the mill writes. */
const MILL_PROMPT = 'Tap the second declension noun';
const romans8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;

let fake: FakePostern;

beforeAll(() => {
  // a grist that ends with a refusal is warned about, as it is in the app
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

/** What the questions of a round on the second declension were, in the order asked. */
let asked: { prompt: string; kind: string | null; mode: string | null }[] = [];

/** A fresh phone: words seeded, nothing scheduled, a key, a licence, a fake mill that holds every grist until a step answers it. */
async function freshPhone(): Promise<void> {
  // the last scenario may have left a grist out: the old mill ends it before a new phone starts
  setCurrentLicence('licensed');
  fake?.endAll({ status: 'failed', reason: 'the scenario is over' });
  await whenIdle();
  cleanup();
  clearBus();
  await usageWritesSettled();
  forgetTrail();
  localStorage.clear();
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  setCurrentLicence('licensed');
  tutorTimings.pollMs = 20;
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  fake = makeFakePostern();
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  asked = [];
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await seedHisWords();
  await seedScheduleIfFirstOpen();
  await db.reviews.clear();
}

/** The second declension is due, on a step that asks it as a flashcard (so a step can miss it for sure). */
async function makeDue(): Promise<void> {
  const now = Date.now();
  await db.reviews.put({ kind: 'grammar', id: IDEA, step: 3, rights: 0, due: now - 60_000, lastWhen: now - 3 * DAY, lapses: 0 });
}

async function openReview(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.history.replaceState(null, '', '/#/review');
  render(<App newRandom={() => mulberry32(7)} />);
  await screen.findByRole('heading', { name: 'Review', level: 1 });
}

/** Plays the round on screen to its end card. A question on the idea `miss` is missed (a flashcard graded Not yet); every other is answered right when it is a flashcard and with its first
 * choice when it is a choice. Records what was asked of the second declension. */
async function playRound(miss?: string): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Start' }));
  for (;;) {
    await waitFor(() => expect(document.querySelector('[data-testid="grammar-prompt"], [data-testid="prompt"]')).not.toBeNull());
    const prompt = document.querySelector('[data-testid="grammar-prompt"]');
    const idea = prompt?.getAttribute('data-idea');
    if (idea === IDEA && prompt) asked.push({ prompt: prompt.textContent ?? '', kind: prompt.getAttribute('data-kind'), mode: prompt.getAttribute('data-mode') });
    const show = screen.queryByRole('button', { name: 'Show' });
    if (show) {
      await user.click(show);
      await user.click(await screen.findByRole('button', { name: idea === miss ? 'Not yet' : 'I knew it' }));
    } else {
      const options = [...document.querySelectorAll<HTMLElement>('[data-option]')];
      expect(options.length, 'a question with choices is on screen').toBeGreaterThan(0);
      await user.click(options[0]);
    }
    const next = await screen.findByTestId('next');
    const last = next.textContent === 'Finish';
    await user.click(next);
    if (last) break;
  }
  await screen.findByTestId('score');
}

/** An item the mill could write from the first verse it was sent that has a word of the idea: a tap-form on that word among words of other parsings. */
function itemFrom(request: DrillItemsRequest, over: Record<string, unknown> = {}): Record<string, unknown> {
  for (const sent of request.verses) {
    const use = sent.uses.find((u) => u.idea === IDEA);
    const verse = romans8.verses.find((v) => `${romans8.book} ${romans8.chapter}:${v.n}` === sent.ref);
    const right = verse?.g.find((w) => w.t === use?.form);
    if (!use || !verse || !right) continue;
    const others = [...new Map(verse.g.filter((w) => w.p !== right.p && w.t !== right.t).map((w) => [w.t, w])).keys()];
    if (others.length < 3) continue;
    return { idea: IDEA, kind: 'tap-form', ref: sent.ref, prompt: MILL_PROMPT, options: [right.t, ...others.slice(0, 3)], right: right.t, ...over };
  }
  throw new Error('the verses sent hold no word of the second declension to ask about');
}

const grist = async (): Promise<{ input: DrillItemsRequest; kind: string }> => {
  await waitFor(() => expect(fake.received).toHaveLength(1));
  return { input: fake.received[0].input as unknown as DrillItemsRequest, kind: fake.received[0].grist.kind };
};

/** Writes the item the mill could write from the second declension's verses of Romans 8 into the kept list, as a finished fetch would. */
async function keepAnItem(): Promise<void> {
  const request = buildDrillItemsRequest([ideaOf(IDEA)], new Map([[IDEA, 2]]), [romans8]) as DrillItemsRequest;
  const kept = checkedItems({ items: [itemFrom(request)] } as never, request, [romans8]);
  expect(kept, 'the item the mill could write passes the check').toHaveLength(1);
  await saveFetchedItems(kept);
}

/** Opens the short drill of the second declension on screen, as Your drill plan opens one: the questions of its first facet. */
function openShortDrill(): void {
  cleanup();
  const first = drillSteps(IDEA, { passage: [romans8], seed: 5 })[0].questions[0];
  const item = { id: `facet:${first.facet.id}`, kind: 'facet' as const, facet: first.facet, step: 1, done: false };
  const questions = shortDrill(IDEA, item, { passage: [romans8], seed: 5 });
  expect(questions.length).toBeGreaterThanOrEqual(4);
  render(<PlanDrillScreen ideaId={IDEA} facetLabel={first.facet.label} questions={questions} onFinish={() => undefined} onClose={() => undefined} />);
}

const promptShown = (): string | null => document.querySelector('[data-testid="grammar-prompt"]')?.textContent ?? null;

const feature = await loadFeature('features/fetched-drill-items.feature');

const MILL_WILL_ANSWER = 'the second declension is due in Review and the mill will answer a drill-items grist';

describeFeature(feature, ({ Scenario }) => {
  Scenario('Misses on the second declension bring a fetched item into the next round', ({ Given, When, Then, And }) => {
    Given(MILL_WILL_ANSWER, async () => {
      await freshPhone();
      await makeDue();
    });
    When('he misses the second declension in a Review round', async () => {
      await openReview();
      await playRound(IDEA);
    });
    Then('the mill is sent one drill-items grist naming {string}', async (_, id: string) => {
      const { input, kind } = await grist();
      expect(kind).toBe('drill-items');
      expect(input.ideas.map((i) => i.id)).toEqual([id]);
      expect(input.verses.length).toBeGreaterThan(0);
    });
    When('the mill answers it with items made from the verses it was sent', async () => {
      const { input } = await grist();
      await fake.answer({ status: 'answered', answer: { items: [itemFrom(input)] } });
    });
    Then('the items are kept for {string}', async (_, id: string) => {
      await waitFor(async () => expect(await countFetchedItems(id)).toBe(1));
    });
    When('he starts the next Review round', async () => {
      await whenIdle();
      asked = [];
      await openReview();
      await playRound();
    });
    Then('the round asks the second declension with an item the mill wrote', () => {
      expect(asked).toEqual([{ prompt: MILL_PROMPT, kind: 'tap-form', mode: 'choice' }]);
    });
    And('the kept items for {string} are used up', async (_, id: string) => {
      expect(await countFetchedItems(id)).toBe(0);
    });
  });

  Scenario('The end card is drawn while the mill has not answered', ({ Given, When, Then, And }) => {
    Given(MILL_WILL_ANSWER, async () => {
      await freshPhone();
      await makeDue();
    });
    When('he misses the second declension in a Review round', async () => {
      await openReview();
      await playRound(IDEA);
    });
    Then('the end card of the round shows', async () => {
      expect(await screen.findByTestId('score')).toBeVisible();
      expect(screen.getByTestId('comes-back')).toBeVisible();
    });
    And('the mill is sent one drill-items grist naming {string}', async (_, id: string) => {
      const { input } = await grist();
      expect(input.ideas.map((i) => i.id)).toEqual([id]);
    });
    And('nothing is kept for {string} yet', async (_, id: string) => {
      expect(await countFetchedItems(id)).toBe(0);
    });
  });

  Scenario('Items that do not match the verses are dropped', ({ Given, When, Then, And }) => {
    Given(MILL_WILL_ANSWER, async () => {
      await freshPhone();
      await makeDue();
    });
    When('he misses the second declension in a Review round', async () => {
      await openReview();
      await playRound(IDEA);
    });
    And('the mill answers it with items that do not match the verses it was sent', async () => {
      const { input } = await grist();
      const good = itemFrom(input);
      await fake.answer({
        status: 'answered',
        answer: { items: [{ ...good, right: 'ἀγάπη' }, { ...good, ref: 'Mark 1:1' }, { ...good, options: ['α', 'β', 'γ', 'δ'], right: 'α' }] },
      });
    });
    Then('nothing is kept for {string}', async (_, id: string) => {
      await whenIdle();
      expect(await countFetchedItems(id)).toBe(0);
    });
  });

  Scenario('With no licence a finished round asks the mill for no More drill items', ({ Given, When, Then, And }) => {
    Given('the second declension is due in Review and this phone has no licence', async () => {
      await freshPhone();
      await makeDue();
      setCurrentLicence('not-licensed');
    });
    When('he misses the second declension in a Review round', async () => {
      await openReview();
      await playRound(IDEA);
    });
    Then('the end card of the round shows', async () => {
      expect(await screen.findByTestId('score')).toBeVisible();
    });
    And('the mill is sent no drill-items grist', async () => {
      await whenIdle();
      expect(fake.received).toEqual([]);
      // the phone sent no grist of any kind (a POST to the backend)
      expect(fake.calls.filter((c) => c.startsWith('POST'))).toEqual([]);
    });
  });

  Scenario('A kept item is asked in a short drill and then used up', ({ Given, When, Then, And }) => {
    Given('the mill wrote an item for the second declension and it is kept', async () => {
      await freshPhone();
      await keepAnItem();
    });
    When('he starts a short drill on the second declension', () => {
      openShortDrill();
    });
    Then('the short drill asks the item the mill wrote', async () => {
      await waitFor(() => expect(promptShown()).toBe(MILL_PROMPT));
    });
    And('the kept items for {string} are used up', async (_, id: string) => {
      expect(await countFetchedItems(id)).toBe(0);
    });
    And('the mill\'s item is noted as asked on {string}', async (_, id: string) => {
      const option = document.querySelector<HTMLElement>('[data-option]');
      expect(option).not.toBeNull();
      await user.click(option as HTMLElement);
      await waitFor(async () => expect((await listSeen(id)).map((q) => q.prompt)).toContain(MILL_PROMPT));
    });
  });

  Scenario('A drill with nothing kept asks built questions without waiting for the mill', ({ Given, When, Then, And }) => {
    Given('nothing is kept for the second declension', async () => {
      await freshPhone();
      expect(await countFetchedItems(IDEA)).toBe(0);
    });
    When('he starts a short drill on the second declension', () => {
      openShortDrill();
    });
    Then('the short drill asks a built question at once', async () => {
      expect(await screen.findByTestId('grammar-prompt')).toBeVisible();
      // the mill never answered anything: what is asked is the phone's own
      expect(promptShown()).not.toBe(MILL_PROMPT);
      expect(await countFetchedItems(IDEA)).toBe(0);
    });
    And('the mill is sent no drill-items grist', async () => {
      await whenIdle();
      expect(fake.received).toEqual([]);
      expect(fake.calls.filter((c) => c.startsWith('POST'))).toEqual([]);
    });
  });
});
