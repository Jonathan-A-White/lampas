// A Greek word of one letter (Ὃ, ὁ, ἡ, ὦ, ἤ, ὅ) is never handed to the phone's voice: a Greek voice handed one letter names it ('omicron'), with or
// without an accent. mw-5r3p30.226, .256 and .262 each handed it another form and passed their tests, and his phone still said 'Omicron'
// (mw-5r3p30.347). Every way the app says a Greek word plays the chosen pronunciation's clip of the sound instead; the speech port is never handed a
// string that is one Greek letter. features/one-letter-greek-voice.feature hears it from the screens.
import { existsSync, readFileSync } from 'node:fs';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { injectManifestOptions } from '../../pwa-precache';
import { clearBus } from '../../src/events/bus';
import { syllableRuns } from '../../src/speech/answerRuns';
import { besideNow, isWordSaid, loneLetterClip, setGreekPronunciation, speak, speakLetter, speakWord, stopSpeaking, watchWordEnd } from '../../src/speech/greek';
import { DEFAULT_PRONUNCIATION, PRONUNCIATIONS, registerPronunciation, type Pronunciation } from '../../src/speech/pronunciation';
import { getReading, pauseReading, startAnswer, startReading, stopReading, type Run } from '../../src/speech/readAloud';
import { MODERN_LONE_CLIPS } from '../../src/speech/schemes/modern';
import { stubAudio, type FakeAudio } from '../support/fake-audio';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../support/fake-speech';

const ONE_LETTER = ['Ὃ', 'ὁ', 'ἡ', 'ὦ', 'ἤ', 'ὅ', 'ᾧ', 'ἃ'];

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

/** One Greek letter, whatever marks it carries. */
const oneGreekLetter = (text: string): boolean => {
  const bare = [...text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}]/gu, '')];
  return bare.length === 1 && /\p{Script=Greek}/u.test(bare[0]);
};
/** Nothing the speech port was handed is one Greek letter. */
const noLoneLetterSpoken = (): void => expect(synth.spoken.map((u) => u.text).filter(oneGreekLetter)).toEqual([]);

/** A scheme with its own clips, so each place that follows the chosen pronunciation shows. */
const STUB: Pronunciation = {
  id: 'stub-erasmian',
  label: 'Stub',
  lang: 'el-GR',
  scoringLang: 'el',
  note: '',
  respell: (w) => w,
  sounds: {},
  loneLetterClip: (w) => `/sounds/stub/${w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()}.mp3`,
  voiceForm: (t) => t,
  letterForm: (l) => l,
  tutorGuide: () => 'Stub.',
};

describe('a one-letter Greek word said alone', () => {
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

  it('a speaker shows it playing, and a second tap on it stops the clip', () => {
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

  it('plays with no Greek voice on the phone: a clip needs none', () => {
    vi.unstubAllGlobals();
    synth = stubSpeech([ENGLISH_VOICE]);
    let outcome = '';
    act(() => void (outcome = speak('ὁ', 'speaker:ὁ', 'greek')));
    expect(outcome).toBe('speaking');
    expect(audio.played).toEqual(['/sounds/modern/o.mp3']);
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

  it('a word of two letters or more still goes to the Greek voice, in lower case, and plays no clip', () => {
    act(() => void speakWord('Ἐν', 'greek'));
    act(() => void speak('λόγος', 'speaker:λόγος', 'greek'));
    expect(synth.spoken.map((u) => u.text)).toEqual(['ἐν', 'λόγος']);
    expect(synth.spoken.every((u) => u.voice === GREEK_VOICE)).toBe(true);
    expect(audio.played).toEqual([]);
  });

  it('a letter drill still names the letter: the voice is handed it, no clip plays', () => {
    act(() => void speakLetter('Ο'));
    expect(synth.spoken.map((u) => u.text)).toEqual(['ο']);
    expect(audio.played).toEqual([]);
  });

  it('a word said next cuts the clip off', () => {
    act(() => void speakWord('ὁ', 'greek'));
    act(() => void speakWord('λόγος', 'greek'));
    expect(audio.playing()).toBeNull();
    expect(synth.spoken.map((u) => u.text)).toEqual(['λόγος']);
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

  it('plays the clip woven between English, and the voice reads the English on each side', () => {
    readThrough(readRuns([
      { text: 'in the beginning was', language: 'english' },
      { text: 'ὁ', language: 'greek' },
      { text: 'Word', language: 'english' },
    ]));
    expect(audio.played).toEqual(['/sounds/modern/o.mp3']);
    expect(synth.spoken.map((u) => u.text)).toEqual(['in the beginning was', 'Word']);
    noLoneLetterSpoken();
  });

  it.each(ONE_LETTER)('never hands the voice %s alone', (word) => {
    readThrough(readRuns([{ text: word, language: 'greek' }, { text: 'That which', language: 'english' }]));
    expect(audio.played).toEqual([loneLetterClip(word)]);
    noLoneLetterSpoken();
  });

  it('plays a one-letter syllable of Sound it out as its clip, the other syllables by the voice', () => {
    readThrough(readRuns(syllableRuns(['ὦ', 'λό', 'γος'])));
    expect(audio.played).toEqual(['/sounds/modern/o.mp3']);
    expect(synth.spoken.map((u) => u.text).join(' ')).toBe('λό γος');
    noLoneLetterSpoken();
  });

  it("plays a lone ὁ in a tutor's answer as its clip", () => {
    readThrough(() => startAnswer(-7, [{ text: 'The article', language: 'english' }, { text: 'ὁ', language: 'greek' }, { text: 'is masculine.', language: 'english' }]));
    expect(audio.played).toEqual(['/sounds/modern/o.mp3']);
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

  it('leaves a Greek run of two letters or more to the voice as it was', () => {
    readThrough(readRuns([{ text: 'ὁ λόγος', language: 'greek' }]));
    expect(synth.spoken.map((u) => u.text)).toEqual(['ὁ λόγος']);
    expect(audio.played).toEqual([]);
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
    expect(synth.spoken.map((u) => u.text)).toEqual(['λόγος']);
  });
});

describe('the clips', () => {
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

  it('are precached, so a one-letter word plays offline', () => {
    expect(injectManifestOptions.globPatterns).toContain('sounds/*/*.mp3');
  });
});
