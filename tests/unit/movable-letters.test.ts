// Movable letters (mw-86e9r1.4): the ladder idea that teaches the movable ν, οὐ/οὐκ/οὐχ, ἐκ/ἐξ and the elided prepositions, and the ending
// question, which never blames a reader for a movable ν: the ending is shown as -ουσι(ν), one ending.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import { buildEnding, buildIdeaQuestion, MOVABLE } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';

const word = (t: string, l: string, p: string): GreekWord => ({ t, tr: '', s: 'G1', l, p });
/** One verse of made-up words: the forms the test needs, with a lemma and a parsing code each. */
const chapterOf = (...words: GreekWord[]): Chapter => ({ book: 'John', code: 'jhn', chapter: 1, verses: [{ n: 1, g: words, e: [] }] }) as unknown as Chapter;

const PLAIN = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;

describe('the Movable letters idea', () => {
  const idea = LADDER.find((i) => i.id === 'movable-letters');

  it('is on the ladder among the marks, resting on lower ideas', () => {
    expect(idea).toBeDefined();
    expect(idea!.title).toBe('Movable letters');
    expect(idea!.tier).toBe('marks');
    for (const need of idea!.needs) expect(ideaOf(need).rung).toBeLessThan(idea!.rung);
  });

  it('names the movable ν, οὐ οὐκ οὐχ and ἐκ ἐξ, each with a real New Testament example', () => {
    const text = idea!.text;
    expect(text).toContain('movable ν');
    for (const form of ['οὐκ ἦν', 'οὐχ οὗτός', 'οὐ κατέλαβεν', 'ἐξ ἧς', 'ἐκ θεοῦ', 'ἐστι(ν)', 'ἀπ᾿ ἀρχῆς', 'ἀφ᾿ ἑαυτοῦ']) expect(text, form).toContain(form);
  });

  it('is asked as a question that can be missed: one right answer among four different ones', () => {
    const rights = new Set<string>();
    for (let seed = 1; seed <= 60; seed += 1) {
      const q = buildIdeaQuestion(idea!, [rom8], mulberry32(seed));
      expect(q.ideaId).toBe('movable-letters');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options.filter((o) => o === q.right)).toHaveLength(1);
      rights.add(q.right);
    }
    expect(rights.size).toBeGreaterThan(3);
  });

  // mw-86e9r1.30: a miss shows a one-line reason under 'Not quite. It is οὐκ.' (the card's rule line), so a miss teaches the rule
  it('gives every question a one-line reason, and the question built carries it as its rule', () => {
    expect(MOVABLE.length).toBeGreaterThan(7);
    const built = new Map<string, string | undefined>();
    for (let seed = 1; seed <= 300; seed += 1) {
      const q = buildIdeaQuestion(idea!, [rom8], mulberry32(seed));
      built.set(q.prompt, q.rule);
    }
    for (const { prompt, reason } of MOVABLE) {
      expect(reason.trim().length, prompt).toBeGreaterThan(20);
      expect(reason, prompt).not.toContain('\n');
      expect(built.get(prompt), prompt).toBe(reason);
    }
  });
});

describe('an ending question and the movable ν', () => {
  const dative = ideaOf('case-dative');
  // mw-5r3p30.379: an ending is asked of a verb only once its tense, voice, mood, person and number are taught; the indicative is the first idea to have them all
  const verb = ideaOf('mood-indicative');

  it('asks for -ουσι(ν) for λέγουσιν, not for a bare ν', () => {
    const passage = chapterOf(word('λέγουσιν', 'λέγω', 'V-PAI-3P'));
    const q = buildEnding(verb, [passage], mulberry32(1))!;
    expect(q.form).toBe('λέγ_');
    expect(q.right).toBe('ουσι(ν)');
    expect(q.options).toContain('ουσι(ν)');
  });

  it('shows the movable ν of a form that has none beside it as one ending, a dative plural too', () => {
    const passage = chapterOf(word('ὄρεσιν', 'ὄρος', 'N-DPN'));
    const q = buildEnding(dative, [passage], mulberry32(1))!;
    expect(q.right).toBe('εσι(ν)');
  });

  it('never offers an option that ends in a movable ν, among the right and the wrong ones', () => {
    const passage = chapterOf(word('λέγουσιν', 'λέγω', 'V-PAI-3P'), word('ἀγαπῶσιν', 'ἀγαπάω', 'V-PAP-DPM'), word('λέγει', 'λέγω', 'V-PAI-3S'));
    for (const where of [passage, rom8]) {
      for (const idea of [verb, dative]) {
        for (let seed = 1; seed <= 60; seed += 1) {
          const q = buildEnding(idea, [where], mulberry32(seed));
          if (!q) continue;
          for (const o of [q.right, ...q.options]) expect(PLAIN(o), o).not.toMatch(/σιν$/);
        }
      }
    }
  });

  it('keeps an ending that does not move as it was', () => {
    const passage = chapterOf(word('λέγει', 'λέγω', 'V-PAI-3S'));
    expect(buildEnding(verb, [passage], mulberry32(1))!.right).toBe('ει');
  });
});
