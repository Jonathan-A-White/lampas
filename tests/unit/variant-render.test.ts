// tests/unit/variant-render.test.ts — the Reader's variants (mw-9ji6ek0.5): which units and readings the filter shows (src/reader/variants.ts), and how a verse is
// drawn with them (src/reader/VerseText.tsx): the unit's words marked, a brace after them holding the other reading(s) with a witness chip, in the Greek of the
// reading in the Greek view, its English in the English view, and in the weave the language the unit's words take by the weave rule.
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Chapter, GreekWord, Verse, VariantUnit, VariantCode } from '../../src/data/chapter';
import { weaveVerse, wovenInOrder } from '../../src/data/weave';
import { VerseText } from '../../src/reader/VerseText';
import type { Lookup } from '../../src/WordSheet';
import { braceReadings, plainEnglish, readerVariants, shownUnits, type VariantFilter } from '../../src/reader/variants';
import type { ReaderView } from '../../src/data/repositories';

afterEach(cleanup);

const word = (t: string, l: string, e?: number): GreekWord => ({ t, tr: '', s: 'G1', l, p: 'X', ...(e === undefined ? {} : { e }) });

/** 'And Jesus said to them, truly.': Καὶ εἶπεν ὁ Ἰησοῦς αὐτοῖς ἀμήν, with two units: Ἰησοῦς (NA and ECM read κύριος, 'the Lord') and αὐτοῖς (the Byzantine split reads αὐτῷ, 'to him'). */
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
  witness: alts.some(([c]) => c === 'B') ? 'byz' : alts.some(([c]) => c !== 'M') ? 'na' : 'ecm',
});

const LORD = unit(1, [3], 'Ἰησοῦς', [['N', 'κύριος', 'the Lord'], ['M', 'κύριος', 'the Lord']], 'Jesus');
const HIM = unit(1, [4], 'αὐτοῖς', [['B', 'αὐτῷ', 'to him']], 'to them');
const ALL: VariantFilter = { english: 'all', witnesses: 'ecm' };

function draw(view: ReaderView, woven: ReturnType<typeof wovenInOrder> | null = null): HTMLElement {
  const variants = shownUnits([LORD, HIM], ALL);
  const { container } = render(createElement(VerseText, { verse: VERSE, view, woven, onLook: () => {}, variants }));
  return container;
}

/** The text of each marked word or chunk, and of each brace, in the order drawn: braces as '{reading CHIP CHIP}'. */
function drawn(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('[data-variant], [data-brace]')].map((el) =>
    el.hasAttribute('data-brace')
      ? `{${[...el.querySelectorAll('[data-brace-reading]')].map((r) => [r.querySelector('[data-brace-text]')?.textContent?.trim(), ...[...r.querySelectorAll('[data-witness]')].map((c) => c.textContent)].join(' ')).join(' | ')}}`
      : (el.textContent ?? '').trim(),
  );
}

