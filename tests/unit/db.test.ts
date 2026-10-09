import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';

afterAll(() => db.close());

describe('the Dexie database', () => {
  it('opens at version 12 with the words, meta, settings, results, answers, talks, drills, readings, grammarKnown, grammarLevels, reviews and usage stores', async () => {
    await db.open();
    expect(db.name).toBe('lampas');
    expect(db.verno).toBe(12);
    expect(db.tables.map((t) => t.name).sort()).toEqual(['answers', 'drills', 'grammarKnown', 'grammarLevels', 'meta', 'readings', 'results', 'reviews', 'settings', 'talks', 'usage', 'words']);
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
    expect(db.readings.schema.primKey.name).toBe('ref');
    expect(db.grammarKnown.schema.primKey.name).toBe('term');
    expect(db.grammarLevels.schema.primKey.name).toBe('id');
    expect(db.grammarLevels.schema.idxByName['level']).toBeDefined();
    expect(db.reviews.schema.primKey.keyPath).toEqual(['kind', 'id']);
    expect(db.reviews.schema.idxByName['due']).toBeDefined();
    expect(db.reviews.schema.idxByName['kind']).toBeDefined();
    expect(db.usage.schema.primKey.name).toBe('key');
    expect(db.usage.schema.idxByName['day']).toBeDefined();
    expect(db.usage.schema.idxByName['name']).toBeDefined();
  });
});
