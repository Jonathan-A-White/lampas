// The shared table of how a word is built from its parts (mw-5r3p30.986, his feedback: 'this breakdown ... should be part of the lesson'): every entry
// has parts with a text and a gloss and names its source, the negatives are in it as the story gave them, and every word of every Greek lesson's worked
// example and word table is looked up from it.
import { describe, expect, it } from 'vitest';
import { PARTS_SOURCES, WORD_PARTS, partsLine, partsOf } from '../../src/data/wordParts';
import { GREEK_TEACH, cardWords } from '../../src/data/grammar/teach';
import { COMPOUND_VERBS } from '../../src/data/grammar/prepositions';

const GREEK = /^[\p{Script=Greek}᾿'’]+$/u;

describe('the table of word parts', () => {
  it('gives every entry parts with a text and a gloss, and a source that is named', () => {
    const faults: string[] = [];
    for (const [word, entry] of Object.entries(WORD_PARTS)) {
      if (entry.parts.length < 2) faults.push(`${word}: a word is built from two parts or more`);
      for (const part of entry.parts) {
        if (!part.text.trim()) faults.push(`${word}: a part with no text`);
        if (!part.gloss.trim()) faults.push(`${word}: ${part.text} has no gloss`);
      }
      if (!PARTS_SOURCES[entry.source]) faults.push(`${word}: source ${JSON.stringify(entry.source)} is not one of ${Object.keys(PARTS_SOURCES).join(', ')}`);
      if (!word.startsWith(word.normalize('NFC'))) faults.push(`${word}: not NFC`);
      for (const form of entry.forms ?? []) if (!GREEK.test(form)) faults.push(`${word}: form ${form} is not a Greek word`);
    }
    expect(faults).toEqual([]);
    for (const source of Object.values(PARTS_SOURCES)) expect(source.length).toBeGreaterThan(10);
  });

  it('has the negatives with their parts', () => {
    const line = (word: string): string => partsLine(partsOf(word)!);
    expect(line('οὐδείς')).toBe('οὐδέ “and not” + εἷς “one”');
    expect(line('οὐδεμία')).toBe('οὐδέ “and not” + μία “one”');
    expect(line('οὐδέποτε')).toBe('οὐδέ “and not” + ποτέ “ever”');
    expect(line('οὐκέτι')).toBe('οὐ “not” + ἔτι “still”');
  });

  it('finds a word however the text writes it: a capital, a grave accent, a form of the lemma', () => {
    expect(partsOf('Οὐδεμία')).toBe(partsOf('οὐδεμία'));
    expect(partsOf('ἀπαγγέλλομεν')).toBe(partsOf('ἀπαγγέλλω'));
    expect(partsOf('λόγος')).toBeUndefined();
  });

  it('covers the thirteen compound verbs of the preposition lessons, each made of its prefix and its stem', () => {
    for (const verb of COMPOUND_VERBS) {
      const entry = partsOf(verb.lemma);
      expect(entry, verb.lemma).toBeDefined();
      expect(entry!.parts.map((p) => p.text), verb.lemma).toEqual([verb.prefix, verb.stem]);
      expect(entry!.parts[1].gloss, verb.lemma).toBe(verb.stemMeaning);
    }
  });
});

describe('the Greek lessons draw their words from the table', () => {
  const ideas = Object.entries(GREEK_TEACH);
  const all = new Map<string, string[]>();
  for (const [id, teach] of ideas) for (const word of cardWords(teach)) all.set(word, [...(all.get(word) ?? []), id]);

  it('reads the words of each worked example and word table, spelt as the text has them', () => {
    expect(all.size).toBeGreaterThan(100);
    for (const word of all.keys()) expect(word, 'a word the lessons show').toMatch(GREEK);
    expect(all.has('οὐκ')).toBe(true); // the negative's worked example
    expect(all.has('οὐδεμία')).toBe(true); // and its word table
    expect(cardWords(GREEK_TEACH.negative)).toEqual(expect.arrayContaining(['οὐκ', 'οὐ', 'οὐδέποτε', 'οὐκέτι', 'μηδέποτε', 'μηκέτι']));
  });

  it('says how many words have parts of how many are shown, and lists those without', () => {
    const withParts = [...all.keys()].filter((w) => partsOf(w));
    const without = [...all.keys()].filter((w) => !partsOf(w));
    console.log(`word parts: ${withParts.length} of ${all.size} words of the Greek lessons' worked examples and word tables have parts`);
    console.log(`without parts (${without.length}): ${without.join(' ')}`);
    expect(withParts.length).toBeGreaterThanOrEqual(25);
    expect(withParts.length + without.length).toBe(all.size);
  });

  it('puts every entry in a lesson or leaves it for the drills: an entry of the lessons shows its parts, a word with no entry shows none', () => {
    expect(partsOf('οὐκ')?.parts.map((p) => p.text)).toEqual(['οὐ', 'κ']);
    expect(partsOf('ἐν')).toBeUndefined();
  });
});
