// A word's own paradigm (mw-irpgqi.4): the index from a lemma to every form the New Testament text uses, and a table laid with those forms
// (src/data/paradigms/ownForms.ts, scripts/build-lemma-forms.mjs, docs/paradigms.md 'This word'). Over the real chapters in public/data.
// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { fileText, lemmaForms, ownFormOf, readChapters, readSeptuagintChapters, septuagintFormOf, septuagintForms, type LemmaFormEntry } from '../../scripts/build-lemma-forms.mjs';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import { cellName, cellsOf, paradigmById, paradigmOfWord, tableFor } from '../../src/data/paradigms';
import { absentText, fitsNoTable, ownFormOf as appOwnFormOf, ownFormsOf, ownTable, referenceText, septuagintFormOf as appSeptuagintFormOf, type OwnForm } from '../../src/data/paradigms/ownForms';
import type { Paradigm } from '../../src/data/paradigms/types';

// the New Testament's chapters: this file is the Greek index (the Hebrew one is tests/unit/lemma-forms-hbo.test.ts)
const greekChapters = () => readChapters('public/data').filter((c) => c.lang !== 'hbo');
let index: Map<string, LemmaFormEntry[]>;
let texts: Set<string>;
beforeAll(() => {
  const chapters = greekChapters();
  index = lemmaForms(chapters);
  // every form the text has, as it is written in it (grave accents and capitals aside), to prove nothing is made up
  texts = new Set(chapters.flatMap((c) => c.verses.flatMap((v) => v.g.map((w) => ownFormOf(w.t, w.l)))));
}, 60_000);

const formsOf = (lemma: string): OwnForm[] => ownFormsOf(index.get(lemma) ?? []);

describe('the index from a lemma to its forms', () => {
  it.each(['ἀγαπάω', 'λέγω', 'εἰμί'])('%s: its forms with their codes and a first reference each', (lemma) => {
    const forms = formsOf(lemma);
    expect(forms.length).toBeGreaterThan(20);
    for (const f of forms) {
      expect(f.code).toMatch(/^[A-Z0-9-]+$/);
      expect(f.count).toBeGreaterThan(0);
      const book = BOOK_INDEX.books.find((b) => b.code === f.book);
      expect(book, `${f.form} ${f.code}`).toBeDefined();
      expect(f.chapter).toBeGreaterThan(0);
      expect(f.chapter).toBeLessThanOrEqual(book!.chapters);
      expect(f.verse).toBeGreaterThan(0);
      expect(f.verse).toBeLessThanOrEqual(book!.verses[f.chapter - 1]);
    }
  });

  it('ἀγαπῶ is the present active 1st singular, first used in John 14:31; εἶπον is λέγω’s, with its codes', () => {
    const agapo = formsOf('ἀγαπάω').find((f) => f.form === 'ἀγαπῶ' && f.code === 'V-PAI-1S');
    expect(agapo).toMatchObject({ book: 'jhn', chapter: 14, verse: 31 });
    expect(referenceText(agapo!)).toBe('John 14:31');
    const eipon = formsOf('λέγω').filter((f) => f.form === 'εἶπον');
    expect(eipon.map((f) => f.code).sort()).toEqual(['V-2AAI-1S', 'V-2AAI-3P']);
    expect(formsOf('εἰμί').some((f) => f.form === 'ἐστίν' && f.code === 'V-PAI-3S')).toBe(true);
  });

  it('a form is the text’s own: lower case unless the lemma is a name, a grave accent turned acute', () => {
    expect(ownFormOf('Ἀγαπῶ', 'ἀγαπάω')).toBe('ἀγαπῶ');
    expect(ownFormOf('Χριστὸς', 'Χριστός')).toBe('Χριστός');
    expect(ownFormOf('ἀγαπητὸς', 'ἀγαπητός')).toBe('ἀγαπητός');
  });

  it('the app’s ownFormOf is the build’s for every word of the text', () => {
    for (const chapter of greekChapters())
      for (const verse of chapter.verses) for (const w of verse.g) expect(appOwnFormOf(w.t, w.l)).toBe(ownFormOf(w.t, w.l));
  });

  it('every form is a word of the text and every lemma’s file is under 20 KB', () => {
    let largest = 0;
    for (const [lemma, entries] of index) {
      largest = Math.max(largest, Buffer.byteLength(fileText(lemma, entries)));
      for (const [form] of entries) expect(texts.has(form), `${lemma}: ${form}`).toBe(true);
    }
    expect(largest).toBeLessThan(20 * 1024);
  });
});

