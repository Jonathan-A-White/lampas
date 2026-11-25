// src/data/paradigms/fill.ts — Fill the table (mw-fnvjof.17.316): the Drill the other way round. The Drill gives the place and asks for the form; here the forms are given, as shuffled
// tiles under the table, and he places each in its cell. The cells emptied are the ones the table shows under How much of a table (shownCells: open and not-yet ones, never a locked or
// a hidden one). A tile placed in a cell that has its form stays; a wrong one goes back to the tray and is a slip; Show fills the rest. Pure: nothing here reads the store or the screen;
// the screen keeps the run while it is open, and the first slip of a run is what it tells Review (recordDrillMiss, as a Drill's first Missed).
import { shuffle, type Random } from '../random';
import { cellName, standingOf, type CellStanding, type Levels, type Paradigm, type ParadigmCell } from './index';
import type { GrammarExtent } from '../grammar/extent';

/** The cells the table shows, in its order, each with its name and standing: open and notYet are shown (asked by the Drill, emptied by Fill the table); outside, locked and absent ones are not. */
export function shownCells(table: Paradigm, levels: Levels, extent: GrammarExtent): { place: string; cell: ParadigmCell; standing: CellStanding }[] {
  return table.rows
    .flatMap((row) => row.cells.map((cell, c) => ({ place: cellName(table, row, c), cell, standing: standingOf(cell, levels, extent) })))
    .filter(({ cell, standing }) => !cell.absent && (standing === 'open' || standing === 'notYet'));
}

/** One form on the tray. Two cells with the same form (τοῦ in two places of the article) are two tiles, either of which fits either cell. */
export interface Tile {
  id: number;
  form: string;
}

export interface Fill {
  /** every cell this run emptied (their names), in the table's order, and the form each takes */
  asking: readonly string[];
  forms: ReadonlyMap<string, string>;
  /** the tiles still on the tray, in the order they are laid */
  tiles: readonly Tile[];
  /** the cells he filled himself */
  placed: ReadonlySet<string>;
  /** the cells Show filled for him */
  shown: ReadonlySet<string>;
  /** the wrong placements so far, and Show with cells left, each one */
  slips: number;
  /** whether the run's first slip has been told to Review (one write a run, as a Drill's) */
  slipWritten: boolean;
}

export interface FillScore {
  placed: number;
  shown: number;
  of: number;
  slips: number;
  /** every cell is filled, by him or by Show (and there was one to fill) */
  done: boolean;
}

/** A run that empties `cells` (each a place and its form) and lays their forms, shuffled by `random`. A tray that happens to come out in the table's order is shuffled again, once, so it never gives the table away. */
export function startFill(cells: readonly { place: string; form: string }[], random: Random): Fill {
  const all = cells.map(({ form }, id): Tile => ({ id, form }));
  let tiles = shuffle(all, random);
  if (tiles.length > 1 && tiles.every((tile, i) => tile.id === i)) tiles = shuffle(all, random);
  return {
    asking: cells.map((c) => c.place),
    forms: new Map(cells.map((c) => [c.place, c.form])),
    tiles,
    placed: new Set(),
    shown: new Set(),
    slips: 0,
    slipWritten: false,
  };
}

/** Whether the tile on the tray has the form of the cell, and the cell is still empty. */
export function tileFits(fill: Fill, tileId: number, place: string): boolean {
  const tile = fill.tiles.find((t) => t.id === tileId);
  return tile !== undefined && fillOf(fill, place) === 'empty' && fill.forms.get(place) === tile.form;
}

/** A cell of the run: 'empty' until placed or shown, then 'filled'; undefined for a cell the run does not ask. */
export function fillOf(fill: Fill, place: string): 'empty' | 'filled' | undefined {
  if (!fill.forms.has(place)) return undefined;
  return fill.placed.has(place) || fill.shown.has(place) ? 'filled' : 'empty';
}

/** He puts the tile in the cell. Right: the cell stays filled and the tile leaves the tray. Wrong: the tile stays on the tray and a slip is counted. A cell filled already or a tile not on the tray changes nothing (`changed` false). */
export function placeTile(fill: Fill, tileId: number, place: string): { fill: Fill; right: boolean; changed: boolean } {
  const tile = fill.tiles.find((t) => t.id === tileId);
  if (!tile || fillOf(fill, place) !== 'empty') return { fill, right: false, changed: false };
  if (!tileFits(fill, tileId, place)) return { fill: { ...fill, slips: fill.slips + 1 }, right: false, changed: true };
  return { fill: { ...fill, tiles: fill.tiles.filter((t) => t.id !== tileId), placed: new Set([...fill.placed, place]) }, right: true, changed: true };
}

/** The first slip of the run has been told to Review. */
export const slipWritten = (fill: Fill): Fill => ({ ...fill, slipWritten: true });

/** Show: every cell left is filled with its form and the tray is cleared; with any cell left it is a slip, since he did not place it. */
export function showTheRest(fill: Fill): Fill {
  const left = fill.asking.filter((place) => fillOf(fill, place) === 'empty');
  if (left.length === 0) return fill;
  return { ...fill, tiles: [], shown: new Set([...fill.shown, ...left]), slips: fill.slips + 1 };
}

export function fillScore(fill: Fill): FillScore {
  return { placed: fill.placed.size, shown: fill.shown.size, of: fill.asking.length, slips: fill.slips, done: fill.asking.length > 0 && fill.placed.size + fill.shown.size >= fill.asking.length };
}
