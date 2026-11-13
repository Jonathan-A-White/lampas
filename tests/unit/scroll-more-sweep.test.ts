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
