// One scheme for every sound (mw-5r3p30.268): a second scheme registered and chosen changes a lesson's sound line, a word's respelling, a letter
// drill's spoken text, the form handed to the voice and what the tutor is told, with nothing else touched; choosing Modern Greek again brings its own
// back. This is the proof that another pronunciation (Erasmian) plugs in as one file in src/speech/schemes/ plus a line in SCHEMES.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import type { Chapter } from '../../src/data/chapter';
import { ideaOf } from '../../src/data/grammar/ladder';
import { ideaText } from '../../src/data/grammar/lessons';
import { syllablesOf } from '../../src/data/grammar/questions';
import { quickQuestion } from '../../src/data/grammar/quickRound';
import { mulberry32 } from '../../src/data/quiz';
import { clearBus } from '../../src/events/bus';
import { buildReadingRequest } from '../../src/services/reading';
import { buildTalkRequest, type TalkScope } from '../../src/services/talk';
import { buildRequest } from '../../src/services/tutor';
import { setGreekPronunciation, speakWord, stopSpeaking } from '../../src/speech/greek';
import { DEFAULT_PRONUNCIATION, pronunciationOf, registerPronunciation, type Pronunciation } from '../../src/speech/pronunciation';
import { speakQuestion } from '../../src/speech/speakQuestion';
import { stubAudio, type FakeAudio } from '../support/fake-audio';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../support/fake-speech';

/** A scheme unlike Modern Greek in every part, so each place that follows it shows. */
const STUBBISH: Pronunciation = {
  id: 'stubbish',
  label: 'Stubbish',
  lang: 'el-GR',
  scoringLang: 'el',
  note: 'A test scheme.',
  respell: (word) => `STUB-${[...word].length}`,
  keyWords: { b: 'bat', ow: 'out' },
  loneLetterClip: (word) => `/sounds/stubbish/${[...word].length}.mp3`,
  voiceForm: (text) => `‹${text}›`,
  letterForm: (letter) => `letter ${letter.toLowerCase()}`,
  tutorGuide: 'Stubbish: β is b, as in “bat”; ου is ow, as in “out”.',
  lessons: {
    'letter-beta': { sound: 'b, as in “bat”' },
    'diphthong-ou': { sound: 'ow, as in “out”' },
    'diphthong-ai': { sound: 'eye, as in “I”' },
  },
};

const verse = { n: 31, g: [{ t: 'ταῦτα', l: 'οὗτος', p: 'D-APN', s: 'G3778' }], e: [{ t: 'these things' }] } as unknown as Chapter['verses'][number];
const chapter = { book: 'rom', chapter: 8, title: 'Romans 8', verses: [verse] } as unknown as Chapter;
const scope = { book: 'rom', chapter, verse } as unknown as TalkScope;
const soundFocus = { form: 'ταῦτα', lemma: 'οὗτος', parse: 'demonstrative pronoun', kind: 'sound' as const };

let synth: FakeSynth;
let audio: FakeAudio;
let unregister: () => void;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
  unregister = registerPronunciation(STUBBISH);
  setGreekPronunciation(STUBBISH.id);
});
afterEach(() => {
  act(() => stopSpeaking());
  setGreekPronunciation(DEFAULT_PRONUNCIATION);
  unregister();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const lastSaid = (): { text: string; lang: string } => {
  const u = synth.spoken[synth.spoken.length - 1];
  return { text: u.text, lang: u.lang };
};

describe('a second pronunciation, chosen, is followed everywhere', () => {
  it("gives a lesson its sound line: Beta's lesson says the stub's sound, not Modern Greek's v", () => {
    const text = ideaText(ideaOf('letter-beta'));
    expect(text).toContain('In Stubbish it sounds like b, as in “bat”.');
    expect(text).not.toContain('vase');
  });

  it("respells a word by it: the tutor's sound question carries the stub's respelling and its rules, and syllables are cut by it", () => {
    const talk = buildTalkRequest(scope, 'How do I say it?', [], [], {}, soundFocus, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, STUBBISH.id);
    expect(talk.pronunciation).toBe('stubbish');
    expect(talk.focus).toMatchObject({ respelling: 'STUB-5' });
    expect(talk.pronunciation_guide).toBe(STUBBISH.tutorGuide);
    expect(syllablesOf('ταῦτα')).toEqual({ syllables: ['stub', '5'], stressed: 0 });
  });

  it('tells every tutor grind that speaks of a sound the scheme by its own rules', () => {
    expect(buildRequest('Romans 8:31', verse, 'How is ταῦτα said?', [], undefined, undefined, undefined, [], undefined, false, STUBBISH.id).pronunciation_guide).toBe(STUBBISH.tutorGuide);
    expect(buildReadingRequest('Romans 8:31', verse, 'greek', 'el', undefined, undefined, undefined, STUBBISH.id).pronunciation_guide).toBe(STUBBISH.tutorGuide);
  });

  it("asks a letter drill in its sounds and says the letter as it names one", () => {
    const see = quickQuestion({ id: 'diphthong-ou', mode: 'see' }, mulberry32(1));
    expect(see.right).toBe('ow, as in “out”');
    expect(see.options).not.toContain('oo, as in “food”');

    act(() => void speakQuestion(quickQuestion({ id: 'letter-beta', mode: 'hear' }, mulberry32(1))));
    expect(lastSaid()).toEqual({ text: 'letter β', lang: 'el-GR' });
  });

  it('plays its clip for a word of one letter, and hands the voice its form of any other Greek', () => {
    act(() => void speakWord('ὁ', 'greek'));
    expect(audio.played).toEqual(['/sounds/stubbish/1.mp3']);
    act(() => void speakWord('πάντοτε', 'greek'));
    expect(synth.spoken.map((u) => u.text)).toEqual(['‹πάντοτε›']);
  });

  it('gives every place back to Modern Greek when it is chosen again', () => {
    setGreekPronunciation(DEFAULT_PRONUNCIATION);
    expect(ideaText(ideaOf('letter-beta'))).toContain('vase');
    expect(syllablesOf('ταῦτα')).toEqual({ syllables: ['taf', 'ta'], stressed: 0 });
    expect(buildTalkRequest(scope, 'How do I say it?', [], [], {}, soundFocus).pronunciation_guide).toBe(pronunciationOf('modern').tutorGuide);
    act(() => void speakWord('πάντοτε', 'greek'));
    expect(lastSaid().text).toBe('πάν-ντοτε');
    act(() => void speakQuestion(quickQuestion({ id: 'letter-beta', mode: 'hear' }, mulberry32(1))));
    expect(lastSaid().text).toBe('β');
  });
});
