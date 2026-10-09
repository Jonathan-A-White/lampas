// The pure grammar questions (src/data/grammar/questions.ts): a paradigm ending, tap the form, a letter, its sound, the stressed syllable.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import {
  buildEnding,
  buildIdeaQuestion,
  buildLetter,
  buildSound,
  buildStress,
  buildTapForm,
  type GrammarQuestion,
} from '../../src/data/grammar/questions';
import { decodeParse, parseSegments } from '../../src/data/parseCode';
import { mulberry32 } from '../../src/data/quiz';

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

const termsOf = (code: string) => new Set(parseSegments(decodeParse(code)).flatMap((s) => (s.term ? [s.term] : [])));

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

  it('does not leave τοῖς and ὀφθαλμοῖς both to tap in 1 John 1:1: it names the article or the noun as well', () => {
    const dative = ideaOf('case-dative');
    const asked = new Map<string, string>();
    for (let seed = 1; seed <= 400; seed += 1) {
      const q = buildTapForm(dative, [jn1], mulberry32(seed));
      if (q?.ref === '1 John 1:1') asked.set(q.prompt, q.right);
    }
    expect(asked.get('Tap the dative article')).toBe('τοῖς');
    expect(asked.get('Tap the dative noun')).toBe('ὀφθαλμοῖς');
    expect([...asked.keys()].filter((p) => !/article|noun/.test(p))).toEqual([]);
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

describe('a letter, its sound and the stress', () => {
  it('offers four glyphs for beta with β among them, named or by its sound', () => {
    const beta = ideaOf('letter-beta');
    const named = seedWhere((s) => buildLetter(beta, mulberry32(s)), (q) => q.prompt.includes('Beta'));
    const sounded = seedWhere((s) => buildLetter(beta, mulberry32(s)), (q) => q.prompt.includes('sounds like'));
    for (const q of [named, sounded]) {
      expect(q.kind).toBe('letter');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain('β');
      expect(q.right).toBe('β');
    }
  });

  it('never offers a letter that sounds the same as the right one (η, ι and υ are all ee)', () => {
    const eta = ideaOf('letter-eta');
    for (let seed = 1; seed <= 60; seed += 1) {
      const q = buildSound(eta, mulberry32(seed));
      expect(q.kind).toBe('sound');
      expect(q.say).toBe('η');
      expect(q.options).toHaveLength(4);
      expect(q.options).not.toContain('ι');
      expect(q.options).not.toContain('υ');
      expect(q.options).toContain('η');
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
