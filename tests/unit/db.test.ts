import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';

afterAll(() => db.close());

describe('the Dexie database', () => {
  it('opens at version 3 with the words, meta and settings stores', async () => {
    await db.open();
    expect(db.name).toBe('lampas');
    expect(db.verno).toBe(3);
    expect(db.tables.map((t) => t.name).sort()).toEqual(['meta', 'settings', 'words']);
    expect(db.words.schema.primKey.name).toBe('lemma');
    expect(db.words.schema.idxByName['lemmas']?.multi).toBe(true);
    expect(db.settings.schema.primKey.name).toBe('key');
  });
});
