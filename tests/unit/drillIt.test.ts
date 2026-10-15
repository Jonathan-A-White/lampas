// Drill it, the engine (src/data/grammar/drillIt.ts): the graded steps of one grammar idea with their facets, and the adaptive walk.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import {
  MAX_QUESTIONS,
  answer,
  currentQuestion,
  drillSteps,
  resultOf,
  start,
  type DrillQuestion,
  type DrillWalk,
} from '../../src/data/grammar/drillIt';
import { PAIR_WORD_OF, baseLetters, wordsWith } from '../../src/data/grammar/drillItems';
import { LADDER, ideaOf, itemsOf } from '../../src/data/grammar/ladder';
import type { Level } from '../../src/data/grammar/needs';
import { pronunciationOf } from '../../src/speech/pronunciation';

const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const jn1 = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const PASSAGE = [rom8, jn1];

/** Everything solid: no prerequisite stands in the way. */
const ALL_SOLID = new Map<string, Level>(LADDER.map((i) => [i.id, 'solid']));

function begin(ideaId: string, seed = 1, passage = PASSAGE): DrillWalk {
  const walk = start(ideaId, ALL_SOLID, { passage, seed });
  if ('needs' in walk) throw new Error(`${ideaId} needs ${walk.needs}`);
  return walk;
}

/** Answers every question with `decide` until the walk ends; the questions in the order asked. */
function run(walk: DrillWalk, decide: (q: DrillQuestion, n: number) => { right: boolean; hinted?: boolean }): { walk: DrillWalk; asked: DrillQuestion[] } {
  const asked: DrillQuestion[] = [];
  let state = walk;
  for (let guard = 0; guard < 40 && !state.result; guard += 1) {
    const q = currentQuestion(state)!;
    asked.push(q);
    const { right, hinted = false } = decide(q, asked.length);
    state = answer(state, right, hinted);
  }
  return { walk: state, asked };
}

describe('the steps of an idea', () => {
  it('gives every idea of the ladder at least one step, and every question a facet', () => {
    for (const idea of LADDER) {
      const steps = drillSteps(idea.id, { passage: PASSAGE, seed: 3 });
      expect(steps.length, idea.id).toBeGreaterThanOrEqual(1);
      steps.forEach((s, i) => {
        expect(s.step, idea.id).toBe(i + 1);
        expect(s.questions.length, `${idea.id} step ${s.step}`).toBeGreaterThan(0);
        for (const q of s.questions) {
          expect(q.facet.id, `${idea.id}: ${q.prompt}`).toBeTruthy();
          expect(q.facet.label, `${idea.id}: ${q.prompt}`).toBeTruthy();
          expect(q.options, `${idea.id}: ${q.prompt}`).toContain(q.right);
          // a verse can repeat a word, and the verse's words are what tap-form offers
          if (q.kind !== 'tap-form') expect(new Set(q.options).size, `${idea.id}: ${q.prompt}`).toBe(q.options.length);
          expect(q.step).toBe(s.step);
        }
      });
    }
  });

  it('gives every idea a step with no passage at all', () => {
    for (const idea of LADDER) expect(drillSteps(idea.id).length, idea.id).toBeGreaterThanOrEqual(1);
  });

  it('is the same twice for the same seed', () => {
    expect(drillSteps('case-genitive', { passage: PASSAGE, seed: 5 })).toEqual(drillSteps('case-genitive', { passage: PASSAGE, seed: 5 }));
    expect(drillSteps('alphabet', { seed: 5 })).toEqual(drillSteps('alphabet', { seed: 5 }));
  });

  it('asks a noun idea by what it is, then by spotting it in a verse, then by its ending', () => {
    const steps = drillSteps('noun', { passage: PASSAGE, seed: 2 });
    const first = (s: number) => new Set(steps[s - 1].questions.map((q) => q.facet.id));
    expect(first(1)).toEqual(new Set(['meaning']));
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(new Set(steps[steps.length - 1].questions.map((q) => q.facet.id))).toEqual(new Set(['ending']));
    expect(steps.flatMap((s) => s.questions).some((q) => q.facet.id === 'spot')).toBe(true);
  });

  it('tests no prerequisite as such: a question is about its own idea', () => {
    for (const id of ['noun', 'case-genitive', 'article', 'preposition-dia']) {
      for (const q of drillSteps(id, { passage: PASSAGE, seed: 4 }).flatMap((s) => s.questions)) expect(q.ideaId).toBe(id);
    }
  });
});

