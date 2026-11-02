// The Hebrew Hard sounds lessons (mw-5r3p30.912): one lesson for each Hebrew sound an English speaker finds hard, taught on the Israeli pronunciation: het, ayin, resh and tsade. Each passes the
// lesson schema (src/data/hardSounds/schema.ts) as a Hebrew lesson, gives its tip to an American and a British ear, shows only words of the Lampas Hebrew data, hands every word to the Hebrew voice
// as its speaker does, and pairs only words the respelling and the voice tell apart.
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { LESSON_ACCENTS, lessonProblems, type HardSoundLesson, type HardSoundStep } from '../../src/data/hardSounds/schema';
import { lessonById, lessonLanguage, lessonsFor, saidFor } from '../../src/hardSounds/lessons';
import { markLetters } from '../../src/hardSounds/markLetters';
import { accentOf } from '../../src/speech/accents';
import { hebrewWordSpeech, setVoice, speak, stopSpeaking } from '../../src/speech/greek';
import { hebrewPronunciationOf } from '../../src/speech/pronunciation';
import { stripCantillation } from '../../src/speech/schemes/hebrew-israeli';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

const CONTENT = ['hebrew-het', 'hebrew-ayin', 'hebrew-resh', 'hebrew-tsade'];
const israeli = hebrewPronunciationOf();

const lessons = (): HardSoundLesson[] => CONTENT.map((id) => lessonById(id)).filter((l): l is HardSoundLesson => l !== undefined);
const raw = (id: string): unknown => JSON.parse(readFileSync(`src/data/hardSounds/${id}.json`, 'utf8'));
const nfc = (w: string): string => stripCantillation(w).normalize('NFC');

/** Every Hebrew word of the Lampas data: each form of every Old Testament chapter, and every lemma of the Hebrew lexicon, cantillation taken off. */
const DATA_WORDS: ReadonlySet<string> = (() => {
  const out = new Set<string>();
  for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const file of readdirSync(`public/data/${book.name}`)) {
      const chapter = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Partial<Chapter>;
      if (chapter.lang !== 'hbo') continue;
      for (const verse of chapter.verses ?? []) for (const w of verse.g) out.add(nfc(w.t.replace(/[־׃]/gu, '')));
    }
  }
  const lexicon = JSON.parse(readFileSync('public/data/lexicon-hbo.json', 'utf8')) as Record<string, unknown>;
  for (const key of Object.keys(lexicon)) for (const lemma of key.split(/[,=]\s*/u)) out.add(nfc(lemma));
  return out;
})();

const wordsOf = (lesson: HardSoundLesson): string[] => lesson.steps.flatMap((s: HardSoundStep) => ('words' in s && s.words ? s.words : 'pairs' in s ? s.pairs.flat() : []));
const pairsOf = (lesson: HardSoundLesson): [string, string][] => lesson.steps.flatMap((s) => (s.kind === 'contrast' ? s.pairs : []));

let synth: FakeSynth;
beforeEach(() => {
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE]);
});
afterEach(() => {
  stopSpeaking();
  setVoice('hebrew', null);
  vi.unstubAllGlobals();
});

describe('the Hebrew Hard sounds lessons of mw-5r3p30.912', () => {
  it('ships a lesson for het, ayin, resh and tsade, each a Hebrew lesson on the Israeli pronunciation passing the schema', () => {
    for (const id of CONTENT) {
      expect(lessonById(id), id).toBeDefined();
      expect(lessonProblems(raw(id)), id).toEqual([]);
      expect(lessonLanguage(lessonById(id)!), id).toBe('he');
      expect(lessonById(id)!.scheme, id).toBe(israeli.id);
    }
  });

  it('writes each for the American and the British ear, and lists none of them under a Greek pronunciation', () => {
    for (const lesson of lessons()) expect(lesson.for, lesson.id).toEqual(LESSON_ACCENTS);
    for (const accent of LESSON_ACCENTS) expect(lessonsFor(israeli.id, accentOf(accent)).map((l) => l.id).sort(), accent).toEqual([...CONTENT].sort());
    expect(lessonsFor('modern', accentOf('american')).filter((l) => CONTENT.includes(l.id))).toEqual([]);
  });

  it('gives each accent its tip', () => {
    for (const lesson of lessons())
      for (const accent of lesson.for)
        for (const step of lesson.steps) expect(saidFor(step.text, accentOf(accent)).trim(), `${lesson.id} ${accent} ${step.kind}`).not.toBe('');
  });

  it('shows only words of the Lampas Hebrew data', () => {
    for (const lesson of lessons()) expect(wordsOf(lesson).filter((w) => !DATA_WORDS.has(nfc(w))), lesson.id).toEqual([]);
  });

  it('marks the lesson letter in every word it hears, points and all', () => {
    for (const lesson of lessons()) {
      const hear = lesson.steps.find((s) => s.kind === 'hear');
      if (hear?.kind !== 'hear') throw new Error(`${lesson.id} has no hear step`);
      for (const word of hear.words) {
        const marks = markLetters(word, lesson.letters).filter((part) => typeof part !== 'string');
        expect(marks.length, `${lesson.id} ${word}`).toBeGreaterThan(0);
      }
    }
  });

  it('hands every word to the Hebrew voice, as its speaker does', () => {
    for (const lesson of lessons()) {
      const wrong: string[] = [];
      wordsOf(lesson).forEach((word, i) => {
        synth.spoken.length = 0;
        const outcome = speak(word, `${lesson.id}-${i}`, 'hebrew');
        const said = synth.spoken[synth.spoken.length - 1];
        if (outcome !== 'speaking' || !said) wrong.push(`${word}: ${outcome}, nothing said`);
        else if (said.lang !== 'he-IL' || said.voice?.name !== HEBREW_VOICE.name) wrong.push(`${word}: said in ${said.lang} by ${said.voice?.name ?? 'no voice'}`);
        else if (said.text !== hebrewWordSpeech(word).text) wrong.push(`${word}: handed ${said.text}`);
        stopSpeaking();
      });
      expect(wrong, lesson.id).toEqual([]);
    }
  });

  it('pairs words that the respelling and the voice tell apart', () => {
    for (const lesson of lessons()) {
      expect(pairsOf(lesson).length, lesson.id).toBeGreaterThanOrEqual(3);
      for (const [a, b] of pairsOf(lesson)) {
        expect(israeli.respell(a), `${lesson.id}: ${a} ~ ${b}`).not.toBe(israeli.respell(b));
        expect(hebrewWordSpeech(a).text, `${lesson.id}: ${a} ~ ${b}`).not.toBe(hebrewWordSpeech(b).text);
      }
    }
  });

  it('is refused by the schema when a Hebrew lesson holds a Greek word, a verse step or a Greek scheme', () => {
    const base = raw('hebrew-het') as HardSoundLesson;
    const withStep = (step: HardSoundStep): unknown => ({ ...base, steps: [...base.steps, step] });
    expect(lessonProblems({ ...base, steps: base.steps.map((s) => (s.kind === 'hear' ? { ...s, words: ['λόγος'] } : s)) }).join('\n')).toContain('is not a Hebrew word');
    expect(lessonProblems(withStep({ kind: 'verse', text: 'A verse.', ref: 'gen.1.1' })).join('\n')).toContain('no verse step');
    expect(lessonProblems({ ...base, scheme: 'modern' }).join('\n')).toContain('scheme: one of israeli');
    expect(lessonProblems({ ...base, letters: ['ρ'] }).join('\n')).toContain('Hebrew letters');
  });
});
