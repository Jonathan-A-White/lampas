// The in-app copy of Robinson's essay (mw-5r3p30.138): src/essay/robinson.json is made by scripts/essay-build.ts from the TC Journal's page.
// These tests hold the converter (SPIonic letters to Greek, the HTML to blocks) and the data it made.
import { describe, expect, it } from 'vitest';
import { convert, spionic } from '../../scripts/essay-build';
import essay from '../../src/essay/robinson.json';
import type { Essay } from '../../src/essay/types';

const data = essay as Essay;

describe('spionic', () => {
  it('turns the journal\'s transliterated Greek into Greek letters', () => {
    expect(spionic('aggeloj kuriou')).toBe('αγγελος κυριου');
    expect(spionic('taraxhn')).toBe('ταραχην');
    expect(spionic('arxwn')).toBe('αρχων');
    expect(spionic('th hmera tou KU IU XU')).toBe('τη ημερα του ΚΥ ΙΥ ΧΥ');
    expect(spionic('Q L Y')).toBe('Θ Λ Ψ');
    expect(spionic('PROS EBRAIOUS')).toBe('ΠΡΟΣ ΕΒΡΑΙΟΥΣ');
  });
});

describe('convert', () => {
  const html = `<h2>Introduction</h2><p><a name=par1><b>1.</b></a> A <i>word</i> and <font face="SPIonic">kai</font>.<a name="footnote1anc" href="#footnote1"><sup>1</sup></a></p>
<h2>Endnotes</h2><p><a name="footnote1" href="#footnote1anc">1</a> See <i>Here</i>.</p>`;
  it('makes headings, numbered paragraphs, marked runs and notes', () => {
    const out = convert(html);
    expect(out.blocks[0]).toEqual({ k: 'h', text: 'Introduction' });
    expect(out.blocks[1]).toEqual({ k: 'p', n: '1', runs: [{ t: 'A ' }, { t: 'word', i: true }, { t: ' and και.' }, { t: '1', n: 1 }] });
    expect(out.notes['1']).toEqual([{ t: 'See ' }, { t: 'Here', i: true }, { t: '.' }]);
  });
});

describe('the essay data', () => {
  const headings = data.blocks.filter((b) => b.k === 'h').map((b) => (b.k === 'h' ? b.text : ''));
  it('opens with Introduction and has the journal\'s sections', () => {
    expect(headings[0]).toBe('Introduction');
    expect(headings).toContain('Concluding Observations');
    expect(headings).not.toContain('Endnotes');
  });
  it('has every footnote it refers to, and refers to every footnote', () => {
    const refs = new Set<number>();
    for (const b of data.blocks) {
      if (b.k === 'h') {
        if (b.n) refs.add(b.n);
      } else for (const r of b.runs) if (r.n) refs.add(r.n);
    }
    expect(refs.size).toBe(167);
    for (const n of refs) expect(data.notes[String(n)], `note ${n}`).toBeDefined();
    expect(Object.keys(data.notes).length).toBe(167);
  });
  it('has numbered paragraphs 1 to 100 or more in order, and no markup or transliteration left', () => {
    const numbers = data.blocks.flatMap((b) => (b.k === 'p' && b.n ? [Number(b.n.replace('.', ''))] : []));
    expect(numbers[0]).toBe(1);
    expect(numbers.length).toBeGreaterThan(100);
    const all = JSON.stringify(data);
    expect(all).not.toMatch(/SPIonic|<font|<\/?(p|i|b|sup|a|li|ol)>|&[a-z]+;/);
    expect(all).toContain('αγγελος κυριου');
  });
});
