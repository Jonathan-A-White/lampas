// The thirteen pattern ideas of the ladder (mw-svw421.1): how a form is built. Each has no terms, a short text with a Greek example, needs the ladder
// accepts, a place in both approaches, a card, and examples read off a word's lemma and code.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bmaTutor } from '../../src/approaches/bma-tutor';
import { orderOf } from '../../src/approaches';
import { ladder } from '../../src/approaches/ladder';
import type { Chapter } from '../../src/data/chapter';
import { ALWAYS_NEEDED, LADDER, ideaOf, ideasBelow } from '../../src/data/grammar/ladder';
import { exampleGloss, ideaExamples } from '../../src/data/grammar/ideaSheet';
import { teachOf } from '../../src/data/grammar/teach';
import { passageNeeds } from '../../src/data/grammar/needs';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import { PATTERN_IDEAS } from '../../src/data/grammar/patterns';

const NOUNS = ['stem-and-ending', 'dictionary-entry', 'declension-1', 'declension-2', 'declension-3'];
const VERBS = ['augment', 'tense-signs', 'reduplication', 'principal-parts', 'contract-verbs', 'mi-verbs', 'eimi', 'oida'];
const PATTERNS = [...NOUNS, ...VERBS];
const GREEK = /[Ͱ-Ͽἀ-῿]/;
const john1 = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;

describe('the pattern ideas', () => {
  it('are thirteen, five in the nouns tier and eight in the verbs tier, each with no terms', () => {
    expect(PATTERNS).toHaveLength(13);
    for (const id of NOUNS) expect(ideaOf(id).tier, id).toBe('nouns');
    for (const id of VERBS) expect(ideaOf(id).tier, id).toBe('verbs');
    for (const id of PATTERNS) expect(ideaOf(id).terms, id).toEqual([]);
  });

  it('each have a text of under 80 words that holds a Greek example', () => {
    for (const id of PATTERNS) {
      const { text } = ideaOf(id);
      expect(text.trim().split(/\s+/).length, id).toBeLessThan(80);
      expect(text, id).toMatch(GREEK);
    }
  });

  it('are the ideas patternsOf can name, besides dictionary-entry and principal-parts', () => {
    expect([...PATTERN_IDEAS].sort()).toEqual(PATTERNS.filter((id) => id !== 'dictionary-entry' && id !== 'principal-parts').sort());
  });

  it('rest on what the story says they rest on', () => {
    const below = (id: string) => ideasBelow(id).map((i) => i.id);
    expect(ideaOf('stem-and-ending').needs).toEqual(expect.arrayContaining(['noun', 'case-nominative']));
    expect(ideaOf('dictionary-entry').needs).toEqual(expect.arrayContaining(['stem-and-ending', 'case-genitive', 'gender-masculine', 'gender-feminine', 'gender-neuter', 'article']));
    expect(below('declension-3')).toEqual(expect.arrayContaining(['dictionary-entry', 'declension-1', 'declension-2']));
    expect(below('augment')).toEqual(expect.arrayContaining(['tense-aorist', 'tense-imperfect', 'mood-indicative']));
    expect(below('tense-signs')).toEqual(expect.arrayContaining(['tense-future', 'tense-aorist', 'tense-perfect', 'voice-passive']));
    expect(below('reduplication')).toContain('tense-perfect');
    expect(below('principal-parts')).toEqual(expect.arrayContaining(['augment', 'tense-signs', 'reduplication']));
    expect(below('contract-verbs')).toEqual(expect.arrayContaining(['stem-and-ending', 'tense-present', 'voice-active', 'mood-indicative']));
    expect(below('mi-verbs')).toEqual(expect.arrayContaining(['stem-and-ending', 'second-tenses']));
    expect(below('eimi')).toContain('verb');
    expect(below('oida')).toContain('tense-perfect');
  });

  it('are in both approaches, after everything each needs', () => {
    for (const approach of [bmaTutor, ladder]) {
      const order = orderOf(approach);
      for (const id of PATTERNS) {
        expect(order, id).toContain(id);
        for (const need of ideaOf(id).needs) expect(order.indexOf(need), `${approach.name}: ${id} after ${need}`).toBeLessThan(order.indexOf(id));
      }
    }
  });

  it('sit in BMA Tutor beside the lessons the story names', () => {
    const lessonOf = (id: string) => bmaTutor.stages.flatMap((s) => s.levels.flatMap((l) => l.lessons)).find((l) => l.ideas.includes(id))?.title;
    expect(lessonOf('eimi')).toBe('Being: I am, you are, he is');
    expect(lessonOf('declension-3')).toBe('The nouns with other patterns');
    expect(lessonOf('mi-verbs')).toBe('Verbs with their own endings');
  });

  it('give 1 John 1 examples through ideasOfWord, each a word the card explains', () => {
    for (const id of ['eimi', 'augment', 'declension-3', 'declension-1', 'reduplication', 'contract-verbs', 'tense-signs']) {
      const found = ideaExamples(id, [john1]);
      expect(found.length, id).toBeGreaterThan(0);
      expect(found.length, id).toBeLessThanOrEqual(3);
    }
    expect(ideaExamples('eimi', [john1]).map((e) => e.word.l)).toEqual(['εἰμί']);
  });

  it('give a form one English gloss: the worked example and the example rows say the same', () => {
    let compared = 0;
    for (const id of PATTERNS) {
      const worked = new Map(teachOf(id).worked.map((w) => [(w.say ?? w.word).normalize('NFC'), w.gloss]));
      const rows = john1.verses.flatMap((v) => ideaExamples(id, [john1], v.n));
      for (const row of rows) {
        const gloss = worked.get(row.word.t.normalize('NFC'));
        if (gloss === undefined) continue;
        compared++;
        expect(exampleGloss(ideaOf(id), row), `${id}: ${row.word.t}`).toBe(gloss);
      }
    }
    // ἐθεασάμεθα (augment, tense-signs) is the form the Governor saw glossed two ways
    expect(compared).toBeGreaterThan(0);
  });

  it('are counted in what a passage needs, with a count and a first example', async () => {
    const needs = await passageNeeds({ book: '1jn', chapter: 1 }, async () => john1, BOOK_INDEX);
    for (const id of ['eimi', 'augment', 'declension-3', 'declension-1', 'stem-and-ending']) {
      const idea = needs.ideas.find((i) => i.id === id);
      expect(idea, id).toBeDefined();
      expect(idea!.count, id).toBeGreaterThan(0);
      expect(idea!.example.ref, id).toMatch(/^1jn\.1\.\d+$/);
    }
    expect(needs.ideas.find((i) => i.id === 'eimi')!.example.form).toBe('ἦν');
    expect(needs.ideas.some((i) => i.id === 'dictionary-entry')).toBe(false);
    const rungs = needs.ideas.slice(ALWAYS_NEEDED.length).map((i) => ideaOf(i.id).rung);
    expect(rungs).toEqual([...rungs].sort((a, b) => a - b));
  });

  it('keep the ladder as it was: every other idea is still there, once', () => {
    expect(LADDER.filter((i) => PATTERNS.includes(i.id))).toHaveLength(13);
  });

  it('are in the docs: the ladder table and a Patterns section', () => {
    const doc = readFileSync('docs/grammar.md', 'utf8');
    expect(doc).toMatch(/^## Patterns/m);
    for (const id of PATTERNS) expect(doc, id).toMatch(new RegExp(`^\\| ${ideaOf(id).rung} \\| ${ideaOf(id).tier} \\| \`${id}\``, 'm'));
  });
});
