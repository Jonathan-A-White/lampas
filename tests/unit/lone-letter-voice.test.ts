// A Greek word of one letter (Ὃ, ὁ, ἡ, ὦ, ἤ, ὅ) is never handed to the phone's voice as it is: a Greek voice handed one letter names it ('omicron'), with
// or without an accent. mw-5r3p30.226, .256 and .262 each handed it another form and passed their tests, and his phone still said 'Omicron'. mw-5r3p30.347
// played an eSpeak NG clip of the sound instead, which jarred beside the phone's voice; on the listening trial (mw-5r3p30.395) the Governor chose the phone's
// own Greek voice handed the vowel DOUBLED ('οο'), which it says as the sound (mw-5r3p30.421). So every way the app says a Greek word hands the voice the
// chosen pronunciation's loneLetterForm, and the clip plays only on a phone with no Greek voice; the speech port is never handed a string that is one Greek
// letter, except where a letter is named on purpose (speakLetter). features/one-letter-greek-voice.feature hears it from the screens.
import { existsSync, readFileSync } from 'node:fs';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { injectManifestOptions } from '../../pwa-precache';
import { clearBus } from '../../src/events/bus';
import { syllableRuns } from '../../src/speech/answerRuns';
import { besideNow, isWordSaid, loneLetterClip, loneLetterSpeech, setGreekPronunciation, speak, speakLetter, speakSound, speakWord, stopSpeaking, watchWordEnd } from '../../src/speech/greek';
import { DEFAULT_PRONUNCIATION, PRONUNCIATIONS, registerPronunciation, type Pronunciation } from '../../src/speech/pronunciation';
import { getReading, pauseReading, startAnswer, startReading, stopReading, type Run } from '../../src/speech/readAloud';
import { MODERN, MODERN_LONE_CLIPS } from '../../src/speech/schemes/modern';
import { stubAudio, type FakeAudio } from '../support/fake-audio';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../support/fake-speech';

const ONE_LETTER = ['Ὃ', 'ὁ', 'ἡ', 'ὦ', 'ἤ', 'ὅ', 'ᾧ', 'ἃ'];
/** what Modern Greek hands the voice for each of ONE_LETTER: the bare vowel, doubled */
const DOUBLED: Readonly<Record<string, string>> = { Ὃ: 'οο', ὁ: 'οο', ἡ: 'ηη', ὦ: 'ωω', ἤ: 'ηη', ὅ: 'οο', ᾧ: 'ωω', ἃ: 'αα' };

let synth: FakeSynth;
let audio: FakeAudio;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
});
afterEach(() => {
  act(() => {
    stopReading();
    stopSpeaking();
  });
  setGreekPronunciation(DEFAULT_PRONUNCIATION);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** A phone with an English voice and no Greek one. */
function noGreekVoice(): void {
  vi.unstubAllGlobals();
  synth = stubSpeech([ENGLISH_VOICE]);
}

/** One Greek letter, whatever marks it carries. */
const oneGreekLetter = (text: string): boolean => {
  const bare = [...text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}]/gu, '')];
  return bare.length === 1 && /\p{Script=Greek}/u.test(bare[0]);
};
/** Nothing the speech port was handed is one Greek letter. */
const noLoneLetterSpoken = (): void => expect(synth.spoken.map((u) => u.text).filter(oneGreekLetter)).toEqual([]);
const said = (): string[] => synth.spoken.map((u) => u.text);

/** A scheme with its own form and clips, so each place that follows the chosen pronunciation shows. */
const STUB: Pronunciation = {
  id: 'stub-erasmian',
  label: 'Stub',
  lang: 'el-GR',
  scoringLang: 'el',
  note: '',
  respell: (w) => w,
  sounds: {},
  loneLetterForm: (w) => `${w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()}~`,
  loneLetterClip: (w) => `/sounds/stub/${w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()}.mp3`,
  voiceForm: (t) => t,
  letterForm: (l) => l,
  tutorGuide: () => 'Stub.',
};

