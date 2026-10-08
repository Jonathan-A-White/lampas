// src/data/importWords.ts — reads the text he pastes into Import. A line is 'lemma — gloss' (an em or en
// dash, a spaced hyphen or a tab between them), 'lemma, gloss', or a row of docs/example-words.md's table
// ('| # | lemma | Lvl | Lsn | gloss | pos | note |'). Each line becomes a word to add or a flagged line.
import { normaliseLemma } from './lemma';

export interface ImportWord {
  ok: true;
  line: string;
  headword: string;
  lemmas: string[];
  gloss: string;
  /** From a table row's Lsn column; 0 when the line did not say. */
  lesson: number;
}

export interface ImportProblem {
  ok: false;
  line: string;
  reason: string;
}

export type ImportLine = ImportWord | ImportProblem;

// Greek letters with their marks, spaces, and the apostrophes elision uses.
const GREEK_WORD = /^[\p{Script=Greek}\p{M}\s'’ʼ᾽᾿]+$/u;
const DASH = /\s[-–—]\s|\s?[–—]\s?|\t/;

function split(line: string): { lemma: string; gloss: string; lesson: number } {
  if (line.startsWith('|')) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const lesson = Number(cells[3]);
    return { lemma: cells[1] ?? '', gloss: cells[4] ?? '', lesson: Number.isInteger(lesson) && lesson > 0 ? lesson : 0 };
  }
  const dash = DASH.exec(line);
  if (dash) return { lemma: line.slice(0, dash.index), gloss: line.slice(dash.index + dash[0].length), lesson: 0 };
  const comma = line.indexOf(',');
  if (comma >= 0) return { lemma: line.slice(0, comma), gloss: line.slice(comma + 1), lesson: 0 };
  return { lemma: line, gloss: '', lesson: 0 };
}

/** Whether a table line is the header or the rule under it rather than a word. */
const isTableFurniture = (line: string) => /^\|[\s|:-]*\|?$/.test(line) || /^\|\s*#\s*\|/.test(line);

export function parseImport(text: string): ImportLine[] {
  const out: ImportLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || (line.startsWith('|') && isTableFurniture(line))) continue;
    const { lemma, gloss, lesson } = split(line);
    const { headword, lemmas } = normaliseLemma(lemma);
    if (!headword || !GREEK_WORD.test(headword)) {
      out.push({ ok: false, line, reason: 'Not a Greek word' });
      continue;
    }
    out.push({ ok: true, line, headword, lemmas, gloss: gloss.replace(/\s+/g, ' ').trim(), lesson });
  }
  return out;
}
