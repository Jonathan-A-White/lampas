// src/data/grammar/inference.ts — what his right answers show (mw-hqd5bz.17), pure. A form he reads right is evidence for the letters, sounds and
// marks it is spelt with: each of its letters (letter-*), a pair of vowels or of consonants in it (diphthongs, consonant-pairs), a breathing
// (breathings), an accent (accents) and an iota under a letter (iota-subscript). PROVISIONAL, the Mayor's rules, the Governor to confirm:
//   a foundation idea with INFERRED_RIGHTS right uses and no miss since is solid, how 'inferred'; a miss on a question about that letter or
//   sound counts against it (the run of right uses starts again); 'alphabet' is solid when all 24 letters are solid, asked or inferred.
// The store half is src/data/repositories/inference.ts; the placement (placement.ts) runs the same rules on its own copy of the evidence.
import { breathingOf, type GrammarQuestion } from './questions';
import { ITEM_GROUPS, LADDER, groupOfItem, itemName, itemsOf, type GrammarIdea } from './ladder';
import type { Level } from './needs';

/** Right uses, with no miss since, that make a letter, sound or mark solid. PROVISIONAL. */
export const INFERRED_RIGHTS = 3;

/** What one foundation idea has shown so far: right uses since its last miss, and the misses. */
export interface Evidence {
  run: number;
  misses: number;
}

export type EvidenceMap = ReadonlyMap<string, Evidence>;

const LETTERS: readonly GrammarIdea[] = LADDER.filter((i) => i.glyphs);
/** The 24 letters' idea ids, alpha to omega. */
export const LETTER_IDS: readonly string[] = LETTERS.map((i) => i.id);

const NON_LETTER_IDS: readonly string[] = ['diphthongs', 'consonant-pairs', 'breathings', 'accents', 'iota-subscript'];
/** The combination items (mw-hqd5bz.18): one for each diphthong, consonant pair and breathing. */
const COMBINATIONS: readonly GrammarIdea[] = LADDER.filter((i) => i.parent);
const ITEM_OF_PAIR = new Map(COMBINATIONS.filter((i) => i.parent !== 'breathings').map((i) => [i.pair!, i.id]));
/** The ideas a form can be evidence for: the 24 letters, the pairs, the marks, and each combination. */
export const FOUNDATION_IDS: readonly string[] = [...LETTER_IDS, ...NON_LETTER_IDS, ...COMBINATIONS.map((i) => i.id)];
export const isFoundation = (id: string): boolean => FOUNDATION_IDS.includes(id);

const LETTER_OF_BASE = new Map(LETTERS.map((i) => [i.glyphs![0], i.id]));

/** The letter idea of a letter or its capital, a final sigma (ς) as a sigma; undefined for anything else. */
export function letterIdOf(glyph: string): string | undefined {
  const base = glyph.normalize('NFD')[0]?.toLowerCase();
  return LETTER_OF_BASE.get(base === 'ς' ? 'σ' : base);
}

const DIPHTHONGS = new Set(['αι', 'ει', 'οι', 'υι', 'ου', 'αυ', 'ευ', 'ηυ']);
const CONSONANT_PAIRS = new Set(['μπ', 'ντ', 'γκ', 'γγ', 'γχ', 'γξ']);
const ACCENTS = /[̀́͂]/;
const DIAERESIS = '̈';
const IOTA_SUBSCRIPT = 'ͅ';

/** The letters, sounds and marks a Greek form is spelt with, as ladder ids in the ladder's order. */
export function foundationOf(form: string): string[] {
  const letters = [...form.normalize('NFD')].reduce<{ base: string; marks: string }[]>((all, c) => {
    if (/\p{M}/u.test(c)) {
      if (all.length > 0) all[all.length - 1].marks += c;
    } else if (/\p{L}/u.test(c)) {
      all.push({ base: c.toLowerCase() === 'ς' ? 'σ' : c.toLowerCase(), marks: '' });
    }
    return all;
  }, []);
  const found = new Set<string>();
  letters.forEach((l, i) => {
    const id = LETTER_OF_BASE.get(l.base);
    if (id) found.add(id);
    if (ACCENTS.test(l.marks)) found.add('accents');
    if (l.marks.includes(IOTA_SUBSCRIPT)) found.add('iota-subscript');
    const next = letters[i + 1];
    if (!next) return;
    const pair = l.base + next.base;
    // a pair of vowels is one sound unless the first carries the stress or the second has two dots over it
    if (DIPHTHONGS.has(pair) && !ACCENTS.test(l.marks) && !next.marks.includes(DIAERESIS)) {
      found.add('diphthongs');
      found.add(ITEM_OF_PAIR.get(pair)!);
    }
    if (CONSONANT_PAIRS.has(pair)) {
      found.add('consonant-pairs');
      found.add(ITEM_OF_PAIR.get(pair)!);
    }
  });
  const breathing = breathingOf(form.normalize('NFC'));
  if (breathing) {
    found.add('breathings');
    found.add(`breathing-${breathing.toLowerCase()}`);
  }
  return FOUNDATION_IDS.filter((id) => found.has(id));
}

/** The whole Greek form a question shows: the word of a stress, syllable or breathing question, the right word of a tap-form, the form with its ending put back. */
export function formOfQuestion(question: Pick<GrammarQuestion, 'kind' | 'form' | 'right'>): string | undefined {
  switch (question.kind) {
    case 'ending':
      return question.form?.replace('_', question.right);
    case 'tap-form':
      return question.right;
    case 'stress':
    case 'syllables':
    case 'breathing':
      return question.form;
    default:
      return undefined;
  }
}

