// Try it on a verse (mw-emk3xt.4): tryItOn picks the easiest verse of the passage at his level that has a form needing the idea and asks three questions on it;
// Review's ending and tap-form questions are drawn from the verses at his level, like the other passage questions.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import type { GrammarLevel } from '../../src/data/db';
import { formPasses } from '../../src/data/grammar/formLevel';
import { easiestWith, gradedVerses, ideaMetBy, needsOfForm } from '../../src/data/grammar/gradedVerses';
import { hasFormOf, tryItOn, TRY_IT_QUESTIONS } from '../../src/data/grammar/ideaSheet';
import { ideaOf, LADDER } from '../../src/data/grammar/ladder';
import { buildEnding, buildIdeaQuestion, buildTapForm, EVERY_TABLE } from '../../src/data/grammar/questions';
import { normaliseLemma } from '../../src/data/lemma';
import { mulberry32 } from '../../src/data/quiz';
import { SEED_WORDS } from '../../src/data/seed-words';

const chapter = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const level = (id: string, at: GrammarLevel['level']): [string, GrammarLevel] => [id, { id, level: at, since: 0, how: 'marked' }];
const known = new Set(
  SEED_WORDS.filter((s) => s.lesson <= 9).flatMap((s) => {
    const { headword, lemmas } = normaliseLemma(s.lemma);
    return [headword, ...lemmas].map((l) => l.normalize('NFC'));
  }),
);
// every idea but the verbs' is solid
const levels = new Map<string, GrammarLevel>(LADDER.map((i) => level(i.id, i.tier === 'verbs' ? 'notYet' : 'solid')));
const passes = (w: GreekWord) => formPasses(w.p, levels, 'solid');
const list = gradedVerses([chapter], passes, known, ideaMetBy(levels, 'solid'));
const verseOf = (n: number) => chapter.verses.find((v) => v.n === n)!;
const genitive = ideaOf('case-genitive');
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

describe('Try it on a verse: tryItOn', () => {
  it('picks the easiest verse at his level that has a form needing the idea', () => {
    const tried = tryItOn(genitive, [chapter], list, passes, new Set(), mulberry32(1))!;
    expect(tried).not.toBeNull();
    expect(tried.verse).toEqual(easiestWith('case-genitive', list, [chapter]));
    expect(verseOf(tried.verse.verse).g.some((w) => needsOfForm(w).includes('case-genitive'))).toBe(true);
    expect(tried.ref).toBe(`1 John 1:${tried.verse.verse}`);
  });

  it('asks the meaning of a chunk with the form first, then the form, then a parsing, all on that verse', () => {
    for (const seed of SEEDS) {
      const tried = tryItOn(genitive, [chapter], list, passes, new Set(), mulberry32(seed))!;
      expect(tried.questions, `seed ${seed}`).toHaveLength(TRY_IT_QUESTIONS);
      expect(tried.questions.map((q) => q.kind)).toEqual(['meaning', 'tap-form', 'parse']);
      for (const q of tried.questions) {
        expect(q.ref).toBe(tried.ref);
        expect(q.ideaId).toBe('case-genitive');
      }
    }
  });

  it('asks the ending of the form when its table is open', () => {
    // every word of the chapter is his, so 1 John 1:3 (a genitive with an ending to blank) is the easiest verse with the form
    const knowsChapter = new Set(chapter.verses.flatMap((v) => v.g.map((w) => w.l.normalize('NFC'))));
    const graded = gradedVerses([chapter], passes, knowsChapter, ideaMetBy(levels, 'solid'));
    const tried = SEEDS.map((seed) => tryItOn(genitive, [chapter], graded, passes, EVERY_TABLE, mulberry32(seed))!);
    expect(tried[0].ref).toBe('1 John 1:3');
    for (const t of tried) expect(t.questions.map((q) => q.kind)).toEqual(['meaning', 'ending', 'parse']);
  });

  it('asks the form by tapping it when no table is open', () => {
    const kinds = new Set(SEEDS.flatMap((seed) => tryItOn(genitive, [chapter], list, passes, new Set(), mulberry32(seed))!.questions.map((q) => q.kind)));
    expect(kinds.has('tap-form')).toBe(true);
    expect(kinds.has('ending')).toBe(false);
  });

  it('is the same questions for the same seed', () => {
    expect(tryItOn(genitive, [chapter], list, passes, new Set(), mulberry32(5))).toEqual(tryItOn(genitive, [chapter], list, passes, new Set(), mulberry32(5)));
  });

  it('asks who does what to whom, not a parsing, when the verse is not at his level and the idea has roles', () => {
    const john1 = JSON.parse(readFileSync('public/data/jhn/1.json', 'utf8')) as Chapter;
    const none = new Map<string, GrammarLevel>(LADDER.map((i) => level(i.id, 'notYet')));
    const nonePass = (w: GreekWord) => formPasses(w.p, none, 'solid');
    const knowsAll = new Set(john1.verses.flatMap((v) => v.g.map((w) => w.l.normalize('NFC'))));
    const graded = gradedVerses([john1], nonePass, knowsAll, ideaMetBy(none, 'solid'));
    const tried = SEEDS.map((seed) => tryItOn(ideaOf('case-nominative'), [john1], graded, nonePass, new Set(), mulberry32(seed))!);
    expect(tried[0].verse.verse).toBe(2);
    for (const t of tried) expect(t.questions.map((q) => q.kind)).toEqual(['meaning', 'tap-form', 'roles']);
  });

  it('is null, and hasFormOf false, for an idea no verse has a form of', () => {
    expect(hasFormOf('tense-future', [chapter])).toBe(false);
    expect(tryItOn(ideaOf('tense-future'), [chapter], list, passes, new Set(), mulberry32(1))).toBeNull();
    expect(hasFormOf('tense-imperfect', [chapter], 5)).toBe(false);
    expect(hasFormOf('tense-imperfect', [chapter], 1)).toBe(true);
    expect(hasFormOf('case-genitive', [chapter])).toBe(true);
  });

  it('keeps to the verse of a verse goal', () => {
    const tried = tryItOn(genitive, [chapter], list, passes, new Set(), mulberry32(1), 1)!;
    expect(tried.verse.verse).toBe(1);
    expect(tried.questions.every((q) => q.ref === '1 John 1:1')).toBe(true);
  });
});

