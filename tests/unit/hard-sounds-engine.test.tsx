// The Hard sounds engine (mw-5r3p30.361): a lesson is a data file of typed steps (src/data/hardSounds/<id>.json), checked by one schema
// (src/data/hardSounds/schema.ts), and one screen draws any lesson that passes it. These tests run the schema over every lesson shipped and over
// malformed ones, pick the lessons for an accent, and draw a lesson no code knows of, step by step, in each accent.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lessonProblems, parseLesson, type HardSoundLesson } from '../../src/data/hardSounds/schema';
import { LessonSteps } from '../../src/hardSounds/HardSoundLesson';
import { LESSONS, lessonAccent, lessonsFor, lessonsForLetter, saidFor } from '../../src/hardSounds/lessons';
import { accentOf, chooseAccent, DEFAULT_ACCENT } from '../../src/speech/accents';
import { SOUND_IDS } from '../../src/speech/sounds';
import { stubChapterFetch } from '../support/chapter-fetch';

const DIR = 'src/data/hardSounds';
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.json'));

/** A lesson no file holds, with every kind of step, to show the screen needs no code for a new one. */
const MADE_UP = {
  id: 'made-up',
  title: 'A made-up sound',
  scheme: 'modern',
  for: ['american', 'british'],
  sounds: ['/x/'],
  letters: ['χ'],
  steps: [
    { kind: 'why', text: { american: 'Why, for an American.', british: 'Why, for a Briton.' } },
    { kind: 'from-known', text: 'Start from a sound you know.' },
    { kind: 'hear', text: 'Hear it.', words: ['χαρά', 'ἔχω'] },
    { kind: 'contrast', text: 'Tell them apart.', pairs: [['χαρά', 'καρά']] },
    { kind: 'try', text: 'Say it after the voice.', words: ['χαρά'] },
    { kind: 'verse', text: 'Read a verse with it.', ref: '1jn.1.3' },
  ],
};
const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(MADE_UP)) as Record<string, unknown>;
const stepsOf = (raw: Record<string, unknown>): Record<string, unknown>[] => raw.steps as Record<string, unknown>[];

/** The characters only IPA writes, and the sounds' slashed ids (as tests/unit/no-ipa-shown.test.tsx). */
const ipaIn = (text: string): string[] => [...(text.match(/[ɣʝðɛɔʃːçŋɾɡ]/gu) ?? []), ...SOUND_IDS.filter((id) => text.includes(id))];

beforeEach(() => {
  stubChapterFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  chooseAccent(DEFAULT_ACCENT);
});

describe('the schema', () => {
  it('passes every lesson shipped, each named by its file', () => {
    expect(FILES.length).toBeGreaterThan(0);
    for (const file of FILES) {
      const raw: unknown = JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8'));
      expect(lessonProblems(raw), file).toEqual([]);
      expect(parseLesson(raw).id, file).toBe(file.replace(/\.json$/, ''));
    }
    expect(LESSONS.map((l) => l.id).sort()).toEqual(FILES.map((f) => f.replace(/\.json$/, '')).sort());
  });

  it('passes a lesson with every kind of step', () => {
    expect(lessonProblems(MADE_UP)).toEqual([]);
  });

  it.each<[string, (raw: Record<string, unknown>) => void, RegExp]>([
    ['not an object', () => undefined, /object/],
    ['no id', (raw) => delete raw.id, /id/],
    ['an id that is not kebab case', (raw) => (raw.id = 'Made Up'), /id/],
    ['an unknown pronunciation', (raw) => (raw.scheme = 'klingon'), /scheme/],
    ['no accent', (raw) => (raw.for = []), /for/],
    ['an unknown accent', (raw) => (raw.for = ['american', 'martian']), /for/],
    ['an unknown sound', (raw) => (raw.sounds = ['/q/']), /sounds/],
    ['a letter that is not Greek', (raw) => (raw.letters = ['r']), /letters/],
    ['no steps', (raw) => (raw.steps = []), /steps/],
    ['an unknown kind of step', (raw) => stepsOf(raw).splice(2, 0, { kind: 'dance', text: 'Dance.' }), /dance/],
    ['a lesson that does not start with why', (raw) => stepsOf(raw).reverse(), /why/],
    ['a lesson missing a kind of step', (raw) => (raw.steps = stepsOf(raw).filter((s) => s.kind !== 'contrast')), /contrast/],
    ['a verse step that is not the last', (raw) => stepsOf(raw).splice(1, 0, { kind: 'verse', text: 'A verse.', ref: '1jn.1.1' }), /verse/],
    ['a text missing an accent it is for', (raw) => (stepsOf(raw)[0].text = { american: 'Only American.' }), /british/],
    ['an empty text', (raw) => (stepsOf(raw)[1].text = ''), /text/],
    ['IPA in a text', (raw) => (stepsOf(raw)[1].text = 'It is /x/, like ç.'), /IPA/],
    ['a word to hear that is not Greek', (raw) => (stepsOf(raw)[2].words = ['chara']), /Greek/],
    ['a pair that is not two words', (raw) => (stepsOf(raw)[3].pairs = [['χαρά']]), /pair/],
    ['a verse that is not a reference', (raw) => (stepsOf(raw)[5].ref = '1 John 1:3'), /ref/],
  ])('rejects %s', (_, spoil, problem) => {
    const raw = clone();
    spoil(raw);
    const input: unknown = _ === 'not an object' ? 'a lesson' : raw;
    expect(lessonProblems(input).join('\n')).toMatch(problem);
    expect(() => parseLesson(input)).toThrow(problem);
  });
});

