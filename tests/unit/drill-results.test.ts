import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { listDrillResults, recordDrillStep } from '../../src/data/repositories';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.drills.clear();
});

describe('the Parsing drill results', () => {
  it('keeps each answer per word and step, oldest first', async () => {
    await recordDrillStep('λέγω', 'pos', true, 1);
    await recordDrillStep('λέγω', 'tense', false, 2);
    await recordDrillStep('λέγω', 'tense', true, 3);
    await recordDrillStep('θεός', 'tense', true, 4);
    expect((await listDrillResults('λέγω')).map((r) => [r.step, r.right])).toEqual([['pos', true], ['tense', false], ['tense', true]]);
    expect((await listDrillResults('λέγω', 'tense')).map((r) => r.when)).toEqual([2, 3]);
    expect(await listDrillResults('οὐ')).toEqual([]);
  });
});
