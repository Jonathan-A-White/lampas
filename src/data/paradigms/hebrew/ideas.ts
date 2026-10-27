// src/data/paradigms/hebrew/ideas.ts — what a Hebrew parsing says, for the Hebrew paradigm tables (mw-gdcyf98.13, docs/paradigms.md 'The Hebrew tables'). `ideasOf(parse)` is the Greek ideasOf's twin: the
// ids of the Hebrew ladder's ideas a decoded parsing ('Conjunctive waw | Verb - Qal - Consecutive imperfect - third person masculine singular') names, each term through ladderFor('hbo').ideaOfTerm,
// sorted by rung. The ladder's ideas are coarse (he-gender is masculine and feminine alike), so `tagsOf(parse, form)` gives the same parsing in the fine grain a cell names in its `tags`
// ('tense:imperfect', 'person:3', 'gender:m', 'number:s'), and `agrees` says whether a cell's tags are the word's. Pure: no store and no screen.
import { ladderFor } from '../../grammar/ladders';
import { hebrewParseSegments } from '../../parseCode';
import type { ParadigmCell } from '../types';

const ladder = ladderFor('hbo');

/** The ideas a cell must find in the word before the cell can be the word's: the idea of a kind of word (the qal stem, a tense, the article, a suffix, a pronoun). */
export const BOUND_IDEAS: ReadonlySet<string> = new Set(['he-qal', 'he-perfect', 'he-imperfect', 'he-imperative', 'he-article', 'he-suffix-pronominal', 'he-pronoun-personal']);

const PERSON_TERMS = ['first person', 'second person', 'third person'];
// a term that says more than the table's ladder idea: a consecutive imperfect is an imperfect, a conjunctive perfect a perfect (the vav-consecutive idea rests on both)
const ALSO: Readonly<Record<string, string>> = { 'Consecutive imperfect': 'he-imperfect', 'Conjunctive imperfect': 'he-imperfect', 'Conjunctive perfect': 'he-perfect' };

interface Piece {
  text: string;
  terms: string[];
  verb: boolean;
  noun: boolean;
}

/** The parsing cut at ' | ' into its pieces ('Preposition-b', 'Noun - masculine singular construct', 'first person common plural'), each with the terms it holds. */
function piecesOf(parse: string): Piece[] {
  return parse.split(' | ').map((text) => {
    const terms = hebrewParseSegments(text).flatMap((s) => (s.term ? [s.term] : []));
    return { text, terms, verb: terms.includes('Verb'), noun: terms.includes('Noun') };
  });
}

const SUFFIX_TERMS = [...PERSON_TERMS, 'masculine', 'feminine', 'common', 'singular', 'plural', 'dual'];

/** Whether piece `i` is a pronominal suffix (on a noun, a preposition or a verb): it comes after the word's own piece and says only a person, a gender and a number. */
const isSuffix = (pieces: readonly Piece[], i: number): boolean => i > 0 && pieces[i].terms.length > 0 && pieces[i].terms.every((t) => SUFFIX_TERMS.includes(t)) && pieces[i].terms.some((t) => PERSON_TERMS.includes(t));

/** Whether piece `i` is the suffix of a noun, which the suffix table lays out. */
const isNounSuffix = (pieces: readonly Piece[], i: number): boolean => isSuffix(pieces, i) && pieces.slice(0, i).some((p) => p.noun);

/** The ids of the Hebrew ladder's ideas the decoded parsing names, sorted by rung; none for a parsing with no Hebrew term. */
export function ideasOf(parse: string): string[] {
  const pieces = piecesOf(parse);
  const ids = new Set<string>();
  pieces.forEach((piece, i) => {
    if (isSuffix(pieces, i)) {
      ids.add('he-suffix-pronominal');
      return;
    }
    for (const term of piece.terms) {
      // on a verb a person is the verb's person, gender and number, not the pronoun's
      const id = piece.verb && PERSON_TERMS.includes(term) ? 'he-person-gender-number' : ladder.ideaOfTerm(term);
      if (id) ids.add(id);
      if (ALSO[term]) ids.add(ALSO[term]);
    }
    if (piece.verb && piece.terms.some((t) => PERSON_TERMS.includes(t) || ['masculine', 'feminine', 'common', 'singular', 'plural'].includes(t))) ids.add('he-person-gender-number');
  });
  return [...ids].sort((a, b) => ladder.ideaOf(a).rung - ladder.ideaOf(b).rung);
}

