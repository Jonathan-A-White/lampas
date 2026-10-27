// tableFor and the word sheet's Paradigm row for a Hebrew word (mw-gdcyf98.13): the table is found by the ideas of the word's parsing as the Greek one is, and the word's own cell is lit.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { cellName, paradigmById, paradigmOfHebrewWord, paradigmOfWord, tableFor } from '../../src/data/paradigms';

const load = (book: string, n: number) => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const jonah = load('jon', 1);
const genesis = load('gen', 1);
const find = (chapter: Chapter, form: string): GreekWord => {
  const word = chapter.verses.flatMap((v) => v.g).find((w) => w.t.normalize('NFC') === form.normalize('NFC'));
  if (!word) throw new Error(`no ${form}`);
  return word;
};
const parseOf = (chapter: Chapter, word: GreekWord): string => chapter.parse[word.p];
const formAt = (tableId: string, place: string | undefined): string | undefined => {
  const table = paradigmById(tableId)!;
  return table.rows.flatMap((row) => row.cells.map((cell, c) => ({ place: cellName(table, row, c), cell }))).find((x) => x.place === place)?.cell.form;
};

describe('tableFor a Hebrew word', () => {
  it('puts וַיְהִי (Jonah 1:1, a qal consecutive imperfect) on the qal verb, in the cell of the imperfect 3rd masculine singular', () => {
    const word = jonah.verses[0].g[0];
    expect(word.t).toBe('וַֽיְהִי֙');
    expect(parseOf(jonah, word)).toBe('Conjunctive waw | Verb - Qal - Consecutive imperfect - third person masculine singular');
    expect(tableFor(parseOf(jonah, word), word, 'hbo')?.id).toBe('he-qal-strong');
    const found = paradigmOfHebrewWord(word, parseOf(jonah, word));
    expect(found?.table.name).toBe('The qal verb');
    expect(found?.cell).toBe('Imperfect 3rd masculine Singular');
    expect(formAt('he-qal-strong', found?.cell)).toBe('יִקְטֹל');
    expect(found?.holds).toBe(false);
  });

  it('puts הַשָּׁמַיִם (Genesis 1:1) on the article, in its plain row', () => {
    const word = find(genesis, 'הַשָּׁמַ֖יִם');
    expect(parseOf(genesis, word)).toBe('Article | Noun - masculine plural');
    expect(tableFor(parseOf(genesis, word), word, 'hbo')?.id).toBe('he-article');
    const found = paradigmOfHebrewWord(word, parseOf(genesis, word));
    expect(found?.cell).toBe('Before a plain letter With the article');
    expect(formAt('he-article', found?.cell)).toBe('הַיּוֹם');
  });

  it('finds the qal perfect, the qal imperative, a pronoun and a noun’s suffix, and the cell of each', () => {
    const perfect = find(genesis, 'בָּרָ֣א');
    expect(paradigmOfHebrewWord(perfect, parseOf(genesis, perfect))?.cell).toBe('Perfect 3rd masculine Singular');
    expect(paradigmOfHebrewWord(perfect, parseOf(genesis, perfect))?.holds).toBe(false);
    expect(paradigmOfHebrewWord({ t: 'קָטַל' }, 'Verb - Qal - Perfect - third person masculine singular')?.holds).toBe(true);
    expect(paradigmOfHebrewWord({ t: 'קוּם' }, 'Verb - Qal - Imperative - masculine singular')).toMatchObject({ table: { id: 'he-qal-strong' }, cell: 'Imperative Masculine Singular' });
    expect(paradigmOfHebrewWord({ t: 'אָנֹכִי' }, 'Pronoun - first person common singular')).toMatchObject({ table: { id: 'he-pronouns-personal' }, cell: '1st common Singular' });
    expect(paradigmOfHebrewWord({ t: 'סוּסוֹ' }, 'Noun - masculine singular construct | third person masculine singular')).toMatchObject({ table: { id: 'he-noun-suffixes' }, cell: 'One owner 3rd masculine Singular noun' });
  });

  it('gives no table to a word no Hebrew table is for, and leaves a Greek word to the Greek tables', () => {
    for (const parse of ['Noun - masculine singular', 'Conjunction', 'Preposition', 'Verb - Hifil - Perfect - third person masculine singular', 'Verb - Qal - Participle - masculine singular', 'Verb - Qal - Infinitive construct', 'Pronoun - relative', 'Noun - proper - masculine singular']) {
      expect(tableFor(parse, { l: '', t: 'x' }, 'hbo'), parse).toBeUndefined();
    }
    expect(tableFor('V-PAI-1S', undefined, 'grc')?.id).toBe('verb-endings');
    expect(tableFor('V-PAI-1S')?.id).toBe('verb-endings');
    const greek = JSON.parse(readFileSync('public/data/2jn/1.json', 'utf8')) as Chapter;
    const word = greek.verses.flatMap((v) => v.g)[0];
    expect(paradigmOfWord(word)?.table.id).toBeTruthy();
  });
});