describe('Review asks from verses at his level: ending and tap-form', () => {
  // Romans 8 has verses with no verb at all (8:6, 8:10); 1 John 1 has a finite verb in every verse, so none is ever at level when the verbs are not yet
  const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const knowsAll = new Set(rom8.verses.flatMap((v) => v.g.map((w) => w.l.normalize('NFC'))));
  const romList = gradedVerses([rom8], passes, knowsAll, ideaMetBy(levels, 'solid'));
  const atLevel = new Set(romList.filter((g) => g.atLevel).map((g) => g.verse));
  const romVerse = (n: number) => rom8.verses.find((v) => v.n === n)!;
  const finite = (n: number) => romVerse(n).g.some((w) => /^V-\w+-\w?[123]/.test(w.p));
  const withGenitive = (n: number) => romVerse(n).g.some((w) => needsOfForm(w).includes('case-genitive'));
  const verseOfRef = (ref: string | undefined) => Number(ref!.split(':')[1]);

  it('has verses at his level and none of them has a finite verb; 8:6 is one and has a genitive', () => {
    expect(atLevel.size).toBeGreaterThan(0);
    for (const n of atLevel) expect(finite(n), `Romans 8:${n}`).toBe(false);
    expect(atLevel.has(6)).toBe(true);
    expect(withGenitive(6)).toBe(true);
  });

  it('draws a tap-form on the easiest third of the verses at his level that have the form', () => {
    // every verse of 1 John 1 is at level here; the genitive's easiest third is drawn from, not any verse with one
    const knowsChapter = new Set(chapter.verses.flatMap((v) => v.g.map((w) => w.l.normalize('NFC'))));
    const all = gradedVerses([chapter], () => true, knowsChapter);
    expect(all.every((g) => g.atLevel)).toBe(true);
    const ranked = all.filter((g) => verseOf(g.verse).g.some((w) => needsOfForm(w).includes('case-genitive'))).map((g) => g.verse);
    const third = new Set(ranked.slice(0, Math.ceil(ranked.length / 3)));
    expect(third.size).toBeGreaterThan(0);
    expect(third.size).toBeLessThan(ranked.length);
    const drawn = new Set<number>();
    for (const seed of SEEDS) {
      const q = buildTapForm(genitive, [chapter], mulberry32(seed), all)!;
      expect(q, `seed ${seed}`).not.toBeNull();
      drawn.add(verseOfRef(q.ref));
    }
    expect([...drawn].every((n) => third.has(n)), `drawn ${[...drawn]} third ${[...third]}`).toBe(true);
  });

  it('draws an ending on a verse at his level', () => {
    let drawn = 0;
    for (const seed of SEEDS) {
      const q = buildEnding(genitive, [rom8], mulberry32(seed), EVERY_TABLE, romList);
      if (!q) continue;
      drawn += 1;
      expect(atLevel.has(verseOfRef(q.ref)), `seed ${seed}: ${q.ref}`).toBe(true);
    }
    expect(drawn).toBeGreaterThan(0);
  });

  it('draws every kind of passage question for the genitive on a verse with no finite verb', () => {
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      const q = buildIdeaQuestion(genitive, [rom8], mulberry32(seed), undefined, undefined, EVERY_TABLE, romList);
      kinds.add(q.kind);
      expect(q.ref, `seed ${seed}: ${q.kind}`).toBeDefined();
      expect(q.ref, `seed ${seed}: ${q.kind}`).toBe('Romans 8:6');
      expect(finite(6)).toBe(false);
    }
    // 8:6 has the form of the genitive twice over and no tap can single one out: the tap-form gives way to the next kind
    expect([...kinds].sort()).toEqual(['ending', 'meaning']);
  });

  it('falls back to any verse with the form when none is at his level', () => {
    expect(list.some((g) => g.atLevel)).toBe(false);
    const refs = new Set(SEEDS.map((seed) => buildTapForm(genitive, [chapter], mulberry32(seed), list)?.ref));
    expect(refs.has(undefined)).toBe(false);
    expect(refs.size).toBeGreaterThan(1);
  });

  it('leaves the placement and Drill it as they were: no graded verses, the whole passage', () => {
    const refs = new Set(SEEDS.map((seed) => buildTapForm(genitive, [rom8], mulberry32(seed))!.ref));
    expect([...refs].some((ref) => !atLevel.has(verseOfRef(ref)))).toBe(true);
  });
});
