// scripts/essay-build.ts — npm run essay:build (mw-5r3p30.138)
// Makes src/essay/robinson.json, the in-app copy of Maurice A. Robinson's "The Case for Byzantine Priority", from the page the TC Journal
// published it on (2001; the essay is also the appendix of the Robinson-Pierpont 2005 edition, whose release into the public domain names
// that appendix, ATTRIBUTION.md). The journal's page is an old HTML 3.2 page: Greek is typed in Latin letters under the font SPIonic, a few
// signs are pictures, and its footnotes are endnotes. This turns it into blocks of runs and footnotes (src/essay/types.ts), the Greek into
// Greek letters. Not part of the app build; it needs the network, or a saved copy of the page as its one argument.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Block, Essay, Run } from '../src/essay/types';

export const ESSAY_URL = 'http://rosetta.reltech.org/TC/vol06/Robinson2001.html';

// SPIonic: Latin letters stand for Greek ones (j is the final sigma, x is chi), capitals for capitals (the nomina sacra KU IU XU).
const SPIONIC: Record<string, string> = {
  a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η', q: 'θ', i: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'ν', x: 'χ', o: 'ο', p: 'π', r: 'ρ',
  s: 'σ', j: 'ς', t: 'τ', u: 'υ', f: 'φ', y: 'ψ', w: 'ω',
  A: 'Α', B: 'Β', G: 'Γ', D: 'Δ', E: 'Ε', Z: 'Ζ', H: 'Η', Q: 'Θ', I: 'Ι', K: 'Κ', L: 'Λ', M: 'Μ', N: 'Ν', X: 'Χ', O: 'Ο', P: 'Π', R: 'Ρ',
  S: 'Σ', T: 'Τ', U: 'Υ', F: 'Φ', Y: 'Ψ', W: 'Ω',
};

/** The journal's Greek, typed in Latin letters, as Greek letters; anything else (a space, a hyphen) stays. */
export function spionic(text: string): string {
  return [...text].map((c) => SPIONIC[c] ?? c).join('');
}

// The 2005 PDF's Greek font, Kadmos, is typed like SPIonic with a few letters elsewhere: y is theta, w the final sigma, v omega, c psi, j xi.
const KADMOS: Record<string, string> = {
  ...SPIONIC,
  y: 'θ', w: 'ς', v: 'ω', c: 'ψ', j: 'ξ', q: 'q',
  Y: 'Θ', V: 'Ω', C: 'Ψ', J: 'Ξ', W: 'W',
};

/** The 2005 appendix's Greek (font Kadmos), typed in Latin letters, as Greek letters. */
export function kadmos(text: string): string {
  return [...text].map((c) => KADMOS[c] ?? c).join('');
}

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', copy: '©', eacute: 'é', Eacute: 'É', ouml: 'ö', ccedil: 'ç', agrave: 'à',
};

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
    return NAMED[name] ?? whole;
  });
}

// the pictures in the page: aleph (Sinaiticus), the gothic M (the Majority text), the script l (a lectionary)
const PICTURES: Record<string, string> = { 'aleph.gif': 'ℵ', 'gothicM.gif': '𝔐', 'lect.gif': 'ℓ' };
const CHART_NOTE = 'Chart 1, the extant continuous-text manuscripts by century, is a picture on the original page.';

const sameMarks = (a: Run, b: Run) => a.i === b.i && a.b === b.b && a.u === b.u && a.sup === b.sup && a.n === b.n;

/** Runs joined where their marks agree, a space never doubled across a join, the ends trimmed. */
function tidy(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const run of runs) {
    let t = run.t;
    const last = out[out.length - 1];
    if (last && last.t.endsWith(' ') && t.startsWith(' ')) t = t.slice(1);
    if (t === '') continue;
    if (last && run.n === undefined && sameMarks(last, run) && last.n === undefined) last.t += t;
    else out.push({ ...run, t });
  }
  // a line break keeps no spaces around it, and two at most
  for (const run of out) run.t = run.t.replace(/ *(?:\n *)+/g, (m) => (m.split('\n').length > 2 ? '\n\n' : '\n'));
  while (out.length && out[0].t.trim() === '') out.shift();
  if (out.length) out[0].t = out[0].t.trimStart();
  while (out.length && out[out.length - 1].t.trim() === '') out.pop();
  if (out.length) out[out.length - 1].t = out[out.length - 1].t.trimEnd();
  return out;
}