/** The forms a derived table shows (the cells that have one). */
const shown = (table: Paradigm): string[] => cellsOf(table).filter((c) => c.lang === 'el' && !c.absent).map((c) => c.form);

describe('a table laid with the word’s own forms', () => {
  it('ἀγαπάω in Contract verbs: its own row of six forms, ἀγαπῶ in its cell with its first use', () => {
    const own = ownTable(paradigmById('contract-verbs')!, 'ἀγαπάω', formsOf('ἀγαπάω'));
    expect(own).toBeDefined();
    const cells = cellsOf(own!.table);
    expect(cells).toHaveLength(6);
    const first = cells.find((c) => c.own?.code === 'V-PAI-1S');
    expect(first).toMatchObject({ form: 'ἀγαπῶ' });
    expect(first!.absent).toBeUndefined();
    expect(first!.own).toMatchObject({ pattern: 'ἀγαπῶ', book: 'jhn', chapter: 14, verse: 31 });
    expect(shown(own!.table)).toEqual(['ἀγαπῶ', 'ἀγαπᾷς', 'ἀγαπᾷ', 'ἀγαπῶμεν', 'ἀγαπᾶτε', 'ἀγαπῶσιν']);
  });

  it('τηρέω in Contract verbs: the cells the text lacks are marked absent and keep no form, not the pattern’s', () => {
    const own = ownTable(paradigmById('contract-verbs')!, 'τηρέω', formsOf('τηρέω'));
    const cells = cellsOf(own!.table);
    expect(cells.filter((c) => c.absent).map((c) => c.own)).toEqual([undefined, undefined, undefined]);
    expect(cells.filter((c) => c.absent).every((c) => c.form === '')).toBe(true);
    expect(cells.filter((c) => !c.absent).map((c) => c.form)).toEqual(['τηρῶ', 'τηρεῖ', 'τηροῦμεν']);
  });

  it('ποιέω in Contract verbs is its own row, not ἀγαπάω’s', () => {
    const own = ownTable(paradigmById('contract-verbs')!, 'ποιέω', formsOf('ποιέω'));
    expect(shown(own!.table)).toEqual(expect.arrayContaining(['ποιῶ', 'ποιεῖ', 'ποιοῦμεν']));
    expect(shown(own!.table).some((f) => f.startsWith('ἀγαπ'))).toBe(false);
  });

  it('εἰμί in εἰμί’s table: ἐστίν in the 3rd singular present, ἦν in the imperfect, and the English stays as the cell’s meaning', () => {
    const table = paradigmById('eimi')!;
    const own = ownTable(table, 'εἰμί', formsOf('εἰμί'));
    const greek = cellsOf(own!.table).filter((c) => c.lang === 'el');
    expect(greek.find((c) => c.own?.code === 'V-PAI-3S')?.form).toBe('ἐστίν');
    expect(greek.find((c) => c.own?.code === 'V-IAI-3S')?.form).toBe('ἦν');
    expect(cellsOf(own!.table).filter((c) => c.lang === 'en')).toHaveLength(cellsOf(table).filter((c) => c.lang === 'en').length);
  });

  it('λέγω in Second aorist: εἶπον is what the text has for the 1st singular and 3rd plural, nothing is made up', () => {
    const own = ownTable(paradigmById('second-aorist')!, 'λέγω', formsOf('λέγω'));
    expect(own).toBeDefined();
    const forms = shown(own!.table);
    expect(forms).toContain('εἶπον');
    for (const f of forms) expect(texts.has(f), f).toBe(true);
  });

  it('every form shown, for every lemma of the text in the table its forms are found in, is a form of the index (none is generated)', () => {
    let tables = 0;
    for (const [lemma, entries] of index) {
      const forms = ownFormsOf(entries);
      const known = new Set(forms.map((f) => f.form));
      const first = forms[0];
      const home = paradigmOfWord({ t: first.form, l: lemma, p: first.code })?.table;
      const own = home ? ownTable(home, lemma, forms) : undefined;
      if (!home || !own) continue;
      tables++;
      for (const f of shown(own.table)) expect(known.has(f), `${lemma} in ${home.id}: ${f}`).toBe(true);
    }
    expect(tables).toBeGreaterThan(2000);
  }, 120_000);

  it('a table the lemma has no form in gives no This word view', () => {
    expect(ownTable(paradigmById('article')!, 'ἀγαπάω', formsOf('ἀγαπάω'))).toBeUndefined();
  });

  it('the cell of a form is the cell its parsing lands on: the first singular present has ἀγαπῶ, never the pattern’s ἀγαπῶ by luck', () => {
    const own = ownTable(paradigmById('contract-verbs')!, 'τηρέω', formsOf('τηρέω'));
    expect(shown(own!.table)).toEqual(expect.arrayContaining(['τηρῶ', 'τηρεῖ']));
    expect(cellName(own!.table, own!.table.rows[0], 0)).toContain('τηρέω');
  });
});

