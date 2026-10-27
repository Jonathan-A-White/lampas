// The Hebrew paradigm tables (mw-gdcyf98.13): four tables with lang 'he', every cell tied to ideas of the Hebrew ladder and a pointed form, drawn right to left.
import { describe, expect, it } from 'vitest';
import { ladderFor } from '../../src/data/grammar/ladders';
import { PARADIGMS, cellName, cellsOf, languageOf, paradigmById, paradigmsIn, paradigmsOf } from '../../src/data/paradigms';
import { QAL_STRONG } from '../../src/data/paradigms/hebrew/qalStrong';
import { ideasOf, tagsOf } from '../../src/data/paradigms/hebrew/ideas';
import { blocksOf, columnsThatFit, tableDirection } from '../../src/data/paradigms/layout';

const hebrew = paradigmsIn('hbo');
const POINTS = /[ְ-ּׁׂ]/u;

describe('the Hebrew tables', () => {
  it('are four, after the Greek ones in PARADIGMS, each in its own tier', () => {
    expect(hebrew.map((t) => [t.id, t.name, t.tier])).toEqual([
      ['he-qal-strong', 'The qal verb', 'verbs'],
      ['he-pronouns-personal', 'Hebrew personal pronouns', 'pronouns'],
      ['he-noun-suffixes', 'Pronominal suffixes', 'nouns'],
      ['he-article', 'The Hebrew article', 'nouns'],
    ]);
    expect(PARADIGMS.slice(-4)).toEqual(hebrew);
    expect(paradigmsIn('grc')).toHaveLength(20);
    expect(paradigmsIn('grc').every((t) => languageOf(t) === 'grc')).toBe(true);
  });

  it('hold the cells the story names', () => {
    const counts = Object.fromEntries(hebrew.map((t) => [t.id, cellsOf(t).length]));
    expect(counts).toEqual({ 'he-qal-strong': 24, 'he-pronouns-personal': 10, 'he-noun-suffixes': 20, 'he-article': 6 });
    for (const table of hebrew) for (const row of table.rows) expect(row.cells, `${table.id} ${row.label}`).toHaveLength(table.columns.length);
  });

  it('give every cell its pointed Hebrew form and ideas of the Hebrew ladder', () => {
    const ladder = ladderFor('hbo');
    for (const table of hebrew) {
      for (const idea of table.ideas) expect(() => ladder.ideaOf(idea), `${table.id} ${idea}`).not.toThrow();
      for (const cell of cellsOf(table)) {
        expect(cell.lang, `${table.id} ${cell.form}`).toBe('he');
        expect(cell.form, `${table.id}`).toBe(cell.form.normalize('NFC'));
        expect(POINTS.test(cell.form), `${table.id}: ${cell.form} is pointed`).toBe(true);
        expect(cell.ideas.length, `${table.id} ${cell.form}`).toBeGreaterThan(0);
        for (const id of cell.ideas) {
          expect(id.startsWith('he-'), `${table.id} ${cell.form} ${id}`).toBe(true);
          expect(() => ladder.ideaOf(id), `${table.id} ${cell.form} ${id}`).not.toThrow();
        }
      }
    }
  });

  it('name the qal ideas on every verb cell, and no gender on a first person', () => {
    for (const cell of cellsOf(QAL_STRONG)) {
      expect(cell.ideas).toContain('he-qal');
      expect(cell.ideas).toContain('he-person-gender-number');
    }
    const first = QAL_STRONG.rows.filter((row) => row.label === '1st common').flatMap((row) => row.cells);
    expect(first).toHaveLength(4);
    for (const cell of first) expect(cell.ideas).not.toContain('he-gender');
    const third = QAL_STRONG.rows.find((row) => row.label === '3rd masculine')!.cells;
    for (const cell of third) expect(cell.ideas).toContain('he-gender');
  });

  it('are what the idea sheets link to', () => {
    expect(paradigmsOf('he-qal').map((t) => t.id)).toEqual(['he-qal-strong']);
    expect(paradigmsOf('he-article').map((t) => t.id)).toEqual(['he-article']);
    expect(paradigmsOf('he-suffix-pronominal').map((t) => t.id)).toEqual(['he-noun-suffixes']);
    expect(paradigmsOf('he-pronoun-personal').map((t) => t.id)).toEqual(['he-pronouns-personal']);
  });

  it('have cells named by their place', () => {
    const table = paradigmById('he-qal-strong')!;
    expect(cellName(table, table.rows[0], 0)).toBe('Perfect 3rd masculine Singular');
    expect(cellName(table, table.rows[0], 1)).toBe('Perfect 3rd masculine Plural');
  });
});

describe('a Hebrew parsing', () => {
  it('names the ideas of the Hebrew ladder, a person on a verb as the verb’s', () => {
    expect(ideasOf('Conjunctive waw | Verb - Qal - Consecutive imperfect - third person masculine singular')).toEqual([
      'he-gender',
      'he-number',
      'he-vav',
      'he-root',
      'he-qal',
      'he-imperfect',
      'he-vav-consecutive',
      'he-person-gender-number',
    ].sort((a, b) => ladderFor('hbo').ideaOf(a).rung - ladderFor('hbo').ideaOf(b).rung));
    expect(ideasOf('Pronoun - first person common singular')).toContain('he-pronoun-personal');
    expect(ideasOf('Verb - Qal - Perfect - third person masculine singular')).not.toContain('he-pronoun-personal');
    expect(ideasOf('Prepositions')).toEqual([]);
  });

  it('says what a cell is in tags: tense, person, gender, number, a noun with a suffix, an article', () => {
    expect(tagsOf('Verb - Qal - Perfect - third person masculine singular')).toEqual(['tense:perfect', 'person:3', 'gender:m', 'number:s']);
    expect(tagsOf('Verb - Qal - Imperative - masculine plural')).toEqual(['tense:imperative', 'gender:m', 'number:p']);
    expect(tagsOf('Noun - masculine singular construct | third person masculine singular')).toEqual(['noun:s', 'person:3', 'gender:m', 'number:s']);
    expect(tagsOf('Article | Noun - masculine plural', 'הַשָּׁמַיִם')).toEqual(['noun:p', 'with:article', 'article:plain']);
  });
});

describe('the right to left layout', () => {
  it('draws a Hebrew table right to left, the person column at the right, and a Greek table left to right', () => {
    for (const table of hebrew) expect(tableDirection(table), table.id).toBe('rtl');
    for (const table of paradigmsIn('grc')) expect(tableDirection(table), table.id).toBe('ltr');
  });

  it('fits the columns of every Hebrew table on a phone, the points not counted as letters', () => {
    for (const table of hebrew) {
      const per = columnsThatFit(table, 358 / 16);
      expect(per, table.id).toBe(table.columns.length);
      expect(blocksOf(table.columns, per), table.id).toEqual([table.columns.map((_, i) => i)]);
    }
  });
});