const attr = (tag: string, name: string): string | undefined => new RegExp(`${name}\\s*=\\s*"?([^"\\s>]+)"?`, 'i').exec(tag)?.[1];

/** The journal's page as blocks of runs and footnotes. */
export function convert(html: string): Pick<Essay, 'blocks' | 'notes'> {
  const blocks: Block[] = [];
  const notes: Record<string, Run[]> = {};
  const start = html.search(/<body/i);
  const body = start < 0 ? html : html.slice(start);
  let runs: Run[] = [];
  let number: string | undefined;
  let quote = false;
  let depth = 0;
  let inNotes = false;
  let noteNumber: number | undefined;
  let heading: { n?: number } | null = null;
  const flags = { i: 0, b: 0, u: 0, sup: 0, greek: 0 };
  let paraNumberAnchor = false;
  let footRef: number | undefined;
  let noteAnchor = false;
  let inTitle = false;

  const flush = () => {
    const tidied = tidy(runs);
    runs = [];
    if (inNotes) {
      if (noteNumber !== undefined && tidied.length) notes[String(noteNumber)] = tidied;
      noteNumber = undefined;
    } else if (tidied.length) {
      const block: Block = { k: 'p', runs: tidied };
      if (number) block.n = number;
      if (quote) block.q = true;
      if (depth > 0) block.depth = depth;
      blocks.push(block);
    }
    number = undefined;
  };

  const push = (text: string) => {
    if (text === '') return;
    const run: Run = { t: text };
    if (flags.i) run.i = true;
    if (flags.b) run.b = true;
    if (flags.u) run.u = true;
    if (flags.sup) run.sup = true;
    runs.push(run);
  };

  const token = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  for (const m of body.matchAll(token)) {
    const [, closing, rawName, tag, text] = m;
    if (text !== undefined) {
      const plain = decode(text).replace(/\s+/g, ' ');
      if (footRef !== undefined || noteAnchor || inTitle) {
        // the number inside a footnote mark, and the title the header already has
      } else if (heading) {
        runs.push({ t: plain });
      } else if (paraNumberAnchor) {
        number = plain.trim().replace(/\.$/, '');
      } else {
        push(flags.greek ? spionic(plain) : plain);
      }
      continue;
    }
    const name = rawName.toLowerCase();
    const close = closing === '/';
    if (name === 'h2') {
      if (!close) {
        flush();
        heading = {};
        runs = [];
        continue;
      }
      const text = tidy(runs).map((r) => r.t).join('');
      const h = heading as { n?: number };
      heading = null;
      runs = [];
      if (text === 'Maurice A. Robinson') {
        // the author's name under the title is the header's, not the essay's
      } else if (text === 'Endnotes') {
        inNotes = true;
      } else {
        const block: Block = { k: 'h', text };
        if (h.n !== undefined) block.n = h.n;
        blocks.push(block);
      }
      continue;
    }
    if (name === 'h1') {
      inTitle = !close;
      continue;
    }
    if (name === 'p' || name === 'li') {
      flush();
      continue;
    }
    if (name === 'ol') {
      flush();
      depth = Math.max(0, depth + (close ? -1 : 1));
      continue;
    }
    if (name === 'blockquote') {
      flush();
      quote = !close;
      continue;
    }
    if (name === 'br') {
      if (!inNotes && !heading) runs.push({ t: '\n' });
      continue;
    }
    if (name === 'img') {
      const src = attr(tag, 'src') ?? '';
      const file = src.split('/').pop() ?? '';
      if (PICTURES[file]) push(PICTURES[file]);
      else if (file === 'Robinson2001.gif') {
        flush();
        blocks.push({ k: 'p', runs: [{ t: CHART_NOTE, i: true }] });
      }
      continue;
    }
    if (name === 'a') {
      if (close) {
        if (footRef !== undefined) {
          if (heading) (heading as { n?: number }).n = footRef;
          else runs.push({ t: String(footRef), n: footRef });
        }
        footRef = undefined;
        paraNumberAnchor = false;
        noteAnchor = false;
        continue;
      }
      const nm = attr(tag, 'name') ?? '';
      const ref = /^footnote(\d+)anc$/.exec(nm);
      const target = /^footnote(\d+)$/.exec(nm);
      if (ref) footRef = Number(ref[1]);
      else if (target) {
        noteNumber = Number(target[1]);
        noteAnchor = true;
      } else if (nm === 'par1') paraNumberAnchor = true;
      continue;
    }
    if (name === 'font') {
      if (!close && /SPIonic/i.test(tag)) flags.greek++;
      else if (close && flags.greek > 0) flags.greek--;
      continue;
    }
    if (name === 'i' || name === 'b' || name === 'u' || name === 'sup') {
      if (paraNumberAnchor || footRef !== undefined) continue;
      flags[name] = Math.max(0, flags[name] + (close ? -1 : 1));
    }
  }
  flush();
  return { blocks, notes };
}

