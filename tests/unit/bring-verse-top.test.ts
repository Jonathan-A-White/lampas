// topOf (src/reader/useBringVerse.ts): what a verse is brought to the top as. A link brings the section heading directly above the verse (mw-5r3p30.1025); Go to the verse itself.
import { describe, expect, it } from 'vitest';
import { topOf } from '../../src/reader/useBringVerse';

function box(html: string): HTMLElement {
  const el = document.createElement('main');
  el.innerHTML = html;
  return el;
}

describe('topOf', () => {
  it('is the verse itself without the heading flag', () => {
    const el = box('<h2 data-heading>The Father and the Son</h2><p data-verse="16">a</p>');
    expect(topOf(el, 16, false)?.getAttribute('data-verse')).toBe('16');
  });

  it('is the heading directly above a verse that begins its block, in a verse per line', () => {
    const el = box('<p data-verse="15">a</p><h2 data-heading>The Father and the Son</h2><p data-verse="16">b</p><p data-verse="17">c</p>');
    expect(topOf(el, 16, true)?.hasAttribute('data-heading')).toBe(true);
    expect(topOf(el, 17, true)?.getAttribute('data-verse')).toBe('17');
  });

  it('is the heading above a paragraph when the verse is its first, and the verse when it is not', () => {
    const el = box('<h2 data-heading>H</h2><p data-paragraph><span data-verse="16">a</span><span data-verse="17">b</span></p>');
    expect(topOf(el, 16, true)?.hasAttribute('data-heading')).toBe(true);
    expect(topOf(el, 17, true)?.getAttribute('data-verse')).toBe('17');
  });

  it('is the verse where no heading is above it, and null for a verse that is not there', () => {
    const el = box('<p data-verse="1">a</p>');
    expect(topOf(el, 1, true)?.getAttribute('data-verse')).toBe('1');
    expect(topOf(el, 9, true)).toBeNull();
  });
});
