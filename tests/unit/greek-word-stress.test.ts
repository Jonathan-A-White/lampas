// What the Greek voice is handed for a word said alone carries its stress where the respelling puts it (mw-5r3p30.357). His report: Drill it on Pi, Step 5
// of 5, 'How is this word said?', Tap to hear on πατήρ (pa-TEER) 'sounds like the stress is on first syllable', 'the Voice goes high and then low', 'Like
// PA-teer'. A voice says a word handed alone as a statement: a high start and a fall, so a final stress sounds initial. espeak-ng el, measured on the box
// (Praat's pitch tracker on its own phoneme times), puts the peak of the bare word barely on its stress (πατήρ: 99 Hz on πα, 102 Hz on τήρ, then a fall to
// 79), and of the word with '!' clearly on it (99 Hz on πα, 115 Hz on τήρ; ἀγάπη 103 -> 116 Hz on γά, the i after it 83). So the Modern scheme hands a lone
// word with '!' (PROVISIONAL until he hears it). Every word with Tap to hear (a drill's, a lesson's, a word card's) is walked through the phone's
// synthesiser (the honest fake): it goes in el-GR, to a Greek voice, in monotonic marks (one tonos, on the vowel the respelling stresses; the breathings,
// the iota under a letter and every other accent gone), so no voice is handed an accent it may ignore.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import type { Chapter } from '../../src/data/chapter';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { LADDER } from '../../src/data/grammar/ladder';
import { teachOf } from '../../src/data/grammar/teach';
import { teachTiles } from '../../src/data/grammar/teachTiles';
import { clearBus } from '../../src/events/bus';
import { chosenPronunciation, setVoice, speak, speakWord, stopSpeaking } from '../../src/speech/greek';
import { respellModern } from '../../src/speech/schemes/modern';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, type FakeVoice, stubSpeech } from '../support/fake-speech';

const CYPRIOT: FakeVoice = { lang: 'el-CY', name: 'Greek (Cyprus)', voiceURI: 'Greek (Cyprus)' };

let synth: FakeSynth;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE, CYPRIOT]);
});
afterEach(() => {
  act(() => stopSpeaking());
  setVoice('greek', null);
  vi.unstubAllGlobals();
});

const chapter = (path: string): Chapter => JSON.parse(readFileSync(`public/data/${path}.json`, 'utf8')) as Chapter;
const PASSAGE = [chapter('rom/8'), chapter('1jn/1'), chapter('jhn/1')];

const isGreek = (w: string): boolean => /\p{Script=Greek}/u.test(w);
/** One letter, whatever its marks: said by its sound (a doubled vowel, mw-5r3p30.421) or a clip, never as a word. */
const oneLetter = (w: string): boolean => [...w.normalize('NFD').replace(/\p{M}/gu, '')].filter((c) => /\p{L}/u.test(c)).length <= 1;

/** The drill walks: with no passage a drill reads its fixed words (his drill read πατήρ there); with one, the passage's first. */
const WALKS = [['no passage', [], 1], ['no passage', [], 2], ['Romans 8, 1 John 1 and John 1', PASSAGE, 1], ['Romans 8, 1 John 1 and John 1', PASSAGE, 2]] as const;
/** The ladder is walked in SLICES (every SLICES-th idea from k): drillSteps is the cost, a whole walk of a passage takes seconds, so each test holds a slice of it. */
const SLICES = 4;
const sliceOf = (k: number) => LADDER.filter((_, i) => i % SLICES === k);

const drillWordsMemo = new Map<string, string[]>();
/** Every word a 'How is this word said?' or any other Tap to hear of Drill it hands the voice, over the ideas of one slice of the ladder in one walk (a 'sound' question says a letter's sound). The work is done once per slice. */
function drillWords(walk: number, slice: number): string[] {
  const key = `${walk}:${slice}`;
  let words = drillWordsMemo.get(key);
  if (!words) {
    const [, passage, seed] = WALKS[walk];
    const out = new Set<string>();
    for (const idea of sliceOf(slice))
      for (const step of drillSteps(idea.id, { passage, seed }))
        for (const q of step.questions) if (q.say && q.kind !== 'sound' && isGreek(q.say)) out.add(q.say);
    words = [...out];
    drillWordsMemo.set(key, words);
  }
  return words;
}

