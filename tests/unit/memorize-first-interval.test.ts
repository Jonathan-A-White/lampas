// tests/unit/memorize-first-interval.test.ts — mw-5r3p30.1200: a verse learned from nothing in one sitting (Next step from step 1 to 'step 7 of 7') is due tomorrow, not 90 days out
// (Jeremiah 17:9 showed 'Due Feb 16, 2027'). Only a climb in the learning sitting is held; a real review keeps the growth rule; the v35 upgrade brings the rows the old rule wrote to the same.
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearBus } from '../../src/events/bus';
import { db } from '../../src/data/db';
import { DAY, RARE_STEP, gapOf } from '../../src/data/schedule';
import { startOfDay } from '../../src/data/startOfDay';
import type { MemorizeLang } from '../../src/memorize/languages';
import { advanceStep, memorize, memorizedRowOf, recordRecall } from '../../src/data/repositories/memorize';
import { dueWords } from '../../src/memorize/due';

const D = Date.UTC(2026, 10, 18, 9, 0, 0); // Nov 18 2026, 09:00 UTC (TZ=UTC)
const ref = 'Jer.17.9';
const NEXT_DAY = startOfDay(D) + DAY;

beforeEach(async () => {
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear()]);
});
afterEach(clearBus);
afterAll(() => db.close());

const recall = (lang: MemorizeLang, score: number, rung = 0) => ({ ref, lang, rung, score, missed: [], asked: [{ token: 'the', lang: 'en' as const }], how: 'said' as const });

/** The whole climb of a sitting: a recall that passes at each step, then Next step, from `from` to the last step. */
async function climb(lang: MemorizeLang, from: number, at: number): Promise<void> {
  for (let step = from; step < RARE_STEP; step++) {
    await recordRecall(recall(lang, 1, step), at + step * 1000);
    await advanceStep(ref, lang, step, at + step * 1000 + 500);
  }
  await recordRecall(recall(lang, 1, RARE_STEP), at + 10_000);
}

describe('a verse learned in one sitting is due tomorrow', () => {
  for (const lang of ['en', 'el', 'he', 'weave'] as const) {
    it(`${lang}: from nothing, step 1 to step 7 of 7, is due the next day and not 90 days out`, async () => {
      await memorize(ref, [lang], D);
      await climb(lang, 0, D);
      const row = await memorizedRowOf(ref, lang);
      expect(row?.step).toBe(RARE_STEP);
      expect(startOfDay(row?.due ?? 0)).toBe(NEXT_DAY);
      expect(row?.due).toBeLessThan(D + 2 * DAY);
      expect(dueWords(row?.due ?? 0, D + 10_000)).toBe('Due tomorrow');
    });
  }

  it('a partial start (a verse begun at step 3) climbed to the last step is due the next day too', async () => {
    await db.reviews.put({ kind: 'verse', id: `en:${ref}`, step: 3, due: D, lastWhen: D - 20 * DAY, lapses: 0, rights: 0 });
    await climb('en', 3, D);
    const row = await memorizedRowOf(ref, 'en');
    expect(row?.step).toBe(RARE_STEP);
    expect(startOfDay(row?.due ?? 0)).toBe(NEXT_DAY);
  });

  it('each step of the climb is due tomorrow, none sooner and none later', async () => {
    await memorize(ref, ['en'], D);
    for (let step = 0; step < RARE_STEP; step++) {
      await recordRecall(recall('en', 1, step), D + step * 1000);
      await advanceStep(ref, 'en', step, D + step * 1000);
      expect((await memorizedRowOf(ref, 'en'))?.due).toBe(D + step * 1000 + DAY);
    }
  });
});

describe('what follows the first day', () => {
  it('a review passed the next day grows the interval by the scheduler\'s rule; one missed drops two steps and is due tomorrow', async () => {
    await memorize(ref, ['en'], D);
    await memorize(ref, ['el'], D);
    await climb('en', 0, D);
    await climb('el', 0, D);
    const day2 = D + DAY + 3600_000;
    await recordRecall(recall('en', 1, RARE_STEP), day2);
    const kept = await memorizedRowOf(ref, 'en');
    expect(kept?.step).toBe(RARE_STEP);
    expect(kept?.due).toBe(day2 + gapOf(RARE_STEP));
    expect(kept?.due).toBeGreaterThan(NEXT_DAY + DAY);
    await recordRecall(recall('el', 0, RARE_STEP), day2);
    const dropped = await memorizedRowOf(ref, 'el');
    expect(dropped?.step).toBe(RARE_STEP - 2);
    expect(dropped?.due).toBe(day2 + DAY);
  });

  it('a verse stopped half way up, passed twice on the days it is due, moves up a step by the scheduler\'s rule', async () => {
    await memorize(ref, ['en'], D);
    await recordRecall(recall('en', 1, 0), D);
    await advanceStep(ref, 'en', 0, D + 1000);
    await recordRecall(recall('en', 1, 1), D + 2000); // early practice: the row stays
    await advanceStep(ref, 'en', 1, D + 3000);
    expect((await memorizedRowOf(ref, 'en'))?.step).toBe(2);
    await recordRecall(recall('en', 1, 2), D + DAY);
    expect(await memorizedRowOf(ref, 'en')).toMatchObject({ step: 2, due: D + DAY + gapOf(2) });
    await recordRecall(recall('en', 1, 2), D + DAY + gapOf(2));
    expect((await memorizedRowOf(ref, 'en'))?.step).toBe(3);
  });
});

