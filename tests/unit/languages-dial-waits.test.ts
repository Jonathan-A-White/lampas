// tests/unit/languages-dial-waits.test.ts — a step of languages.steps.tsx that reads a dial after the dials moved waits through waitWhileChanging (mw-u2w5klk.349.162).
// 'choosing both again restores the levels' failed once at load 25.6 of 20 on the checks after the choice: the choice puts back up to two dials and the levels kept for each, write by write,
// and every drawn Settings row re-reads each write over fake-indexeddb, so a plain waitFor (one ASYNC_WAIT_MS for the whole restore) can end with the store still moving. A step that checks a
// dial (dialHas, noDialNamed, noDial) is given a wait per state the dial passes through, by waitWhileChanging with what the screen and the store hold (progressOf).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('features/steps/languages.steps.tsx', 'utf8');

/** The text of the arrow function `const <name> = async (...) => { ... };` of the file, up to the first line that closes it at two spaces. */
function bodyOf(name: string): string {
  const start = source.indexOf(`  const ${name} = `);
  if (start < 0) throw new Error(`no step function ${name} in languages.steps.tsx`);
  const end = source.indexOf('\n  };', start);
  return source.slice(start, end);
}

describe('languages.steps.tsx: the steps that read a dial wait through the writes', () => {
  for (const name of ['dialHas', 'noDialNamed', 'noDial']) {
    it(`${name} waits with waitWhileChanging and the store, not one plain waitFor`, () => {
      const body = bodyOf(name);
      expect(body, `${name} reads the dials after a choice that is a run of writes`).toContain('waitWhileChanging(');
      expect(body).not.toMatch(/await waitFor\(/);
      expect(body).toMatch(/progressOf|storedSettings/);
    });
  }
});
