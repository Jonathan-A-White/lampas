import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';

afterAll(() => db.close());

describe('the Dexie database', () => {
  it('opens at version 1 with no stores yet', async () => {
    await db.open();
    expect(db.name).toBe('lampas');
    expect(db.verno).toBe(1);
    expect(db.tables).toHaveLength(0);
  });
});
