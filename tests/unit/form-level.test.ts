// formPasses (mw-hqd5bz.9): whether a form's grammar stands at the Weave's grammar dial, from the levels of its ideas.
import { describe, expect, it } from 'vitest';
import type { GrammarLevel, GrammarLevelName } from '../../src/data/db';
import { formPasses } from '../../src/data/grammar/formLevel';
import { ALWAYS_NEEDED, ideasOf } from '../../src/data/grammar/ladder';

const levelsOf = (ids: readonly string[], level: GrammarLevelName): Map<string, GrammarLevel> =>
  new Map(ids.map((id) => [id, { id, level, since: 0, how: 'placement' as const }]));

const NEEDED = [...ideasOf('N-GSF'), ...ALWAYS_NEEDED];

/** Every idea of N-GSF solid, except `id` which has `level` (or no row at all when level is undefined). */
function allSolidBut(id: string, level?: GrammarLevelName): Map<string, GrammarLevel> {
  const map = levelsOf(NEEDED, 'solid');
  map.delete(id);
  if (level) map.set(id, { id, level, since: 0, how: 'placement' });
  return map;
}

describe('formPasses', () => {
  it("lets every form through at 'any', even with no levels at all", () => {
    expect(formPasses('N-GSF', new Map(), 'any')).toBe(true);
  });

  it('names noun, genitive, singular, feminine and the always-needed ideas for N-GSF', () => {
    expect(NEEDED).toEqual(expect.arrayContaining(['noun', 'case-genitive', 'number-singular', 'gender-feminine', 'alphabet', 'breathings', 'accents']));
  });

  it("passes N-GSF at 'solid' only when all of its ideas are solid", () => {
    expect(formPasses('N-GSF', levelsOf(NEEDED, 'solid'), 'solid')).toBe(true);
    for (const id of NEEDED) {
      expect(formPasses('N-GSF', allSolidBut(id, 'frontier'), 'solid'), `${id} frontier`).toBe(false);
      expect(formPasses('N-GSF', allSolidBut(id, 'notYet'), 'solid'), `${id} notYet`).toBe(false);
      expect(formPasses('N-GSF', allSolidBut(id), 'solid'), `${id} with no row`).toBe(false);
    }
  });

  it("passes N-GSF at 'solid+frontier' when any one of its ideas is frontier", () => {
    for (const id of NEEDED) expect(formPasses('N-GSF', allSolidBut(id, 'frontier'), 'solid+frontier'), id).toBe(true);
    expect(formPasses('N-GSF', levelsOf(NEEDED, 'frontier'), 'solid+frontier')).toBe(true);
    expect(formPasses('N-GSF', levelsOf(NEEDED, 'solid'), 'solid+frontier')).toBe(true);
  });

  it("fails N-GSF at 'solid+frontier' when one of its ideas is notYet or has no level", () => {
    for (const id of NEEDED) {
      expect(formPasses('N-GSF', allSolidBut(id, 'notYet'), 'solid+frontier'), `${id} notYet`).toBe(false);
      expect(formPasses('N-GSF', allSolidBut(id), 'solid+frontier'), `${id} with no row`).toBe(false);
    }
  });

  it('leaves a form without a parsing code English when the dial is not any', () => {
    expect(formPasses('', levelsOf(NEEDED, 'solid'), 'solid')).toBe(false);
    expect(formPasses('', new Map(), 'any')).toBe(true);
  });
});
