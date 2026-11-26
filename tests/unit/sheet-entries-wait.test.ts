// tests/unit/sheet-entries-wait.test.ts — a step file that opens the app again after cleanup() waits for the closed sheets' history traversals first (mw-fnvjof.17.336, from mw-fnvjof.17.326's finding).
// Unmounting an open sheet steps history back (src/ui/sheetBack.ts) and jsdom lands that popstate a task later, on a loaded host later still. A scenario that ends with a sheet open and a next one
// that sets its address before the traversal lands opens on the screen beneath (Today), as reading-plan did before mw-5r3p30.629. tests/support/sheet-history.ts sheetEntriesGone() is the wait: no sheet depth is left.
// A step file that queries role 'dialog' (it opens a sheet) and, in one function, calls cleanup() and then render(<App ... must call `await sheetEntriesGone()` between them, or be on NOT_YET below.
// NOT_YET is the files not yet swept (the sweep is mechanical: import sheetEntriesGone from tests/support/sheet-history and await it right after cleanup()): a story takes a file off the list when it adds the wait,
// so the list only shrinks. A file that is not an offender, or is an offender with its wait added, fails its own entry here until it is removed.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIR = 'features/steps';

/** Step files that open a sheet and render the App after a cleanup() with no sheetEntriesGone() between: not yet swept, reason: the wait was never added (mw-fnvjof.17.326's finding). */
const NOT_YET: string[] = [
  'features/steps/app-missing.steps.tsx',
  'features/steps/app-on-phone.steps.tsx',
  'features/steps/ask-for-book.steps.tsx',
  'features/steps/chapter-picker.steps.tsx',
  'features/steps/chapter-swipe.steps.tsx',
  'features/steps/copy-hold.steps.tsx',
  'features/steps/diagram-lesson.steps.tsx',
  'features/steps/drill.steps.tsx',
  'features/steps/enduring-word.steps.tsx',
  'features/steps/feedback-offer.steps.tsx',
  'features/steps/goal-progress.steps.tsx',
  'features/steps/grammar-approach.steps.tsx',
  'features/steps/grammar-books.steps.tsx',
  'features/steps/grammar-terms.steps.tsx',
  'features/steps/greek-audio.steps.tsx',
  'features/steps/greek-offer.steps.tsx',
  'features/steps/hands-free-ask.steps.tsx',
  'features/steps/hands-free.steps.tsx',
  'features/steps/handwriting-drills.steps.tsx',
  'features/steps/hebrew-diagram.steps.tsx',
  'features/steps/hebrew-hard-sounds.steps.tsx',
  'features/steps/hebrew-ladder.steps.tsx',
  'features/steps/hebrew-paradigms.steps.tsx',
  'features/steps/hebrew-quiz.steps.tsx',
  'features/steps/hebrew-reader.steps.tsx',
  'features/steps/hebrew-reading-ladder.steps.tsx',
  'features/steps/hebrew-speech.steps.tsx',
  'features/steps/hebrew-tutor.steps.tsx',
  'features/steps/hebrew-verse-view.steps.tsx',
  'features/steps/hebrew-words.steps.tsx',
  'features/steps/immersive-reader.steps.tsx',
  'features/steps/languages.steps.tsx',
  'features/steps/layout.steps.tsx',
  'features/steps/letter-drill.steps.tsx',
  'features/steps/links.steps.tsx',
  'features/steps/long-press-speak.steps.tsx',
  'features/steps/long-question.steps.tsx',
  'features/steps/maps.steps.tsx',
  'features/steps/memorize.steps.tsx',
  'features/steps/number-sheet.steps.tsx',
  'features/steps/old-testament.steps.tsx',
  'features/steps/one-frontier.steps.tsx',
  'features/steps/paradigms.steps.tsx',
  'features/steps/passage-lesson.steps.tsx',
  'features/steps/passage-view.steps.tsx',
  'features/steps/pattern-ideas.steps.tsx',
  'features/steps/preface.steps.tsx',
  'features/steps/pronunciation.steps.tsx',
  'features/steps/quick-round.steps.tsx',
  'features/steps/quick-test-after-answer.steps.tsx',
  'features/steps/quiz-me.steps.tsx',
  'features/steps/reader.steps.tsx',
  'features/steps/reading-drill.steps.tsx',
  'features/steps/reading-plan-sendoff.steps.tsx',
  'features/steps/roll-r.steps.tsx',
  'features/steps/say-it.steps.tsx',
  'features/steps/send-to-makers.steps.tsx',
  'features/steps/sentence-diagram.steps.tsx',
  'features/steps/septuagint.steps.tsx',
  'features/steps/sermons-online.steps.tsx',
  'features/steps/sermons.steps.tsx',
  'features/steps/share-references.steps.tsx',
  'features/steps/share-target.steps.tsx',
  'features/steps/speaking-interruptions.steps.tsx',
  'features/steps/study-resources.steps.tsx',
  'features/steps/talk-bridge.steps.tsx',
  'features/steps/talk-pictures.steps.tsx',
  'features/steps/tap-guard.steps.tsx',
  'features/steps/teach.steps.tsx',
  'features/steps/tutor-aloud.steps.tsx',
  'features/steps/tutor-go.steps.tsx',
  'features/steps/tutor-rust.steps.tsx',
  'features/steps/tutor.steps.tsx',
  'features/steps/unsent-draft.steps.tsx',
  'features/steps/variants-reader.steps.tsx',
  'features/steps/verse-sheet.steps.tsx',
  'features/steps/voice-offers.steps.tsx',
  'features/steps/voice-respelling-agree.steps.tsx',
  'features/steps/weave.steps.tsx',
  'features/steps/word-ask-tutor.steps.tsx',
  'features/steps/word-heart.steps.tsx',
  'features/steps/word-help.steps.tsx',
  'features/steps/word-sheet-english.steps.tsx',
  'features/steps/word-sheet-frontier.steps.tsx',
  'features/steps/word-sheet-many-resources.steps.tsx',
  'features/steps/word-sheet-study.steps.tsx',
  'features/steps/word-tip.steps.tsx',
];