describe('the alphabet', () => {
  const steps = drillSteps('alphabet', { seed: 7 });

  it('has five steps: name of a letter, letter of a name, capital to small, heard, a word', () => {
    expect(steps).toHaveLength(5);
    expect(steps[0].questions[0].prompt).toMatch(/called/i);
    expect(steps[1].questions[0].prompt).toMatch(/^Which letter is/);
    expect(steps[2].questions[0].prompt).toMatch(/small letter/);
    expect(steps[3].questions.some((q) => q.kind === 'sound')).toBe(true);
    expect(steps[4].questions[0].prompt).toMatch(/said/i);
  });

  it('asks only about letters, never a grammar question', () => {
    const letterIds = new Set(itemsOf('alphabet').map((i) => i.id));
    for (const q of steps.flatMap((s) => s.questions)) {
      expect(['letter', 'sound'], q.prompt).toContain(q.kind);
      expect(q.ideaId).toBe('alphabet');
      const ids = q.facet.id.startsWith('pair-') ? q.facet.id.slice(5).split('-').map((k) => `letter-${k}`) : [q.facet.id];
      for (const id of ids) expect(letterIds.has(id), `${q.prompt} -> ${q.facet.id}`).toBe(true);
    }
  });

  it('has a facet for each of the 24 letters and one for a look-alike pair such as ν and υ', () => {
    const facets = new Set(steps.flatMap((s) => s.questions.map((q) => q.facet.id)));
    for (const letter of itemsOf('alphabet')) expect(facets.has(letter.id), letter.id).toBe(true);
    expect(facets.has('pair-nu-upsilon')).toBe(true);
    const pair = steps[0].questions.find((q) => q.facet.id === 'pair-nu-upsilon')!;
    expect(pair.facet.label).toBe('ν / υ');
    expect(pair.options).toEqual(expect.arrayContaining(['Nu', 'Upsilon']));
  });

  it('proves it at its top step when every answer is right', () => {
    const { walk, asked } = run(begin('alphabet'), () => ({ right: true }));
    const result = resultOf(walk)!;
    expect(result.proved).toBe(true);
    expect(result.topStep).toBe(5);
    expect(result.edgeStep).toBe(5);
    expect(asked.map((q) => q.step)).toEqual([1, 2, 3, 4, 5, 5]);
    expect(result.weak).toEqual([]);
  });

  it('puts the ν and υ pair in weak when it is missed twice', () => {
    const miss = (q: DrillQuestion) => ({ right: q.facet.id !== 'pair-nu-upsilon' });
    let found: { weak: string[]; asked: DrillQuestion[] } | null = null;
    for (let seed = 1; seed <= 400 && !found; seed += 1) {
      const { walk, asked } = run(begin('alphabet', seed, []), miss);
      if (asked.filter((q) => q.facet.id === 'pair-nu-upsilon').length >= 2) found = { weak: resultOf(walk)!.weak.map((f) => f.id), asked };
    }
    expect(found, 'some seed asks the pair twice').not.toBeNull();
    expect(found!.weak).toContain('pair-nu-upsilon');
  });
});

describe('the other letters, sounds and marks', () => {
  it('asks a pair of vowels by its items, and one letter by itself', () => {
    const facets = new Set(drillSteps('diphthongs', { seed: 1 }).flatMap((s) => s.questions.map((q) => q.facet.id)));
    expect(facets).toEqual(new Set(itemsOf('diphthongs').map((i) => i.id)));
    const one = new Set(drillSteps('letter-nu', { seed: 1 }).flatMap((s) => s.questions.map((q) => q.facet.id)));
    expect(one).toEqual(new Set(['letter-nu']));
  });

  it('asks the breathings by the rough and the smooth', () => {
    const facets = new Set(drillSteps('breathings', { seed: 1 }).flatMap((s) => s.questions.map((q) => q.facet.id)));
    expect(facets).toEqual(new Set(['breathing-rough', 'breathing-smooth']));
  });

  it('grades the syllables by the length of the word', () => {
    const steps = drillSteps('syllables', { passage: PASSAGE, seed: 1 });
    expect(steps.length).toBeGreaterThanOrEqual(2);
    const sizes = steps.map((s) => Math.max(...s.questions.map((q) => Number(q.right))));
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  });
});

