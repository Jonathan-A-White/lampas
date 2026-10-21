// What the Greek voice is handed agrees with the respelling (mw-5r3p30.264): his report was Πάντοτε (1 Thessalonians 5:16) respelt 'PAN-do-te' and
// heard 'PA-do-te', because a Modern Greek voice drops the n of ντ inside a word. The Modern scheme hands the voice a form that keeps the nasal
// ('πάν-ντοτε': the nasal ends the first part, the pair opens the next as at a word's start), and the same for μπ and γκ; a word that begins with
// the pair is handed over as it is. The rule is the scheme's (its voiceForm), never greek.ts's or readAloud.ts's, so another scheme brings its own. A word
// said alone is also in monotonic marks with '!' (the scheme's wordForm, mw-5r3p30.357: tests/unit/greek-word-stress.test.ts).
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import type { Chapter } from '../../src/data/chapter';
import { clearBus } from '../../src/events/bus';
import { greekWordSpeech, setGreekPronunciation, speakWord, stopSpeaking } from '../../src/speech/greek';
import { DEFAULT_PRONUNCIATION, pronunciationOf, registerPronunciation, type Pronunciation } from '../../src/speech/pronunciation';
import { startReading, stopReading } from '../../src/speech/readAloud';
import { greekSyllables } from '../../src/speech/greekSyllables';
import { MODERN, respellModern, wordFormModern } from '../../src/speech/schemes/modern';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../support/fake-speech';

let synth: FakeSynth;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  act(() => stopSpeaking());
  stopReading();
  setGreekPronunciation(DEFAULT_PRONUNCIATION);
  vi.unstubAllGlobals();
});

const heard = (word: string): string => {
  act(() => void speakWord(word, 'greek'));
  const said = synth.spoken[synth.spoken.length - 1];
  expect(said.lang).toBe('el-GR');
  expect(said.voice).toBe(GREEK_VOICE);
  act(() => stopSpeaking());
  return said.text.normalize('NFC');
};

/** The sounds a respelling writes, without its syllable breaks or stress: 'PAN-do-te' is 'pandote'. */
const sounds = (respelling: string): string => respelling.replace(/-/g, '').toLowerCase();
/** The bare letters of a Greek word: no accents, breathings or diaeresis, lower case. */
const bare = (word: string): string => word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
/** ντ, μπ or γκ inside a word: after a vowel of the same word, where Modern Greek says (and the respelling writes) a nasal before it. */
const hasMedialPair = (word: string): boolean => /[αεηιουω][^\s]*?(ντ|μπ|γκ)/u.test(bare(word));

describe('the Greek voice keeps the nasal of ντ, μπ and γκ inside a word', () => {
  it.each([
    ['πάντοτε', 'πάν-ντοτε!', 'PAN-do-te'],
    ['Πάντοτε', 'πάν-ντοτε!', 'PAN-do-te'],
    ['ἐντολή', 'εν-ντολή!', 'en-do-LEE'],
    ['συμπάσχω', 'συμ-μπάσχω!', 'seem-BA-skho'],
    ['ἀγκάλη', 'αν-γκάλη!', 'an-GA-lee'],
  ])('%s goes to the Greek voice as %s, which keeps the n the respelling %s shows', (word, said, respelling) => {
    expect(heard(word)).toBe(said.normalize('NFC'));
    expect(respellModern(word)).toBe(respelling);
    // read part by part by the scheme's own rules, what the voice is handed says the respelling's sounds, nasal and all
    expect(sounds(said.split('-').map(respellModern).join(''))).toBe(sounds(respelling));
  });

  it.each([
    ['ντομάτα', 'do-MA-ta'],
    ['μπαίνω', 'BE-no'],
    ['γκρεμός', 'gre-MOS'],
  ])('%s, which begins with the pair (said as d, b or g there), is handed over as it is', (word, respelling) => {
    expect(heard(word)).toBe(`${word}!`.normalize('NFC'));
    expect(respellModern(word)).toBe(respelling);
  });

  it('changes only the pair inside the word when the word also begins with one', () => {
    expect(heard('μπαμπάς')).toBe('μπαμ-μπάς!');
  });

  it('leaves γγ as it is: a Modern Greek voice says its nasal (ἄγγελος)', () => {
    expect(heard('ἄγγελος')).toBe('άγγελος!'.normalize('NFC'));
  });

  it('is what a verse read aloud hands the voice too (1 Thessalonians 5:16)', () => {
    startReading({ chapter: 5, plan: [{ n: 16, runs: [{ text: 'Πάντοτε χαίρετε', language: 'greek' }] }], from: 16, continuous: false });
    synth.finishAll();
    expect(synth.spoken.map((u) => u.text.normalize('NFC')).join(' ')).toBe('Πάν-ντοτε χαίρετε'.normalize('NFC'));
    expect(synth.spoken.every((u) => u.lang === 'el-GR')).toBe(true);
  });
});

