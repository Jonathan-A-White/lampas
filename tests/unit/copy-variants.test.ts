// tests/unit/copy-variants.test.ts — Copy 'As you read it' follows the variants he has on (mw-5r3p30.866): a hold on 1 Peter 4:1 with Variants shown copied the plain verse, with no
// '{left out NA}'. What is copied is what the Reader draws: each shown unit's brace after its words (src/reader/variants.ts braceText, the string VariantBrace draws), a reading laid in place as laid.
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { COPY_DEFAULTS, copyText, copyUnitOf, type CopyFormat, type ReadView } from '../../src/copy/format';
import type { Chapter, GreekWord, VariantCode, VariantUnit, Verse } from '../../src/data/chapter';
import type { ReaderView } from '../../src/data/repositories';
import { weaveVerse, wovenInOrder } from '../../src/data/weave';
import type { ReadingSet } from '../../src/reader/readingSets';
import { VerseText } from '../../src/reader/VerseText';
import { plainEnglish, readerVariants, type ReaderVariants } from '../../src/reader/variants';

afterEach(cleanup);

const BARE: CopyFormat = { ...COPY_DEFAULTS, reference: 'off', link: 'off' };
const PETER = JSON.parse(readFileSync('public/data/1pe/4.json', 'utf8')) as Chapter;
const PLAIN_1 = 'Therefore, since Christ suffered for us in His body, arm yourselves with the same resolve, because anyone who has suffered in his body is done with sin.';
const BRACED_1 = 'Therefore, since Christ suffered for us {left out NA} in His body, arm yourselves with the same resolve, because anyone who has suffered {left out NA} in his body is done with sin.';

const on = (chapter: Chapter, set?: ReadingSet): ReaderVariants => readerVariants(chapter, { variants: 'english', witnesses: 'ecm', set });
const off = (chapter: Chapter, set?: ReadingSet): ReaderVariants => readerVariants(chapter, { variants: 'off', witnesses: 'ecm', set });
const copied = (chapter: Chapter, from: number, to: number | undefined, read: ReadView, format: CopyFormat = BARE): string => copyText(copyUnitOf(chapter, { n: from, to }, read), format);

describe("1 Peter 4:1 with Variants shown, Copy gives it as you read it", () => {
  it('copies the verse with each unit’s brace after its words, as the Reader draws it', () => {
    expect(copied(PETER, 1, undefined, { view: 'english', woven: null, variants: on(PETER) })).toBe(BRACED_1);
  });

  it('copies the plain verse with Variants off', () => {
    expect(copied(PETER, 1, undefined, { view: 'english', woven: null, variants: off(PETER) })).toBe(PLAIN_1);
    expect(copied(PETER, 1, undefined, { view: 'english', woven: null })).toBe(PLAIN_1);
  });

  it('numbers the verses of a passage and draws each verse’s braces', () => {
    const text = copied(PETER, 1, 2, { view: 'english', woven: null, variants: on(PETER) }, { ...BARE, numbers: 'on' });
    expect(text.startsWith(`1 ${BRACED_1} 2 `)).toBe(true);
  });

  it('in the Greek view puts the Greek of the reading in the brace, as the Greek view draws it', () => {
    const text = copied(PETER, 1, undefined, { view: 'greek', woven: null, variants: on(PETER) });
    expect(text).toBe('Χριστοῦ οὖν παθόντος ὑπὲρ ἡμῶν {left out NA} σαρκί καὶ ὑμεῖς τὴν αὐτὴν ἔννοιαν ὁπλίσασθε ὅτι ὁ παθὼν ἐν {left out NA} σαρκί πέπαυται ἁμαρτίας');
  });
});

// A small verse for the readings laid in place and the other shapes of brace: 'And Jesus said to them, truly.'
const word = (t: string, l: string, e?: number): GreekWord => ({ t, tr: '', s: 'G1', l, p: 'X', ...(e === undefined ? {} : { e }) });
const VERSE: Verse = {
  n: 1,
  g: [word('Καὶ', 'καί', 0), word('εἶπεν', 'λέγω', 2), word('ὁ', 'ὁ', 1), word('Ἰησοῦς', 'Ἰησοῦς', 1), word('αὐτοῖς', 'αὐτός', 3), word('ἀμήν', 'ἀμήν', 4)],
  e: [
    { t: 'And', g: [0] },
    { t: 'Jesus', g: [2, 3] },
    { t: 'said', g: [1] },
    { t: 'to them,', g: [4] },
    { t: 'truly.', g: [5] },
  ],
};
const unit = (v: number, w: number[], base: string, alts: [VariantCode, string, string][], english: string): VariantUnit => ({
  v,
  w,
  base,
  alts: alts.map(([code, text]) => ({ code, text })),
  english: { source: 'lampas', base: english, alts: alts.map(([, , e]) => e) },
  changesEnglish: alts.some(([, , e]) => plainEnglish(e) !== plainEnglish(english)),
  witness: alts.some(([c]) => c === 'B') ? 'byz' : 'na',
});
const LORD = unit(1, [3], 'Ἰησοῦς', [['N', 'κύριος', 'the Lord'], ['M', 'κύριος', 'the Lord']], 'Jesus');
const HIM = unit(1, [4], 'αὐτοῖς', [['B', 'αὐτῷ', 'to him']], 'to them');
const JOHN: Chapter = { book: 'John', code: 'jhn', chapter: 1, verses: [VERSE], variants: [LORD, HIM] } as Chapter;
const MINE = (choices: Record<string, number>): ReadingSet => ({ id: 'mine', name: 'Mine', choices });
const HEAR = (variants: ReaderVariants, view: ReaderView = 'english'): ReadView => ({ view, woven: null, variants });

