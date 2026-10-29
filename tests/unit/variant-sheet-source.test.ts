// tests/unit/variant-sheet-source.test.ts — every English line of the variant card names where it comes from (mw-9ji6ek0.29, src/reader/VariantSheet.tsx): 'MSB' for the Majority
// Standard Bible's words, 'BSB' for the Berean Standard Bible's (the Old Testament), 'Lampas (AI)' for English made by the tutor's model. 'The text reads' shows the English the verse itself
// has under the unit's words (Matthew 3:3 'through'); the unit's own word-for-word rendering ('by') shows only as a captioned line of its own.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GreekWord, VariantEnglishSource, VariantUnit, Verse } from '../../src/data/chapter';
import { VariantSheet } from '../../src/reader/VariantSheet';
import { shownUnits } from '../../src/reader/variants';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '';
});

const w = (t: string, l: string): GreekWord => ({ t, tr: '', s: 'G1', l, p: 'X' });
// Matthew 3:3 in little: the page says 'spoken of through the prophet', the unit's own English for ὑπὸ is the model's 'by'
const VERSE: Verse = {
  n: 3,
  g: [w('ῥηθεὶς', 'ῥέω'), w('ὑπὸ', 'ὑπό'), w('τοῦ', 'ὁ'), w('προφήτου', 'προφήτης')],
  e: [{ t: 'was spoken of', g: [0] }, { t: 'through', g: [1] }, { t: 'the', g: [2] }, { t: 'prophet', g: [3] }],
};
const unit = (source: VariantEnglishSource, base = 'by', alt = 'through'): VariantUnit => ({
  v: 3,
  w: [1],
  base: 'ὑπὸ',
  alts: [{ code: 'N', text: 'διὰ', g: [w('διὰ', 'διά')] }],
  english: { source, base, alts: [alt] },
  changesEnglish: true,
  witness: 'na',
});

function draw(u: VariantUnit, extra: { verse?: Verse; lang?: 'grc' | 'hbo' } = {}) {
  const shown = shownUnits([u], { english: 'all', witnesses: 'ecm' })[0];
  render(createElement(VariantSheet, { shown, verse: VERSE, reference: 'Matthew 3:3', onClose: () => {}, onLook: () => {}, ...extra }));
}
const lines = () => [...document.querySelectorAll('[data-variant-reading]')].map((s) => [...s.querySelectorAll('[data-reading-english]')].map((p) => p.textContent?.trim()));
const captions = () => [...document.querySelectorAll('[data-variant-reading]')].map((s) => [...s.querySelectorAll('[data-english-source]')].map((b) => b.textContent));

describe('the English lines of the variant card name their source', () => {
  it('Matthew 3:3: the text reads "through" (MSB), then the model’s "by" under its own caption; the other reading is the model’s "through"', () => {
    draw(unit('lampas'));
    expect(lines()).toEqual([['through', 'by'], ['through']]);
    expect(captions()).toEqual([['MSB', 'Lampas (AI)'], ['Lampas (AI)']]);
  });

  it('the model’s rendering never shows without a caption', () => {
    draw(unit('lampas', 'was spoken'));
    for (const p of document.querySelectorAll('[data-reading-english]')) expect(p.nextElementSibling?.hasAttribute('data-english-source'), p.textContent ?? '').toBe(true);
  });

  it('English from the MSB’s own footnote is MSB, and a verse that says the same words is not said twice', () => {
    draw(unit('msb', 'through', 'by'));
    expect(lines()).toEqual([['through'], ['by']]);
    expect(captions()).toEqual([['MSB'], ['MSB']]);
  });

  it('an Old Testament card says BSB', () => {
    draw(unit('msb', 'through', 'by'), { lang: 'hbo' });
    expect(captions()).toEqual([['BSB'], ['BSB']]);
  });

  it('a unit whose words share a chunk with others shows the unit’s own English, under its caption', () => {
    const shared: Verse = { ...VERSE, e: [{ t: 'was spoken of through', g: [0, 1] }, { t: 'the prophet', g: [2, 3] }] };
    draw(unit('lampas'), { verse: shared });
    expect(lines()).toEqual([['by'], ['through']]);
    expect(captions()).toEqual([['Lampas (AI)'], ['Lampas (AI)']]);
  });

  it('a card with no verse shows the unit’s English, captioned', () => {
    draw(unit('lampas'), { verse: undefined });
    expect(captions()).toEqual([['Lampas (AI)'], ['Lampas (AI)']]);
  });

  it('a tap on a caption says in one line what the source is, and links to the Preface; a second tap puts it away', () => {
    draw(unit('lampas'));
    const first = document.querySelector<HTMLElement>('[data-english-source]')!;
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-english-source-says]')).toBeNull();
    fireEvent.click(first);
    const says = document.querySelector('[data-english-source-says]')!;
    expect(says.textContent).toMatch(/Majority Standard Bible/);
    expect(first.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /Preface/ }));
    expect(window.location.hash).toBe('#/preface');
  });

  it('says what each of the three sources is', () => {
    draw(unit('lampas'));
    fireEvent.click(document.querySelectorAll('[data-english-source]')[1]);
    expect(document.querySelector('[data-english-source-says]')?.textContent).toMatch(/made for Lampas.*AI/i);
    cleanup();
    draw(unit('msb', 'through', 'by'), { lang: 'hbo' });
    fireEvent.click(document.querySelector('[data-english-source]')!);
    expect(document.querySelector('[data-english-source-says]')?.textContent).toMatch(/Berean Standard Bible/);
  });
});
