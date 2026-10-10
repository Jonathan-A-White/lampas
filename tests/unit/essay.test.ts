// The in-app copy of Robinson's essay (mw-5r3p30.138, .162): src/essay/robinson.json is made by scripts/essay-build.ts from the appendix of the 2005
// Robinson-Pierpont edition (the text its release into the public domain covers), not from the 2001 journal article, whose wording differs.
// These tests hold the converters (the journal's SPIonic letters to Greek and its HTML to blocks; the 2005 PDF's Kadmos letters and lines to blocks)
// and the data they made.
import { describe, expect, it } from 'vitest';
import { appendixPages, convert, convertAppendix, kadmos, spionic, type PdfItem } from '../../scripts/essay-build';
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

describe('kadmos', () => {
  it("turns the 2005 PDF's Greek font into Greek letters (y is theta, w the final sigma, v omega)", () => {
    expect(kadmos('eiw thn basileian')).toBe('εις την βασιλειαν');
    expect(kadmos('euyuw')).toBe('ευθυς');
    expect(kadmos('hmvn')).toBe('ημων');
    expect(kadmos('D Y P C V')).toBe('Δ Θ Π Ψ Ω');
  });
});

const item = (s: string, x: number, y: number, h: number, f = 'KCGaramond-Roman'): PdfItem => ({ s, x, y, h, f, eol: false });

describe('convertAppendix', () => {
  // a page as pdf.js gives it: the title, a heading, a paragraph that breaks a word at the line end and cites a footnote, a footnote with its number
  const page: PdfItem[] = [
    item('Appendix:', 292, 673, 10.5),
    item('The Case for Byzantine Priority', 233, 658, 12, 'KCGaramond-Bold'),
    item('Introduction', 162, 582, 10.5, 'KCGaramond-BoldItalic'),
    item('From the beginning of the modern era the Byzan-', 187, 563, 10.5),
    item('tine Textform was called', 162, 550, 10.5),
    item(' ', 260, 550, 0),
    item('late', 263, 550, 10.5, 'KCGaramond-Italic'),
    item(' ', 280, 550, 0),
    item('kai', 283, 550, 10.5, 'Kadmos'),
    item('.', 300, 550, 10.5),
    item('1', 304, 554, 7.4),
    item('A second paragraph.', 187, 530, 10.5),
    item('1', 172, 266, 5.6),
    item(' ', 175, 266, 0),
    item('See Hort, Introduction.', 177, 263, 8),
    item('533', 290, 88, 10),
  ];
  const out = convertAppendix(appendixPages([page]));
  it('makes the heading, the paragraphs and the note', () => {
    expect(out.blocks[0]).toEqual({ k: 'h', text: 'Introduction' });
    expect(out.blocks).toHaveLength(3);
    expect(out.blocks[2]).toEqual({ k: 'p', runs: [{ t: 'A second paragraph.' }] });
    expect(out.notes['1']).toEqual([{ t: 'See Hort, Introduction.' }]);
  });
  it('puts a word split at the end of a line back together, keeps italics, sets the Greek in Greek letters and the mark as a footnote mark', () => {
    const para = out.blocks[1];
    if (para.k !== 'p') throw new Error('a paragraph');
    expect(para.runs).toEqual([
      { t: 'From the beginning of the modern era the Byzantine Textform was called ' },
      { t: 'late', i: true },
      { t: ' και.' },
      { t: '1', n: 1 },
    ]);
  });
  it('stops when a footnote has no mark in the text', () => {
    const lonely = [...page, item('2', 172, 254, 5.6), item('Nobody cites this.', 177, 251, 8)];
    expect(() => convertAppendix(appendixPages([lonely]))).toThrow(/Footnote marks and notes disagree/);
  });
  it('reads a raised number beside a siglum as part of it, not as a footnote mark', () => {
    const sigla = page.map((it) => it);
    sigla.splice(11, 0, item(' ', 308, 550, 0), item('f', 312, 550, 10.5), item('1', 317, 554, 7.4));
    const para = convertAppendix(appendixPages([sigla])).blocks[1];
    if (para.k !== 'p') throw new Error('a paragraph');
    expect(para.runs.filter((r) => r.n !== undefined).map((r) => r.n)).toEqual([1]);
    expect(para.runs.some((r) => r.sup && r.t === '1')).toBe(true);
  });
});

