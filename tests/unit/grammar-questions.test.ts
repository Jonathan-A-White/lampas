// The pure grammar questions (src/data/grammar/questions.ts): a paradigm ending, tap the form, a letter, its sound, the stressed syllable.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync, readdirSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { GrammarCard } from '../../src/GrammarCard';
import type { Chapter } from '../../src/data/chapter';
import { gradedVerses } from '../../src/data/grammar/gradedVerses';
import { LADDER, ideaOf, ideasOf, type GrammarIdea } from '../../src/data/grammar/ladder';
import {
  buildEnding,
  buildIdeaQuestion,
  buildConcept,
  buildLetter,
  buildMeaning,
  buildSound,
  buildStress,
  buildTapForm,
  buildTapUse,
  buildUse,
  type GrammarQuestion,
} from '../../src/data/grammar/questions';
import { decodeParse, parseSegments } from '../../src/data/parseCode';
import { mulberry32 } from '../../src/data/quiz';
import { formOfQuestion } from '../../src/data/grammar/inference';
import { usesOf } from '../../src/data/grammar/uses';

const load = (file: string) => JSON.parse(readFileSync(`public/data/${file}.json`, 'utf8')) as Chapter;
const jn1 = load('1jn/1');
const rom8 = load('rom/8');
const BOTH = [jn1, rom8];

/** The first question some seed from 1 to 400 gives that `wanted` accepts. */
function seedWhere(make: (seed: number) => GrammarQuestion | null, wanted: (q: GrammarQuestion) => boolean): GrammarQuestion {
  for (let seed = 1; seed <= 400; seed += 1) {
    const q = make(seed);
    if (q && wanted(q)) return q;
  }
  throw new Error('no seed gives that question');
}

// 'pronoun' names any kind of pronoun: the pronoun is taught before its kinds (mw-5r3p30.379)
const termsOf = (code: string) => {
  // the possessor's person and number are not the possessive pronoun's own (mw-svw421.38)
  const decoded = decodeParse(code).split(', ').map((item) => (item.endsWith(' possessor') ? 'possessor' : item)).join(', ');
  const terms = new Set(parseSegments(decoded).flatMap((s) => (s.term ? [s.term] : [])));
  if ([...terms].some((t) => t.endsWith(' pronoun'))) terms.add('pronoun');
  return terms;
};

describe('an ending question', () => {
  const genitive = ideaOf('case-genitive');

  it('blanks ἀρχῆς of 1 John 1 to ἀρχ_ with ῆς among four different endings, one right', () => {
    const q = seedWhere((s) => buildEnding(genitive, [jn1], mulberry32(s)), (x) => x.form === 'ἀρχ_');
    expect(q.kind).toBe('ending');
    expect(q.right).toBe('ῆς');
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain('ῆς');
    expect(q.ref).toBe('1 John 1:1');
    expect(q.code).toBe('N-GSF');
    expect(q.prompt).toContain('genitive singular');
    expect(q.prompt).toContain('ἀρχή');
  });

  it('draws its wrong endings from other forms of the passage, and leaves the same ending out twice', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const q = buildEnding(genitive, BOTH, mulberry32(seed));
      expect(q).not.toBeNull();
      expect(new Set(q!.options.map((o) => o.normalize('NFD').replace(/[̀-ͯ]/g, ''))).size).toBe(4);
      expect(q!.options.filter((o) => o === q!.right)).toHaveLength(1);
    }
  });

  it('gives none for an idea whose forms share no stem with their dictionary form (the article)', () => {
    expect(buildEnding(ideaOf('article'), [jn1], mulberry32(1))).toBeNull();
  });
});

