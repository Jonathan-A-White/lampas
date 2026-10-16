// A full parsing and 'who does what to whom' on graded verses (mw-emk3xt.3): buildParse, buildRoles and their place in buildIdeaQuestion.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { gradedVerses, type GradedVerse } from '../../src/data/grammar/gradedVerses';
import { ideaOf } from '../../src/data/grammar/ladder';
import { buildIdeaQuestion, buildParse, buildRoles } from '../../src/data/grammar/questions';
import { decodeParse, splitParse } from '../../src/data/parseCode';
import { mulberry32 } from '../../src/data/quiz';

const load = (file: string) => JSON.parse(readFileSync(`public/data/${file}.json`, 'utf8')) as Chapter;
const jn1 = load('1jn/1');
const john1 = load('jhn/1');
const rom8 = load('rom/8');

/** The chapters' verses graded as if he had every word and every form: all at level. */
const allKnown = (chapters: Chapter[]): GradedVerse[] =>
  gradedVerses(chapters, () => true, new Set(chapters.flatMap((c) => c.verses.flatMap((v) => v.g.map((w) => w.l.normalize('NFC'))))));

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

describe('a full parsing: buildParse', () => {
  const perfect = ideaOf('tense-perfect');
  // only 1 John 1:1 is at his level
  const verseOne = allKnown([jn1]).filter((g) => g.verse === 1);

  it('gives ἀκηκόαμεν or ἑωράκαμεν for tense-perfect, with steps whose right answers are the code features in buildSteps order', () => {
    const forms = new Set<string>();
    for (const seed of SEEDS) {
      const q = buildParse(perfect, [jn1], mulberry32(seed), verseOne);
      expect(q, `seed ${seed}`).not.toBeNull();
      forms.add(q!.form!);
      expect(q!.kind).toBe('parse');
      expect(q!.prompt).toBe(`Parse ${q!.form}`);
      expect(q!.ref).toBe('1 John 1:1');
      expect(q!.ideaId).toBe('tense-perfect');
      const { pos, features } = splitParse(q!.code!);
      expect(pos).toBe('verb');
      expect(q!.steps!.map((s) => s.id)).toEqual(['pos', 'tense', 'voice', 'mood', 'person+number']);
      expect(q!.steps![0].right).toBe(pos);
      expect(q!.steps![1].right).toBe(features[0].value);
      expect(q!.steps![2].right).toBe(features[1].value);
      expect(q!.steps![3].right).toBe(features[2].value);
      expect(q!.steps![4].right).toBe(`${features[3].value} ${features[4].value}`);
      for (const step of q!.steps!) {
        expect(step.options).toHaveLength(4);
        expect(step.options).toContain(step.right);
      }
      // the whole parsing in plain words is the right answer
      expect(q!.right).toBe(decodeParse(q!.code!));
      expect(q!.options).toEqual([q!.right]);
      expect(q!.lemma).toBe(q!.form === 'ἀκηκόαμεν' ? 'ἀκούω' : 'ὁράω');
    }
    expect([...forms].sort()).toEqual(['ἀκηκόαμεν', 'ἑωράκαμεν']);
  });

  it('is the same question for the same seed', () => {
    expect(buildParse(perfect, [jn1], mulberry32(3), verseOne)).toEqual(buildParse(perfect, [jn1], mulberry32(3), verseOne));
  });

  it('asks nothing without graded verses, or when no verse with such a word is at his level', () => {
    expect(buildParse(perfect, [jn1], mulberry32(1))).toBeNull();
    expect(buildParse(perfect, [jn1], mulberry32(1), [])).toBeNull();
    expect(buildParse(perfect, [jn1], mulberry32(1), verseOne.map((g) => ({ ...g, atLevel: false })))).toBeNull();
    // a verse with no perfect in it
    expect(buildParse(perfect, [jn1], mulberry32(1), allKnown([jn1]).filter((g) => g.verse === 8))).toBeNull();
  });

  it('never asks a word that is only its part of speech', () => {
    for (const seed of SEEDS) {
      const q = buildParse(ideaOf('verb'), [jn1], mulberry32(seed), allKnown([jn1]));
      expect(splitParse(q!.code!).features.length).toBeGreaterThan(0);
    }
  });
});

