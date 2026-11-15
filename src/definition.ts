// src/definition.ts — the word sheet's Definition (mw-5r3p30.1163, his ask 2026-11-14: 'Can Bible references in definitions have links? ... the definition formatting could use some love').
// The text is the lexicon's `d` as the data build cleaned it (scripts/data/tbes.ts cleanDefinition): STEPBible's, for a name 'A man ..., first mentioned at Exo.2.22; son of: ..; brother of: ..
// § Gershom = "foreigner" 1) firstborn son ... 1a) ...'. `definitionOf` reads it (pure); Definition.tsx draws it: the who-part (before '§') one clause to a line, apart from the meaning (after it),
// each numbered sense on a line of its own, and every Bible reference a link that opens the reader on that verse. The reference is read by links.ts's parseHeldReference (the one book table); one
// it cannot read stays plain text.
import { osisOf, parseHeldReference } from './nav/links';

/** A piece of a line: plain text, or a reference with the OSIS ref the reader opens ('Exod.2.22'). */
export interface DefinitionPiece {
  text: string;
  /** set on a reference the app can open */
  ref?: string;
}

/** One sense of the meaning: its label ('1)', '1a)', '1.'; '' for the words before the first), how deep it is (1a is under 1) and its words. */
export interface DefinitionSense {
  label: string;
  depth: number;
  text: DefinitionPiece[];
}

export interface DefinitionParts {
  /** the clauses before '§' (who or what a name is: 'son of: Moses', 'first mentioned at Exo.2.22'), one line each; none when the text has no such part */
  who: DefinitionPiece[][];
  /** the senses after it */
  meaning: DefinitionSense[];
}

// STEPBible writes a place as 'Exo.2.22' (book, chapter, verse), a doubtful one 'Jdg.18.30(?)' and a range 'Gen.11.26--17.5'; the range is linked at its first verse (a link names one verse).
const REFERENCE = /(?<![\p{L}\p{N}.])([1-3]?[A-Za-z]{2,6})\.(\d{1,3})\.(\d{1,3})(?![\p{L}\p{N}])(\(\?\))?/gu;

/** Text cut into plain pieces and links to the references it holds; a '(?)' that follows a reference is a piece of its own, beside it. */
function piecesOf(text: string): DefinitionPiece[] {
  const pieces: DefinitionPiece[] = [];
  let at = 0;
  for (const m of text.matchAll(REFERENCE)) {
    const read = parseHeldReference(`${m[1]} ${m[2]}:${m[3]}`);
    if (!read || read.chapter === undefined || read.verse === undefined) continue; // a place it cannot read stays text
    if (m.index > at) pieces.push({ text: text.slice(at, m.index) });
    pieces.push({ text: `${m[1]}.${m[2]}.${m[3]}`, ref: `${osisOf(read.book)}.${read.chapter}.${read.verse}` });
    if (m[4]) pieces.push({ text: m[4] });
    at = m.index + m[0].length;
  }
  if (at < text.length) pieces.push({ text: text.slice(at) });
  return pieces;
}

// A name's kin and where it is first named: the words that say the text begins with who it is, even where the data has no '§' part after it.
const WHO_WORDS = /first mentioned at|\b(?:son|sons|brother|father|mother|daughter|sister|husband|wife) of:|married to|also called/;

// A sense number: '1)', '1a)', '1c1)' (a number, then letters and numbers: the deeper the longer) after a space, or Abbott-Smith's '__1.' of the Greek.
const SENSE = /(?:(?<=\s)|^)(\d+(?:[a-z]\d*)*\))\s+|__(\d+\.)\s*/g;

/** The text of a definition as lines: see DefinitionParts. */
export function definitionOf(text: string): DefinitionParts {
  const cut = text.indexOf('§');
  const head = cut < 0 ? '' : text.slice(0, cut);
  const rest = cut < 0 ? text : text.slice(cut + 1);
  const whoText = cut >= 0 ? head : WHO_WORDS.test(rest) ? rest : '';
  const meaningText = cut >= 0 ? rest : whoText === '' ? rest : '';
  const who = whoText
    .split(/;\s*/)
    .map((clause) => clause.trim())
    .filter((clause) => clause !== '')
    .map(piecesOf);
  const meaning: DefinitionSense[] = [];
  let last = 0;
  let label = '';
  const push = (end: number): void => {
    const words = meaningText.slice(last, end).trim();
    if (words === '' && label === '') return;
    const key = label.replace(/[).]$/, '');
    meaning.push({ label, depth: label.endsWith(')') ? Math.max((key.match(/\d+|[a-z]/g) ?? []).length - 1, 0) : 0, text: piecesOf(words) });
  };
  for (const m of meaningText.matchAll(SENSE)) {
    push(m.index);
    label = m[1] ?? m[2];
    last = m.index + m[0].length;
  }
  push(meaningText.length);
  return { who, meaning };
}
