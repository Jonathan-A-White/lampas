import { describe, expect, it } from 'vitest';
import { LADDER, TIERS } from '../../src/data/grammar/ladder';
import { availableCount, availableText, cellName, cellsOf, isAvailable, missingIdeas, paradigmById, PARADIGMS } from '../../src/data/paradigms';

const IDEA_IDS = new Set(LADDER.map((idea) => idea.id));
const COUNTS: Record<string, number> = {
  article: 24,
  'noun-endings': 40,
  eimi: 36,
  'verb-endings': 24,
  'third-declension': 48,
  'adjective-endings': 48,
  'pronouns-personal': 40,
  'pronouns-demonstrative-relative': 48,
  'pronouns-interrogative-indefinite': 32,
};

describe('the paradigm tables', () => {
  it('are nine, each with its stated number of cells', () => {
    expect(PARADIGMS.map((p) => p.id)).toEqual([
      'article',
      'noun-endings',
      'eimi',
      'verb-endings',
      'third-declension',
      'adjective-endings',
      'pronouns-personal',
      'pronouns-demonstrative-relative',
      'pronouns-interrogative-indefinite',
    ]);
    for (const table of PARADIGMS) expect(cellsOf(table), table.id).toHaveLength(COUNTS[table.id]);
  });

  it('have a cell under every column of every row, and no id twice', () => {
    expect(new Set(PARADIGMS.map((p) => p.id)).size).toBe(PARADIGMS.length);
    for (const table of PARADIGMS) for (const row of table.rows) expect(row.cells, `${table.id} ${row.label}`).toHaveLength(table.columns.length);
  });

  it('write every Greek form in NFC, and nothing empty', () => {
    for (const table of PARADIGMS)
      for (const cell of cellsOf(table)) {
        expect(cell.form.length, table.id).toBeGreaterThan(0);
        if (cell.lang === 'el') expect(cell.form, `${table.id} ${cell.form}`).toBe(cell.form.normalize('NFC'));
        if (cell.lang === 'el') expect(cell.form, `${table.id} ${cell.form}`).toMatch(/^[-\p{Script=Greek}()]+$/u);
      }
  });

  it('name only ideas that the grammar ladder has, and at least one each', () => {
    for (const table of PARADIGMS)
      for (const cell of cellsOf(table)) {
        expect(cell.ideas.length, `${table.id} ${cell.form}`).toBeGreaterThan(0);
        for (const id of cell.ideas) expect(IDEA_IDS.has(id), `${table.id} ${cell.form}: ${id}`).toBe(true);
      }
  });

  it('say which ideas each table teaches, all of them in the ladder, and which tier it belongs to', () => {
    for (const table of PARADIGMS) {
      expect(table.ideas.length, table.id).toBeGreaterThan(0);
      for (const id of table.ideas) expect(IDEA_IDS.has(id), `${table.id}: ${id}`).toBe(true);
      expect(TIERS, table.id).toContain(table.tier);
    }
  });

  it('give the new tables the ideas of the forms they hold', () => {
    const ideas = (id: string) => paradigmById(id)?.ideas;
    expect(ideas('third-declension')).toEqual(['declension-3']);
    expect(ideas('adjective-endings')).toEqual(['adjective']);
    expect(ideas('pronouns-personal')).toEqual(['pronoun-personal']);
    expect(ideas('pronouns-demonstrative-relative')).toEqual(['pronoun-demonstrative', 'pronoun-relative']);
    expect(ideas('pronouns-interrogative-indefinite')).toEqual(['pronoun-interrogative', 'pronoun-indefinite']);
  });

  it('give no two cells of a table the same place', () => {
    for (const table of PARADIGMS) {
      const places = table.rows.flatMap((row) => row.cells.map((_, c) => cellName(table, row, c)));
      expect(new Set(places).size, table.id).toBe(places.length);
    }
  });
});

describe('what his grammar levels unlock', () => {
  const article = paradigmById('article');
  if (!article) throw new Error('no article');
  const levels = (entries: Record<string, 'solid' | 'frontier' | 'notYet'>) => new Map(Object.entries(entries).map(([id, level]) => [id, { level }]));
  const GENITIVE_FEMININE = article.rows[1].cells[1];

  it('treat an idea with no level as not yet, so every cell is locked', () => {
    expect(availableCount(article, levels({}))).toEqual({ available: 0, total: 24 });
  });

  it('open a form once every idea it needs is at the frontier or solid, and not before', () => {
    const base = { article: 'solid', 'case-genitive': 'frontier', 'gender-feminine': 'solid' } as const;
    expect(isAvailable(GENITIVE_FEMININE, levels(base))).toBe(false);
    expect(missingIdeas(GENITIVE_FEMININE, levels(base))).toEqual(['number-singular']);
    expect(isAvailable(GENITIVE_FEMININE, levels({ ...base, 'number-singular': 'notYet' }))).toBe(false);
    expect(isAvailable(GENITIVE_FEMININE, levels({ ...base, 'number-singular': 'frontier' }))).toBe(true);
  });

  it('count the cells of a fixed set of levels, and say it as Available forms: N of M', () => {
    // the article, the genitive and dative, the masculine and feminine, the singular: 2 cases x 2 genders x 1 number
    const some = levels({
      article: 'solid',
      'case-genitive': 'solid',
      'case-dative': 'frontier',
      'gender-masculine': 'solid',
      'gender-feminine': 'frontier',
      'number-singular': 'solid',
      'case-accusative': 'notYet',
    });
    expect(availableCount(article, some)).toEqual({ available: 4, total: 24 });
    expect(availableText(availableCount(article, some))).toBe('Available forms: 4 of 24');
  });
});

