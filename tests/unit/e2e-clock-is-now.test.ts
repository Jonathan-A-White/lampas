// tests/unit/e2e-clock-is-now.test.ts — an e2e spec that sets the page's clock starts it at the real now, never at a date written in the spec (mw-5r3p30.606).
// openUnlocked writes the licence as held a minute before the real clock (tests/e2e/unlocked.ts), and src/services/licenceCache.ts counts a licence held in the future
// as not held: a page clock fixed at a date that has gone by stands before that stamp (reading-plan-screenshot.spec.ts went flaky so, mw-5r3p30.575).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SPECS = readdirSync('tests/e2e')
  .filter((name) => /\.spec\.ts$/.test(name))
  .map((name) => join('tests/e2e', name));

/** a date written in the source: Date.UTC(2026, ...), Date.parse('2026-...'), new Date('2026-...') or new Date(2026, ...) */
const LITERAL_DATE = /\bDate\.UTC\(\s*\d{4}|\bDate\.parse\(\s*['"`]\d{4}|\bnew Date\(\s*['"`]?\d{4}/;
const SETS_THE_CLOCK = /\bclock\.(setFixedTime|setSystemTime|install\(\s*\{)/;

describe('the page clock of an e2e spec', () => {
  it('is never started at a date written in the spec', () => {
    const offences: string[] = [];
    for (const file of SPECS) {
      const text = readFileSync(file, 'utf8');
      if (!SETS_THE_CLOCK.test(text)) continue;
      text.split('\n').forEach((line, i) => {
        if (!line.trimStart().startsWith('//') && LITERAL_DATE.test(line)) offences.push(`${file}:${i + 1} ${line.trim()}`);
      });
    }
    expect(offences).toEqual([]);
  });

  // A spec file is loaded once and its tests run minutes later on a busy host: a clock fixed at a Date.now() read when the file loaded stands before the
  // licence stamp (a minute before the real now at the test's start) once the test starts more than a minute after the load, and the AI controls vanish
  // (today.spec.ts, mw-5r3p30.749). The clock is read inside the test; a later time (the read plus a listening span) is fine.
  it('is never fixed at the bare time the spec file was loaded', () => {
    const offences: string[] = [];
    for (const file of SPECS) {
      const text = readFileSync(file, 'utf8');
      const loadTimes = [...text.matchAll(/^(?:const|let) (\w+) = Date\.now\(\);/gm)].map((m) => m[1]);
      for (const name of loadTimes) if (new RegExp(`clock\\.(setFixedTime|setSystemTime)\\(\\s*${name}\\s*\\)`).test(text)) offences.push(`${file}: clock fixed at ${name}, read when the file loaded`);
    }
    expect(offences).toEqual([]);
  });
});
