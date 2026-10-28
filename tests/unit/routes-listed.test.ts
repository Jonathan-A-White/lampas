// Every Route of src/nav/route.ts is in the two e2e lists that walk the screens, or in a named exclusion below with its reason (mw-5r3p30.788):
// tests/e2e/cold-start-address.spec.ts ('a reload on any screen keeps its address') and tests/e2e/split-screen-header.spec.ts (the shared header at six sizes).
// A new route fails here until it is added to both lists or excluded, so the next one cannot be missed.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '../../src/nav/route';

/** The strings of the `const SCREENS = [...]` array of a spec file. */
function screensOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const body = /const SCREENS = \[([^\]]*)\]/.exec(source)?.[1];
  if (body === undefined) throw new Error(`${file} has no 'const SCREENS = [...]'`);
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const COLD_START = 'tests/e2e/cold-start-address.spec.ts';
const SPLIT_SCREEN = 'tests/e2e/split-screen-header.spec.ts';

/** A route left out of a list, with the one line why. */
const EXCLUDED: Record<string, Record<string, string>> = {
  [COLD_START]: {
    home: 'the Reader: the same spec reloads it above (#/?b=Rom&c=8&view=...), its address carries a chapter',
    essay: 'its address is #/preface/robinson, not #/essay, so the list\'s `#/${screen}` is not its address',
    lessons: 'its address is #/lessons/variants, not #/lessons, so the list\'s `#/${screen}` is not its address; tests/e2e/variant-lessons.spec.ts opens it',
    memorize: 'the bare address opens the next verse that is due and moves on to a session address (#/memorize/<ref>/<lang>)',
    share: 'the first test of the file, which needs a share to show',
    unlock: 'the licence page: openUnlocked leaves it, a licensed page goes back to the Reader',
  },
  [SPLIT_SCREEN]: {
    home: 'the Reader: the first test of the file walks its own header at the six sizes',
    lessons: 'its address is #/lessons/variants, not #/lessons, so the list\'s `#/${route}` is not its address; tests/e2e/variant-lessons.spec.ts opens it',
    unlock: 'the licence page has no ScreenHeader',
  },
};

describe('every Route is walked by the e2e screen lists or excluded with a reason', () => {
  for (const file of [COLD_START, SPLIT_SCREEN]) {
    const listed = screensOf(file);
    const excluded = EXCLUDED[file];

    it(`${file}: each route is in SCREENS or excluded`, () => {
      const missing = ROUTES.filter((route) => !listed.includes(route) && !(route in excluded));
      expect(missing, `routes in neither SCREENS of ${file} nor its exclusions (add each to the list, or to EXCLUDED with a reason)`).toEqual([]);
    });

    it(`${file}: a route is not both listed and excluded, and every name is a Route`, () => {
      expect(Object.keys(excluded).filter((route) => listed.includes(route)), 'excluded though listed').toEqual([]);
      expect([...listed, ...Object.keys(excluded)].filter((name) => !ROUTES.includes(name as never)), 'not a Route').toEqual([]);
      for (const [route, reason] of Object.entries(excluded)) expect(reason.length, `a reason for ${route}`).toBeGreaterThan(10);
    });
  }
});
