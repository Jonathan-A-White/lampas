// tests/unit/step-ask-about-verse.test.ts — the step 'he asks the tutor about verse 28' is one shared step (features/steps/ask-verse.ts) that waits on the
// Talk sheet's own state, and the step files that use it make no role query over the open Reader (mw-indx1x6.30).
// vitest-cucumber gives each Given/When/Then its own test with the 20 s testTimeout. tutor-copy's ask step found the Verse view and the Talk sheet with
// screen.findByRole (each one works out the role and name of every element of the chapter behind it), found the sheet again by role for every read and
// typed its 40-letter question a key at a time: 2.5 to 3.5 s alone on a calm host, past 20 s inside a gate part at load 26 of 8 cores. A step failed by
// the timeout goes on running, so the next step found no turn ('Expected container to be an Element ... got null') and the clipboard step after it
// waited on a clipboard nothing had written yet. tutor-links was mended the same way in mw-lcv9z3g.13; its copy of the step is now the shared one.
// Recipe to see it on a calm host: `TZ=UTC npx vitest run features/steps/tutor-copy.steps.tsx --testTimeout=2000` (a step slower than 2 s then fails and
// the two steps after it fall with it); with the fix that run passes.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SHARED = 'features/steps/ask-verse.ts';
/** The step files whose scenarios ask the tutor about a verse of the open chapter. */
const FILES = ['features/steps/tutor-links.steps.tsx', 'features/steps/tutor-works.steps.tsx', 'features/steps/tutor-copy.steps.tsx'];

const offences = (file: string, pattern: RegExp): string[] =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, i) => (pattern.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line) ? [`${file}:${i + 1} ${line.trim()}`] : []));

describe("the step 'he asks the tutor about verse 28'", () => {
  it.each(FILES)('%s asks through the shared askAboutVerse, with no copy of its own', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/import \{[^}]*\baskAboutVerse\b[^}]*\} from '\.\/ask-verse'/);
    expect(source).toMatch(/\baskAboutVerse\(user, 28, /);
  });

  it.each([SHARED, ...FILES])('%s makes no role query on the whole screen: the Reader behind the sheet is walked for each one', (file) => {
    expect(offences(file, /\bscreen\.(find|get|query)(All)?ByRole\(/)).toEqual([]);
  });

  it.each([SHARED, ...FILES])('%s puts the question in with one paste, not a render for each key', (file) => {
    expect(offences(file, /\buser\.type\(/)).toEqual([]);
  });

  it('the shared step waits for the answered turn in the Talk sheet, found beside its own markup', () => {
    const source = readFileSync(SHARED, 'utf8');
    expect(source).toMatch(/await openTutor\(\)/);
    expect(source).toMatch(/user\.paste\(/);
    expect(source).toMatch(/waitFor\(\(\) => answeredTurn\(\)\)/);
    expect(readFileSync('features/steps/open-tutor.ts', 'utf8')).toMatch(/querySelectorAll<HTMLElement>\('\[role="dialog"\]'\)/);
  });
});
