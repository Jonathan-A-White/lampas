// tests/unit/step-fixed-clock.test.ts — a step file does not wait on a fixed clock (mw-indx1x6.131, from mw-indx1x6.127's and mw-indx1x6.130's findings).
// `await new Promise((r) => setTimeout(r, 100))` in a step is a guess: too short on a loaded host (the thing waited for has not happened, the step fails or,
// worse, passes on nothing) and a dead wait on a calm one, summed over a whole suite. mw-indx1x6.127 counted 111 such lines in the step files; mw-indx1x6.130 fixed
// the seven heaviest. This test makes the rest visible and stops a new one, as step-verse-button-query.test.ts does for the role query.
// A setTimeout line in features/steps (and in the helpers of tests/support that steps use, a sleep() or a fake's own timer counted the same) is one of:
//   - a press's own hold or a fake clock's step, its line marked '// clock: <which>': the clock IS the thing the step plays;
//   - a file on FIXED_LATER below, with the count of its unmarked lines: a story fixes it, waiting for what the step wants (tests/support/published.ts,
//     findBy*/waitFor, a fake clock) in place of a time, and takes the file off the list, so the list only shrinks;
// and nothing else. A new wait goes through a wait for the event, or a fake clock; if it is truly a press's hold, it says so with '// clock:'.
// A local `const sleep = (ms) => new Promise((r) => setTimeout(r, ms))` is one line (its definition), however many times the file calls sleep().
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Where a step waits: every step file, and the support helpers a step may wrap a timer in. */
const ROOTS = ['features/steps', 'tests/support'];

/** The unmarked setTimeout lines of each file still to fix, by file, in sessions of about 15 files (the '// session N' lines, the Mayor files one story each): a count that must match the file exactly (fixing one without lowering the count fails too). */
const FIXED_LATER: Record<string, number> = {
  // session 1
  'features/steps/ai-needs-licence.steps.tsx': 1,
  'features/steps/appearance.steps.tsx': 2,
  'features/steps/ask-tutor.steps.tsx': 2,
  'features/steps/audio-bible.steps.tsx': 1,
  'features/steps/chapter-picker.steps.tsx': 1,
  'features/steps/chapter-swipe.steps.tsx': 2,
  'features/steps/fresh-install.steps.tsx': 1,
  'features/steps/hands-free-audible.steps.tsx': 1,
  'features/steps/hands-free-commands.steps.tsx': 1,
  'features/steps/hands-free.steps.tsx': 1,
  'features/steps/hebrew-ladder.steps.tsx': 1,
  'features/steps/hebrew-speech.steps.tsx': 2,
  'features/steps/hebrew-words.steps.tsx': 2,
  'features/steps/immersive-hint.steps.tsx': 1,
  'features/steps/immersive-reader.steps.tsx': 2,
  // session 2
  'features/steps/in-logos.steps.tsx': 1,
  'features/steps/languages.steps.tsx': 1,
  'features/steps/listen.steps.tsx': 1,
  'features/steps/long-question.steps.tsx': 1,
  'features/steps/maps.steps.tsx': 1,
  'features/steps/offline-copy.steps.tsx': 2,
  'features/steps/old-testament.steps.tsx': 1,
  'features/steps/paradigm-drill.steps.tsx': 2,
  'features/steps/paradigms.steps.tsx': 1,
  'features/steps/passage-lesson.steps.tsx': 1,
  'features/steps/passage-view.steps.tsx': 1,
  'features/steps/preface.steps.tsx': 1,
  'features/steps/quick-round.steps.tsx': 1,
  'features/steps/quick-test-after-answer.steps.tsx': 1,
  'features/steps/read-lessons.steps.tsx': 1,
  // session 3
  'features/steps/read-span.steps.tsx': 1,
  'features/steps/reading-drill.steps.tsx': 1,
  'features/steps/reading-plan-sendoff.steps.tsx': 2,
  'features/steps/recorded-voice.steps.tsx': 1,
  'features/steps/rephil-youtube-history.steps.ts': 1,
  'features/steps/septuagint.steps.tsx': 1,
  'features/steps/sermons-settings.steps.tsx': 1,
  'features/steps/sermons.steps.tsx': 1,
  'features/steps/share-references.steps.tsx': 2,
  'features/steps/speaking-interruptions.steps.tsx': 1,
  'features/steps/talk-pictures.steps.tsx': 1,
  'features/steps/tips.steps.tsx': 1,
  'features/steps/turn-pages.steps.tsx': 1,
  'features/steps/tutor-aloud.steps.tsx': 1,
  'features/steps/tutor-works.steps.tsx': 1,
  // session 4
  'features/steps/unsent-draft.steps.tsx': 2,
  'features/steps/variants-reader.steps.tsx': 1,
  'features/steps/verse-view.steps.tsx': 1,
  'features/steps/voice-offers.steps.tsx': 1,
  'features/steps/welcome-back.steps.tsx': 1,
  'features/steps/whats-new.steps.tsx': 1,
  'features/steps/word-tip.steps.tsx': 1,
  'tests/support/fake-postern.ts': 1,
  'tests/support/gesture.ts': 1,
};

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** The line's code, without a trailing '// ...' comment; and whether it is a comment line whole. */
function codeOf(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return '';
  return line.replace(/\s\/\/.*$/, '');
}

/** The line numbers of the file's setTimeout lines that carry no '// clock:' mark. */
function unmarkedTimeouts(text: string): number[] {
  return text.split('\n').flatMap((line, i) => (/setTimeout/.test(codeOf(line)) && !/\/\/ clock:/.test(line) ? [i + 1] : []));
}

const counts = new Map<string, number[]>();
for (const root of ROOTS) {
  for (const file of filesUnder(root)) {
    const lines = unmarkedTimeouts(readFileSync(file, 'utf8'));
    if (lines.length > 0) counts.set(file, lines);
  }
}

describe('a step file waits on no fixed clock', () => {
  it('every setTimeout is a press hold or a fake clock step marked "// clock:", or in a file on the list of those to fix', () => {
    const offences = [...counts].filter(([file]) => !(file in FIXED_LATER)).map(([file, lines]) => `${file}:${lines.join(',')} setTimeout with no '// clock: <which>' mark`);
    expect(offences).toEqual([]);
  });

  it.each(Object.keys(FIXED_LATER))('%s still holds exactly the unmarked setTimeout lines its entry counts', (file) => {
    expect(counts.get(file)?.length ?? 0).toBe(FIXED_LATER[file]);
  });

  it('flags a bare fixed wait and passes a marked one', () => {
    expect(unmarkedTimeouts('await new Promise((r) => setTimeout(r, 100));')).toEqual([1]);
    expect(unmarkedTimeouts('a\nawait new Promise((r) => setTimeout(r, 100)); // clock: a press\'s own hold')).toEqual([]);
    expect(unmarkedTimeouts('const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));')).toEqual([1]);
    expect(unmarkedTimeouts('// a setTimeout in a comment is no wait')).toEqual([]);
  });
});
