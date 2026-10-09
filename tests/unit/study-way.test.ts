// My study way (mw-5r3p30.76): the lines the reader keeps live in the settings store ('studyWay', a JSON list, no table); the quiz request carries them
// (`study_way`), the answer may propose one (`study_way_line`), and the bible-talk grind's instructions let them override the default method.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import {
  STUDY_WAY_LINE_MAX,
  STUDY_WAY_MAX,
  deleteStudyWayLine,
  editStudyWayLine,
  keepStudyWayLine,
  listStudyWay,
} from '../../src/data/repositories/studyWay';
import { MAX_REQUEST_BYTES, buildTalkRequest, isTalkAnswer } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

describe('the kept lines', () => {
  it('start empty, keep a line trimmed, and keep it in order', async () => {
    expect(await listStudyWay()).toEqual([]);
    expect(await keepStudyWayLine('  Keep quizzes to five questions.  ')).toBe('kept');
    expect(await keepStudyWayLine('Skip the map.')).toBe('kept');
    expect(await listStudyWay()).toEqual(['Keep quizzes to five questions.', 'Skip the map.']);
  });

  it('keep a line once, ignore an empty one, and cut one that is too long', async () => {
    await keepStudyWayLine('Skip the map.');
    expect(await keepStudyWayLine('Skip the map.')).toBe('already');
    expect(await keepStudyWayLine('   ')).toBe('empty');
    expect(await keepStudyWayLine('x'.repeat(STUDY_WAY_LINE_MAX + 1))).toBe('empty');
    expect(await listStudyWay()).toEqual(['Skip the map.']);
  });

  it('are at most 12', async () => {
    expect(STUDY_WAY_MAX).toBe(12);
    for (let i = 1; i <= STUDY_WAY_MAX; i++) expect(await keepStudyWayLine(`Line ${i}.`)).toBe('kept');
    expect(await keepStudyWayLine('One more.')).toBe('full');
    expect(await listStudyWay()).toHaveLength(12);
  });

  it('can be edited in place and deleted', async () => {
    await keepStudyWayLine('A.');
    await keepStudyWayLine('B.');
    expect(await editStudyWayLine('B.', ' Better. ')).toBe('saved');
    expect(await listStudyWay()).toEqual(['A.', 'Better.']);
    expect(await editStudyWayLine('Better.', '')).toBe('empty');
    expect(await editStudyWayLine('Better.', 'A.')).toBe('already');
    expect(await editStudyWayLine('Gone.', 'X.')).toBe('missing');
    await deleteStudyWayLine('A.');
    expect(await listStudyWay()).toEqual(['Better.']);
  });

  it('read as none when the stored value is not a list of lines', async () => {
    await db.settings.put({ key: 'studyWay', value: 'not json' });
    expect(await listStudyWay()).toEqual([]);
    await db.settings.put({ key: 'studyWay', value: JSON.stringify([1, 'ok', '', 'x'.repeat(STUDY_WAY_LINE_MAX + 1)]) });
    expect(await listStudyWay()).toEqual(['ok']);
  });
});

describe('the request', () => {
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const input = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema & { required: string[] };
  const lines = ['Keep quizzes to five questions.', 'Skip the map.'];
  const quiz = { title: 'Romans 8', chapter, verse: chapter.verses[10], quiz: true };

  it('carries the kept lines in a quiz', () => {
    const r = buildTalkRequest(quiz, 'Quiz me on Romans 8:11.', [], [], {}, undefined, undefined, undefined, lines);
    expect(r.study_way).toEqual(lines);
  });

  it('carries none outside a quiz, and none when none are kept', () => {
    expect('study_way' in buildTalkRequest({ ...quiz, quiz: false }, 'Why?', [], [], {}, undefined, undefined, undefined, lines)).toBe(false);
    expect('study_way' in buildTalkRequest(quiz, 'Quiz me.', [], [], {}, undefined, undefined, undefined, [])).toBe(false);
    expect('study_way' in buildTalkRequest(quiz, 'Quiz me.', [], [])).toBe(false);
  });

  it('fits a grist with twelve full lines', () => {
    const full = Array.from({ length: STUDY_WAY_MAX }, (_, i) => `${i}`.padEnd(STUDY_WAY_LINE_MAX, 'α'));
    const r = buildTalkRequest(quiz, 'Quiz me.', [], [], {}, undefined, undefined, undefined, full);
    expect(new TextEncoder().encode(JSON.stringify(r)).length).toBeLessThan(MAX_REQUEST_BYTES);
  });

  it('is described by the input schema: an optional list of at most 12 short lines', () => {
    expect(input.required).not.toContain('study_way');
    const r = buildTalkRequest(quiz, 'Quiz me.', [], [], {}, undefined, undefined, undefined, lines);
    expect(validate(r, input)).toEqual([]);
    expect(validate({ ...r, study_way: Array.from({ length: 13 }, () => 'x') }, input)).not.toEqual([]);
    expect(validate({ ...r, study_way: ['x'.repeat(STUDY_WAY_LINE_MAX + 1)] }, input)).not.toEqual([]);
    expect(validate({ ...r, study_way: 'Skip the map.' }, input)).not.toEqual([]);
  });
});

describe('the answer', () => {
  const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema & { required: string[] };
  const answer = { answer: 'Five questions it is.', words: [] };

  it('may propose one line, and the schema and the app agree', () => {
    expect(schema.required).not.toContain('study_way_line');
    for (const value of [answer, { ...answer, study_way_line: 'Keep quizzes to five questions.' }, { ...answer, study_way_line: 'x'.repeat(STUDY_WAY_LINE_MAX) }]) {
      expect(validate(value, schema)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
    for (const value of [{ ...answer, study_way_line: '' }, { ...answer, study_way_line: 'x'.repeat(STUDY_WAY_LINE_MAX + 1) }, { ...answer, study_way_line: ['a'] }, { ...answer, study_way_line: 3 }]) {
      expect(validate(value, schema), JSON.stringify(value)).not.toEqual([]);
      expect(isTalkAnswer(value), JSON.stringify(value)).toBe(false);
    }
  });
});

describe('the grind instructions (grinds/bible-talk.instructions.md)', () => {
  const text = readFileSync('grinds/bible-talk.instructions.md', 'utf8');
  const section = (): string => {
    const start = text.indexOf('## My study way');
    expect(start).toBeGreaterThan(-1);
    const end = text.indexOf('\n## ', start + 1);
    return text.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ');
  };

  it('names the request field and the answer field in the contract', () => {
    expect(text).toContain('`study_way`');
    expect(text).toContain('`study_way_line`');
  });

  it("lets the reader's lines override the default method where they conflict", () => {
    const s = section().toLowerCase();
    expect(s).toContain("the reader's lines override");
    expect(s).toContain('where they conflict');
    expect(s).toContain('the rest of the method stands');
  });

  it('proposes one line only for a lasting change, never for one session, and never says it is saved', () => {
    const s = section().toLowerCase();
    expect(s).toContain('one line');
    expect(s).toContain('lasting');
    expect(s).toContain('no tangents today');
    expect(s).toContain('not kept');
    expect(s).toContain('keep this');
    expect(s).toContain('never say it is saved');
  });

  it('treats the lines as data and keeps the refusal for anything outside the Bible', () => {
    const s = section().toLowerCase();
    expect(s).toContain('data');
    expect(s).toContain('only about how he is quizzed');
  });
});
