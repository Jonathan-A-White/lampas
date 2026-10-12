// What an idea's lesson names, it needs (mw-86e9r1.2): the needs of every idea cover the grammar its text uses, and no approach
// teaches an idea before what it needs; number and the common joiners come before the first idea whose prompts use them.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPROACHES, orderOf } from '../../src/approaches';
import { LADDER, ideaOf, ideasBelow } from '../../src/data/grammar/ladder';

const ids = (prefix: string): string[] => LADDER.filter((i) => i.id.startsWith(prefix) && !i.parent && !i.glyphs).map((i) => i.id);

/**
 * A word a lesson text may use that names another idea, and the ideas that teach it (any one of them will do). With none, no lesson may
 * use the word yet: nothing on the ladder teaches it.
 */
const VOCABULARY: [word: RegExp, teachers: string[]][] = [
  [/\bcases?\b/i, ids('case-')],
  [/\bnominative\b/i, ['case-nominative']],
  [/\bgenitive\b/i, ['case-genitive']],
  [/\bdative\b/i, ['case-dative']],
  [/\baccusative\b/i, ['case-accusative']],
  [/\bvocative\b/i, ['case-vocative']],
  [/\bnumber\b(?! words?)/i, ['number-singular', 'number-plural']],
  [/\bsingular\b/i, ['number-singular']],
  [/\bplural\b/i, ['number-plural']],
  [/\bgenders?\b/i, ids('gender-')],
  [/\bmasculine\b/i, ['gender-masculine']],
  [/\bfeminine\b/i, ['gender-feminine']],
  [/\bneuter\b/i, ['gender-neuter']],
  [/\bindicative\b/i, ['mood-indicative']],
  [/\bmoods?\b/i, ids('mood-')],
  [/\btenses?\b/i, ids('tense-')],
  [/\bvoices?\b/i, ids('voice-')],
  [/\b(1st|2nd|3rd|first|second|third) person\b|\bperson and number\b/i, ['person-1st', 'person-2nd', 'person-3rd']],
  [/\bstems?\b/i, []],
  [/\bstress mark\b|\baccents?\b/i, ['accents']],
  [/\bdiaeresis\b|\btwo dots\b/i, ['punctuation']],
  [/\bbreathings?\b/i, ['breathings']],
  [/\bsyllables?\b/i, ['syllables']],
  [/\bnouns?\b/i, ['noun']],
  [/\bverbs?\b/i, ['verb']],
  [/\badjectives?\b/i, ['adjective']],
  [/\barticles?\b/i, ['article']],
  [/\bpronouns?\b/i, ids('pronoun')],
  [/\bprepositions?\b/i, ['preposition']],
  [/\bconjunctions?\b/i, ['conjunction']],
  [/\bparticiples?\b/i, ['mood-participle']],
  [/\binfinitives?\b/i, ['mood-infinitive']],
  [/\bpluperfect\b/i, ['tense-pluperfect']],
  [/\bimperfect\b/i, ['tense-imperfect']],
  [/\baorist\b/i, ['tense-aorist']],
  [/\bfuture\b/i, ['tense-future']],
  [/\bperfect\b/i, ['tense-perfect']],
];

const reaches = (from: string, to: string): boolean => from === to || ideasBelow(from).some((i) => i.id === to);

/** Every idea that has a lesson text of its own: the 24 letters and the pair and breathing items are asked, not read. */
const LESSONS = LADDER.filter((i) => !i.glyphs && !i.parent);

describe('every idea needs what its lesson text uses', () => {
  it('names, in its needs (however far down), an idea that teaches each grammar word its text uses', () => {
    const missing: string[] = [];
    for (const idea of LESSONS) {
      for (const [word, teachers] of VOCABULARY) {
        const used = idea.text.match(word)?.[0];
        if (!used) continue;
        // the idea teaches the word itself, or a lesson that rests on this one is where the word is taught (a first look ahead)
        if (teachers.some((t) => reaches(idea.id, t) || reaches(t, idea.id))) continue;
        missing.push(`${idea.id} uses “${used}” but needs ${teachers.length ? `none of ${teachers.join(', ')}` : 'a lesson that teaches it (there is none)'}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('says which ideas are met first: the article rests on case, number and gender; the tenses on the indicative', () => {
    for (const id of ['case-nominative', 'number-plural', 'gender-masculine']) expect(ideasBelow('article').map((i) => i.id), id).toContain(id);
    for (const id of ['tense-imperfect', 'tense-aorist']) expect(ideasBelow(id).map((i) => i.id), id).toContain('mood-indicative');
    expect(ideasBelow('adjective').map((i) => i.id)).toEqual(expect.arrayContaining(['case-nominative', 'number-plural']));
  });

  it('keeps the stress mark and the diaeresis out of the vowel pairs, which come before the marks', () => {
    expect(ideaOf('diphthongs').text).not.toMatch(/stress mark|diaeresis|two dots/i);
  });
});

describe('no approach teaches an idea before what it needs', () => {
  for (const approach of APPROACHES) {
    it(`${approach.name}: each idea comes after every idea it needs`, () => {
      const order = orderOf(approach);
      const early = LADDER.flatMap((idea) => idea.needs.filter((need) => order.indexOf(need) > order.indexOf(idea.id)).map((need) => `${idea.id} before ${need}`));
      expect(early).toEqual([]);
    });
  }
});

/** The first ideas whose prompts use the number of a word or a common joining word: 'genitive singular', the καί and δέ and οὐ of every verse. */
const FIRST_WORDS = ['number-singular', 'number-plural', 'conjunction', 'negative'];

describe('number and the common joiners come early', () => {
  const FIRST_FORMS = LADDER.filter((i) => ['nouns', 'pronouns', 'prepositions', 'verbs', 'joiners'].includes(i.tier) && !['noun', ...FIRST_WORDS].includes(i.id));
  const orders: [string, string[]][] = [['the ladder', LADDER.map((i) => i.id)], ...APPROACHES.map((a): [string, string[]] => [a.name, orderOf(a)])];

  for (const [name, order] of orders) {
    it(`${name}: singular, plural, καί and δέ (the conjunction) and οὐ (the negative) come right after the noun, before every idea that asks about a form`, () => {
      const last = Math.max(...FIRST_WORDS.map((id) => order.indexOf(id)));
      expect(order.indexOf('noun')).toBeLessThan(Math.min(...FIRST_WORDS.map((id) => order.indexOf(id))));
      const before = FIRST_FORMS.filter((i) => order.indexOf(i.id) < last).map((i) => i.id);
      expect(before).toEqual([]);
    });
  }

  it('is said in docs/grammar.md, in the one-choice note and in the ladder table', () => {
    const doc = readFileSync('docs/grammar.md', 'utf8');
    expect(doc).toMatch(/Number \(`number-singular` and `number-plural`\) sit in the `nouns` tier, straight after `noun`/);
    const rung = (id: string) => new RegExp(`^\\| ${ideaOf(id).rung} \\| ${ideaOf(id).tier} \\| \`${id}\``, 'm');
    for (const id of FIRST_WORDS) expect(doc, id).toMatch(rung(id));
  });
});
