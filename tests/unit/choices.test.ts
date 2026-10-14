// The wrong choices of every quiz in Lampas (src/data/choices.ts, mw-i7xe0n.7): near misses of the point an item tests first, then fillers of the same kind.
// The sweep: each kind of item of the five builders (grammar/drillItems.ts, grammar/quickRound.ts, grammar/questions.ts, drill.ts, quiz.ts) offers a near miss
// whenever it has one; NO_NEAR_MISS names the kinds that have none, and why.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { choicesOf, lookAlikesOf, pairMates, wrongChoices } from '../../src/data/choices';
import { buildSteps } from '../../src/data/drill';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { hintTakes } from '../../src/data/grammar/hint';
import { LADDER, ideaOf, itemsOf } from '../../src/data/grammar/ladder';
import { ENCLITIC_USES, MARK_PAIRS } from '../../src/data/grammar/marks';
import { COMPOUND_VERBS, PREPOSITIONS } from '../../src/data/grammar/prepositions';
import {
  buildBreathing,
  buildCompound,
  buildConcept,
  buildEnclitic,
  buildEnding,
  buildIdeaQuestion,
  buildLetter,
  buildMarksChangeWord,
  buildMovable,
  buildPreposition,
  buildPunctuation,
  buildSound,
  buildSoundAlike,
  buildStress,
  buildSubscript,
  buildSyllables,
  buildTapForm,
  type GrammarQuestion,
} from '../../src/data/grammar/questions';
import { quickQuestion } from '../../src/data/grammar/quickRound';
import { SOUND_ALIKE } from '../../src/data/grammar/soundAlike';
import { buildOptions, mulberry32, seedDistractors } from '../../src/data/quiz';
import { pronunciationOf } from '../../src/speech/pronunciation';

const modern = pronunciationOf('modern');
const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const jn1 = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const PASSAGE = [rom8, jn1];
const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

/** The kinds that offer no near miss, each with why: named in the closing comment of mw-i7xe0n.7. */
const NO_NEAR_MISS: Record<string, string> = {
  'movable-nu': 'Which word may take a movable ν: the others are words that never take one, and there is no form of ἐστι(ν) that is wrong',
  'preposition-step-1': "Drill it's first preposition step leaves the other cases out on purpose; its second step asks them",
};

const wrongOf = (q: { options: string[]; right: string }): string[] => q.options.filter((o) => o !== q.right);

/** A question's near misses are among its wrong options. */
function holdsNear(q: Pick<GrammarQuestion, 'options' | 'right' | 'near'>): string[] {
  const near = q.near ?? [];
  for (const n of near) {
    expect(q.options, `${n} is an option`).toContain(n);
    expect(n).not.toBe(q.right);
  }
  return near;
}

describe('choicesOf', () => {
  it('puts the near misses first, then fillers, none twice and none the right one', () => {
    const { wrong, near } = wrongChoices({ right: 'a', near: ['b', 'a', 'b'], fillers: ['a', 'c', 'd', 'e', 'f'] }, mulberry32(1));
    expect(wrong).toHaveLength(3);
    expect(wrong[0]).toBe('b');
    expect(near).toEqual(['b']);
    expect(new Set(wrong).size).toBe(3);
    expect(wrong).not.toContain('a');
  });

  it('keeps no more near misses than places, and takes the last resort only when the rest run short', () => {
    expect(wrongChoices({ right: 'a', near: ['b', 'c', 'd', 'e'] }, mulberry32(1)).wrong).toEqual(['b', 'c', 'd']);
    expect(wrongChoices({ right: 'a', fillers: ['b'], lastResort: ['c', 'd', 'e'] }, mulberry32(1)).wrong).toEqual(['b', 'c', 'd']);
  });

  it('counts two choices with one key as one', () => {
    const { wrong } = wrongChoices({ right: 'ος', near: ['ΟΣ', 'ου'], keyOf: (e) => e.toLowerCase() }, mulberry32(1));
    expect(wrong).toEqual(['ου']);
  });

  it('shuffles the right one in among them', () => {
    const { options, near } = choicesOf({ right: 'a', near: ['b'], fillers: ['c', 'd', 'e'] }, mulberry32(3));
    expect(options).toHaveLength(4);
    expect(options).toContain('a');
    expect(near).toEqual(['b']);
  });

  it('knows the look-alike letters and the pairs that share a letter', () => {
    expect(lookAlikesOf('letter-nu')).toEqual(['letter-upsilon', 'letter-eta']);
    expect(pairMates('αυ', ['αι', 'ει', 'ευ', 'ηυ', 'ου'])).toEqual(['ευ', 'ηυ', 'ου', 'αι']);
  });
});

