// mw-5r3p30.1164: the Berean tables' poetry marks (indent1stline, indent1, indent2) carried into the chapters as `l` and read back as lines (docs/data.md 'Poetry lines').
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { poetryOfPar } from '../../scripts/data/bereanTable';
import { buildVerse } from '../../scripts/data/chapterWriter';
import type { TableVerse, TableWord } from '../../scripts/data/bereanTable';
import type { Chapter, Verse } from '../../src/data/chapter';
import { poetryLinesOf } from '../../src/data/poetry';

const chapterOf = (path: string): Chapter => JSON.parse(readFileSync(`public/data/${path}.json`, 'utf8')) as Chapter;
const verseOf = (path: string, n: number): Verse => chapterOf(path).verses.find((v) => v.n === n)!;
const linesText = (v: Verse) => poetryLinesOf(v)?.map((l) => `${l.indent}:${l.text}`);

describe('the table\'s paragraph tag as a poetry line', () => {
  it('reads the first line of a block, and the lines inside it, with their indent', () => {
    expect(poetryOfPar('<p class=|indent1stline|>')).toEqual({ indent: 1, stanza: true });
    expect(poetryOfPar('<p class=|indent1|>')).toEqual({ indent: 1, stanza: false });
    expect(poetryOfPar('<p class=|indent2|>')).toEqual({ indent: 2, stanza: false });
  });
  it('reads the red forms, the words of Jesus, as the same lines', () => {
    expect(poetryOfPar('<p class=|indent1stlinered|>')).toEqual({ indent: 1, stanza: true });
    expect(poetryOfPar('<p class=|indentred1|>')).toEqual({ indent: 1, stanza: false });
    expect(poetryOfPar('<p class=|indentred2|>')).toEqual({ indent: 2, stanza: false });
  });
  it('reads a prose tag, a list, a tab, a selah and nothing as no line', () => {
    for (const tag of ['', '<p class=|reg|>', '<p class=|red|>', '<p class=|tab1stline|>', '<p class=|list1|>', '<p class=|selah|>', '<span class=|red|>']) expect(poetryOfPar(tag)).toBeUndefined();
  });
});

const word = (sort: number, english: string, par = ''): TableWord => ({ sourceSort: sort, englishSort: sort, text: `w${sort}`, translit: '', parse: 'N-NSM', strongs: 'G1', english, begQ: '', tail: '', par, note: '' });
const ident = (w: TableWord) => ({ t: w.text, tr: w.translit, s: w.strongs, l: 'x', p: w.parse });

describe('a verse the build lays out', () => {
  it('keeps where each line starts, as the English chunk it starts at, with its indent; a block start says so', () => {
    const v: TableVerse = {
      book: 'Psalms', chapter: 1, n: 1, heading: '',
      words: [word(1, 'Blessed', '<p class=|indent1stline|>'), word(2, 'the man'), word(3, 'who walks', '<p class=|indent2|>'), word(4, 'in'), word(5, 'or sits', '<p class=|indent1|>')],
    };
    const built = buildVerse(v, ident);
    expect(built.l).toEqual([[0, 1, 1], [2, 2], [4, 1]]);
    expect(built.p).toBe(1);
  });
  it('puts a line start on a word with no English of its own on the next chunk', () => {
    const v: TableVerse = { book: 'Psalms', chapter: 1, n: 1, heading: '', words: [word(1, 'A'), word(2, '-', '<p class=|indent2|>'), word(3, 'B')] };
    expect(buildVerse(v, ident).l).toEqual([[1, 2]]);
  });
  it('leaves a prose verse as it was: no `l`', () => {
    const v: TableVerse = { book: 'Romans', chapter: 8, n: 1, heading: '', words: [word(1, 'Therefore', '<p class=|reg|>'), word(2, 'there is')] };
    const built = buildVerse(v, ident);
    expect(built.l).toBeUndefined();
    expect(built.p).toBe(1);
  });
});

describe('the committed chapters', () => {
  it('Psalm 1:1 is its lines as the table has them, each indent as the table gives it', () => {
    expect(linesText(verseOf('psa/1', 1))).toEqual([
      '1:Blessed is the man',
      '2:who does not walk in the counsel of the wicked,',
      '1:or set foot on the path of sinners,',
      '2:or sit in the seat of mockers.',
    ]);
    expect(poetryLinesOf(verseOf('psa/1', 1))![0].stanza).toBe(true);
    expect(poetryLinesOf(verseOf('psa/1', 2))![0].stanza).toBe(false);
    expect(poetryLinesOf(verseOf('psa/1', 4))![0].stanza).toBe(true);
  });
  it('Psalm 23 and the Magnificat carry lines in every verse that has them', () => {
    expect(chapterOf('psa/23').verses.filter((v) => v.l).length).toBeGreaterThanOrEqual(5);
    for (let n = 46; n <= 55; n++) expect(verseOf('luk/1', n).l, `Luke 1:${n}`).toBeDefined();
  });
  it('Romans 8:1-4 and Genesis 1:1-26 carry none: prose stays prose', () => {
    expect(chapterOf('rom/8').verses.filter((v) => v.n <= 4 && v.l)).toEqual([]);
    expect(chapterOf('gen/1').verses.filter((v) => v.n <= 26 && v.l)).toEqual([]);
  });
  it('a verse the table sets as a quoted line is poetry wherever it stands: Romans 8:36 (Psalm 44:22) and Genesis 1:27', () => {
    expect(linesText(verseOf('rom/8', 36))).toEqual(['0:As it is written:', '1:“For Your sake we face death all day long;', '2:we are considered as sheep to be slaughtered.”']);
    expect(verseOf('gen/1', 27).l).toBeDefined();
  });
  it('the words before a verse\'s first mark are its lead-in, flush left: Luke 1:46 and the title of Psalm 23', () => {
    expect(linesText(verseOf('luk/1', 46))?.[0]).toBe('0:Then Mary said:');
    expect(poetryLinesOf(verseOf('psa/23', 1))![0]).toMatchObject({ indent: 0, text: 'A Psalm of David.', continued: true });
  });
  it('every line start is a chunk of its verse, in order, with an indent of 1 or 2', () => {
    for (const path of ['psa/1', 'psa/23', 'luk/1', 'psa/119', 'job/3', 'isa/53']) {
      for (const v of chapterOf(path).verses) {
        let last = -1;
        for (const [chunk, indent] of v.l ?? []) {
          expect(chunk).toBeGreaterThan(last);
          expect(chunk).toBeLessThan(v.e.length);
          expect([1, 2]).toContain(indent);
          last = chunk;
        }
      }
    }
  });
});