describe('every bundled word', () => {
  const forms = new Set<string>(Object.keys(JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')) as Record<string, unknown>));
  for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'ladder')) {
    for (const file of readdirSync(`public/data/${book.name}`)) {
      const chapter = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Chapter;
      for (const verse of chapter.verses) for (const w of verse.g) forms.add(w.t);
    }
  }
  const words = [...forms].map((w) => w.normalize('NFC').toLowerCase()).filter((w) => /\p{Script=Greek}/u.test(w));

  it('whose respelling has the nasal of ντ, μπ or γκ inside it is handed to the voice with the nasal kept', () => {
    const nasal = words.filter(hasMedialPair);
    expect(nasal.length).toBeGreaterThan(200);
    expect(nasal).toContain('πάντοτε');
    const wrong = nasal.filter((w) => {
      const said = greekWordSpeech(w).text;
      const parts = said.split('-');
      // each part but the last ends on the nasal, and each but the first opens with the pair, as at a word's start
      return parts.length < 2 || parts.slice(0, -1).some((p) => !/[νμ]$/u.test(bare(p))) || parts.slice(1).some((p) => !/^(ντ|μπ|γκ)/u.test(bare(p)));
    });
    expect(wrong.slice(0, 10)).toEqual([]);
  });

  it('is handed to the voice in a form whose sounds, read by the scheme, are the respelling\'s', () => {
    // the hard g after a nasal (γκ, γγ) is written 'gh' when it opens a stressed syllable before e or i, so an English reader does not say j; a part
    // read alone may be stressed where the word is not ('γκέν' alone is 'ghen', the 'gen' of 'a-PEE-nen-gen'), so the two spellings are one sound here
    const hardG = (respelt: string): string => respelt.replace(/ngh/g, 'ng');
    const disagree = words.filter((w) => {
      const said = greekWordSpeech(w).text;
      // αυ, ευ or ηυ before its own v or f (εὐφράτης: 'ef-FRA-tees') is handed as εφφ, which the scheme reads as one f (mw-5r3p30.647: tests/unit/voice-au-eu.test.ts)
      const once = (text: string): string => (/[αεη]υ/u.test(bare(w)) ? text.replace(/([vf])\1/gu, '$1') : text);
      return once(hardG(sounds(said.split('-').map(respellModern).join('')))) !== once(hardG(sounds(respellModern(w))));
    });
    expect(disagree.slice(0, 10)).toEqual([]);
  });

  it('with no ντ, μπ or γκ inside it is handed over as it is: the same letters (its marks made monotonic, its last stop the lone word\'s \'!\')', () => {
    const letters = (text: string): string => bare(text).replace(/[^\p{L}]/gu, '');
    const changed = words.filter((w) => {
      const said = greekWordSpeech(w).text;
      // a word with αυ, ευ or ηυ has the υ of its pair written β or φ (tests/unit/voice-au-eu.test.ts, mw-5r3p30.647)
      return [...bare(w)].length > 1 && !hasMedialPair(w) && !/[αεη]υ/u.test(bare(w)) && (letters(said) !== letters(w) || !said.endsWith('!'));
    });
    expect(changed.slice(0, 10)).toEqual([]);
  });

  it('is handed over as every bundled word of two or more syllables with exactly one tonos', () => {
    const without = words.filter((w) => !/[\u0301\u0300\u0342]/u.test(w.normalize('NFD')) && greekSyllables(bare(w)).length > 1);
    expect(without).toContain('ἐστιν'.normalize('NFC'));
    const wrong = without.filter((w) => (wordFormModern(w).normalize('NFD').match(/\u0301/gu) ?? []).length !== 1);
    expect(wrong.slice(0, 10)).toEqual([]);
  });
});

