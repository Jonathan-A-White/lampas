import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';

afterAll(() => db.close());

describe('the Dexie database', () => {
  it('opens at version 2 with the words and meta stores', async () => {
    await db.open();
    expect(db.name).toBe('lampas');
    expect(db.verno).toBe(2);
    expect(db.tables.map((t) => t.name).sort()).toEqual(['meta', 'words']);
    expect(db.words.schema.primKey.name).toBe('lemma');
    expect(db.words.schema.idxByName['lemmas']?.multi).toBe(true);
  });
});
