// tests/unit/copywork.test.ts — the pure part of Copywork (src/practise/copywork.ts, mw-5r3p30.899): the languages a verse has, the text to copy in each, the request, and the check of an answer.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { buildCopyworkRequest, copyLanguagesOf, copyTextOf, copyWordsOf, isCopyworkAnswer, markedWords, type CopyworkAnswer } from '../../src/practise/copywork';

const verse1 = (path: string) => (JSON.parse(readFileSync(path, 'utf8')) as Chapter).verses[0];
const john = verse1('public/data/jhn/1.json');
const genesis = verse1('public/data/gen/1.json');

describe('the languages a verse can be copied in', () => {
  it('are English and Greek on a New Testament verse, English and Hebrew on an Old Testament one', () => {
    expect(copyLanguagesOf('grc')).toEqual(['en', 'grc']);
    expect(copyLanguagesOf('hbo')).toEqual(['en', 'hbo']);
  });
});

describe('the text to copy', () => {
  it('is John 1:1 as the translation has it, with its capitals and punctuation', () => {
    expect(copyTextOf(john, 'en')).toBe('In the beginning was the Word, and the Word was with God, and the Word was God.');
  });

  it('is its Greek with every accent and breathing, in NFC, words alone', () => {
    const greek = copyTextOf(john, 'grc');
    expect(greek).toBe('Ἐν ἀρχῇ ἦν ὁ λόγος καὶ ὁ λόγος ἦν πρὸς τὸν θεόν καὶ θεὸς ἦν ὁ λόγος');
    expect(greek).toBe(greek.normalize('NFC'));
  });

  it('is Genesis 1:1 in Hebrew pointed, with no cantillation marks and no sof pasuq', () => {
    const hebrew = copyTextOf(genesis, 'hbo');
    expect(hebrew).toBe('בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ');
    expect(hebrew).not.toMatch(/[֑-֯׃]/);
  });

  it('is a passage as one text: its verses in order, one space between words', () => {
    const passage = { g: [...john.g, ...john.g], e: [...john.e, ...john.e] };
    expect(copyWordsOf(copyTextOf(passage, 'grc'))).toHaveLength(john.g.length * 2);
  });
});

describe('the request', () => {
  it('names the reference and the language and sends the words, one for each word of the text', () => {
    expect(buildCopyworkRequest('John 1:1', 'en', 'In the beginning  was the Word,')).toEqual({ reference: 'John 1:1', language: 'en', words: ['In', 'the', 'beginning', 'was', 'the', 'Word,'] });
  });
});

describe('the request of a dictation (mw-5r3p30.900)', () => {
  it('says mode dictation, and a copywork request has no mode', () => {
    expect(buildCopyworkRequest('John 1:1', 'en', 'In the', 'dictation')).toEqual({ reference: 'John 1:1', language: 'en', words: ['In', 'the'], mode: 'dictation' });
    expect('mode' in buildCopyworkRequest('John 1:1', 'en', 'In the')).toBe(false);
  });
});

describe('the answer', () => {
  const answer: CopyworkAnswer = {
    readable: true,
    words: [
      { word: 'In', mark: 'right' },
      { word: 'the', mark: 'wrong', problem: 'you wrote teh' },
      { word: 'beginning', mark: 'missing' },
    ],
    fix_first: 'Mind the second word.',
  };

  it('is believed when it has the shape of grinds/copywork.answer.schema.json', () => {
    expect(isCopyworkAnswer(answer)).toBe(true);
    expect(isCopyworkAnswer({ readable: false, words: [], fix_first: 'Take it again in better light.' })).toBe(true);
  });

  it.each([null, 'x', {}, { readable: true, words: [], fix_first: 3 }, { readable: true, words: [{ word: 'a', mark: 'maybe' }], fix_first: 'x' }, { readable: 'yes', words: [], fix_first: 'x' }])('is not believed when it is %j', (value) => {
    expect(isCopyworkAnswer(value)).toBe(false);
  });

  it('marks the request\'s words one for one, showing the model\'s own word whatever the answer copied', () => {
    const marked = markedWords({ words: ['In', 'the', 'beginning'] }, { ...answer, words: answer.words.map((w) => ({ ...w, word: 'x' })) });
    expect(marked).toEqual([{ word: 'In', mark: 'right' }, { word: 'the', mark: 'wrong', problem: 'you wrote teh' }, { word: 'beginning', mark: 'missing' }]);
  });

  it('keeps sounds_alike on a wrong word as soundsAlike, and nowhere else', () => {
    const heard: CopyworkAnswer = {
      readable: true,
      words: [
        { word: 'said', mark: 'wrong', problem: 'you wrote sed', sounds_alike: true },
        { word: 'light', mark: 'right', sounds_alike: true },
        { word: 'there', mark: 'wrong', sounds_alike: false },
      ],
      fix_first: 'Check said.',
    };
    expect(isCopyworkAnswer(heard)).toBe(true);
    expect(isCopyworkAnswer({ ...heard, words: [{ word: 'a', mark: 'wrong', sounds_alike: 'yes' }] })).toBe(false);
    expect(markedWords({ words: ['said', 'light', 'there'] }, heard)).toEqual([{ word: 'said', mark: 'wrong', problem: 'you wrote sed', soundsAlike: true }, { word: 'light', mark: 'right' }, { word: 'there', mark: 'wrong' }]);
  });

  it('is refused when it does not mark every word of the request', () => {
    expect(markedWords({ words: ['In', 'the'] }, answer)).toBeNull();
  });
});

