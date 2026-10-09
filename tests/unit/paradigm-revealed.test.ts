import { beforeEach, describe, expect, it } from 'vitest';
import { forgetRevealed, hideAll, revealedOf, toggleRevealed } from '../../src/data/paradigms/revealed';

describe('the revealed cells', () => {
  beforeEach(forgetRevealed);

  it('start empty, and a toggle shows a cell and a second toggle hides it', () => {
    expect([...revealedOf('article')]).toEqual([]);
    expect([...toggleRevealed('article', 'Genitive Singular Masculine')]).toEqual(['Genitive Singular Masculine']);
    expect(revealedOf('article').has('Genitive Singular Masculine')).toBe(true);
    expect([...toggleRevealed('article', 'Genitive Singular Masculine')]).toEqual([]);
  });

  it('are kept per table, and Hide all empties one table only', () => {
    toggleRevealed('article', 'a');
    toggleRevealed('eimi', 'b');
    hideAll('article');
    expect([...revealedOf('article')]).toEqual([]);
    expect([...revealedOf('eimi')]).toEqual(['b']);
  });
});
