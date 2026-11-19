// The word sheet and the tutor's Talk draw one Add to my words control (mw-5r3p30.1203): src/AddWordButton.tsx, imported by both, defined by neither.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(path, 'utf8');

describe('the one Add to my words control', () => {
  for (const file of ['src/WordSheet.tsx', 'src/Talk.tsx']) {
    it(`${file} imports AddWord from ./AddWordButton and defines no look-alike`, () => {
      const source = read(file);
      expect(source).toContain("import { AddWord } from './AddWordButton'");
      expect(source).toMatch(/<AddWord /);
      expect(source).not.toMatch(/function AddWord\b/);
      expect(source).not.toContain("'Add to my words'");
      expect(source).not.toContain('data-add-word');
    });
  }

  it('the control is the only place that writes the labels and the guessed line', () => {
    const source = read('src/AddWordButton.tsx');
    expect(source).toContain("'Add to my words'");
    expect(source).toContain("'On my list'");
    expect(source).toContain('Not added: Lampas only guessed this word');
  });
});
