// tests/unit/variant-sheet-words.test.ts — the readings on a variant's sheet are words he can tap, like the words in the brace (mw-9ji6ek0.22, src/reader/VariantSheet.tsx).
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { GreekWord, VariantUnit, Verse } from '../../src/data/chapter';
import { VariantSheet } from '../../src/reader/VariantSheet';
import { shownUnits } from '../../src/reader/variants';
import type { Lookup } from '../../src/WordSheet';

afterEach(cleanup);

const w = (t: string, l: string, s = 'G1'): GreekWord => ({ t, tr: '', s, l, p: 'X' });
const VERSE: Verse = {
  n: 1,
  g: [w('Καὶ', 'καί'), w('εἶπεν', 'λέγω'), w('ὁ', 'ὁ'), w('Ἰησοῦς', 'Ἰησοῦς')],
  e: [{ t: 'And', g: [0] }, { t: 'Jesus said', g: [1, 2, 3] }],
};
const UNIT: VariantUnit = {
  v: 1,
  w: [3],
  base: 'Ἰησοῦς',
  alts: [{ code: 'N', text: 'κύριος ἦν', g: [w('κύριος', 'κύριος'), { t: 'ἦν', tr: '', s: '', l: '', p: '' }] }],
  english: { source: 'lampas', base: 'Jesus', alts: ['the Lord was'] },
  changesEnglish: true,
  witness: 'na',
};

function draw() {
  const looks: Lookup[] = [];
  const shown = shownUnits([UNIT], { english: 'all', witnesses: 'ecm' })[0];
  const { container } = render(createElement(VariantSheet, { shown, verse: VERSE, reference: 'Mark 1:1', onClose: () => {}, onLook: (l: Lookup) => looks.push(l) }));
  return { looks, container };
}

describe('the words of a reading on the variant sheet', () => {
  it('a Greek word of the other reading opens its tagged card, an untagged one the form alone', () => {
    const { looks } = draw();
    const greek = screen.getAllByText('κύριος')[0];
    fireEvent.click(greek);
    expect(looks[0].words.map((x) => x.l)).toEqual(['κύριος']);
    expect(looks[0]).toMatchObject({ verse: 1, variant: 'in variant NA', fromEnglish: false });
    fireEvent.click(screen.getByText('ἦν'));
    expect(looks[1].words).toEqual([{ t: 'ἦν', tr: '', s: '', l: '', p: '' }]);
  });

  it('an English word of the other reading opens the Greek of that reading under the English tapped', () => {
    const { looks } = draw();
    fireEvent.click(screen.getByText('Lord'));
    expect(looks[0].words.map((x) => x.t)).toEqual(['κύριος', 'ἦν']);
    expect(looks[0]).toMatchObject({ english: 'the Lord was', fromEnglish: true, tapped: 'Lord' });
  });

  it('a word of the text’s own reading opens the verse’s word, with no variant line', () => {
    const { looks } = draw();
    fireEvent.click(screen.getAllByText('Ἰησοῦς')[0]);
    expect(looks[0].words).toEqual([VERSE.g[3]]);
    expect(looks[0].variant).toBeUndefined();
  });

  it('every word is 44 px tall and a button', () => {
    const { container } = draw();
    const words = [...container.ownerDocument.querySelectorAll<HTMLElement>('[data-sheet-word]')];
    expect(words.length).toBe(1 + 1 + 2 + 3);
    for (const x of words) {
      expect(x.getAttribute('role')).toBe('button');
      expect(x.className).toContain('py-[calc((var(--lp-tap)-1em)/2)]');
    }
  });
});

describe('a reading that leaves the unit out names what it leaves out (mw-9ji6ek0.30)', () => {
  const OUT: VariantUnit = {
    v: 1,
    w: [1],
    base: 'εἶπεν',
    alts: [{ code: 'N', text: '', g: [] }, { code: 'M', text: '', g: [] }],
    english: { source: 'lampas', base: 'over', alts: ['', ''] },
    changesEnglish: true,
    witness: 'na',
  };

  it('says which witnesses leave out which English and Greek, not the bare "left out"', () => {
    const shown = shownUnits([OUT], { english: 'all', witnesses: 'ecm' })[0];
    render(createElement(VariantSheet, { shown, verse: VERSE, reference: 'Mark 1:1', onClose: () => {}, onLook: () => {} }));
    const line = document.querySelector('[data-left-out]');
    expect(line?.textContent).toBe('NA and ECM leave out “over” (εἶπεν)');
  });

  it('with no English for the snippet names the Greek alone', () => {
    const shown = shownUnits([{ ...OUT, english: { ...OUT.english, base: '' } }], { english: 'all', witnesses: 'ecm' })[0];
    render(createElement(VariantSheet, { shown, reference: 'Mark 1:1', onClose: () => {} }));
    expect(document.querySelector('[data-left-out]')?.textContent).toBe('NA and ECM leave out εἶπεν');
  });
});

describe('an omission the MSB gives English for the critical text’s sentence (Acts 18:17, mw-9ji6ek0.36)', () => {
  const ACTS: VariantUnit = {
    v: 1,
    w: [1],
    base: 'οἱ Ἕλληνες',
    alts: [{ code: 'N', text: '', g: [] }],
    english: { source: 'msb', base: 'the Greeks', alts: [''], ctReads: 'they all' },
    changesEnglish: true,
    witness: 'na',
  };
  const open = (u: VariantUnit) => {
    const shown = shownUnits([u], { english: 'all', witnesses: 'ecm' })[0];
    render(createElement(VariantSheet, { shown, verse: VERSE, reference: 'Acts 18:17', onClose: () => {}, onLook: () => {} }));
  };

  it('says what NA leaves out, then, as the MSB’s, how the MSB reads the NA text', () => {
    open(ACTS);
    expect(document.querySelector('[data-left-out]')?.textContent).toBe('NA leaves out “the Greeks” (οἱ Ἕλληνες)');
    const msb = document.querySelector('[data-msb-reads]');
    expect(msb?.textContent).toBe('The MSB reads the NA text: “they all”');
    // under its MSB caption, never as the model's or as ours
    expect(msb?.nextElementSibling?.textContent).toBe('MSB');
    expect(document.body.textContent).not.toContain('Lampas (AI)');
  });

  it('has no such line when the MSB gives nothing', () => {
    open({ ...ACTS, english: { source: 'msb', base: 'the Greeks', alts: [''] } });
    expect(document.querySelector('[data-msb-reads]')).toBeNull();
  });
});