const PERSON: Readonly<Record<string, string>> = { 'first person': '1', 'second person': '2', 'third person': '3' };
const GENDER: Readonly<Record<string, string>> = { masculine: 'm', feminine: 'f', common: 'c' };
const NUMBER: Readonly<Record<string, string>> = { singular: 's', plural: 'p', dual: 'd' };

/** What kind of article a pointed word shows: the vowel under the ה (patach: before a plain letter; qamats: before a guttural or resh; segol: before a qamats-first guttural). */
export function articleKindOf(form: string): 'plain' | 'guttural' | 'qamats' | undefined {
  const m = /[א-ת][֑-ְ֯-ֽׁׂׅׄ]*?(?=[א-ת]|$)/gu;
  const letters = form.normalize('NFC').match(m) ?? [];
  for (const letter of letters.slice(0, 3)) {
    if (!letter.startsWith('ה')) continue;
    if (letter.includes('ַ')) return 'plain';
    if (letter.includes('ָ')) return 'guttural';
    if (letter.includes('ֶ')) return 'qamats';
  }
  return undefined;
}

/**
 * The parsing in the fine grain a cell names: 'tense:' (perfect, imperfect, imperative), 'person:', 'gender:' (m, f, c), 'number:' (s, p, d) of the verb or the pronoun; of a noun with a suffix 'noun:' is the
 * noun's number and the others are the suffix's; an article word has 'with:article' and, from its pointed form where it has one, 'article:plain', ':guttural' or ':qamats'.
 */
export function tagsOf(parse: string, form?: string): string[] {
  const pieces = piecesOf(parse);
  const tags: string[] = [];
  const said = (text: string, kind: string, table: Readonly<Record<string, string>>) => {
    for (const [word, value] of Object.entries(table)) if (new RegExp(`(?<![a-z])${word}(?![a-z])`).test(text)) tags.push(`${kind}:${value}`);
  };
  pieces.forEach((piece, i) => {
    if (piece.verb) {
      const lower = piece.text.toLowerCase();
      tags.push(...(/imperfect/.test(lower) ? ['tense:imperfect'] : /perfect/.test(lower) ? ['tense:perfect'] : /imperative/.test(lower) ? ['tense:imperative'] : []));
    }
    if (piece.noun) {
      for (const [word, value] of Object.entries(NUMBER)) if (new RegExp(`(?<![a-z])${word}(?![a-z])`).test(piece.text)) tags.push(`noun:${value}`);
      return;
    }
    if (isNounSuffix(pieces, i) || piece.verb || piece.terms.includes('Pronoun')) {
      said(piece.text, 'person', PERSON);
      said(piece.text, 'gender', GENDER);
      said(piece.text, 'number', NUMBER);
    }
  });
  if (parse.split(/ \| |, /).some((t) => t === 'Article' || t === 'Art')) {
    tags.push('with:article');
    const kind = form === undefined ? undefined : articleKindOf(form);
    if (kind) tags.push(`article:${kind}`);
  }
  return tags;
}

const kindOf = (tag: string): string => tag.slice(0, tag.indexOf(':'));

/** Whether a cell's tags are the word's: every kind the cell names is a kind the word has, with the same value (a common gender is either). */
export function agrees(cell: ParadigmCell, wanted: readonly string[]): boolean {
  const mine = cell.tags ?? [];
  for (const kind of new Set(mine.map(kindOf))) {
    const cells = mine.filter((t) => kindOf(t) === kind);
    const words = wanted.filter((t) => kindOf(t) === kind);
    if (words.length === 0) return false;
    const common = kind === 'gender' && (cells.includes('gender:c') || words.includes('gender:c'));
    if (!common && !cells.some((t) => words.includes(t))) return false;
  }
  return true;
}

/** Whether a Hebrew cell is where a word with these ideas and tags lands: it rests on a kind of word the word is, every such idea is the word's, and its tags agree. */
export function landsOn(cell: ParadigmCell, wantedIdeas: readonly string[], wantedTags: readonly string[]): boolean {
  const bound = cell.ideas.filter((id) => BOUND_IDEAS.has(id));
  return bound.length > 0 && bound.every((id) => wantedIdeas.includes(id)) && agrees(cell, wantedTags);
}

/** The pointed form without the marks of the text's reading (cantillation, meteg, maqaf, sof pasuq): how a cell's form is compared with a word's. */
export const bareForm = (form: string): string => form.normalize('NFC').replace(/[֑-ֽ֯־׀׃׆ׯ-״]/g, '').normalize('NFC');
