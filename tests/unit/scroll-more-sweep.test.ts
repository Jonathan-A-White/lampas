// tests/unit/scroll-more-sweep.test.ts — every row in src/ that scrolls sideways shows there is more (mw-fnvjof.17.104): a file with an overflow-x scroll box uses src/ScrollMore.tsx
// (useScrollMore / ScrollFades / ScrollMore: the next door peeks past the edge and a fade sits on the side with more). A new sideways row either takes it or is named here with its reason.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Files with an overflow-x box that is not a row to scroll to more of: none today. */
const EXEMPT: Record<string, string> = {
  'src/ScrollMore.tsx': 'the shared part itself',
  'src/useScrollMore.ts': 'the shared hook itself',
  'src/reader/useChapterSwipe.ts': 'reads whether a box under a press scrolls sideways; it draws none',
};

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

describe('every sideways scroll box shows there is more', () => {
  const sideways = /overflow-x-(auto|scroll)|overflow-x:\s*(auto|scroll)|overflowX\s*[:=]/;
  const found = files('src').filter((path) => sideways.test(readFileSync(path, 'utf8')));
  it('finds the rows', () => expect(found.length).toBeGreaterThan(3));
  for (const path of found) {
    it(`${path} uses ScrollMore`, () => {
      if (EXEMPT[path]) return;
      const text = readFileSync(path, 'utf8');
      expect(text, `${path} scrolls sideways: wire it to src/ScrollMore.tsx or name it in EXEMPT with the reason`).toMatch(/from '(\.\.?\/)+(ScrollMore|useScrollMore)'/);
    });
  }
});

// peekExtra over the real doors of the Verse view's tools line (widths measured at Luke 15:11, mw-fnvjof.17.121): at every row width a row that overflows ends with a door cut by the
// edge, 24 px or more inside and 20 px or more past it, never a fall-back to 0 that leaves no cue.
describe('peekExtra over the tools line', () => {
  const GAP = 4;
  const STATES: Record<string, number[]> = {
    'at rest': [55.52, 60.41, 88.52, 79.11, 112.55, 51.05],
    'Memorizing with Rehearse': [55.52, 60.41, 165.45, 85.45, 79.11, 112.55, 51.05],
  };
  /** The row is its window less the room the line keeps for the ? and the window's edge (96 px at 390: 294). */
  const ROOM = 96;
  for (const [state, widths] of Object.entries(STATES)) {
    it(`${state}: a door is cut by the edge at every width from 320 to 430`, async () => {
      const { peekExtra } = await import('../../src/scrollPeek');
      const lefts: number[] = [];
      const rights: number[] = [];
      let x = 0;
      for (const w of widths) {
        lefts.push(x);
        rights.push(x + w);
        x += w + GAP;
      }
      const failures: string[] = [];
      for (let vw = 320; vw <= 430; vw++) {
        const width = vw - ROOM;
        const extra = peekExtra(lefts, rights, width, GAP);
        const at = (i: number) => ({ left: lefts[i] + i * extra, right: rights[i] + i * extra });
        const cutAt = rights.findIndex((_, i) => at(i).right > width + 1);
        if (cutAt === -1) {
          if (rights[rights.length - 1] > width + 1) failures.push(`${vw}: extra ${extra} leaves no door cut`);
          continue;
        }
        const { left, right } = at(cutAt);
        if (width - left < 24 || right - width < 20) failures.push(`${vw}: extra ${extra}, door ${cutAt} has ${(width - left).toFixed(1)} inside and ${(right - width).toFixed(1)} past`);
        if (cutAt > 0 && width - at(cutAt - 1).right < 8) failures.push(`${vw}: extra ${extra}, a door ends ${(width - at(cutAt - 1).right).toFixed(1)} from the edge`);
      }
      expect(failures).toEqual([]);
    });
  }
});