// ---- the 2005 edition's appendix (mw-5r3p30.162) ----------------------------------------------------------------------------------------
// The release in the Robinson-Pierpont 2005 edition covers the appendix "especially prepared for this edition" (pp. 533-586), and the editors'
// site, byzantinetext.com, has that appendix as a PDF with a text layer. It is not the 2001 journal text: it was edited for the book (ATTRIBUTION.md
// says how). Its Greek is typed in Latin letters in the font Kadmos (the accents are in the printed glyphs, not in the text layer), a few signs
// (the papyrus P, aleph, the gothic M) are Type 3 pictures, and the footnotes are footnotes at the foot of each page.

/** One piece of text as pdf.js reports it: where it sits (PDF points, y up), how tall it is, in which font. */
export interface PdfItem {
  s: string;
  x: number;
  y: number;
  h: number;
  f: string;
  eol: boolean;
}

export const APPENDIX_URL = 'https://byzantinetext.com/wp-content/uploads/2016/11/editions-rp-11-appendix.pdf';

/**
 * The signs the PDF draws as pictures (font Type3) that do not stand before a number (before two digits or more it is the papyrus 𝔓: 𝔓46), by the edition's page and in
 * the order they come, put in by hand against the printed page. The glyph codes are no guide: five Type 3 fonts share them.
 */
const PICTURE_SIGNS: Record<number, string> = {
  536: 'ℵ',
  537: 'ℵℵ',
  547: 'ℵ𝔐ℵ𝔐',
  549: '𝔐',
  550: '𝔐ℵ',
  551: '𝔐',
  556: 'ℵ',
  559: 'ℵ',
  565: 'ℵℵ𝔐ℵ',
  566: 'ℵℵ',
  570: 'ℵ',
  571: 'ℵ',
};
const PAPYRUS = '𝔓';

interface Piece {
  t: string;
  i?: true;
  sup?: true;
  n?: number;
}

interface PdfLine {
  page: number;
  x: number;
  y: number;
  size: number;
  kind: 'body' | 'note';
  heading: boolean;
  /** a table row: its columns are one line */
  row: boolean;
  pieces: Piece[];
  /** a footnote's own number, when this line starts the note */
  starts?: number | '*';
}

const isJunk = (it: PdfItem) =>
  it.f.startsWith('Palatino') ||
  it.y >= 730 ||
  it.y <= 75 ||
  (it.f === 'KCGaramond-Roman' && it.h === 10 && (/^\d+$/.test(it.s.trim()) || /^Appendix: The Case for Byzantine Priority$/.test(it.s.trim())));

/** The pages of the appendix: from the page with its title to the one before the list of abbreviations. */
export function appendixPages(all: PdfItem[][]): PdfItem[][] {
  const text = (page: PdfItem[]) => page.map((it) => it.s).join('');
  const first = all.findIndex((page) => text(page).includes('The Case for Byzantine Priority') && text(page).includes('Introduction'));
  const end = all.findIndex((page) => text(page).includes('LIST OF ABBREVIATIONS'));
  if (first < 0) throw new Error("The appendix's first page was not found in the PDF.");
  return all.slice(first, end < 0 ? undefined : end);
}