/** The 1-based lines of `cleanup();` calls that a render(<App follows in the same function (up to the next line that starts with a closing brace) with no `sheetEntriesGone()` between them. */
function unwaitedCleanups(text: string): number[] {
  const lines = text.split('\n');
  const found: number[] = [];
  lines.forEach((line, i) => {
    if (!/^\s*cleanup\(\);/.test(line)) return;
    for (let j = i + 1; j < lines.length && !/^\}/.test(lines[j]); j++) {
      if (/sheetEntriesGone\(\)/.test(lines[j])) return;
      if (/render\(<App/.test(lines[j])) {
        found.push(i + 1);
        return;
      }
    }
  });
  return found;
}

/** Whether the file opens a sheet in a step: it asks for a role 'dialog'. */
const opensSheets = (text: string): boolean => /ByRole\(\s*['"]dialog['"]/.test(text);

const stepFiles = readdirSync(DIR)
  .filter((name) => /\.steps\.tsx?$/.test(name))
  .map((name) => `${DIR}/${name}`);

const offenders = new Map<string, number[]>();
for (const file of stepFiles) {
  const text = readFileSync(file, 'utf8');
  if (!opensSheets(text)) continue;
  const lines = unwaitedCleanups(text);
  if (lines.length > 0) offenders.set(file, lines);
}

describe('a step file that opens the app again waits for the closed sheets first', () => {
  it('every step file that opens sheets awaits sheetEntriesGone() between cleanup() and render(<App, or is on the list of those to sweep', () => {
    const offences = [...offenders].filter(([file]) => !NOT_YET.includes(file)).map(([file, lines]) => `${file}:${lines.join(',')} cleanup() then render(<App with no await sheetEntriesGone() between`);
    expect(offences).toEqual([]);
  });

  it.each(NOT_YET)('%s is still an offender (take it off the list when its wait is added)', (file) => {
    expect(offenders.has(file)).toBe(true);
  });

  it('flags a cleanup then a render with no wait, and passes one with the wait', () => {
    const bad = 'async function open() {\n  cleanup();\n  clearBus();\n  render(<App />);\n}';
    const good = 'async function open() {\n  cleanup();\n  await sheetEntriesGone();\n  render(<App />);\n}';
    expect(unwaitedCleanups(bad)).toEqual([2]);
    expect(unwaitedCleanups(good)).toEqual([]);
    expect(unwaitedCleanups('afterAll(async () => {\n  cleanup();\n});\nrender(<App />);')).toEqual([]);
  });
});
