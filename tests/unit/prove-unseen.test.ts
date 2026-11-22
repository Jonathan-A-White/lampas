// Prove it proves only on questions he has not been asked (mw-indx1x6.2, docs/grammar.md 'Confirming a missed idea'): a seen question never counts toward proving an idea, and when too few unseen
// ones are left Drill it says 'More questions are on their way' and asks the mill, in the background, instead of proving on seen ones. The app also asks ahead: when an idea's kept items he has not
// been asked run low, one ask goes before he reaches Prove it (at most one in flight; none when enough are kept, none for an idea he has never been asked, none offline).
import '@testing-library/react/dont-cleanup-after-each';
import { Utils } from '@bsv/sdk';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { drillSteps, enoughToProve } from '../../src/data/grammar/drillIt';
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { buildDrillItemsRequest, isFetchable, checkedItems, seenKey, type AnsweredItem, type DrillItemsRequest } from '../../src/data/grammar/fetchedItems';
import { ideaOf, LADDER } from '../../src/data/grammar/ladder';
import { ideaOfAny, ladderLangOf } from '../../src/data/grammar/ladders';
import { HEBREW_LADDER } from '../../src/data/grammar/hebrew/ladder';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { countFetchedItems, listUnseenFetched, saveFetchedItems, setGoal } from '../../src/data/repositories';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { DrillItScreen } from '../../src/DrillItScreen';
import { keepStocked, whenIdle } from '../../src/review/moreItems';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../support/chapter-fetch';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';

afterAll(() => cleanup());

/** Declension 2 is asked of the mill in these tests; case-genitive is the idea whose built questions all have a verse in Romans 8, so they are the ones the phone notes as seen. */
const IDEA = 'declension-2';
const PROVE = 'case-genitive';
/** A phone that holds a key, and a mill that answers: what a reader who can be sent more questions has. */
const withMill = (): FakePostern => {
  const postern = makeFakePostern();
  postern.autoReply = { status: 'answered', answer: { items: [TAP] } };
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith('https://postern') ? postern.fetch(input, init) : chapterFetch(input, init)));
  tutorTimings.pollMs = 20;
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00'.repeat(31) + '0f');
  return postern;
};
const KEY = Uint8Array.from(Utils.toArray('00'.repeat(31) + '0f', 'hex'));
const chapter = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const romans8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const passage = [romans8];
const oneVerse1jn = [{ ...chapter, verses: chapter.verses.slice(0, 1) }];
const oneVerse = oneVerse1jn;
const SEED = 1;

const topStep = () => {
  const steps = drillSteps(PROVE, { passage, seed: SEED });
  return steps[steps.length - 1];
};
const keyOf = (q: GrammarQuestion): string => seenKey({ prompt: q.prompt, ref: q.ref ?? '' });
/** The questions with a verse, which are the ones the phone notes as seen. */
const noted = (questions: readonly GrammarQuestion[]) => questions.filter((q) => q.ref);
const keepSeen = (questions: readonly { prompt: string; ref?: string }[], idea = PROVE) =>
  db.settings.put({ key: `seenItems.${idea}`, value: JSON.stringify(questions.map((q) => ({ prompt: q.prompt, ref: q.ref }))) });

const TAP: AnsweredItem = { idea: IDEA, kind: 'tap-form', ref: '1 John 1:1', prompt: 'Tap the genitive singular noun', options: ['ἀρχῆς', 'λόγου', 'ζωῆς', 'ὀφθαλμοῖς'], right: 'λόγου' };
const MEANING: AnsweredItem = { idea: IDEA, kind: 'meaning', ref: '1 John 1:1', prompt: 'What does this say?', form: 'τοῦ λόγου', options: ['the Word', 'the beginning', 'our own hands', 'the Father'], right: 'the Word' };
const kept = (items: AnsweredItem[]): GrammarQuestion[] =>
  checkedItems({ items }, buildDrillItemsRequest([ideaOf(IDEA)], new Map([[IDEA, 2]]), oneVerse1jn) as DrillItemsRequest, oneVerse1jn);
