// tests/unit/witness.test.ts — each apparatus code spelled out in one line (mw-9ji6ek0.6, src/reader/witness.ts).
import { describe, expect, it } from 'vitest';
import type { VariantCode } from '../../src/data/chapter';
import { witnessLine, witnessLines } from '../../src/reader/witness';

describe('witnessLine', () => {
  const EXPECTED: Record<VariantCode, string> = {
    B: 'B: the Byzantine text is split here',
    N: 'NA27/NA28: Nestle-Aland reads this',
    C: 'NA27/NA28: Nestle-Aland reads this',
    S: 'NA27: Nestle-Aland (27th edition) reads this',
    E: 'NA28: Nestle-Aland (28th edition) reads this',
    M: 'ECM: the Editio Critica Maior reads this',
  };
  for (const code of Object.keys(EXPECTED) as VariantCode[]) {
    it(`spells out ${code}`, () => expect(witnessLine(code)).toBe(EXPECTED[code]));
  }
  it('gives each distinct line once for the codes of a reading', () => {
    expect(witnessLines(['N', 'C', 'M'])).toEqual(['NA27/NA28: Nestle-Aland reads this', 'ECM: the Editio Critica Maior reads this']);
  });
});
