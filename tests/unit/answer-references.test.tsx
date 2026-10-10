// A reference the tutor names in an answer is a link to a card (mw-5r3p30.133, features/reference-card.feature): 'Hebrews 7:2' and 'Ps. 110' alike, the Old
// Testament's card saying Lampas has no text for it; a link to a host the resources do not build is shown as text.
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Markdown } from '../../src/markdown/Markdown';
import { cardOf, referenceHash, referencesIn, writtenOf } from '../../src/markdown/verseLinks';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '';
  window.history.replaceState(null, '', '/');
});

describe('referencesIn', () => {
  it('finds a reference by name, short name, range or chapter alone, and gives its card', () => {
    expect(referencesIn('Hebrews 7:2 says this.')).toEqual([
      { start: 0, end: 11, written: 'Hebrews 7:2', card: { heading: 'Hebrews 7:2', held: { book: 'heb', chapter: 7, first: 2, last: 2 } } },
    ]);
    expect(referencesIn('See Heb 7:2.')[0]).toMatchObject({ start: 4, end: 11, written: 'Heb 7:2' });
    expect(referencesIn('Romans 8:28-30 goes on')[0]).toMatchObject({ start: 0, end: 14, card: { heading: 'Romans 8:28-30', held: { book: 'rom', chapter: 8, first: 28, last: 30 } } });
    expect(referencesIn('and 1 John 1:9 too')[0]).toMatchObject({ start: 4, end: 14, card: { held: { book: '1jn', chapter: 1, first: 9, last: 9 } } });
    expect(referencesIn('Heb 7:1-3')[0].card).toEqual({ heading: 'Hebrews 7:1-3', held: { book: 'heb', chapter: 7, first: 1, last: 3 } });
    // a whole chapter is headed by the verse it shows
    expect(referencesIn('in Romans 8 Paul')[0]).toMatchObject({ written: 'Romans 8', card: { heading: 'Romans 8:1', held: { book: 'rom', chapter: 8, first: 1, last: 1 } } });
  });

  it('gives the Old Testament a card with no passage', () => {
    expect(referencesIn('Ps. 110')[0]).toMatchObject({ written: 'Ps. 110', card: { heading: 'Psalm 110', held: null } });
    expect(referencesIn('Isaiah 53:5-7')[0].card).toEqual({ heading: 'Isaiah 53:5-7', held: null });
    expect(referencesIn('1 Samuel 2:1')[0].card).toEqual({ heading: '1 Samuel 2:1', held: null });
  });

  it('keeps a range inside its chapter and a backward range at its first verse', () => {
    expect(referencesIn('Heb 7:1-99')[0].card.held).toMatchObject({ first: 1, last: 28 });
    expect(referencesIn('Heb 7:5-2')[0].card).toEqual({ heading: 'Hebrews 7:5', held: { book: 'heb', chapter: 7, first: 5, last: 5 } });
  });

  it('leaves alone a verse that does not exist and text that is no reference', () => {
    expect(referencesIn('a 7:2 ratio')).toEqual([]);
    expect(referencesIn('Romans 99:1')).toEqual([]);
    expect(referencesIn('Romans 99')).toEqual([]);
    expect(referencesIn('Romans 8:99')).toEqual([]);
    expect(referencesIn('the ratio 7:2')).toEqual([]);
    expect(referencesIn('Step 3 and Chapter 8')).toEqual([]);
  });

  it('carries the reference in the address and back', () => {
    expect(writtenOf(referenceHash('Heb 7:1-3'))).toBe('Heb 7:1-3');
    expect(writtenOf('#/?b=heb&c=7&v=2')).toBeNull();
    expect(cardOf('Ps. 110')?.heading).toBe('Psalm 110');
    expect(cardOf('Nonsense 4')).toBeNull();
  });
});

describe('Markdown with references in it', () => {
  it('turns each reference into a link in the text around it', () => {
    const { container } = render(<Markdown text={'Hebrews 7:2 says it; compare Heb 7:2, Ps. 110 and (Romans 8:28-30).'} />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['Hebrews 7:2', 'Heb 7:2', 'Ps. 110', 'Romans 8:28-30']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#/?ref=Hebrews%207%3A2', '#/?ref=Heb%207%3A2', '#/?ref=Ps.%20110', '#/?ref=Romans%208%3A28-30']);
    expect(links.every((a) => a.getAttribute('target') === null)).toBe(true);
    expect(container.textContent).toBe('Hebrews 7:2 says it; compare Heb 7:2, Ps. 110 and (Romans 8:28-30).');
  });

  it('does not nest a link in a link or touch code', () => {
    render(<Markdown text={'[Hebrews 7:2](https://www.stepbible.org/?q=version=KJV|reference=Heb.7.2) and `Heb 7:2`'} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('opens a card on a tap, not the verse, and tells its sheet to leave only when Open is tapped', async () => {
    const onOpen = vi.fn();
    render(<Markdown text="Hebrews 7:2 says it." onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('link', { name: 'Hebrews 7:2' }));
    expect(await screen.findByRole('dialog', { name: 'Hebrews 7:2' })).toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
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
