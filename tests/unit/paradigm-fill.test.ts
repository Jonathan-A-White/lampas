// Fill the table (mw-fnvjof.17.316, src/data/paradigms/fill.ts): the Drill the other way round. The cells the filter shows are emptied and their forms laid as shuffled tiles;
// a tile placed in the cell it belongs to stays, one placed wrongly goes back and counts a slip; Show fills the rest; the first slip of a run is the one the table's Review row is told of.
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/data/random';
import { fillOf, fillScore, placeTile, shownCells, showTheRest, startFill, tileFits, type Fill } from '../../src/data/paradigms/fill';
import { cellName, paradigmById, standingOf, type Levels } from '../../src/data/paradigms';

const CELLS = [
  { place: 'Nominative Singular Masculine', form: 'ὁ' },
  { place: 'Genitive Singular Masculine', form: 'τοῦ' },
  { place: 'Genitive Singular Feminine', form: 'τοῦ' },
  { place: 'Genitive Plural Masculine', form: 'τῶν' },
];

describe('startFill', () => {
  it('lays one tile for each cell, shuffled with the seed given, the same seed the same order, and every cell empty', () => {
    const a = startFill(CELLS, mulberry32(7));
    const b = startFill(CELLS, mulberry32(7));
    expect(a.tiles.map((t) => t.form)).toEqual(b.tiles.map((t) => t.form));
    expect(a.tiles.map((t) => t.form).sort()).toEqual(['ὁ', 'τοῦ', 'τοῦ', 'τῶν'].sort());
    expect(new Set(a.tiles.map((t) => t.id)).size).toBe(4);
    expect(a.placed.size).toBe(0);
    expect(a.slips).toBe(0);
    expect(a.slipWritten).toBe(false);
    expect(fillScore(a)).toEqual({ placed: 0, shown: 0, of: 4, slips: 0, done: false });
  });

  it('is not given in the order of the table (some seed shuffles it)', () => {
    const orders = [1, 2, 3, 4, 5].map((seed) => startFill(CELLS, mulberry32(seed)).tiles.map((t) => t.form).join(''));
    expect(orders.some((order) => order !== 'ὁτοῦτοῦτῶν')).toBe(true);
  });
});

describe('placeTile', () => {
  const start = (): Fill => startFill(CELLS, mulberry32(3));
  const tileOf = (fill: Fill, form: string) => fill.tiles.find((t) => t.form === form)!;

  it('keeps a right tile in its cell and takes it off the tray', () => {
    const fill = start();
    const tile = tileOf(fill, 'ὁ');
    const { fill: next, right } = placeTile(fill, tile.id, 'Nominative Singular Masculine');
    expect(right).toBe(true);
    expect(next.placed.has('Nominative Singular Masculine')).toBe(true);
    expect(next.tiles.map((t) => t.id)).not.toContain(tile.id);
    expect(next.slips).toBe(0);
  });

  it('sends a wrong tile back to the tray and counts a slip', () => {
    const fill = start();
    const tile = tileOf(fill, 'τῶν');
    const { fill: next, right } = placeTile(fill, tile.id, 'Genitive Singular Masculine');
    expect(right).toBe(false);
    expect(next.placed.size).toBe(0);
    expect(next.tiles).toHaveLength(4);
    expect(next.slips).toBe(1);
  });

  it('takes a form that stands in two cells in either of them', () => {
    let fill = start();
    const tile = tileOf(fill, 'τοῦ');
    expect(tileFits(fill, tile.id, 'Genitive Singular Feminine')).toBe(true);
    fill = placeTile(fill, tile.id, 'Genitive Singular Feminine').fill;
    expect(fill.placed.has('Genitive Singular Feminine')).toBe(true);
    const other = tileOf(fill, 'τοῦ');
    expect(placeTile(fill, other.id, 'Genitive Singular Masculine').right).toBe(true);
  });

  it('leaves a cell already placed, or a tile no longer on the tray, as it was', () => {
    let fill = start();
    const tile = tileOf(fill, 'ὁ');
    fill = placeTile(fill, tile.id, 'Nominative Singular Masculine').fill;
    expect(placeTile(fill, tile.id, 'Nominative Singular Masculine')).toEqual({ fill, right: false, changed: false });
    const toū = tileOf(fill, 'τῶν');
    expect(placeTile(fill, toū.id, 'Nominative Singular Masculine')).toEqual({ fill, right: false, changed: false });
  });

  it('ends when the tray is empty, with the score of the cells he placed', () => {
    let fill = start();
    for (const cell of CELLS) {
      const tile = fill.tiles.find((t) => t.form === cell.form && tileFits(fill, t.id, cell.place))!;
      fill = placeTile(fill, tile.id, cell.place).fill;
    }
    expect(fill.tiles).toHaveLength(0);
    expect(fillScore(fill)).toEqual({ placed: 4, shown: 0, of: 4, slips: 0, done: true });
  });
});