describe('Modern Greek hands the voice a one-letter word doubled', () => {
  it.each(ONE_LETTER)('%s is its bare vowel, doubled', (word) => {
    expect(MODERN.loneLetterForm(word)).toBe(DOUBLED[word]);
  });

  it('every vowel, small or capital, has a form; a consonant has none', () => {
    expect([...'αεηιουω'].map((v) => MODERN.loneLetterForm(v))).toEqual(['αα', 'εε', 'ηη', 'ιι', 'οο', 'υυ', 'ωω']);
    expect(MODERN.loneLetterForm('Ω')).toBe('ωω');
    expect(['β', 'γ', 'θ', 'δ', 'ς'].map((c) => MODERN.loneLetterForm(c))).toEqual([null, null, null, null, null]);
  });

  it('a word of two letters or more has none', () => {
    expect(MODERN.loneLetterForm('ἐν')).toBeNull();
    expect(loneLetterSpeech('ἐν')).toBeNull();
  });
});

describe('a one-letter Greek word said alone', () => {
  it.each(ONE_LETTER)('%s from a speaker (speak) is handed to the Greek voice doubled, and no clip plays', (word) => {
    let outcome = '';
    act(() => void (outcome = speak(word, `speaker:${word}`, 'greek')));
    expect(outcome).toBe('speaking');
    expect(said()).toEqual([DOUBLED[word]]);
    expect(synth.spoken[0].lang).toBe('el-GR');
    expect(synth.spoken[0].voice).toBe(GREEK_VOICE);
    expect(audio.played).toEqual([]);
  });

  it.each(ONE_LETTER)('%s held or tapped (speakWord) is handed to the Greek voice doubled, and no clip plays', (word) => {
    act(() => void speakWord(word, 'greek'));
    expect(said()).toEqual([DOUBLED[word]]);
    expect(synth.spoken[0].voice).toBe(GREEK_VOICE);
    expect(audio.played).toEqual([]);
  });

  it('a speaker shows it playing, and a second tap on it stops it', () => {
    act(() => void speak('Ὃ', 'idea:Ὃ', 'greek'));
    expect(synth.speaking).toBe(true);
    let outcome = '';
    act(() => void (outcome = speak('Ὃ', 'idea:Ὃ', 'greek')));
    expect(outcome).toBe('stopped');
    expect(synth.speaking).toBe(false);
  });

  it('Tap to hear sees it end by itself', () => {
    let ended = false;
    act(() => void speakWord('ἡ', 'greek'));
    expect(isWordSaid()).toBe(true);
    const off = watchWordEnd(() => (ended = true));
    act(() => synth.finish());
    expect(ended).toBe(true);
    expect(isWordSaid()).toBe(false);
    off();
  });

  it('follows the chosen pronunciation: a second scheme hands the voice its own form', () => {
    const unregister = registerPronunciation(STUB);
    try {
      setGreekPronunciation('stub-erasmian');
      act(() => void speakWord('Ὃ', 'greek'));
      setGreekPronunciation(DEFAULT_PRONUNCIATION);
      act(() => void speakWord('Ὃ', 'greek'));
      expect(said()).toEqual(['ο~', 'οο']);
      expect(audio.played).toEqual([]);
    } finally {
      unregister();
    }
  });

  it('a word of two letters or more still goes to the Greek voice, in lower case (in monotonic marks, with \'!\')', () => {
    act(() => void speakWord('Ἐν', 'greek'));
    act(() => void speak('λόγος', 'speaker:λόγος', 'greek'));
    expect(said()).toEqual(['εν!', 'λόγος!']);
    expect(synth.spoken.every((u) => u.voice === GREEK_VOICE)).toBe(true);
    expect(audio.played).toEqual([]);
  });

  it('a teach tile still names the letter (speakLetter): the voice is handed it bare', () => {
    act(() => void speakLetter('Ο'));
    expect(said()).toEqual(['ο']);
    expect(audio.played).toEqual([]);
  });
});

describe('a letter asked about by ear (speakSound)', () => {
  it('a vowel is its sound: the Greek voice is handed it doubled', () => {
    act(() => void speakSound('Ο'));
    act(() => void speakSound('η'));
    expect(said()).toEqual(['οο', 'ηη']);
    expect(synth.spoken.every((u) => u.voice === GREEK_VOICE)).toBe(true);
  });

  it('a consonant, which no form makes the voice say alone, is still named', () => {
    act(() => void speakSound('Β'));
    expect(said()).toEqual(['β']);
  });

  it('a pair is handed over as it is', () => {
    act(() => void speakSound('ου'));
    expect(said()).toEqual(['ου']);
  });

  it('a vowel on a phone with no Greek voice plays its clip', () => {
    noGreekVoice();
    act(() => void speakSound('ο'));
    expect(audio.played).toEqual(['/sounds/modern/o.mp3']);
    expect(synth.spoken).toEqual([]);
  });
});