describe('a Hint keeps the near miss (the Mayor, 2026-10-14)', () => {
  it('takes the far wrong answers first', () => {
    // KHA-rees right; HYA-rees the near miss at place 0
    expect([...hintTakes(['HYA-rees', 'KOZ-mos', 'KHA-rees', 'VEE-vlos'], 'KHA-rees', ['HYA-rees'])].sort()).toEqual([1, 3]);
    // with no near misses it takes the first half, as before
    expect([...hintTakes(['a', 'b', 'c', 'd'], 'd')]).toEqual([0, 1]);
  });
});

describe('drillItems.ts: every kind of a letter, pair and breathing step', () => {
  const nu = drillSteps('letter-nu', { seed: 1, scheme: modern }).flatMap((s) => s.questions);
  const byPrompt = (re: RegExp) => nu.filter((q) => re.test(q.prompt));

  it('a letter by name, by its name, and by its capital: the look-alike (ν beside υ or η) is offered', () => {
    for (const q of [...byPrompt(/called/), ...byPrompt(/^Which letter is/), ...byPrompt(/small letter/)]) {
      const near = holdsNear(q);
      expect(near.length, q.prompt).toBe(1);
      expect([['Upsilon', 'Eta'], ['υ', 'η']].flat(), q.prompt).toContain(near[0]);
    }
  });

  it('a look-alike pair heard: both of the pair are offered', () => {
    const pair = drillSteps('alphabet', { seed: 1, scheme: modern }).flatMap((s) => s.questions).filter((q) => q.kind === 'sound' && q.facet.id === 'pair-nu-upsilon');
    expect(pair.length).toBeGreaterThan(0);
    for (const q of pair) expect(q.options).toEqual(expect.arrayContaining(['ν', 'υ']));
  });

  it('a word read: the word misread by a sound rule it stands on, even in the alphabet (κόσμος beside KOS-mos)', () => {
    const words = drillSteps('alphabet', { seed: 1, scheme: modern }).flatMap((s) => s.questions).filter((q) => q.prompt === 'How is this word said?');
    const kosmos = words.find((q) => q.form === 'κόσμος');
    expect(kosmos).toBeDefined();
    expect(holdsNear(kosmos!)).toContain('KOS-mos');
    expect(kosmos!.rule).toMatch(/^σ before /);
    // a word that stands on no rule (ξένος) has none
    const plain = words.find((q) => q.form === 'ξένος');
    if (plain) expect(plain.near ?? []).toEqual([]);
  });

  it('a pair read: the word misread by its rule (αὐτός beside av-TOS)', () => {
    const au = drillSteps('diphthong-au', { seed: 1, scheme: modern }).flatMap((s) => s.questions).find((q) => q.form === 'αὐτός')!;
    expect(holdsNear(au)).toContain('av-TOS');
  });

  it('a harder breathing: the other breathing', () => {
    for (const q of drillSteps('breathings', { seed: 1 })[1].questions) expect(holdsNear(q)).toEqual(wrongOf(q));
  });
});

describe('quickRound.ts: hear it, see it, the breathing', () => {
  it('hear ν: υ or η beside it; hear αυ: a pair that shares a letter with it', () => {
    for (const seed of SEEDS) {
      const nu = quickQuestion({ id: 'letter-nu', mode: 'hear' }, mulberry32(seed), modern);
      expect(holdsNear(nu).length).toBeGreaterThan(0);
      const au = quickQuestion({ id: 'diphthong-au', mode: 'hear' }, mulberry32(seed), modern);
      const near = holdsNear(au);
      expect(near.length).toBeGreaterThan(0);
      for (const n of near) expect(n.includes('α') || n.includes('υ'), n).toBe(true);
    }
  });

  it('see ν: the sound of the letter it looks like (υ: ee)', () => {
    const q = quickQuestion({ id: 'letter-nu', mode: 'see' }, mulberry32(1), modern);
    expect(holdsNear(q).some((n) => n.startsWith('ee'))).toBe(true);
  });

  it('a breathing: the other one', () => {
    const q = quickQuestion({ id: 'breathing-rough', mode: 'see' }, mulberry32(1), modern);
    expect(holdsNear(q)).toEqual(['Smooth']);
  });
});

