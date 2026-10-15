// The English key words live only in the accent tables (mw-5r3p30.352, his words: "build it in a modular way so that somebody could choose British"): a
// Greek scheme maps its sounds to the standard ids (src/speech/sounds.ts) and says them through the accent accessor (src/speech/accents/), so no file of
// src/ or grinds/ outside src/speech/accents/ keys a sound to an English word, not even the scheme's own: a third accent is one more table.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACCENTS } from '../../src/speech/accents';
import { keyWordsIn } from '../support/sound-rules-scan';

const scanned = (): string[] =>
  execSync('git ls-files src grinds', { encoding: 'utf8' })
    .split('\n')
    .filter((f) => (f.startsWith('src/') && /\.(ts|tsx)$/.test(f)) || (f.startsWith('grinds/') && !f.startsWith('grinds/examples/') && /\.(md|json)$/.test(f)));

/** Every word an accent table keys a sound to: 'father', 'or', 'loch' ... */
const KEY_WORDS = [...new Set(ACCENTS.flatMap((a) => Object.values(a.hints).flatMap((h) => (h.word ? [h.word] : []))))];

describe('every English key word comes from an accent table', () => {
  it('reads the schemes and the accent tables', () => {
    const files = scanned();
    expect(files).toContain('src/speech/schemes/modernLessons.ts');
    expect(files).toContain('src/speech/accents/american.ts');
    expect(KEY_WORDS).toEqual(expect.arrayContaining(['father', 'or', 'lot', 'loch']));
  });

  it('finds no sound keyed to an English word outside src/speech/accents/', () => {
    const found = scanned().flatMap((file) => keyWordsIn(file, readFileSync(file, 'utf8'), KEY_WORDS).map((r) => `${file}: ${r.rule}: ${r.text}`));
    expect(found).toEqual([]);
  });
});

describe('the scan', () => {
  it("fails on an 'as in' line planted in a scheme or a screen, and lets an accent table hold it", () => {
    const planted = "export const o = 'o, as in “lot”';\n";
    expect(keyWordsIn('src/speech/schemes/planted.ts', planted)).toHaveLength(1);
    expect(keyWordsIn('src/Planted.tsx', 'export const P = () => <p>dh, the th of “this”</p>;\n')).toHaveLength(1);
    expect(keyWordsIn('src/speech/accents/planted.ts', planted)).toEqual([]);
  });

  it('fails on a key word quoted in a scheme, however it is put', () => {
    expect(keyWordsIn('src/speech/schemes/planted.ts', "export const o = 'ο sounds like “lot”';\n", KEY_WORDS)).toHaveLength(1);
    expect(keyWordsIn('src/speech/schemes/planted.ts', "export const w = 'λύομεν “we loose”';\n", KEY_WORDS)).toEqual([]);
  });
});
