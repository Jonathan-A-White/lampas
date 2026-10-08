import { describe, expect, it } from 'vitest';
import { parseImport } from '../../src/data/importWords';

const words = (text: string) => parseImport(text).map((l) => (l.ok ? [l.headword, l.gloss, l.lesson] : [l.line, l.reason]));

describe('reading pasted import text', () => {
  it('splits a line at an em dash, an en dash, a spaced hyphen, a tab or a comma', () => {
    for (const sep of [' — ', ' – ', ' - ', '\t', ', ']) {
      expect(words(`ἀνάστασις${sep}resurrection`)).toEqual([['ἀνάστασις', 'resurrection', 0]]);
    }
  });

  it("keeps BMA's endings out of the headword but uses the dash split first", () => {
    expect(words('ἄνθρωπος, -ου, ὁ — man, people')).toEqual([['ἄνθρωπος', 'man, people', 0]]);
  });

  it('reads a row of the example table, keeping its lesson, and skips the header and the rule', () => {
    expect(
      words(
        [
          '| # | Greek lemma | Lvl | Lsn | English gloss | Part of speech | note |',
          '|---|---|---|---|---|---|---|',
          '| 7 | ἀλλά, ἀλλ᾽ | 1 | 5 | but, yet, except | Conjunction | |',
        ].join('\n'),
      ),
    ).toEqual([['ἀλλά', 'but, yet, except', 5]]);
  });

  it('skips blank lines and tolerates Windows line ends', () => {
    expect(words('\n  \nλόγος — word\r\n\r\n')).toEqual([['λόγος', 'word', 0]]);
  });

  it('flags a line whose word is not Greek', () => {
    expect(words('spirit\nπνεῦμα')).toEqual([['spirit', 'Not a Greek word'], ['πνεῦμα', '', 0]]);
  });

  it('normalises the pasted word to NFC (oxia becomes tonos)', () => {
    const [line] = parseImport('ἀγάπη — love');
    expect(line.ok && line.headword).toBe('ἀγάπη'.normalize('NFC'));
    const [oxia] = parseImport('ί — x'); // ί (tonos)
    expect(oxia.ok && oxia.headword).toBe('ί');
    const [oxia2] = parseImport('ί — x'); // ί (oxia)
    expect(oxia2.ok && oxia2.headword).toBe('ί');
  });
});
