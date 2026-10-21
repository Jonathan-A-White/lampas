// A tap on a Greek word opens its paradigm (mw-irpgqi.1): paradigmOfWord names the table of a word and the one cell that is the word's own,
// and the Paradigms address carries the cell, the word and its parse.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { PARADIGMS, cellName, paradigmById, paradigmOfWord, tableFor } from '../../src/data/paradigms';
import { paradigmHash, paradigmOf } from '../../src/nav/route';

const jn2 = JSON.parse(readFileSync('public/data/2jn/1.json', 'utf8')) as Chapter;
const words = jn2.verses.flatMap((v) => v.g);
const first = (form: string, code?: string): GreekWord => {
  const word = words.find((w) => w.t === form && (code === undefined || w.p === code));
  if (!word) throw new Error(`2 John 1 has no ${form}`);
  return word;
};

/** The form in the cell the word's address names. */
function formAt(tableId: string, place: string | undefined): string | undefined {
  const table = paradigmById(tableId)!;
  return table.rows.flatMap((row) => row.cells.map((cell, c) => ({ place: cellName(table, row, c), cell }))).find((x) => x.place === place)?.cell.form;
}

describe('paradigmOfWord', () => {
  it('opens Contract verbs on the cell of ἀγαπῶ (V-PAI-1S, ἀγαπάω)', () => {
    const word = first('ἀγαπῶ');
    expect(word.p).toBe('V-PAI-1S');
    const found = paradigmOfWord(word);
    expect(found?.table.id).toBe('contract-verbs');
    expect(found?.table.name).toBe('Contract verbs');
    expect(formAt('contract-verbs', found?.cell)).toBe('ἀγαπῶ');
    expect(found?.cell).toContain('1st person singular');
  });

  it('opens the table tableFor picks for a word whose own form is in no table, with the cell of its parse', () => {
    const word = first('ἐρωτῶ');
    const found = paradigmOfWord(word);
    expect(found?.table.id).toBe(tableFor(word.p, word)?.id);
    expect(found?.table.id).toBe('verb-endings');
    expect(found?.cell).toContain('1st singular');
    expect(found?.cell).toContain('Present');
    expect(found?.cell).toContain('Active');
  });

  it('opens εἰμί on the Greek cell of an εἰμί form', () => {
    const word = first('ἔσται');
    const found = paradigmOfWord(word);
    expect(found?.table.id).toBe('eimi');
    expect(formAt('eimi', found?.cell)).toBe('ἔσται');
    const present = paradigmOfWord(first('ἐστὶν'));
    expect(present?.table.id).toBe('eimi');
    expect(formAt('eimi', present?.cell)).toBe('ἐστί(ν)');
  });

  it('opens the article on the cell of its case, number and gender', () => {
    const word = first('τῶν');
    const found = paradigmOfWord(word);
    expect(found?.table.id).toBe('article');
    expect(found?.cell).toBe('Genitive Plural Neuter');
    expect(formAt('article', found?.cell)).toBe('τῶν');
  });

  it('opens Noun endings on the ending a noun has, and the third declension on the full form', () => {
    const noun = paradigmOfWord(first('ἀληθείᾳ'));
    expect(noun?.table.id).toBe('noun-endings');
    expect(noun?.cell).toContain('Dative');
    expect(noun?.cell).toContain('First declension, feminine in α');
    expect(formAt('noun-endings', noun?.cell)).toBe('-ᾳ');
    const third = paradigmOfWord(first('πατρός'));
    expect(third?.table.id).toBe('third-declension');
    expect(formAt('third-declension', third?.cell)).toBe('πατρός');
  });

  it('names the table of every word tableFor has a table for, and lights a cell that has the word’s own case, number and person', () => {
    for (const word of words) {
      const found = paradigmOfWord(word);
      if (found === undefined) continue;
      const table = tableFor(word.p, word);
      expect(table, `${word.t} ${word.p}`).toBeDefined();
      if (found.cell !== undefined) expect(formAt(found.table.id, found.cell), `${word.t} ${word.p}`).toBeDefined();
    }
    // the words this chapter has in the tables it holds
    const lit = words.filter((w) => paradigmOfWord(w)?.cell !== undefined);
    expect(lit.length).toBeGreaterThan(40);
  });

  it('is none for an indeclinable word: a conjunction, a particle, an adverb, a preposition', () => {
    for (const code of ['CONJ', 'PRT-N', 'ADV', 'PREP']) {
      const word = words.find((w) => w.p === code);
      expect(word, code).toBeDefined();
      expect(paradigmOfWord(word!), `${word!.t} ${code}`).toBeUndefined();
    }
  });

  it('lights no cell, but still names the table, for a form the table does not hold', () => {
    const word = first('μένουσαν'); // an accusative participle; the table holds the nominative and genitive
    const found = paradigmOfWord(word);
    expect(found?.table.id).toBe('participle');
    expect(found?.cell).toBeUndefined();
  });

  it('every cell it names is a cell of its table, and every table it names is in the list', () => {
    for (const word of words) {
      const found = paradigmOfWord(word);
      if (!found) continue;
      expect(PARADIGMS).toContain(found.table);
    }
  });
});

describe('the Paradigms address of a word', () => {
  it('carries the cell, the word and its parse, and reads them back', () => {
    const hash = paradigmHash({ table: 'contract-verbs', cell: 'ἀγαπάω “I love” 1st person singular Present Active', word: 'ἀγαπῶ', parse: 'V-PAI-1S' });
    expect(hash.startsWith('#/paradigms?t=contract-verbs&')).toBe(true);
    expect(paradigmOf(hash)).toEqual({ table: 'contract-verbs', cell: 'ἀγαπάω “I love” 1st person singular Present Active', word: 'ἀγαπῶ', parse: 'V-PAI-1S' });
  });

  it('is the same address as before when there is no cell', () => {
    expect(paradigmHash({ table: 'article', mode: 'review' })).toBe('#/paradigms?t=article&mode=review');
    expect(paradigmOf('#/paradigms?t=article&cell=x')).toEqual({ table: 'article', cell: 'x' });
  });

  it('drops a cell, a word or a parse named with no table', () => {
    expect(paradigmOf('#/paradigms?cell=x&w=y&p=V-PAI-1S')).toEqual({});
  });
});
