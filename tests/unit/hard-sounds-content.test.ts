// The Hard sounds content (mw-5r3p30.364): one lesson for each Modern Greek sound an English speaker finds hard, beside Rolling your r (mw-5r3p30.359). Each passes
// the lesson schema (src/data/hardSounds/schema.ts), gives its tip for an American and a British ear (one text when the two do not differ), names a 1 John verse rich
// in its sound for the verse step, and every word it shows is a word of the Lampas data that the Greek voice is handed to say. The pairs of 'Which did you hear?'
// must sound apart: two words the voice says alike would be a drill no ear can pass.
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { LESSON_ACCENTS, lessonProblems, type HardSoundLesson, type HardSoundStep, type Said } from '../../src/data/hardSounds/schema';
import { lessonById, lessonsFor, saidFor } from '../../src/hardSounds/lessons';
import { markLetters } from '../../src/hardSounds/markLetters';
import { accentOf } from '../../src/speech/accents';
import { greekWordSpeech, setVoice, speak, stopSpeaking } from '../../src/speech/greek';
import { respellModern } from '../../src/speech/schemes/modern';
import type { SoundId } from '../../src/speech/sounds';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

/** The lessons of this story, by file: γ, χ, δ and θ, π τ κ without the puff, pure vowels, κ γ χ λ before e and i, μπ ντ γκ, two consonants at a word's start. */
const CONTENT = ['gamma', 'chi', 'delta-theta', 'no-puff', 'pure-vowels', 'front-vowels', 'nasal-pairs', 'clusters'];
/** A lesson judged not hard for an accent, and so not written for it, by lesson id: none is (the story's closing comment says why). */
const DROPPED: Readonly<Record<string, readonly string[]>> = {};
/** The fewest letters of its sound a lesson's verse has marked. */
const RICH = 3;

const lessons = (): HardSoundLesson[] => CONTENT.map((id) => lessonById(id)).filter((l): l is HardSoundLesson => l !== undefined);
const raw = (id: string): unknown => JSON.parse(readFileSync(`src/data/hardSounds/${id}.json`, 'utf8'));

/** A word as the data and a lesson may both write it: NFC, its grave (a word inside a sentence) an acute (the word alone). */
const alone = (w: string): string => w.normalize('NFD').replace(/̀/gu, '́').normalize('NFC');

/** Every word of the Lampas data: each word form of every chapter (punctuation dropped) and every lemma of the lexicon. */
const DATA_WORDS: ReadonlySet<string> = (() => {
  const out = new Set<string>();
  for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const file of readdirSync(`public/data/${book.name}`)) {
      const chapter = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Partial<Chapter>;
      for (const verse of chapter.verses ?? []) for (const w of verse.g) out.add(alone(w.t.replace(/[^\p{Script=Greek}\p{M}]/gu, '')));
    }
  }
  const lexicon = JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')) as Record<string, unknown>;
  for (const key of Object.keys(lexicon)) for (const lemma of key.split(/[,=]\s*/u)) out.add(alone(lemma));
  return out;
})();

/** Every Greek word a lesson shows with a speaker: its steps' words and both words of each pair. */
const wordsOf = (lesson: HardSoundLesson): string[] =>
  lesson.steps.flatMap((s: HardSoundStep) => ('words' in s && s.words ? s.words : 'pairs' in s ? s.pairs.flat() : []));
const pairsOf = (lesson: HardSoundLesson): [string, string][] => lesson.steps.flatMap((s) => (s.kind === 'contrast' ? s.pairs : []));
const textOf = (lesson: HardSoundLesson, kinds: readonly HardSoundStep['kind'][], accent: string): string =>
  lesson.steps.filter((s) => kinds.includes(s.kind)).map((s) => saidFor(s.text, accentOf(accent))).join(' ');

let synth: FakeSynth;
beforeEach(() => {
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  stopSpeaking();
  setVoice('greek', null);
  vi.unstubAllGlobals();
});