describe('a tap-the-form question', () => {
  it('names terms of the right word so that exactly one word of the verse has them all', () => {
    for (const id of ['case-dative', 'case-genitive', 'preposition', 'pronoun', 'tense-aorist', 'mood-participle', 'article']) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const q = buildTapForm(ideaOf(id), BOTH, mulberry32(seed));
        expect(q, id).not.toBeNull();
        const verse = BOTH.flatMap((c) => c.verses.map((v) => ({ ref: `${c.book} ${c.chapter}:${v.n}`, v }))).find((x) => x.ref === q!.ref)!.v;
        expect(q!.options).toEqual(verse.g.map((g) => g.t));
        const named = [...termsOf(q!.code!)].filter((t) => new RegExp(`(^|\\s)${t}($|\\s)`).test(q!.prompt));
        expect(named.length, `${id}: ${q!.prompt}`).toBeGreaterThan(0);
        const holders = verse.g.filter((g) => named.every((t) => termsOf(g.p).has(t)));
        expect(holders.map((g) => g.t), `${id}: ${q!.prompt}`).toEqual([q!.right]);
        expect(q!.options.filter((o) => o === q!.right)).toHaveLength(1);
        expect(ideaOf(id).terms.length === 0 || ideaOf(id).terms.some((t) => named.includes(t)), `${id}: ${q!.prompt}`).toBe(true);
      }
    }
  });

  // mw-5r3p30.379: the article is taught after the dative, so the dative is asked by the noun only; τοῖς is never the answer to a dative question
  it('does not leave τοῖς and ὀφθαλμοῖς both to tap in 1 John 1:1: it names the noun, and never the article, which the dative comes before', () => {
    const dative = ideaOf('case-dative');
    const asked = new Map<string, string>();
    for (let seed = 1; seed <= 400; seed += 1) {
      const q = buildTapForm(dative, [jn1], mulberry32(seed));
      if (q?.ref === '1 John 1:1') asked.set(q.prompt, q.right);
    }
    expect(asked.get('Tap the dative noun')).toBe('ὀφθαλμοῖς');
    expect([...asked.keys()].filter((p) => !/noun/.test(p))).toEqual([]);
    expect([...asked.values()]).not.toContain('τοῖς');
  });

  it('is the same question twice for the same seed', () => {
    const idea = ideaOf('case-genitive');
    expect(buildTapForm(idea, BOTH, mulberry32(9))).toEqual(buildTapForm(idea, BOTH, mulberry32(9)));
    expect(buildEnding(idea, BOTH, mulberry32(9))).toEqual(buildEnding(idea, BOTH, mulberry32(9)));
    expect(buildIdeaQuestion(idea, BOTH, mulberry32(9))).toEqual(buildIdeaQuestion(idea, BOTH, mulberry32(9)));
  });

  it('names a tense, a voice or a mood for a verb idea', () => {
    const q = buildTapForm(ideaOf('tense-aorist'), [rom8], mulberry32(3));
    expect(q).not.toBeNull();
    expect(q!.prompt).toContain('aorist');
    expect(termsOf(rom8.verses.flatMap((v) => v.g).find((g) => g.t === q!.right)!.p).has('aorist')).toBe(true);
  });
});

// mw-svw421.38: a tap-form prompt names the word's own features, never the possessor's number of ἡμέτερος or a parsing suffix such as 'negative'
const FEATURE_VALUES: Record<string, string[]> = {
  number: ['singular', 'plural'],
  case: ['nominative', 'genitive', 'dative', 'accusative', 'vocative'],
  gender: ['masculine', 'feminine', 'neuter'],
  person: ['1st person', '2nd person', '3rd person'],
  tense: ['present', 'imperfect', 'future', 'aorist', 'perfect', 'pluperfect'],
  voice: ['active', 'middle', 'passive', 'middle or passive', 'middle deponent', 'passive deponent', 'middle or passive deponent', 'impersonal active', 'no voice'],
  mood: ['indicative', 'imperative', 'subjunctive', 'optative', 'infinitive', 'participle', 'imperative-sense participle'],
};

/** The grammar terms a tap-form prompt names, and its part of speech when it names one ('Tap the dative noun'; 'Tap the word that is ...' has none). */
function promptTerms(prompt: string): { features: string[]; pos: string | null } {
  const words = prompt.startsWith('Tap the word that is ') ? prompt.slice('Tap the word that is '.length) : prompt.slice('Tap the '.length);
  const terms = parseSegments(words).flatMap((s) => (s.term ? [s.term] : []));
  if (prompt.startsWith('Tap the word that is ')) return { features: terms, pos: null };
  return { features: terms.slice(0, -1), pos: terms[terms.length - 1] ?? null };
}

function badPrompt(prompt: string, idea: GrammarIdea): string | null {
  const { features } = promptTerms(prompt);
  for (const [feature, values] of Object.entries(FEATURE_VALUES)) {
    const named = features.filter((t) => values.includes(t));
    if (named.length > 1) return `names two values of ${feature}`;
  }
  const known = Object.values(FEATURE_VALUES).flat();
  // the idea's own terms are asked as they are: 'Tap the word that is negative', 'Tap the possessor possessive pronoun'
  const stray = features.filter((t) => !known.includes(t) && !idea.terms.includes(t));
  return stray.length > 0 ? `names ${stray.join(', ')}, which is no case, number, gender, person, tense, voice or mood` : null;
}

