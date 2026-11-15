// A verse of poetry drawn by the Reader's VerseText (mw-5r3p30.1164): its lines, where they are drawn, and where they are not.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { VerseText } from '../../src/reader/VerseText';
import type { WovenVerse } from '../../src/data/weave';
import type { Lookup } from '../../src/WordSheet';

afterEach(cleanup);
const psalm1 = JSON.parse(readFileSync('public/data/psa/1.json', 'utf8')) as Chapter;
const verse1 = psalm1.verses[0];
const none = (): void => undefined;

describe('VerseText with poetry', () => {
  it('draws each line as a block with its indent, from the chunk its mark names', () => {
    const { container } = render(<VerseText verse={verse1} view="english" woven={null} onLook={none} poetry />);
    const lines = [...container.querySelectorAll<HTMLElement>('[data-line]')];
    expect(lines.map((l) => l.getAttribute('data-indent'))).toEqual(['1', '2', '1', '2']);
    expect(lines.map((l) => l.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Blessed is the man',
      'who does not walk in the counsel of the wicked,',
      'or set foot on the path of sinners,',
      'or sit in the seat of mockers.',
    ]);
    expect(container.querySelectorAll('[data-stanza]')).toHaveLength(0);
  });

  it('puts the lead and the trail in the first and the last line', () => {
    const { container } = render(<VerseText verse={verse1} view="english" woven={null} onLook={none} poetry lead={<b data-lead>1</b>} trail={<i data-trail>play</i>} />);
    const lines = [...container.querySelectorAll('[data-line]')];
    expect(lines[0].querySelector('[data-lead]')).not.toBeNull();
    expect(lines[3].querySelector('[data-trail]')).not.toBeNull();
    expect(container.querySelectorAll('[data-lead]')).toHaveLength(1);
  });

  it('marks a stanza break inside a verse, not at its start nor straight after a lead-in', () => {
    const verse = { ...verse1, l: [[0, 1, 1], [2, 2], [3, 1, 1]] as Chapter['verses'][number]['l'] };
    const { container } = render(<VerseText verse={verse} view="english" woven={null} onLook={none} poetry />);
    const lines = [...container.querySelectorAll('[data-line]')];
    expect(lines.map((l) => l.hasAttribute('data-stanza'))).toEqual([false, false, true]);
  });

  it('draws a lead-in flush left ahead of the first line', () => {
    const { container } = render(<VerseText verse={{ ...verse1, l: [[2, 1, 1], [3, 2]] }} view="english" woven={null} onLook={none} poetry />);
    const lines = [...container.querySelectorAll('[data-line]')];
    expect(lines.map((l) => l.getAttribute('data-indent'))).toEqual(['0', '1', '2']);
    expect(lines.map((l) => l.hasAttribute('data-stanza'))).toEqual([false, false, false]);
  });

  it('is running text where it is not asked for lines, in Greek, in a weave and on a card', () => {
    const woven: WovenVerse = { words: [], order: verse1.e.map((_, i) => i) } as unknown as WovenVerse;
    for (const props of [{ poetry: false }, { view: 'greek' as const }, { woven }, { still: true }]) {
      const { container } = render(<VerseText verse={verse1} view="english" woven={null} onLook={none} poetry {...props} />);
      expect(container.querySelectorAll('[data-line]'), JSON.stringify(Object.keys(props))).toHaveLength(0);
      cleanup();
    }
  });

  it('keeps every English word a tap that opens its sheet', () => {
    const looks: Lookup[] = [];
    render(<VerseText verse={verse1} view="english" woven={null} onLook={(l) => looks.push(l)} poetry />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(looks).toHaveLength(1);
    expect(looks[0].fromEnglish).toBe(true);
  });
});
