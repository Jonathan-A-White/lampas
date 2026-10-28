// tests/unit/diagram-lesson.test.ts — the lesson 'How to read a sentence diagram' (src/diagram/lesson.ts, mw-q6t5tvn.1): every step is a real verse (or part of one) with a diagram that
// obeys THE RULE, a check whose answer is a word of it, the conventions the story names, and the little keeping (the step reached, done).
import { readFileSync, readdirSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { layoutDiagram } from '../../src/diagram/layout';
import { checkPrompt, keepLessonDone, keepLessonStep, LESSON_STEPS, lessonDone, lessonStep } from '../../src/diagram/lesson';
import { ideaOf } from '../../src/data/grammar/ladder';
import { validateDiagram } from '../../src/diagram/validate';
import { EXPECTED_STEPS, EXPECTED_TERMS } from '../fixtures/diagrams/lesson-steps';
import { loadFixture } from '../support/diagram-fixtures';

const width = (text: string): number => text.length * 10;
const bare = (text: string): string => text.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

/** The words of verse `n` of the chapter's data, in order, as the diagram would split them. */
function verseWords(book: string, chapter: number, n: number): string[] {
  const data = JSON.parse(readFileSync(`public/data/${book}/${chapter}.json`, 'utf8')) as { verses: Array<{ n: number; e: Array<{ t: string }> }> };
  const verse = data.verses.find((v) => v.n === n);
  return (verse?.e ?? []).flatMap((chunk) => chunk.t.split(/\s+/)).map(bare).filter((word) => word !== '');
}

/** Whether `part` stands in `whole` as one unbroken run. */
const contains = (whole: string[], part: string[]): boolean => whole.some((_, at) => part.every((word, k) => whole[at + k] === word));

describe('the lesson steps', () => {
  it('are the ten of the story, in order, each of its verse and its mode', () => {
    expect(LESSON_STEPS.map((s) => [s.reference, s.mode])).toEqual(EXPECTED_STEPS.map((s) => [s.reference, s.mode]));
  });

  it('step 10 is titled as the story sets it', () => {
    expect(LESSON_STEPS[9].title).toBe(EXPECTED_STEPS[9].title);
  });

  it.each(LESSON_STEPS.map((s, at) => [at + 1, s] as const))('step %i: the diagram passes validateDiagram', (_, step) => {
    expect(validateDiagram(step.diagram, step.words.length)).toEqual({ ok: true });
  });

  it.each(LESSON_STEPS.map((s, at) => [at + 1, s] as const))('step %i: the check\'s answer is a word of its fixture, the one the story expects', (at, step) => {
    const word = step.words[step.check.answer];
    expect(word).toBeDefined();
    expect(word.text).not.toBe('');
    expect(word.text).toBe(EXPECTED_STEPS[at - 1].answerText);
    expect(checkPrompt(step)).toBe(`Tap the ${step.check.role}`);
  });

  it.each(LESSON_STEPS.map((s, at) => [at + 1, s] as const))('step %i: says its convention in one or two plain sentences and names a verse', (_, step) => {
    expect(step.title.trim()).not.toBe('');
    expect(step.text.split(/(?<=[.!?]”?)\s+/).length).toBeLessThanOrEqual(2);
    expect(step.reference).toMatch(/\d+:\d+$/);
  });

  it.each(LESSON_STEPS.slice(0, 8).map((s, at) => [at + 1, s] as const))('step %i: the English words are the verse\'s own, in order', (_, step) => {
    const mine = step.words.map((word) => bare(word.text));
    expect(contains(verseWords(step.verse.book, step.verse.chapter, step.verse.verse), mine), `${step.reference}: ${mine.join(' ')}`).toBe(true);
  });

  it('step 9 is Colossians 3:1 of the existing fixture, with the Weave\'s Greek in the words it shows in Greek', () => {
    const step = LESSON_STEPS[8];
    const english = loadFixture('english');
    expect(step.words).toHaveLength(english.words.length);
    expect(step.diagram).toEqual(english.diagram);
    const woven = step.words.filter((word) => word.weft !== undefined);
    expect(woven.length).toBeGreaterThan(3);
    for (const [k, word] of step.words.entries()) {
      if (word.weft === undefined) expect(word).toEqual(english.words[k]);
      else expect('chunk' in word && word.chunk).toBe('chunk' in english.words[k] && english.words[k].chunk);
    }
    expect(step.words.some((word) => /[Ͱ-Ͽἀ-῿]/.test(word.text))).toBe(true);
  });

  it('step 10 is Colossians 3:1 of the existing Greek fixture, word for word', () => {
    const step = LESSON_STEPS[9];
    const greek = loadFixture('greek');
    expect(step.mode).toBe('greek');
    expect(step.words).toEqual(greek.words);
    expect(step.diagram).toEqual(greek.diagram);
    expect(step.check).toEqual({ role: 'dative', answer: 4 });
  });

  it('step 10 lists the terms, each with the idea its lesson is', () => {
    expect((LESSON_STEPS[9].terms ?? []).map((t) => [t.term, t.ideaId])).toEqual(EXPECTED_TERMS);
    for (const [, id] of EXPECTED_TERMS) expect(ideaOf(id).id).toBe(id);
    expect(LESSON_STEPS.slice(0, 9).every((s) => s.terms === undefined)).toBe(true);
  });

  it.each(EXPECTED_STEPS.map((e, at) => [at + 1, e] as const))('step %i draws %s', (at, expected) => {
    const step = LESSON_STEPS[at - 1];
    const layout = layoutDiagram(step.diagram, step.words, width);
    const kinds = new Set(layout.segments.map((s) => s.kind));
    for (const kind of expected.drawn) expect(kinds.has(kind as never), `${expected.convention}: ${kind}`).toBe(true);
  });

  it('draws the understood “you” of step 4 as text in parentheses, with no word to tap', () => {
    const step = LESSON_STEPS[3];
    const layout = layoutDiagram(step.diagram, step.words, width);
    const implied = layout.labels.filter((l) => l.index === undefined);
    expect(implied.map((l) => l.text)).toEqual(['(you)']);
  });

  it('puts the dotted step line of step 8 on the word that joins the clauses', () => {
    const step = LESSON_STEPS[7];
    const layout = layoutDiagram(step.diagram, step.words, width);
    expect(layout.segments.some((s) => s.kind === 'step' && s.dotted)).toBe(true);
    expect(layout.labels.find((l) => l.role === 'conjunction')?.index).toBe(step.check.answer);
  });
});

describe('what the lesson keeps', () => {
  beforeEach(() => localStorage.clear());

  it('opens at the first step and not done on a clean phone', () => {
    expect(lessonStep()).toBe(0);
    expect(lessonDone()).toBe(false);
  });

  it('keeps the step he reached', () => {
    keepLessonStep(2);
    expect(lessonStep()).toBe(2);
  });

  it('ignores a kept step that is not one of the steps', () => {
    for (const bad of ['-1', '10', '2.5', 'x', '']) {
      localStorage.setItem('lampas.diagram-lesson.step', bad);
      expect(lessonStep(), bad).toBe(0);
    }
  });

  it('keeps diagram-lesson done in localStorage, and forgets the step', () => {
    keepLessonStep(4);
    keepLessonDone();
    expect(lessonDone()).toBe(true);
    expect(localStorage.getItem('lampas.diagram-lesson')).toBe('done');
    expect(lessonStep()).toBe(0);
  });
});

describe('the lesson is optional', () => {
  it('is named by no screen but the router, the app, the tutor\'s list of screens and its own folder', () => {
    const allowed = new Set(['src/App.tsx', 'src/nav/route.ts', 'src/tutor/screen.ts', 'src/AskTutor.tsx']);
    const found: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(entry.name) && !path.startsWith('src/diagram/') && /diagram-lesson|DiagramLesson|How to read a sentence diagram/.test(readFileSync(path, 'utf8'))) found.push(path);
      }
    };
    walk('src');
    expect(found.filter((path) => !allowed.has(path))).toEqual([]);
  });
});
