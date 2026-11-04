// The hand audit's sampler (scripts/lxx/audit-sample.ts; docs/sources/lxx-settled-audit.md; stories mw-u2w5klk.24 and .29): a fresh sample takes a new, stated seed
// (`--seed <n>`), and the first audit's seed stays the default so its sample is still the one the audit file reads.
import { describe, expect, it } from 'vitest';
import { PER_POOL, SEED, countLines, draw, mulberry32, printSample, readRows, rowsOf, seedOf } from '../../scripts/lxx/audit-sample';

describe('the audit sampler takes a stated seed', () => {
  it('reads --seed, and keeps the first audit seed when none is given', () => {
    expect(seedOf([])).toBe(SEED);
    expect(seedOf(['--book', 'Gen'])).toBe(SEED);
    expect(seedOf(['--seed', '20261104'])).toBe(20261104);
  });

  it('refuses a seed that is not a whole number', () => {
    expect(() => seedOf(['--seed'])).toThrow(/seed/);
    expect(() => seedOf(['--seed', 'abc'])).toThrow(/seed/);
    expect(() => seedOf(['--seed', '-3'])).toThrow(/seed/);
  });

  it('a different seed draws different words, the same seed the same', () => {
    const pick = (seed: number): number[] => draw(1000, PER_POOL, mulberry32(seed));
    expect(pick(20261104)).toEqual(pick(20261104));
    expect(pick(20261104)).not.toEqual(pick(SEED));
  });

  it('the printout says the seed the sample was drawn with', () => {
    expect(printSample([], '/nowhere', undefined, undefined, 20261104)[0]).toMatch(/^seed 20261104;/);
    expect(printSample([], '/nowhere')[0]).toMatch(new RegExp(`^seed ${SEED};`));
  });
});

describe('--count reads one section of the audit file', () => {
  const file = [
    '## The words',
    '| ref | form | lemma | parsing | layer | lemma | parsing | evidence |',
    '| Gen.1:1#1 | α | α | N-NSM | 1 | right | right | e |',
    '| Gen.1:1#2 | β | β | N-NSM | 2 | right | wrong | e |',
    '',
    '## The re-count: the words',
    '| Gen.1:2#1 | γ | γ | N-NSM | 1 | right | right | e |',
    '| Gen.1:2#2 | δ | δ | N-NSM | 2a | wrong | wrong | e |',
    '| Gen.1:2#3 | ε | ε | N-NSM | 2a | right | unsure | e |',
    '',
    '## What this does not say',
    '| Gen.1:3#1 | ζ | ζ | N-NSM | 1 | right | right | e |',
  ].join('\n');

  it('without a section it reads the first audit, as before', () => {
    expect(rowsOf(file).map((r) => r.ref)).toEqual(['Gen.1:1#1', 'Gen.1:1#2']);
  });

  it('with a section it reads that one, up to the next heading', () => {
    expect(rowsOf(file, 'The re-count: the words').map((r) => r.ref)).toEqual(['Gen.1:2#1', 'Gen.1:2#2', 'Gen.1:2#3']);
    expect(readRows('| Gen.1:2#1 | γ | γ | N-NSM | 1 | right | right | e |')).toHaveLength(1);
  });

  it('says so when there is no such section', () => {
    expect(() => rowsOf(file, 'Nothing here')).toThrow(/Nothing here/);
  });

  it('counts the section it was given', () => {
    const lines = countLines(rowsOf(file, 'The re-count: the words')).join('\n');
    expect(lines).toMatch(/\| all \| 3 \| 1 \| 1 \| 1 \|/);
  });
});

