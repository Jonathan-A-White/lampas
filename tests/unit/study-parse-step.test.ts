// What a wrong step of the Parsing drill links to (mw-indx1x6.10): the step is asked as a 'parse' question of the idea its right value teaches, through the one mapping of src/review/studyThis.ts.
import { describe, expect, it } from 'vitest';
import { buildSteps, type DrillQuestion } from '../../src/data/drill';
import { ideaOfAny } from '../../src/data/grammar/ladders';
import { mulberry32 } from '../../src/data/quiz';
import { studyOfParseStep } from '../../src/review/studyThis';

function questionOf(code: string, form: string, lemma: string): DrillQuestion {
  return {
    lemma, form, reference: 'Romans 8:1', book: 'rom', chapter: 8, verse: 1, words: [form], at: 0, code,
    parsing: 'parsed', steps: buildSteps(code, mulberry32(3)),
  };
}

const stepOf = (q: DrillQuestion, id: string) => {
  const step = q.steps.find((s) => s.id === id);
  if (!step) throw new Error(`no step ${id}`);
  return step;
};

describe('studyOfParseStep', () => {
  const verb = questionOf('V-PAI-3S', 'λέγει', 'λέγω');

  it('links a missed mood to the mood lesson and to the verb table with the form’s cell lit', () => {
    const step = stepOf(verb, 'mood');
    const { links, miss } = studyOfParseStep(verb, step, 'subjunctive');
    expect(links.find((l) => l.kind === 'lesson')).toEqual({ kind: 'lesson', label: `Lesson: ${ideaOfAny('mood-indicative').title}`, ideaId: 'mood-indicative' });
    expect(links.map((l) => l.kind)).toContain('paradigm');
    expect(links.map((l) => l.kind)).toContain('lesson');
    const table = links.find((l) => l.kind === 'paradigm');
    expect(table?.kind === 'paradigm' && table.address).toMatchObject({ mode: 'learn', word: 'λέγει', parse: 'V-PAI-3S', lemma: 'λέγω', own: true });
    expect(table?.kind === 'paradigm' && table.address.cell).toBeTruthy();
    expect(links.at(-1)).toMatchObject({ kind: 'word', lemma: 'λέγω' });
    expect(miss.answer).toBe('subjunctive');
    expect(miss.right).toBe(step.right);
  });

  it('teaches a mood step by the idea of the mood, not of the tense', () => {
    const subjunctive = questionOf('V-PAS-3S', 'λέγῃ', 'λέγω');
    const lessons = studyOfParseStep(subjunctive, stepOf(subjunctive, 'mood'), 'indicative').links.filter((l) => l.kind === 'lesson');
    expect(lessons).toHaveLength(1);
    expect(lessons[0].kind === 'lesson' && lessons[0].ideaId).toBe('mood-subjunctive');
    const tense = studyOfParseStep(subjunctive, stepOf(subjunctive, 'tense'), 'future').links.find((l) => l.kind === 'lesson');
    expect(tense?.kind === 'lesson' && tense.ideaId).toBe('tense-present');
  });

  it('teaches a missed case by the case idea', () => {
    const noun = questionOf('N-NSM', 'λόγος', 'λόγος');
    const step = stepOf(noun, 'case');
    const { links } = studyOfParseStep(noun, step, 'genitive');
    const lesson = links.find((l) => l.kind === 'lesson');
    expect(lesson?.kind === 'lesson' && lesson.ideaId).toBe('case-nominative');
    expect(lesson?.label).toBe(`Lesson: ${ideaOfAny('case-nominative').title}`);
  });

  it('teaches a missed part of speech by the idea of the part of speech', () => {
    const { links } = studyOfParseStep(verb, stepOf(verb, 'pos'), 'noun');
    const lesson = links.find((l) => l.kind === 'lesson');
    expect(lesson?.kind === 'lesson' && lesson.ideaId).toBe('verb');
  });

  it('for a step that asks two features, teaches the one he got wrong', () => {
    const noun = questionOf('N-NSM', 'λόγος', 'λόγος');
    const step = stepOf(noun, 'number+gender');
    expect(step.right).toBe('singular masculine');
    // right is 'singular masculine': a wrong number is taught by the number idea, a wrong gender by the gender idea
    const wrongNumber = studyOfParseStep(noun, step, 'plural masculine').links.find((l) => l.kind === 'lesson');
    const wrongGender = studyOfParseStep(noun, step, 'singular feminine').links.find((l) => l.kind === 'lesson');
    expect(wrongNumber?.kind === 'lesson' && wrongNumber.ideaId).toBe('number-singular');
    expect(wrongGender?.kind === 'lesson' && wrongGender.ideaId).toBe('gender-masculine');
  });

  it('gives a Hebrew word its word card and the lesson of its term', () => {
    const hebrew: DrillQuestion = {
      lemma: 'אָמַר', form: 'וַיֹּאמֶר', reference: 'Genesis 1:3', book: 'gen', chapter: 1, verse: 3, lang: 'hbo', words: ['וַיֹּאמֶר'], at: 0, code: 'V-Qal-Perf-3ms',
      parsing: 'Verb - Qal - Perfect - third person masculine singular',
      steps: [{ id: 'stem', label: 'Stem', right: 'Qal', options: ['Qal', 'Piel', 'Nifal', 'Hifil'] }],
    };
    const { links } = studyOfParseStep(hebrew, hebrew.steps[0], 'Piel');
    expect(links.find((l) => l.kind === 'lesson')).toMatchObject({ kind: 'lesson', ideaId: 'he-qal' });
    expect(links).toContainEqual({ kind: 'word', label: 'Word: אָמַר', lemma: 'אָמַר', hebrew: true });
  });
});