describe('the walk', () => {
  it('proves the noun in its top step with two unhinted rights in a row', () => {
    const { walk, asked } = run(begin('noun'), () => ({ right: true }));
    const result = resultOf(walk)!;
    expect(result.ideaId).toBe('noun');
    expect(result.proved).toBe(true);
    expect(result.edgeStep).toBe(result.topStep);
    const top = result.topStep;
    expect(asked.map((q) => q.step)).toEqual([...Array.from({ length: top }, (_, i) => i + 1), top]);
    expect(result.answers).toHaveLength(asked.length);
  });

  it('asks step 2 again after right, right, miss from step 1 (the halfway rule)', () => {
    let state = begin('noun');
    expect(currentQuestion(state)!.step).toBe(1);
    state = answer(state, true, false);
    expect(currentQuestion(state)!.step).toBe(2);
    state = answer(state, true, false);
    expect(currentQuestion(state)!.step).toBe(3);
    state = answer(state, false, false);
    expect(currentQuestion(state)!.step).toBe(2);
  });

  it('finds the edge at once when the step above the one he holds was missed: right at 1, miss at 2, right at 1', () => {
    let state = begin('alphabet');
    state = answer(state, true, false);
    state = answer(state, false, false);
    expect(currentQuestion(state)!.step).toBe(1); // halfway between 1 and 2, rounded down
    state = answer(state, true, false);
    expect(state.result?.ended).toBe('edge');
    expect(state.result?.edgeStep).toBe(1);
  });

  it('goes back by halves, rounded down, and keeps going back while he misses', () => {
    let state = begin('alphabet');
    state = answer(state, true, false);
    state = answer(state, true, false);
    state = answer(state, false, false); // missed 3, held 2: halfway is 2
    expect(currentQuestion(state)!.step).toBe(2);
    state = answer(state, false, false); // missed 2 as well, held 1: halfway is 1
    expect(currentQuestion(state)!.step).toBe(1);
  });

  it('asks the facet just missed again at the easier step', () => {
    let state = begin('alphabet');
    state = answer(state, true, false);
    state = answer(state, true, false);
    const missed = currentQuestion(state)!.facet.id;
    state = answer(state, false, false);
    expect(currentQuestion(state)!.step).toBe(2);
    expect(currentQuestion(state)!.facet.id).toBe(missed);
  });

  it('ends at the edge, with the missed facets in weak, in a seeded run of misses', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const { walk, asked } = run(begin('alphabet', seed), () => ({ right: false }));
      const result = resultOf(walk)!;
      expect(result.ended).toBe('edge');
      expect(result.proved).toBe(false);
      expect(result.edgeStep).toBe(0);
      expect(asked.length).toBeLessThan(MAX_QUESTIONS);
      expect(result.weak.map((f) => f.id).sort()).toEqual([...new Set(asked.map((q) => q.facet.id))].sort());
      expect(result.strong).toEqual([]);
    }
  });

  it('finds the edge between the last right step and the first miss, and names strong and weak facets', () => {
    // right up to step 3, miss at 4, then right at 3 again: edge 3
    const { walk, asked } = run(begin('alphabet', 2), (q) => ({ right: q.step <= 3 }));
    const result = resultOf(walk)!;
    expect(result.ended).toBe('edge');
    expect(result.proved).toBe(false);
    expect(result.edgeStep).toBe(3);
    expect(result.topStep).toBe(5);
    const missed = new Set(asked.filter((q) => q.step > 3).map((q) => q.facet.id));
    expect(new Set(result.weak.map((f) => f.id))).toEqual(missed);
    for (const f of result.strong) expect(missed.has(f.id)).toBe(false);
    expect(result.strong.length).toBeGreaterThan(0);
  });

  it('never counts a hinted right toward proved', () => {
    let state = begin('noun');
    const top = state.steps.length;
    // climb to the top with plain rights
    for (let i = 1; i < top; i += 1) state = answer(state, true, false);
    expect(currentQuestion(state)!.step).toBe(top);
    state = answer(state, true, false); // one unhinted right at the top
    state = answer(state, true, true); // a hinted right: the streak is broken
    expect(state.result).toBeNull();
    state = answer(state, true, false);
    expect(state.result).toBeNull();
    state = answer(state, true, false);
    expect(resultOf(state)!.proved).toBe(true);
  });

  it('does not move up on a hinted right, and does not count it as right', () => {
    let state = begin('noun');
    state = answer(state, true, true);
    expect(state.step).toBe(1);
    expect(state.asked[0]).toMatchObject({ right: true, hinted: true });
    const result = resultOf(run(state, () => ({ right: true })).walk)!;
    expect(result.answers[0].hinted).toBe(true);
    // a hinted right counts as no right: its facet is not strong from that answer alone
    const first = result.answers[0].facet.id;
    const unhintedRights = result.answers.filter((a) => a.facet.id === first && a.right && !a.hinted).length;
    expect(result.strong.some((f) => f.id === first)).toBe(unhintedRights > 0);
  });

  it('stops at 14 questions', () => {
    const { walk, asked } = run(begin('noun'), () => ({ right: true, hinted: true }));
    expect(asked).toHaveLength(MAX_QUESTIONS);
    expect(MAX_QUESTIONS).toBe(14);
    const result = resultOf(walk)!;
    expect(result.ended).toBe('limit');
    expect(result.proved).toBe(false);
  });

  it('asks no question twice in a row and keeps to the step it chose', () => {
    const { asked } = run(begin('alphabet', 9), (_q, n) => ({ right: n % 3 !== 0 }));
    for (let i = 1; i < asked.length; i += 1) expect(asked[i].key).not.toBe(asked[i - 1].key);
  });

  it('does not change a walk that is over', () => {
    const { walk } = run(begin('noun'), () => ({ right: true }));
    expect(answer(walk, false, false)).toBe(walk);
    expect(currentQuestion(walk)).toBeNull();
  });
});

