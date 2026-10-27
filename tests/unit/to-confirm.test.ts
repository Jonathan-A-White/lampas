// Confirming a missed idea (mw-indx1x6.2, docs/grammar.md 'Confirming a missed idea'): a right answer on an idea he missed before marks it 'to confirm' and asks the mill, in the background,
// for questions he has not been asked; the idea counts as known when a fresh one is right (its row takes the right answer), and a miss on a fresh one returns it to missed. An idea he never
// missed is neither marked nor asked about; nothing is asked offline, with no key or no licence.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { buildDrillItemsRequest, checkedItems, type AnsweredItem, type DrillItemsRequest } from '../../src/data/grammar/fetchedItems';
import { ideaOf } from '../../src/data/grammar/ladder';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import {
  countFetchedItems,
  isToConfirm,
  listSeen,
  missedBefore,
  reviewsOf,
  saveFetchedItems,
  takeFetchedItems,
} from '../../src/data/repositories';
import { DAY } from '../../src/data/schedule';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { confirmAnswer } from '../../src/review/confirm';
import { whenIdle } from '../../src/review/moreItems';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../support/fake-postern';

const PHONE_KEY = '00'.repeat(31) + '0e';
const IDEA = 'declension-2';
const chapter = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const passage = [{ ...chapter, verses: chapter.verses.slice(0, 1) }];

/** A built question about 1 John 1:1, as the app asks one. */
const BUILT: GrammarQuestion = {
  kind: 'tap-form',
  ideaId: IDEA,
  prompt: 'Tap the second declension noun',
  options: ['ἀρχῆς', 'λόγου', 'ζωῆς', 'ὀφθαλμοῖς'],
  right: 'λόγου',
  ref: '1 John 1:1',
};
const MILL: AnsweredItem = {
  idea: IDEA,
  kind: 'tap-form',
  ref: '1 John 1:1',
  prompt: 'Tap the genitive singular noun',
  options: ['ἀρχῆς', 'λόγου', 'ζωῆς', 'ὀφθαλμοῖς'],
  right: 'λόγου',
};

let postern: FakePostern;