describe('a lone-breathing word the model marked wrong for an accent it read from the breathing (mw-qtu3zvz.153)', () => {
  const wrongWith = (word: string, written?: string, language: 'grc' | 'en' | 'hbo' = 'grc') =>
    markedWords(
      { words: [word], language },
      { readable: true, words: [{ word, mark: 'wrong', problem: 'extra acute accent', ...(written !== undefined ? { written } : {}) }], fix_first: 'x' },
    );

  it.each([
    ['ἡ', 'ἥ'],
    ['ἡ', 'ἣ'],
    ['ἡ', 'ἧ'],
    ['ἡ', 'ή'],
    ['ἡ', 'ὴ'],
    ['ὁ', 'ὅ'],
    ['οὐ', 'οὔ'],
    ['εἰς', 'εἴς'],
  ])('reads %s written %s as right', (word, written) => {
    expect(wrongWith(word.normalize('NFC'), written.normalize('NFC'))).toEqual([{ word: word.normalize('NFC'), mark: 'right' }]);
  });

  it('reads the same with the written word in NFD', () => {
    expect(wrongWith('ἡ', 'ἡ'.normalize('NFD').replace('̔', '̔́'))).toEqual([{ word: 'ἡ', mark: 'right' }]);
  });

  it.each([
    ['ἡ', 'ἠ', 'smooth for rough'],
    ['ἡ', 'η', 'no mark at all'],
    ['ἡ', 'ἥν', 'a different letter count'],
    ['ἡ', 'ἵ', 'a different letter'],
    ['ἡ', 'ᾗ', 'an iota subscript added'],
    ['ἡ', 'ἥ́', 'two accents'],
    ['ἦν', 'ἦν', 'a request word with its own accent'],
    ['ἥ', 'ή', 'a request word with its own accent'],
  ])('keeps %s written %s wrong (%s)', (word, written) => {
    expect(wrongWith(word, written)).toEqual([{ word, mark: 'wrong', problem: 'extra acute accent' }]);
  });

  it('keeps it wrong with no written field', () => {
    expect(wrongWith('ἡ')).toEqual([{ word: 'ἡ', mark: 'wrong', problem: 'extra acute accent' }]);
  });

  it('keeps it wrong on an English or a Hebrew page, or one that names no language', () => {
    expect(wrongWith('ἡ', 'ἥ', 'en')).toEqual([{ word: 'ἡ', mark: 'wrong', problem: 'extra acute accent' }]);
    expect(wrongWith('ἡ', 'ἥ', 'hbo')).toEqual([{ word: 'ἡ', mark: 'wrong', problem: 'extra acute accent' }]);
    expect(markedWords({ words: ['ἡ'] }, { readable: true, words: [{ word: 'ἡ', mark: 'wrong', written: 'ἥ' }], fix_first: 'x' })).toEqual([{ word: 'ἡ', mark: 'wrong' }]);
  });

  it('leaves a missing word, and a right one, as the model marked them', () => {
    const answer: CopyworkAnswer = { readable: true, words: [{ word: 'ἡ', mark: 'missing', written: '' }, { word: 'ὁ', mark: 'right', written: 'ὁ' }], fix_first: 'x' };
    expect(markedWords({ words: ['ἡ', 'ὁ'], language: 'grc' }, answer)).toEqual([{ word: 'ἡ', mark: 'missing' }, { word: 'ὁ', mark: 'right' }]);
  });

  it('takes a written field in an answer', () => {
    expect(isCopyworkAnswer({ readable: true, words: [{ word: 'ἡ', mark: 'right', written: 'ἡ' }], fix_first: '' })).toBe(true);
    expect(isCopyworkAnswer({ readable: true, words: [{ word: 'ἡ', mark: 'right', written: 7 }], fix_first: '' })).toBe(false);
  });
});
