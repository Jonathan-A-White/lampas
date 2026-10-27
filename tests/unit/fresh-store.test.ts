// Lampas on learn-kit/fresh (mw-74h98vg.1): the ledger, the marks and the kept items are the kit's, over a Dexie-backed FreshStore and StockStore under the keys mw-indx1x6 wrote
// (seenItems.<idea>, toConfirm, fetchedItems.<idea>), so a phone updated mid-way keeps what it had. A store written in the old shape is read through the kit here.
import { asked, createStock, isFresh, isToConfirm, markAsked, recordAnswer, toConfirm } from 'learn-kit/fresh';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { MAX_KEPT, MAX_SEEN, seenKey } from '../../src/data/grammar/fetchedItems';
import { PROVED_STREAK, answer, start, type DrillWalk } from '../../src/data/grammar/drillIt';
import { ideaOf } from '../../src/data/grammar/ladder';
import type { Level } from '../../src/data/grammar/needs';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { freshStore, keptStore, questionKey } from '../../src/data/repositories/freshStore';
import { listSeen } from '../../src/data/repositories';

const IDEA = 'declension-2';
const question = (n: number, idea = IDEA): GrammarQuestion => ({ kind: 'tap-form', ideaId: idea, prompt: `Tap form ${n}`, options: ['a', 'b', 'c', 'd'], right: 'a', ref: '1 John 1:1' });

beforeEach(async () => {
  localStorage.clear();
  await db.open();
  await db.settings.clear();
});

describe('a store written in the old shape, read through the kit', () => {
  it('reads the seen questions as the kit\'s ledger: their keys are seenKey, oldest first', async () => {
    await db.settings.put({
      key: `seenItems.${IDEA}`,
      value: JSON.stringify([
        { prompt: 'Tap form 1', ref: '1 John 1:1' },
        { prompt: 'Tap form 2', ref: '1 John 1:1' },
      ]),
    });
    expect(await asked(freshStore, IDEA)).toEqual([seenKey({ prompt: 'Tap form 1', ref: '1 John 1:1' }), seenKey({ prompt: 'Tap form 2', ref: '1 John 1:1' })]);
    expect(await isFresh(freshStore, IDEA, questionKey(question(1)))).toBe(false);
    expect(await isFresh(freshStore, IDEA, questionKey(question(3)))).toBe(true);
    // an idea's ledger is its own
    expect(await asked(freshStore, 'case-genitive')).toEqual([]);
  });

  it('writes the ledger back in the same shape (a prompt and a verse), the newest MAX_SEEN, under the same key', async () => {
    await db.settings.put({ key: `seenItems.${IDEA}`, value: JSON.stringify([{ prompt: 'Tap form 1', ref: '1 John 1:1' }]) });
    await markAsked(freshStore, IDEA, questionKey(question(2)));
    expect(JSON.parse((await db.settings.get(`seenItems.${IDEA}`))?.value as string)).toEqual([
      { prompt: 'Tap form 1', ref: '1 John 1:1' },
      { prompt: 'Tap form 2', ref: '1 John 1:1' },
    ]);
    for (let n = 3; n < MAX_SEEN + 5; n++) await markAsked(freshStore, IDEA, questionKey(question(n)));
    expect(await listSeen(IDEA)).toHaveLength(MAX_SEEN);
  });

  it('reads the marks: toConfirm is the list of idea ids under the key "toConfirm"', async () => {
    await db.settings.put({ key: 'toConfirm', value: JSON.stringify([IDEA, 'case-genitive']) });
    expect(await toConfirm(freshStore)).toEqual([IDEA, 'case-genitive']);
    expect(await isToConfirm(freshStore, IDEA)).toBe(true);
    // a verdict of the kit writes the same key
    await recordAnswer(freshStore, IDEA, questionKey(question(7)), false, { missedBefore: true });
    expect(JSON.parse((await db.settings.get('toConfirm'))?.value as string)).toEqual(['case-genitive']);
  });

  it('serves the kept items through the kit\'s stock: oldest first, once, a seen one dropped', async () => {
    await db.settings.put({ key: `fetchedItems.${IDEA}`, value: JSON.stringify([question(1), question(2), question(3)]) });
    await db.settings.put({ key: `seenItems.${IDEA}`, value: JSON.stringify([{ prompt: 'Tap form 1', ref: '1 John 1:1' }]) });
    const stock = createStock<GrammarQuestion>({ ask: async () => [], keyOf: questionKey, store: keptStore, fresh: freshStore, cap: MAX_KEPT });
    expect(await stock.take(IDEA)).toMatchObject({ prompt: 'Tap form 2' });
    expect(await stock.count(IDEA)).toBe(1);
    expect(JSON.parse((await db.settings.get(`fetchedItems.${IDEA}`))?.value as string)).toEqual([question(3)]);
    expect(await stock.take(IDEA)).toMatchObject({ prompt: 'Tap form 3' });
    expect(await db.settings.get(`fetchedItems.${IDEA}`)).toBeUndefined();
  });
});

describe('Prove it counts only fresh keys (answerWalk\'s isFresh)', () => {
  const romans8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const PROVE = 'case-genitive';
  const solid = new Map<string, Level>(ideaOf(PROVE).needs.map((id) => [id, 'solid']));

  /** A walk at its top step with one right in a row behind it, the question now asked being one with a verse. */
  const atTheTop = (seen?: ReadonlySet<string>): DrillWalk => {
    const walk = start(PROVE, solid, { passage: [romans8], seed: 1 });
    if ('needs' in walk) throw new Error('the foundation is not solid');
    const top = walk.steps[walk.steps.length - 1];
    const current = top.questions.find((q) => q.ref) ?? null;
    expect(current).not.toBeNull();
    return { ...walk, step: top.step, current, streak: PROVED_STREAK - 1, ...(seen ? { seen } : {}) };
  };

  it('proves the idea on a right answer to a question he has not been asked', () => {
    expect(answer(atTheTop(), true, false).result).toMatchObject({ proved: true, ended: 'proved' });
  });

  it('does not count a right answer on a question in the ledger, and does not break the run', () => {
    const walk = atTheTop();
    const q = walk.current as GrammarQuestion;
    const after = answer({ ...walk, seen: new Set([seenKey({ prompt: q.prompt, ref: q.ref ?? '' })]) }, true, false);
    expect(after.result).toBeNull();
    expect(after.streak).toBe(PROVED_STREAK - 1);
  });

  it('is given the ledger by the walk\'s start: a question he has been asked is left out of its steps and, were it asked, counts for nothing', () => {
    const q = atTheTop().current as GrammarQuestion;
    const seen = new Set([seenKey({ prompt: q.prompt, ref: q.ref ?? '' })]);
    const walk = start(PROVE, solid, { passage: [romans8], seed: 1, seen });
    if ('needs' in walk) throw new Error('the foundation is not solid');
    expect(walk.seen).toBe(seen);
  });
});