beforeEach(async () => {
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
  await whenIdle();
  setCurrentLicence('licensed');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The idea's row: step 3, due, with `lapses` misses behind it. */
async function rowWith(lapses: number, recent?: Array<{ when: number; right: boolean }>): Promise<void> {
  const now = Date.now();
  await db.reviews.put({ kind: 'grammar', id: IDEA, step: 3, rights: 0, due: now - 60_000, lastWhen: now - 3 * DAY, lapses, ...(recent ? { recent } : {}) });
}

/** A question the mill wrote, taken from the phone's kept list as a screen takes one (so the app knows it is fresh). */
async function freshQuestion(): Promise<GrammarQuestion> {
  const [kept] = checkedItems({ items: [MILL] }, buildDrillItemsRequest([ideaOf(IDEA)], new Map([[IDEA, 1]]), passage) as DrillItemsRequest, passage);
  await saveFetchedItems([kept]);
  const taken = (await takeFetchedItems([IDEA])).get(IDEA);
  if (!taken) throw new Error('nothing was kept');
  return taken;
}

describe('the mark: a right answer on an idea he missed before', () => {
  it('marks it to confirm and asks the mill, in the background, naming the idea and carrying what he has seen', async () => {
    await rowWith(1);
    expect(await missedBefore(IDEA)).toBe(true);
    await db.settings.put({ key: `seenItems.${IDEA}`, value: JSON.stringify([{ prompt: BUILT.prompt, ref: BUILT.ref }]) });
    await confirmAnswer(BUILT, true);
    expect(await isToConfirm(IDEA)).toBe(true);
    await whenIdle();
    expect(postern.received).toHaveLength(1);
    const input = postern.received[0].input as unknown as DrillItemsRequest;
    expect(postern.received[0].grist).toMatchObject({ app: 'lampas', kind: 'drill-items' });
    expect(input.ideas.map((i) => i.id)).toEqual([IDEA]);
    expect(input.seen).toEqual([{ prompt: BUILT.prompt, ref: BUILT.ref }]);
  });

  it('counts a miss among his last answers as a miss before, even with no lapse', async () => {
    await rowWith(0, [{ when: Date.now() - DAY, right: false }]);
    expect(await missedBefore(IDEA)).toBe(true);
    await confirmAnswer(BUILT, true);
    expect(await isToConfirm(IDEA)).toBe(true);
  });

  it('marks nothing and asks nothing for an idea he never missed, or one with no row', async () => {
    await rowWith(0, [{ when: Date.now() - DAY, right: true }]);
    expect(await missedBefore(IDEA)).toBe(false);
    await confirmAnswer(BUILT, true);
    await db.reviews.clear();
    await confirmAnswer(BUILT, true);
    await whenIdle();
    expect(await isToConfirm(IDEA)).toBe(false);
    expect(postern.calls).toEqual([]);
  });

  it('marks nothing on a wrong answer, or a right one he was helped to by a Hint', async () => {
    await rowWith(1);
    await confirmAnswer(BUILT, false);
    await confirmAnswer(BUILT, true, { hinted: true });
    expect(await isToConfirm(IDEA)).toBe(false);
    expect(postern.calls).toEqual([]);
  });

  it('asks about a letter or a sound nothing: the mill is not asked about them', async () => {
    await db.reviews.put({ kind: 'grammar', id: 'letter-alpha', step: 3, rights: 0, due: 0, lastWhen: 0, lapses: 2 });
    await confirmAnswer({ ...BUILT, ideaId: 'letter-alpha' }, true);
    expect(await isToConfirm('letter-alpha')).toBe(false);
    expect(postern.calls).toEqual([]);
  });

  it('keeps the mark and sends no second ask when another right answer comes before the fresh question', async () => {
    await rowWith(1);
    await confirmAnswer(BUILT, true);
    await whenIdle();
    await confirmAnswer({ ...BUILT, prompt: 'Another built question' }, true);
    await whenIdle();
    expect(await isToConfirm(IDEA)).toBe(true);
    expect(postern.received).toHaveLength(1);
  });
});

describe('the confirm: a fresh question decides', () => {
  it('a right fresh answer clears the mark, advances the row as a right answer does, and the idea is no longer missed', async () => {
    await rowWith(1);
    await confirmAnswer(BUILT, true);
    await whenIdle();
    expect(await isToConfirm(IDEA)).toBe(true);
    const fresh = await freshQuestion();
    const before = (await reviewsOf([{ kind: 'grammar', id: IDEA }]))[0];
    await confirmAnswer(fresh, true);
    expect(await isToConfirm(IDEA)).toBe(false);
    const after = (await reviewsOf([{ kind: 'grammar', id: IDEA }]))[0];
    expect(after.rights).toBe(before.rights + 1);
    expect(after.recent?.at(-1)).toMatchObject({ right: true });
    expect(await missedBefore(IDEA)).toBe(false);
    // known: the next right answer marks nothing and asks nothing
    postern.received.length = 0;
    await confirmAnswer(BUILT, true);
    await whenIdle();
    expect(await isToConfirm(IDEA)).toBe(false);
    expect(postern.received).toHaveLength(0);
  });

  it('a wrong fresh answer clears the mark and returns the idea to missed: a miss in its row, and the next right answer marks it again', async () => {
    await rowWith(1);
    await confirmAnswer(BUILT, true);
    await whenIdle();
    const fresh = await freshQuestion();
    await confirmAnswer(fresh, false);
    expect(await isToConfirm(IDEA)).toBe(false);
    const row = (await reviewsOf([{ kind: 'grammar', id: IDEA }]))[0];
    expect(row.lapses).toBe(2);
    expect(row.recent?.at(-1)).toMatchObject({ right: false });
    expect(await missedBefore(IDEA)).toBe(true);
    await confirmAnswer(BUILT, true);
    expect(await isToConfirm(IDEA)).toBe(true);
  });

  it('does not write the row again when Review has written it (rowWritten)', async () => {
    await rowWith(1);
    await confirmAnswer(BUILT, true);
    await whenIdle();
    const fresh = await freshQuestion();
    const before = (await reviewsOf([{ kind: 'grammar', id: IDEA }]))[0];
    await confirmAnswer(fresh, true, { rowWritten: true, wasMissed: true });
    expect(await isToConfirm(IDEA)).toBe(false);
    expect((await reviewsOf([{ kind: 'grammar', id: IDEA }]))[0]).toEqual(before);
  });

  it('a fresh question on an idea never missed and not marked is just a question: no row is written', async () => {
    const fresh = await freshQuestion();
    await confirmAnswer(fresh, true);
    expect(await reviewsOf([{ kind: 'grammar', id: IDEA }])).toEqual([]);
  });
});

describe('nothing is asked when the phone cannot ask', () => {
  const marked = async () => {
    await rowWith(1);
    await confirmAnswer(BUILT, true);
    await whenIdle();
    expect(await isToConfirm(IDEA)).toBe(true);
    expect(postern.calls).toEqual([]);
    expect(await countFetchedItems(IDEA)).toBe(0);
  };

  it('offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await marked();
  });

  it('with no device key', async () => {
    localStorage.removeItem(DEVICE_KEY_STORAGE_KEY);
    await marked();
  });

  it('with no licence', async () => {
    setCurrentLicence('not-licensed');
    await marked();
  });
});

describe('what he has seen', () => {
  it('is noted before the confirm asks, so the ask carries the question just answered', async () => {
    await rowWith(1);
    expect(await listSeen(IDEA)).toEqual([]);
    const { GRAMMAR } = await import('../../src/review/kinds');
    await GRAMMAR.record({ kind: 'grammar', id: IDEA, question: BUILT, mode: 'choice' }, true);
    await whenIdle();
    const input = postern.received[0].input as unknown as DrillItemsRequest;
    expect(input.seen).toEqual([{ prompt: BUILT.prompt, ref: BUILT.ref }]);
  });
});
