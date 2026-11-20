// tests/unit/sheet-back-sweep.test.ts — the sweep of mw-zbgo4ep.42. A fixed inset-0 sheet or card that keeps the floating ? away (useNoDoor) sits over the screen like the chapter picker,
// so the phone's Back must close it and leave him on the screen beneath (useSheetBack, src/ui/sheetBack.ts); a file that does not names the reason on NO_BACK_STEP.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', '..', 'src');

/** Files that cover the screen and keep no door but take no Back step, each with the reason. */
const NO_BACK_STEP: Array<{ file: string; why: string }> = [];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

/** The files of src/ with a fixed inset-0 box and a call of useNoDoor (an import alone is no call). */
function coveringNoDoor(): Array<{ file: string; text: string }> {
  return tsxFiles(SRC)
    .map((path) => ({ file: relative(SRC, path), text: readFileSync(path, 'utf8') }))
    .filter(({ text }) => /\bfixed inset-0\b/.test(text) && /\buseNoDoor\(/.test(text));
}

describe('a fixed inset-0 sheet or card that uses useNoDoor closes by Back (mw-zbgo4ep.42)', () => {
  const found = coveringNoDoor();

  it('finds the sheets: the search is not empty and finds the Bible voice question', () => {
    expect(found.length).toBeGreaterThan(4);
    expect(found.map((f) => f.file)).toContain(join('speech', 'DataVoiceQuestion.tsx'));
  });

  it('each calls useSheetBack, as ChapterPicker does, or is on NO_BACK_STEP with a reason', () => {
    const missing = found.filter(({ file, text }) => !/\buseSheetBack\(/.test(text) && !NO_BACK_STEP.some((row) => row.file === file)).map((f) => f.file);
    expect(missing, 'these cover the screen and keep no door, but Back would leave the screen instead of closing them').toEqual([]);
  });

  it('NO_BACK_STEP names only files that cover the screen with no Back step, each with a reason', () => {
    for (const row of NO_BACK_STEP) {
      expect(row.why.length).toBeGreaterThan(10);
      expect(found.some((f) => f.file === row.file && !/\buseSheetBack\(/.test(f.text))).toBe(true);
    }
  });
});