describe('the third declension, the adjectives and the pronouns', () => {
  const formAt = (tableId: string, group: RegExp, row: string, column: number): string => {
    const table = paradigmById(tableId);
    if (!table) throw new Error(`no ${tableId}`);
    const found = table.rows.find((r) => r.label === row && r.group && group.test(r.group));
    if (!found) throw new Error(`no row ${row} for ${group} in ${tableId}`);
    return found.cells[column].form;
  };

  it('write the stem change out in full: σάρξ makes σαρκός and πατήρ makes πατρός in the genitive singular', () => {
    expect(formAt('third-declension', /σάρξ/, 'Genitive', 0)).toBe('σαρκός');
    expect(formAt('third-declension', /πατήρ/, 'Genitive', 0)).toBe('πατρός');
    expect(formAt('third-declension', /πνεῦμα/, 'Genitive', 0)).toBe('πνεύματος');
    expect(formAt('third-declension', /βασιλεύς/, 'Accusative', 1)).toBe('βασιλεῖς');
  });

  it('hold six nouns of four cases and two numbers, every cell naming the third declension, the noun, the case, number and gender', () => {
    const table = paradigmById('third-declension');
    if (!table) throw new Error('no third-declension');
    expect(new Set(table.rows.map((r) => r.group)).size).toBe(6);
    for (const cell of cellsOf(table)) {
      expect(cell.ideas, cell.form).toEqual(expect.arrayContaining(['noun', 'declension-3']));
      expect(cell.ideas.filter((id) => id.startsWith('case-')), cell.form).toHaveLength(1);
      expect(cell.ideas.filter((id) => id.startsWith('number-')), cell.form).toHaveLength(1);
      expect(cell.ideas.filter((id) => id.startsWith('gender-')), cell.form).toHaveLength(1);
    }
  });

  it('name the declension of each column of an adjective: ἀγαθός is 2-1-2 and πᾶς is 3-1-3', () => {
    const table = paradigmById('adjective-endings');
    if (!table) throw new Error('no adjective-endings');
    const declensionOf = (group: RegExp, column: number) =>
      table.rows.find((r) => r.group && group.test(r.group))?.cells[column].ideas.filter((id) => id.startsWith('declension-'));
    expect([0, 1, 2].map((c) => declensionOf(/ἀγαθός/, c))).toEqual([['declension-2'], ['declension-1'], ['declension-2']]);
    expect([0, 1, 2].map((c) => declensionOf(/πᾶς/, c))).toEqual([['declension-3'], ['declension-1'], ['declension-3']]);
    for (const cell of cellsOf(table)) expect(cell.ideas, cell.form).toContain('adjective');
  });

  it('give the personal pronouns their person, and αὐτός its gender', () => {
    const table = paradigmById('pronouns-personal');
    if (!table) throw new Error('no pronouns-personal');
    expect(formAt('pronouns-personal', /ἐγώ/, 'Nominative', 0)).toBe('ἐγώ');
    expect(formAt('pronouns-personal', /σύ/, 'Nominative', 1)).toBe('ὑμεῖς');
    expect(formAt('pronouns-personal', /αὐτός/, 'Genitive', 0)).toBe('αὐτοῦ');
    for (const cell of cellsOf(table)) {
      expect(cell.ideas, cell.form).toContain('pronoun-personal');
      expect(cell.ideas.filter((id) => id.startsWith('person-')), cell.form).toHaveLength(1);
    }
    const gendered = table.rows.filter((r) => r.group && /αὐτός/.test(r.group)).flatMap((r) => r.cells);
    expect(gendered).toHaveLength(24);
    for (const cell of gendered) expect(cell.ideas.filter((id) => id.startsWith('gender-')), cell.form).toHaveLength(1);
  });

  it('keep τίς and τις as two sets of cells, told apart by the accent', () => {
    const table = paradigmById('pronouns-interrogative-indefinite');
    if (!table) throw new Error('no pronouns-interrogative-indefinite');
    const who = cellsOf(table).filter((c) => c.ideas.includes('pronoun-interrogative'));
    const some = cellsOf(table).filter((c) => c.ideas.includes('pronoun-indefinite'));
    expect(who).toHaveLength(16);
    expect(some).toHaveLength(16);
    expect(formAt('pronouns-interrogative-indefinite', /τίς/, 'Nominative', 0)).toBe('τίς');
    expect(formAt('pronouns-interrogative-indefinite', /^τις/, 'Nominative', 0)).toBe('τις');
    expect(formAt('pronouns-interrogative-indefinite', /τίς/, 'Genitive', 0)).toBe('τίνος');
    expect(formAt('pronouns-interrogative-indefinite', /^τις/, 'Genitive', 0)).toBe('τινός');
    const places = table.rows.flatMap((row) => row.cells.map((_, c) => cellName(table, row, c)));
    expect(new Set(places).size).toBe(32);
  });

  it('give the demonstrative and the relative 24 cells each, 4 cases x 3 genders x 2 numbers', () => {
    const table = paradigmById('pronouns-demonstrative-relative');
    if (!table) throw new Error('no pronouns-demonstrative-relative');
    expect(cellsOf(table).filter((c) => c.ideas.includes('pronoun-demonstrative'))).toHaveLength(24);
    expect(cellsOf(table).filter((c) => c.ideas.includes('pronoun-relative'))).toHaveLength(24);
    expect(formAt('pronouns-demonstrative-relative', /οὗτος/, 'Nominative', 1)).toBe('αὕτη');
    expect(formAt('pronouns-demonstrative-relative', /ὅς/, 'Dative', 0)).toBe('ᾧ');
  });
});