describe('the lemmas no table fits', () => {
  it('counts them by part of speech, and every one has only forms that tableFor gives no table', () => {
    const lost = [...index].filter(([lemma, entries]) => fitsNoTable(lemma, ownFormsOf(entries)));
    const kinds = new Map<string, number>();
    for (const [, entries] of lost) {
      const kind = entries[0][1].split('-')[0];
      kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    }
    for (const [lemma, entries] of lost) for (const [form, code] of entries) expect(tableFor(code, { l: lemma, t: form }), `${lemma} ${code}`).toBeUndefined();
    // the sweep the closing comment of mw-irpgqi.4 reports
    console.log(`lemmas no table fits: ${lost.length} of ${index.size}`, Object.fromEntries([...kinds].sort((a, b) => b[1] - a[1])));
    // all of them are uninflected kinds of word: an adverb, conjunction, preposition, particle, Hebrew or Aramaic word, conditional or interjection
    expect([...kinds.keys()].sort()).toEqual(['ADV', 'ARAM', 'COND', 'CONJ', 'HEB', 'INJ', 'PREP', 'PRT']);
    expect(lost.length).toBe(370);
    expect(lost.length).toBeLessThan(index.size);
  });
});

// ---------------------------------------------------------------- the Septuagint's forms (mw-u2w5klk.289)
// A Septuagint word's own paradigm lays the forms of its lemma found in Swete's Septuagint as well as the New Testament. The shipped chapters (public/data-lxx) are made on the Laptop, so the
// tests read the fixture chapters of tests/fixtures/data-lxx (Genesis 1, Psalm 22) and a small Septuagint chapter of their own; the codes are the New Testament's scheme, so no translation is made.
import type { Chapter } from '../../src/data/chapter';

/** A word of a Septuagint chapter the way Swete prints it (punctuation kept), with Lampas's lemma and parsing. */
const lxxWord = (t: string, l: string, p: string) => ({ t, tr: '', s: '', l, p, y: '1', c: 0.9, e: 0 });
/** Genesis 1 in miniature: verse 2 has ἀόρατος as a feminine nominative singular (the reading the Governor tapped), with a comma after ἀκατασκεύαστος and a title word in capitals. */
const genesis = (): Chapter =>
  ({
    book: 'Genesis', code: 'gen', chapter: 1, lang: 'grc', translation: 'lxx2012', edition: 'swete', lex: {}, parse: {},
    verses: [
      { n: 1, ref: { book: 'gen', chapter: 1, verse: 1 }, g: [lxxWord('ΕΝ', 'ἐν', 'PREP'), lxxWord('ἀρχῇ', 'ἀρχή', 'N-DSF')], e: [] },
      { n: 2, ref: { book: 'gen', chapter: 1, verse: 2 }, g: [lxxWord('ἀόρατος', 'ἀόρατος', 'A-NSF'), lxxWord('ἀκατασκεύαστος,', 'ἀκατασκεύαστος', 'A-NSF'), lxxWord('ἀόρατος', 'ἀόρατος', 'A-NSF')], e: [] },
    ],
  }) as Chapter;
/** Psalm 9 of the Greek is Psalms 9 and 10 of Lampas: a Greek verse says which Lampas verse it is. */
const psalm = (): Chapter =>
  ({
    book: 'Psalms', code: 'psa', chapter: 9, lang: 'grc', translation: 'lxx2012', edition: 'swete', lex: {}, parse: {},
    verses: [
      { n: 1, ref: { book: 'psa', chapter: 9, verse: 1 }, g: [lxxWord('Ἐξομολογήσομαί', 'ἐξομολογέω', 'V-FDI-1S')], e: [] },
      { n: 22, ref: { book: 'psa', chapter: 10, verse: 1 }, g: [lxxWord('ἀόρατος', 'ἀόρατος', 'A-NSM')], e: [] },
      { n: 23, ref: 'none', g: [lxxWord('ἀόρατον', 'ἀόρατος', 'A-ASM')], e: [] },
    ],
  }) as Chapter;

