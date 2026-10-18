// src/data/grammar/passageCheck.ts — Check on a passage lesson (mw-z370x5.2, docs/grammar.md 'Passage lessons'): the questions that pass a lesson by reading it. For each verse of the
// lesson's range, easiest first, what a chunk says (buildMeaning) and a parsing of a word (buildParse), or who does what (buildRoles) when the verse is not yet at his level, built from the
// lesson's ideas first and then from the ideas the verse's own forms need. Pure: the caller hands in the chapter, the verses graded to him and a random.
import type { Chapter } from '../chapter';
import type { Random } from '../quiz';
import type { GradedVerse } from './gradedVerses';
import { needsOfForm } from './gradedVerses';
import { ideaOf, type GrammarIdea } from './ladder';
import { buildMeaning, buildParse, buildRoles, type GrammarQuestion } from './questions';

/** The most questions a Check asks (PROVISIONAL, the Governor to confirm). */
export const CHECK_QUESTIONS = 8;

/** The share right that passes the lesson (PROVISIONAL, the Governor to confirm); under it the lesson stays read. */
export const PASS_SHARE = 0.75;

/** Whether `right` of `total` passes: at PASS_SHARE or more, and at least one question asked. */
export const passes = (right: number, total: number): boolean => total > 0 && right / total >= PASS_SHARE;

/** The titles of the ideas he missed, once each, as the end card names them: 'the perfect tense'. */
export const weakIdeas = (missed: readonly GrammarQuestion[]): string[] => [...new Set(missed.map((q) => ideaOf(q.ideaId).title.replace(/^The /, 'the ')))];

function ideaIfAny(id: string): GrammarIdea | undefined {
  try {
    return ideaOf(id);
  } catch {
    return undefined;
  }
}

/**
 * The questions of a Check on verses `from` to `to` of `chapter`: for each verse, easiest first (`graded` is gradedVerses' list, easiest first), a meaning and a parse (or, for a verse not at his
 * level, roles and then a parse), at most `max` in all. An idea of the lesson that the verse has a form of is asked before one the verse's forms need that the lesson does not name, and one
 * not yet asked in this Check before one that was; a verse that can give neither kind of question gives none.
 */
export function buildCheck(chapter: Chapter, from: number, to: number, ideas: readonly string[], graded: readonly GradedVerse[], random: Random, max = CHECK_QUESTIONS): GrammarQuestion[] {
  const order = graded.filter((g) => g.code === chapter.code && g.chapter === chapter.chapter && g.verse >= from && g.verse <= to);
  const used = new Map<string, number>();
  const questions: GrammarQuestion[] = [];
  for (const g of order) {
    if (questions.length >= max) break;
    const verse = chapter.verses.find((v) => v.n === g.verse);
    if (!verse) continue;
    // the verse is asked as if it were at his level: a Check reads the lesson's passage, not the verses under his frontier
    const here: GradedVerse[] = [{ ...g, atLevel: true }];
    const own = [...new Set(verse.g.flatMap((w) => needsOfForm(w)))];
    const candidates = [...ideas.filter((id) => own.includes(id)), ...own.filter((id) => !ideas.includes(id))]
      .map(ideaIfAny)
      .filter((i): i is GrammarIdea => i !== undefined)
      .sort((a, b) => (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0));
    const ask = (build: (idea: GrammarIdea) => GrammarQuestion | null): GrammarQuestion | null => {
      for (const idea of candidates) {
        const question = build(idea);
        if (question) {
          used.set(idea.id, (used.get(idea.id) ?? 0) + 1);
          return question;
        }
      }
      return null;
    };
    const key = g.ref;
    const meaning = ask((i) => buildMeaning(i, [chapter], random, here, key));
    const parse = (): GrammarQuestion | null => ask((i) => buildParse(i, [chapter], random, here, key));
    const roles = (): GrammarQuestion | null => ask((i) => buildRoles(i, [chapter], random, here, key));
    const second = g.atLevel ? (parse() ?? roles()) : (roles() ?? parse());
    questions.push(...[meaning, second].filter((q): q is GrammarQuestion => q !== null));
  }
  return questions.slice(0, max);
}
