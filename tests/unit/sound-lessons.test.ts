// The sound-bearing lessons follow the chosen pronunciation scheme (mw-5r3p30.229): his report was that the 'Breathing marks' sheet taught
// Erasmian ('the rough breathing adds an h: ὁ is "ho"') in the Modern Greek mode. Every letter, pair and breathing lesson, and the questions
// built on them, now comes from the scheme (src/speech/schemes/modernLessons.ts); an idea a scheme has no lesson for says a neutral text.
import { describe, expect, it } from 'vitest';
import { LADDER, itemsOf, ideaOf } from '../../src/data/grammar/ladder';
import { ideaSound, ideaText, soundLesson } from '../../src/data/grammar/lessons';
import { buildIdeaQuestion, buildLetter } from '../../src/data/grammar/questions';
import { quickQuestion } from '../../src/data/grammar/quickRound';
import { mulberry32 } from '../../src/data/quiz';
import { MARK_PAIRS } from '../../src/data/grammar/marks';
import { soundWords } from '../../src/speech/accents';
import { lessonsOf, registerPronunciation, pronunciationOf, type Pronunciation } from '../../src/speech/pronunciation';
import { MODERN, respellModern } from '../../src/speech/schemes/modern';

const modern = pronunciationOf('modern');
const say = soundWords(modern);

/** [idea id, a Greek word that shows the letter or pair, the sound respellModern writes for it in that word, the parts the lesson must name (default: that sound)]. */
const SOUNDS: [string, string, string, string[]?][] = [
  ['letter-alpha', 'α', 'a'], ['letter-beta', 'βα', 'v'], ['letter-gamma', 'γα', 'gh'], ['letter-delta', 'δα', 'dh'], ['letter-epsilon', 'ε', 'e'],
  ['letter-zeta', 'ζα', 'z'], ['letter-eta', 'η', 'ee'], ['letter-theta', 'θα', 'th'], ['letter-iota', 'ι', 'ee'], ['letter-kappa', 'κα', 'k'],
  ['letter-lambda', 'λα', 'l'], ['letter-mu', 'μα', 'm'], ['letter-nu', 'να', 'n'], ['letter-xi', 'ξα', 'ks'], ['letter-omicron', 'ο', 'o'],
  ['letter-pi', 'πα', 'p'], ['letter-rho', 'ρα', 'r'], ['letter-sigma', 'σα', 's'], ['letter-tau', 'τα', 't'], ['letter-upsilon', 'υ', 'ee'],
  ['letter-phi', 'φα', 'f'], ['letter-chi', 'χα', 'kh'], ['letter-psi', 'ψα', 'ps'], ['letter-omega', 'ω', 'o'],
  ['diphthong-ai', 'αι', 'e'], ['diphthong-ei', 'ει', 'ee'], ['diphthong-oi', 'οι', 'ee'], ['diphthong-ui', 'υι', 'ee'], ['diphthong-ou', 'ου', 'oo'],
  ['diphthong-au', 'αυλ', 'av', ['a as in', 'v as in', 'f as in']], ['diphthong-eu', 'ευλ', 'ev', ['e as in', 'v as in', 'f as in']], ['diphthong-eeu', 'ηυλ', 'eev', ['ee as in', 'v as in', 'f as in']],
  ['pair-mp', 'μπα', 'b'], ['pair-nt', 'ντα', 'd'], ['pair-gk', 'γκα', 'g'], ['pair-gg', 'αγγα', 'ng'], ['pair-gch', 'αγχα', 'ng'], ['pair-gks', 'αγξα', 'nks'],
];