describe('questions.ts: every kind', () => {
  const every = (make: (seed: number) => GrammarQuestion | null): GrammarQuestion[] => SEEDS.flatMap((seed) => make(seed) ?? []);

  it("ending: the same word's other ending when the passage has one", () => {
    let found = 0;
    for (const q of every((seed) => buildEnding(ideaOf('case-genitive'), PASSAGE, mulberry32(seed)))) {
      const near = holdsNear(q);
      const lemma = q.prompt.split(' of ').pop()!;
      const others = PASSAGE.flatMap((c) => c.verses.flatMap((v) => v.g)).filter((g) => g.l === lemma && g.p !== q.code);
      if (others.length > 0 && near.length > 0) found += 1;
    }
    expect(found).toBeGreaterThan(0);
  });

  it('tap the form: a word of the verse with all the prompt names but one, when the verse has one', () => {
    const qs = every((seed) => buildTapForm(ideaOf('case-genitive'), PASSAGE, mulberry32(seed)));
    expect(qs.some((q) => holdsNear(q).length > 0)).toBe(true);
  });

  it('letter and sound: the look-alike', () => {
    for (const build of [buildLetter, buildSound]) {
      const qs = every((seed) => build(ideaOf('letter-rho'), mulberry32(seed), modern));
      for (const q of qs) expect(holdsNear(q)).toEqual(['π']);
    }
  });

  it('a pair of vowels or consonants: a pair that shares a letter', () => {
    for (const id of ['diphthongs', 'consonant-pairs']) {
      for (const q of every((seed) => buildIdeaQuestion(ideaOf(id), PASSAGE, mulberry32(seed), undefined, modern))) expect(holdsNear(q).length, q.prompt).toBeGreaterThan(0);
    }
  });

  it('the iota under a letter: the same letter without it; punctuation: the other Greek mark', () => {
    for (const q of every((seed) => buildSubscript(ideaOf('iota-subscript'), mulberry32(seed)))) expect(holdsNear(q)).toEqual([q.right.normalize('NFD')[0]]);
    for (const q of every((seed) => buildPunctuation(ideaOf('punctuation'), mulberry32(seed)))) expect(holdsNear(q)).toEqual([q.right === ';' ? '·' : ';']);
  });

  it("movable letters: the same word's other forms, but the movable ν, which has none", () => {
    for (const q of every((seed) => buildMovable(ideaOf('movable-letters'), mulberry32(seed)))) {
      if (q.facet?.id === 'movable-nu') expect(q.near, NO_NEAR_MISS['movable-nu']).toEqual([]);
      else expect(holdsNear(q).length, q.prompt).toBeGreaterThan(0);
    }
  });

  it('marks that change a word, words that sound alike: the twin', () => {
    const twins = new Set(MARK_PAIRS.flatMap((p) => [p.a.inPhrase, p.b.inPhrase]));
    for (const q of every((seed) => buildMarksChangeWord(ideaOf('marks-change-word'), mulberry32(seed)))) expect(twins.has(holdsNear(q)[0])).toBe(true);
    const alike = new Set(SOUND_ALIKE.flatMap((p) => [p.a.word, p.b.word]));
    for (const q of every((seed) => buildSoundAlike(ideaOf('words-sound-alike'), mulberry32(seed), modern))) {
      const near = holdsNear(q);
      expect(near).toHaveLength(1);
      expect(alike.has(near[0])).toBe(true);
    }
  });

  it('an enclitic: its twin with the other accent (τις beside τίς)', () => {
    for (const q of every((seed) => buildEnclitic(ideaOf('enclitics'), mulberry32(seed)))) {
      const use = ENCLITIC_USES.find((u) => u.right === q.right)!;
      const near = holdsNear(q);
      expect(near.length).toBeGreaterThan(0);
      if (q.right === 'τις') expect(near).toEqual(['τίς']);
      if (q.right === 'μου') expect(near).toEqual(['ἐμοῦ']);
      for (const n of near) expect(use.others).toContain(n);
    }
  });

  it("a preposition asked near: its own other cases' meanings; a compound verb: the verb without its preposition", () => {
    const dia = PREPOSITIONS.find((p) => p.key === 'dia')!;
    const q = buildPreposition(ideaOf('preposition-dia'), mulberry32(1), { case: 'genitive', near: true });
    expect(holdsNear(q)).toEqual(dia.uses.filter((u) => u.case !== 'genitive').map((u) => u.meaning));
    const far = buildPreposition(ideaOf('preposition-dia'), mulberry32(1), { case: 'genitive', near: false });
    expect(far.near, NO_NEAR_MISS['preposition-step-1']).toEqual([]);
    for (const verb of COMPOUND_VERBS) expect(holdsNear(buildCompound(ideaOf('compound-verbs'), mulberry32(1), verb))).toContain(verb.stemMeaning);
  });

  it('stress: the syllables beside the loud one; syllables: one more and one fewer; breathing: the other one', () => {
    for (const q of every((seed) => buildStress(ideaOf('accents'), PASSAGE, mulberry32(seed), modern.respell))) {
      const at = q.options.indexOf(q.right);
      expect(holdsNear(q)).toEqual([q.options[at - 1], q.options[at + 1]].filter(Boolean));
    }
    for (const q of every((seed) => buildSyllables(ideaOf('syllables'), PASSAGE, mulberry32(seed), modern.respell))) {
      for (const n of holdsNear(q)) expect(Math.abs(Number(n) - Number(q.right))).toBe(1);
      expect(q.near!.length).toBeGreaterThan(0);
    }
    for (const q of every((seed) => buildBreathing(ideaOf('breathings'), PASSAGE, mulberry32(seed)))) expect(holdsNear(q)).toEqual(wrongOf(q));
  });

  it('what an idea is: ideas of its own tier', () => {
    const idea = ideaOf('case-genitive');
    for (const q of every((seed) => buildConcept(idea, mulberry32(seed), modern))) {
      const near = holdsNear(q);
      expect(near.length).toBeGreaterThan(0);
      for (const n of near) expect(LADDER.find((i) => i.title === n)!.tier).toBe(idea.tier);
    }
  });

  it('every question of every idea keeps its near misses among its wrong options', () => {
    for (const idea of LADDER) for (const seed of [1, 2, 3]) holdsNear(buildIdeaQuestion(idea, PASSAGE, mulberry32(seed), undefined, modern));
    for (const idea of [...LADDER.slice(0, 40), ...itemsOf('consonant-pairs')]) for (const q of drillSteps(idea.id, { passage: PASSAGE, seed: 2, scheme: modern }).flatMap((s) => s.questions)) holdsNear(q);
  });
});