/** The edition's own number for a page, from the number printed at its foot. */
function editionPage(page: PdfItem[], fallback: number): number {
  const n = page.find((it) => it.f === 'KCGaramond-Roman' && it.h === 10 && it.y < 100 && /^\d+$/.test(it.s.trim()));
  return n ? Number(n.s.trim()) : fallback;
}

/** How far a raised mark or a jump in a line must be, in points, to count: lines of the body stand 12.5 apart, footnotes 9, a raised number is up to 6 above its line. */
const NEW_LINE = 6.5;
const COLUMN_GAP = 18;
/** A string's width in points, roughly (capitals are wider): enough to tell a table's next column from a word space. */
const widthOf = (it: PdfItem) => it.s.length * it.h * (/^[^a-z]*$/.test(it.s) ? 0.75 : 0.55);

/**
 * The lines of one page. pdf.js's own line ends are not to be trusted (a table comes as one line, a picture can come before the mark of its line), so a
 * line is the run of items that stay within a few points of each other up and down. The junk (headers, page numbers) is gone, and each line is put with
 * the body or the footnotes: the body ends with the last line set at full size, and below that what is set smaller is footnote.
 */
function linesOf(page: PdfItem[], pageNo: number): PdfLine[] {
  const kept = page.filter((it) => !isJunk(it));
  const ahead = (it: PdfItem) => kept.slice(kept.indexOf(it) + 1, kept.indexOf(it) + 8).map((o) => o.s).join('').trimStart();
  // The lines come from the items set at a size of their own; a footnote's number or a raised siglum belongs to the line whose baseline is nearest.
  const small = (it: PdfItem) => it.s.trim() !== '' && it.f !== 'Type3' && (it.h < 6.5 || (it.h < 7.5 && /^\d{1,3}$/.test(it.s.trim())));
  const groups: PdfItem[][] = [];
  let prev: PdfItem | null = null;
  for (const it of kept) {
    if (it.s.trim() === '' || small(it)) continue;
    if (!prev || Math.abs(it.y - prev.y) > NEW_LINE) groups.push([]);
    groups[groups.length - 1].push(it);
    prev = it;
  }
  const baselines = groups.map((g) => g.reduce((a, b) => (b.s.length > a.s.length ? b : a)).y);
  const lineOfItem = new Map<PdfItem, number>();
  groups.forEach((g, k) => g.forEach((it) => lineOfItem.set(it, k)));
  const raw: PdfItem[][] = groups.map(() => []);
  let at = 0;
  for (const it of kept) {
    if (it.s.trim() !== '' && small(it)) {
      let best = 0;
      baselines.forEach((y, k) => {
        if (Math.abs(y - it.y) < Math.abs(baselines[best] - it.y)) best = k;
      });
      at = best;
    } else if (lineOfItem.has(it)) at = lineOfItem.get(it) ?? at;
    raw[at]?.push(it);
  }
  const signs = [...(PICTURE_SIGNS[pageNo] ?? '')];
  const lines: PdfLine[] = [];
  for (const items of raw) {
    const texts = items.filter((it) => it.s.trim() !== '' && it.f !== 'Type3');
    if (texts.length === 0 && !items.some((it) => it.f === 'Type3' && it.s.trim() !== '')) continue;
    const anchor = texts.reduce((a, b) => (b.s.length > a.s.length ? b : a), texts[0] ?? items[0]);
    const size = Math.max(...texts.map((it) => it.h), 0) || anchor.h;
    const heading = /BoldItalic/.test(anchor.f) && size >= 10;
    const first = items.find((it) => it.s.trim() !== '') ?? items[0];
    const line: PdfLine = { page: pageNo, x: first.x, y: anchor.y, size, kind: 'body', heading, row: false, pieces: [] };
    let last: PdfItem | null = null;
    for (const it of items) {
      if (last && it.s.trim() !== '' && it.x - (last.x + widthOf(last)) > COLUMN_GAP && line.pieces.some((p) => p.t.trim() !== '')) {
        // the next column of a table
        line.pieces.push({ t: '  ' });
        line.row = true;
      }
      if (it.s.trim() !== '') last = it;
      if (it.f === 'Type3') {
        if (it.s.trim() === '') line.pieces.push({ t: ' ' });
        else line.pieces.push({ t: /^\d{2,}/.test(ahead(it)) ? PAPYRUS : (signs.shift() ?? '?') });
        continue;
      }
      let t = it.s;
      if (it.f === 'Kadmos') t = kadmos(t);
      else if (it.f.startsWith('Script')) t = t.replace(/l/g, 'ℓ');
      if (t === '') continue;
      const piece: Piece = { t };
      if (/Italic/.test(it.f) && !heading) piece.i = true;
      const high = it.y > anchor.y + 1.5 && it.h < size * 0.85;
      if (high && /^\d+$/.test(t.trim()) && it.h < 6 && line.pieces.every((p) => p.t.trim() === '')) {
        line.starts = Number(t.trim());
        continue;
      }
      if (high) {
        const before = line.pieces.map((p) => p.t).join('');
        if (/^\d+$/.test(t.trim()) && it.h >= 7 && !/NA\s*$/.test(before)) piece.n = Number(t.trim());
        else piece.sup = true;
      }
      line.pieces.push(piece);
    }
    lines.push(line);
  }
  const lastBody = Math.min(...lines.filter((l) => l.size >= 10).map((l) => l.y), Infinity);
  const margin = Math.min(...lines.filter((l) => l.size >= 10).map((l) => l.x), Infinity);
  let before: PdfLine | undefined;
  for (const line of lines) {
    const caption = /^Chart \d+:/.test(line.pieces.map((p) => p.t).join(''));
    // a second line of a table's right-hand column is far from the margin and under a row
    const wraps = before !== undefined && before.kind === 'body' && (before.row || before.x - margin > 100) && line.x - margin > 100 && line.size < 10 && line.y >= lastBody - 40;
    line.kind = line.y >= lastBody - 0.5 || line.size >= 10 || caption || wraps ? 'body' : 'note';
    if (line.kind === 'note') {
      for (const piece of line.pieces) {
        if (piece.n !== undefined) {
          delete piece.n;
          piece.sup = true;
        }
      }
      const lead = line.pieces[0];
      if (lead && /^\* /.test(lead.t)) {
        line.starts = '*';
        lead.t = lead.t.slice(2);
      }
    }
    before = line;
  }
  return lines;
}

