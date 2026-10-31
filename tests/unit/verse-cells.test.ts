// The spans of the Verse view's row of actions (src/verse/cells.ts, mw-5r3p30.896): three to a row with the last row stretched, two to a row under 15 rem, one row from 30 rem.
import { describe, expect, it } from 'vitest';
import { cellSpan } from '../../src/verse/cells';

const wide = (cells: number) => Array.from({ length: cells }, (_, i) => cellSpan(i, cells).split(' ')[0]);
const narrow = (cells: number) => Array.from({ length: cells }, (_, i) => cellSpan(i, cells).split(' ')[1]);

describe('cellSpan', () => {
  it('five cells (a verse): three over the first row, two stretched over the second', () => {
    expect(wide(5)).toEqual(['col-span-2', 'col-span-2', 'col-span-2', 'col-span-3', 'col-span-3']);
  });
  it('four cells (a passage): three, then one over the whole second row', () => {
    expect(wide(4)).toEqual(['col-span-2', 'col-span-2', 'col-span-2', 'col-span-6']);
  });
  it('three or six cells fill their rows; one cell (no licence) is the whole row', () => {
    expect(wide(3)).toEqual(['col-span-2', 'col-span-2', 'col-span-2']);
    expect(wide(6).every((c) => c === 'col-span-2')).toBe(true);
    expect(wide(1)).toEqual(['col-span-6']);
  });
  it('under 15 rem the cells are two to a row, an odd last one stretched', () => {
    expect(narrow(5)).toEqual(['@max-[15rem]:col-span-3', '@max-[15rem]:col-span-3', '@max-[15rem]:col-span-3', '@max-[15rem]:col-span-3', '@max-[15rem]:col-span-6']);
    expect(narrow(4).every((c) => c === '@max-[15rem]:col-span-3')).toBe(true);
  });
  it('from 30 rem every cell is one column of one row', () => {
    expect(cellSpan(0, 5).split(' ')[2]).toBe('@[30rem]:col-span-1');
  });
});
