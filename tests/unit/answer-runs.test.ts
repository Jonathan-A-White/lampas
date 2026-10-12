// An answer is English with Greek words in it: read aloud, each Greek stretch goes to the Greek voice and the rest to the English one.
import { describe, expect, it } from 'vitest';
import { answerRuns, syllableRuns } from '../../src/speech/answerRuns';

describe('answerRuns', () => {
  it('splits English from Greek words, in the order they come', () => {
    expect(answerRuns('In this verse συνεργεῖ means "works together".')).toEqual([
      { text: 'In this verse', language: 'english' },
      { text: 'συνεργεῖ', language: 'greek' },
      { text: 'means "works together".', language: 'english' },
    ]);
  });

  it('keeps a Greek phrase of several words in one run, with its accents and breathings', () => {
    expect(answerRuns('Paul writes ἐν Χριστῷ Ἰησοῦ here.')).toEqual([
      { text: 'Paul writes', language: 'english' },
      { text: 'ἐν Χριστῷ Ἰησοῦ', language: 'greek' },
      { text: 'here.', language: 'english' },
    ]);
  });

  it('reads plain English as one run and an empty answer as none', () => {
    expect(answerRuns('Nothing Greek here.')).toEqual([{ text: 'Nothing Greek here.', language: 'english' }]);
    expect(answerRuns('   ')).toEqual([]);
  });

  it('drops a run with nothing to say, such as a lone quotation mark', () => {
    expect(answerRuns('"πνεῦμα"')).toEqual([{ text: 'πνεῦμα', language: 'greek' }]);
  });

  it('never speaks Markdown marks: bold, italics, headings, lists, code and links read as their words', () => {
    expect(answerRuns('The word is **parsing**, a *grammar* habit.')).toEqual([{ text: 'The word is parsing, a grammar habit.', language: 'english' }]);
    expect(answerRuns('## Steps\n\n- find the verb\n- name `tense`\n\n1. read [the Greek](https://x.org)')).toEqual([
      { text: 'Steps. find the verb. name tense. read the Greek.', language: 'english' },
    ]);
  });

  it('still cuts Greek out of Markdown, bold or not', () => {
    expect(answerRuns('In this verse **συνεργεῖ** means *works together*.')).toEqual([
      { text: 'In this verse', language: 'english' },
      { text: 'συνεργεῖ', language: 'greek' },
      { text: 'means works together.', language: 'english' },
    ]);
  });
});

// A voice given one letter on its own says the letter's name ('Alpha'): readAloud.ts textOf turns such a run into its sound (tests/unit/readAloud.test.ts).
describe('syllableRuns', () => {
  const textsOf = (syllables: string[]): string[] => syllableRuns(syllables).map((r) => r.text);

  it('hands the voice every syllable of a word in Greek, slowly, one run each', () => {
    expect(syllableRuns(['συν', 'ερ', 'γεῖ'])).toEqual([
      { text: 'συν', language: 'greek', slow: true },
      { text: 'ερ', language: 'greek', slow: true },
      { text: 'γεῖ', language: 'greek', slow: true },
    ]);
  });

  it.each(['ἁ', 'ὁ', 'ἡ', 'ε', 'ι', 'ω'])('keeps the one-letter syllable %s as it is (readAloud says it as its sound, never by name)', (letter) => {
    expect(syllableRuns([letter])).toEqual([{ text: letter, language: 'greek', slow: true }]);
  });

  it('leaves the other syllables of the word as they are', () => {
    expect(textsOf(['ἁ', 'μάρ', 'τη', 'τε'])).toEqual(['ἁ', 'μάρ', 'τη', 'τε']);
  });
});