/** The ideas a question is about, when it is about letters, sounds or marks: what a miss counts against. */
export function questionFoundation(question: Pick<GrammarQuestion, 'kind' | 'ideaId' | 'right'>): string[] {
  const own = isFoundation(question.ideaId) && !question.ideaId.startsWith('letter-') ? [question.ideaId] : [];
  const about = question.kind === 'letter' || question.kind === 'sound' ? letterOf(question) : [];
  return [...new Set([...own, ...about])];
}

/** The letter a letter or sound question is about: its own idea, or (for the alphabet) the letter whose glyph is the right answer. */
function letterOf(question: Pick<GrammarQuestion, 'ideaId' | 'right'>): string[] {
  if (question.ideaId.startsWith('letter-')) return [question.ideaId];
  if (question.ideaId !== 'alphabet') return [];
  const id = [...question.right].length === 1 ? letterIdOf(question.right) : undefined;
  return id ? [id] : [];
}

/** True when the evidence makes an idea solid. */
export const isInferredSolid = (evidence: Evidence | undefined): boolean => (evidence?.run ?? 0) >= INFERRED_RIGHTS;

function bump(evidence: EvidenceMap, ids: readonly string[], change: (e: Evidence) => Evidence): Map<string, Evidence> {
  const next = new Map(evidence);
  for (const id of ids) next.set(id, change(next.get(id) ?? { run: 0, misses: 0 }));
  return next;
}

/** A Greek form was read right: each letter, sound and mark in it has one more right use. */
export function creditForm(evidence: EvidenceMap, form: string): Map<string, Evidence> {
  return bump(evidence, foundationOf(form), (e) => ({ ...e, run: e.run + 1 }));
}

/** A miss on a question about these ideas: the run of right uses starts again. */
export function countMiss(evidence: EvidenceMap, ids: readonly string[]): Map<string, Evidence> {
  return bump(evidence, ids, (e) => ({ run: 0, misses: e.misses + 1 }));
}

export interface Inferred {
  evidence: Map<string, Evidence>;
  /** the ideas this answer credited with a right use */
  credited: string[];
  /** the ideas this answer counted against */
  missed: string[];
}

/**
 * What one answer to a grammar question adds to the evidence. A right answer on a question that shows a Greek form credits the form's
 * letters, sounds and marks; a miss on a question about a letter or a sound counts against it. A miss on a question about a form (an
 * ending, a tap) says nothing about its letters.
 */
export function inferFromAnswer(evidence: EvidenceMap, question: Pick<GrammarQuestion, 'kind' | 'ideaId' | 'form' | 'right'>, right: boolean): Inferred {
  if (right) {
    const form = formOfQuestion(question);
    return form ? inferFromWord(evidence, form) : { evidence: new Map(evidence), credited: [], missed: [] };
  }
  const missed = questionFoundation(question);
  return { evidence: countMiss(evidence, missed), credited: [], missed };
}

/** A Greek form shown and read right, such as a Quick test word: its letters, sounds and marks have one more right use. */
export function inferFromWord(evidence: EvidenceMap, word: string): Inferred {
  const credited = foundationOf(word);
  return { evidence: creditForm(evidence, word), credited, missed: [] };
}

/** The letters that are not solid, in alphabet order. */
export function weakLetters(levels: ReadonlyMap<string, Level>): GrammarIdea[] {
  return LETTERS.filter((l) => levels.get(l.id) !== 'solid');
}

/** True when all 24 letters are solid: then 'alphabet' is solid. */
export const alphabetIsSolid = (levels: ReadonlyMap<string, Level>): boolean => weakLetters(levels).length === 0;

/**
 * How the Goal screen and the placement's end card write the gaps (letters, pairs and breathings) they name: 'ξ', 'ξ and ψ', 'ξ, ψ and ου', and,
 * past six, 'ξ, ψ, φ, χ, ζ, θ and 5 more letters' ('gaps' when they are not all letters).
 */
export function lettersText(items: readonly GrammarIdea[], shown = 6): string {
  const names = items.map(itemName);
  if (names.length <= shown) return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const more = names.length - shown;
  const noun = items.every((i) => i.glyphs) ? 'letter' : 'gap';
  return `${names.slice(0, shown).join(', ')} and ${more} more ${noun}${more === 1 ? '' : 's'}`;
}

// ---- The items of the quick round (mw-hqd5bz.18, PROVISIONAL) ----

/** The items of one group that are not solid, in the ladder's order. */
export const weakItems = (levels: ReadonlyMap<string, Level>, group: string): GrammarIdea[] => itemsOf(group).filter((i) => levels.get(i.id) !== 'solid');

/** True when every item of the group is solid: then the group's idea ('diphthongs') is solid too. */
export const groupIsSolid = (levels: ReadonlyMap<string, Level>, group: string): boolean => weakItems(levels, group).length === 0;

/**
 * The exact gaps: the items not solid in every group that is partly known (some of its items solid, some not), group by group. A group none of
 * whose items is solid has no exact gap yet, it is the whole idea that is missing, so Learn next names the idea.
 */
export function gapsOf(levels: ReadonlyMap<string, Level>): GrammarIdea[] {
  return ITEM_GROUPS.flatMap((group) => {
    const weak = weakItems(levels, group);
    return weak.length > 0 && weak.length < itemsOf(group).length ? weak : [];
  });
}

/** The group an item id sits under, or undefined for an id that is no item. */
export function groupOf(id: string): string | undefined {
  const idea = LADDER.find((i) => i.id === id);
  return idea ? groupOfItem(idea) : undefined;
}
