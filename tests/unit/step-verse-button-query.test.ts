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

/** The shared ask step (mw-indx1x6.30) and the step files that ask the tutor about a verse through it: each holds to findButton (tests/support/find-button.ts) for a verse's number button. */
const FILES = [
  'features/steps/ask-verse.ts',
  'features/steps/tutor-links.steps.tsx',
  'features/steps/tutor-works.steps.tsx',
  'features/steps/tutor-copy.steps.tsx',
  'features/steps/about-you.steps.tsx',
  'features/steps/memory-tutor.steps.tsx',
  // mw-indx1x6.129: the step files that took a verse's number or a Verse view button through a role query (named in mw-npxuw9n and mw-indx1x6.126)
  'features/steps/tutor.steps.tsx',
  'features/steps/tutor-aloud.steps.tsx',
  'features/steps/reading-check.steps.tsx',
  'features/steps/reading-ladder.steps.tsx',
  'features/steps/reading-drill.steps.tsx',
  'features/steps/reopen.steps.tsx',
  'features/steps/verse-sheet.steps.tsx',
  'features/steps/sentence-diagram.steps.tsx',
  'features/steps/sermons-online.steps.tsx',
  'features/steps/hebrew-diagram.steps.tsx',
  'features/steps/septuagint.steps.tsx',
  'features/steps/bible-talk/sheet.steps.tsx',
  'features/steps/sermons-ask.steps.tsx',
  'tests/unit/lxx-off-unchanged.test.tsx',
  'tests/unit/tutor-doors.test.tsx',
];

/** The step files that took a button of the Verse view of a whole chapter with within(<the view>).getByRole('button', ...) (mw-indx1x6.126, .129). */
const VIEW_FILES = [
  'features/steps/ai-needs-licence.steps.tsx',
  'features/steps/audio-bible.steps.tsx',
  'features/steps/hebrew-diagram.steps.tsx',
  'features/steps/hebrew-reading-ladder.steps.tsx',
  'features/steps/my-reading.steps.tsx',
  'features/steps/reading-check.steps.tsx',
  'features/steps/reading-ladder.steps.tsx',
  'features/steps/reading-drill.steps.tsx',
  'features/steps/sentence-diagram.steps.tsx',
  'features/steps/septuagint.steps.tsx',
  'features/steps/tutor-aloud.steps.tsx',
  'tests/unit/lxx-off-unchanged.test.tsx',
];

describe('a step that selects a verse in the Reader', () => {
  it.each(FILES)('%s finds the verse button with findButton, not a role query over the chapter', (file) => {
    const offences = readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, i) => (/screen\.(find|get|query)(All)?ByRole\('button', \{ name: ('[^']*Verse \d+'|`Verse \$\{)/.test(line) ? [`${file}:${i + 1} ${line.trim()}`] : []));
    expect(offences).toEqual([]);
  });
});

describe('a step that takes a button of the Verse view of a whole chapter', () => {
  it.each(VIEW_FILES)('%s finds it with findButton, not within(<the view>).getByRole', (file) => {
    const offences = readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, i) => (/within\((verseView\(\)|viewEl\(\)|view)\)\.(get|getAll)ByRole\('button'/.test(line) ? [`${file}:${i + 1} ${line.trim()}`] : []));
    expect(offences).toEqual([]);
  });
});
