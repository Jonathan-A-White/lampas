import { describe, expect, it } from 'vitest';
import { copyUnitOf, copyText, COPY_DEFAULTS, type CopyFormat, type CopyUnit } from '../../src/copy/format';
import type { Chapter, Verse } from '../../src/data/chapter';

const verse = (n: number, english: string, original: string, h?: string): Verse => ({
  n,
  ...(h ? { h } : {}),
  g: original.split(' ').map((t) => ({ t, tr: '', s: 'G1', l: t, p: '' })),
  e: english.split(' ').map((t, i) => ({ t, g: [Math.min(i, original.split(' ').length - 1)] })),
});

const COL: CopyUnit[] = [
  { kind: 'verse', book: 'Colossians', code: 'col', chapter: 3, language: 'grc', verses: [{ n: 1, english: 'Since, then, you have been raised with Christ,', original: 'Εἰ οὖν συνηγέρθητε τῷ Χριστῷ' }] },
  {
    kind: 'passage',
    book: 'Colossians',
    code: 'col',
    chapter: 3,
    language: 'grc',
    verses: [
      { n: 1, english: 'Since, then, you have been raised with Christ,', original: 'Εἰ οὖν συνηγέρθητε τῷ Χριστῷ' },
      { n: 2, english: 'Set your minds on things above.', original: 'τὰ ἄνω φρονεῖτε' },
    ],
  },
  {
    kind: 'chapter',
    book: 'Colossians',
    code: 'col',
    chapter: 3,
    language: 'grc',
    verses: [
      { n: 1, english: 'One.', original: 'Εἰ' },
      { n: 2, english: 'Two.', original: 'τὰ' },
      { n: 3, english: 'Three.', original: 'ἀπεθάνετε' },
    ],
  },
];
const [verse1, passage, chapter] = COL;

const D = COPY_DEFAULTS;
const fmt = (over: Partial<CopyFormat>): CopyFormat => ({ ...D, ...over });

describe('copyText: the defaults', () => {
  it('a verse: English, then the reference after, then the link on its own last line; no verse number', () => {
    expect(copyText(verse1, D)).toBe('Since, then, you have been raised with Christ,\n— Colossians 3:1 (MSB)\nhttps://lampas.allmymind.org/#/?ref=Col.3.1');
  });
  it('a passage: each verse numbered, the range as the reference, the passage link', () => {
    expect(copyText(passage, D)).toBe(
      '1 Since, then, you have been raised with Christ, 2 Set your minds on things above.\n— Colossians 3:1-2 (MSB)\nhttps://lampas.allmymind.org/#/?ref=Col.3.1-2',
    );
  });
  it('a chapter: the reference is the chapter alone, and the link is the chapter', () => {
    expect(copyText(chapter, D)).toBe('1 One. 2 Two. 3 Three.\n— Colossians 3 (MSB)\nhttps://lampas.allmymind.org/#/?ref=Col.3.1-3');
  });
});

describe('copyText: each choice', () => {
  it('Text the original gives the Greek of a New Testament verse', () => {
    expect(copyText(verse1, fmt({ text: 'original', link: 'off' }))).toBe('Εἰ οὖν συνηγέρθητε τῷ Χριστῷ\n— Colossians 3:1 (MSB)');
  });
  it('Text both: English, then the original, each its own paragraph; the reference after the two', () => {
    expect(copyText(passage, fmt({ text: 'both', link: 'off' }))).toBe(
      '1 Since, then, you have been raised with Christ, 2 Set your minds on things above.\n\n1 Εἰ οὖν συνηγέρθητε τῷ Χριστῷ 2 τὰ ἄνω φρονεῖτε\n— Colossians 3:1-2 (MSB)',
    );
  });
  it('Reference before puts the reference on the first line', () => {
    expect(copyText(verse1, fmt({ reference: 'before', link: 'off' }))).toBe('Colossians 3:1 (MSB)\nSince, then, you have been raised with Christ,');
    expect(copyText(chapter, fmt({ reference: 'before' }))).toBe('Colossians 3 (MSB)\n1 One. 2 Two. 3 Three.\nhttps://lampas.allmymind.org/#/?ref=Col.3.1-3');
  });
  it('Reference off leaves it out', () => {
    expect(copyText(verse1, fmt({ reference: 'off' }))).toBe('Since, then, you have been raised with Christ,\nhttps://lampas.allmymind.org/#/?ref=Col.3.1');
  });
  it('Verse numbers off leaves them out of a passage and a chapter', () => {
    expect(copyText(passage, fmt({ numbers: 'off', link: 'off', reference: 'off' }))).toBe('Since, then, you have been raised with Christ, Set your minds on things above.');
    expect(copyText(chapter, fmt({ numbers: 'off', link: 'off', reference: 'off' }))).toBe('One. Two. Three.');
  });
  it('Link off leaves the link out', () => {
    expect(copyText(chapter, fmt({ link: 'off' }))).toBe('1 One. 2 Two. 3 Three.\n— Colossians 3 (MSB)');
  });
  it('everything off but the text is the text alone', () => {
    expect(copyText(verse1, fmt({ reference: 'off', link: 'off' }))).toBe('Since, then, you have been raised with Christ,');
  });
  it('Link on with Reference before ends with the link', () => {
    expect(copyText(passage, fmt({ text: 'both', reference: 'before', numbers: 'off' }))).toBe(
      'Colossians 3:1-2 (MSB)\nSince, then, you have been raised with Christ, Set your minds on things above.\n\nΕἰ οὖν συνηγέρθητε τῷ Χριστῷ τὰ ἄνω φρονεῖτε\nhttps://lampas.allmymind.org/#/?ref=Col.3.1-2',
    );
  });
});