describe('showTheRest', () => {
  it('fills every cell left, as shown and not placed, and counts a slip when any was left', () => {
    let fill = startFill(CELLS, mulberry32(5));
    const first = fill.tiles.find((t) => t.form === 'ὁ')!;
    fill = placeTile(fill, first.id, 'Nominative Singular Masculine').fill;
    const shown = showTheRest(fill);
    expect(shown.tiles).toHaveLength(0);
    expect(fillScore(shown)).toEqual({ placed: 1, shown: 3, of: 4, slips: 1, done: true });
    expect(fillOf(shown, 'Genitive Plural Masculine')).toBe('filled');
    expect(fillOf(shown, 'Nominative Singular Masculine')).toBe('filled');
  });

  it('is no slip when nothing was left', () => {
    let fill = startFill(CELLS.slice(0, 1), mulberry32(1));
    fill = placeTile(fill, fill.tiles[0].id, CELLS[0].place).fill;
    expect(showTheRest(fill).slips).toBe(0);
  });
});

describe('fillOf', () => {
  it('says a cell is empty until it is placed or shown, and that a cell outside the run is not in it', () => {
    const fill = startFill(CELLS, mulberry32(2));
    expect(fillOf(fill, 'Genitive Plural Masculine')).toBe('empty');
    expect(fillOf(fill, 'Dative Plural Neuter')).toBeUndefined();
  });
});

describe('shownCells, the cells the filter empties', () => {
  const article = paradigmById('article')!;
  const levels = (ideas: Record<string, 'solid' | 'frontier'>): Levels => new Map(Object.entries(ideas).map(([id, level]) => [id, { level }]));
  const IDEAS = {
    article: 'solid', noun: 'solid', 'number-singular': 'solid', 'number-plural': 'solid', 'case-nominative': 'solid', 'case-genitive': 'solid',
    'case-dative': 'frontier', 'gender-masculine': 'solid', 'gender-feminine': 'solid',
  } as const;

  it('asks the cells the filter shows, in the table order, each with its form, never a locked one', () => {
    const any = shownCells(article, levels(IDEAS), 'any');
    const frontier = shownCells(article, levels(IDEAS), 'solid+frontier');
    const solid = shownCells(article, levels(IDEAS), 'solid');
    expect(any).toHaveLength(24);
    expect(frontier).toHaveLength(12);
    expect(solid.length).toBeLessThan(frontier.length);
    expect(solid.length).toBeGreaterThan(0);
    for (const { cell } of frontier) expect(cell.form).not.toBe('');
    // the cells of Solid only are among the cells of Solid and frontier, which are among Any's
    const places = (list: { place: string }[]) => new Set(list.map((c) => c.place));
    for (const place of places(solid)) expect(places(frontier).has(place)).toBe(true);
    for (const place of places(frontier)) expect(places(any).has(place)).toBe(true);
    for (const row of article.rows) {
      row.cells.forEach((cell, c) => {
        const standing = standingOf(cell, levels(IDEAS), 'solid+frontier');
        expect(places(frontier).has(cellName(article, row, c))).toBe(standing === 'open' || standing === 'notYet');
      });
    }
  });
});