/** Every word of a lesson with a speaker: the worked examples of each idea's card and the example words of its tiles. */
function lessonWords(): string[] {
  const out = new Set<string>();
  for (const idea of LADDER) {
    for (const worked of teachOf(idea.id)?.worked ?? []) out.add(worked.say ?? worked.word);
    for (const tile of teachTiles(idea, chosenPronunciation())) {
      if (tile.example) out.add(tile.example.word);
      if (tile.say?.as === 'word') out.add(tile.say.text);
    }
  }
  return [...out].filter(isGreek);
}

/** Every word card's word: the lemmas a Quick test, a flashcard or the Words list says (the whole lexicon; the seed list's headwords are in it). */
function cardWords(): string[] {
  const lexicon = Object.keys(JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')) as Record<string, unknown>);
  // a key may list spellings ('Βοσόρ, Βεώρ', 'Ἑλληνίς=Ἑλληνίς'): a card says one
  return [...new Set(lexicon.flatMap((w) => w.normalize('NFC').split(/[,=]\s*/u)))].filter(isGreek);
}

const ACCENTS = /[\u0300\u0301\u0342\u0340\u0341]/u;
/** The vowels of a Greek text in order, each with whether an accent (any of acute, grave, circumflex) sits on it. */
function vowelsOf(text: string): { v: string; stressed: boolean }[] {
  const out: { v: string; stressed: boolean }[] = [];
  for (const c of text.normalize('NFD').toLowerCase()) {
    if ('αεηιουω'.includes(c)) out.push({ v: c, stressed: false });
    else if (out.length > 0 && ACCENTS.test(c)) out[out.length - 1].stressed = true;
  }
  return out;
}

/** What is wrong with `said`, handed to the phone for `word` said alone (a word, or a short phrase such as a preposition drill's), or null. */
function faultOf(word: string, said: { text: string; lang: string; voice: FakeVoice | null } | undefined, voice: FakeVoice = GREEK_VOICE): string | null {
  if (!said) return 'nothing reached the voice';
  if (said.lang !== 'el-GR') return `lang ${said.lang}`;
  if (said.voice?.name !== voice.name) return `voice ${said.voice?.name ?? 'none'}`;
  const text = said.text.normalize('NFD');
  const marks = [...text].filter((c) => /\p{M}/u.test(c) && c !== '\u0301' && c !== '\u0308');
  if (marks.length > 0) return `marks a voice may ignore: ${marks.map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`).join(' ')}`;
  if (!said.text.endsWith('!')) return "no '!' to keep the pitch peak on the stress";
  const wanted = word.trim().split(/\s+/u);
  const got = said.text.trim().split(/\s+/u);
  if (wanted.length !== got.length) return `${got.length} words`;
  for (const [i, w] of wanted.entries()) {
    const want = vowelsOf(w);
    const has = vowelsOf(got[i]);
    if (want.length !== has.length || want.some((v, j) => v.v !== has[j].v)) return `vowels ${has.map((g) => g.v).join('')} in ${got[i]}`;
    // the respelling stresses the first accented vowel (respellModern); the voice is handed exactly that one
    const stress = want.findIndex((v) => v.stressed);
    const tonos = [...got[i].normalize('NFD')].filter((c) => c === '\u0301').length;
    if (tonos !== (stress >= 0 ? 1 : 0)) return `${tonos} stress marks in ${got[i]}`;
    if (has.findIndex((v) => v.stressed) !== stress) return `the stress on another vowel in ${got[i]}`;
  }
  return null;
}

/** Says each word as its Tap to hear does (speakWord), and lists the words whose utterance is wrong, with why. */
function faults(words: readonly string[], voice: FakeVoice = GREEK_VOICE): string[] {
  const wrong: string[] = [];
  for (const word of words) {
    if (oneLetter(word)) continue;
    synth.spoken.length = 0;
    speakWord(word, 'greek');
    const fault = faultOf(word, synth.spoken[synth.spoken.length - 1], voice);
    if (fault) wrong.push(`${word}: ${fault}`);
    stopSpeaking();
  }
  return wrong;
}

describe('his report: πατήρ on Drill it, Pi, step 5', () => {
  it("is in Pi's 'How is this word said?'", () => {
    const pi = drillSteps('letter-pi', { passage: [], seed: 1 }).flatMap((s) => s.questions);
    expect(pi.some((q) => q.prompt === 'How is this word said?' && q.say === 'πατήρ')).toBe(true);
    expect(respellModern('πατήρ')).toBe('pa-TEER');
  });

  it("goes to the Greek voice as 'πατήρ!', its tonos on the η the respelling stresses; ἀγάπη (stress before the last) as 'αγάπη!'", () => {
    act(() => void speakWord('πατήρ', 'greek'));
    expect(synth.spoken.at(-1)).toMatchObject({ text: 'πατήρ!'.normalize('NFC'), lang: 'el-GR', voice: GREEK_VOICE });
    act(() => stopSpeaking());
    act(() => void speakWord('ἀγάπη', 'greek'));
    expect(synth.spoken.at(-1)).toMatchObject({ text: 'αγάπη!'.normalize('NFC'), lang: 'el-GR', voice: GREEK_VOICE });
  });

  it('a speaker button (speak) hands the same form as Tap to hear', () => {
    act(() => void speak('πατήρ', 'sheet-speaker'));
    expect(synth.spoken.at(-1)?.text).toBe('πατήρ!'.normalize('NFC'));
  });
});

describe('every word with Tap to hear reaches the Greek voice with one stress mark, where the respelling puts it', () => {
  for (const [walk, [what, , seed]] of WALKS.entries())
    for (let slice = 0; slice < SLICES; slice++)
      it(`every word a drill says: ideas ${slice + 1} of ${SLICES}, seed ${seed}, with ${what}`, () => {
        expect(faults(drillWords(walk, slice)).slice(0, 10)).toEqual([]);
      });

  it('the drill walks cover every idea of the ladder, and the words they say are the same set: more than 100, πατήρ among them', () => {
    expect(Array.from({ length: SLICES }, (_, k) => sliceOf(k)).flat().map((i) => i.id).sort()).toEqual(LADDER.map((i) => i.id).sort());
    const words = new Set<string>();
    for (const walk of WALKS.keys()) for (let slice = 0; slice < SLICES; slice++) for (const w of drillWords(walk, slice)) words.add(w);
    expect(words).toContain('πατήρ');
    expect(words.size).toBeGreaterThan(100);
  });

  it("every lesson's example word", () => {
    const words = lessonWords();
    expect(words.length).toBeGreaterThan(20);
    expect(faults(words).slice(0, 10)).toEqual([]);
  });

  it('every word card word (the whole lexicon)', () => {
    const words = cardWords();
    expect(words.length).toBeGreaterThan(5000);
    expect(faults(words).slice(0, 10)).toEqual([]);
  });

  it('polytonic marks are mapped first: a grave, a circumflex and a breathing become one tonos or go, one a word', () => {
    for (const [word, said] of [
      ['οὐδὲν', 'ουδέν!'],
      ['φῶς', 'φώς!'],
      ['ῥῆμα', 'ρήμα!'],
      ['υἱός', 'υιός!'],
      ['αὐτῷ', 'αυτώ!'],
      ['Ἰησοῦς', 'ιησούς!'],
      ['πρωΐ', 'πρωΐ!'],
      // an enclitic's second accent goes: the respelling stresses the first (PRO-tos)
      ['πρῶτός', 'πρώτος!'],
      ['εἰς τὴν Γαλιλαίαν', 'εις τήν γαλιλαίαν!'],
    ]) {
      synth.spoken.length = 0;
      act(() => void speakWord(word, 'greek'));
      expect(synth.spoken.at(-1)?.text.normalize('NFC'), word).toBe(said.normalize('NFC'));
      act(() => stopSpeaking());
    }
  });

  it('a Greek voice he chose is the one every drill word goes to', () => {
    setVoice('greek', CYPRIOT.voiceURI!);
    expect(faults(['πατήρ', 'ἀγάπη', 'λόγος', 'χάρις'], CYPRIOT)).toEqual([]);
  });
});
