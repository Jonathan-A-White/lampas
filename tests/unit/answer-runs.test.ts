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

// A voice given one letter on its own says the letter's name ('Alpha'), not its sound; the package makes every run a sentence of its own.
describe('syllableRuns', () => {
  const textsOf = (syllables: string[]): string[] => syllableRuns(syllables).map((r) => r.text);
  const lettersIn = (text: string): number => text.normalize('NFD').replace(/\p{M}/gu, '').length;

  it('hands the voice every syllable of a word in Greek, slowly, one run each', () => {
    expect(syllableRuns(['συν', 'ερ', 'γεῖ'])).toEqual([
      { text: 'συν', language: 'greek', slow: true },
      { text: 'ερ', language: 'greek', slow: true },
      { text: 'γεῖ', language: 'greek', slow: true },
    ]);
  });

  it.each(['ἁ', 'ὁ', 'ἡ', 'ε', 'ι', 'ω'])('never hands the voice the lone letter %s, which it would spell out by name', (letter) => {
    const [run] = syllableRuns([letter]);
    expect(lettersIn(run.text)).toBeGreaterThan(1);
    expect(run).toMatchObject({ language: 'greek', slow: true });
    expect(run.text.normalize('NFD').replace(/\p{M}/gu, '')).toBe(letter.normalize('NFD').replace(/\p{M}/gu, '').repeat(2));
  });

  it('leaves the other syllables of the word as they are', () => {
    expect(textsOf(['ἁ', 'μάρ', 'τη', 'τε'])).toEqual([expect.stringMatching(/^ἁ.$/u), 'μάρ', 'τη', 'τε']);
  });
});