describe('a tap-the-form prompt names one value of each feature (mw-svw421.38)', () => {
  it('never holds both singular and plural, two cases or the word negative over 1 John 1, for the number, case and gender ideas', () => {
    for (const id of ['number-plural', 'number-singular', 'case-nominative', 'case-genitive', 'gender-feminine']) {
      for (let seed = 1; seed <= 60; seed += 1) {
        const q = buildTapForm(ideaOf(id), [jn1], mulberry32(seed));
        if (!q) continue;
        expect(q.prompt, `${id} seed ${seed}`).not.toMatch(/singular.*plural|plural.*singular|negative/);
        const cases = FEATURE_VALUES.case.filter((c) => q.prompt.includes(c));
        expect(cases.length, `${id} seed ${seed}: ${q.prompt}`).toBeLessThanOrEqual(1);
        expect(badPrompt(q.prompt, ideaOf(id)), q.prompt).toBeNull();
      }
    }
  });

  it('does not ask ἡμετέρα of 1 John 1:3 (S-1PNSF, a singular word with a plural possessor) as the plural', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const q = buildTapForm(ideaOf('number-plural'), [jn1], mulberry32(seed));
      if (q?.ref === '1 John 1:3') expect(q.right, q.prompt).not.toBe('ἡμετέρα');
    }
  });

  it('holds over every chapter of the data and every idea of the ladder', () => {
    const bad: string[] = [];
    for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const file of readdirSync(`public/data/${book.name}`)) {
        if (!file.endsWith('.json')) continue;
        const chapter = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Chapter;
        if (!Array.isArray(chapter.verses)) continue;
        for (const idea of LADDER) {
          for (const seed of [1, 2]) {
            const q = buildTapForm(idea, [chapter], mulberry32(seed));
            const why = q && badPrompt(q.prompt, idea);
            if (why) bad.push(`${idea.id} ${q.ref}: ${q.prompt} (${why})`);
          }
        }
      }
    }
    expect(bad.slice(0, 20)).toEqual([]);
  }, 600_000);
});

describe('a letter, its sound and the stress', () => {
  it('offers four glyphs for beta with β among them, named or by its sound', () => {
    const beta = ideaOf('letter-beta');
    const named = seedWhere((s) => buildLetter(beta, mulberry32(s)), (q) => q.prompt.includes('Beta'));
    const sounded = seedWhere((s) => buildLetter(beta, mulberry32(s)), (q) => q.prompt.includes('sounds like'));
    for (const q of [named, sounded]) {
      expect(q.kind).toBe('letter');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      // the small letter or the capital (mw-86e9r1.11): four glyphs of one form
      expect(['β', 'Β']).toContain(q.right);
      expect(q.options).toContain(q.right);
    }
    const forms = new Set<string>();
    for (let seed = 1; seed <= 60; seed += 1) forms.add(buildLetter(beta, mulberry32(seed)).right);
    expect(forms).toEqual(new Set(['β', 'Β']));
  });

  it('never offers a letter that sounds the same as the right one (η, ι and υ are all ee)', () => {
    const eta = ideaOf('letter-eta');
    for (let seed = 1; seed <= 60; seed += 1) {
      const q = buildSound(eta, mulberry32(seed));
      expect(q.kind).toBe('sound');
      const capital = q.say === 'Η';
      expect(q.say).toBe(capital ? 'Η' : 'η');
      expect(q.options).toHaveLength(4);
      expect(q.options).not.toContain(capital ? 'Ι' : 'ι');
      expect(q.options).not.toContain(capital ? 'Υ' : 'υ');
      expect(q.options).toContain(q.say);
    }
  });

  it('marks the first syllable of λόγος as stressed', () => {
    const q = seedWhere((s) => buildStress(ideaOf('accents'), [jn1], mulberry32(s)), (x) => x.form === 'λόγου');
    expect(q.kind).toBe('stress');
    expect(q.options.indexOf(q.right)).toBe(0);
    expect(q.options.length).toBeGreaterThanOrEqual(2);
    expect(new Set(q.options).size).toBe(q.options.length);
    expect(q.say).toBe('λόγου');
  });
});