describe('copyText: Hebrew and an English-only chapter', () => {
  const hebrew: CopyUnit = { kind: 'verse', book: 'Genesis', code: 'gen', chapter: 1, language: 'hbo', verses: [{ n: 1, english: 'In the beginning God created', original: 'בְּרֵאשִׁ֖ית בָּרָ֣א' }] };
  it('the original of an Old Testament verse is its Hebrew', () => {
    expect(copyText(hebrew, fmt({ text: 'original', link: 'off' }))).toBe('בְּרֵאשִׁ֖ית בָּרָ֣א\n— Genesis 1:1 (MSB)');
  });
  it('both gives the English and then the Hebrew', () => {
    expect(copyText(hebrew, fmt({ text: 'both', link: 'off', reference: 'off' }))).toBe('In the beginning God created\n\nבְּרֵאשִׁ֖ית בָּרָ֣א');
  });
  it('a chapter with no original words gives English when asked for the original, and both gives English once', () => {
    const only: CopyUnit = { kind: 'chapter', book: 'Genesis', code: 'gen', chapter: 2, language: 'hbo', verses: [{ n: 1, english: 'Thus the heavens', original: '' }, { n: 2, english: 'By the seventh day', original: '' }] };
    expect(copyText(only, fmt({ text: 'original', link: 'off', reference: 'off' }))).toBe('1 Thus the heavens 2 By the seventh day');
    expect(copyText(only, fmt({ text: 'both', link: 'off', reference: 'off' }))).toBe('1 Thus the heavens 2 By the seventh day');
  });
});

describe("copyUnitOf: what the Verse view shows, as a unit", () => {
  const chapterText = {
    book: 'Colossians',
    code: 'col',
    chapter: 3,
    lang: 'grc',
    lex: {},
    parse: {},
    verses: [verse(1, 'Since then', 'Εἰ οὖν', 'Your life'), verse(2, 'Set minds', 'τὰ ἄνω')],
  } as Chapter;
  it('a verse', () => {
    const unit = copyUnitOf(chapterText, chapterText.verses[0]);
    expect(unit).toMatchObject({ kind: 'verse', book: 'Colossians', code: 'col', chapter: 3, language: 'grc', verses: [{ n: 1, english: 'Since then', original: 'Εἰ οὖν' }] });
  });
  it('a passage the view holds as one Verse (n to to) keeps its own verses', () => {
    const lone = { ...verse(2, 'Set minds', 'τὰ ἄνω'), to: 2 };
    const long: Chapter = { ...chapterText, verses: [...chapterText.verses, verse(3, 'Three', 'γ')] };
    const unit = copyUnitOf(long, { ...long.verses[0], to: 2 });
    expect(unit.kind).toBe('passage');
    expect(unit.verses.map((v) => v.n)).toEqual([1, 2]);
    expect(copyUnitOf(long, lone).kind).toBe('passage');
  });
  it('the whole chapter, as the place line opens it (first verse to last)', () => {
    const unit = copyUnitOf(chapterText, { ...chapterText.verses[0], to: 2 });
    expect(unit.kind).toBe('chapter');
    expect(unit.verses.map((v) => v.n)).toEqual([1, 2]);
  });
  it('a Hebrew chapter is read in Hebrew', () => {
    expect(copyUnitOf({ ...chapterText, lang: 'hbo' }, chapterText.verses[0]).language).toBe('hbo');
  });
});
