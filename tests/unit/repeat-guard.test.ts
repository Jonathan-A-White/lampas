// tests/unit/repeat-guard.test.ts — the guard of mw-t5shinh.8. The app-wide tap guard (src/ui/tapGuard.ts) drops a second click on the SAME control within the settle moment, so a
// quick double tap acts once on any button. The one kind of button a thumb may tap twice quickly on purpose steps a value (a page, a size, a count): each button in src/ whose click handler
// steps one must choose: `data-repeat` (both taps count, the guard leaves it alone) or a line on STEPS_ONCE saying why one tap a moment is right. The search is tests/support/repeat-guard.ts.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { steppingButtons, steppingIn } from '../support/repeat-guard';

/** Stepping buttons that take ONE tap a moment, by file and the start of the handler as written, each with the reason. The step is a card or a lesson page: a double tap that moved two would skip one unseen. */
const STEPS_ONCE: Array<{ file: string; handler: string; why: string }> = [
  { file: 'CheckSheet.tsx', handler: 'next', why: 'Next on a question card: a second tap would answer or skip the next card, which is the double tap the guard exists for (tests/e2e/reading-ladder.spec.ts settles for Next verse)' },
  { file: 'DrillScreen.tsx', handler: 'goOn', why: 'Next on a Parsing drill question: the next card draws its options under the same spot' },
  { file: 'LetterDrillScreen.tsx', handler: 'next', why: 'Next on a letter drill card: a second tap lands on the next card' },
  { file: 'PlanDrillScreen.tsx', handler: 'next', why: 'Next on a plan drill card: a second tap lands on the next card' },
  { file: 'QuizScreen.tsx', handler: '() => {', why: 'Next on a Quick test question: a second tap lands on the next question' },
  { file: 'TryItSheet.tsx', handler: 'next', why: 'Next on a Try it card: a second tap lands on the next card' },
  { file: 'ReadingDrill.tsx', handler: '() => settled() && setAt(at + 1)', why: 'Next on the reading drill: the next word is drawn under the same spot (and the card settles by itself)' },
  { file: 'ReadCheck.tsx', handler: '() => onStep(step + 1)', why: 'Next on the read-aloud check: a second tap would skip a step he never saw' },
  { file: 'diagram/DiagramLesson.tsx', handler: '() => go(at - 1)', why: 'Back in a diagram lesson: one page a tap, so a double tap does not undo the page he just read' },
  { file: 'diagram/DiagramLesson.tsx', handler: 'next', why: 'Next in a diagram lesson: a second tap would skip the page he has not read' },
  { file: 'hardSounds/Contrast.tsx', handler: 'next', why: 'Next on a Hard sounds contrast: a second tap lands on the next card' },
  { file: 'hardSounds/HardSoundLesson.tsx', handler: '() => onStep(at - 1)', why: 'Back in a Hard sounds lesson: one page a tap' },
  { file: 'hardSounds/HardSoundLesson.tsx', handler: '() => (last ? onDone() : onStep(at + 1))', why: 'Next in a Hard sounds lesson: a second tap would skip the page he has not read, or press Done twice' },
  { file: 'ipa/IpaDrill.tsx', handler: 'another', why: 'Another round of the IPA drill: a second tap lands on the first question of the new round' },
  { file: 'lessons/VariantLessons.tsx', handler: '() => showVariantLesson(lesson.order > 1', why: 'Back in a variant lesson: one lesson a tap, so a double tap does not skip one' },
  { file: 'handwriting/WriteItScreen.tsx', handler: '() => setCard(card + 1)', why: 'Next on a Write it card: a second tap lands on the next card' },
  { file: 'handwriting/WriteIt.tsx', handler: '() => setShown(shown + 1)', why: 'Show the strokes reveals a stroke at a time and then the button goes: a second tap would reveal a stroke he has not looked at' },
  { file: 'gate/MyDevices.tsx', handler: '() => setAttempt((n) => n + 1)', why: 'Try again (a retry counter): the count is only a key to ask again, and one ask a moment is right' },
  { file: 'ChapterPicker.tsx', handler: 'tryAgain', why: 'Try again: one ask a moment is right (the count only restarts the load)' },
];

const known = (file: string, handler: string) => STEPS_ONCE.some((row) => row.file === file && handler.startsWith(row.handler));

describe('every button that steps a value in its click handler chooses (mw-t5shinh.8)', () => {
  const found = steppingButtons(join(__dirname, '..', '..', 'src'));

  it('finds the stepping buttons: the search is not empty, and finds the four of ReaderControls', () => {
    expect(found.length).toBeGreaterThan(15);
    const controls = found.filter((s) => s.file === 'ReaderControls.tsx');
    expect(controls.map((s) => s.handler)).toEqual(['() => turn(-1)', '() => turn(1)', 'split.larger', 'split.smaller']);
  });

  it('each carries data-repeat or stands on STEPS_ONCE with its reason', () => {
    const unchosen = found.filter((s) => !s.repeats && !known(s.file, s.handler)).map((s) => `${s.file}:${s.line} onClick={${s.handler}}`);
    expect(unchosen, 'steps a value in its click handler and chooses nothing: add data-repeat if a thumb may tap it twice quickly on purpose, else a line on STEPS_ONCE (the app-wide guard drops its second quick tap)').toEqual([]);
  });

  it('the list gives every entry a reason and has no stale entry', () => {
    for (const row of STEPS_ONCE) {
      expect(row.why.trim().length, `${row.file} ${row.handler}`).toBeGreaterThan(5);
      expect(found.some((s) => s.file === row.file && s.handler.startsWith(row.handler) && !s.repeats), `${row.file} ${row.handler} no longer steps without data-repeat: take it off STEPS_ONCE`).toBe(true);
    }
  });

  it('a scratch button that steps with no data-repeat is found, and one marked data-repeat is found as repeating', () => {
    const dir = mkdtempSync(join(tmpdir(), 'repeat-guard-'));
    try {
      const file = join(dir, 'Scratch.tsx');
      writeFileSync(file, 'export const S = () => <button type="button" onClick={() => setN((n) => n + 1)}>More</button>;\n');
      const bare = steppingButtons(dir);
      expect(bare).toHaveLength(1);
      expect(bare[0]).toMatchObject({ file: 'Scratch.tsx', repeats: false, handler: '() => setN((n) => n + 1)' });
      expect(bare.filter((s) => !s.repeats && !known(s.file, s.handler))).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    const marked = steppingIn('const S = () => (\n  <button\n    type="button"\n    data-repeat\n    onClick={() => setN((n) => n + 1)}\n  >\n    More\n  </button>\n);\n');
    expect(marked).toEqual([expect.objectContaining({ repeats: true, line: 2 })]);
  });

  it('finds a named handler that steps, and leaves one that does not', () => {
    expect(steppingIn('const more = () => {\n  setN(n + 1);\n};\nconst S = () => <button onClick={more}>More</button>;\n')).toHaveLength(1);
    expect(steppingIn('const open = () => {\n  setOpen(true);\n};\nconst S = () => <button onClick={open}>Open</button>;\n')).toHaveLength(0);
    expect(steppingIn('const S = () => <button onClick={() => setN(0)}>Reset</button>;\n')).toHaveLength(0);
  });
});