describe('the index takes the Septuagint’s forms of a lemma, apart from the New Testament’s', () => {
  const lxx = septuagintForms([genesis(), psalm()]);

  it('ἀόρατος: Gen 1:2 ἀόρατος is in the Septuagint list, counted, with its code and place; the New Testament list is the New Testament’s', () => {
    const entries = lxx.get('ἀόρατος')!;
    expect(entries[0]).toEqual(['ἀόρατος', 'A-NSF', 2, 'gen', 1, 2]);
    // the Psalm's verse is Lampas's Psalm 10:1; a verse Lampas has none for keeps the Greek numbers
    expect(entries).toContainEqual(['ἀόρατος', 'A-NSM', 1, 'psa', 10, 1]);
    expect(entries).toContainEqual(['ἀόρατον', 'A-ASM', 1, 'psa', 9, 23]);
    expect(formsOf('ἀόρατος').map((f) => f.code).sort()).toEqual(['A-ASM', 'A-DSM', 'A-GSM', 'A-NPN']);
  });

  it('a token is read as Swete prints it: the comma goes, a word in capitals (no accent to match) is left out, a capital that opens a name stays', () => {
    expect(septuagintFormOf('ἀκατασκεύαστος,', 'ἀκατασκεύαστος')).toBe('ἀκατασκεύαστος');
    expect(septuagintFormOf('πληθυ]νέσθωσαν', 'πληθύνω')).toBe('πληθυνέσθωσαν');
    expect(septuagintFormOf('Ἀβραὰμ', 'Ἀβραάμ')).toBe('Ἀβραάμ');
    expect(septuagintFormOf('Ἐξομολογήσομαί', 'ἐξομολογέω')).toBe('ἐξομολογήσομαί');
    expect(septuagintFormOf('ΕΝ', 'ἐν')).toBeUndefined();
    expect(lxx.has('ἐν')).toBe(false);
    expect(lxx.get('ἀκατασκεύαστος')![0][0]).toBe('ἀκατασκεύαστος');
    // the app's reading of a tapped word is the build's
    expect(appSeptuagintFormOf('ἀκατασκεύαστος,', 'ἀκατασκεύαστος')).toBe('ἀκατασκεύαστος');
    expect(appSeptuagintFormOf('ΕΝ', 'ἐν')).toBeUndefined();
  });

  it('a lemma with no Septuagint form has a file that is byte for byte the New Testament’s; one with some has them under lxx, and one only the Septuagint has has no New Testament forms', () => {
    const nt = index.get('ἀόρατος')!;
    expect(fileText('ἀόρατος', nt)).toBe(fileText('ἀόρατος', nt));
    expect(JSON.parse(fileText('ἀόρατος', nt, lxx.get('ἀόρατος')))).toEqual({ l: 'ἀόρατος', f: nt, lxx: lxx.get('ἀόρατος') });
    expect(JSON.parse(fileText('ἀκατασκεύαστος', [], lxx.get('ἀκατασκεύαστος')))).toMatchObject({ f: [], lxx: [['ἀκατασκεύαστος', 'A-NSF', 1, 'gen', 1, 2]] });
    expect(fileText('ἀόρατος', nt, [])).toBe(fileText('ἀόρατος', nt));
  });

  it('the fixture chapters are read in the index’s order, a Greek chapter with no file is left out', () => {
    const chapters = readSeptuagintChapters('tests/fixtures/data-lxx');
    expect(chapters.map((c) => `${c.code} ${c.chapter}`)).toEqual(['gen 1', 'psa 22']);
    const fixture = septuagintForms(chapters);
    expect(fixture.get('ἀόρατος')![0]).toEqual(['ἀόρατος', 'A-NSM', 1, 'gen', 1, 2]);
    // Greek Psalm 22 is Psalm 23 of Lampas
    const inPsalms = [...fixture.values()].flat().filter(([, , , book]) => book === 'psa');
    expect(inPsalms.length).toBeGreaterThan(0);
    expect(inPsalms.every(([, , , , chapter]) => chapter === 23)).toBe(true);
  });
});