describe('advanceStep on a real review', () => {
  it('keeps the growth rule: a verse recalled on an earlier day, whose due day has come, is due after the gap of the step it moves to', async () => {
    await memorize(ref, ['en'], D);
    await recordRecall(recall('en', 1, 0), D);
    const day2 = D + DAY;
    await recordRecall(recall('en', 1, 0), day2);
    await advanceStep(ref, 'en', 0, day2 + 500);
    expect(await memorizedRowOf(ref, 'en')).toMatchObject({ step: 1, due: day2 + 500 + gapOf(1) });
  });

  it('a verse with no recall at all and a due day come is put on the schedule and held to tomorrow, as a climb of the sitting', async () => {
    await advanceStep(ref, 'en', 0, D);
    expect(await memorizedRowOf(ref, 'en')).toMatchObject({ step: 1, due: D + DAY });
  });
});

describe('the v35 upgrade of rows the old rule wrote', () => {
  const V34 = {
    words: 'lemma, lesson, state, *lemmas', meta: 'key', settings: 'key', results: '++id, [lemma+when]', answers: '++id, [ref+when]', talks: '++id, [ref+when]', drills: '++id, lemma, [lemma+step]',
    readings: 'ref', grammarKnown: 'term', reviews: '[kind+id], due, kind', grammarLevels: 'id, level', usage: 'key, day, name', tips: 'id, status', talkPictures: '++id, turnId',
    shares: 'id, createdAt', requests: 'txid, sentAt, status', readingHistory: '++id, ref, [lang+at]', missTally: '[lang+unit], lang', ladder: 'lang', drillRuns: '++id, ideaId, at',
    passageLessons: 'key, state', pictureRefs: 'hash, at', talkSummaries: 'ref', library: 'id, kind', exportRows: 'resource', verseLists: '++id, created', recalls: '++id, [ref+lang], when',
    diagrams: '[ref+lang+version]', readingSets: 'id',
  };
  const verse = (id: string, over: Record<string, unknown> = {}) => ({ kind: 'verse', id, step: RARE_STEP, due: D + gapOf(RARE_STEP), lastWhen: D, lapses: 0, rights: 0, ...over });
  const said = (r: string, lang: string, when: number) => ({ ref: r, lang, when, rung: 0, score: 1, missed: [], asked: [], gap: 0, how: 'said' });

  it('brings a verse climbed in its learning sitting to the day after, and leaves a verse reviewed on a later day alone', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(34).stores(V34);
    await old.open();
    await old.table('reviews').bulkPut([
      verse('en:Jer.17.9'), // Jeremiah 17:9 in English: learned on D, due Feb 16, 2027
      verse('el:Jer.17.9', { step: 3, due: D + gapOf(3) }), // a partial climb
      verse('en:Rom.8.28', { step: 4, due: D + gapOf(4), lastWhen: D + 2 * DAY }), // reviewed on a later day
      verse('en:Ps.23.1', { step: 2, due: D + gapOf(2), rights: 1 }), // a right counted: not a climb
      verse('en:Ps.1.1', { step: 0, due: D + DAY }), // already tomorrow
      { kind: 'word', id: 'en:blessed', step: 5, due: D + gapOf(5), lastWhen: D, lapses: 0, rights: 0 }, // a word, not a verse
    ]);
    await old.table('recalls').bulkPut([
      said('Jer.17.9', 'en', D), said('Jer.17.9', 'el', D + 5000), said('Rom.8.28', 'en', D), said('Rom.8.28', 'en', D + 2 * DAY), said('Ps.23.1', 'en', D),
    ]);
    old.close();
    await db.open();
    const due = async (kind: string, id: string) => (await db.reviews.get([kind, id]))?.due;
    expect(db.verno).toBe(35);
    expect(await due('verse', 'en:Jer.17.9')).toBe(D + DAY);
    expect(await due('verse', 'el:Jer.17.9')).toBe(D + DAY);
    expect(await due('verse', 'en:Rom.8.28')).toBe(D + gapOf(4));
    expect(await due('verse', 'en:Ps.23.1')).toBe(D + gapOf(2));
    expect(await due('verse', 'en:Ps.1.1')).toBe(D + DAY);
    expect(await due('word', 'en:blessed')).toBe(D + gapOf(5));
  });
});
