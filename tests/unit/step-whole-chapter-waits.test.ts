// tests/unit/step-whole-chapter-waits.test.ts — the steps that open a whole chapter's Verse view (themes, maps, copy-format) wait for the door and the place line instead of looking once or leaning on a clock
// (mw-indx1x6.125, folding mw-indx1x6.122 to .124, mw-5r3p30.1219 and mw-u2w5klk.349.58). A role query over the Verse view of a whole chapter works out the name of hundreds of buttons and starves the database the sermon
// door waits on; the place line is a long-press button, so a user-event click on it can be a hold on a loaded host (tests/support/place-line.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILES = ['features/steps/themes.steps.tsx', 'features/steps/maps.steps.tsx', 'features/steps/copy-format.steps.tsx'];

const offences = (file: string, pattern: RegExp): string[] =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, i) => (pattern.test(line) ? [`${file}:${i + 1} ${line.trim()}`] : []));

describe('a step on the Verse view of a whole chapter', () => {
  it.each(FILES)('%s finds a button of the view with findButton, not a role query over it', (file) => {
    expect(offences(file, /within\(viewEl\(\)\)\.(find|get)(All)?ByRole\('button'/)).toEqual([]);
  });

  it.each(FILES)('%s finds a verse number with findButton', (file) => {
    expect(offences(file, /screen\.(find|get|query)(All)?ByRole\('button', \{ name: `Verse \$\{n\}`/)).toEqual([]);
  });

  it.each(FILES)('%s taps the place line through tests/support/place-line.ts, not user.click on a line looked for once', (file) => {
    expect(offences(file, /user\.click\(.*(place-line|placeLine)/)).toEqual([]);
  });

  it('the themes steps wait for the sheet to say its themes are read, not for 100 ms', () => {
    expect(offences('features/steps/themes.steps.tsx', /setTimeout\(resolve, \d+\)/)).toEqual([]);
  });
});