const asRun = (p: Piece): Run => {
  const run: Run = { t: p.t };
  if (p.i) run.i = true;
  if (p.sup) run.sup = true;
  if (p.n !== undefined) run.n = p.n;
  return run;
};

/** The words of the text that are hyphenated within a line: a line that ends in a hyphen keeps it only when the word is spelt so elsewhere. */
function hyphenatedWords(lines: PdfLine[]): Set<string> {
  // compounds the edition splits at the end of a line and prints nowhere else in one line
  const words = new Set<string>(['religiously-motivated']);
  for (const line of lines) {
    const text = line.pieces.map((p) => p.t).join('');
    for (const w of text.match(/[A-Za-z]+(?:-[A-Za-z]+)+/g) ?? []) words.add(w.toLowerCase());
  }
  return words;
}

/** Adds a line's runs to the text so far: a split word is put back together (its hyphen dropped unless the whole word is hyphenated elsewhere). */
function joinLine(into: Run[], next: Run[], hyphenated: ReadonlySet<string>): void {
  while (into.length && into[into.length - 1].n === undefined && into[into.length - 1].t.trim() === '') into.pop();
  while (next.length && next[0].n === undefined && next[0].t.trim() === '') next = next.slice(1);
  if (next.length && next[0].n === undefined) next = [{ ...next[0], t: next[0].t.trimStart() }, ...next.slice(1)];
  const last = into[into.length - 1];
  const lead = next[0];
  if (last && lead && last.n === undefined && /[A-Za-z]-$/.test(last.t.trimEnd()) && /^[A-Za-z]/.test(lead.t)) {
    const before = /([A-Za-z]+)-$/.exec(last.t.trimEnd())?.[1] ?? '';
    const after = /^([A-Za-z]+)/.exec(lead.t)?.[1] ?? '';
    // a split word loses its hyphen unless the whole word is hyphenated elsewhere; a hyphen before a capital is the word's own
    if (/^[a-z]/.test(lead.t) && !hyphenated.has(`${before}-${after}`.toLowerCase())) last.t = last.t.trimEnd().slice(0, -1);
    into.push(...next);
    return;
  }
  if (last) into.push({ t: ' ' });
  into.push(...next);
}

