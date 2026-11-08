// tests/unit/lxx-gen14-horse.test.ts — Genesis 14 was the one chapter of Genesis not shipped (mw-u2w5klk.298): τὴν ἵππον (14:11, 14:16, 14:21), a feminine article before a noun the New Testament has as a masculine,
// is three agreement breaks in 522 words, 5.7 per 1,000 against the bar's 5. The model's answers were N-ASM, so the break stood; the Septuagint's ἵππος here is the cavalry, a feminine, and the answer is N-ASF
// (a guess: it is outside the candidates, the New Testament having no feminine ἵππος). The chapter bar counts a break once the two answers agree no more.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const rows = readFileSync('data/lxx/choices/gen-03.tsv', 'utf8')
  .split('\n')
  .map((l) => l.split('\t'));

describe('Genesis 14, τὴν ἵππον', () => {
  it.each(['Gen.14:11#4', 'Gen.14:16#5', 'Gen.14:21#13'])('%s is answered as the feminine, marked a guess', (ref) => {
    const row = rows.find((r) => r[0] === ref);
    expect(row?.slice(1, 4)).toEqual(['N-ASF', 'ἵππος', 'guess']);
  });

  it('has the feminine article before each', () => {
    for (const ref of ['Gen.14:11#3', 'Gen.14:16#4', 'Gen.14:21#11']) expect(rows.find((r) => r[0] === ref)?.[1]).toBe('T-ASF');
  });
});
