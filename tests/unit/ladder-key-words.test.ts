// Every sound a foundation idea's lesson gives has an English key word (mw-86e9r1.14): 'αι is e' made him ask whether ai really is a short e.
import { describe, expect, it } from 'vitest';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import { ideaSound, ideaText } from '../../src/data/grammar/lessons';
import { PRONUNCIATIONS, pronunciationOf } from '../../src/speech/pronunciation';

const modern = pronunciationOf('modern');

// The sound phrases each foundation lesson must hold, one per sound it names. A bare 'αι is e' is not among them.
const LESSON_PHRASES: Record<string, string[]> = {
  alphabet: [],
  diphthongs: ['e as in pet', 'ee as in see', 'oo as in food', 'v as in vase', 'f as in fan'],
  'consonant-pairs': ['b as in bed', 'd as in dog', 'g as in go', 'mb as in number', 'nd as in under', 'ng as in finger', 'kh as in loch', 'nks as in thanks'],
  syllables: [],
  breathings: [],
  accents: [],
  'iota-subscript': [],
  punctuation: [],
};

describe('the foundation lessons give every sound an English key word', () => {
  for (const [id, phrases] of Object.entries(LESSON_PHRASES)) {
    it(`${id} holds ${phrases.length ? phrases.map((p) => `'${p}'`).join(', ') : 'no sound of its own'}`, () => {
      for (const phrase of phrases) expect(ideaText(ideaOf(id), modern), id).toContain(phrase);
    });
  }

  it('names the pronunciation each lesson that gives sounds follows', () => {
    for (const id of ['diphthongs', 'consonant-pairs', 'breathings']) expect(ideaText(ideaOf(id), modern), id).toContain('Modern Greek');
  });

  it("says the Pairs of vowels lesson's αι is the e of pet (like ε), ει/οι/υι the ee of see and ου the oo of food, the Modern Greek way", () => {
    const text = ideaText(ideaOf('diphthongs'), modern);
    expect(text).toMatch(/αι is the e as in pet \(like ε\)/);
    expect(text).toMatch(/ει, οι and υι are the ee as in see/);
    expect(text).toMatch(/ου is the oo as in food/);
    expect(text).toMatch(/Modern Greek/);
    expect(text).not.toContain('αι is e,');
  });

  it('gives every item of a group (a pair of vowels, a pair of consonants, a breathing) a sound with a key word, bar the breathings, which Modern Greek does not say', () => {
    const items = LADDER.filter((i) => i.parent);
    expect(items.length).toBeGreaterThan(15);
    for (const item of items) {
      if (item.parent === 'breathings') continue;
      expect(ideaSound(item, modern), item.id).toMatch(/as in/);
      expect(ideaText(item, modern), item.id).toContain('as in');
    }
  });

  it('reads the key words from the Greek pronunciation, so another scheme changes the lessons', () => {
    for (const scheme of PRONUNCIATIONS) for (const sound of ['e', 'ee', 'oo', 'v', 'f', 'b', 'd', 'g', 'mb', 'nd', 'ng', 'kh', 'nks', 'hy', 'y']) expect(scheme.keyWords[sound], `${scheme.id}: ${sound}`).toBeTruthy();
    expect(pronunciationOf('modern').keyWords.e).toBe('pet');
  });
});