describe('every idea of the ladder', () => {
  it('yields a question over 1 John 1 and Romans 8 without throwing, with its right answer among its options', () => {
    for (const idea of LADDER) {
      for (const seed of [1, 2, 3]) {
        const q = buildIdeaQuestion(idea, BOTH, mulberry32(seed));
        expect(q.ideaId, idea.id).toBe(idea.id);
        expect(q.prompt.length, idea.id).toBeGreaterThan(0);
        expect(q.options, idea.id).toContain(q.right);
        expect(new Set(q.options).size >= 2, idea.id).toBe(true);
      }
    }
  });

  it('still yields a question when the passage is empty', () => {
    for (const idea of LADDER) expect(buildIdeaQuestion(idea, [], mulberry32(1)).options).toContain(buildIdeaQuestion(idea, [], mulberry32(1)).right);
  });

  it('asks a letter idea as a letter or a sound, a case as an ending or a tap, accents as the stress', () => {
    const kinds = (id: string) => new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => buildIdeaQuestion(ideaOf(id), BOTH, mulberry32(s)).kind));
    expect([...kinds('letter-alpha')].sort()).toEqual(['letter', 'sound']);
    expect([...kinds('case-genitive')].sort()).toEqual(['ending', 'tap-form']);
    expect([...kinds('accents')]).toEqual(['stress']);
    expect([...kinds('breathings')]).toEqual(['breathing']);
    expect([...kinds('preposition')]).toEqual(['tap-form']);
  });
});

