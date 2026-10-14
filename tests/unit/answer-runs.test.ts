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

// His report (mw-5r3p30.272): Talk about 1 Thessalonians 5:19, the tutor writes 'πνεῦμα sounds like PNEV-ma' and 'Say it "pnev"', and the English voice
// spelled the respelling letter by letter. A respelling of a Greek sound is never handed to the English voice: the Greek voice says the Greek it respells.
describe('answerRuns: a respelling of a Greek sound', () => {
  const answer =
    'πνεῦμα sounds like PNEV-ma, with the stress on the first syllable. The first syllable is πνεῦ. Say it "pnev": the ευ is "ev" here, then say ma.';
  const english = (runs: ReturnType<typeof answerRuns>): string => runs.filter((r) => r.language === 'english').map((r) => r.text).join(' ');

  it('puts the Greek it respells where the respelling was, and none of it reaches the English voice', () => {
    const runs = answerRuns(answer);
    expect(english(runs)).not.toMatch(/pnev/i);
    expect(english(runs)).not.toMatch(/\b[A-Z]{2,}/);
    expect(runs.filter((r) => r.language === 'greek').map((r) => r.text)).toEqual(['πνεῦμα', 'πνεῦμα', 'πνεῦ', 'πνεῦ', 'ευ', 'ευ']);
  });

  it('keeps the English around the respelling, in order', () => {
    expect(answerRuns('πνεῦμα sounds like PNEV-ma here.')).toEqual([
      { text: 'πνεῦμα', language: 'greek' },
      { text: 'sounds like', language: 'english' },
      { text: 'πνεῦμα', language: 'greek' },
      { text: 'here.', language: 'english' },
    ]);
  });

  it('says a capitalised respelling that no Greek in the answer matches as a lower-case word, never spelled', () => {
    const runs = answerRuns('It sounds like PNEV-ma, said slowly.');
    expect(runs).toEqual([{ text: 'It sounds like pnev-ma, said slowly.', language: 'english' }]);
  });

  it('leaves what is not a respelling alone: acronyms, initials and a quoted English meaning', () => {
    const plain = 'The NT and BDAG say πνεῦμα means "spirit" or "breath", as in the LSB. I agree.';
    expect(english(answerRuns(plain))).toBe('The NT and BDAG say means "spirit" or "breath", as in the LSB. I agree.');
  });
});

// A voice given one letter on its own says the letter's name ('Alpha'): readAloud.ts textOf hands such a run to the Greek voice in its pronunciation's form (tests/unit/readAloud.test.ts).
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