describe('drill.ts: the Parsing drill', () => {
  it('a tense alone: the tense a reader takes it for (aorist beside imperfect)', () => {
    for (const seed of SEEDS) {
      const [, tense] = buildSteps('V-AAI-3S', mulberry32(seed));
      expect(tense.right).toBe('aorist');
      expect(tense.near).toEqual(['imperfect']);
      expect(tense.options).toContain('imperfect');
    }
  });

  it('a group of features: the same answer with one feature changed', () => {
    for (const seed of SEEDS) {
      const steps = buildSteps('N-GSF', mulberry32(seed));
      for (const step of steps.slice(1)) {
        const right = step.right.split(' ');
        const near = step.near ?? [];
        expect(near.length, step.id).toBeGreaterThan(0);
        for (const n of near) {
          expect(step.options).toContain(n);
          expect(n.split(' ').filter((part, i) => part !== right[i]).length, `${n} vs ${step.right}`).toBe(1);
        }
      }
    }
  });

  it('a part of speech: noun beside adjective', () => {
    expect(buildSteps('N-NSM', mulberry32(1))[0].near).toEqual(['adjective']);
  });
});

describe('quiz.ts: the Quick test', () => {
  it('a gloss: glosses of words of the same part of speech first', () => {
    const pool = seedDistractors();
    const verb = pool.find((d) => d.pos === 'Verb')!;
    const verbs = new Set(pool.filter((d) => d.pos === 'Verb').map((d) => d.gloss));
    for (const seed of SEEDS) {
      const options = buildOptions(verb.gloss, verb.pos, verb.lemma, pool, mulberry32(seed));
      for (const o of options) expect(verbs.has(o), o).toBe(true);
    }
  });
});
