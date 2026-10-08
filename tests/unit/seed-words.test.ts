// The generated seed (src/data/seed-words.ts) must match the example md it is built from, and hold the
// owner's counts: 63 distinct lemmas, 54 at lessons 1-9 and 9 at lesson 10.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SEED_WORDS } from '../../src/data/seed-words';
import { parseExampleWords, renderSeed } from '../../scripts/seed-build';

const md = readFileSync('docs/example-words.md', 'utf8');

describe('the example word list seed', () => {
  it('has 63 distinct lemmas, 54 at lessons 1-9 and 9 at lesson 10', () => {
    expect(SEED_WORDS).toHaveLength(63);
    expect(new Set(SEED_WORDS.map((w) => w.lemma)).size).toBe(63);
    expect(SEED_WORDS.filter((w) => w.lesson <= 9)).toHaveLength(54);
    expect(SEED_WORDS.filter((w) => w.lesson === 10)).toHaveLength(9);
  });

  it('matches docs/example-words.md as the build script reads it', () => {
    expect(SEED_WORDS).toEqual(parseExampleWords(md));
  });

  it('is exactly what seed:build would write', () => {
    expect(readFileSync('src/data/seed-words.ts', 'utf8')).toBe(renderSeed(parseExampleWords(md)));
  });

  it('collapses a repeated lemma to one entry at its lowest lesson', () => {
    const table = [
      '| # | Greek lemma | Lvl | Lsn | English gloss | Part of speech | note |',
      '|---|---|---|---|---|---|---|',
      '| 1 | λόγος, -ου, ὁ | 1 | 4 | word | Noun | |',
      '| 2 | λόγος, -ου, ὁ | 1 | 2 | word | Noun | dup |',
    ].join('\n');
    expect(parseExampleWords(table)).toEqual([{ lemma: 'λόγος, -ου, ὁ', gloss: 'word', lesson: 2, pos: 'Noun' }]);
  });
});
