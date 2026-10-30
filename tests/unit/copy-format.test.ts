import { describe, expect, it } from 'vitest';
import { copyUnitOf, copyText, COPY_DEFAULTS, type CopyFormat, type CopyUnit } from '../../src/copy/format';
import type { Chapter, GreekWord, Verse } from '../../src/data/chapter';
import { weaveVerse, wovenInOrder } from '../../src/data/weave';

const verse = (n: number, english: string, original: string, h?: string): Verse => ({
  n,
  ...(h ? { h } : {}),
  g: original.split(' ').map((t) => ({ t, tr: '', s: 'G1', l: t, p: '' })),
  e: english.split(' ').map((t, i) => ({ t, g: [Math.min(i, original.split(' ').length - 1)] })),
});

const COL: CopyUnit[] = [
  { kind: 'verse', book: 'Colossians', code: 'col', chapter: 3, language: 'grc', verses: [{ n: 1, english: 'Since, then, you have been raised with Christ,' }] },
  {
    kind: 'passage',
    book: 'Colossians',
    code: 'col',
    chapter: 3,
    language: 'grc',
    verses: [
      { n: 1, english: 'Since, then, you have been raised with Christ,' },
      { n: 2, english: 'Set your minds on things above.' },
    ],
  },
  {
    kind: 'chapter',
    book: 'Colossians',
    code: 'col',
    chapter: 3,
    language: 'grc',
    verses: [
      { n: 1, english: 'One.' },
      { n: 2, english: 'Two.' },
      { n: 3, english: 'Three.' },
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

describe('copyText: the other rows', () => {
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
    expect(unit).toMatchObject({ kind: 'verse', book: 'Colossians', code: 'col', chapter: 3, language: 'grc', verses: [{ n: 1, english: 'Since then' }] });
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

describe('copyText: As you read it', () => {
  const word = (t: string, l: string): GreekWord => ({ t, tr: '', s: 'G1', l, p: '' });
  // Colossians 3:1 and 3:2: 'Since, then, you have been raised with Christ,' / 'Set your minds on things above.'
  const col1: Verse = {
    n: 1,
    g: [word('Εἰ', 'εἰ'), word('οὖν', 'οὖν'), word('συνηγέρθητε', 'συνεγείρω'), word('τῷ', 'ὁ'), word('Χριστῷ', 'Χριστός')],
    e: [
      { t: 'Since, then,', g: [0, 1] },
      { t: 'you have been raised', g: [2] },
      { t: 'with', g: [3] },
      { t: 'Christ,', g: [4] },
    ],
  };
  const col2: Verse = { n: 2, g: [word('τὰ', 'ὁ'), word('ἄνω', 'ἄνω')], e: [{ t: 'Set your minds', g: [] }, { t: 'on things above.', g: [0, 1] }] };
  const col: Chapter = { book: 'Colossians', code: 'col', chapter: 3, lang: 'grc', lex: {}, parse: {}, verses: [col1, col2] } as Chapter;
  const solid = new Set(['Χριστός', 'εἰ', 'οὖν']);
  const wovenAll = (order: 'english' | 'greek' = 'english') => col.verses.map((v) => wovenInOrder(v, weaveVerse(v, { solid }), order));
  const noLink = fmt({ link: 'off' });

  it('is all Copy gives, with no choice of text, and the verse he reads in English is the English', () => {
    expect(Object.keys(D).sort()).toEqual(['link', 'numbers', 'reference']);
    const unit = copyUnitOf(col, col1, { view: 'english', woven: null });
    expect(copyText(unit, D)).toBe('Since, then, you have been raised with Christ,\n— Colossians 3:1 (MSB)\nhttps://lampas.allmymind.org/#/?ref=Col.3.1');
  });
  it('in the Greek view is the Greek', () => {
    const unit = copyUnitOf(col, col1, { view: 'greek', woven: null });
    expect(copyText(unit, noLink)).toBe('Εἰ οὖν συνηγέρθητε τῷ Χριστῷ\n— Colossians 3:1 (MSB)');
  });
  it('in the Weave is the woven verse: the Greek of his words in their places in the English', () => {
    const unit = copyUnitOf(col, col1, { view: 'english', woven: wovenAll() });
    expect(copyText(unit, noLink)).toBe('Εἰ οὖν you have been raised with Χριστῷ\n— Colossians 3:1 (MSB)');
  });
  it('in the Weave drops the English a learning word stands over, and keeps the chunks of a Greek-order weave in the order the Reader lays them out', () => {
    const learning = col.verses.map((v) => wovenInOrder(v, weaveVerse(v, { solid: new Set(['ὁ']), learning: new Set(['Χριστός']) }), 'english'));
    expect(copyText(copyUnitOf(col, col1, { view: 'english', woven: learning }), noLink)).toBe('Since, then, you have been raised τῷ Χριστῷ\n— Colossians 3:1 (MSB)');
    const reordered: Verse = { ...col1, e: [col1.e[3], col1.e[0], col1.e[1], col1.e[2]] };
    const greekOrder = wovenInOrder(reordered, weaveVerse(reordered, { solid }), 'greek');
    expect(greekOrder.order).toEqual([1, 2, 3, 0]);
    const unit = copyUnitOf({ ...col, verses: [reordered] }, reordered, { view: 'english', woven: [greekOrder] });
    expect(copyText(unit, noLink)).toBe('Εἰ οὖν you have been raised with Χριστῷ\n— Colossians 3:1 (MSB)');
  });
  it('a passage in the Weave numbers its verses, a verse with nothing woven stays English', () => {
    const unit = copyUnitOf(col, { ...col1, to: 2 }, { view: 'english', woven: wovenAll() });
    expect(copyText(unit, fmt({ link: 'off', reference: 'off' }))).toBe('1 Εἰ οὖν you have been raised with Χριστῷ 2 Set your minds on things above.');
  });
  it('a chapter in the Greek view is the Greek of every verse', () => {
    const unit = copyUnitOf(col, { ...col1, to: 2 }, { view: 'greek', woven: null });
    expect(unit.kind).toBe('chapter');
    expect(copyText(unit, fmt({ link: 'off', reference: 'off' }))).toBe('1 Εἰ οὖν συνηγέρθητε τῷ Χριστῷ 2 τὰ ἄνω');
  });
  it('a view that cannot be known (no chapter open) falls back to English', () => {
    expect(copyText(copyUnitOf(col, col1), noLink)).toBe('Since, then, you have been raised with Christ,\n— Colossians 3:1 (MSB)');
  });
  it('a Hebrew verse in its own view is the Hebrew, its words in reading order (right to left on paste), and in the Weave the Hebrew stands in the English', () => {
    const gen: Verse = {
      n: 1,
      g: [word('בְּרֵאשִׁ֖ית', 'רֵאשִׁית'), word('בָּרָ֣א', 'בָּרָא'), word('אֱלֹהִ֑ים', 'אֱלֹהִים')],
      e: [{ t: 'In the beginning', g: [0] }, { t: 'created', g: [1] }, { t: 'God', g: [2] }],
    };
    const chapter = { book: 'Genesis', code: 'gen', chapter: 1, lang: 'hbo', lex: {}, parse: {}, verses: [gen] } as Chapter;
    expect(copyText(copyUnitOf(chapter, gen, { view: 'greek', woven: null }), fmt({ link: 'off', reference: 'off' }))).toBe('בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים');
    const woven = [wovenInOrder(gen, weaveVerse(gen, { solid: new Set(['בָּרָא']) }), 'english')];
    expect(copyText(copyUnitOf(chapter, gen, { view: 'english', woven }), fmt({ link: 'off', reference: 'off' }))).toBe('In the beginning בָּרָ֣א God');
  });
});