/** Questions the mill wrote on case-genitive, as the phone keeps them (the check against the verse is tests/unit/drill-items.test.ts's). */
const freshOnProve = (): GrammarQuestion[] =>
  ['Which word is in the genitive case, first?', 'Which word is in the genitive case, second?'].map((prompt) => ({
    kind: 'tap-form',
    ideaId: PROVE,
    prompt,
    options: ['Οὐδὲν', 'ἄρα', 'νῦν', 'κατάκριμα'],
    right: 'κατάκριμα',
    ref: 'Romans 8:1',
  }));

beforeEach(async () => {
  cleanup();
  stubChapterFetch();
  localStorage.clear();
  setCurrentLicence('licensed');
  drillSeed.next = () => SEED;
  await db.open();
  await Promise.all([db.settings.clear(), db.reviews.clear()]);
});
afterEach(() => {
  setCurrentLicence('licensed');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the steps of a walk hold no question he has seen', () => {
  it('leaves out every seen question, and counts a top step with fewer than two left as too few to prove on', () => {
    const all = drillSteps(PROVE, { passage, seed: SEED });
    const asked = noted(all.flatMap((s) => s.questions));
    expect(asked.length).toBeGreaterThan(2);
    expect(enoughToProve(all)).toBe(true);
    // the easier step below does not stand in for the top step he has seen every question of
    const seen = new Set(asked.map(keyOf));
    const unseen = drillSteps(PROVE, { passage, seed: SEED, seen });
    expect(noted(unseen.flatMap((s) => s.questions)).filter((q) => seen.has(keyOf(q)))).toEqual([]);
    expect(enoughToProve(unseen, all)).toBe(false);
  });

  it('keeps the questions he has not been asked: one seen question takes only itself away', () => {
    const first = noted(topStep().questions)[0];
    const steps = drillSteps(PROVE, { passage, seed: SEED, seen: new Set([keyOf(first)]) });
    const top = steps[steps.length - 1];
    expect(top.questions.map(keyOf)).not.toContain(keyOf(first));
    expect(top.questions).toHaveLength(topStep().questions.length - 1);
  });
});

describe('Prove it', () => {
  const noop = () => undefined;
  const prompt = (): string | null => document.querySelector('[data-testid="grammar-prompt"]')?.textContent ?? null;
  const open = (onResult: (r: unknown) => void = noop) => render(createElement(DrillItScreen, { ideaId: PROVE, mode: 'prove', passage, onResult, onClose: noop }));

  it('never asks a question he has seen', async () => {
    const first = noted(drillSteps(PROVE, { passage, seed: SEED })[0].questions.length ? drillSteps(PROVE, { passage, seed: SEED })[1].questions : []);
    expect(first.length).toBeGreaterThan(0);
    await keepSeen(first);
    open();
    await screen.findByTestId('grammar-prompt');
    await waitFor(() => expect(first.map((q) => q.prompt)).not.toContain(prompt()));
  });

  it('does not prove an idea whose top step he has seen all but one question of: it says more questions are on their way and ends no walk', async () => {
    withMill();
    const top = noted(topStep().questions);
    expect(top.length).toBeGreaterThanOrEqual(2);
    await keepSeen(top.slice(0, top.length - 1));
    const onResult = vi.fn();
    open(onResult);
    expect(await screen.findByTestId('drill-more-on-the-way')).toHaveTextContent('More questions are on their way');
    expect(screen.queryByTestId('grammar-prompt')).toBeNull();
    expect(screen.queryByTestId('drill-result')).toBeNull();
    expect(onResult).not.toHaveBeenCalled();
    await whenIdle();
  });

  it('asks the mill nothing and proves nothing on a seen question when the phone has no key', async () => {
    const postern = makeFakePostern();
    const chapterFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith('https://postern') ? postern.fetch(input, init) : chapterFetch(input, init)));
    const top = noted(topStep().questions);
    await keepSeen(top);
    const onResult = vi.fn();
    open(onResult);
    await screen.findByTestId('drill-cannot-ask');
    // no key on this phone: nothing was sent, and nothing was proved
    expect(postern.calls).toEqual([]);
    expect(onResult).not.toHaveBeenCalled();
  });

  it('asks the mill for fresh questions in the background in that case when the phone can ask', async () => {
    const postern = makeFakePostern();
    postern.autoReply = { status: 'answered', answer: { items: [TAP] } };
    const chapterFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith('https://postern') ? postern.fetch(input, init) : chapterFetch(input, init)));
    tutorTimings.pollMs = 20;
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00'.repeat(31) + '0f');
    const top = noted(topStep().questions);
    await keepSeen(top);
    open();
    await screen.findByTestId('drill-more-on-the-way');
    await waitFor(() => expect(postern.received).toHaveLength(1));
    expect(postern.received[0].grist).toMatchObject({ kind: 'drill-items' });
    expect((postern.received[0].input as unknown as DrillItemsRequest).ideas.map((i) => i.id)).toEqual([PROVE]);
    await whenIdle();
  });

  it('is proved on the fresh questions when the mill has written enough: they join the top step and are used up', async () => {
    const top = noted(topStep().questions);
    await keepSeen(top.slice(0, top.length - 1));
    await saveFetchedItems(freshOnProve());
    expect(await countFetchedItems(PROVE)).toBe(2);
    open();
    await waitFor(async () => expect(await countFetchedItems(PROVE)).toBe(0));
    await screen.findByTestId('grammar-prompt');
    expect(screen.queryByTestId('drill-more-on-the-way')).toBeNull();
  });
});

