// tests/unit/septuagint-folded-label.test.tsx — a folded Septuagint row's number button is named for its range (mw-u2w5klk.330; Tester finding on mw-u2w5klk.307).
// The button of a row englishRows folded (Psalms 149:8-9) reads '8-9' on screen, so a screen reader or voice control user must hear the range, not 'Verse 8'.
import '@testing-library/react/dont-cleanup-after-each';
import { render, cleanup, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { Verse } from '../../src/data/chapter';
import { ParagraphView, VerseLine } from '../../src/reader/ChapterText';

afterAll(async () => {
  cleanup();
  db.close();
});
afterEach(cleanup);

const row = (n: number, extra: Partial<Verse> = {}): Verse => ({ n, g: [], e: [], ...extra }) as Verse;
const folded = row(8, { to: 9, through: { n: 9 } });
const none = () => undefined;

describe('the number button of a Septuagint row', () => {
  it("is named 'Verses 8-9' for a folded row, and still reads 8-9", () => {
    render(createElement(VerseLine, { verse: folded, view: 'english', septuagint: 149, woven: null, selected: false, reading: false, onSelect: none, onPlay: none, onLook: none }));
    const button = screen.getByRole('button', { name: 'Verses 8-9' });
    expect(button.textContent).toContain('8-9');
    expect(screen.queryByRole('button', { name: 'Verse 8' })).toBeNull();
  });

  it("keeps 'Verse 7' for an unfolded row", () => {
    render(createElement(VerseLine, { verse: row(7), view: 'english', septuagint: 149, woven: null, selected: false, reading: false, onSelect: none, onPlay: none, onLook: none }));
    expect(screen.getByRole('button', { name: 'Verse 7' })).toBeTruthy();
  });

  it("is named for the range in the paragraph layout too", () => {
    render(createElement(ParagraphView, { verses: [row(7), folded], view: 'english', septuagint: 149, woven: [null, null], selected: null, reading: null, onSelect: none, onPlay: none, onLook: none }));
    expect(screen.getByRole('button', { name: 'Verses 8-9' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verse 7' })).toBeTruthy();
  });
});
