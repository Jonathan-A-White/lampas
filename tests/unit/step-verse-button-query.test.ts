// tests/unit/step-verse-button-query.test.ts — a step that asks the tutor about a verse finds the verse's number button without a role query over
// the whole Reader (mw-yrz5b8z).
// screen.findByRole('button', { name: 'Verse 28' }) works out the accessible name of every button of the open chapter: 1.6 s on a calm host, a
// multiple of that under load (tests/support/find-button.ts). The 'he asks the tutor about verse 28' step is that query plus the sheet, and a step
// that outruns vitest's 20 s testTimeout is failed while its async body goes on: the body then runs into the next scenario's cleanup() (a 'container
// to be an Element ... got null' error) and into afterAll's db.close() (DatabaseClosedError), reported as 'Unhandled Errors' on a scenario that
// did nothing wrong. features/steps/tutor-links.steps.tsx failed three gate runs in a row so on cloud3 at load 5 to 17 (2026-11-10).
// Recipe to see it on a calm host: `TZ=UTC npx vitest run features/steps/tutor-links.steps.tsx --testTimeout=2000` (a step slower than 2 s then fails, the
// same unhandled errors follow); with the fix that run passes.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The step files that ask the tutor about a verse and hold to findButton (tests/support/find-button.ts) for its number button. */
const FILES = ['features/steps/tutor-links.steps.tsx', 'features/steps/tutor-works.steps.tsx', 'features/steps/tutor-copy.steps.tsx'];

describe('a step that selects a verse in the Reader', () => {
  it.each(FILES)('%s finds the verse button with findButton, not a role query over the chapter', (file) => {
    const offences = readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, i) => (/screen\.(find|get|query)(All)?ByRole\('button', \{ name: '[^']*Verse \d+'/.test(line) ? [`${file}:${i + 1} ${line.trim()}`] : []));
    expect(offences).toEqual([]);
  });
});
