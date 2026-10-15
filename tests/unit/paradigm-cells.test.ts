import { describe, expect, it } from 'vitest';
import { cellName, cellsOf, paradigmById, type Levels } from '../../src/data/paradigms';
import { CELLS_A_ROUND, cellPrompt, drawCellQuestions } from '../../src/data/paradigms/cells';
import { mulberry32 } from '../../src/data/quiz';

const article = paradigmById('article')!;
const level = (level: 'solid' | 'frontier' | 'notYet') => ({ level });
// the paradigms feature's Background: the nominative and genitive, the singular and the masculine and feminine are open: 4 article forms
const FOUR: Levels = new Map([
  ['article', level('solid')],
  ['case-nominative', level('solid')],
  ['case-genitive', level('frontier')],
  ['number-singular', level('solid')],
  ['gender-masculine', level('solid')],
  ['gender-feminine', level('frontier')],
]);
const NONE: Levels = new Map();
const everyForm = new Set(cellsOf(article).map((c) => c.form));

describe('drawCellQuestions', () => {
  it('asks a cell by its name among four forms of the same table', () => {
    const questions = drawCellQuestions(article, FOUR, mulberry32(1));
    expect(questions.length).toBe(3);
    for (const q of questions) {
      expect(q.kind).toBe('cell');
      expect(q.table).toBe('article');
      expect(q.options.length).toBe(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.right);
      for (const o of q.options) expect(everyForm.has(o)).toBe(true);
    }
  });

  it('names the cell as the question and the table at its end', () => {
    const row = article.rows[1];
    expect(cellPrompt(article, row, 0)).toBe('Genitive singular masculine of the article');
    expect(cellName(article, row, 0)).toBe('Genitive Singular Masculine');
  });

  it('asks the same cells twice from the same seed', () => {
    const a = drawCellQuestions(article, FOUR, mulberry32(9));
    const b = drawCellQuestions(article, FOUR, mulberry32(9));
    expect(b).toEqual(a);
  });

  it('asks only available cells, at most CELLS_A_ROUND of them', () => {
    expect(CELLS_A_ROUND).toBe(3);
    const open = new Set(['Nominative Singular Masculine', 'Nominative Singular Feminine', 'Genitive Singular Masculine', 'Genitive Singular Feminine'].map((n) => cellPrompt2(n)));
    for (let seed = 1; seed < 30; seed += 1) {
      const asked = drawCellQuestions(article, FOUR, mulberry32(seed)).map((q) => q.prompt);
      expect(new Set(asked).size).toBe(asked.length);
      for (const p of asked) expect(open.has(p)).toBe(true);
    }
  });

  it('borrows locked forms as wrong options when fewer than four cells are open', () => {
    const two: Levels = new Map([...FOUR].filter(([id]) => id !== 'case-genitive' && id !== 'gender-feminine'));
    const questions = drawCellQuestions(article, two, mulberry32(3));
    expect(questions.length).toBe(1);
    expect(questions[0].options.length).toBe(4);
    expect(new Set(questions[0].options).size).toBe(4);
  });

  it('asks nothing of a table with no available cell', () => {
    expect(drawCellQuestions(article, NONE, mulberry32(1))).toEqual([]);
  });
});

/** the prompt a cell of the article has: its name in sentence case, of the table */
function cellPrompt2(name: string): string {
  const lower = name.toLowerCase();
  return `${lower[0].toUpperCase()}${lower.slice(1)} of the article`;
}
