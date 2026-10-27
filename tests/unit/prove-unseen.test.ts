// Prove it proves only on questions he has not been asked (mw-indx1x6.2, docs/grammar.md 'Confirming a missed idea'): a seen question never counts toward proving an idea, and when too few unseen
// ones are left Drill it says 'More questions are on their way' and asks the mill, in the background, instead of proving on seen ones. The app also asks ahead: when an idea's kept items he has not
// been asked run low, one ask goes before he reaches Prove it (at most one in flight; none when enough are kept, none for an idea he has never been asked, none offline).
import '@testing-library/react/dont-cleanup-after-each';
import { Utils } from '@bsv/sdk';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { drillSteps, enoughToProve } from '../../src/data/grammar/drillIt';
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { buildDrillItemsRequest, checkedItems, seenKey, type AnsweredItem, type DrillItemsRequest } from '../../src/data/grammar/fetchedItems';
import { ideaOf } from '../../src/data/grammar/ladder';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { countFetchedItems, saveFetchedItems } from '../../src/data/repositories';
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
    const top = noted(topStep().questions);
    expect(top.length).toBeGreaterThanOrEqual(2);
    await keepSeen(top.slice(0, top.length - 1));
    const onResult = vi.fn();
    open(onResult);
    expect(await screen.findByTestId('drill-more-on-the-way')).toHaveTextContent('More questions are on their way');
    expect(screen.queryByTestId('grammar-prompt')).toBeNull();
    expect(screen.queryByTestId('drill-result')).toBeNull();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('asks the mill in the background in that case, and proves nothing on a seen question while it waits', async () => {
    const postern = makeFakePostern();
    postern.autoReply = { status: 'answered', answer: { items: [TAP] } };
    postern.holds['drill-items'] = new Promise(() => undefined);
    const chapterFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith('https://postern') ? postern.fetch(input, init) : chapterFetch(input, init)));
    tutorTimings.pollMs = 20;
    const top = noted(topStep().questions);
    await keepSeen(top);
    const onResult = vi.fn();
    open(onResult);
    await screen.findByTestId('drill-more-on-the-way');
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
