// One grammar path (mw-foy5mb.1): Lampas teaches by its own ladder for everyone. The approaches stay data (src/approaches/, one file each),
// BMA Tutor's file stays as the record of BMA's order but no app code reads it, and a phone that saved the BMA choice reads as the ladder.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { APPROACHES, DEFAULT_APPROACH, approachOf } from '../../src/approaches';
import { ladder } from '../../src/approaches/ladder';
import { db } from '../../src/data/db';
import { getGrammarApproach } from '../../src/data/repositories';
import { listLevels, setLevel } from '../../src/data/repositories/grammarLevels';
import { writeSetting } from '../../src/settings/registry';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe('the one path', () => {
  it('lists the ladder alone and makes it the default', () => {
    expect(APPROACHES).toEqual([ladder]);
    expect(DEFAULT_APPROACH).toBe('ladder');
    expect(approachOf('ladder')).toBe(ladder);
  });

  it("names BMA Tutor in no file under src/ but its own record, src/approaches/bma-tutor.ts", () => {
    const hits = sourceFiles('src')
      .filter((file) => file !== join('src', 'approaches', 'bma-tutor.ts'))
      .filter((file) => /bmaTutor|bma-tutor|BMA Tutor/.test(readFileSync(file, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('keeps the record file with its header comment', () => {
    expect(readFileSync('src/approaches/bma-tutor.ts', 'utf8')).toContain(
      "Not listed: the record of BMA Tutor's order, read by the gap audit (docs/path-gaps.md).",
    );
  });
});

describe('a phone that saved the BMA Tutor choice', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.settings.clear(), db.grammarLevels.clear(), db.reviews.clear()]);
  });
  afterAll(() => db.close());

  it('reads as the ladder, with every idea level and schedule row unchanged', async () => {
    await setLevel('alphabet', 'solid', 'marked');
    await setLevel('case-genitive', 'frontier', 'marked');
    const review = { kind: 'grammar', id: 'case-genitive', step: 2, due: 1_700_000_000_000, lastWhen: 1_699_000_000_000, lapses: 1, rights: 1 };
    await db.reviews.put(review);
    await db.settings.put({ key: 'grammarApproach', value: 'bma-tutor' });
    const levels = await db.grammarLevels.toArray();

    expect(await getGrammarApproach()).toBe('ladder');
    expect(await db.grammarLevels.toArray()).toEqual(levels);
    expect((await listLevels()).get('case-genitive')?.level).toBe('frontier');
    expect(await db.reviews.toArray()).toEqual([review]);
    expect(await db.settings.get('grammarApproach')).toEqual({ key: 'grammarApproach', value: 'bma-tutor' });
  });

  it('is written as the ladder when the tutor or Settings undoes to the old choice', async () => {
    await writeSetting('grammarApproach', 'bma-tutor');
    expect(await getGrammarApproach()).toBe('ladder');
    expect((await db.settings.get('grammarApproach'))?.value).toBe('ladder');
  });
});