describe('a verse with two units', () => {
  it('in the Greek view marks the Greek words and puts the Greek of each reading in the brace after them', () => {
    const container = draw('greek');
    expect(drawn(container)).toEqual(['Ἰησοῦς', '{κύριος NA ECM}', 'αὐτοῖς', '{αὐτῷ B}']);
    expect([...container.querySelectorAll('[data-brace]')].map((b) => b.getAttribute('data-brace-lang'))).toEqual(['greek', 'greek']);
  });

  it('in the English view marks the chunks that hold the words and puts the English of each reading in the brace after them', () => {
    const container = draw('english');
    expect(drawn(container)).toEqual(['Jesus', '{the Lord NA ECM}', 'to them,', '{to him B}']);
    expect([...container.querySelectorAll('[data-brace]')].map((b) => b.getAttribute('data-brace-lang'))).toEqual(['english', 'english']);
    // the brace stands right after the marked chunk, before the next one
    const chunks = [...container.querySelectorAll('[data-chunk], [data-brace]')].map((el) => el.getAttribute('data-chunk') ?? 'brace');
    expect(chunks).toEqual(['0', '1', 'brace', '2', '3', 'brace', '4']);
  });

  it('in the weave gives each brace the language its words take: Greek where they are woven, English where they stay English', () => {
    // he knows καί, λέγω and αὐτός, not Ἰησοῦς: 'to them,' is woven (αὐτοῖς), 'Jesus' stays English
    const woven = wovenInOrder(VERSE, weaveVerse(VERSE, { solid: new Set(['καί', 'λέγω', 'αὐτός']) }), 'english');
    const container = draw('english', woven);
    expect(drawn(container)).toEqual(['Jesus', '{the Lord NA ECM}', 'αὐτοῖς', '{αὐτῷ B}']);
    expect([...container.querySelectorAll('[data-brace]')].map((b) => b.getAttribute('data-brace-lang'))).toEqual(['english', 'greek']);
  });

  it('a brace is a label that names the other reading, and its siglum is the button', () => {
    const container = draw('english');
    const brace = container.querySelector<HTMLElement>('[data-brace]');
    expect(brace?.getAttribute('role')).toBe('group');
    expect(brace?.getAttribute('aria-label')).toBe('Other reading: the Lord (Nestle-Aland, ECM)');
    const sigla = [...(brace?.querySelectorAll<HTMLElement>('[data-witness]') ?? [])];
    expect(sigla.map((c) => [c.getAttribute('role'), c.textContent])).toEqual([['button', 'NA'], ['button', 'ECM']]);
  });

  it('a word inside the brace opens the word popup: a form the verse carries with its own lemma, a form it does not as the form alone, an English word with the Greek of its reading; the siglum opens the sheet', () => {
    const looks: Lookup[] = [];
    const opened: string[] = [];
    const variants = shownUnits([LORD, HIM], ALL);
    const mine = (view: ReaderView) => render(createElement(VerseText, { verse: VERSE, view, woven: null, onLook: (l: Lookup) => looks.push(l), variants, onVariant: (s) => opened.push(s.unit.base) })).container;
    let container = mine('greek');
    const brace = (n: number) => container.querySelectorAll<HTMLElement>('[data-brace]')[n];
    // αὐτῷ is not a form of the verse: the form alone, in the verse, from variant B
    fireEvent.click(brace(1).querySelector('[data-brace-word]')!);
    expect(looks[0].words).toEqual([{ t: 'αὐτῷ', tr: '', s: '', l: '', p: '' }]);
    expect(looks[0]).toMatchObject({ verse: 1, variant: 'in variant B', fromEnglish: false });
    expect(brace(1).querySelectorAll('[data-witness]')).toHaveLength(1);
    fireEvent.click(brace(1).querySelector('[data-witness]')!);
    expect(opened).toEqual(['αὐτοῖς']);
    cleanup();
    // in English a word of the reading opens the Greek of the reading under that English word
    container = mine('english');
    fireEvent.click([...brace(0).querySelectorAll('[data-brace-word]')].find((w) => w.textContent?.trim() === 'Lord')!);
    expect(looks[1].words.map((w) => w.t)).toEqual(['κύριος']);
    expect(looks[1]).toMatchObject({ english: 'the Lord', fromEnglish: true, tapped: 'Lord', variant: 'in variant NA, ECM' });
    cleanup();
    // a word the verse does carry is the verse's own, with its lemma
    const carried = shownUnits([unit(1, [1], 'εἶπεν', [['N', 'ἀμήν', 'truly']], 'said')], ALL);
    const { container: c3 } = render(createElement(VerseText, { verse: VERSE, view: 'greek', woven: null, onLook: (l: Lookup) => looks.push(l), variants: carried }));
    fireEvent.click(c3.querySelector('[data-brace] [data-brace-word]')!);
    expect(looks[2].words[0]).toBe(VERSE.g[5]);
  });

  it('a word of a reading the build tagged opens its tagged card, an English word the tagged Greek of its reading, and a form the build left untagged the form alone (mw-9ji6ek0.22)', () => {
    const tagged = (t: string, l: string, s: string, p: string): GreekWord => ({ t, tr: '', s, l, p });
    const tagUnit: VariantUnit = {
      ...unit(1, [1], 'εἶπεν', [['N', 'ἔλεγον ἀποθανεῖν', 'were about to die']], 'said'),
      alts: [{ code: 'N', text: 'ἔλεγον ἀποθανεῖν', g: [tagged('ἔλεγον', 'λέγω', 'G3004', 'V-IAI-3P'), tagged('ἀποθανεῖν', 'ἀποθνῄσκω', 'G599', 'V-2AAN')] }],
    };
    const bare: VariantUnit = { ...tagUnit, alts: [{ code: 'N', text: 'ἔλεγον ἀποθανεῖν', g: [tagged('ἔλεγον', '', '', ''), tagged('ἀποθανεῖν', 'ἀποθνῄσκω', 'G599', 'V-2AAN')] }] };
    const looks: Lookup[] = [];
    const wordsOf = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[data-brace-word]')];
    const tap = (container: HTMLElement, text: string) => fireEvent.click(wordsOf(container).find((w) => w.textContent?.trim() === text)!);
    const mine = (u: VariantUnit, view: ReaderView) => render(createElement(VerseText, { verse: VERSE, view, woven: null, onLook: (l: Lookup) => looks.push(l), variants: shownUnits([u], ALL) })).container;
    // Greek: a form the verse does not carry, tagged: the build's word
    let container = mine(tagUnit, 'greek');
    tap(container, 'ἀποθανεῖν');
    expect(looks[0].words).toEqual([tagUnit.alts[0].g![1]]);
    expect(looks[0]).toMatchObject({ verse: 1, variant: 'in variant NA', fromEnglish: false });
    cleanup();
    // Greek: a form left untagged is the form alone
    container = mine(bare, 'greek');
    tap(container, 'ἔλεγον');
    expect(looks[1].words).toEqual([{ t: 'ἔλεγον', tr: '', s: '', l: '', p: '' }]);
    cleanup();
    // English: the Greek words of the reading, tagged, under the English word tapped
    container = mine(tagUnit, 'english');
    tap(container, 'die');
    expect(looks[2].words.map((w) => [w.t, w.l])).toEqual([['ἔλεγον', 'λέγω'], ['ἀποθανεῖν', 'ἀποθνῄσκω']]);
    expect(looks[2]).toMatchObject({ english: 'were about to die', fromEnglish: true, tapped: 'die' });
  });

  it('with no variants given the verse is drawn as before: nothing marked, no brace', () => {
    const { container } = render(createElement(VerseText, { verse: VERSE, view: 'english', woven: null, onLook: () => {} }));
    expect(container.querySelectorAll('[data-variant], [data-brace]')).toHaveLength(0);
    expect(container.textContent?.replace(/\s+/g, ' ').trim()).toBe('And Jesus said to them, truly.');
  });

  it('a reading that leaves the words out says so, and under All an English reading that is the text’s own says it is the same', () => {
    const out = unit(1, [5], 'ἀμήν', [['B', '', ''], ['N', 'ἀμὴν', 'truly']], 'truly');
    const [shown] = shownUnits([out], ALL);
    expect(braceReadings(shown, 'english')).toEqual([
      { text: '', same: false, chips: ['B'], greek: '', english: '' },
      { text: 'truly', same: true, chips: ['NA'], greek: 'ἀμὴν', english: 'truly' },
    ]);
    const { container } = render(createElement(VerseText, { verse: VERSE, view: 'english', woven: null, onLook: () => {}, variants: [shown] }));
    expect(container.querySelector('[data-brace]')?.textContent).toMatch(/left out.*B.*same.*NA/);
  });
});

