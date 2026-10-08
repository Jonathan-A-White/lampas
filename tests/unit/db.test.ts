import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';

afterAll(() => db.close());

describe('the Dexie database', () => {
  it('opens at version 5 with the words, meta, settings, results and answers stores', async () => {
    await db.open();
    expect(db.name).toBe('lampas');
    expect(db.verno).toBe(5);
    expect(db.tables.map((t) => t.name).sort()).toEqual(['answers', 'meta', 'results', 'settings', 'words']);
    expect(db.words.schema.primKey.name).toBe('lemma');
    expect(db.words.schema.idxByName['lemmas']?.multi).toBe(true);
    expect(db.settings.schema.primKey.name).toBe('key');
    expect(db.results.schema.primKey.auto).toBe(true);
    expect(db.results.schema.idxByName['[lemma+when]']).toBeDefined();
    expect(db.answers.schema.primKey.auto).toBe(true);
    expect(db.answers.schema.idxByName['[ref+when]']).toBeDefined();
  });
});