// Drill it promises questions only when the mill can be asked (mw-indx1x6.16): with no licence, offline or with no key no question can come, so the screen says which it is instead of 'on their way'.
describe('Prove it when the mill cannot be asked', () => {
  const noop = () => undefined;
  const open = () => render(createElement(DrillItScreen, { ideaId: PROVE, mode: 'prove', passage, onResult: noop, onClose: noop }));
  const seeAllButOne = async () => {
    const top = noted(topStep().questions);
    await keepSeen(top.slice(0, top.length - 1));
  };
  const saysNoMore = async (pattern: RegExp) => {
    const note = await screen.findByTestId('drill-cannot-ask');
    expect(note).toHaveTextContent(pattern);
    expect(note).toHaveTextContent(/proves an idea on questions the mill writes/);
    expect(screen.queryByTestId('drill-more-on-the-way')).toBeNull();
    expect(screen.queryByTestId('grammar-prompt')).toBeNull();
  };

  it('says the reader has no licence, and promises nothing', async () => {
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00'.repeat(31) + '0f');
    setCurrentLicence('not-licensed');
    await seeAllButOne();
    open();
    await saysNoMore(/licence/);
  });

  it('says the phone is offline, and promises nothing', async () => {
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00'.repeat(31) + '0f');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await seeAllButOne();
    open();
    await saysNoMore(/offline/);
  });

  it('says the phone has no key, and promises nothing', async () => {
    await seeAllButOne();
    open();
    await saysNoMore(/key/);
  });

  it('still says more questions are on their way with a licence, online and a key', async () => {
    withMill();
    await seeAllButOne();
    open();
    expect(await screen.findByTestId('drill-more-on-the-way')).toHaveTextContent('More questions are on their way');
    expect(screen.queryByTestId('drill-cannot-ask')).toBeNull();
    await whenIdle();
  });
});