// Six units: A byz, its English changes; B byz, the same English; C na, changes; D na, the same; E ecm, changes; F a B reading with the same English and an N one that changes.
const FILTER_UNITS = {
  A: unit(1, [0], 'α', [['B', 'β', 'two']], 'one'),
  B: unit(1, [1], 'α', [['B', 'β', 'one']], 'one'),
  C: unit(1, [2], 'α', [['N', 'β', 'two']], 'one'),
  D: unit(1, [3], 'α', [['C', 'β', 'One.']], 'one'),
  E: unit(1, [4], 'α', [['M', 'β', 'two']], 'one'),
  F: unit(1, [5], 'α', [['B', 'β', 'one'], ['N', 'γ', 'two']], 'one'),
};
const names = (filter: VariantFilter): string[] =>
  shownUnits(Object.values(FILTER_UNITS), filter).map((s) => Object.entries(FILTER_UNITS).find(([, u]) => u === s.unit)?.[0] ?? '?');

describe('the filter: the English filter crossed with the witnesses', () => {
  it.each([
    ['english', 'byz', ['A']],
    ['english', 'na', ['A', 'C', 'F']],
    ['english', 'ecm', ['A', 'C', 'E', 'F']],
    ['all', 'byz', ['A', 'B', 'F']],
    ['all', 'na', ['A', 'B', 'C', 'D', 'F']],
    ['all', 'ecm', ['A', 'B', 'C', 'D', 'E', 'F']],
  ] as const)('%s with %s shows %j', (english, witnesses, expected) => {
    expect(names({ english, witnesses })).toEqual(expected);
  });

  it("'english' shows only units that change the English; 'all' every unit", () => {
    const units = Object.values(FILTER_UNITS);
    expect(shownUnits(units, { english: 'english', witnesses: 'ecm' }).every((s) => s.unit.changesEnglish)).toBe(true);
    expect(shownUnits(units, { english: 'all', witnesses: 'ecm' }).map((s) => s.unit)).toEqual(units);
  });

  it('a shown unit keeps only the readings that pass: F under Byzantine splits and All has its B reading alone', () => {
    const [f] = shownUnits([FILTER_UNITS.F], { english: 'all', witnesses: 'byz' });
    expect(f.readings.map((r) => r.code)).toEqual(['B']);
    const [g] = shownUnits([FILTER_UNITS.F], { english: 'english', witnesses: 'ecm' });
    expect(g.readings.map((r) => r.code)).toEqual(['N']);
  });
});