describe('the sound lessons of the Modern Greek scheme', () => {
  it('gives a lesson to every letter, vowel pair, consonant pair and breathing of the sounds, letters and marks tiers', () => {
    const bearing = LADDER.filter((i) => i.glyphs || i.parent).map((i) => i.id);
    expect(Object.keys(lessonsOf(modern)).sort()).toEqual([...bearing, 'accents', 'breathings', 'consonant-pairs', 'diphthongs', 'marks-change-word', 'words-sound-alike'].sort());
  });

  it('says for each letter and pair a sound that agrees with respellModern for the idea\'s own example word', () => {
    for (const [id, word, sound, parts = [sound]] of SOUNDS) {
      expect(respellModern(word).replace(/-/g, ''), `${id}: ${word}`).toContain(sound);
      for (const part of parts) {
        expect(ideaSound(ideaOf(id), modern) ?? '', `${id} sound`).toContain(part);
        expect(ideaText(ideaOf(id), modern), `${id} text`).toContain(part);
      }
    }
  });

  it('says χ has the two sounds the respelling writes, KH and HY, through the scheme\'s key words (mw-5r3p30.264)', () => {
    expect(respellModern('χάρις')).toBe('KHA-rees');
    expect(respellModern('χαίρετε')).toBe('HYE-re-te');
    const chi = ideaSound(ideaOf('letter-chi'), modern) ?? '';
    expect(chi).toContain(say.keyed('kh'));
    expect(chi).toContain(say.asIn('hy'));
    expect(chi).toContain('it is softer');
    expect(ideaText(ideaOf('letter-chi'), modern)).toContain(say.asIn('hy'));
    expect(chi).not.toMatch(/breathy h/);
    // γ keeps its two: gh, and y before the front letters (FRONT)
    expect(ideaSound(ideaOf('letter-gamma'), modern)).toContain(say.keyed('y'));
  });

  it('walks every idea of the letters, sounds and marks tiers: none says a breathing adds an h or that ὁ is “ho”', () => {
    for (const idea of LADDER.filter((i) => ['letters', 'sounds', 'marks'].includes(i.tier))) {
      const text = ideaText(idea, modern);
      expect(text, idea.id).not.toMatch(/adds an? [^.]*\bh\b/i);
      expect(text, idea.id).not.toMatch(/“ho”|"ho"|'ho'/);
      expect(text, idea.id).not.toMatch(/older Greek|Erasmian/i);
      expect(ideaSound(idea, modern) ?? '', idea.id).not.toMatch(/older Greek|Erasmian|a hat h/i);
    }
  });

  it('says the breathings are silent and ὁ is “o”, as respellModern speaks it', () => {
    expect(respellModern('ὁ')).toBe('o');
    expect(respellModern('ἐν')).toBe('en');
    for (const id of ['breathings', 'breathing-rough']) {
      expect(ideaText(ideaOf(id), modern), id).toContain('silent');
      expect(ideaText(ideaOf(id), modern), id).toContain('ὁ is “o”');
    }
    expect(ideaText(ideaOf('breathing-smooth'), modern)).toContain('ἐν is “en”');
  });
});

describe('a scheme with its own lessons, and one with none', () => {
  const TESTISH: Pronunciation = {
    ...MODERN,
    id: 'testish',
    label: 'Testish',
    lessons: () => ({ breathings: { text: 'Testish says the rough breathing as a hum.' }, 'breathing-rough': { text: 'The rough breathing hums.', sound: 'a hum' } }),
  };

  it('shows the selected scheme\'s text for an idea it has a lesson for', () => {
    const unregister = registerPronunciation(TESTISH);
    try {
      expect(ideaText(ideaOf('breathings'), pronunciationOf('testish'))).toBe('Testish says the rough breathing as a hum.');
      expect(ideaSound(ideaOf('breathing-rough'), pronunciationOf('testish'))).toBe('a hum');
    } finally {
      unregister();
    }
  });

  it('falls back to a scheme-neutral text, never an Erasmian one, for an idea the scheme has no lesson for', () => {
    const bare: Pronunciation = { ...MODERN, id: 'bare', label: 'Bare', lessons: undefined };
    for (const idea of LADDER.filter((i) => i.glyphs || i.parent || ['breathings', 'diphthongs', 'consonant-pairs', 'accents', 'marks-change-word'].includes(i.id))) {
      const text = ideaText(idea, bare);
      expect(text.trim(), idea.id).not.toBe('');
      expect(text, idea.id).not.toMatch(/Modern Greek|“ho”|older Greek|Erasmian|silent/i);
      expect(ideaSound(idea, bare), idea.id).toBeUndefined();
    }
  });

  it('leaves an idea that has nothing to do with sound as it was, whatever the scheme', () => {
    expect(ideaText(ideaOf('case-genitive'), modern)).toBe(ideaOf('case-genitive').text);
    expect(ideaText(ideaOf('punctuation'), modern)).toBe(ideaOf('punctuation').text);
  });
});