describe('a word read in the Septuagint lays both texts, each cell saying where it was found', () => {
  const lxx = septuagintForms([genesis(), psalm()]);
  const both = (lemma: string): OwnForm[] => ownFormsOf(index.get(lemma) ?? [], 'septuagint', lxx.get(lemma) ?? []);
  const adjectives = paradigmById('adjective-endings')!;

  it('the New Testament reading is the New Testament’s alone, as it was', () => {
    const nt = formsOf('ἀόρατος');
    expect(nt.every((f) => f.source === 'nt' && f.also === undefined)).toBe(true);
    expect(ownTable(adjectives, 'ἀόρατος', nt)).toBeDefined();
    expect(shown(ownTable(adjectives, 'ἀόρατος', nt)!.table)).toEqual(['ἀόρατα', 'ἀοράτου', 'ἀοράτῳ', 'ἀόρατον']);
    expect(ownTable(adjectives, 'ἀόρατος', nt)!.table.ownText).toBe('nt');
  });

  it('ἀόρατος, nominative singular feminine (Gen 1:2) has its cell, found in the Septuagint; the New Testament’s forms stay, found in the NT', () => {
    const forms = both('ἀόρατος');
    const own = ownTable(adjectives, 'ἀόρατος', forms, 'septuagint')!;
    expect(own.table.ownText).toBe('septuagint');
    const place = own.placeOf('ἀόρατος', 'A-NSF');
    expect(place).toBeDefined();
    const cell = cellsOf(own.table).find((c) => c.own?.code === 'A-NSF')!;
    expect(cell.form).toBe('ἀόρατος');
    expect(cell.own).toMatchObject({ source: 'septuagint', book: 'gen', chapter: 1, verse: 2, count: 2 });
    expect(referenceText(cell.own!)).toBe('Genesis 1:2');
    // the New Testament's genitive is there, found in the NT, and is not marked absent
    const genitive = cellsOf(own.table).find((c) => c.own?.code === 'A-GSM')!;
    expect(genitive.own).toMatchObject({ source: 'nt', book: 'col', chapter: 1, verse: 15 });
    // the Septuagint's masculine nominative is a cell too; nothing a text lacks is filled
    expect(cellsOf(own.table).find((c) => c.own?.code === 'A-NSM')?.own?.source).toBe('septuagint');
    for (const f of shown(own.table)) expect(['ἀόρατος', 'ἀοράτου', 'ἀοράτῳ', 'ἀόρατον', 'ἀόρατα']).toContain(f);
  });

  it('a form both texts have is found in the Septuagint first and the NT beside it; the cell it is in is one', () => {
    const lemma = 'ἀόρατος';
    const forms = ownFormsOf([['ἀόρατον', 'A-ASM', 1, 'heb', 11, 27]], 'septuagint', [['ἀόρατον', 'A-ASM', 3, 'isa', 45, 3]]);
    expect(forms).toHaveLength(1);
    expect(forms[0]).toMatchObject({ source: 'septuagint', count: 3, book: 'isa', also: { source: 'nt', count: 1, book: 'heb', chapter: 11, verse: 27 } });
    const cell = cellsOf(ownTable(adjectives, lemma, forms, 'septuagint')!.table).find((c) => c.own);
    expect(cell!.own).toMatchObject({ source: 'septuagint', also: { source: 'nt', count: 1 } });
  });

  it('a cell neither text has is absent, and the reading says which text it is absent from', () => {
    const own = ownTable(adjectives, 'ἀόρατος', both('ἀόρατος'), 'septuagint')!;
    const absent = cellsOf(own.table).filter((c) => c.absent);
    expect(absent.length).toBeGreaterThan(0);
    expect(absent.every((c) => c.form === '' && c.own === undefined)).toBe(true);
    expect(absentText('septuagint')).toBe('not in the Septuagint or NT');
    expect(absentText('nt')).toBe('not in the NT');
  });

  it('the forms of a lemma the Septuagint has alone are laid with no New Testament form', () => {
    const forms = ownFormsOf([], 'septuagint', lxx.get('ἀκατασκεύαστος') ?? []);
    expect(forms.map((f) => [f.form, f.source])).toEqual([['ἀκατασκεύαστος', 'septuagint']]);
  });
});