describe('the foundation', () => {
  it('returns the lowest prerequisite that is not solid instead of a walk', () => {
    const levels = new Map<string, Level>(ALL_SOLID);
    levels.set('number-singular', 'frontier');
    levels.set('noun', 'notYet');
    const got = start('number-plural', levels, { passage: PASSAGE });
    expect(got).toEqual({ needs: 'number-singular' });
    const several = new Map<string, Level>(ALL_SOLID);
    several.set('case-genitive', 'frontier');
    several.set('case-nominative', 'frontier');
    expect(start('case-dative', several, { passage: PASSAGE })).toEqual({ needs: 'case-genitive' });
    expect(start('case-dative', ALL_SOLID, { passage: PASSAGE })).not.toHaveProperty('needs');
  });

  it('counts a prerequisite with no level as not solid, but not the group an item belongs to', () => {
    expect(start('noun', new Map(), {})).toEqual({ needs: 'breathings' });
    expect(start('letter-nu', new Map(), {})).not.toHaveProperty('needs');
    expect(start('diphthong-ou', new Map(), {})).not.toHaveProperty('needs');
    expect(start('alphabet', new Map(), {})).not.toHaveProperty('needs');
  });

  it('is pure: drillIt.ts imports neither Dexie nor React', () => {
    for (const file of ['src/data/grammar/drillIt.ts', 'src/data/grammar/drillItems.ts']) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/from ['"](dexie|react|react-dom|dexie-react-hooks)/);
      expect(source, file).not.toMatch(/repositories|db['"]/);
    }
  });
});

describe('the words a step reads', () => {
  it('has a word for every letter, and a word that holds each pair', () => {
    for (const letter of itemsOf('alphabet')) expect(wordsWith(letter.glyphs![0]).length, letter.id).toBeGreaterThan(0);
    for (const item of [...itemsOf('diphthongs'), ...itemsOf('consonant-pairs')]) {
      expect(baseLetters(PAIR_WORD_OF[item.id] ?? ''), item.id).toContain(baseLetters(item.pair!));
    }
  });

  it('asks the breathing of a harder word as the word has it', () => {
    const hard = drillSteps('breathings', { seed: 1 })[1].questions;
    expect(hard.find((q) => q.form === 'ῥῆμα')?.right).toBe('Rough');
    expect(hard.find((q) => q.form === 'αὐτός')?.right).toBe('Smooth');
  });
});

// His Chi drill (mw-i7xe0n.7, 2026-10-14): 'How is this word said?' offered χάρις against other words (VEE-vlos, KOZ-mos, ee-OS), so the first letter alone
// answered it and the hard kh against the soft hy was never drilled. A sound the scheme changes by the next letter is drilled on both sides of its rule, the
// word misread by the rule is a wrong choice, a wrong pick names the rule, and the idea is proved only when both sides were answered right.
describe('a sound that changes by the next letter', () => {
  const modern = pronunciationOf('modern');
  const reads = (ideaId: string, seed = 1): DrillQuestion[] =>
    drillSteps(ideaId, { seed, scheme: modern }).flatMap((s) => s.questions).filter((q) => q.prompt === 'How is this word said?');
  const wrong = (q: DrillQuestion): string[] => q.options.filter((o) => o !== q.right);

  it('reads χάρις against HYA-rees and χεῖρες against KHEE-res in the Chi drill', () => {
    const qs = reads('letter-chi');
    const hard = qs.find((q) => q.form === 'χάρις');
    const soft = qs.find((q) => q.form === 'χεῖρες');
    expect(hard, 'χάρις is read').toBeDefined();
    expect(hard!.right).toBe('KHA-rees');
    expect(wrong(hard!)).toContain('HYA-rees');
    expect(soft, 'χεῖρες is read').toBeDefined();
    expect(soft!.right).toBe('HYEE-res');
    expect(wrong(soft!)).toContain('KHEE-res');
  });

  it('names the rule for a wrong pick: χ before ε, ι, η is soft, hy', () => {
    const soft = reads('letter-chi').find((q) => q.form === 'χεῖρες')!;
    expect(soft.rule).toMatch(/^χ before ε, ι, η, .* is soft: hy/);
    expect(reads('letter-chi').find((q) => q.form === 'χάρις')!.rule).toMatch(/^χ before α, ο, .* is hard: kh/);
  });

  it('is not proved until a word on each side was answered right', () => {
    // right on everything but the soft side: never proved
    const { walk } = run(begin('letter-chi', 3, []), (q) => ({ right: !(q.facet.id === 'letter-chi:soft') }));
    expect(resultOf(walk)!.proved).toBe(false);
    // right on everything: proved, with both sides among the answers right
    const all = run(begin('letter-chi', 3, []), () => ({ right: true }));
    const result = resultOf(all.walk)!;
    expect(result.proved).toBe(true);
    const sides = new Set(result.answers.filter((a) => a.right && !a.hinted).map((a) => a.facet.id));
    expect(sides).toContain('letter-chi:hard');
    expect(sides).toContain('letter-chi:soft');
  });

  it.each((modern.soundRules ?? []).map((r) => [r.ideaId, r] as const))('%s: both sides drilled, the word misread by the rule offered', (ideaId, rule) => {
    const qs = drillSteps(ideaId, { seed: 1, scheme: modern }).flatMap((s) => s.questions);
    for (const side of rule.sides) {
      const own = qs.filter((q) => q.facet.id === `${ideaId}:${side.id}`);
      if (side.words.length === 0) {
        expect(own, `${ideaId} ${side.id} has no word`).toEqual([]);
        continue;
      }
      expect(own.length, `${ideaId} ${side.id} is drilled`).toBeGreaterThan(0);
      for (const q of own) {
        expect(rule.sideOf(q.form!), q.form).toBe(side.id);
        expect(wrong(q), q.form).toContain(rule.misread(q.form!));
        expect(q.rule, q.form).toBe(side.line);
      }
    }
  });
});

// His Psi drill (mw-i7xe0n.8, 2026-10-14): 'How is this word said?' showed ψυχή twice, because the fixed list of 17 words holds one word for ψ, ξ, ζ and
// others. A drill's words come from his goal passage first (short and common first), the fixed list only as a fallback, and a word is read once in a drill
// while another word that fits exists.
describe('the words of a drill come from his passage', () => {
  const modern = pronunciationOf('modern');
  const JOHN = [1, 2, 3, 4, 5].map((n) => JSON.parse(readFileSync(`public/data/1jn/${n}.json`, 'utf8')) as Chapter);
  const lemmasOf = (chapters: readonly Chapter[]): Set<string> => new Set(chapters.flatMap((c) => c.verses.flatMap((v) => v.g.map((w) => w.l))));
  const wordsRead = (ideaId: string, options: { passage?: readonly Chapter[]; seed?: number } = {}): string[] =>
    drillSteps(ideaId, { seed: options.seed ?? 1, scheme: modern, passage: options.passage })
      .flatMap((s) => s.questions)
      .filter((q) => q.prompt === 'How is this word said?')
      .map((q) => q.form!);
  const fitting = (ideaId: string, chapters: readonly Chapter[]): string[] => {
    const idea = ideaOf(ideaId);
    const text = baseLetters(idea.glyphs?.[0] ?? idea.pair ?? '');
    return [...lemmasOf(chapters)].filter((w) => baseLetters(w).includes(text) && !w.normalize('NFD').includes('̈'));
  };
  // every idea that reads words: the alphabet, a letter, the pair groups and each pair
  const READERS = LADDER.filter((i) => i.id === 'alphabet' || i.id === 'diphthongs' || i.id === 'consonant-pairs' || i.glyphs || i.parent === 'diphthongs' || i.parent === 'consonant-pairs');

  it('reads ψ in the Psi drill from his chapters, not the one fixed word', () => {
    const words = wordsRead('letter-psi', { passage: JOHN });
    expect(words.length).toBeGreaterThanOrEqual(2);
    expect(new Set(words).size).toBe(words.length);
    const chapter = lemmasOf(JOHN);
    for (const w of words) expect(chapter.has(w), `${w} is in 1 John`).toBe(true);
  });

  it('takes a short, common word of the passage before any other', () => {
    const words = wordsRead('letter-psi', { passage: JOHN });
    const counts = new Map<string, number>();
    for (const c of JOHN) for (const v of c.verses) for (const w of v.g) counts.set(w.l, (counts.get(w.l) ?? 0) + 1);
    const best = fitting('letter-psi', JOHN).sort((a, b) => baseLetters(a).length - baseLetters(b).length || (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0];
    expect(words).toContain(best);
  });

  it('falls back to the fixed list when the passage has no word that fits', () => {
    expect(wordsRead('letter-psi', { passage: [] })).toEqual(['ψυχή']);
    const empty: Chapter = { ...JOHN[0], verses: [] };
    expect(wordsRead('letter-psi', { passage: [empty] })).toEqual(['ψυχή']);
  });

  it.each(READERS.map((i) => [i.id] as const))('%s: no word is read twice while another that fits exists', (ideaId) => {
    for (const seed of [1, 2, 3]) {
      const words = wordsRead(ideaId, { passage: JOHN, seed });
      const dup = words.filter((w, i) => words.indexOf(w) !== i);
      if (ideaId === 'alphabet' || ideaId === 'diphthongs' || ideaId === 'consonant-pairs') {
        // a group reads each item's words; a word may be asked once for each item it holds only if the chapter has no other
        expect(new Set(words).size, `${ideaId} seed ${seed}: ${words.join(' ')}`).toBe(words.length);
        continue;
      }
      expect(dup, `${ideaId} seed ${seed}`).toEqual([]);
    }
  });

  it('sweep: lists the ideas whose chapter holds fewer than two fitting words (Modern Greek is the one pronunciation there is)', () => {
    const few = READERS.filter((i) => i.glyphs || i.parent).filter((i) => fitting(i.id, JOHN).length < 2).map((i) => i.id);
    // 1 John has no second word with these rare pairs; they read the fixed list's words beside the one the passage has
    expect(few).toEqual(['diphthong-ui', 'diphthong-eeu', 'pair-mp', 'pair-gk', 'pair-gch', 'pair-gks']);
    for (const id of few) expect(wordsRead(id, { passage: JOHN }).length, id).toBeGreaterThan(0);
  });
});
