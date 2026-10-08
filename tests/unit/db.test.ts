import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';

afterAll(() => db.close());

describe('the Dexie database', () => {
  it('opens at version 7 with the words, meta, settings, results, answers, talks and drills stores', async () => {
    await db.open();
    expect(db.name).toBe('lampas');
    expect(db.verno).toBe(7);
    expect(db.tables.map((t) => t.name).sort()).toEqual(['answers', 'drills', 'meta', 'results', 'settings', 'talks', 'words']);
    expect(db.words.schema.primKey.name).toBe('lemma');
    expect(db.words.schema.idxByName['lemmas']?.multi).toBe(true);
    expect(db.settings.schema.primKey.name).toBe('key');
    expect(db.results.schema.primKey.auto).toBe(true);
    expect(db.results.schema.idxByName['[lemma+when]']).toBeDefined();
    expect(db.answers.schema.primKey.auto).toBe(true);
    expect(db.answers.schema.idxByName['[ref+when]']).toBeDefined();
    expect(db.talks.schema.primKey.auto).toBe(true);
    expect(db.talks.schema.idxByName['[ref+when]']).toBeDefined();
    expect(db.drills.schema.primKey.auto).toBe(true);
    expect(db.drills.schema.idxByName['[lemma+step]']).toBeDefined();
  });
});
