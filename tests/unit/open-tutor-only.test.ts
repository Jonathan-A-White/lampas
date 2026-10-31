// tests/unit/open-tutor-only.test.ts — a test opens the tutor through openTutor() (features/steps/open-tutor.ts, tests/e2e/open-tutor.ts), never by a click on one of the buttons the tutor door replaces
// (mw-5r3p30.881, part C1 of mw-5r3p30.843): the round '?', the Reader's Talk bar, the Verse view's 'Ask the tutor' and 'Talk about verse N', the Hold to ask bar, and the 'Ask the tutor' of a word, idea, variant or
// New words sheet. Part C2 (mw-5r3p30.882) removes those buttons; a test that still named one would then fail, so C1 moves them all first. A file may name the old control only where it is the thing under test
// (its place, its size, that it is absent for a phone with no licence); OLD_CONTROL_UNDER_TEST lists those files and says what each asserts, and C2 deletes the file's lines with the control.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The one way in: a file that names an old control is either the helper or a file listed below. */
const HELPERS = new Set(['features/steps/open-tutor.ts', 'tests/e2e/open-tutor.ts', 'tests/support/two-finger.ts', 'tests/unit/open-tutor-only.test.ts', 'tests/e2e/open-tutor.spec.ts']);

/** Files that assert the old control itself, or exercise a screen of its own that C2 does not touch; each is the reason. */
/** Why a file may still name an old control (the key of OLD_CONTROL_UNDER_TEST below groups the files by it). */
const WHY = {
  CONTROL: "asserts, measures or holds the Reader's Talk bar or the round ? itself (its place, size, hold, slide or absence): there is nothing to open the tutor through, and C2 deletes the lines with the control",
  COMPOSER: "asks through the Verse view's Ask composer (its 'Ask the tutor' action, Hold to ask, Type a question) or asserts the view's actions: the composer is not the tutor door, and C2 removes it and moves the typing to the Talk sheet's box",
  SHEET: "asserts the 'Ask the tutor' button of a word, idea or variant sheet is there and in reach (the click that opens the tutor in it is openTutor() now); C2 removes the button and these lines",
  OWN: "a screen's own 'Ask the tutor' (Help, Quick test, the results of a drill, Paradigms, the Grammar sheet, Ask for more, the lessons of the variants) that part C2 does not list among the buttons it removes",
  TEACH: "the New words (Teach) sheet's own 'Ask the tutor': part B registered no door target on that sheet, so a two-finger tap over it asks about the chapter, not about its word; C2 removes the button with its scenario, or B's gap is filled first",
  LICENCE: "asserts that a phone with no licence draws none of the old controls (and that one with a licence does); the door's own licence tests are tests/unit/tutor-door.test.tsx and tests/e2e/tutor-door.spec.ts",
  TEXT: "names a label only (a doc or label test), clicks nothing",
  DOORS: "compares every old door of the tutor (the Talk bar, the round ?, the Verse view's two buttons) with the others; C2 reshapes it to the two doors that remain",
} as const;

const files = (why: keyof typeof WHY, names: string[]): Record<string, string> => Object.fromEntries(names.map((name) => [name, WHY[why]]));

