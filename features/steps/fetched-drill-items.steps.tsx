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
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { shortDrill } from '../../src/data/grammar/drillPlan';
import { buildDrillItemsRequest, checkedItems, type DrillItemsRequest } from '../../src/data/grammar/fetchedItems';
import { ideaOf } from '../../src/data/grammar/ladder';
import { hebrewFormOf, hebrewIdeasOfWord } from '../../src/data/grammar/hebrew/wordQuestions';
import { ideaOfAny } from '../../src/data/grammar/ladders';
import { mulberry32 } from '../../src/data/quiz';
import { countFetchedItems, isToConfirm, listSeen, listUnseenFetched, missedBefore, reviewsOf, saveFetchedItems } from '../../src/data/repositories';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { DrillItScreen } from '../../src/DrillItScreen';
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
  // a scenario may end with an ask held (the confirm and Prove it ask ahead): the mill ends it first, then nothing is out
  fake?.endAll({ status: 'failed', reason: 'the scenario is over' });
  await whenIdle();
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
const genesis1 = JSON.parse(readFileSync('public/data/gen/1.json', 'utf8')) as Chapter;

let fake: FakePostern;

beforeAll(() => {
  // a grist that ends with a refusal is warned about, as it is in the app
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

/** What the questions of a round on the second declension were, in the order asked. */
let asked: { prompt: string; kind: string | null; mode: string | null }[] = [];
/** The idea whose questions `asked` records: the second declension, except where a scenario names another. */
let focus = IDEA;

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
  focus = IDEA;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await seedHisWords();
  await seedScheduleIfFirstOpen();
  await db.reviews.clear();
}

/** The second declension is due, on a step that asks it as a flashcard (so a step can miss it for sure). */
async function makeDue(lapses = 0, id = IDEA): Promise<void> {
  const now = Date.now();
  await db.reviews.put({ kind: 'grammar', id, step: 3, rights: 0, due: now - 60_000, lastWhen: now - 3 * DAY, lapses });
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
    if (idea === focus && prompt) asked.push({ prompt: prompt.textContent ?? '', kind: prompt.getAttribute('data-kind'), mode: prompt.getAttribute('data-mode') });
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
function itemFrom(request: DrillItemsRequest, over: Record<string, unknown> = {}, idea = IDEA): Record<string, unknown> {
  for (const sent of request.verses) {
    const use = sent.uses.find((u) => u.idea === idea);
    const verse = romans8.verses.find((v) => `${romans8.book} ${romans8.chapter}:${v.n}` === sent.ref);
    const right = verse?.g.find((w) => w.t === use?.form);
    if (!use || !verse || !right) continue;
    const others = [...new Map(verse.g.filter((w) => w.p !== right.p && w.t !== right.t).map((w) => [w.t, w])).keys()];
    if (others.length < 3) continue;
    return { idea, kind: 'tap-form', ref: sent.ref, prompt: MILL_PROMPT, options: [right.t, ...others.slice(0, 3)], right: right.t, ...over };
  }
  throw new Error('the verses sent hold no word of the second declension to ask about');
}

/** An item the mill could write from the first Hebrew verse it was sent that has a word of the idea: a tap-form on that word among words that do not show it. */
function hebrewItemFrom(request: DrillItemsRequest, idea = 'he-article'): Record<string, unknown> {
  for (const sent of request.verses) {
    const use = sent.uses.find((u) => u.idea === idea);
    const verse = genesis1.verses.find((v) => `${genesis1.book} ${genesis1.chapter}:${v.n}` === sent.ref);
    if (!use || !verse) continue;
    const others = [...new Set(verse.g.filter((w) => !hebrewIdeasOfWord(genesis1, w).includes(idea)).map(hebrewFormOf))].filter((f) => f !== use.form);
    if (others.length < 3) continue;
    return { idea, kind: 'tap-form', ref: sent.ref, prompt: 'Tap a word with the article', options: [use.form, ...others.slice(0, 3)], right: use.form };
  }
  throw new Error('the verses sent hold no word of the Hebrew article to ask about');
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

// ---- Prove it ----
const GENITIVE = 'case-genitive';
const PROVE_SEED = 5;
/** What is asked: its prompt and options, which tell one question from another (a prompt alone is shared by questions on different verses). */
const signature = (q: { prompt: string; options: readonly string[] }): string => `${q.prompt}|${q.options.join('|')}`;
const topQuestions = () => {
  const steps = drillSteps(GENITIVE, { passage: [romans8], seed: PROVE_SEED });
  return steps[steps.length - 1].questions;
};
let proveResult: unknown;
/** The mill's items on the genitive case, by signature, so a step knows the right option of one on screen. */
const fresh = new Map<string, string>();
/** What Prove it put on screen, by signature. */
let shown: string[] = [];
let seenBefore = new Set<string>();

function openProveIt(): void {
  cleanup();
  drillSeed.next = () => PROVE_SEED;
  proveResult = undefined;
  render(<DrillItScreen ideaId={GENITIVE} mode="prove" passage={[romans8]} onResult={(r) => (proveResult = r)} onClose={() => undefined} />);
}

/** Answers every question on the Drill it screen right until its result shows. */
async function answerProveItRight(): Promise<void> {
  const all = drillSteps(GENITIVE, { passage: [romans8], seed: PROVE_SEED }).flatMap((st) => st.questions);
  for (let guard = 0; guard < 30; guard += 1) {
    if (screen.queryByTestId('drill-result')) return;
    await screen.findByTestId('grammar-prompt');
    const prompt = document.querySelector('[data-testid="grammar-prompt"]')?.textContent ?? '';
    const options = [...document.querySelectorAll<HTMLElement>('[data-option]')].map((o) => o.textContent ?? '');
    const sig = signature({ prompt, options });
    shown.push(sig);
    const right = fresh.get(sig) ?? all.find((q) => signature(q) === sig)?.right;
    expect(right, `the right option of what Prove it asked: ${sig}`).toBeDefined();
    await user.click([...document.querySelectorAll<HTMLElement>('[data-option]')].find((o) => o.textContent === right) as HTMLElement);
    await user.click(await screen.findByTestId('drill-next'));
  }
  throw new Error('Prove it did not end');
}

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

  Scenario('A right answer on an idea he missed before is confirmed on a question he has not been asked', ({ Given, When, Then, And }) => {
    let builtPrompt = '';
    Given('the genitive case is due in Review, he missed it before, and the mill will answer a drill-items grist', async () => {
      await freshPhone();
      focus = GENITIVE;
      await makeDue(1, GENITIVE);
    });
    When('he answers the genitive case right in a Review round', async () => {
      await openReview();
      await playRound();
      builtPrompt = asked[0].prompt;
    });
    Then('the genitive case is marked to confirm', async () => {
      expect(await isToConfirm(GENITIVE)).toBe(true);
    });
    And('the mill is sent one drill-items grist naming {string} with the question he saw', async (_, id: string) => {
      const { input, kind } = await grist();
      expect(kind).toBe('drill-items');
      expect(input.ideas.map((i) => i.id)).toEqual([id]);
      expect(input.seen?.map((q) => q.prompt)).toContain(builtPrompt);
    });
    When('the mill answers it with items made from the verses it was sent', async () => {
      const { input } = await grist();
      await fake.answer({ status: 'answered', answer: { items: [itemFrom(input, {}, GENITIVE)] } });
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
    Then('the round asks the genitive case with an item the mill wrote', () => {
      // not the question he saw: the one the mill wrote, as a flashcard (the row is still on its step)
      expect(asked).toEqual([{ prompt: MILL_PROMPT, kind: 'tap-form', mode: 'flashcard' }]);
      expect(MILL_PROMPT).not.toBe(builtPrompt);
    });
    And('the genitive case is known: it is no longer to confirm and its row has moved up', async () => {
      await waitFor(async () => expect(await isToConfirm(GENITIVE)).toBe(false));
      expect(await missedBefore(GENITIVE)).toBe(false);
      expect((await reviewsOf([{ kind: 'grammar', id: GENITIVE }]))[0].step).toBe(4);
    });
  });

  Scenario('Prove it does not prove an idea whose questions he has all seen, and proves it on fresh ones', ({ Given, When, Then, And }) => {
    Given('he has been asked every question of the top step of Drill it on the genitive case but one', async () => {
      await freshPhone();
      fresh.clear();
      shown = [];
      const top = topQuestions();
      expect(top.length).toBeGreaterThanOrEqual(3);
      const seen = top.slice(1);
      seenBefore = new Set(seen.map(signature));
      await db.settings.put({ key: `seenItems.${GENITIVE}`, value: JSON.stringify(seen.map((q) => ({ prompt: q.prompt, ref: q.ref }))) });
    });
    When('he starts Prove it on the genitive case', () => {
      openProveIt();
    });
    Then('Prove it says more questions are on their way', async () => {
      expect(await screen.findByTestId('drill-more-on-the-way')).toHaveTextContent('More questions are on their way');
      expect(screen.queryByTestId('drill-result')).toBeNull();
    });
    And('the mill is sent one drill-items grist naming {string}', async (_, id: string) => {
      const { input, kind } = await grist();
      expect(kind).toBe('drill-items');
      expect(input.ideas.map((i) => i.id)).toEqual([id]);
    });
    And('the genitive case is not proved', async () => {
      expect(proveResult).toBeUndefined();
      expect(await db.grammarLevels.get(GENITIVE)).toBeUndefined();
    });
    When('the mill answers it with two items made from the verses it was sent', async () => {
      const { input } = await grist();
      const items = [itemFrom(input, { prompt: 'Which of these is in the genitive case?' }, GENITIVE), itemFrom(input, { prompt: 'Tap the word in the genitive case' }, GENITIVE)];
      await fake.answer({ status: 'answered', answer: { items } });
      await waitFor(async () => expect(await countFetchedItems(GENITIVE)).toBe(2));
      for (const item of items) fresh.set(signature({ prompt: item.prompt as string, options: item.options as string[] }), item.right as string);
      await whenIdle();
    });
    And('he starts Prove it on the genitive case again', async () => {
      openProveIt();
      await screen.findByTestId('grammar-prompt');
      expect(screen.queryByTestId('drill-more-on-the-way')).toBeNull();
    });
    And('he answers every question of Prove it right', async () => {
      await answerProveItRight();
    });
    Then('Drill it says it is proved', async () => {
      expect(await screen.findByTestId('drill-result')).toHaveTextContent('Proved');
      expect(proveResult).toMatchObject({ ideaId: GENITIVE, proved: true });
    });
    And('Prove it asked no question he had been asked before', () => {
      expect(shown.length).toBeGreaterThan(0);
      expect(shown.filter((sig) => seenBefore.has(sig))).toEqual([]);
    });
  });

  Scenario('Misses on the Hebrew article ask the mill for Hebrew items from Hebrew verses', ({ Given, When, Then, And }) => {
    Given('the Hebrew article is due in Review and the mill will answer a drill-items grist', async () => {
      await freshPhone();
      await makeDue(0, 'he-article');
    });
    When('he misses the Hebrew article in a Review round', async () => {
      await openReview();
      await playRound('he-article');
    });
    Then('the mill is sent one drill-items grist naming {string} in Hebrew, with Hebrew verses and words and no Greek', async (_, id: string) => {
      const { input, kind } = await grist();
      expect(kind).toBe('drill-items');
      expect(input.language).toBe('he');
      expect(input.ideas.map((i) => i.id)).toEqual([id]);
      expect(input.ideas[0].what).toBe(ideaOfAny(id).text);
      expect(input.verses.length).toBeGreaterThan(0);
      for (const verse of input.verses) {
        expect(verse.ref).toMatch(/^Genesis 1:/);
        expect(verse.hebrew).toBeTruthy();
        expect(verse.hebrew_words?.length).toBeGreaterThan(0);
        expect('greek' in verse).toBe(false);
      }
    });
    When('the mill answers it with Hebrew items made from the verses it was sent', async () => {
      const { input } = await grist();
      await fake.answer({ status: 'answered', answer: { items: [hebrewItemFrom(input)] } });
    });
    Then('the items are kept for {string}', async (_, id: string) => {
      await waitFor(async () => expect(await countFetchedItems(id)).toBe(1));
    });
    And('the item kept for {string} is a Hebrew question', async (_, id: string) => {
      const [kept] = await listUnseenFetched(id);
      expect(kept).toMatchObject({ kind: 'tap-form', ideaId: id, lang: 'hbo' });
    });
  });
});
