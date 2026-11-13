// The Study list at the end of a Review or drill (mw-indx1x6.8, src/review/studyList.ts): everything the session's misses linked to, one row per resource, most-missed first, ties the most recent miss first;
// the misses that linked to nothing are kept apart for the 'Ask the tutor about these' row.
import { describe, expect, it } from 'vitest';
import type { Study, StudyLink } from '../../src/review/studyThis';
import { missesFirstTurn, missesScreen, studyListOf } from '../../src/review/studyList';

const miss = (n: number) => ({ asked: `Question ${n}`, answer: `mine ${n}`, right: `right ${n}`, idea: `Idea ${n}` });
const table = (id: string, cell?: string): StudyLink => ({ kind: 'paradigm', label: `Table: ${id}`, address: { table: id, mode: 'learn', ...(cell ? { cell } : {}) } });
const lesson = (ideaId: string): StudyLink => ({ kind: 'lesson', label: `Lesson: ${ideaId}`, ideaId });
const study = (n: number, ...links: StudyLink[]): Study => ({ links, miss: miss(n) });

describe('studyListOf', () => {
  it('is empty for a session with no misses', () => {
    expect(studyListOf([])).toEqual({ rows: [], unlinked: [] });
  });

  it('shows a resource once, however many misses pointed to it, and counts the misses', () => {
    const { rows } = studyListOf([study(1, table('noun-endings', 'a')), study(2, table('article')), study(3, table('noun-endings', 'b'))]);
    expect(rows.map((r) => [r.link.label, r.count])).toEqual([
      ['Table: noun-endings', 2],
      ['Table: article', 1],
    ]);
  });

  it('opens a repeated table at the cell of the latest miss', () => {
    const { rows } = studyListOf([study(1, table('noun-endings', 'first cell')), study(2, table('noun-endings', 'last cell'))]);
    expect(rows[0].link).toMatchObject({ address: { cell: 'last cell' } });
  });

  it('puts the most-missed first and, between equals, the most recent miss first', () => {
    const { rows } = studyListOf([study(1, lesson('a')), study(2, lesson('b')), study(3, lesson('c')), study(4, lesson('b'))]);
    expect(rows.map((r) => [r.link.label, r.count])).toEqual([
      ['Lesson: b', 2],
      ['Lesson: c', 1],
      ['Lesson: a', 1],
    ]);
  });

  it('counts a miss once for a resource it links twice', () => {
    const { rows } = studyListOf([study(1, lesson('a'), lesson('a'))]);
    expect(rows.map((r) => r.count)).toEqual([1]);
  });

  it('tells a word from a Hebrew word of the same letters and a word from how to remember it', () => {
    const { rows } = studyListOf([
      study(1, { kind: 'word', label: 'Word: x', lemma: 'x' }, { kind: 'mnemonic', label: 'How to remember it', lemma: 'x', gloss: 'g' }),
      study(2, { kind: 'word', label: 'Word: x', lemma: 'x', hebrew: true }),
    ]);
    expect(rows).toHaveLength(3);
  });

  it('keeps the misses that linked to nothing apart, in the order they came', () => {
    const { rows, unlinked } = studyListOf([study(1), study(2, lesson('a')), study(3)]);
    expect(rows).toHaveLength(1);
    expect(unlinked.map((m) => m.asked)).toEqual(['Question 1', 'Question 3']);
  });
});

describe('what the tutor is told of the misses that linked to nothing', () => {
  it('has a first turn that names each question, his answer, the right answer and the idea', () => {
    const turn = missesFirstTurn([miss(1), miss(2)]);
    for (const part of ['Question 1', 'mine 1', 'right 1', 'Idea 1', 'Question 2', 'mine 2', 'right 2', 'Idea 2']) expect(turn).toContain(part);
  });

  it('has facts of the screen, one for each miss', () => {
    const screen = missesScreen('Review', [miss(1), miss(2)]);
    expect(screen.name).toBe('Review');
    expect(screen.facts).toHaveLength(2);
    expect(screen.facts[0].value).toContain('Question 1');
    expect(screen.facts[0].value).toContain('mine 1');
    expect(screen.facts[0].value).toContain('right 1');
  });
});
