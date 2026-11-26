// The pictures of two guides (mw-fnvjof.17.317.8): a code box that is a picture is read whole on a 390 px phone only if no line is over
// 30 characters (GitHub's box cuts the rest until it is scrolled sideways), so each row's label goes in a list under the box, never at its
// right. docs/timeline-design.md holds the same line in tests/unit/timeline-design.test.ts (mw-fnvjof.17.317.7).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Each guide, and the heading from which its boxes are pictures: docs/layout/diagram.md opens with a listing of files (a code box of `path  # note` lines, not a picture), so only the boxes after its conventions count. */
const DOCS: [path: string, from: string | null][] = [
  ['docs/verse-view.md', null],
  ['docs/layout/diagram.md', '## The Reed-Kellogg conventions'],
];
/** The widest line a code box shows whole on a 390 px phone, in characters. */
const BOX_MAX = 30;
/** A code box that is a picture has no language, or `text`; one with a language (`bash`) is lines to copy, which cannot be folded. */
const PICTURE = ['', 'text'];

/** The picture boxes of `text`: where each fence opens (counted from 1) and its lines. */
function pictures(text: string): { at: number; lines: string[] }[] {
  const found: { at: number; lines: string[] }[] = [];
  let box: { at: number; lang: string; lines: string[] } | null = null;
  for (const [i, line] of text.split('\n').entries()) {
    const fence = line.match(/^```(.*)$/);
    if (!fence) box?.lines.push(line);
    else if (box) {
      if (PICTURE.includes(box.lang)) found.push(box);
      box = null;
    } else box = { at: i + 1, lang: fence[1].trim(), lines: [] };
  }
  return found;
}

describe('the pictures of the guides', () => {
  for (const [path, from] of DOCS) {
    it(`${path} draws every picture no wider than ${BOX_MAX} characters`, () => {
      expect(existsSync(path), `${path} exists`).toBe(true);
      const text = readFileSync(path, 'utf8');
      const start = from === null ? 0 : text.indexOf(from);
      expect(start, `${path} has "${from}"`).toBeGreaterThan(-1);
      const skipped = text.slice(0, start).split('\n').length - 1;
      const boxes = pictures(text.slice(start)).map((box) => ({ ...box, at: box.at + skipped }));
      expect(boxes.length, 'has a picture').toBeGreaterThan(0);
      const wide = boxes.flatMap((box) => box.lines.map((line, i) => ({ at: box.at + 1 + i, width: [...line].length }))).filter(({ width }) => width > BOX_MAX);
      expect(wide.map(({ at, width }) => `${path}:${at} is ${width} characters wide`)).toEqual([]);
    });
  }
});
