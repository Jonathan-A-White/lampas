import { describe, expect, it } from 'vitest';
import { LADDER } from '../../src/data/grammar/ladder';
import { availableCount, availableText, cellName, cellsOf, isAvailable, missingIdeas, paradigmById, PARADIGMS } from '../../src/data/paradigms';

const IDEA_IDS = new Set(LADDER.map((idea) => idea.id));
const COUNTS: Record<string, number> = { article: 24, 'noun-endings': 40, eimi: 36, 'verb-endings': 24 };

describe('the paradigm tables', () => {
  it('are the article, noun endings, εἰμί and verb endings, with 24, 40, 36 and 24 cells', () => {
    expect(PARADIGMS.map((p) => p.id)).toEqual(['article', 'noun-endings', 'eimi', 'verb-endings']);
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
