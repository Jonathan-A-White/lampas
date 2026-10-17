// src/data/grammar/gradedVerses.ts — the verses of a goal graded to the reader (mw-emk3xt.1, docs/grammar.md 'Graded verses'). Pure: the caller hands in
// the chapters, the form test formLevel.ts pickerPasses builds and the lemmas he knows; nothing here reads the store, the network or a screen.
import type { Chapter, GreekWord, Verse } from '../chapter';
import { wordLemma } from '../chapter';
import type { FormTest } from '../frontier';
import { ALWAYS_NEEDED, ideasOfWord } from './ladder';

/** The least share of a verse's words he must know for the verse to be at his level (PROVISIONAL, with the two shares multiplied into the score). */
export const WORDS_SHARE = 0.5;

export interface GradedVerse {
  /** '1jn.1.5': the book's code, the chapter and the verse, as talkRef writes them */
  ref: string;
  code: string;
  chapter: number;
  verse: number;
  /** how many of the verse's forms pass the form test */
  forms: { pass: number; total: number };
  /** how many of the verse's Greek words have a lemma he knows */
  words: { known: number; total: number };
  /** every form passes and at least WORDS_SHARE of the words are known; a verse with no Greek is never at level */
  atLevel: boolean;
  /** The ideas he still needs for the verse: those of the forms that fail (ideasOfWord plus ALWAYS_NEEDED), in the order met, without those `ideaMet` says he has. */
  missing: string[];
  /** 0 to 1: the share of forms that pass times the share of words he knows */
  score: number;
}

export interface GradeOptions {
  code?: string;
  chapter?: number;
  /** Whether an idea is at the level the form test holds to (see ideaMetBy). Without it, every idea of a failing form is listed as missing. */
  ideaMet?: (id: string) => boolean;
}

const lemmaOf = (w: GreekWord): string => wordLemma(w).normalize('NFC');

/** The ideas a form needs, as the Weave and the picker count them (ideasOfWord, which throws on a code the ladder cannot read, gives none) and ALWAYS_NEEDED. */
export function needsOfForm(word: GreekWord): string[] {
  try {
    return [...ideasOfWord(word), ...ALWAYS_NEEDED];
  } catch {
    return [...ALWAYS_NEEDED];
  }
}

/** `ideaMet` for a table of levels like grammarLevels.ts gives: solid, and also frontier when `level` is 'frontier' (the picker's two levels). */
export const ideaMetBy =
  (levels: ReadonlyMap<string, { level: string }>, level: 'solid' | 'frontier') =>
  (id: string): boolean => {
    const at = levels.get(id)?.level;
    return at === 'solid' || (level === 'frontier' && at === 'frontier');
  };

/** One verse graded: see GradedVerse. `known` holds NFC lemmas. */
export function gradeVerse(verse: Verse, passes: FormTest, known: ReadonlySet<string>, options: GradeOptions = {}): GradedVerse {
  const { code = '', chapter = 0, ideaMet } = options;
  const total = verse.g.length;
  const failing = verse.g.filter((w) => !passes(w));
  const knownWords = verse.g.filter((w) => known.has(lemmaOf(w))).length;
  const missing = new Set<string>();
  for (const word of failing) for (const id of needsOfForm(word)) if (!ideaMet?.(id)) missing.add(id);
  const pass = total - failing.length;
  return {
    ref: `${code}.${chapter}.${verse.n}`,
    code,
    chapter,
    verse: verse.n,
    forms: { pass, total },
    words: { known: knownWords, total },
    atLevel: total > 0 && failing.length === 0 && knownWords / total >= WORDS_SHARE,
    missing: [...missing],
    score: total === 0 ? 0 : (pass / total) * (knownWords / total),
  };
}

/** Every verse of `chapters` graded, easiest first: the higher score, then the fewer Greek words, then the text's order (the sort is stable). */
export function gradedVerses(chapters: readonly Chapter[], passes: FormTest, known: ReadonlySet<string>, ideaMet?: (id: string) => boolean): GradedVerse[] {
  return chapters
    .flatMap((chapter) => chapter.verses.map((verse) => gradeVerse(verse, passes, known, { code: chapter.code, chapter: chapter.chapter, ideaMet })))
    .sort((a, b) => b.score - a.score || a.words.total - b.words.total);
}

/**
 * The easiest verse at his level that has a form needing the idea; when none is at his level, the easiest with one at all; null when no verse of
 * `chapters` has one. `graded` is gradedVerses' list (easiest first), and `chapters` gives the forms of each verse.
 */
export function easiestWith(ideaId: string, graded: readonly GradedVerse[], chapters: readonly Chapter[]): GradedVerse | null {
  const verses = new Map<string, Verse>();
  for (const chapter of chapters) for (const verse of chapter.verses) verses.set(`${chapter.code}.${chapter.chapter}.${verse.n}`, verse);
  const has = graded.filter((g) => verses.get(g.ref)?.g.some((w) => needsOfForm(w).includes(ideaId)));
  return has.find((g) => g.atLevel) ?? has[0] ?? null;
}
