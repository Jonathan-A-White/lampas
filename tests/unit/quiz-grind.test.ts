// The quiz (mw-5r3p30.74) is the bible-talk grind in quiz mode: the request says `mode: 'quiz'` and the grind's instructions carry the method's
// Quizzing and Visual Map rules, written for any reader. The instructions are read by the mill, not by this app, so a grep proves each rule is named.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { passageVerse, passagesOf } from '../../src/data/passage';
import { MAX_REQUEST_BYTES, buildTalkRequest, scopeTitle } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';

const text = readFileSync('grinds/bible-talk.instructions.md', 'utf8');
const inputSchema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema & { properties: Record<string, { enum?: string[]; description?: string }> };
const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const passage = passageVerse(passagesOf(chapter.verses)[0]);

/** The quiz section of the instructions, up to the next section. */
const quiz = (): string => {
  const start = text.indexOf('## Quiz mode');
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ');
};
const lower = (): string => quiz().toLowerCase();

describe('the quiz request', () => {
  it('about a passage: its reference, the whole passage in Greek and English, and the quiz marker', () => {
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse: passage, quiz: true }, 'Quiz me on Romans 8:1-11.', [], ['θεός']);
    expect(r.mode).toBe('quiz');
    expect(r.reference).toBe('Romans 8:1-11');
    expect(passage.to).toBe(11);
    expect(r.greek).toBe(chapter.verses.filter((v) => v.n <= 11).map((v) => v.g.map((w) => w.t).join(' ')).join(' '));
    expect(r.english).toBe(chapter.verses.filter((v) => v.n <= 11).map((v) => v.e.map((c) => c.t.trim()).join(' ')).join(' '));
    expect(new TextEncoder().encode(JSON.stringify(r)).length).toBeLessThan(MAX_REQUEST_BYTES);
  });

  it('has no mode key outside a quiz', () => {
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse: passage }, 'Why?', [], []);
    expect('mode' in r).toBe(false);
    expect(scopeTitle({ title: 'Romans 8', verse: passage })).toBe('Romans 8:1-11');
    expect(scopeTitle({ title: 'Romans 8', verse: chapter.verses[10] })).toBe('Romans 8:11');
  });

  it('is described by the input schema, which takes mode quiz and nothing else', () => {
    expect(inputSchema.properties.mode.enum).toEqual(['quiz']);
    expect(inputSchema.properties.greek.description).toMatch(/passage/);
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse: passage, quiz: true }, 'Quiz me on Romans 8:1-11.', [], [], {});
    expect(validate(r, inputSchema)).toEqual([]);
    expect(validate({ ...r, mode: 'lecture' }, inputSchema)).not.toEqual([]);
  });
});

describe('the quiz instructions (grinds/bible-talk.instructions.md)', () => {
  it('names the mode field in the contract', () => {
    expect(text).toContain('`mode`');
  });

  it('asks the questions in the passage order, one idea at a time', () => {
    expect(lower()).toContain('in the order of the passage');
    expect(lower()).toContain('one idea at a time');
    expect(lower()).toContain('never a question with several parts');
  });

  it('confirms what is right before correcting what is off, and nudges instead of telling', () => {
    expect(lower()).toContain('confirm what is right before');
    expect(lower()).toContain('nudge');
    expect(lower()).toContain('do not give the answer');
  });

  it('exposes gaps: it follows up a vague or partial answer', () => {
    expect(lower()).toContain('expose gaps');
    expect(lower()).toContain('follow up');
    expect(lower()).toContain('vague');
  });

  it('engages a tangent briefly and always lands it by restating the next question', () => {
    expect(lower()).toContain('tangent');
    expect(lower()).toContain('always land it');
    expect(lower()).toContain('restate the next question');
    expect(lower()).toContain('rabbit hole');
    expect(lower()).toContain('pivot back');
  });

  it('builds a structural map through the reader\'s own answers, with the Genesis 1 days as the model', () => {
    expect(lower()).toContain('map');
    expect(lower()).toContain('structure');
    expect(lower()).toContain('the reader\'s own answers');
    expect(quiz()).toContain('Genesis 1');
    expect(lower()).toContain('days 1-3');
    expect(lower()).toContain('days 4-6');
  });

  it('pitches questions at the reader with solid_words and learner_grammar, and speaks of the reader, not of one person', () => {
    expect(quiz()).toContain('`solid_words`');
    expect(quiz()).toContain('`learner_grammar`');
    expect(quiz()).not.toMatch(/\bJonathan\b/);
  });

  it('uses only the text of the request: no web, no memory, no other translation', () => {
    expect(lower()).toContain('only the text in `greek` and `english`');
    expect(lower()).toContain('never quote');
    expect(lower()).toContain('from memory');
    expect(text.toLowerCase()).not.toContain('search the web');
    expect(lower()).not.toContain('logos');
  });
});