describe('a one-letter Greek word on a phone with no Greek voice', () => {
  beforeEach(noGreekVoice);

  it.each(ONE_LETTER)('%s from a speaker (speak) plays its clip and hands the voice nothing', (word) => {
    let outcome = '';
    act(() => void (outcome = speak(word, `speaker:${word}`, 'greek')));
    expect(outcome).toBe('speaking');
    expect(audio.played).toEqual([loneLetterClip(word)]);
    expect(synth.spoken).toEqual([]);
  });

  it.each(ONE_LETTER)('%s held or tapped (speakWord) plays its clip and hands the voice nothing', (word) => {
    act(() => void speakWord(word, 'greek'));
    expect(audio.played).toEqual([loneLetterClip(word)]);
    expect(synth.spoken).toEqual([]);
  });

  it('in Modern Greek, ὁ Ὃ ὦ ὅ ᾧ play the o, ἡ ἤ the ee and ἃ the a', () => {
    expect(['ὁ', 'Ὃ', 'ὦ', 'ὅ', 'ᾧ'].map(loneLetterClip)).toEqual(Array(5).fill('/sounds/modern/o.mp3'));
    expect(['ἡ', 'ἤ'].map(loneLetterClip)).toEqual(['/sounds/modern/ee.mp3', '/sounds/modern/ee.mp3']);
    expect(loneLetterClip('ἃ')).toBe('/sounds/modern/a.mp3');
  });

  it('a speaker shows the clip playing, and a second tap on it stops the clip', () => {
    act(() => void speak('Ὃ', 'idea:Ὃ', 'greek'));
    expect(besideNow()?.key).toBe('idea:Ὃ');
    expect(audio.playing()).not.toBeNull();
    let outcome = '';
    act(() => void (outcome = speak('Ὃ', 'idea:Ὃ', 'greek')));
    expect(outcome).toBe('stopped');
    expect(audio.playing()).toBeNull();
    expect(besideNow()).toBeNull();
  });

  it('Tap to hear sees the clip end by itself', () => {
    let ended = false;
    act(() => void speakWord('ἡ', 'greek'));
    expect(isWordSaid()).toBe(true);
    const off = watchWordEnd(() => (ended = true));
    act(() => audio.end());
    expect(ended).toBe(true);
    expect(isWordSaid()).toBe(false);
    off();
  });

  it('follows the chosen pronunciation: a second scheme plays its own clip', () => {
    const unregister = registerPronunciation(STUB);
    try {
      setGreekPronunciation('stub-erasmian');
      act(() => void speakWord('Ὃ', 'greek'));
      expect(audio.played).toEqual(['/sounds/stub/ο.mp3']);
      setGreekPronunciation(DEFAULT_PRONUNCIATION);
      act(() => void speakWord('Ὃ', 'greek'));
      expect(audio.played).toEqual(['/sounds/stub/ο.mp3', '/sounds/modern/o.mp3']);
      expect(synth.spoken).toEqual([]);
    } finally {
      unregister();
    }
  });

  it('a phrase with ὁ at its end (speakWord) says the rest, then plays the clip, and the voice is never handed ὁ', () => {
    act(() => void speakWord('ἄγγελος, -ου, ὁ', 'greek'));
    expect(said()).toEqual(['άγγελος, -ου!']);
    expect(audio.played).toEqual([]);
    act(() => synth.finishAll());
    expect(audio.played).toEqual(['/sounds/modern/o.mp3']);
    expect(isWordSaid()).toBe(true);
    act(() => audio.end());
    expect(isWordSaid()).toBe(false);
    noLoneLetterSpoken();
  });

  it('a phrase with ὁ in its middle says the text on each side of the clip, and a stop during the clip ends it there', () => {
    act(() => void speakWord('ὁ λόγος', 'greek'));
    expect(audio.played).toEqual(['/sounds/modern/o.mp3']);
    act(() => audio.end());
    expect(said()).toEqual(['λόγος!']);
    act(() => void speakWord('λόγος ὁ ἄγγελος', 'greek'));
    act(() => synth.finishAll());
    act(() => stopSpeaking());
    act(() => synth.finishAll());
    expect(audio.playing()).toBeNull();
    expect(said()).toEqual(['λόγος!', 'λόγος!']);
    expect(besideNow()).toBeNull();
  });

  it('a speaker (speak) on a phrase with ὁ speaks it in turn, and a second tap stops it', () => {
    let outcome = '';
    act(() => void (outcome = speak('ἄγγελος, -ου, ὁ', 'word:x', 'greek')));
    expect(outcome).toBe('speaking');
    act(() => void (outcome = speak('ἄγγελος, -ου, ὁ', 'word:x', 'greek')));
    expect(outcome).toBe('stopped');
    act(() => synth.finishAll());
    expect(audio.played).toEqual([]);
    act(() => void speak('ἄγγελος, -ου, ὁ', 'word:x', 'greek'));
    act(() => synth.finishAll());
    expect(audio.played).toEqual(['/sounds/modern/o.mp3']);
    noLoneLetterSpoken();
  });

  it('a phrase without a one-letter word is still refused by a speaker for want of a Greek voice', () => {
    let outcome = '';
    act(() => void (outcome = speak('ἄγγελος, -ου', 'word:y', 'greek')));
    expect(outcome).toBe('no-voice');
    expect(synth.spoken).toEqual([]);
  });

  it('a phrase said beside a reading paused it, says the text, plays the clip and leaves the reading paused', () => {
    act(() => startReading({ chapter: 1, plan: [{ n: 1, runs: [{ text: 'λόγος', language: 'greek' }] }], from: 1, continuous: false }));
    act(() => void speakWord('ἄγγελος, -ου, ὁ', 'greek'));
    act(() => synth.finishAll());
    expect(audio.played).toEqual(['/sounds/modern/o.mp3']);
    expect(besideNow()?.interrupted).toBe(true);
    act(() => audio.end());
    expect(besideNow()).toBeNull();
    expect(getReading().status).toBe('paused');
    noLoneLetterSpoken();
  });

  it('a word said next cuts the clip off', () => {
    act(() => void speakWord('ὁ', 'greek'));
    act(() => void speakWord('λόγος', 'greek'));
    expect(audio.playing()).toBeNull();
    expect(said()).toEqual(['λόγος!']);
  });
});