describe('the essay data', () => {
  const textOf = (b: Essay['blocks'][number]) => (b.k === 'h' ? b.text : b.runs.map((r) => r.t).join(''));
  const paragraphs = data.blocks.filter((b) => b.k === 'p');
  const headings = data.blocks.filter((b) => b.k === 'h').map(textOf);
  const afterIntroduction = data.blocks.slice(data.blocks.findIndex((b) => b.k === 'h' && b.text === 'Introduction') + 1).filter((b) => b.k === 'p');
  it("is the appendix of the 2005 edition: its first and last paragraphs are the edition's, word for word", () => {
    // pp. 533 and 586 of the edition (byzantinetext.com's appendix PDF, ATTRIBUTION.md)
    expect(textOf(afterIntroduction[0]).startsWith('From the beginning of the modern critical era in the nineteenth century the Byzantine Textform has had a questionable reputation.')).toBe(true);
    expect(textOf(afterIntroduction[0])).toContain('the late fourth and early fifth century, as reflected in MSS A/02 and W/032.');
    const last = textOf(paragraphs[paragraphs.length - 1]);
    expect(last).toContain('Despite modern eclectic expressions regarding what NT textual criticism “really” needs, current text-critical thought steadily moves away');
    const lastRuns = (paragraphs[paragraphs.length - 1] as { runs: { t: string; n?: number }[] }).runs;
    expect(lastRuns[lastRuns.length - 1]).toEqual({ t: '168', n: 168 });
    expect(lastRuns[lastRuns.length - 2].t.endsWith('the orations and declamations which continue to be uttered against it.')).toBe(true);
  });
  it('carries the 2005 wording where it differs from the 2001 journal article', () => {
    const all = paragraphs.map(textOf).join('\n');
    expect(all).toContain('predominated among the Greek-speaking world'); // 2001: "in the Greek-speaking world"
    expect(all).toContain('can more easily account for the rise and dominance'); // 2001: "explain"
    expect(all).toContain('Transmissional criteria serves as a check'); // 2001: "serve"
  });
  it("opens with the edition's note on where the essay was first presented, then the epigraph, then Introduction", () => {
    expect(textOf(data.blocks[0]).startsWith('This essay was presented as part of the “Symposium on New Testament Studies')).toBe(true);
    expect(textOf(data.blocks[1])).toContain('There has been no change in people’s opinions of the Byzantine text.');
    expect(headings[0]).toBe('Introduction');
  });
  it("has the edition's sections and no endnotes section", () => {
    expect(headings).toEqual([
      'Introduction',
      'A Problem of Modern Eclecticism: Sequential Variant Units and the Resultant “Original” Text',
      'The essence of a Byzantine-priority method',
      'Principles to be Applied toward Restoration of the Text',
      'Principles of Internal Evidence',
      'Principles of External Evidence',
      'Chart 1: The Extant Continuous-Text MSS in Centuries II-XVI',
      'Selected Objections to the Byzantine-Priority Hypothesis',
      'Inaccuracies and misleading claims',
      'Concluding Observations',
    ]);
  });
  it('has every footnote it refers to, and refers to every footnote, in order', () => {
    const refs: number[] = [];
    for (const b of data.blocks) {
      if (b.k === 'h') {
        if (b.n) refs.push(b.n);
      } else for (const r of b.runs) if (r.n) refs.push(r.n);
    }
    expect(refs).toEqual(Array.from({ length: 168 }, (_, i) => i + 1));
    for (const n of refs) expect(data.notes[String(n)], `note ${n}`).toBeDefined();
    expect(Object.keys(data.notes).length).toBe(168);
  });
  it("keeps the manuscripts' signs (the papyrus, aleph, the Majority text) and sets the Greek in Greek letters, with no markup or transliteration left", () => {
    const all = JSON.stringify(data);
    expect(all).not.toMatch(/SPIonic|Kadmos|<font|<\/?(p|i|b|sup|a|li|ol)>|&[a-z]+;/);
    expect(all).toContain('αγγελος κυριου');
    expect(all).toContain('𝔓');
    expect(all).toContain('ℵ');
    expect(all).toContain('𝔐');
    expect(all).not.toContain('?  '); // an unplaced picture would be a question mark
  });
});
