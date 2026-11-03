// tests/unit/lxx-word.test.ts — a word of a Septuagint chapter (mw-u2w5klk.12, the Septuagint epic's R4): its gloss and definition come from the lemma lexicon (public/data-lxx/lexicon-grc-lxx.json),
// how Lampas read it is told in words, and a word the derivation only guessed (`y: 'g'`) is never offered to learn, quizzed, drilled or added: one test for each seam.
import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { addLemmaToLearn } from '../../src/data/answerWord';
import { isGuess, wordDefinition, wordGloss, type Chapter, type GreekWord, type Verse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { drawDrill } from '../../src/data/drill';
import { pickFrontier } from '../../src/data/frontier';
import { loadSeptuagintChapter } from '../../src/data/lxxChapter';
import { buildQuestion, mulberry32 } from '../../src/data/quiz';
import type { GradedVerse } from '../../src/data/grammar/gradedVerses';
import { grammarExamples } from '../../src/data/grammarExamples';
import { passageWords } from '../../src/data/grammar/drillItems';
import { LADDER } from '../../src/data/grammar/ladder';
import { buildEnding, buildBreathing, buildIdeaQuestion, buildMeaning, buildParse, buildRoles, buildStress, buildSyllables, buildTapForm, buildTapUse, buildUse, type GrammarQuestion } from '../../src/data/grammar/questions';
import { listWords } from '../../src/data/repositories';
import { confidenceWord, readingOf } from '../../src/reader/septuagint';
import { useNewWords } from '../../src/useNewWords';
import { FIXTURE_CHAPTER } from '../fixtures/frontier';
import { stubChapterFetch } from '../support/chapter-fetch';

const gen1 = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as Chapter;

describe('a Septuagint word as a chapter holds it', () => {
  beforeEach(() => {
    stubChapterFetch();
  });

  it('is glossed from the lemma lexicon: the chapter file has no Strong\'s number, so loadSeptuagintChapter lays the lexicon in by lemma', async () => {
    const chapter = (await loadSeptuagintChapter('gen', 1))!;
    const made = chapter.verses[0].g.find((w) => w.t === 'ἐποίησεν')!;
    expect(made.s).toBe('');
    expect(wordGloss(chapter, made)).toBe('to do, make');
    expect(wordDefinition(chapter, made)).toMatch(/^ποιέω/);
  });

  it('says nothing, rather than a wrong word, of a lemma the lexicon lacks', () => {
    const w: GreekWord = { t: 'λόγος', tr: '', s: '', l: 'λόγος', p: 'N-NSM', y: '1', c: 0.97 };
    expect(wordGloss({ ...gen1, lex: {} }, w)).toBe('');
  });

  it('is a guess when its layer is g, and only then', () => {
    expect(isGuess({ y: 'g' })).toBe(true);
    for (const y of ['1', '2', '2a', '3', undefined]) expect(isGuess({ y })).toBe(false);
  });
});

describe('how Lampas read a word', () => {
  const at = (y: string | undefined, c: number | undefined): GreekWord => ({ t: 'x', tr: '', s: '', l: 'x', p: 'N-NSM', y, c });

  it('names the layer in words', () => {
    expect(readingOf(at('1', 0.97))?.layer).toBe("From the New Testament's forms");
    expect(readingOf(at('2', 0.75))?.layer).toBe('From the paradigm parser');
    expect(readingOf(at('2a', 0.85))?.layer).toBe('By agreement with its neighbours');
    expect(readingOf(at('3', 0.8))?.layer).toBe("A model's reading of the verse");
    expect(readingOf(at('g', 0.4))?.layer).toBe('A guess');
  });

  it('tells the confidence as sure, likely or unsure', () => {
    expect(confidenceWord(0.97)).toBe('sure');
    expect(confidenceWord(0.85)).toBe('sure');
    expect(confidenceWord(0.8)).toBe('likely');
    expect(confidenceWord(0.75)).toBe('likely');
    expect(confidenceWord(0.5)).toBe('unsure');
    expect(confidenceWord(0.4)).toBe('unsure');
  });

  it('has nothing to say of a word the derivation did not read (the New Testament, the Hebrew)', () => {
    expect(readingOf(at(undefined, undefined))).toBeUndefined();
  });

  it('offers Report this reading for a guess or an unsure word, not for a sure or a likely one', () => {
    expect(readingOf(at('g', 0.4))?.report).toBe(true);
    expect(readingOf(at('3', 0.5))?.report).toBe(true);
    expect(readingOf(at('3', 0.8))?.report).toBe(false);
    expect(readingOf(at('1', 0.97))?.report).toBe(false);
  });
});

// a chapter of the frontier's made-up words with one occurrence of κόσμος (the commonest word he lacks) a guess
const guessed = (lemmas: string[]): Chapter => {
  const mark = (w: GreekWord): GreekWord => (lemmas.includes(w.l) ? { ...w, y: 'g', c: 0.4 } : w);
  return { ...FIXTURE_CHAPTER, verses: FIXTURE_CHAPTER.verses.map((v): Verse => ({ ...v, g: v.g.map(mark) })) };
};
const KNOWN = { solid: new Set(['καί', 'εἰμί']), learning: new Set<string>(), dropped: new Set<string>() };
const COUNTS = [
  { strongs: 'G2889', lemma: 'κόσμος', count: 2000, chapters: 100, proper: false },
  { strongs: 'G2316', lemma: 'θεός', count: 1317, chapters: 100, proper: false },
  { strongs: 'G5457', lemma: 'φῶς', count: 1800, chapters: 100, proper: false },
];

describe('the frontier picker', () => {
  it('offers κόσμος when its word is read, and not when the derivation only guessed it', () => {
    expect(pickFrontier(FIXTURE_CHAPTER, KNOWN, COUNTS, 3).map((c) => c.lemma)).toContain('κόσμος');
    expect(pickFrontier(guessed(['κόσμος']), KNOWN, COUNTS, 3).map((c) => c.lemma)).not.toContain('κόσμος');
  });

  it('still offers a lemma whose other occurrence is read', () => {
    const chapter = guessed([]);
    // θεός stands in four verses: guess only the first
    chapter.verses[0] = { ...chapter.verses[0], g: chapter.verses[0].g.map((w) => (w.l === 'θεός' ? { ...w, y: 'g', c: 0.4 } : w)) };
    expect(pickFrontier(chapter, KNOWN, COUNTS, 5).map((c) => c.lemma)).toContain('θεός');
  });
});

describe('useNewWords', () => {
  beforeEach(async () => {
    stubChapterFetch();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("does not offer a word the derivation guessed", async () => {
    const whole = renderHook(() => useNewWords(guessed([]), 40));
    await waitFor(() => expect(whole.result.current).toBeDefined());
    expect(whole.result.current!.map((c) => c.lemma)).toContain('κόσμος');
    const { result } = renderHook(() => useNewWords(guessed(['κόσμος']), 40));
    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current!.map((c) => c.lemma)).not.toContain('κόσμος');
  });
});

describe('the Quick test', () => {
  const word = { lemma: 'κόσμος', lang: 'grc' as const, lemmas: ['κόσμος'], gloss: 'world', lesson: 0, state: 'learning' as const, since: 0 };

  it('shows the form from a verse only when that form is read, not guessed', () => {
    const random = mulberry32(1);
    expect(buildQuestion(word, [], FIXTURE_CHAPTER, random).form).toBe('κόσμος');
    expect(buildQuestion(word, [], guessed(['κόσμος']), random).form).toBeUndefined();
  });
});

describe("Review's scheduler", () => {
  beforeEach(async () => {
    stubChapterFetch();
    await Promise.all(db.tables.map((table) => table.clear()));
  });
  const word = (lemma: string) => ({ lemma, lang: 'grc' as const, lemmas: [lemma], gloss: `gloss of ${lemma}`, lesson: 0, state: 'solid' as const, since: 0 });

  it("drills a word he knows where it is read and never where it is a guess", () => {
    const places = (chapter: Chapter) => drawDrill(chapter, [word('κόσμος')], mulberry32(3)).map((q) => q.form);
    expect(places(FIXTURE_CHAPTER)).toEqual(['κόσμος']);
    expect(places(guessed(['κόσμος']))).toEqual([]);
  });

  it('does not put on his list a lemma the open chapter has only as a guess', async () => {
    const scope = { title: 'Test 1', chapter: guessed(['κόσμος']), verse: null };
    expect(await addLemmaToLearn(scope, 'κόσμος')).toEqual({ headword: 'κόσμος', result: 'ignored' });
    expect(await listWords()).toEqual([]);
  });

  it('adds a lemma the open chapter has read at least once', async () => {
    const chapter = guessed([]);
    chapter.verses[0] = { ...chapter.verses[0], g: chapter.verses[0].g.map((w) => (w.l === 'θεός' ? { ...w, y: 'g', c: 0.4 } : w)) };
    const result = await addLemmaToLearn({ title: 'Test 1', chapter, verse: null }, 'θεός');
    expect(result.result).toBe('added');
  });
});

// a guessed word is never the answer of a grammar question (mw-5r3p30.963; R4 promised "never quizzed", and the builders over a passage had no guard)
describe('the grammar questions over a Septuagint chapter', () => {
  const SAMPLED = new Set(['stress', 'syllables', 'breathing']);
  const GUESSED = ['ὤφθη', 'Γενηθήτωσαν', 'ζωσῶν'];
  const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
  /** the forms the chapter has only as a guess: a form read at one place and guessed at another is rightly shown, from the place it is read */
  const guessesOf = (chapter: Chapter): Set<string> => {
    const words = chapter.verses.flatMap((v) => v.g);
    const read = new Set(words.filter((w) => !isGuess(w)).map((w) => w.t));
    return new Set(words.filter((w) => isGuess(w) && !read.has(w.t)).map((w) => w.t));
  };
  const keyOf = (n: number): string => `${gen1.code}.${gen1.chapter}.${n}`;
  const graded = (chapter: Chapter): GradedVerse[] =>
    chapter.verses.map((v) => ({ ref: `${chapter.code}.${chapter.chapter}.${v.n}`, code: chapter.code, chapter: chapter.chapter, verse: v.n, forms: { pass: 1, total: 1 }, words: { known: 1, total: 1 }, atLevel: true, missing: [], score: 1 }));
  /** every word a question names as its answer or shows as its form */
  const shownOf = (q: GrammarQuestion): string[] => [q.right, q.form, ...(q.marked ?? []), ...(q.words && q.markedAt ? q.markedAt.map((i) => q.words![i]) : [])].filter((s): s is string => typeof s === 'string');

  it('knows the three guessed words of the fixture', () => {
    expect([...guessesOf(gen1)].sort()).toEqual([...GUESSED].sort());
  });

  it('never gives a guessed word as the right answer of a tap-the-form question, and still can give a read one', () => {
    const answers = new Set<string>();
    for (const idea of LADDER) {
      for (const seed of SEEDS) {
        for (const only of [undefined, keyOf(9), keyOf(14), keyOf(20)]) {
          const q = buildTapForm(idea, [gen1], mulberry32(seed), undefined, only);
          if (q) answers.add(q.right);
        }
      }
    }
    for (const word of GUESSED) expect(answers.has(word), `${word} was the right answer`).toBe(false);
    expect(answers.size).toBeGreaterThan(0);
  });

  it('never builds any question over a chapter that is all guesses (but the ones made of sample words)', () => {
    const all: Chapter = { ...gen1, verses: gen1.verses.map((v): Verse => ({ ...v, g: v.g.map((w): GreekWord => ({ ...w, y: 'g', c: 0.4 })) })) };
    const words = new Set(all.verses.flatMap((v) => v.g.map((w) => w.t)));
    const list = graded(all);
    for (const idea of LADDER) {
      for (const seed of [1, 2, 3]) {
        const random = () => mulberry32(seed);
        expect(buildTapForm(idea, [all], random()), `tap-form ${idea.id}`).toBeNull();
        expect(buildEnding(idea, [all], random()), `ending ${idea.id}`).toBeNull();
        expect(buildParse(idea, [all], random(), list), `parse ${idea.id}`).toBeNull();
        expect(buildRoles(idea, [all], random(), list), `roles ${idea.id}`).toBeNull();
        expect(buildMeaning(idea, [all], random()), `meaning ${idea.id}`).toBeNull();
        expect(buildUse(idea, [all], random()), `use ${idea.id}`).toBeNull();
        expect(buildTapUse(idea, [all], random()), `tap-use ${idea.id}`).toBeNull();
        // the quick round's look-alike letters and the stress, syllable and breathing words of SAMPLE_WORDS are not the chapter's: only the idea's own question is read
        const q = buildIdeaQuestion(idea, [all], random(), undefined, undefined, undefined, list);
        if (!idea.parent && !SAMPLED.has(q.kind)) for (const shown of shownOf(q)) expect(words.has(shown), `${idea.id} (${q.kind}) shows ${shown}`).toBe(false);
        for (const build of [buildStress, buildSyllables, buildBreathing]) expect(words.has(build(idea, [all], random()).form ?? ''), `${idea.id} ${build.name}`).toBe(false);
      }
    }
  });

  // Every builder reads the chapter's words and picks one by its seed. The fixture holds three guesses, so a leak showed only on the seeds that landed on one of them
  // (40 seeds x every idea x eight builders ran 15 s, mw-5r3p30.1009). Here the words of every second English chunk are guesses (a chunk's words go together: a question
  // over a chunk that mixes a read word with a guess names both, which is a finding of its own), so about half of what a builder can pick is a guess and a few seeds
  // find a leak; the fixture's own three guesses are still tried, on two seeds. The guess set is read from the chapter.
  const halfGuessed: Chapter = { ...gen1, verses: gen1.verses.map((v): Verse => ({ ...v, g: v.g.map((w, i): GreekWord => ((w.e ?? i) % 2 ? { ...w, y: 'g', c: 0.4 } : w)) })) };
  const FEW_SEEDS = SEEDS.slice(0, 6);

  it('never shows a guessed word as the form of a question over the chapter, whichever builder makes it', () => {
    for (const chapter of [gen1, halfGuessed]) {
      const guesses = guessesOf(chapter);
      expect(guesses.size, 'the chapter has guesses to leak').toBeGreaterThan(0);
      const list = graded(chapter);
      for (const idea of LADDER) {
        for (const seed of chapter === gen1 ? SEEDS.slice(0, 2) : FEW_SEEDS) {
          const random = () => mulberry32(seed);
          const made = [buildIdeaQuestion(idea, [chapter], random(), undefined, undefined, undefined, list), buildEnding(idea, [chapter], random(), undefined, list), buildParse(idea, [chapter], random(), list), buildRoles(idea, [chapter], random(), list), buildMeaning(idea, [chapter], random(), list), buildStress(idea, [chapter], random()), buildSyllables(idea, [chapter], random()), buildBreathing(idea, [chapter], random())];
          for (const q of made) if (q) for (const shown of shownOf(q)) expect(guesses.has(shown), `${idea.id} (${q.kind}) shows ${shown}`).toBe(false);
        }
      }
    }
  });

  it("shows no guessed word as an example of a term on a Grammar sheet, nor lends its lemma to a Drill it step (a lemma read nowhere)", () => {
    const shown = (term: string): string[] => grammarExamples(gen1, term, undefined, 100).map((e) => e.word.t);
    expect(shown('imperative')).not.toContain('Γενηθήτωσαν');
    expect(shown('imperative')).toContain('ἔστω');
    expect(shown('participle')).not.toContain('ζωσῶν');
    expect(shown('aorist')).toContain('ἐποίησεν');
    const made: Chapter = { ...gen1, verses: gen1.verses.map((v): Verse => ({ ...v, g: v.g.map((w) => (w.l === 'ποιέω' ? { ...w, y: 'g', c: 0.4 } : w)) })) };
    expect(passageWords([gen1])).toContain('ποιέω');
    expect(passageWords([made])).not.toContain('ποιέω');
  });
});
