// The e2e specs that seed a goal's grammar ideas or count them read the ladder's own data through tests/e2e/needed-ideas.ts: a hand-copied list or a
// written count goes red when the ladder grows, which the gate's skipped Playwright run does not show (mw-5r3p30.392, mw-5r3p30.403: 37 ideas became 46).
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { goalIdeaCounts, neededIdeas, placementIdeas, placementSummary } from '../e2e/needed-ideas';

const E2E = 'tests/e2e';
const specs = readdirSync(E2E)
  .filter((name) => name.endsWith('.ts') && name !== 'needed-ideas.ts')
  .map((name) => ({ name, text: readFileSync(`${E2E}/${name}`, 'utf8') }));

// a number of ideas written by hand: 'of 46 ideas', 'Not yet 37' in the ideas legend, 'solid 70' on the placement's end card, or a list of idea ids
const HAND_WRITTEN: [string, RegExp][] = [
  ['an "of N ideas" count', /of \d+ ideas/],
  ['an ideas legend count', /ideas-legend'\)\)\.toHaveText\('[^']*\d/],
  ['a placement end card count', /Where you are: solid \d/],
  ['a copied list of needed ideas', /=\s*\[\s*'alphabet',\s*'diphthongs',/],
];

describe('the e2e specs and the ideas a goal needs', () => {
  it.each(HAND_WRITTEN)('no spec writes %s by hand', (_what, pattern) => {
    expect(specs.filter((s) => pattern.test(s.text)).map((s) => s.name)).toEqual([]);
  });

  it('the shared helper reads what the app works out for 1 John 1:1', async () => {
    const needed = await neededIdeas('1 John 1:1');
    expect(needed).toContain('alphabet');
    expect(new Set(needed).size).toBe(needed.length);
    const walk = await placementIdeas('1 John 1:1');
    for (const id of needed) expect(walk).toContain(id);
    expect((await placementSummary('1 John 1:1', {})).total).toBe(needed.length);
    expect(await goalIdeaCounts('1 John 1:1', { alphabet: 'solid' })).toEqual({ solid: 1, frontier: 0, notYet: needed.length - 1, total: needed.length });
  });
});
