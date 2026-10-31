// tests/unit/variant-render.test.ts — the Reader's variants (mw-9ji6ek0.5): which units and readings the filter shows (src/reader/variants.ts), and how a verse is
// drawn with them (src/reader/VerseText.tsx): the unit's words marked, a brace after them holding the other reading(s) with a witness chip, in the Greek of the
// reading in the Greek view, its English in the English view, and in the weave the language the unit's words take by the weave rule.
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Chapter, GreekWord, Verse, VariantUnit, VariantCode } from '../../src/data/chapter';
import { weaveVerse, withWordRule, wovenInOrder, type WeaveLemmas } from '../../src/data/weave';
import { VerseText } from '../../src/reader/VerseText';
import type { Lookup } from '../../src/WordSheet';
import { variantEnglishClass } from '../../src/reader/englishSource';
import { chosenUnits } from '../../src/reader/chosenReading';
import { NA } from '../../src/reader/readingSets';
import { braceReadings, braceText, plainEnglish, readerVariants, shownUnits, type VariantFilter } from '../../src/reader/variants';
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

  it('in the weave a chip with no pairing keeps the all-or-nothing rule: English whenever one chunk under it is not woven', () => {
    // 'the Lord' and 'to him' carry no align: a woven αὐτοῖς gives its brace Greek, Ἰησοῦς does not
    const woven = withWordRule(wovenInOrder(VERSE, weaveVerse(VERSE, { solid: new Set(['καί', 'λέγω', 'αὐτός', 'κύριος']) }), 'english'), { solid: new Set(['κύριος']) });
    const container = draw('english', woven);
    expect([...container.querySelectorAll('[data-brace]')].map((b) => b.getAttribute('data-brace-lang'))).toEqual(['english', 'greek']);
    expect(container.querySelectorAll('[data-brace-greek]')).toHaveLength(0);
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

describe('an omission unit whose words the English gives no chunk of their own (mw-9ji6ek0.30)', () => {
  // Matthew 2:22 'Archelaus was reigning in Judea': the MSB folds ἐπὶ ('over') into the chunk of βασιλεύει, so no chunk holds it; NA has no ἐπὶ
  const ARCH: Verse = {
    n: 22,
    g: [word('Ἀρχέλαος', 'Ἀρχέλαος', 0), word('βασιλεύει', 'βασιλεύω', 1), word('ἐπὶ', 'ἐπί'), word('τῆς', 'ὁ'), word('Ἰουδαίας', 'Ἰουδαία', 2)],
    e: [{ t: 'Archelaus', g: [0] }, { t: 'was reigning in', g: [1] }, { t: 'Judea', g: [4] }],
  };
  const OVER = unit(22, [2], 'ἐπὶ', [['N', '', '']], 'over');
  const show = (view: ReaderView, verse: Verse = ARCH, units: VariantUnit[] = [OVER]) =>
    render(createElement(VerseText, { verse, view, woven: null, onLook: () => {}, variants: shownUnits(units, ALL) })).container;

  it('dots the chunk the left-out word is folded into, so the brace follows a marked run', () => {
    const container = show('english');
    expect(drawn(container)).toEqual(['was reigning in', '{left out NA}']);
    const run = container.querySelector('[data-variant-run]');
    expect(run?.textContent?.trim()).toBe('was reigning in');
    expect(run?.nextElementSibling?.hasAttribute('data-brace')).toBe(true);
  });

  it('in the Greek view dots the left-out word itself, as before', () => {
    expect(drawn(show('greek'))).toEqual(['ἐπὶ', '{left out NA}']);
  });

  it('a left-out word at the start of the verse has no chunk before it to dot: the brace stands first', () => {
    const verse: Verse = { n: 1, g: [word('καὶ', 'καί'), word('εἶπεν', 'λέγω', 0)], e: [{ t: 'said', g: [1] }] };
    expect(drawn(show('english', verse, [unit(1, [0], 'καὶ', [['N', '', '']], 'and')]))).toEqual(['{left out NA}']);
  });
});

describe('every omission unit of the committed chapters has a word to dot (mw-9ji6ek0.30)', () => {
  const chapters: Chapter[] = readdirSync('public/data', { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(`public/data/${d.name}`)
        .filter((f) => /^\d+\.json$/.test(f))
        .map((f) => JSON.parse(readFileSync(`public/data/${d.name}/${f}`, 'utf8')) as Chapter),
    );

  it('maps each unit that a reading leaves out to a marked word in the Greek view and a marked chunk in the English one, but for the ones at the start of a verse', () => {
    const noGreek: string[] = [];
    const noChunk: string[] = [];
    let seen = 0;
    for (const c of chapters) {
      for (const u of c.variants ?? []) {
        if (!u.alts.some((a) => a.text === '')) continue;
        seen += 1;
        const verse = c.verses.find((v) => v.n === u.v);
        const at = `${c.code} ${c.chapter}:${u.v} ${u.base}`;
        if (!verse) {
          noGreek.push(at);
          continue;
        }
        const [shown] = shownUnits([u], ALL);
        const marks = (view: ReaderView) => render(createElement(VerseText, { verse, view, woven: null, onLook: () => {}, variants: [shown] })).container.querySelectorAll('[data-variant]').length;
        if (marks('greek') === 0) noGreek.push(at);
        if (marks('english') === 0) noChunk.push(at);
        cleanup();
      }
    }
    expect(seen).toBeGreaterThan(1000);
    expect(noGreek).toEqual([]);
    // these stand before the first English chunk of their verse (or have nothing but folded words before them): no chunk to dot, the brace stands first
    expect([...noChunk].sort()).toEqual([
      '1co 8:2 δέ', 'col 1:7 καὶ', 'jhn 1:42 Καὶ', 'luk 15:19 καὶ', 'luk 18:41 λέγων', 'luk 20:34 ἀποκριθεὶς', 'luk 4:34 λέγων',
      'luk 9:37 ἐν', 'mrk 12:6 οὖν', 'mrk 14:19 Οἱ δὲ', 'mrk 14:20 ἀποκριθεὶς', 'mrk 7:6 ἀποκριθεὶς', 'rev 20:5 Καὶ', 'rev 22:7 Καὶ',
    ].sort());
  }, 120_000);
});

describe('a unit whose reading changes the words and whose words the English gives no chunk of their own (mw-9ji6ek0.35)', () => {
  // 1 Corinthians 16:7 'I hope to spend some time': the MSB folds δὲ ('but') into the chunk of ἐλπίζω, so no chunk holds it; NA reads γὰρ ('for')
  const HOPE: Verse = {
    n: 7,
    g: [word('οὐ', 'οὐ', 0), word('θέλω', 'θέλω', 0), word('γὰρ', 'γάρ', 1), word('ὑμᾶς', 'σύ', 2), word('ἐλπίζω', 'ἐλπίζω', 3), word('δὲ', 'δέ'), word('χρόνον', 'χρόνος', 4)],
    e: [{ t: 'I do not want', g: [0, 1] }, { t: 'for you', g: [2, 3] }, { t: 'I hope', g: [4] }, { t: 'some time', g: [6] }],
  };
  const FOR = unit(7, [5], 'δὲ', [['N', 'γὰρ', 'for']], 'but');
  const show = (view: ReaderView, verse: Verse = HOPE, units: VariantUnit[] = [FOR]) =>
    render(createElement(VerseText, { verse, view, woven: null, onLook: () => {}, variants: shownUnits(units, ALL) })).container;

  it('dots the chunk the words are folded into, so the brace follows a marked run', () => {
    const container = show('english');
    expect(drawn(container)).toEqual(['I hope', '{for NA}']);
    const run = container.querySelector('[data-variant-run]');
    expect(run?.textContent?.trim()).toBe('I hope');
    expect(run?.nextElementSibling?.hasAttribute('data-brace')).toBe(true);
  });

  it('in the Greek view dots the word itself, as before', () => {
    expect(drawn(show('greek'))).toEqual(['δὲ', '{γὰρ NA}']);
  });

  it('a unit before the verse’s first English chunk has no chunk to dot: the brace stands first', () => {
    const verse: Verse = { n: 1, g: [word('δὲ', 'δέ'), word('εἶπεν', 'λέγω', 0)], e: [{ t: 'said', g: [1] }] };
    expect(drawn(show('english', verse, [unit(1, [0], 'δὲ', [['N', 'γὰρ', 'for']], 'but')]))).toEqual(['{for NA}']);
  });
});

describe('every non-omission variant unit of the committed chapters has a word and a chunk to dot (mw-9ji6ek0.35)', () => {
  const chapters: Chapter[] = readdirSync('public/data', { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(`public/data/${d.name}`)
        .filter((f) => /^\d+\.json$/.test(f))
        .map((f) => JSON.parse(readFileSync(`public/data/${d.name}/${f}`, 'utf8')) as Chapter),
    );

  it('maps each unit to a marked word in the Greek view and a marked chunk in the English one, but for the ones before a verse’s first English chunk', () => {
    const noGreek: string[] = [];
    const noChunk: string[] = [];
    let seen = 0;
    for (const c of chapters) {
      for (const u of c.variants ?? []) {
        if (u.alts.some((a) => a.text === '')) continue;
        seen += 1;
        const verse = c.verses.find((v) => v.n === u.v);
        const at = `${c.code} ${c.chapter}:${u.v} ${u.base}`;
        if (!verse) {
          noGreek.push(at);
          continue;
        }
        const [shown] = shownUnits([u], ALL);
        const marks = (view: ReaderView) => render(createElement(VerseText, { verse, view, woven: null, onLook: () => {}, variants: [shown] })).container.querySelectorAll('[data-variant]').length;
        if (marks('greek') === 0) noGreek.push(at);
        if (marks('english') === 0) noChunk.push(at);
        cleanup();
      }
    }
    expect(seen).toBeGreaterThan(5000);
    expect(noGreek).toEqual([]);
    // these stand before the first English chunk of their verse (or have nothing but folded words before them): no chunk to dot, the brace stands first
    expect([...noChunk].sort()).toEqual([
      '1co 6:16 Οὐκ', '1co 6:2 Οὐκ', '1ti 1:13 τὸν', 'act 13:39 καὶ',
      'act 15:9 οὐδὲν', 'act 28:26 λέγον', 'jas 2:4 καὶ οὐ', 'jhn 12:22 Ἔρχεται',
      'luk 11:42 Ἀλλ’', 'luk 16:9 Κἀγὼ', 'luk 23:34 Ὁ', 'luk 6:4 Ὡς',
      'luk 8:22 Καὶ ἐγένετο', 'luk 9:57 Ἐγένετο δὲ', 'mat 11:17 καὶ λέγουσιν', 'mat 20:15 Ἢ',
      'mat 21:44 Καὶ', 'mat 24:38 Ὥσπερ', 'mrk 10:52 Ὁ δὲ', 'mrk 12:14 Οἱ δὲ ἐλθόντες',
      'mrk 15:33 Γενομένης δὲ', 'php 2:18 δ’',
    ].sort());
  }, 120_000);
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

describe('Acts 18:17 οἱ Ἕλληνες: NA leaves the words out (mw-9ji6ek0.36)', () => {
  // The unit as the chapter file had it (the MSB's 'CT: they all', its English of the NA sentence, laid as the omission's English) and as it is now (nothing, the footnote kept as ctReads)
  const ACTS: Verse = {
    n: 17,
    g: [word('ἐπιλαβόμενοι', 'ἐπιλαμβάνομαι', 0), word('πάντες', 'πᾶς', 1), word('οἱ', 'ὁ', 2), word('Ἕλληνες', 'Ἕλλην', 2)],
    e: [{ t: 'seized', g: [0] }, { t: 'they all', g: [1] }, { t: 'the Greeks', g: [2, 3] }],
  };
  const STALE: VariantUnit = { ...unit(17, [2, 3], 'οἱ Ἕλληνες', [['N', '', 'they all']], 'the Greeks'), english: { source: 'msb', base: 'the Greeks', alts: ['they all'] } };
  const NOW: VariantUnit = { ...unit(17, [2, 3], 'οἱ Ἕλληνες', [['N', '', '']], 'the Greeks'), english: { source: 'msb', base: 'the Greeks', alts: [''], ctReads: 'they all' } };
  const brace = (u: VariantUnit, view: ReaderView, props: Record<string, unknown> = {}) =>
    render(createElement(VerseText, { verse: ACTS, view, woven: null, onLook: () => {}, variants: shownUnits([u], ALL), ...props })).container;

  it.each([['english', STALE], ['english', NOW], ['greek', NOW]] as const)('the %s brace reads "left out", as the Greek brace does', (view, u) => {
    const container = brace(u, view);
    expect(drawn(container).at(-1)).toBe('{left out NA}');
    expect(container.querySelector('[data-brace]')?.getAttribute('aria-label')).toBe('Other reading: left out (Nestle-Aland)');
  });

  it.each(['english', 'greek'] as const)('a tap on the "left out" of the %s brace opens the sheet and no word card', (view) => {
    const opened: string[] = [];
    const looks: Lookup[] = [];
    const container = brace(NOW, view, { onVariant: (s: { unit: VariantUnit }) => opened.push(s.unit.base), onLook: (l: Lookup) => looks.push(l) });
    fireEvent.click(container.querySelector('[data-brace-text]')!);
    expect(opened).toEqual(['οἱ Ἕλληνες']);
    expect(looks).toEqual([]);
  });

  it('a tap on the siglum still opens the sheet once, and a word of a reading with words still opens the word card', () => {
    const opened: string[] = [];
    const looks: Lookup[] = [];
    const container = brace(LORD, 'english', { variants: shownUnits([LORD], ALL), onVariant: (s: { unit: VariantUnit }) => opened.push(s.unit.base), onLook: (l: Lookup) => looks.push(l) });
    fireEvent.click([...container.querySelectorAll('[data-brace-word]')].find((w) => w.textContent?.trim() === 'Lord')!);
    expect([opened.length, looks.length]).toEqual([0, 1]);
    cleanup();
    const again = brace(NOW, 'english', { onVariant: (s: { unit: VariantUnit }) => opened.push(s.unit.base) });
    fireEvent.click(again.querySelector('[data-witness]')!);
    expect(opened).toEqual(['οἱ Ἕλληνες']);
  });
});

describe('a chip woven word by word (mw-9ji6ek0.37)', () => {
  // Acts 18:18 cut to the unit: the MSB pairs ἐν with the supplied 'He had his' (never woven) and τὴν with 'in', so the text's chunk for the unit is not all woven
  const ACTS: Verse = {
    n: 18,
    g: [word('κειράμενος', 'κείρω', 2), word('τὴν', 'ὁ', 3), word('κεφαλὴν', 'κεφαλή', 1), word('ἐν', 'ἐν', 0), word('Κεγχρεαῖς', 'Κεγχρεαί', 4)],
    e: [
      { t: 'He had his', g: [3], s: [2] },
      { t: 'head', g: [2] },
      { t: 'shaved', g: [0] },
      { t: 'in', g: [1] },
      { t: 'Cenchrea', g: [4] },
    ],
  };
  const NA_G: GreekWord[] = [word('ἐν', 'ἐν'), word('Κεγχρεαῖς', 'Κεγχρεαί'), word('τὴν', 'ὁ'), word('κεφαλήν', 'κεφαλή')];
  // Acts 18:18's NA reading with the base cut to one word: the real unit is the same words in another order, which reads 'same' under All and is hidden by default (mw-9ji6ek0.31), so it never draws a chip
  const CHIP: VariantUnit = {
    v: 18,
    w: [2],
    base: 'κεφαλὴν',
    alts: [{ code: 'N', text: 'ἐν Κεγχρεαῖς τὴν κεφαλήν', g: NA_G }],
    english: { source: 'lampas', base: 'head', alts: ['in Cenchreae the head'], align: [[0, 1, 2, 3]] },
    changesEnglish: true,
    witness: 'na',
  };
  const wovenWith = (solid: string[]) => {
    const lemmas: WeaveLemmas = { solid: new Set(solid) };
    return withWordRule(wovenInOrder(ACTS, weaveVerse(ACTS, lemmas), 'english'), lemmas);
  };
  const chip = (u: VariantUnit, woven: ReturnType<typeof wovenWith> | null, looks: Lookup[] = []) =>
    render(createElement(VerseText, { verse: ACTS, view: 'english', woven, onLook: (l: Lookup) => looks.push(l), variants: shownUnits([u], ALL) })).container;
  const wordsOf = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[data-brace-word]')].map((el) => (el.textContent ?? '').trim());

  it('draws his solid ἐν in Greek, gold and tappable to its card, and leaves the rest English', () => {
    const looks: Lookup[] = [];
    const container = chip(CHIP, wovenWith(['ἐν', 'κείρω']), looks);
    // not every chunk under the unit is woven (ἐν sits behind the supplied 'He had his'), so today's rule would have made the whole chip English
    expect(wordsOf(container)).toEqual(['ἐν', 'Cenchreae', 'the', 'head']);
    const greek = container.querySelectorAll<HTMLElement>('[data-brace-greek]');
    expect([...greek].map((el) => el.textContent?.trim())).toEqual(['ἐν']);
    expect(greek[0].className).toMatch(/text-accent/);
    expect(greek[0].getAttribute('lang')).toBe('el');
    expect(container.querySelector('[data-brace]')?.getAttribute('data-brace-lang')).toBe('english');
    fireEvent.click(greek[0]);
    expect(looks[0].words.map((w) => w.t)).toEqual(['ἐν']);
    expect(looks[0]).toMatchObject({ fromEnglish: false, verse: 18, variant: 'in variant NA' });
    // the English words still open the Greek of the reading
    fireEvent.click([...container.querySelectorAll<HTMLElement>('[data-brace-word]')].find((el) => el.textContent?.trim() === 'Cenchreae')!);
    expect(looks[1]).toMatchObject({ fromEnglish: true, tapped: 'Cenchreae' });
  });

  it('draws every paired word he knows in Greek, and the whole chip in English when he knows none', () => {
    expect(wordsOf(chip(CHIP, wovenWith(['ἐν', 'Κεγχρεαί', 'ὁ', 'κεφαλή'])))).toEqual(['ἐν', 'Κεγχρεαῖς', 'τὴν', 'κεφαλήν']);
    cleanup();
    expect(wordsOf(chip(CHIP, wovenWith(['κείρω'])))).toEqual(['in', 'Cenchreae', 'the', 'head']);
  });

  it('a learning word is Greek too (Weave: solid and learning) and says so; the plain English view and the weave off draw the English', () => {
    const lemmas: WeaveLemmas = { solid: new Set(), learning: new Set(['ἐν']) };
    const woven = withWordRule(wovenInOrder(ACTS, weaveVerse(ACTS, lemmas), 'english'), lemmas);
    const container = chip(CHIP, woven);
    expect(container.querySelector('[data-brace-greek]')?.getAttribute('data-learning')).toBe('');
    cleanup();
    expect(wordsOf(chip(CHIP, null))).toEqual(['in', 'Cenchreae', 'the', 'head']);
  });

  it('keeps the marks beside an English word and draws a run of English words of one Greek word once', () => {
    const run: VariantUnit = { ...CHIP, alts: [{ code: 'N', text: 'ἀνέβη', g: [word('ἀνέβη', 'ἀναβαίνω')] }], english: { source: 'lampas', base: 'the head', alts: ['went up,'], align: [[0, 0]] } };
    expect(wordsOf(chip(run, wovenWith(['ἀναβαίνω'])))).toEqual(['ἀνέβη,']);
    cleanup();
    expect(wordsOf(chip(run, wovenWith([])))).toEqual(['went', 'up,']);
  });

  it('Copy writes the chip as it is drawn', () => {
    const [shown] = shownUnits([CHIP], ALL);
    const woven = wovenWith(['ἐν']);
    expect(braceText(shown, 'english', woven.word)).toBe('{ἐν Cenchreae the head NA}');
    expect(braceText(shown, 'english')).toBe('{in Cenchreae the head NA}');
  });
});

describe('the committed Acts 18 (mw-9ji6ek0.37)', () => {
  it('draws the NA chip of verse 2 as {ἀπὸ NA} when ἀπό is solid: "away from" is one Greek word', () => {
    const chapter = JSON.parse(readFileSync('public/data/act/18.json', 'utf8')) as Chapter;
    const verse = chapter.verses.find((v) => v.n === 2)!;
    const [shown] = shownUnits(chapter.variants!.filter((u) => u.v === 2 && u.base === 'ἐκ'), { english: 'english', witnesses: 'ecm' }, chapter.verses);
    const lemmas: WeaveLemmas = { solid: new Set(['ἀπό']) };
    const woven = withWordRule(wovenInOrder(verse, weaveVerse(verse, lemmas), 'english'), lemmas);
    expect(braceText(shown, 'english', woven.word)).toBe('{ἀπὸ NA}');
    expect(braceText(shown, 'english')).toBe('{away from NA}');
  });
});

// Where the English comes from (mw-9ji6ek0.41): the MSB's own footnote English is drawn plain, the model's italic with a dotted ring; one helper says which, for the brace and for a reading laid in place.
describe('the look of a chip says where its English comes from', () => {
  const MSB_UNIT: VariantUnit = { ...HIM, alts: [{ code: 'N', text: 'αὐτῷ' }], english: { ...HIM.english, source: 'msb' } };
  const classOf = (el: Element | null | undefined) => [...(el?.classList ?? [])].filter((c) => c.startsWith('variant-english--'));

  it('one helper: the model’s English is variant-english--lampas, the MSB’s variant-english--msb', () => {
    expect(variantEnglishClass(LORD)).toBe('variant-english--lampas');
    expect(variantEnglishClass(MSB_UNIT)).toBe('variant-english--msb');
  });

  it('the English brace of a lampas unit carries the lampas class on its English, an msb unit the msb class, and a Greek brace neither', () => {
    const variants = shownUnits([LORD, MSB_UNIT], ALL);
    const { container } = render(createElement(VerseText, { verse: VERSE, view: 'english', woven: null, onLook: () => {}, variants }));
    const texts = [...container.querySelectorAll('[data-brace-text]')];
    expect(texts.map((t) => classOf(t))).toEqual([['variant-english--lampas'], ['variant-english--msb']]);
    cleanup();
    const greek = render(createElement(VerseText, { verse: VERSE, view: 'greek', woven: null, onLook: () => {}, variants })).container;
    expect([...greek.querySelectorAll('[data-brace-text]')].map((t) => classOf(t))).toEqual([[], []]);
  });

  it('a "left out" or "same" reading is not English from a source and carries neither class', () => {
    const left: VariantUnit = { ...LORD, alts: [{ code: 'N', text: '' }], english: { source: 'lampas', base: 'Jesus', alts: [''] } };
    const { container } = render(createElement(VerseText, { verse: VERSE, view: 'english', woven: null, onLook: () => {}, variants: shownUnits([left], ALL) }));
    expect(container.querySelector('[data-brace-text]')?.textContent?.trim()).toBe('left out');
    expect(classOf(container.querySelector('[data-brace-text]'))).toEqual([]);
  });

  it('a reading laid in place in English wears the same class as its brace would', () => {
    const chapter = { code: 'xx', chapter: 1, verses: [VERSE], variants: [LORD, MSB_UNIT] } as Chapter;
    const chosen = chosenUnits(chapter, NA);
    const { container } = render(createElement(VerseText, { verse: VERSE, view: 'english', woven: null, onLook: () => {}, chosen }));
    const placed = [...container.querySelectorAll('[data-chosen]')].map((t) => t.closest('[class*="variant-english--"]')?.className.match(/variant-english--\w+/)?.[0]);
    expect(placed.filter(Boolean).length).toBeGreaterThan(0);
    expect(new Set(placed.filter(Boolean))).toEqual(new Set(['variant-english--lampas', 'variant-english--msb']));
  });
});