describe('a meaning question: What does this say?', () => {
  const genitive = ideaOf('case-genitive');
  const verses = jn1.verses;
  /** every English chunk of 1 John 1 as written, and the clauses (two to four chunks in a row) read as one */
  const chunkTexts = new Set(verses.flatMap((v) => v.e.map((c) => c.t.trim())));
  const clauseTexts = new Set(
    verses.flatMap((v) => [2, 3, 4].flatMap((n) => v.e.flatMap((_, i) => (v.e.slice(i, i + n).length === n ? [v.e.slice(i, i + n).map((c) => c.t.trim()).join(' ')] : [])))),
  );
  const build = (seed: number) => buildMeaning(genitive, [jn1], mulberry32(seed));
  const all = Array.from({ length: 120 }, (_, i) => build(i + 1)).filter((q): q is GrammarQuestion => q !== null);
  const chunkQuestions = all.filter((q) => chunkTexts.has(q.right));
  const clauseQuestions = all.filter((q) => !chunkTexts.has(q.right));

  it('asks the Greek of a chunk with a genitive, and the chunk English among four distinct chunks of the verse', () => {
    const q = all.find((x) => x.ref === '1 John 1:1' && x.form === 'ἀρχῆς')!;
    expect(q.right).toBe('the beginning,');
    expect(q.kind).toBe('meaning');
    expect(q.prompt).toBe('What does this say?');
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(4);
    expect(q.options).toContain(q.right);
    for (const o of q.options) expect(chunkTexts.has(o), o).toBe(true);
    expect(q.ref).toMatch(/^1 John 1:\d+$/);
    expect(q.say).toBe(q.form);
    expect(q.marked).toEqual(q.form!.split(' '));
    expect(q.facet?.id).toBe('says');
  });

  it('gives a chunk question for the form of the verse, its right the English of the chunk that holds a genitive', () => {
    expect(chunkQuestions.length).toBeGreaterThan(20);
    for (const q of chunkQuestions) {
      const verse = verses.find((v) => `1 John 1:${v.n}` === q.ref)!;
      const chunk = verse.e.find((c) => c.t.trim() === q.right && c.g.map((i) => verse.g[i].t).join(' ') === q.form)!;
      expect(chunk, q.ref).toBeDefined();
      expect(chunk.g.some((i) => verse.g[i].p === q.code), q.ref).toBe(true);
      expect(termsOf(q.code!).has('genitive'), q.code).toBe(true);
    }
  });

  it('gives the same question for the same seed', () => {
    for (const seed of [1, 7, 42]) expect(build(seed)).toEqual(build(seed));
  });

  it('draws a clause of two to four chunks, with the form of those chunks and their English run', () => {
    expect(clauseQuestions.length).toBeGreaterThan(5);
    for (const q of clauseQuestions) {
      expect(clauseTexts.has(q.right), q.right).toBe(true);
      expect(q.options).toHaveLength(4);
      for (const o of q.options) expect(clauseTexts.has(o), o).toBe(true);
      const verse = verses.find((v) => `1 John 1:${v.n}` === q.ref)!;
      const runs = [2, 3, 4].flatMap((n) => verse.e.flatMap((_, i) => (verse.e.slice(i, i + n).length === n ? [verse.e.slice(i, i + n)] : [])));
      const run = runs.find((chunks) => chunks.map((c) => c.t.trim()).join(' ') === q.right && [...new Set(chunks.flatMap((c) => c.g))].sort((a, b) => a - b).map((i) => verse.g[i].t).join(' ') === q.form);
      expect(run, `${q.ref} ${q.right}`).toBeDefined();
    }
  });

  it('lends the common English of the passage when the verse and its neighbours have too few chunks', () => {
    const verse1 = jn1.verses.find((v) => v.n === 1)!;
    // a verse of two chunks alone in its chapter: its own chunks cannot make four choices, the rest of the passage lends
    const lone: Chapter = { ...jn1, verses: [{ ...verse1, e: verse1.e.filter((c) => c.g.some((i) => /-G[SP]/.test(verse1.g[i].p))).slice(0, 2) }] };
    expect(buildMeaning(genitive, [lone], mulberry32(1))).toBeNull();
    const q = buildMeaning(genitive, [lone, jn1], mulberry32(1))!;
    expect(q.options).toHaveLength(4);
    for (const o of q.options) expect(chunkTexts.has(o), o).toBe(true);
  });

  it('is null when the passage has no form of the idea', () => {
    expect(buildMeaning(genitive, [], mulberry32(1))).toBeNull();
    const noDative: Chapter = { ...jn1, verses: jn1.verses.filter((v) => !v.g.some((w) => ideasOf(w.p).includes('case-dative'))) };
    expect(buildMeaning(ideaOf('case-dative'), [noDative], mulberry32(1))).toBeNull();
  });

  it('holds a graded draw to the easiest third of the verses at his level', () => {
    // he knows the words of verses 1 to 6 only, so those are at his level (half their words known or more), ranked by their score and Greek length
    const known = new Set(jn1.verses.filter((v) => v.n <= 6).flatMap((v) => v.g.map((w) => w.l.normalize('NFC'))));
    const graded = gradedVerses([jn1], () => true, known);
    const holdsGenitive = (n: number) => jn1.verses.find((v) => v.n === n)!.g.some((w) => ideasOf(w.p).includes('case-genitive') && w.e !== undefined);
    const eligible = graded.filter((g) => g.atLevel && holdsGenitive(g.verse));
    expect(eligible.length).toBeGreaterThan(2);
    const third = new Set(eligible.slice(0, Math.ceil(eligible.length / 3)).map((g) => `1 John 1:${g.verse}`));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80; seed += 1) {
      const q = buildMeaning(genitive, [jn1], mulberry32(seed), graded);
      if (q) {
        expect(third.has(q.ref!), `${q.ref} seed ${seed}`).toBe(true);
        seen.add(q.ref!);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('is drawn by buildIdeaQuestion for a word idea only when the graded verses are handed over', () => {
    const graded = gradedVerses([jn1], () => true, new Set());
    const kinds = new Set(Array.from({ length: 40 }, (_, i) => buildIdeaQuestion(genitive, [jn1], mulberry32(i + 1), undefined, undefined, undefined, graded).kind));
    expect([...kinds].sort()).toEqual(['ending', 'meaning', 'tap-form']);
    const plain = new Set(Array.from({ length: 40 }, (_, i) => buildIdeaQuestion(genitive, [jn1], mulberry32(i + 1)).kind));
    expect([...plain].sort()).toEqual(['ending', 'tap-form']);
  });
});

describe('an ending question and the movable ν of ἐστίν and a dative plural (mw-86e9r1.29)', () => {
  const PLAIN = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const SEEDS = Array.from({ length: 80 }, (_, i) => i + 1);
  const asked = LADDER.flatMap((idea) => SEEDS.map((seed) => buildEnding(idea, [rom8], mulberry32(seed)))).filter((q): q is GrammarQuestion => q !== null);

  it('brackets the ν of στιν, no choice anywhere a bare στιν or στίν', () => {
    expect(asked.length).toBeGreaterThan(0);
    for (const q of asked) for (const o of [q.right, ...q.options]) expect(PLAIN(o), `${q.form} ${o}`).not.toMatch(/στιν$/);
  });

  it('asks ἔ_ of εἰμί for στι(ν)', () => {
    const q = asked.find((x) => x.form === 'ἔ_' && x.prompt.endsWith('of εἰμί') && x.code?.startsWith('V-PAI-3S'));
    expect(q, 'no ἐστίν asked').toBeDefined();
    expect(q!.right).toBe('στι(ν)');
    expect(q!.options).toContain('στι(ν)');
  });

  it('brackets the ν of a dative plural: πᾶσ_ is asked for ι(ν), and no dative plural ending is a bare ιν', () => {
    const dativePlural = asked.filter((q) => q.prompt.includes('dative plural'));
    expect(dativePlural.length).toBeGreaterThan(0);
    for (const q of dativePlural) expect(PLAIN(q.right), `${q.form} ${q.right}`).not.toMatch(/ιν$/);
    const pas = asked.find((x) => x.form === 'πᾶσ_' && x.code === 'A-DPN');
    expect(pas, 'no πᾶσιν asked').toBeDefined();
    expect(pas!.right).toBe('ι(ν)');
  });
});

describe('a sentence idea drilled on its verses (mw-br588b.3)', () => {
  const hina = ideaOf('clause-hina');
  const agreement = ideaOf('agreement');
  const verseOf = (q: GrammarQuestion, chapter: Chapter) => chapter.verses.find((v) => q.ref!.endsWith(`:${v.n}`))!;

  it('asks what ἵνα is doing in 1 John 1: its words and its verb marked, the clause titled among four different uses', () => {
    const q = buildUse(hina, [jn1], mulberry32(1))!;
    expect(q.kind).toBe('use');
    expect(q.ideaId).toBe('clause-hina');
    expect(q.prompt).toBe('What is ἵνα doing here?');
    expect(q.right).toBe('A clause with ἵνα');
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain(q.right);
    const verse = verseOf(q, jn1);
    expect(q.words).toEqual(verse.g.map((w) => w.t));
    const marked = q.markedAt!.map((i) => verse.g[i]);
    expect(marked.map((w) => w.l)).toContain('ἵνα');
    expect(marked.some((w) => w.p.startsWith('V-') && w.p.includes('S'))).toBe(true);
    expect(marked).toHaveLength(2);
    expect(usesOf(verse).some((u) => u.id === 'clause-hina' && u.words.join() === q.markedAt!.join())).toBe(true);
    for (const o of q.options) expect(LADDER.some((i) => i.tier === 'sentences' && i.title === o), o).toBe(true);
  });

  it('asks the verse of 1 John 1:3 for some seed, and gives the same question for the same seed', () => {
    const q = seedWhere((s) => buildUse(hina, [jn1], mulberry32(s)), (x) => x.ref === '1 John 1:3');
    expect(q.words![q.markedAt![0]]).toBe('ἵνα');
    for (const seed of [1, 7, 42]) expect(buildUse(hina, [jn1], mulberry32(seed))).toEqual(buildUse(hina, [jn1], mulberry32(seed)));
  });

  it('asks "What are these words doing?" for a use with no word of its own to name', () => {
    const q = seedWhere((s) => buildUse(agreement, BOTH, mulberry32(s)), () => true);
    expect(q.prompt).toBe('What are these words doing?');
    expect(q.right).toBe('Words that agree');
  });

  it('asks the noun a word agrees with in Romans 8: the head is right, the verse\'s words are the options', () => {
    const q = seedWhere((s) => buildTapUse(agreement, [rom8], mulberry32(s)), () => true);
    expect(q.kind).toBe('tap-use');
    expect(q.prompt).toMatch(/^Tap the noun that \S+ agrees with$/);
    const verse = verseOf(q, rom8);
    expect(q.options).toEqual(verse.g.map((w) => w.t));
    expect(verse.g.filter((w) => w.t === q.right)).toHaveLength(1);
    const use = usesOf(verse).find((u) => u.id === 'agreement' && verse.g[u.head!].t === q.right)!;
    expect(use).toBeDefined();
    expect(verse.g[use.head!].p.startsWith('N-')).toBe(true);
    const asked = /^Tap the noun that (\S+) agrees with$/.exec(q.prompt)![1];
    expect(use.words.map((i) => verse.g[i].t)).toContain(asked);
  });

  it('asks the participle that goes with ἐστίν, the participle right', () => {
    const periphrastic = ideaOf('periphrastic');
    const q = seedWhere((s) => buildTapUse(periphrastic, BOTH, mulberry32(s)), () => true);
    expect(q.prompt).toMatch(/^Tap the participle that goes with \S+$/);
    const verse = BOTH.flatMap((c) => c.verses).find((v) => v.g.some((w) => w.t === q.right) && q.options.join() === v.g.map((w) => w.t).join())!;
    expect(verse.g.find((w) => w.t === q.right)!.p).toMatch(/^V-..P/);
  });

  it('gives the same tap-use question for the same seed', () => {
    for (const seed of [1, 7, 42]) expect(buildTapUse(agreement, BOTH, mulberry32(seed))).toEqual(buildTapUse(agreement, BOTH, mulberry32(seed)));
  });

  it('gives null from both for an idea with no use in the passage, and a word idea; buildIdeaQuestion falls to the concept', () => {
    const none: Chapter = { ...jn1, verses: jn1.verses.filter((v) => !usesOf(v).some((u) => u.id === 'clause-hina')) };
    expect(buildUse(hina, [none], mulberry32(1))).toBeNull();
    expect(buildTapUse(hina, [none], mulberry32(1))).toBeNull();
    expect(buildUse(hina, [], mulberry32(1))).toBeNull();
    expect(buildUse(ideaOf('case-genitive'), [jn1], mulberry32(1))).toBeNull();
    expect(buildTapUse(ideaOf('case-genitive'), [jn1], mulberry32(1))).toBeNull();
    expect(buildIdeaQuestion(hina, [none], mulberry32(1)).kind).toBe('concept');
  });

  it('draws a sentence idea as a use by buildIdeaQuestion, and as a tap-use when it has a head (the other when the first cannot be made)', () => {
    const kinds = new Set(Array.from({ length: 40 }, (_, i) => buildIdeaQuestion(agreement, BOTH, mulberry32(i + 1)).kind));
    expect([...kinds].sort()).toEqual(['tap-use', 'use']);
    // ἵνα has a head (the subjunctive), but a use with no head only ever draws the use question
    const postpositive = ideaOf('postpositive');
    const only = new Set(Array.from({ length: 40 }, (_, i) => buildIdeaQuestion(postpositive, BOTH, mulberry32(i + 1)).kind));
    expect([...only]).toEqual(['use']);
  });

  it('hands the marked words of a use to the inference as the forms credited', () => {
    const q = buildUse(hina, [jn1], mulberry32(1))!;
    const forms = q.markedAt!.map((i) => q.words![i]).join(' ');
    expect(formOfQuestion(q)).toBe(forms);
    const t = buildTapUse(agreement, [rom8], mulberry32(1))!;
    expect(formOfQuestion(t)).toBe(t.right);
  });
});

// mw-86e9r1.53: the Greek in a question's prompt is drawn in the Greek face like the Greek on the answer buttons, not in the UI sans around it.
describe('the Greek in a concept card\'s prompt', () => {
  afterEach(cleanup);
  const GREEK = /\p{Script=Greek}+/gu;
  const greekPrompts = LADDER.map((idea) => buildConcept(idea, mulberry32(1))).filter((q) => /\p{Script=Greek}/u.test(q.prompt));

  it('is there to check: some concept card has Greek in its prompt', () => {
    expect(greekPrompts.length).toBeGreaterThan(0);
  });

  it('sits in lang el elements in the Greek face (font-greek), the English around it outside them', () => {
    for (const question of greekPrompts) {
      const view = render(createElement(GrammarCard, { question, mode: 'choice', picked: null, onPick: () => {} }));
      const prompt = view.getByTestId('grammar-prompt');
      const inGreekFace = Array.from(prompt.querySelectorAll('[lang="el"].font-greek'));
      const drawn = inGreekFace.map((el) => el.textContent ?? '').join(' ');
      // every Greek word of the prompt is inside a Greek-face run, and no run holds a word of English
      expect(drawn.match(GREEK)?.join(' '), question.ideaId).toBe(question.prompt.match(GREEK)?.join(' '));
      for (const el of inGreekFace) expect(el.textContent, question.ideaId).not.toMatch(/[A-Za-z]/);
      expect(prompt.className, question.ideaId).not.toContain('font-greek');
      view.unmount();
    }
  });
});