// The conjunction over 1 John 1 has one verse with a single conjunction, so its built top step holds ONE question: a proof needs PROVED_STREAK (2), and the walk asked that one twice and proved on it
// (his feedback 2026-11-01, mw-indx1x6.5). The rule of 'the steps hold too few' holds whether or not he has been asked anything yet.
describe('Prove it on an idea whose built top step holds one question', () => {
  const SHORT = 'conjunction';
  const noop = () => undefined;
  const walkSteps = () => drillSteps(SHORT, { passage: [chapter], seed: SEED });
  const sig = (prompt: string, options: readonly string[]) => `${prompt}|${options.join('|')}`;
  const open = (onResult: (r: unknown) => void = noop) => render(createElement(DrillItScreen, { ideaId: SHORT, mode: 'prove', passage: [chapter], onResult, onClose: noop }));
  const keptOnShort = (): GrammarQuestion[] => [
    { kind: 'tap-form', ideaId: SHORT, prompt: 'Which word joins the two halves of this verse?', options: ['καὶ', 'ἡμῶν', 'τῆς', 'ζωῆς'], right: 'καὶ', ref: '1 John 1:2' },
    { kind: 'tap-form', ideaId: SHORT, prompt: 'Which word is the conjunction here?', options: ['καὶ', 'Θεὸς', 'φῶς', 'ἐστιν'], right: 'καὶ', ref: '1 John 1:5' },
  ];

  it('has a built top step of one question, which is too few to prove on', () => {
    const steps = walkSteps();
    expect(steps[steps.length - 1].questions).toHaveLength(1);
    expect(enoughToProve(steps)).toBe(false);
  });

  it('says more questions are on their way and ends no walk when nothing is kept, the first time he drills it', async () => {
    withMill();
    const onResult = vi.fn();
    open(onResult);
    expect(await screen.findByTestId('drill-more-on-the-way')).toHaveTextContent('More questions are on their way');
    expect(screen.queryByTestId('grammar-prompt')).toBeNull();
    expect(screen.queryByTestId('drill-result')).toBeNull();
    expect(onResult).not.toHaveBeenCalled();
    await whenIdle();
  });

  it('makes up the number from the kept questions: no question is asked twice and the idea is proved on two different ones', async () => {
    await saveFetchedItems(keptOnShort());
    const onResult = vi.fn();
    open(onResult);
    const all = [...walkSteps().flatMap((s) => s.questions), ...keptOnShort()];
    const user = userEvent.setup();
    const shownKeys: string[] = [];
    for (let guard = 0; guard < 20 && !screen.queryByTestId('drill-result'); guard += 1) {
      await screen.findByTestId('grammar-prompt');
      const prompt = prompt_();
      const options = [...document.querySelectorAll<HTMLElement>('[data-option]')].map((o) => o.textContent ?? '');
      shownKeys.push(sig(prompt, options));
      const right = all.find((q) => sig(q.prompt, q.options) === sig(prompt, options))?.right;
      expect(right, `the right option of ${prompt}`).toBeDefined();
      await user.click([...document.querySelectorAll<HTMLElement>('[data-option]')].find((o) => o.textContent === right) as HTMLElement);
      await user.click(await screen.findByTestId('drill-next'));
    }
    expect(await screen.findByTestId('drill-result')).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ proved: true }));
    expect(new Set(shownKeys).size).toBe(shownKeys.length);
    expect(await countFetchedItems(SHORT)).toBe(0);
  });

  function prompt_(): string {
    return document.querySelector('[data-testid="grammar-prompt"]')?.textContent ?? '';
  }
});

