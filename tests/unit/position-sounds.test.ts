// A sound that changes by position (αυ, ευ, ηυ: v or f; μπ, ντ, γκ: b/mb, d/nd, g/ng; γχ) is TAUGHT as a rule on its sheet, with a word for each case and how it is respelt,
// and DRILLED on real words: each question shows a word with the pair marked and asks its sound in THAT word, so a drill can never mark the sheet's own answer wrong
// (mw-5r3p30.646, his words: 'make sure that distinction is really drilled and that the concept is taught'; the γκ drill told him 'ng, as in finger' was 'not quite' for ἀνάγκη).
import { describe, expect, it } from 'vitest';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { ITEM_GROUPS, ideaOf, itemsOf } from '../../src/data/grammar/ladder';
import { soundLesson } from '../../src/data/grammar/lessons';
import { quickQuestion } from '../../src/data/grammar/quickRound';
import { buildLetter, type GrammarQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { pronunciationOf, soundRuleOf, soundRulesOf } from '../../src/speech/pronunciation';

const modern = pronunciationOf('modern');
const base = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ');

/** The ladder ideas of pairs whose sound the scheme changes by position: every rule whose idea is a diphthong or a consonant pair. */
const POSITION_PAIRS = soundRulesOf(modern)
  .map((r) => ideaOf(r.ideaId))
  .filter((idea) => idea.parent === 'diphthongs' || idea.parent === 'consonant-pairs');

/** Every sound question a learner can meet for the idea: the quick round's, and each step of Drill it, over several seeds. */
function soundQuestions(id: string): GrammarQuestion[] {
  const out: GrammarQuestion[] = [];
  for (let seed = 1; seed <= 6; seed += 1) {
    for (const step of drillSteps(id, { scheme: modern, seed })) out.push(...step.questions);
    out.push(quickQuestion({ id, mode: 'see' }, mulberry32(seed), modern));
  }
  return out.filter((q) => q.kind === 'letter' && /sound/.test(q.prompt));
}

describe('the pairs whose sound changes by position', () => {
  it('are αυ, ευ, ηυ, μπ, ντ, γκ and γχ, as the scheme decides them', () => {
    expect(POSITION_PAIRS.map((i) => i.pair)).toEqual(expect.arrayContaining(['αυ', 'ευ', 'ηυ', 'μπ', 'ντ', 'γκ', 'γχ']));
    expect(POSITION_PAIRS).toHaveLength(7);
  });

  describe.each(POSITION_PAIRS.map((idea) => [idea.pair!, idea] as const))('%s', (pair, idea) => {
    const rule = soundRuleOf(modern, idea.id)!;

    it('has real examples on each side, each standing on the side it is an example of', () => {
      for (const side of rule.sides) {
        expect(side.examples.length, side.id).toBeGreaterThan(0);
        for (const word of side.examples) expect(rule.sideOf(word), `${word} on ${side.id}`).toBe(side.id);
      }
    });

    it('is taught on its sheet as a rule, with a word of each case and its respelling', () => {
      const text = soundLesson(idea, modern)!;
      for (const side of rule.sides) {
        expect(side.examples.length, `${side.id} has an example`).toBeGreaterThan(0);
        const word = side.examples[0];
        expect(text, `${side.id}: ${word}`).toContain(word);
        expect(text, `${side.id}: ${word} respelt`).toContain(modern.respell(word));
      }
    });

    it('is never asked as the bare pair: each sound question shows a word with the pair marked, and asks its sound there', () => {
      const asked = soundQuestions(idea.id);
      expect(asked.length).toBeGreaterThan(0);
      for (const q of asked) {
        expect(q.form, q.prompt).toBeDefined();
        expect(base(q.form!), `${pair} in a word`).not.toBe(base(pair));
        const [from, to] = q.span ?? [-1, -1];
        expect(base(q.form!.slice(from, to)), `${q.form} marks ${pair}`).toBe(base(pair));
        const side = rule.sideOf(q.form!);
        expect(side, `${q.form} stands on one side`).not.toBeNull();
        // the right answer is the sound the scheme reads for this word, at the marked place
        const letters = [...base(q.form!)];
        const unit = modern.spellings!(q.form!).find((u) => letters.slice(u.from, u.to).join('') === base(pair))!;
        expect(unit, `${q.form} has a unit at the mark`).toBeDefined();
        expect(q.right.startsWith(`${unit.sound},`), `${q.form}: ${q.right} is ${unit.sound}`).toBe(true);
        expect(q.right).toBe(rule.sides.find((s) => s.id === side)!.choice);
      }
    });

    it('is asked on a word of each case within one drill run', () => {
      const sides = new Set(soundQuestions(idea.id).map((q) => rule.sideOf(q.form!)));
      expect(sides).toEqual(new Set(rule.sides.map((s) => s.id)));
    });
  });

  it('γκ: the drill never marks “ng, as in finger” wrong for a word with γκ inside it (ἀνάγκη)', () => {
    const rule = soundRuleOf(modern, 'pair-gk')!;
    const asked = soundQuestions('pair-gk');
    const inside = asked.filter((q) => rule.sideOf(q.form!) === 'inside');
    expect(inside.length).toBeGreaterThan(0);
    for (const q of inside) expect(q.right, q.form).toMatch(/^ng, as in/);
    for (const q of asked.filter((x) => rule.sideOf(x.form!) === 'start')) expect(q.right, q.form).toMatch(/^g, as in/);
    const anagke = asked.find((q) => q.form === 'ἀνάγκη');
    if (anagke) expect(anagke.right).toBe(soundRuleOf(modern, 'pair-gk')!.sides.find((s) => s.id === 'inside')!.choice);
  });
});

describe('the sweep: a question whose right answer is a sound, against the scheme for the word it shows', () => {
  it('has no wrong choice that is the sound of the other side of a rule the letter stands on (σ is z before β, γ, δ ...)', () => {
    for (const letter of itemsOf('alphabet')) {
      const rule = soundRuleOf(modern, letter.id);
      if (!rule) continue;
      const sides = new Set(rule.sides.map((s) => s.choice));
      for (let seed = 1; seed <= 12; seed += 1) {
        const q = quickQuestion({ id: letter.id, mode: 'see' }, mulberry32(seed), modern);
        if (q.kind !== 'letter') continue;
        for (const option of q.options.filter((o) => o !== q.right)) expect(sides.has(option), `${letter.id}: ${option} is right for a word`).toBe(false);
      }
    }
  });

  it('never offers σ as a wrong letter for “Which letter sounds like z?”: it is z before β, γ, δ, ζ, λ, μ, ν, ρ', () => {
    const zeta = ideaOf('letter-zeta');
    const sigma = ideaOf('letter-sigma').glyphs!;
    let asked = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const q = buildLetter(zeta, mulberry32(seed), modern, { letter: zeta, form: 'small' });
      if (!q.prompt.includes('sounds like')) continue;
      asked += 1;
      for (const g of sigma) expect(q.options, `seed ${seed}`).not.toContain(g);
    }
    expect(asked).toBeGreaterThan(0);
  });

  it('asks every sound-bearing idea of every group by ear or by a word, and every “How is this word said?” answer is the scheme’s respelling', () => {
    for (const group of ITEM_GROUPS) {
      for (const item of [ideaOf(group), ...itemsOf(group)]) {
        for (const step of drillSteps(item.id, { scheme: modern, seed: 3 })) {
          for (const q of step.questions.filter((x) => x.prompt === 'How is this word said?')) expect(q.right, `${item.id} ${q.form}`).toBe(modern.respell(q.form!));
        }
      }
    }
  });
});
