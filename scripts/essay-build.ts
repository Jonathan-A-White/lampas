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

export async function run(source: string, outFile: string, log: (line: string) => void): Promise<Essay> {
  const html = /^https?:/.test(source) ? await (await fetch(source)).text() : readFileSync(source, 'latin1');
  const { blocks, notes } = convert(html);
  const essay: Essay = { title: 'The Case for Byzantine Priority', author: 'Maurice A. Robinson', blocks, notes };
  writeFileSync(outFile, JSON.stringify(essay) + '\n');
  log(`${blocks.length} blocks, ${Object.keys(notes).length} footnotes -> ${outFile}`);
  return essay;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run(process.argv[2] ?? ESSAY_URL, 'src/essay/robinson.json', console.log).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