describe('the Hard sounds lessons of mw-5r3p30.364', () => {
  it('ships every lesson listed, each passing the schema', () => {
    for (const id of CONTENT) {
      expect(lessonById(id), id).toBeDefined();
      expect(lessonProblems(raw(id)), id).toEqual([]);
    }
  });

  it('writes each for the American and the British ear, but where it is dropped for one', () => {
    for (const lesson of lessons()) expect(lesson.for, lesson.id).toEqual(LESSON_ACCENTS.filter((a) => !(DROPPED[lesson.id] ?? []).includes(a)));
    for (const accent of LESSON_ACCENTS) {
      const listed = lessonsFor('modern', accentOf(accent)).map((l) => l.id);
      for (const id of CONTENT) if (!(DROPPED[id] ?? []).includes(accent)) expect(listed, `${id} for ${accent}`).toContain(id);
    }
  });

  it('gives each accent its tip: one text when they do not differ, two that differ when they do', () => {
    for (const lesson of lessons()) {
      for (const accent of lesson.for) expect(textOf(lesson, ['why', 'from-known', 'try'], accent).trim(), `${lesson.id} ${accent}`).not.toBe('');
      const split = lesson.steps.map((s) => s.text).filter((t): t is Exclude<Said, string> => typeof t !== 'string');
      for (const text of split) expect(new Set(Object.values(text)).size, `${lesson.id}: a text split by accent says the same twice`).toBe(Object.keys(text).length);
    }
  });

  it("names each fricative by its accent's own word, as the sound hints do", () => {
    const named: SoundId[] = ['/x/', '/ç/', '/ʝ/', '/θ/'];
    for (const lesson of lessons())
      for (const sound of lesson.sounds.filter((s) => named.includes(s)))
        for (const accent of lesson.for) {
          const word = accentOf(accent).hints[sound]?.word;
          if (word) expect(textOf(lesson, ['why', 'from-known'], accent), `${lesson.id} ${sound} ${accent}`).toContain(`“${word}”`);
        }
  });

  it('shows only words of the Lampas data', () => {
    for (const lesson of lessons()) {
      const missing = wordsOf(lesson).filter((w) => !DATA_WORDS.has(alone(w)));
      expect(missing, lesson.id).toEqual([]);
    }
  });

  it('hands every word to the Greek voice, as its speaker does', () => {
    for (const lesson of lessons()) {
      const wrong: string[] = [];
      wordsOf(lesson).forEach((word, i) => {
        synth.spoken.length = 0;
        const outcome = speak(word, `${lesson.id}-${i}`);
        const said = synth.spoken[synth.spoken.length - 1];
        if (outcome !== 'speaking' || !said) wrong.push(`${word}: ${outcome}, nothing said`);
        else if (said.lang !== 'el-GR' || said.voice?.name !== GREEK_VOICE.name) wrong.push(`${word}: said in ${said.lang} by ${said.voice?.name ?? 'no voice'}`);
        else if (said.text !== greekWordSpeech(word).text) wrong.push(`${word}: handed ${said.text}`);
        stopSpeaking();
      });
      expect(wrong, lesson.id).toEqual([]);
    }
  });

  it('pairs words that the respelling and the voice tell apart', () => {
    for (const lesson of lessons()) {
      expect(pairsOf(lesson).length, lesson.id).toBeGreaterThanOrEqual(3);
      for (const [a, b] of pairsOf(lesson)) {
        expect(respellModern(a), `${lesson.id}: ${a} ~ ${b}`).not.toBe(respellModern(b));
        expect(greekWordSpeech(a).text, `${lesson.id}: ${a} ~ ${b}`).not.toBe(greekWordSpeech(b).text);
      }
    }
  });

  it('names one 1 John verse for each, rich in its sound, and no two lessons the same verse', () => {
    const refs: string[] = [lessonById('tapped-r')?.steps.find((s) => s.kind === 'verse') as { ref: string }].map((s) => s.ref);
    for (const lesson of lessons()) {
      const verses = lesson.steps.filter((s) => s.kind === 'verse');
      expect(verses.length, lesson.id).toBe(1);
      const { ref } = verses[0] as { ref: string };
      const [book, chapter, n] = ref.split('.');
      expect(book, lesson.id).toBe('1jn');
      const verse = (JSON.parse(readFileSync(`public/data/1jn/${chapter}.json`, 'utf8')) as Chapter).verses.find((v) => v.n === Number(n));
      expect(verse, `${lesson.id} ${ref}`).toBeDefined();
      const marked = markLetters(verse!.g.map((w) => w.t).join(' '), lesson.letters).filter((part) => typeof part !== 'string');
      expect(marked.length, `${lesson.id} ${ref}`).toBeGreaterThanOrEqual(RICH);
      refs.push(ref);
    }
    expect(new Set(refs).size).toBe(refs.length);
  });
});