describe('who does what to whom: buildRoles', () => {
  // John 1:16 has one finite verb: ἡμεῖς πάντες ἐλάβομεν καὶ χάριν ἀντὶ χάριτος
  const sixteen = allKnown([john1]).filter((g) => g.verse === 16);
  const words = john1.verses.find((v) => v.n === 16)!.g.map((w) => w.t);
  const prompts = new Map<string, string>();
  for (const seed of SEEDS) {
    const q = buildRoles(ideaOf('case-nominative'), [john1], mulberry32(seed), sixteen);
    if (q) prompts.set(q.prompt, q.right);
  }

  it('gives the subject, the verb and the object as right for the three prompts, over the verse words', () => {
    expect(prompts.get('Tap the one who does it')).toBe('ἡμεῖς');
    expect(prompts.get('Tap what is done')).toBe('ἐλάβομεν');
    expect(prompts.get('Tap what it is done to')).toBe('χάριν');
    expect(prompts.size).toBe(3);
    const q = buildRoles(ideaOf('case-nominative'), [john1], mulberry32(1), sixteen)!;
    expect(q.kind).toBe('roles');
    expect(q.options).toEqual(words);
    expect(q.options).toContain(q.right);
    expect(q.ref).toBe('John 1:16');
    expect(q.ideaId).toBe('case-nominative');
  });

  it('asks the object for case-accusative and the verb for verb, and nothing for an idea the verse does not use', () => {
    expect(buildRoles(ideaOf('case-accusative'), [john1], mulberry32(1), sixteen)).not.toBeNull();
    expect(buildRoles(ideaOf('verb'), [john1], mulberry32(1), sixteen)).not.toBeNull();
    expect(buildRoles(ideaOf('case-genitive'), [john1], mulberry32(1), sixteen)).toBeNull();
    expect(buildRoles(ideaOf('person-3rd'), [john1], mulberry32(1), sixteen)).toBeNull(); // ἐλάβομεν is 1st person
    expect(buildRoles(ideaOf('person-1st'), [john1], mulberry32(1), sixteen)).not.toBeNull();
  });

  it('asks nothing without graded verses or when the verse is not at his level', () => {
    expect(buildRoles(ideaOf('case-nominative'), [john1], mulberry32(1))).toBeNull();
    expect(buildRoles(ideaOf('case-nominative'), [john1], mulberry32(1), sixteen.map((g) => ({ ...g, atLevel: false })))).toBeNull();
  });

  it('never chooses a verse with two finite verbs, and gives a subject that is nominative and a verb that is finite', () => {
    const all = [john1, jn1, rom8];
    const graded = allKnown(all);
    const finite = (code: string) => splitParse(code).features.some((f) => f.id === 'person');
    let asked = 0;
    for (const idea of ['case-nominative', 'case-accusative', 'verb', 'person-1st', 'person-3rd']) {
      for (const seed of SEEDS) {
        const q = buildRoles(ideaOf(idea), all, mulberry32(seed), graded);
        if (!q) continue;
        asked += 1;
        const verse = all.flatMap((c) => c.verses.map((v) => ({ c, v }))).find(({ c, v }) => `${c.book} ${c.chapter}:${v.n}` === q.ref)!.v;
        expect(verse.g.filter((w) => w.p.startsWith('V-') && finite(w.p)), q.ref).toHaveLength(1);
        const right = verse.g.find((w) => w.t === q.right)!;
        expect(right.t, q.ref).toBe(q.right);
        expect(verse.g.filter((w) => w.t === q.right), q.ref).toHaveLength(1);
        expect(q.code).toBe(right.p);
        if (q.prompt === 'Tap the one who does it') expect(splitParse(right.p).features.find((f) => f.id === 'case')?.value).toBe('nominative');
        if (q.prompt === 'Tap what it is done to') expect(splitParse(right.p).features.find((f) => f.id === 'case')?.value).toBe('accusative');
        if (q.prompt === 'Tap what is done') expect(finite(right.p)).toBe(true);
      }
    }
    expect(asked).toBeGreaterThan(20);
  });
});

describe('parse and roles in buildIdeaQuestion', () => {
  const kinds = (idea: string, chapters: Chapter[], graded: GradedVerse[] | undefined, strong: boolean) =>
    new Set(SEEDS.map((s) => buildIdeaQuestion(ideaOf(idea), chapters, mulberry32(s), undefined, undefined, undefined, graded, strong).kind));

  it('draws a full parsing only for a strong idea, and only with graded verses', () => {
    const graded = allKnown([jn1]);
    expect(kinds('tense-perfect', [jn1], graded, true)).toContain('parse');
    expect(kinds('tense-perfect', [jn1], graded, false)).not.toContain('parse');
    expect(kinds('tense-perfect', [jn1], undefined, true)).not.toContain('parse');
  });

  it('draws who does what to whom for the four ideas, with graded verses', () => {
    const graded = allKnown([john1]);
    for (const idea of ['case-nominative', 'case-accusative', 'verb', 'person-1st']) expect(kinds(idea, [john1], graded, false), idea).toContain('roles');
    expect(kinds('case-nominative', [john1], undefined, false)).not.toContain('roles');
    expect(kinds('case-genitive', [john1], graded, true)).not.toContain('roles');
  });

  it('is unchanged for an idea that gets neither: three kinds in the same rotation', () => {
    expect([...kinds('case-genitive', [jn1], allKnown([jn1]), false)].sort()).toEqual(['ending', 'meaning', 'tap-form']);
  });
});
