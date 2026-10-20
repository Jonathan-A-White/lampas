// An elided word of one consonant (δ', the δέ of Luke 9:24, 25 places in the New Testament) is a word of ONE Greek letter: a voice handed it says the letter's
// name ('Delta': espeak-ng el reads ὃς δ' ἂν as 'oz Delta an'), and no voice can say a consonant alone as a sound. So held or tapped, it plays its bundled
// clip of the sound (Modern Greek: /ð/, the th of 'this'), on every phone, and the speech port is never handed δ' (mw-5r3p30.449). The sweep: every elided form
// in the text and the lexicon is said by its clip or as the whole word, never as a bare letter.
import { readdirSync, readFileSync } from 'node:fs';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { clearBus } from '../../src/events/bus';
import { isElided } from '../../src/speech/elision';
import { loneLetterCuts, speak, speakWord, stopSpeaking } from '../../src/speech/greek';
import { planOf, runsOf, startReading, stopReading } from '../../src/speech/readAloud';
import { MODERN, MODERN_LONE_CLIPS } from '../../src/speech/schemes/modern';
import { stubAudio, type FakeAudio } from '../support/fake-audio';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../support/fake-speech';

/** the marks that show a dropped vowel: the text's apostrophe, the typographic ones and the Greek koronis and psili */
const ELISION = "'’ʼ᾽᾿";
const DH_CLIP = '/sounds/modern/dh.mp3';

let synth: FakeSynth;
let audio: FakeAudio;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
});
afterEach(() => {
  act(() => stopSpeaking());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const said = (): string[] => synth.spoken.map((u) => u.text);
/** the letters of `text`, without marks, elision marks or punctuation */
const lettersOf = (text: string): string[] => [...text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}]|ʼ/gu, '')];
/** `text` is one Greek letter, whatever marks or apostrophe it carries */
const bareLetter = (text: string): boolean => {
  const letters = lettersOf(text);
  return letters.length === 1 && /\p{Script=Greek}/u.test(letters[0]);
};

describe("δ' held alone (Luke 9:24)", () => {
  it.each(["δ'", 'δ’', 'δ᾽'])('%s plays the clip of its sound, and the voice is never handed it', (word) => {
    act(() => void speakWord(word, 'greek'));
    expect(audio.played).toEqual([DH_CLIP]);
    expect(said()).toEqual([]);
  });

  it("a speaker that says δ' plays the clip too, and the voice says nothing", () => {
    expect(speak("δ'", 'w-1')).toBe('speaking');
    expect(audio.played).toEqual([DH_CLIP]);
    expect(said()).toEqual([]);
  });

  it('on a phone with no Greek voice it is the same clip', () => {
    vi.unstubAllGlobals();
    synth = stubSpeech([ENGLISH_VOICE]);
    act(() => void speakWord("δ'", 'greek'));
    expect(audio.played).toEqual([DH_CLIP]);
    expect(said()).toEqual([]);
  });

  it('the clip is one the scheme bundles (and its file is held to the disk with the others)', () => {
    expect(MODERN_LONE_CLIPS).toContain(DH_CLIP);
  });

  it('inside a verse read aloud δ\' stays with the words around it, as before (mw-5r3p30.448)', () => {
    expect(loneLetterCuts("ὃς δ' ἂν ἀπολέσῃ")).toEqual([{ text: "ὃς δ' ἂν ἀπολέσῃ", lone: false }]);
  });
});

/** Every elided form (a word ending in an elision mark) in the chapters' words and glosses and in the lexicon. */
function elidedForms(): string[] {
  const forms = new Set<string>();
  const word = new RegExp(`[\\p{Script=Greek}\\p{M}]+[${ELISION}]`, 'gu');
  const collect = (text: string) => {
    for (const m of text.matchAll(word)) forms.add(m[0].normalize('NFC'));
  };
  collect(readFileSync('public/data/lexicon.json', 'utf8'));
  for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const file of readdirSync(`public/data/${book.name}`)) collect(readFileSync(`public/data/${book.name}/${file}`, 'utf8'));
  }
  return [...forms].sort();
}