/**
 * A footnote's mark is a raised number in the line; a raised number beside a siglum (f1, K1, 𝔓61vid, ℵ2) looks the same. The marks run 1, 2, 3 ...
 * in the order of the text, so a raised number that is not the next one is part of its siglum. Spaces the PDF leaves before a comma or a closing
 * bracket (after a picture) are taken out. A mark left without its note, or a note without its mark, stops the build.
 */
function checkMarks(blocks: Block[], notes: Record<string, Run[]>): void {
  let expected = 1;
  const seen = new Set<number>();
  const settle = (runs: Run[]): Run[] => {
    for (const run of runs) {
      if (run.n === undefined) continue;
      if (run.n === expected) {
        seen.add(expected);
        expected++;
      } else {
        delete run.n;
        run.sup = true;
      }
    }
    return runs;
  };
  const tight = (runs: Run[]): Run[] => {
    for (let k = 0; k < runs.length; k++) {
      const run = runs[k];
      if (run.n !== undefined) continue;
      run.t = run.t.replace(/\s+([,;:)\]])/g, '$1').replace(/([([“])\s+/g, '$1').replace(/(ℵ|𝔐|𝔓)\s+([*,])/gu, '$1$2').replace(/(ℵ|𝔐|𝔓)(?=\p{L})/gu, '$1 ');
      const next = runs[k + 1];
      if (next && next.n === undefined && /^[,;:)\]]/.test(next.t)) run.t = run.t.trimEnd();
      if (next && next.n === undefined && /[([“]$/.test(run.t)) next.t = next.t.trimStart();
      if (next && next.sup && next.t.trim() !== '' && /\S\s+$/.test(run.t)) run.t = run.t.trimEnd();
      if (next && next.n === undefined && /(ℵ|𝔐|𝔓)\s+$/u.test(run.t) && /^[*,]/.test(next.t)) run.t = run.t.trimEnd();
    }
    for (const run of runs) if (run.sup && run.t.trim() === '') delete run.sup;
    return tidy(runs.filter((r) => r.t !== '' || r.n !== undefined));
  };
  for (const block of blocks) {
    if (block.k === 'h') {
      if (block.n !== undefined) {
        if (block.n === expected) {
          seen.add(expected);
          expected++;
        } else delete block.n;
      }
    } else block.runs = tight(settle(block.runs));
  }
  for (const key of Object.keys(notes)) notes[key] = tight(notes[key]);
  const keys = Object.keys(notes).map(Number).sort((a, b) => a - b);
  const missing = keys.filter((n) => !seen.has(n));
  const orphan = [...seen].filter((n) => notes[String(n)] === undefined);
  if (missing.length || orphan.length) throw new Error(`Footnote marks and notes disagree: notes without a mark ${missing.join(',')}; marks without a note ${orphan.join(',')}.`);
}

/** Lines of the body stand 12.5 points apart; a paragraph or a quotation has about 20 above it. */
const SPACING = 16;

const NOTE_CHART = 'Chart 1, the extant continuous-text manuscripts by century, is a picture in the edition (p. 562).';

