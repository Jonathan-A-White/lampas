// A verse the tutor names in an answer is a link (mw-5r3p30.123): 'Hebrews 7:2' opens that verse's Verse view, an Old Testament verse is left to its jumping-off
// link (the chips under the answer, mw-5r3p30.99), and a link to a host the resources do not build is shown as text.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Markdown } from '../../src/markdown/Markdown';
import { referencesIn } from '../../src/markdown/verseLinks';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '';
  window.history.replaceState(null, '', '/');
});

describe('referencesIn', () => {
  it('finds a New Testament verse by name, short name or range, and names the verse it opens', () => {
    expect(referencesIn('Hebrews 7:2 says this.')).toEqual([{ start: 0, end: 11, place: { book: 'heb', chapter: 7, verse: 2 } }]);
    expect(referencesIn('See Heb 7:2.')).toEqual([{ start: 4, end: 11, place: { book: 'heb', chapter: 7, verse: 2 } }]);
    expect(referencesIn('Romans 8:28-30 goes on')).toEqual([{ start: 0, end: 14, place: { book: 'rom', chapter: 8, verse: 28 } }]);
    expect(referencesIn('and 1 John 1:9 too')[0]).toMatchObject({ start: 4, end: 14, place: { book: '1jn', chapter: 1, verse: 9 } });
  });

  it('leaves alone an Old Testament verse, a verse that does not exist and text that is no reference', () => {
    expect(referencesIn('1 Samuel 2:1')).toEqual([]);
    expect(referencesIn('Isaiah 53:5')).toEqual([]);
    expect(referencesIn('a 7:2 ratio')).toEqual([]);
    expect(referencesIn('Romans 99:1')).toEqual([]);
    expect(referencesIn('Romans 8:99')).toEqual([]);
    expect(referencesIn('Romans 8')).toEqual([]);
    expect(referencesIn('the ratio 7:2')).toEqual([]);
  });
});

describe('Markdown with verses in it', () => {
  it('turns Hebrews 7:2, Heb 7:2 and Romans 8:28-30 into links to those verses, in the text around them', () => {
    const { container } = render(<Markdown text={'Hebrews 7:2 says it; compare Heb 7:2 and (Romans 8:28-30).'} />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['Hebrews 7:2', 'Heb 7:2', 'Romans 8:28-30']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#/?b=heb&c=7&v=2', '#/?b=heb&c=7&v=2', '#/?b=rom&c=8&v=28']);
    expect(links.every((a) => a.getAttribute('target') === null)).toBe(true);
    expect(container.textContent).toBe('Hebrews 7:2 says it; compare Heb 7:2 and (Romans 8:28-30).');
  });

  it('leaves an Old Testament reference and a non-reference as plain text', () => {
    const { container } = render(<Markdown text="1 Samuel 2:1 is Hannah's song, a 7:2 ratio is not a verse." />);
    expect(screen.queryAllByRole('link')).toEqual([]);
    expect(container.textContent).toBe("1 Samuel 2:1 is Hannah's song, a 7:2 ratio is not a verse.");
  });

  it('does not nest a link in a link or touch code', () => {
    render(<Markdown text={'[Hebrews 7:2](https://www.stepbible.org/?q=version=KJV|reference=Heb.7.2) and `Heb 7:2`'} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('opens the verse in a new Back step with the Verse view marked, and tells its sheet to leave first', async () => {
    const onOpen = vi.fn();
    render(<Markdown text="Hebrews 7:2 says it." onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('link', { name: 'Hebrews 7:2' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/?b=heb&c=7&v=2');
    expect(window.history.state).toEqual({ verseView: true });
  });
});

describe('links the tutor writes', () => {
  it('shows a raw link to a host no resource builds as text, not a link', () => {
    const { container } = render(<Markdown text="Go to [the site](https://evil.example/x) or https://evil.example/y now." />);
    expect(screen.queryAllByRole('link')).toEqual([]);
    expect(container.textContent).toContain('the site');
  });

  it('keeps a link to a host the resources build links on', () => {
    render(<Markdown text="[Strong's](https://www.stepbible.org/?q=strong=G3198) and [Logos](https://ref.ly/logosres/bdag)" />);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['https://www.stepbible.org/?q=strong=G3198', 'https://ref.ly/logosres/bdag']);
  });
});