describe('every elided form in the text and the lexicon is said by its clip or as the whole word', () => {
  const forms = elidedForms();

  it("finds the forms (δ', ἀπ', κατ', ἐπ', ὑπ' among them)", () => {
    expect(forms).toEqual(expect.arrayContaining(["δ'", 'δ᾽', "ἀπ'", "κατ'", "ἐπ'", "ὑπ'", 'ἀπ᾽']));
  });

  it.each(forms)('%s', (form) => {
    act(() => void speakWord(form, 'greek'));
    const spoken = said();
    expect(spoken.filter(bareLetter), `the voice was handed a bare letter for ${form}`).toEqual([]);
    const vowelForm = MODERN.loneLetterForm(form);
    if (bareLetter(form) && vowelForm === null) {
      // a consonant and a dropped vowel: its clip, and nothing for the voice
      expect(audio.played, form).toHaveLength(1);
      expect(spoken).toEqual([]);
    } else if (bareLetter(form)) {
      // a vowel with a mark after it (Revelation's ω᾽, the numeral 800) is a one-letter word: the Greek voice is handed it doubled, its sound
      expect(spoken).toEqual([vowelForm]);
    } else {
      // the whole word goes to the voice, every letter of it
      expect(audio.played, form).toEqual([]);
      expect(spoken.map(lettersOf).map((l) => l.join('').toLowerCase())).toEqual([lettersOf(form).join('').toLowerCase()]);
    }
    act(() => stopSpeaking());
  });
});

// A verse read aloud: a one-consonant elided word (δ') inside a stretch of the reading used to arrive as a word of its own and the voice named the letter
// ('oz Delta an'). The reading joins it to the word after it (δ'ἂν: said 'dan'); the words on screen stay as they are.
describe('a verse read aloud never hands the voice a bare one-letter word (mw-5r3p30.654)', () => {
  const chapterOf = (file: string): Chapter => JSON.parse(readFileSync(file, 'utf8')) as Chapter;
  /** the words of `text` the voice is handed, as it splits them: by space or line */
  const wordsHanded = (text: string): string[] => text.split(/\s+/).filter(Boolean);
  const readAloud = (chapter: Chapter, verse: Verse): string[] => {
    startReading({ chapter: chapter.chapter, plan: planOf([verse], 'greek', null), from: verse.n, continuous: false });
    synth.finishAll();
    const handed = said();
    stopReading();
    return handed;
  };

  it("Luke 9:24 'ὃς δ' ἂν ἀπολέσῃ': δ' goes joined to ἂν, and the words shown are unchanged", () => {
    const chapter = chapterOf('public/data/luk/9.json');
    const verse = chapter.verses.find((v) => v.n === 24) as Verse;
    const shown = runsOf(verse, 'greek', null).map((r) => r.text);
    expect(shown.join(' ')).toContain("ὃς δ' ἂν ἀπολέσῃ");
    const handed = readAloud(chapter, verse).flatMap(wordsHanded);
    expect(handed.filter(bareLetter)).toEqual([]);
    expect(handed).toContain("δ'ἂν");
    expect(handed).not.toContain("δ'");
  });

  /** every verse of the text that holds a word of one consonant and a mark of a dropped vowel (δ' δ᾽ τ' θ'), with its chapter */
  function verses(): { name: string; chapter: Chapter; verse: Verse }[] {
    const found: { name: string; chapter: Chapter; verse: Verse }[] = [];
    for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'ladder')) {
      for (const file of readdirSync(`public/data/${book.name}`)) {
        const chapter = chapterOf(`public/data/${book.name}/${file}`);
        for (const verse of chapter.verses) {
          if (verse.g.some((w) => isElided(w.t) && bareLetter(w.t))) found.push({ name: `${book.name} ${file.replace('.json', '')}:${verse.n}`, chapter, verse });
        }
      }
    }
    return found;
  }
  const holding = verses();

  it('finds the verses (25 places in the New Testament)', () => {
    expect(holding.length).toBeGreaterThanOrEqual(20);
  });

  it.each(holding.map((h) => [h.name, h] as const))('%s: no bare one-letter word reaches the voice', (_name, { chapter, verse }) => {
    const handed = readAloud(chapter, verse).flatMap(wordsHanded);
    expect(handed.filter(bareLetter), `the voice was handed ${handed.filter(bareLetter).join(' ')}`).toEqual([]);
  });

  it("κατ' and ἀπ' are kept as they are", () => {
    const handed = readAloud(chapterOf('public/data/luk/9.json'), { n: 1, g: [{ t: "κατ'" }, { t: "ἀπ'" }, { t: 'ἄλλο' }] } as unknown as Verse);
    expect(handed.flatMap(wordsHanded)).toEqual(expect.arrayContaining(["κατ'", "ἀπ'"]));
  });
});
