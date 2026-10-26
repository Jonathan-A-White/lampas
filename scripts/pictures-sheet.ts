// scripts/pictures-sheet.ts — the contact sheet of the link pictures (mw-5r3p30.785, docs/pictures.md 'Link pictures'): every
// picture of LINK_WORDS at 80 px in a grid, its Greek and English gloss under it, so the family can be compared at a glance.
// Writes docs/pictures/link-words.svg. Run by `npm run pictures:sheet`, never at runtime. Text is allowed here, never in a picture.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LINK_WORDS, pictureFile } from '../src/data/pictures';

export const SHEET_PATH = 'docs/pictures/link-words.svg';

/** The gloss under each picture on the sheet: short, and the sense the picture draws. */
export const LINK_GLOSSES: Readonly<Record<string, string>> = {
  'γάρ': 'for, since',
  'οὖν': 'therefore',
  'ὅτι': 'that, because',
  'δέ': 'and, but',
  'οὐδέ': 'and not, nor',
  'οὔτε': 'neither, nor',
  'ἀλλά': 'but (not this, that)',
  'μέν': 'on the one hand',
  'ὡς': 'as, like',
  'καθώς': 'just as',
  'οὕτως': 'thus, so',
  'ἤ': 'or; than',
  'εἴτε': 'whether … or',
  'ἐάν': 'if (maybe)',
  'ἄν': 'would, -ever',
  'ὅτε': 'when',
  'ὅταν': 'whenever',
  'ἕως': 'until',
};

const COLUMNS = 6;
const TILE = 80;
const CELL_W = 128;
const CELL_H = 136;
const MARGIN = 16;
const TOP = 48;

const escape = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A picture's drawing without its outer <svg> element, to nest at 80 px. */
function inner(file: string): string {
  const source = readFileSync(`public/pictures/${file}`, 'utf8').trim();
  return source.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

/** The sheet as SVG text: the same every run for the same pictures. */
export function linkSheet(): string {
  const rows = Math.ceil(LINK_WORDS.length / COLUMNS);
  const width = MARGIN * 2 + COLUMNS * CELL_W;
  const height = TOP + rows * CELL_H + MARGIN;
  const cells = LINK_WORDS.map((lemma, i) => {
    const file = pictureFile(lemma);
    if (!file) throw new Error(`${lemma} has no picture`);
    const gloss = LINK_GLOSSES[lemma];
    if (!gloss) throw new Error(`${lemma} has no gloss in LINK_GLOSSES`);
    const x = MARGIN + (i % COLUMNS) * CELL_W;
    const y = TOP + Math.floor(i / COLUMNS) * CELL_H;
    const mid = x + CELL_W / 2;
    return [
      `<svg x="${x + (CELL_W - TILE) / 2}" y="${y}" width="${TILE}" height="${TILE}" viewBox="0 0 96 96">${inner(file)}</svg>`,
      `<text x="${mid}" y="${y + TILE + 24}" class="greek">${escape(lemma)}</text>`,
      `<text x="${mid}" y="${y + TILE + 42}" class="gloss">${escape(gloss)}</text>`,
    ].join('\n');
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<style>text{text-anchor:middle;fill:#16203a}.greek{font:22px serif}.gloss{font:13px sans-serif;fill:#4a5568}.title{font:bold 16px sans-serif;text-anchor:start}</style>',
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
    `<text x="${MARGIN}" y="30" class="title">Link pictures: the first thought white, the second amber, the link blue (npm run pictures:sheet)</text>`,
    ...cells,
    '</svg>',
  ].join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  mkdirSync(dirname(SHEET_PATH), { recursive: true });
  writeFileSync(SHEET_PATH, linkSheet());
  console.log(`${SHEET_PATH}: ${LINK_WORDS.length} link pictures`);
}