// mw-indx1x6.70: Drill it said 'More questions are on their way' on an idea he had never been asked, and no ask went to the mill (keepStocked leaves such an idea alone). The screen promises questions only
// when an ask goes out for this idea.
describe('Drill it promises questions only when an ask goes out', () => {
  const noop = () => undefined;
  const SHORT = 'conjunction';
  /** the screen has decided it has too few questions and says so (the first walk drawn at once is replaced when the list of seen ones is read) */
  const settledOn = () => screen.findByTestId(/^(drill-more-on-the-way|drill-cannot-ask)$/);
  const openOn = (ideaId: string, passage: readonly Chapter[]) => render(createElement(DrillItScreen, { ideaId, mode: 'prove', passage, onResult: noop, onClose: noop }));

  it('asks the mill, or does not say questions are on their way, on an idea never asked: licensed, online, with a key', async () => {
    const postern = withMill();
    openOn(SHORT, [chapter]);
    await settledOn();
    const promised = screen.queryByTestId('drill-more-on-the-way') !== null;
    if (promised) await waitFor(() => expect(postern.received.length).toBeGreaterThan(0));
    else expect(screen.queryByText(/More questions are on their way/)).toBeNull();
    if (promised) {
      expect(postern.received[0].grist).toMatchObject({ kind: 'drill-items' });
      expect((postern.received[0].input as unknown as DrillItemsRequest).ideas.map((i) => i.id)).toEqual([SHORT]);
    }
    await whenIdle();
  });

  it('says plainly, and asks nothing, on a short idea the mill writes none for', async () => {
    const postern = withMill();
    openOn('syllables', []);
    const note = await screen.findByTestId('drill-cannot-ask');
    expect(note).toHaveTextContent(/the mill writes none for it/);
    expect(screen.queryByTestId('drill-more-on-the-way')).toBeNull();
    await whenIdle();
    expect(postern.received).toEqual([]);
  });

  // mw-indx1x6.119: Drill it opened again while its first ask is out waited for that ask and then sent its own, for an idea the first ask had already stocked
  /** A mill that writes two good tap questions for each idea asked, on the verses the request sent, whichever they are: the right word is the verse's use of the idea, the others its words of other parsings. */
  const twoGoodQuestions = (input: Record<string, unknown>): { status: 'answered'; answer: { items: AnsweredItem[] } } => {
    const request = input as unknown as DrillItemsRequest;
    const items = request.ideas.flatMap((idea) =>
      request.verses
        .filter((v) => v.uses.some((u) => u.idea === idea.id))
        .slice(0, 2)
        .map((v, i): AnsweredItem => {
          const right = v.uses.find((u) => u.idea === idea.id)?.form as string;
          const others = [...new Set(v.greek.split(' ').filter((w) => !v.uses.some((u) => u.form === w)))].slice(0, 3);
          return { idea: idea.id, kind: 'tap-form', ref: v.ref, prompt: `Which word shows ${idea.title}? (${i + 1})`, options: [right, ...others], right };
        }),
    );
    return { status: 'answered', answer: { items } };
  };

  it('asks the mill once when Drill it is opened again while the first ask is out', async () => {
    const postern = withMill();
    await setGoal('Read 1 John 1');
    postern.replyFor = twoGoodQuestions;
    const release = Promise.withResolvers<void>();
    postern.holds['drill-items'] = release.promise;
    openOn(SHORT, [chapter]);
    await screen.findByTestId('drill-more-on-the-way');
    await waitFor(() => expect(postern.calls.length).toBeGreaterThan(0));
    cleanup();
    openOn(SHORT, [chapter]);
    await screen.findByTestId('drill-more-on-the-way');
    release.resolve();
    await whenIdle();
    // the second screen's own ask, if it makes one, starts a moment after the first one is answered
    await new Promise((r) => setTimeout(r, 150)); // a real-time wait: a window in which no second ask must go out
    await whenIdle();
    expect(postern.received.filter((r) => r.grist.kind === 'drill-items')).toHaveLength(1);
    expect((await listUnseenFetched(SHORT)).length).toBeGreaterThanOrEqual(2);
    cleanup();
    openOn(SHORT, [chapter]);
    expect(await screen.findByTestId('grammar-prompt')).toBeInTheDocument();
    await whenIdle();
  });

  // every idea of the Greek and the Hebrew ladder whose built top step is too short to prove on, as a fresh phone draws it
  const short = [...LADDER, ...HEBREW_LADDER].flatMap((idea) =>
    [[chapter], []].flatMap((p) => {
      const steps = drillSteps(idea.id, { passage: p, seed: SEED });
      return enoughToProve(steps) ? [] : [{ id: idea.id, passage: p as Chapter[] }];
    }),
  );
  it('has short ideas to sweep', () => {
    expect(short.length).toBeGreaterThan(10);
  });
  it.each(short.map((s) => [`${s.id} (${s.passage.length} chapters)`, s] as const))('%s: onTheirWay is shown only when an ask goes out', async (_name, one) => {
    const postern = withMill();
    await Promise.all([db.settings.clear(), db.reviews.clear()]);
    openOn(one.id, one.passage);
    await settledOn();
    await whenIdle();
    const promised = screen.queryByTestId('drill-more-on-the-way') !== null;
    if (isFetchable(ideaOfAny(one.id))) expect(promised).toBe(true);
    if (promised) expect(postern.received.length).toBeGreaterThan(0);
    else expect(screen.queryByTestId('drill-cannot-ask')).not.toBeNull();
    cleanup();
  });

  // every fetchable idea whose built top step is short: opening Drill it twice while the first ask is out sends one grist when that ask stocked the idea
  const fetchableShort = short.filter((s) => s.passage.length > 0 && isFetchable(ideaOfAny(s.id)) && ladderLangOf(s.id) !== 'hbo');
  const sweptStocked: string[] = [];
  it('has fetchable short ideas to sweep', () => {
    expect(fetchableShort.length).toBeGreaterThan(3);
  });
  it.each(fetchableShort.map((s) => [s.id, s] as const))('%s: opening Drill it twice while an ask is out sends one grist', async (_name, one) => {
    const postern = withMill();
    await Promise.all([db.settings.clear(), db.reviews.clear()]);
    await setGoal('Read 1 John 1');
    postern.replyFor = twoGoodQuestions;
    const release = Promise.withResolvers<void>();
    postern.holds['drill-items'] = release.promise;
    openOn(one.id, one.passage);
    await settledOn();
    await waitFor(() => expect(postern.calls.length).toBeGreaterThan(0));
    cleanup();
    openOn(one.id, one.passage);
    await settledOn();
    release.resolve();
    await whenIdle();
    await new Promise((r) => setTimeout(r, 150)); // a real-time wait: a window in which no second ask must go out
    await whenIdle();
    const stocked = (await listUnseenFetched(one.id)).length >= 2;
    // an idea whose first answer the phone kept enough of is not asked a second time; one it kept too little of may be
    if (stocked) {
      sweptStocked.push(one.id);
      expect(postern.received.filter((r) => r.grist.kind === 'drill-items')).toHaveLength(1);
    }
    cleanup();
  });
  it('swept ideas the first ask stocked', () => {
    expect(sweptStocked.length).toBeGreaterThan(0);
  });
});

