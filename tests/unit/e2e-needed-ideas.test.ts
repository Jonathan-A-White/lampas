// tests/e2e/needed-ideas.ts is the list the placement specs mark solid so that nothing is left to ask: it must be the ideas 1 John 1:1 needs now, or those specs
// (and the 'of N ideas' in the goal specs) go red when the ladder grows, which the gate's skipped Playwright run does not show (mw-5r3p30.392).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import { parseGoal } from '../../src/data/goal';
import { passageNeeds } from '../../src/data/grammar/needs';
import { NEEDED } from '../e2e/needed-ideas';

describe('the ideas the e2e specs mark solid', () => {
  it('are the ideas 1 John 1:1 needs', async () => {
    const goal = parseGoal('1 John 1:1', BOOK_INDEX);
    expect(goal).toBeDefined();
    const load = async (book: string, n: number) => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8'));
    const needs = await passageNeeds(goal!, load, BOOK_INDEX);
    expect([...NEEDED].sort()).toEqual(needs.ideas.map((i) => i.id).sort());
  });

  it('are the count the goal specs write in their patterns', () => {
    expect(NEEDED).toHaveLength(46);
  });
});