describe('a reading with a run that is one Greek letter', () => {
  /** Reads `runs` as one verse to its end: each clip ends by itself, the voice reads to the end of what it was handed. */
  function readThrough(start: () => void): void {
    act(start);
    for (let guard = 0; guard < 20 && getReading().status !== 'idle'; guard++) {
      act(() => {
        if (audio.playing()) audio.end();
        else synth.finishAll();
      });
    }
    expect(getReading().status).toBe('idle');
  }
  const readRuns = (runs: Run[]) => () => startReading({ chapter: 8, plan: [{ n: 1, runs }], from: 1, continuous: false });

  it('hands the voice the doubled vowel woven between English, a line of its own, and plays no clip', () => {
    readThrough(readRuns([
      { text: 'in the beginning was', language: 'english' },
      { text: 'ὁ', language: 'greek' },
      { text: 'Word', language: 'english' },
    ]));
    expect(said()).toEqual(['in the beginning was', 'οο', 'Word']);
    expect(synth.spoken[1].lang).toBe('el-GR');
    expect(audio.played).toEqual([]);
    noLoneLetterSpoken();
  });

  it.each(ONE_LETTER)('never hands the voice %s alone', (word) => {
    readThrough(readRuns([{ text: word, language: 'greek' }, { text: 'That which', language: 'english' }]));
    expect(said()).toEqual([DOUBLED[word], 'That which']);
    noLoneLetterSpoken();
  });

  it('says a one-letter syllable of Sound it out doubled, the other syllables as they are', () => {
    readThrough(readRuns(syllableRuns(['ὦ', 'λό', 'γος'])));
    expect(said().join(' ')).toBe('ωω λό γος');
    expect(audio.played).toEqual([]);
    noLoneLetterSpoken();
  });

  it("says a lone ὁ in a tutor's answer doubled", () => {
    readThrough(() => startAnswer(-7, [{ text: 'The article', language: 'english' }, { text: 'ὁ', language: 'greek' }, { text: 'is masculine.', language: 'english' }]));
    expect(said()).toContain('οο');
    expect(audio.played).toEqual([]);
    noLoneLetterSpoken();
  });

  it('follows the chosen pronunciation', () => {
    const unregister = registerPronunciation(STUB);
    try {
      setGreekPronunciation('stub-erasmian');
      readThrough(readRuns([{ text: 'ἡ', language: 'greek' }]));
      expect(said()).toEqual(['η~']);
    } finally {
      unregister();
    }
  });

  it('leaves a Greek run with no word of one letter to the voice as it was', () => {
    readThrough(readRuns([{ text: 'τὸν λόγον', language: 'greek' }]));
    expect(said()).toEqual(['τὸν λόγον']);
    expect(audio.played).toEqual([]);
  });

  it('cuts a Greek run at a word of one letter inside it, which is its form on a line of its own (mw-5r3p30.448)', () => {
    readThrough(readRuns([{ text: 'ὁ λόγος', language: 'greek' }]));
    expect(said()).toEqual(['οο', 'λόγος']);
    expect(audio.played).toEqual([]);
    noLoneLetterSpoken();
  });

  describe('on a phone with no Greek voice', () => {
    beforeEach(noGreekVoice);

    it('plays the clip woven between English, and the voice reads the English on each side', () => {
      readThrough(readRuns([
        { text: 'in the beginning was', language: 'english' },
        { text: 'ὁ', language: 'greek' },
        { text: 'Word', language: 'english' },
      ]));
      expect(audio.played).toEqual(['/sounds/modern/o.mp3']);
      expect(said()).toEqual(['in the beginning was', 'Word']);
      noLoneLetterSpoken();
    });

    it.each(ONE_LETTER)('plays the clip of %s', (word) => {
      readThrough(readRuns([{ text: word, language: 'greek' }, { text: 'That which', language: 'english' }]));
      expect(audio.played).toEqual([loneLetterClip(word)]);
      noLoneLetterSpoken();
    });

    it('follows the chosen pronunciation', () => {
      const unregister = registerPronunciation(STUB);
      try {
        setGreekPronunciation('stub-erasmian');
        readThrough(readRuns([{ text: 'ἡ', language: 'greek' }]));
        expect(audio.played).toEqual(['/sounds/stub/η.mp3']);
      } finally {
        unregister();
      }
    });

    it('Stop during the clip stops it, and nothing more is read', () => {
      act(readRuns([{ text: 'ὁ', language: 'greek' }, { text: 'Word', language: 'english' }]));
      expect(audio.playing()).not.toBeNull();
      act(() => stopReading());
      expect(audio.playing()).toBeNull();
      expect(synth.spoken).toEqual([]);
      expect(getReading().status).toBe('idle');
    });

    it('Pause during the clip waits: nothing is read after it until Resume', () => {
      act(readRuns([{ text: 'ὁ', language: 'greek' }, { text: 'Word', language: 'english' }]));
      act(() => pauseReading());
      act(() => audio.end());
      expect(getReading().status).toBe('paused');
      expect(synth.spoken).toEqual([]);
    });

    it('a word held during the clip cuts it off, and the reading waits at its verse', () => {
      act(readRuns([{ text: 'ὁ', language: 'greek' }, { text: 'Word', language: 'english' }]));
      act(() => void speakWord('λόγος', 'greek'));
      expect(getReading()).toMatchObject({ status: 'paused', verse: 1 });
      expect(said()).toEqual(['λόγος!']);
    });
  });
});

describe('the clips, for a phone with no Greek voice', () => {
  const pathOnDisk = (url: string) => `public${url}`;

  it.each(PRONUNCIATIONS.map((p) => p.id))('every vowel of %s has a clip, and the file is there, an MP3', (id) => {
    setGreekPronunciation(id);
    for (const vowel of 'αεηιουω') {
      const url = loneLetterClip(vowel);
      expect(url, vowel).toMatch(/^\/sounds\/[a-z-]+\/[a-z]+\.mp3$/);
      expect(existsSync(pathOnDisk(url!)), url!).toBe(true);
    }
  });

  it.each(MODERN_LONE_CLIPS)('%s is an MP3 of under 8 KB', (url) => {
    const bytes = readFileSync(pathOnDisk(url));
    expect(bytes.length).toBeGreaterThan(500);
    expect(bytes.length).toBeLessThan(8 * 1024);
    // an MPEG audio frame's sync word (no ID3 tag is written)
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1] & 0xe0).toBe(0xe0);
  });

  it('are precached, so a one-letter word plays offline on a phone with no Greek voice', () => {
    expect(injectManifestOptions.globPatterns).toContain('sounds/*/*.mp3');
  });
});