/** The appendix as blocks of runs and footnotes, from the PDF's pages as pdf.js read them (appendixPages gives the right ones). */
export function convertAppendix(pages: PdfItem[][]): Pick<Essay, 'blocks' | 'notes'> {
  const lines = pages.flatMap((page, k) => linesOf(page, editionPage(page, 533 + k)));
  const hyphenated = hyphenatedWords(lines);
  const blocks: Block[] = [];
  const notes: Record<string, Run[]> = {};
  let para = null as { runs: Run[]; q?: true; table?: true } | null;
  let heading: { runs: Run[]; n?: number } | null = null;
  let note: { key: string; runs: Run[] } | null = null;
  let intro = null as Run[] | null;

  const endPara = () => {
    if (para) {
      const runs = tidy(para.runs);
      if (runs.length) {
        const block: Block = { k: 'p', runs };
        if (para.q) block.q = true;
        blocks.push(block);
      }
    }
    para = null;
  };
  const endHeading = () => {
    if (heading) {
      const text = tidy(heading.runs).map((r) => r.t).join('');
      const block: Block = { k: 'h', text };
      if (heading.n !== undefined) block.n = heading.n;
      blocks.push(block);
    }
    heading = null;
  };
  const endNote = () => {
    if (note) {
      const runs = tidy(note.runs);
      if (note.key === '*') intro = runs.map((r) => ({ ...r, i: true as const }));
      else notes[note.key] = runs;
    }
    note = null;
  };

  const byPage = new Map<number, PdfLine[]>();
  for (const line of lines) byPage.set(line.page, [...(byPage.get(line.page) ?? []), line]);

  // The body, page after page, as lines with how far each is indented (0 = the left margin, 1 = a paragraph's first line or a quotation, 2 = deeper),
  // the table rows (the apparatus after 1Cor 5:5: two columns on one line, the right one may go on to a second) already made into one line each.
  interface BodyLine {
    runs: Run[];
    level: number;
    heading: boolean;
    row: boolean;
    epigraph: boolean;
    refs: number | undefined;
    /** the space above it on its page (undefined for a page's first line): a paragraph or a quotation starts after more than a line's leading */
    gap: number | undefined;
  }
  const flow: BodyLine[] = [];
  const noteLines: PdfLine[] = [];
  for (const [page, all] of byPage) {
    noteLines.push(...all.filter((l) => l.kind === 'note'));
    const body = all.filter((l) => l.kind === 'body' && !(page === 533 && l.size >= 10 && !l.heading && l.y > 600));
    const base = Math.min(...body.filter((l) => l.size >= 10).map((l) => l.x));
    let before: PdfLine | undefined;
    for (const line of body) {
      const runs = line.pieces.map(asRun);
      const last = flow[flow.length - 1];
      if (line.row) {
        flow.push({ runs, level: 0, heading: false, row: true, epigraph: false, refs: undefined, gap: undefined });
      } else if (line.x - base > 100 && last?.row) {
        // the right column's second line
        last.runs.push({ t: ' ' }, ...runs);
      } else {
        const d = line.x - base;
        flow.push({ runs, level: d < 8 ? 0 : d < 38 ? 1 : 2, heading: line.heading, row: false, epigraph: page === 533 && line.size < 7.5, refs: undefined, gap: before ? before.y - line.y : undefined });
        if (line.pieces.some((p) => p.n !== undefined && line.heading)) flow[flow.length - 1].refs = line.pieces.find((p) => p.n !== undefined)?.n;
      }
      before = line;
    }
  }

  for (let k = 0; k < flow.length; k++) {
    const line = flow[k];
    if (line.epigraph) {
      para ??= { runs: [], q: true };
      const text = line.runs.map((r) => r.t).join('');
      if (/^– /.test(text)) para.runs.push({ t: '\n\n' + text.slice(2) });
      else joinLine(para.runs, line.runs, hyphenated);
      continue;
    }
    if (/^Chart \d+:/.test(line.runs.map((r) => r.t).join(''))) {
      // the chart is a picture in the PDF: its caption is kept as a heading and the picture is left on the original page, as with the journal's
      endPara();
      endHeading();
      heading = { runs: line.runs };
      endHeading();
      blocks.push({ k: 'p', runs: [{ t: NOTE_CHART, i: true }] });
      continue;
    }
    if (line.heading) {
      endPara();
      heading ??= { runs: [] };
      if (line.refs !== undefined) heading.n = line.refs;
      joinLine(heading.runs, line.runs.filter((r) => r.n === undefined), hyphenated);
      continue;
    }
    endHeading();
    if (line.row) {
      if (!para || !para.table) {
        endPara();
        para = { runs: [], table: true };
      } else para.runs.push({ t: '\n' });
      para.runs.push(...line.runs);
      continue;
    }
    if (para?.table) endPara();
    const next = flow[k + 1];
    const contiguous = (o: BodyLine | undefined) => o !== undefined && !o.row && !o.heading && o.gap !== undefined && o.gap <= SPACING;
    // the first line on a page goes on with what the page before left unfinished (a sentence not yet ended); a line after a finished one is a new block when it is indented
    const unfinished = para !== null && !/[.?!:;”"’)\]]$/.test(para.runs.filter((r) => r.n === undefined).map((r) => r.t).join('').trimEnd());
    const starts =
      line.gap === undefined
        ? para === null || (!unfinished && ((para.q === true && line.level === 0) || (para.q !== true && line.level >= 1) || (para.q === true && line.level >= 1 && !contiguous(next) && next?.level === 0)))
        : line.gap > SPACING;
    if (starts) {
      endPara();
      para = line.level >= 1 && contiguous(next) && next.level >= 1 ? { runs: [], q: true } : { runs: [] };
    }
    if (para === null) para = { runs: [] };
    joinLine(para.runs, line.runs, hyphenated);
  }
  for (const line of noteLines) {
    if (line.starts !== undefined) {
      endNote();
      note = { key: String(line.starts), runs: [] };
    }
    if (note) joinLine(note.runs, line.pieces.map(asRun), hyphenated);
  }
  endPara();
  endHeading();
  endNote();
  if (intro) blocks.unshift({ k: 'p', runs: intro });
  checkMarks(blocks, notes);
  return { blocks, notes };
}

interface PdfJsPage {
  getOperatorList(): Promise<unknown>;
  getTextContent(): Promise<{ items: { str?: string; transform: number[]; height: number; hasEOL: boolean; fontName: string }[] }>;
  commonObjs: { get(id: string): { name?: string } };
}
interface PdfJs {
  getDocument(options: object): { promise: Promise<{ numPages: number; getPage(n: number): Promise<PdfJsPage> }> };
}

/** The PDF's text as pdf.js reads it, page by page. pdf.js is not a dependency of the app: `npm install --no-save pdfjs-dist` before this. */
export async function readPdf(source: string): Promise<PdfItem[][]> {
  const bytes = /^https?:/.test(source) ? new Uint8Array(await (await fetch(source)).arrayBuffer()) : new Uint8Array(readFileSync(source));
  const specifier = 'pdfjs-dist/legacy/build/pdf.mjs';
  const pdfjs = (await import(/* @vite-ignore */ specifier).catch(() => {
    throw new Error('Reading the PDF needs pdf.js: run `npm install --no-save pdfjs-dist` first (it is not a dependency of the app).');
  })) as PdfJs;
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, verbosity: 0, fontExtraProperties: true }).promise;
  const pages: PdfItem[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    await page.getOperatorList(); // loads the page's fonts, whose names say which text is italic and which is Greek
    const content = await page.getTextContent();
    const fonts = new Map<string, string>();
    const items: PdfItem[] = [];
    for (const it of content.items) {
      if (it.str === undefined) continue;
      if (!fonts.has(it.fontName)) {
        let name = '';
        try {
          name = (page.commonObjs.get(it.fontName).name ?? '').replace(/^[A-Z]+\+/, '').replace(/@\d+$/, '');
        } catch {
          // a font pdf.js has not loaded keeps no name
        }
        fonts.set(it.fontName, name);
      }
      const round = (v: number) => Math.round(v * 10) / 10;
      items.push({ s: it.str, x: round(it.transform[4]), y: round(it.transform[5]), h: round(it.height), f: fonts.get(it.fontName) ?? '', eol: it.hasEOL });
    }
    pages.push(items);
  }
  return pages;
}

/**
 * Makes the in-app copy: from the appendix PDF of the 2005 edition (a path or an address; byzantinetext.com's by default), or, with the journal's
 * page as the source, from the 2001 article (kept for comparing the two).
 */
export async function run(source: string, outFile: string, log: (line: string) => void): Promise<Essay> {
  const journal = /\.html?$/i.test(source) || source === ESSAY_URL;
  let made: Pick<Essay, 'blocks' | 'notes'>;
  if (journal) made = convert(/^https?:/.test(source) ? await (await fetch(source)).text() : readFileSync(source, 'latin1'));
  else made = convertAppendix(appendixPages(await readPdf(source)));
  const essay: Essay = { title: 'The Case for Byzantine Priority', author: 'Maurice A. Robinson', blocks: made.blocks, notes: made.notes };
  writeFileSync(outFile, JSON.stringify(essay) + '\n');
  log(`${essay.blocks.length} blocks, ${Object.keys(essay.notes).length} footnotes -> ${outFile}`);
  return essay;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run(process.argv[2] ?? APPENDIX_URL, 'src/essay/robinson.json', console.log).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
