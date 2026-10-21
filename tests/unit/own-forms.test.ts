// A word's own paradigm (mw-irpgqi.4): the index from a lemma to every form the New Testament text uses, and a table laid with those forms
// (src/data/paradigms/ownForms.ts, scripts/build-lemma-forms.mjs, docs/paradigms.md 'This word'). Over the real chapters in public/data.
// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { fileText, lemmaForms, ownFormOf, readChapters, type LemmaFormEntry } from '../../scripts/build-lemma-forms.mjs';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import { cellName, cellsOf, paradigmById, paradigmOfWord, tableFor } from '../../src/data/paradigms';
import { fitsNoTable, ownFormOf as appOwnFormOf, ownFormsOf, ownTable, referenceText, type OwnForm } from '../../src/data/paradigms/ownForms';
import type { Paradigm } from '../../src/data/paradigms/types';

let index: Map<string, LemmaFormEntry[]>;
let texts: Set<string>;
beforeAll(() => {
  const chapters = readChapters('public/data');
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
    for (const chapter of readChapters('public/data'))
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