// The last two Modern-only phrases of ideas that are not a letter or a pair (mw-5r3p30.312): how an accent is said, and that the marks which change a
// word are not heard, are Modern Greek's lessons, so an Erasmian scheme says its own.
describe('the accents and the marks that change a word are taught by the scheme', () => {
  it('keeps no pronunciation in the ladder\'s own text of either', () => {
    for (const id of ['accents', 'marks-change-word']) expect(ideaOf(id).text, id).not.toMatch(/Modern Greek|louder|says each pair/);
  });

  it('gives Modern Greek\'s sound of them from its lessons', () => {
    expect(lessonsOf(modern).accents.also).toContain('said louder in Modern Greek');
    expect(lessonsOf(modern)['marks-change-word'].also).toContain('only the mark tells them apart');
    expect(ideaText(ideaOf('accents'), modern).startsWith(ideaOf('accents').text)).toBe(true);
    expect(ideaText(ideaOf('marks-change-word'), modern).startsWith(ideaOf('marks-change-word').text)).toBe(true);
    expect(soundLesson(ideaOf('accents'), modern)).toBe(lessonsOf(modern).accents.also);
    expect(ideaText(ideaOf('accents'), modern)).toContain('said louder in Modern Greek');
    expect(ideaText(ideaOf('marks-change-word'), modern)).toContain('only the mark tells them apart');
  });

  // his report (2026-10-21): the sheet said Modern Greek says each pair the same, but ἀλλά/ἄλλα and αὐτή/αὕτη differ in where the stress falls
  it('says a pair whose accent sits on another syllable is said with the stress moved, and the others the same, in respellModern\'s own respellings', () => {
    const also = lessonsOf(modern)['marks-change-word'].also ?? '';
    expect(also).not.toMatch(/each pair the same/);
    // the pairs said alike: a breathing or the kind of accent on one syllable
    for (const [a, b] of MARK_PAIRS.filter((p) => respellModern(p.a.word) === respellModern(p.b.word)).map((p) => [p.a.word, p.b.word])) {
      expect(respellModern(a), `${a}/${b}`).toBe(respellModern(b));
    }
    expect(respellModern('ἡ')).toBe('ee');
    expect(respellModern('ἤ')).toBe('ee');
    expect(also).toContain('ἡ and ἤ are both “ee”');
    // the pairs said apart: the stress moves
    const moved = MARK_PAIRS.filter((p) => respellModern(p.a.word) !== respellModern(p.b.word)).map((p) => [p.a.word, p.b.word]);
    expect(moved).toEqual([['ἀλλά', 'ἄλλα'], ['αὐτή', 'αὕτη']]);
    for (const [a, b] of moved) {
      expect(also, a).toContain(`${a} is “${respellModern(a)}” and ${b} is “${respellModern(b)}”`);
    }
    expect(also).toContain('stress');
  });

  it('gives another scheme\'s lesson of them, and Modern Greek\'s never', () => {
    const testish: Pronunciation = {
      ...MODERN,
      id: 'testish',
      label: 'Testish',
      lessons: () => ({ accents: { also: 'Testish sings the accented syllable high.' }, 'marks-change-word': { also: 'Testish says ἡ and ἤ apart by their pitch.' } }),
    };
    const unregister = registerPronunciation(testish);
    try {
      expect(ideaText(ideaOf('accents'), pronunciationOf('testish'))).toBe(`${ideaOf('accents').text} Testish sings the accented syllable high.`);
      expect(ideaText(ideaOf('marks-change-word'), pronunciationOf('testish'))).toBe(`${ideaOf('marks-change-word').text} Testish says ἡ and ἤ apart by their pitch.`);
      for (const id of ['accents', 'marks-change-word']) expect(ideaText(ideaOf(id), pronunciationOf('testish')), id).not.toContain('Modern Greek');
    } finally {
      unregister();
    }
  });
});

describe('the questions that state or ask a sound read it from the scheme', () => {
  const TESTISH: Pronunciation = {
    ...MODERN,
    id: 'testish',
    label: 'Testish',
    lessons: () => ({ 'breathing-rough': { text: 'The rough breathing hums.', sound: 'a hum' } }),
  };

  it('asks the rough breathing by its mark, and no question names an h', () => {
    const rough = ideaOf('breathing-rough');
    for (let seed = 1; seed < 20; seed++) {
      const q = buildIdeaQuestion(rough, [], mulberry32(seed), undefined, modern);
      expect(JSON.stringify(q), `seed ${seed}`).not.toMatch(/\bh\b|“ho”|adds/i);
    }
  });

  it('asks a letter by the sound the scheme gives it, and by name when the scheme gives none', () => {
    const alpha = ideaOf('letter-beta');
    const bare: Pronunciation = { ...MODERN, id: 'bare', label: 'Bare', lessons: undefined };
    const prompts = new Set<string>();
    for (let seed = 1; seed < 40; seed++) {
      const q = buildLetter(alpha, mulberry32(seed), modern);
      prompts.add(q.prompt);
      // the small letter or the capital (mw-86e9r1.11)
      expect(['β', 'Β']).toContain(q.right);
    }
    expect([...prompts].some((p) => p.includes('v, as in “vase”'))).toBe(true);
    for (let seed = 1; seed < 40; seed++) expect(['Which letter is Beta?', 'Which capital letter is Beta?']).toContain(buildLetter(alpha, mulberry32(seed), bare).prompt);
  });

  it('puts the scheme\'s sound on the quick round\'s "what sound does it make" card', () => {
    const unregister = registerPronunciation({ ...TESTISH, lessons: () => ({ 'diphthong-ou': { text: 'ου hums.', sound: 'a hum' }, 'diphthong-ai': { text: 'αι buzzes.', sound: 'a buzz' }, 'diphthong-ei': { text: 'ει whirs.', sound: 'a whir' } }) });
    try {
      const scheme = pronunciationOf('testish');
      let seen = false;
      for (let seed = 1; seed < 60 && !seen; seed++) {
        const q = quickQuestion({ id: 'diphthong-ou', mode: 'see' }, mulberry32(seed), scheme);
        if (q.kind === 'letter') {
          expect(q.right).toBe('a hum');
          expect(q.options).not.toContain('oo, as in “food”');
          seen = true;
        }
      }
      expect(seen).toBe(true);
    } finally {
      unregister();
    }
    expect(itemsOf('diphthongs').length).toBeGreaterThan(0);
  });
});