describe('the lessons for his accent', () => {
  const lessons = [
    parseLesson(MADE_UP),
    parseLesson({ ...clone(), id: 'british-only', for: ['british'], letters: ['ρ'], steps: stepsOf(clone()).map((s) => ({ ...s, text: { british: 'For a Briton.' } })) }),
  ];

  it('lists the lessons written for his accent, and IPA reads the American ones', () => {
    expect(lessonsFor('modern', accentOf('american'), lessons).map((l) => l.id)).toEqual(['made-up']);
    expect(lessonsFor('modern', accentOf('british'), lessons).map((l) => l.id)).toEqual(['made-up', 'british-only']);
    expect(lessonAccent(accentOf('ipa'))).toBe('american');
    expect(lessonsFor('modern', accentOf('ipa'), lessons).map((l) => l.id)).toEqual(['made-up']);
  });

  it("lists none for another pronunciation", () => {
    expect(lessonsFor('erasmian', accentOf('american'), lessons)).toEqual([]);
  });

  it('finds a letter sheet its lessons', () => {
    expect(lessonsForLetter('χ', 'modern', accentOf('american'), lessons).map((l) => l.id)).toEqual(['made-up']);
    expect(lessonsForLetter('ρ', 'modern', accentOf('american'), lessons)).toEqual([]);
    expect(lessonsForLetter('ρ', 'modern', accentOf('british'), lessons).map((l) => l.id)).toEqual(['british-only']);
  });

  it("says a text in his accent's words", () => {
    const why = parseLesson(MADE_UP).steps[0].text;
    expect(saidFor(why, accentOf('american'))).toBe('Why, for an American.');
    expect(saidFor(why, accentOf('british'))).toBe('Why, for a Briton.');
    expect(saidFor(why, accentOf('ipa'))).toBe('Why, for an American.');
    expect(saidFor('The same for all.', accentOf('british'))).toBe('The same for all.');
  });
});

describe('the screen draws any lesson', () => {
  const lesson: HardSoundLesson = parseLesson(MADE_UP);
  const HEADINGS = ['Why it is hard for you', 'Start from a sound you know', 'Hear it', 'Tell them apart', 'Try it', 'Read a verse'];

  /** Draws the lesson in `accent` and walks it to the end with Next, returning what each step showed. */
  function walk(accent: string): string[] {
    chooseAccent(accent);
    let step = 0;
    const { rerender } = render(<LessonSteps lesson={lesson} step={step} onStep={(n) => (step = n)} onDone={() => undefined} />);
    const shown: string[] = [];
    for (let i = 0; i < lesson.steps.length; i++) {
      rerender(<LessonSteps lesson={lesson} step={step} onStep={(n) => (step = n)} onDone={() => undefined} />);
      expect(screen.getByTestId('sound-step')).toHaveTextContent(`Step ${i + 1} of ${lesson.steps.length}`);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(HEADINGS[i]);
      shown.push(screen.getByTestId('sound-lesson').textContent ?? '');
      if (i < lesson.steps.length - 1) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    return shown;
  }

  it('walks every step of a lesson no code names, in his accent, with no IPA', () => {
    for (const accent of ['american', 'british']) {
      const shown = walk(accent);
      expect(shown[0]).toContain(accent === 'american' ? 'Why, for an American.' : 'Why, for a Briton.');
      expect(shown[2]).toContain('χαρά');
      expect(shown[3]).toContain('καρά');
      for (const text of shown) expect(ipaIn(text), accent).toEqual([]);
      cleanup();
    }
  });

  it("shows the sound's IPA only when his accent is IPA (the standard)", () => {
    const shown = walk('ipa');
    expect(shown[0]).toContain('/x/');
    expect(shown[0]).toContain('Why, for an American.');
  });
});
