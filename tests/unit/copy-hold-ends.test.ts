// tests/unit/copy-hold-ends.test.ts — the ends a hold's row offers (mw-5r3p30.1074, src/copy/holdEnds.ts): pure.
import { describe, expect, it } from 'vitest';
import { holdEnds } from '../../src/copy/holdEnds';

const units = (ends: ReturnType<typeof holdEnds>) => ends.map((e) => e.unit);

describe('holdEnds', () => {
  it('always offers Verse, then the paragraph, the pericope and the chapter that reach further', () => {
    const ends = holdEnds({ verse: 11, paragraphLast: 14, pericopeLast: 22, chapterLast: 28 });
    expect(units(ends)).toEqual(['verse', 'paragraph', 'pericope', 'chapter']);
    expect(ends.map((e) => e.last)).toEqual([11, 14, 22, 28]);
    expect(ends.map((e) => e.label)).toEqual(['Verse', 'Paragraph', 'Pericope', 'Chapter']);
  });

  it('offers no Paragraph in Verse layout', () => {
    expect(units(holdEnds({ verse: 11, pericopeLast: 22, chapterLast: 28 }))).toEqual(['verse', 'pericope', 'chapter']);
    expect(units(holdEnds({ verse: 11, paragraphLast: null, pericopeLast: 22, chapterLast: 28 }))).toEqual(['verse', 'pericope', 'chapter']);
  });

  it('leaves out an end whose range equals one before it', () => {
    // the verse ends its paragraph
    expect(units(holdEnds({ verse: 14, paragraphLast: 14, pericopeLast: 22, chapterLast: 28 }))).toEqual(['verse', 'pericope', 'chapter']);
    // the paragraph ends the pericope
    expect(units(holdEnds({ verse: 11, paragraphLast: 22, pericopeLast: 22, chapterLast: 28 }))).toEqual(['verse', 'paragraph', 'chapter']);
    // the pericope ends the chapter
    expect(units(holdEnds({ verse: 11, paragraphLast: 14, pericopeLast: 28, chapterLast: 28 }))).toEqual(['verse', 'paragraph', 'pericope']);
  });

  it('has no pericope for a verse under no heading', () => {
    expect(units(holdEnds({ verse: 2, paragraphLast: 4, pericopeLast: null, chapterLast: 28 }))).toEqual(['verse', 'paragraph', 'chapter']);
  });

  it('leaves only Verse at the chapter\'s last verse', () => {
    expect(units(holdEnds({ verse: 28, paragraphLast: 28, pericopeLast: 28, chapterLast: 28 }))).toEqual(['verse']);
    expect(units(holdEnds({ verse: 28, chapterLast: 28 }))).toEqual(['verse']);
  });
});