export const OLD_CONTROL_UNDER_TEST: Record<string, string> = {
  ...files('CONTROL', [
  'features/steps/ask-tutor.steps.tsx',
  'features/steps/chapter-swipe.steps.tsx',
  'features/steps/immersive-reader.steps.tsx',
  'features/steps/push-to-talk.steps.tsx',
  'features/steps/talk-long-question.steps.tsx',
  'tests/e2e/about.spec.ts',
  'tests/e2e/ask-button-room.spec.ts',
  'tests/e2e/ask-tutor.spec.ts',
  'tests/e2e/bottom-reach.spec.ts',
  'tests/e2e/diagram-lesson.spec.ts',
  'tests/e2e/double-tap-guard.spec.ts',
  'tests/e2e/drill-ask-tutor.spec.ts',
  'tests/e2e/hold-bar.spec.ts',
  'tests/e2e/immersive-book.spec.ts',
  'tests/e2e/immersive-flip.spec.ts',
  'tests/e2e/immersive-hint.spec.ts',
  'tests/e2e/immersive-place.spec.ts',
  'tests/e2e/immersive-reader.spec.ts',
  'tests/e2e/ladder-graph.spec.ts',
  'tests/e2e/library-import.spec.ts',
  'tests/e2e/next-in-view.ts',
  'tests/e2e/placement-ask-button.spec.ts',
  'tests/e2e/push-to-talk.spec.ts',
  'tests/e2e/reader-ask-button.spec.ts',
  'tests/e2e/reader-sideways-room.spec.ts',
  'tests/e2e/review-next-ask.spec.ts',
  'tests/e2e/review.spec.ts',
  'tests/e2e/source-segment-fit.spec.ts',
  'tests/e2e/speaking-bar.spec.ts',
  'tests/e2e/split-screen-header.spec.ts',
  'tests/e2e/talk-fit.spec.ts',
  'tests/e2e/talk-hold.spec.ts',
  'tests/e2e/talk.spec.ts',
  'tests/e2e/talkback-reading.spec.ts',
  'tests/e2e/turn-pages.spec.ts',
  'tests/unit/talk-bars.test.tsx',
  ]),
  ...files('COMPOSER', [
  'features/steps/ask-by.steps.tsx',
  'features/steps/hebrew-tutor.steps.tsx',
  'features/steps/passage-view.steps.tsx',
  'features/steps/send-to-makers.steps.tsx',
  'features/steps/tutor-aloud.steps.tsx',
  'features/steps/tutor-requests.steps.tsx',
  'features/steps/tutor.steps.tsx',
  'features/steps/verse-view.steps.tsx',
  'tests/e2e/ask-composer.spec.ts',
  'tests/e2e/ask-composer.ts',
  'tests/e2e/ask-fit.spec.ts',
  'tests/e2e/ask-long-question.spec.ts',
  'tests/e2e/hear-any-word.spec.ts',
  'tests/e2e/passage-view.spec.ts',
  'tests/e2e/send-to-makers.spec.ts',
  'tests/e2e/sheet-alerts-landscape.spec.ts',
  'tests/e2e/shell-bars-over-views.spec.ts',
  'tests/e2e/split-screen-walk.spec.ts',
  'tests/e2e/talk-settings.spec.ts',
  'tests/e2e/tutor-live.spec.ts',
  'tests/e2e/tutor-offline.spec.ts',
  'tests/e2e/tutor-waiting-bar.spec.ts',
  'tests/e2e/tutor.spec.ts',
  'tests/e2e/verse-ask-voice.spec.ts',
  'tests/e2e/verse-view.spec.ts',
  'tests/e2e/verse-view.ts',
  'tests/unit/talk-through-pause.test.tsx',
  ]),
  ...files('SHEET', [
  'features/steps/word-ask-tutor.steps.tsx',
  'tests/e2e/idea-ask-tutor.spec.ts',
  'tests/e2e/variants.spec.ts',
  'tests/e2e/word-tip.spec.ts',
  ]),
  ...files('OWN', [
  'features/steps/ask-for-more.steps.tsx',
  'features/steps/drill.steps.tsx',
  'features/steps/grammar-terms.steps.tsx',
  'features/steps/paradigms.steps.tsx',
  'features/steps/quick-test-after-answer.steps.tsx',
  'tests/e2e/ask-for-more.spec.ts',
  'tests/e2e/drill.spec.ts',
  'tests/e2e/grammar-terms.spec.ts',
  'tests/e2e/help.spec.ts',
  'tests/e2e/paradigm-tutor.spec.ts',
  'tests/e2e/paradigms.spec.ts',
  'tests/e2e/quiz.spec.ts',
  'tests/e2e/variant-lessons.spec.ts',
  'tests/unit/help.test.tsx',
  ]),
  ...files('TEACH', [
  'features/steps/teach.steps.tsx',
  ]),
  ...files('LICENCE', [
  'features/steps/ai-needs-licence.steps.tsx',
  ]),
  ...files('TEXT', [
  'tests/unit/demo-module-splits-doc.test.ts',
  'tests/unit/demo-shared-composer-doc.test.ts',
  'tests/unit/talk-settings.test.tsx',
  ]),
  ...files('DOORS', [
  'tests/unit/tutor-doors.test.tsx',
  ]),
};

/** A line that names an old control to find or press it. */
const OLD_CONTROL: RegExp[] = [
  /Role\('button', \{ name: 'Ask the tutor'/, // a button called Ask the tutor
  /Talk about verse [0-9$]/, // the Verse view's Talk about verse N
  /data-talk-bar/, // the Reader's Talk bar
  /Role\('button', \{ name: 'Talk'/, // a button called Talk (the group of that name is Settings')
  /'Hold to ask'/, // the Verse view's bar
  /ASK_TUTOR_LABEL|Ask the tutor about this screen|data-ask-tutor/, // the round ?
  /chooseAction\([^)]*'Ask the tutor'/, // the Verse view's Ask the tutor action (openTalkAbout, which opened the talk from it, is a two-finger tap now)
];

const TEST_DIRS = ['tests', 'features'];

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' || name === 'fixtures' ? [] : filesUnder(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

describe('a test that opens the tutor', () => {
  it('goes through openTutor(), not through a click on a button the tutor door replaces', () => {
    const offences: string[] = [];
    for (const file of TEST_DIRS.flatMap(filesUnder)) {
      if (HELPERS.has(file) || file in OLD_CONTROL_UNDER_TEST) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (isComment(line)) return;
          if (OLD_CONTROL.some((pattern) => pattern.test(line))) offences.push(`${file}:${i + 1}: ${line.trim().slice(0, 140)}`);
        });
    }
    expect(offences).toEqual([]);
  });

  it('lists only files that exist and still name an old control', () => {
    for (const file of Object.keys(OLD_CONTROL_UNDER_TEST)) {
      const text = readFileSync(file, 'utf8');
      expect(text.split('\n').some((line) => !isComment(line) && OLD_CONTROL.some((pattern) => pattern.test(line))), `${file} no longer names an old control: take it off the list`).toBe(true);
    }
  });
});
