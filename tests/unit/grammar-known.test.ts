import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { isTermKnown, listKnownTerms, setTermKnown } from '../../src/data/repositories/grammar';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.grammarKnown.clear();
});

describe('the terms he marked I know this', () => {
  it('keeps a term he marks, once, and forgets it when he unmarks it', async () => {
    expect(await listKnownTerms()).toEqual([]);
    await setTermKnown('conjunction', true, 5);
    await setTermKnown('conjunction', true, 9);
    await setTermKnown('aorist', true, 7);
    expect((await listKnownTerms()).sort()).toEqual(['aorist', 'conjunction']);
    expect(await isTermKnown('conjunction')).toBe(true);
    expect(await db.grammarKnown.get('conjunction')).toEqual({ term: 'conjunction', since: 9 });
    await setTermKnown('conjunction', false);
    expect(await isTermKnown('conjunction')).toBe(false);
    expect(await listKnownTerms()).toEqual(['aorist']);
  });
});
