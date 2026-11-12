// The Parsing drill tuned to him (mw-indx1x6.9): forms by his grammar extent and word setting, the idea he is learning now first.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import type { GrammarLevel, GrammarLevelName, Word, WordState } from '../../src/data/db';
import { drawDrill, type DrillTuning } from '../../src/data/drill';
import { ALWAYS_NEEDED, ideasOf } from '../../src/data/grammar/ladder';
import { ladderFor } from '../../src/data/grammar/ladders';
import { formPasses, formTier } from '../../src/data/grammar/formLevel';
import { mulberry32 } from '../../src/data/quiz';

const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;

const word = (lemma: string, state: WordState): Word => ({ lemma, lang: 'grc', lemmas: [lemma], gloss: `gloss of ${lemma}`, lesson: 1, state, since: 0 });
const everyLemma = (state: WordState = 'solid'): Word[] => [...new Set(rom8.verses.flatMap((v) => v.g.map((g) => g.l)))].map((l) => word(l, state));

/** Every idea of the ladder solid, except those named: frontier (or not yet when `notYet` names it). */
function levelsWith(frontier: string[], notYet: string[] = []): Map<string, GrammarLevel> {
  const levels = new Map<string, GrammarLevel>();
  for (const idea of ladderFor('grc').ideas) {
    const level: GrammarLevelName = notYet.includes(idea.id) ? 'notYet' : frontier.includes(idea.id) ? 'frontier' : 'solid';
    if (level !== 'notYet') levels.set(idea.id, { id: idea.id, level, since: 0, how: 'sheet' });
  }
  return levels;
}

const tuning = (over: Partial<DrillTuning> & Pick<DrillTuning, 'levels'>): DrillTuning => ({ extent: 'solid+frontier', words: 'solid+learning', ...over });
const needs = (code: string, id: string) => ideasOf(code).includes(id);

describe('drawDrill tuned: the grammar extent', () => {
  const levels = levelsWith(['mood-participle', 'voice-passive']);

  it('never draws a form that needs a frontier idea for a learner whose extent is solid only', () => {
    // the chapter does hold such forms, so the test is not empty
    expect(rom8.verses.some((v) => v.g.some((g) => needs(g.p, 'mood-participle')))).toBe(true);
    for (let seed = 1; seed <= 10; seed += 1) {
      const round = drawDrill(rom8, everyLemma(), mulberry32(seed), 10, tuning({ levels, extent: 'solid' }));
      expect(round.length).toBeGreaterThan(0);
      for (const q of round) {
        expect(formPasses(q.code, levels, 'solid'), q.code).toBe(true);
        expect(needs(q.code, 'mood-participle') || needs(q.code, 'voice-passive'), q.code).toBe(false);
      }
    }
  });

  it('takes the frontier ideas too at solid and frontier, and any form at any', () => {
    const solidOnly = levelsWith([], ['mood-participle']);
    const round = drawDrill(rom8, everyLemma(), mulberry32(2), 1000, tuning({ levels: solidOnly, extent: 'any' }));
    expect(round.some((q) => needs(q.code, 'mood-participle'))).toBe(true);
    const frontier = drawDrill(rom8, everyLemma(), mulberry32(2), 40, tuning({ levels, extent: 'solid+frontier' }));
    expect(frontier.some((q) => needs(q.code, 'mood-participle'))).toBe(true);
    for (const q of frontier) expect(formPasses(q.code, levels, 'solid+frontier')).toBe(true);
  });

  it('draws nothing when no form fits (the screen then offers the widest setting)', () => {
    const none = new Map<string, GrammarLevel>();
    expect(ALWAYS_NEEDED.length).toBeGreaterThan(0);
    expect(drawDrill(rom8, everyLemma(), mulberry32(1), 10, tuning({ levels: none, extent: 'solid' }))).toEqual([]);
    expect(drawDrill(rom8, everyLemma(), mulberry32(1), 10, tuning({ levels: none, extent: 'any' })).length).toBeGreaterThan(0);
  });
});

describe('drawDrill tuned: the words setting', () => {
  it('asks only solid words under Solid, and solid and learning words under + Learning', () => {
    const words = everyLemma().map((w, i) => (i % 2 === 0 ? { ...w, state: 'learning' as const } : w));
    const levels = levelsWith([]);
    const solid = drawDrill(rom8, words, mulberry32(3), 40, tuning({ levels, words: 'solid' }));
    const state = (lemma: string) => words.find((w) => w.lemma === lemma)?.state;
    expect(solid.length).toBeGreaterThan(0);
    for (const q of solid) expect(state(q.lemma)).toBe('solid');
    const both = drawDrill(rom8, words, mulberry32(3), 40, tuning({ levels, words: 'solid+learning' }));
    expect(both.some((q) => state(q.lemma) === 'learning')).toBe(true);
  });
});

describe('drawDrill tuned: the order', () => {
  const levels = levelsWith(['tense-aorist', 'voice-passive']);

  it('asks forms of the idea he is learning now first, then frontier ones, then solid ones', () => {
    const round = drawDrill(rom8, everyLemma(), mulberry32(5), 40, tuning({ levels, learning: 'tense-aorist' }));
    const tiers = round.map((q) => formTier(q.code, levels, 'tense-aorist'));
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    expect(tiers.filter((t) => t === 0).length).toBeGreaterThan(0);
    expect(tiers.filter((t) => t === 1).length).toBeGreaterThan(0);
    expect(tiers.filter((t) => t === 2).length).toBeGreaterThan(0);
    for (const q of round.filter((_, i) => tiers[i] === 0)) expect(needs(q.code, 'tense-aorist')).toBe(true);
    // the first question of a round with a learning idea uses it
    expect(needs(round[0].code, 'tense-aorist')).toBe(true);
  });

  it('is the same round for the same seed', () => {
    const a = drawDrill(rom8, everyLemma(), mulberry32(9), 10, tuning({ levels, learning: 'tense-aorist' }));
    expect(drawDrill(rom8, everyLemma(), mulberry32(9), 10, tuning({ levels, learning: 'tense-aorist' }))).toEqual(a);
  });
});

describe('formTier', () => {
  it('is 0 for the learning idea, 1 for a frontier idea, 2 for all solid and 3 for an idea with no level', () => {
    const levels = levelsWith(['tense-aorist', 'voice-passive'], ['case-vocative']);
    expect(formTier('V-AAI-3S', levels, 'tense-aorist')).toBe(0);
    expect(formTier('V-AAI-3S', levels, undefined)).toBe(1);
    expect(formTier('V-PAI-3S', levels, 'tense-aorist')).toBe(2);
    expect(formTier('N-VSM', levels, 'tense-aorist')).toBe(3);
    expect(formTier('Z-XXX', levels, undefined)).toBe(3);
  });
});