describe('the voice form and the respelling are the scheme\'s', () => {
  const STUB: Pronunciation = {
    id: 'stub-second',
    label: 'Stub',
    lang: 'el-GR',
    scoringLang: 'el',
    note: '',
    respell: (w) => `<${bare(w)}>`,
    sounds: {},
    loneLetterForm: () => null,
    loneLetterClip: () => null,
    voiceForm: (text) => text.replace(/τ/gu, 'θ'),
    letterForm: (letter) => letter,
    tutorGuide: () => 'Stub.',
  };

  it('a second scheme registered and chosen gives its own voice form and respelling; the Modern rule is not applied', () => {
    const unregister = registerPronunciation(STUB);
    try {
      setGreekPronunciation(STUB.id);
      expect(heard('πάντοτε')).toBe('πάνθοθε');
      expect(pronunciationOf(STUB.id).respell('πάντοτε')).toBe('<παντοτε>');
      synth.spoken.length = 0;
      startReading({ chapter: 5, plan: [{ n: 16, runs: [{ text: 'Πάντοτε χαίρετε', language: 'greek' }] }], from: 16, continuous: false });
      synth.finishAll();
      expect(synth.spoken.map((u) => u.text.normalize('NFC')).join(' ')).toBe('Πάνθοθε χαίρεθε');
      stopReading();
      setGreekPronunciation(DEFAULT_PRONUNCIATION);
      expect(heard('πάντοτε')).toBe('πάν-ντοτε!');
    } finally {
      unregister();
    }
  });

  it('greek.ts and readAloud.ts name no Greek sound rule of their own: ντ, μπ, γκ and χ are the scheme\'s', () => {
    for (const file of ['src/speech/greek.ts', 'src/speech/readAloud.ts']) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/ντ|μπ|γκ|χ/u);
    }
    expect(MODERN.voiceForm('πάντοτε')).toBe('πάν-ντοτε');
  });
});

// His report (John 6:48, the reading check's εἰ · μι card): the speaker said 'e, i' for εἰμι, not 'ee-mee'. The word reached the el-GR voice as 'ειμι!', with no
// tonos, and a voice handed a two-syllable word with no stress reads its letters apart (mw-5r3p30.701).
describe('a word said alone that carries no accent of its own', () => {
  it('is the same monotonic form written precomposed (ἰ, U+1F30) or decomposed (ι and U+0313), with no breathing left', () => {
    const precomposed = 'ε\u1f30\u03bc\u03b9';
    const decomposed = 'ε\u03b9\u0313\u03bc\u03b9';
    expect(precomposed).not.toBe(decomposed);
    expect(wordFormModern(precomposed)).toBe(wordFormModern(decomposed));
    expect(wordFormModern(precomposed)).not.toMatch(/\p{M}(?!$)|[\u0313\u0314\u1f00-\u1fff]/u);
  });

  it('of two or more syllables is given the tonos on its last, the stress of the orthotone form (εἰμι is ee-MEE)', () => {
    expect(wordFormModern('εἰμι')).toBe('ειμί!');
    expect(wordFormModern('ἐστι')).toBe('εστί!');
    expect(wordFormModern('ἐστιν')).toBe('εστίν!');
    expect(wordFormModern('τινες')).toBe('τινές!');
    expect(wordFormModern('ποτε')).toBe('ποτέ!');
    expect(wordFormModern('ἀλληλουϊα')).toBe('αλληλουϊά!');
    expect(respellModern(wordFormModern('εἰμι'))).toBe('ee-MEE');
  });

  it('puts the tonos on the second letter of a last syllable that is a diphthong, so the pair stays one sound', () => {
    expect(wordFormModern('ἀγαθοι')).toBe('αγαθοί!');
    expect(respellModern(wordFormModern('ἀγαθοι'))).toBe('a-gha-THEE');
  });

  it('of one syllable (τις, μου, εἰς, ὁ, a word cut short by an elision) is left as it is: there is no second syllable to be louder than', () => {
    expect(wordFormModern('τις')).toBe('τις!');
    expect(wordFormModern('μου')).toBe('μου!');
    expect(wordFormModern('εἰς')).toBe('εις!');
    expect(wordFormModern('ὁ')).toBe('ο!');
    expect(wordFormModern('καθ\u2019')).toBe('καθ’!');
  });

  it('keeps the accent a word has (no second tonos) and reaches the voice through speakWord', () => {
    expect(wordFormModern('εἰμί')).toBe('ειμί!');
    expect(heard('εἰμι')).toBe('ειμί!');
    expect(heard('ἐστι')).toBe('εστί!');
  });

});
