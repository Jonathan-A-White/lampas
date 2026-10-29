// mw-5r3p30.756: an example that expects one work link must also expect no second one, or a second work beside the one
// asked for (the flake mw-5r3p30.751 fixed) passes unseen. A no-link example (links.0 absent) is left as it is.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import '../support/grinds-in-graph';

const DIR = 'grinds/examples/bible-talk';
type Expect = Record<string, { equals?: string; present?: boolean }>;

const oneWorkLink = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ f, expect: (JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as { expect: Expect }).expect }))
  .filter(({ expect: e }) => e['links.0.kind']?.equals === 'work');

describe('the bible-talk examples that expect one work link', () => {
  it('are the three that are known', () => {
    expect(oneWorkLink.map(({ f }) => f).sort()).toEqual([
      'work-at-its-place.json',
      'work-link-calvin-commentary.json',
      'works-commentary-at-the-passage.json',
    ]);
  });
  it.each(oneWorkLink.map(({ f, expect: e }) => [f, e] as const))('%s expects links.1 absent', (_f, e) => {
    expect(e['links.1']).toEqual({ present: false });
  });
});
