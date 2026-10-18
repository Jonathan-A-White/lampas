import { describe, expect, it } from 'vitest';
import { PARADIGMS, paradigmById } from '../../src/data/paradigms';
import { blocksOf, columnsThatFit } from '../../src/data/paradigms/layout';

const table = (id: string) => paradigmById(id)!;
const PHONE_REM = 358 / 16;

describe('paradigm table layout (mw-svw421.40)', () => {
  it('keeps whole headings together: Singular and Plural of a six-column table are two blocks of three', () => {
    expect(blocksOf(table('adjective-endings').columns, 3)).toEqual([[0, 1, 2], [3, 4, 5]]);
  });

  it('splits a heading that does not fit, and keeps every column once', () => {
    for (const t of PARADIGMS) {
      for (let per = 1; per <= t.columns.length; per++) {
        const blocks = blocksOf(t.columns, per);
        expect(blocks.flat(), `${t.id} ${per}`).toEqual(t.columns.map((_, i) => i));
        for (const block of blocks) expect(block.length).toBeLessThanOrEqual(per);
      }
    }
  });

  it('gives a six-column table fewer columns per block than it has, at the phone size, and fewer still at Largest', () => {
    const six = table('adjective-endings');
    expect(columnsThatFit(six, PHONE_REM)).toBeLessThan(6);
    expect(columnsThatFit(six, 358 / 25.6)).toBeLessThanOrEqual(columnsThatFit(six, PHONE_REM));
    expect(columnsThatFit(six, 1)).toBe(1);
  });

  it('keeps a one-column table whole', () => {
    expect(columnsThatFit(table('oida'), PHONE_REM)).toBe(1);
    expect(blocksOf(table('oida').columns, 1)).toEqual([[0]]);
  });
});