describe('a verse with two units', () => {
  it('draws both braces, the second with its own siglum', () => {
    expect(copied(JOHN, 1, undefined, HEAR(on(JOHN)))).toBe('And Jesus {the Lord NA ECM} said to them, {to him B} truly.');
  });

  it('in the Greek view draws the Greek of each reading', () => {
    expect(copied(JOHN, 1, undefined, HEAR(on(JOHN), 'greek'))).toBe('Καὶ εἶπεν ὁ Ἰησοῦς {κύριος NA ECM} αὐτοῖς {αὐτῷ B} ἀμήν');
  });

  it('copies a reading laid in place as laid, its brace holding the others and the text’s own under RP', () => {
    const set = MINE({ 'jhn 1:1 Ἰησοῦς': 0 });
    expect(copied(JOHN, 1, undefined, HEAR(on(JOHN, set)))).toBe('And the Lord {Jesus RP} said to them, {to him B} truly.');
    expect(copied(JOHN, 1, undefined, HEAR(on(JOHN, set), 'greek'))).toBe('Καὶ εἶπεν ὁ κύριος {Ἰησοῦς RP} αὐτοῖς {αὐτῷ B} ἀμήν');
  });

  it('copies a reading laid in place with Variants off too, as the Reader shows it, with no braces', () => {
    const set = MINE({ 'jhn 1:1 Ἰησοῦς': 0 });
    expect(copied(JOHN, 1, undefined, HEAR(off(JOHN, set)))).toBe('And the Lord said to them, truly.');
  });

  it('a hold on a verse number, a heading (passage) and the place line (chapter), and the Verse view, give the same text for the same verses', () => {
    const read = HEAR(on(JOHN));
    const verse = copied(JOHN, 1, undefined, read, COPY_DEFAULTS);
    const passage = copied(JOHN, 1, 1, read, COPY_DEFAULTS);
    expect(verse).toContain('{the Lord NA ECM}');
    // one verse is the same text as the passage or the chapter of that one verse, bar the reference the unit names
    expect(passage.split('\n')[0]).toBe(verse.split('\n')[0]);
  });
});

describe('the weave', () => {
  // he knows καί, λέγω and αὐτός, not Ἰησοῦς: 'to them,' is woven (αὐτοῖς), 'Jesus' stays English
  const woven = wovenInOrder(VERSE, weaveVerse(VERSE, { solid: new Set(['καί', 'λέγω', 'αὐτός']) }), 'english');

  it('draws each brace in the language its unit’s chunks take: Greek where they are woven, English where they stay English', () => {
    const text = copied(JOHN, 1, undefined, { view: 'english', woven: [woven], variants: on(JOHN) });
    expect(text).toBe('Καὶ Jesus {the Lord NA ECM} εἶπεν αὐτοῖς {αὐτῷ B} truly.');
  });
});

describe('the text copied is the text the Reader draws', () => {
  const rendered = (chapter: Chapter, view: ReaderView, variants: ReaderVariants, n = 1, woven: ReturnType<typeof wovenInOrder> | null = null): string => {
    const verse = chapter.verses.find((v) => v.n === n) as Verse;
    const { container } = render(createElement(VerseText, { verse, view, woven, onLook: () => {}, variants: variants.byVerse?.get(n), chosen: variants.chosenByVerse.get(n) }));
    // the sigla of one reading are boxes side by side, each its own button, with a word joiner between: the copy writes a space there
    container.querySelectorAll('[data-witness]').forEach((w) => w.previousSibling?.previousSibling && w.before(' '));
    return (container.textContent ?? '').replace(/\u2060/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  };
  it.each(['english', 'greek'] as const)('1 Peter 4:1 in the %s view', (view) => {
    const copy = copied(PETER, 1, undefined, { view, woven: null, variants: on(PETER) });
    expect(copy).toBe(rendered(PETER, view, on(PETER)));
  });
  it('the weave', () => {
    const woven = wovenInOrder(VERSE, weaveVerse(VERSE, { solid: new Set(['καί', 'λέγω', 'αὐτός']) }), 'english');
    const copy = copied(JOHN, 1, undefined, { view: 'english', woven: [woven], variants: on(JOHN) });
    expect(copy).toBe(rendered(JOHN, 'english', on(JOHN), 1, woven));
  });
  it.each(['english', 'greek'] as const)('a reading laid in place in the %s view', (view) => {
    const variants = on(JOHN, MINE({ 'jhn 1:1 Ἰησοῦς': 0 }));
    expect(copied(JOHN, 1, undefined, { view, woven: null, variants })).toBe(rendered(JOHN, view, variants));
  });
});