describe('asking ahead', () => {
  let postern: FakePostern;
  beforeEach(() => {
    postern = makeFakePostern();
    postern.autoReply = { status: 'answered', answer: { items: [TAP, MEANING] } };
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => postern.fetch(input, init));
    tutorTimings.pollMs = 20;
  });
  afterEach(async () => {
    await whenIdle();
  });

  it('starts one ask when the kept items he has not been asked are fewer than two, for an idea he has been asked', async () => {
    await keepSeen([{ prompt: 'Tap the second declension noun', ref: '1 John 1:1' }], IDEA);
    await keepStocked([IDEA], { key: KEY, passage: oneVerse });
    await whenIdle();
    expect(postern.received).toHaveLength(1);
    expect(postern.received[0].grist).toMatchObject({ kind: 'drill-items' });
    expect((postern.received[0].input as unknown as DrillItemsRequest).ideas.map((i) => i.id)).toEqual([IDEA]);
    expect(await countFetchedItems(IDEA)).toBe(2);
  });

  it('asks none when two or more are kept that he has not been asked', async () => {
    await keepSeen([{ prompt: 'Tap the second declension noun', ref: '1 John 1:1' }], IDEA);
    await saveFetchedItems(kept([TAP, MEANING]));
    await keepStocked([IDEA], { key: KEY, passage: oneVerse });
    await whenIdle();
    expect(postern.calls).toEqual([]);
  });

  it('counts a kept item he has been asked since as gone', async () => {
    const items = kept([TAP, MEANING]);
    await saveFetchedItems(items);
    await keepSeen([items[0]], IDEA);
    await keepStocked([IDEA], { key: KEY, passage: oneVerse });
    await whenIdle();
    expect(postern.received).toHaveLength(1);
  });

  it('asks none while one is in flight, and none for an idea he has never been asked', async () => {
    const release = Promise.withResolvers<void>();
    postern.holds['drill-items'] = release.promise;
    await keepSeen([{ prompt: 'Tap the second declension noun', ref: '1 John 1:1' }], IDEA);
    await keepStocked([IDEA], { key: KEY, passage: oneVerse });
    await waitFor(() => expect(postern.calls.length).toBeGreaterThan(0));
    const sent = postern.received.length;
    await keepStocked([IDEA], { key: KEY, passage: oneVerse });
    release.resolve();
    await whenIdle();
    expect(postern.received.length).toBe(sent === 0 ? 1 : sent);
    postern.received.length = 0;
    postern.calls.length = 0;
    await db.settings.clear();
    await keepStocked([IDEA], { key: KEY, passage: oneVerse });
    await whenIdle();
    expect(postern.calls).toEqual([]);
  });

  it('asks none offline, with no key or no licence', async () => {
    await keepSeen([{ prompt: 'Tap the second declension noun', ref: '1 John 1:1' }], IDEA);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await keepStocked([IDEA], { key: KEY, passage: oneVerse });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    await keepStocked([IDEA], { passage: oneVerse });
    setCurrentLicence('not-licensed');
    await keepStocked([IDEA], { key: KEY, passage: oneVerse });
    await whenIdle();
    expect(postern.calls).toEqual([]);
  });
});