describe('what the Reader shows of a chapter', () => {
  const chapter = { variants: [LORD, HIM] };

  it('with Variants on: the shown units by verse and their count', () => {
    const shown = readerVariants(chapter, { variants: 'all', witnesses: 'ecm' });
    expect(shown).toMatchObject({ any: true, on: true, count: 2 });
    expect(shown.byVerse?.get(1)?.map((s) => s.unit)).toEqual([LORD, HIM]);
    expect(readerVariants(chapter, { variants: 'all', witnesses: 'byz' }).count).toBe(1);
  });

  it('with Variants Off nothing is shown, and the count is that of the value a tap turns on', () => {
    const off = readerVariants(chapter, { variants: 'off', witnesses: 'byz', lastOn: 'all' });
    expect(off).toMatchObject({ any: true, on: false, count: 1, byVerse: null });
  });

  it('a chapter with no variants (the Old Testament) has none to show', () => {
    expect(readerVariants({}, { variants: 'all', witnesses: 'ecm' })).toMatchObject({ any: false, count: 0, byVerse: null });
  });
});

describe('the English filter compares the verse, not the unit’s own snippet (mw-9ji6ek0.14)', () => {
  const rev3 = JSON.parse(readFileSync('public/data/rev/3.json', 'utf8')) as Chapter;
  const at = (v: number, first: number) => rev3.variants!.find((u) => u.v === v && u.w[0] === first)!;
  const english = (units: VariantUnit[]) => readerVariants({ variants: units, verses: rev3.verses }, { variants: 'english', witnesses: 'ecm' });
  const all = (units: VariantUnit[]) => readerVariants({ variants: units, verses: rev3.verses }, { variants: 'all', witnesses: 'ecm' });

  it("Revelation 3:9 'that' / 'that I' (the Byzantine ἐγώ) is hidden under 'Those that change the English' and shown under 'All'", () => {
    const that = at(9, 30);
    expect(that.english).toMatchObject({ base: 'that', alts: ['that I'] });
    expect(english([that]).byVerse?.get(9)).toBeUndefined();
    expect(english([that]).count).toBe(0);
    expect(all([that]).byVerse?.get(9)).toHaveLength(1);
  });

  it("Revelation 3:12 'out of' / 'from' and 'My' / 'the' new name stay shown under both", () => {
    const units = [at(12, 39), at(12, 49)];
    expect(english(units).byVerse?.get(12)).toHaveLength(2);
    expect(all(units).byVerse?.get(12)).toHaveLength(2);
  });

  it('a unit whose snippet differs but whose verse reads the same is sameEnglish; without the verse the snippets alone are compared', () => {
    const that = at(9, 30);
    expect(shownUnits([that], { english: 'all', witnesses: 'ecm' }, rev3.verses)[0].readings[0].sameEnglish).toBe(true);
    expect(shownUnits([that], { english: 'english', witnesses: 'ecm' })).toHaveLength(1);
  });
});

describe('the committed chapters', () => {
  const chapters: Chapter[] = readdirSync('public/data', { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(`public/data/${d.name}`)
        .filter((f) => /^\d+\.json$/.test(f))
        .map((f) => JSON.parse(readFileSync(`public/data/${d.name}/${f}`, 'utf8')) as Chapter),
    );
  const units: VariantUnit[] = chapters.flatMap((c) => c.variants ?? []);

  it("the Reader's English filter agrees with the build's changesEnglish on every unit", () => {
    expect(units.length).toBeGreaterThan(5000);
    const shown = new Set(chapters.flatMap((c) => shownUnits(c.variants ?? [], { english: 'english', witnesses: 'ecm' }, c.verses)).map((s) => s.unit));
    expect(units.filter((u) => shown.has(u) !== u.changesEnglish)).toEqual([]);
  });

  it("the witness filter agrees with each unit's witness", () => {
    for (const [witnesses, classes] of [['byz', ['byz']], ['na', ['byz', 'na']], ['ecm', ['byz', 'na', 'ecm']]] as const) {
      const shown = new Set(shownUnits(units, { english: 'all', witnesses }).map((s) => s.unit));
      expect(units.filter((u) => shown.has(u) !== (classes as readonly string[]).includes(u.witness))).toEqual([]);
    }
  });
});
