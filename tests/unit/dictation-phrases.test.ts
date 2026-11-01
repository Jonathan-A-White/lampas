// tests/unit/dictation-phrases.test.ts — how Dictation cuts a verse into the phrases the app reads aloud one at a time (mw-5r3p30.900): at its punctuation, a Greek verse (which has none) before a
// conjunction, and a stretch longer than six words into even pieces; the words are never changed, dropped or reordered.
import { describe, expect, it } from 'vitest';
import { MAX_PHRASE_WORDS, phrasesOf } from '../../src/practise/dictation';
import { copyWordsOf } from '../../src/practise/copywork';

describe('phrasesOf', () => {
  it('cuts English at its commas and full stops', () => {
    expect(phrasesOf('In the beginning was the Word, and the Word was with God, and the Word was God.', 'en')).toEqual([
      'In the beginning was the Word,',
      'and the Word was with God,',
      'and the Word was God.',
    ]);
  });

  it('cuts a clause of more than six words into even pieces, never a lone word after six', () => {
    expect(phrasesOf('He made the heavens and the earth and the sea.', 'en')).toEqual(['He made the heavens and', 'the earth and the sea.']);
    expect(phrasesOf('one two three four five six seven', 'en')).toEqual(['one two three four', 'five six seven']);
  });

  it('keeps a closing quotation mark with the word it follows when it cuts', () => {
    expect(phrasesOf('And God said, “Let there be light,” and there was light.', 'en')).toEqual(['And God said,', '“Let there be light,”', 'and there was light.']);
  });

  it('cuts Greek, which has no punctuation, before καὶ, then evenly', () => {
    expect(phrasesOf('Ἐν ἀρχῇ ἦν ὁ λόγος καὶ ὁ λόγος ἦν πρὸς τὸν θεόν καὶ θεὸς ἦν ὁ λόγος', 'grc')).toEqual([
      'Ἐν ἀρχῇ ἦν ὁ λόγος',
      'καὶ ὁ λόγος ἦν',
      'πρὸς τὸν θεόν',
      'καὶ θεὸς ἦν ὁ λόγος',
    ]);
  });

  it('cuts Hebrew at its stops and evenly, and a word with a maqaf ends no phrase', () => {
    expect(phrasesOf('בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ', 'hbo')).toEqual(['בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת', 'הַשָּׁמַיִם וְאֵת הָאָרֶץ']);
    expect(phrasesOf('יְהִי אוֹר וַיְהִי־ אוֹר׃', 'hbo')).toEqual(['יְהִי אוֹר וַיְהִי־ אוֹר׃']);
  });

  it('gives no phrase more than six words, and every word once in order, for any text', () => {
    const text = Array.from({ length: 40 }, (_, i) => `w${i}${i % 9 === 8 ? ',' : ''}`).join(' ');
    for (const language of ['en', 'grc', 'hbo'] as const) {
      const phrases = phrasesOf(text, language);
      expect(phrases.every((p) => copyWordsOf(p).length <= MAX_PHRASE_WORDS)).toBe(true);
      expect(phrases.flatMap(copyWordsOf)).toEqual(copyWordsOf(text));
    }
  });

  it('gives none for an empty text', () => {
    expect(phrasesOf('  ', 'en')).toEqual([]);
  });
});
