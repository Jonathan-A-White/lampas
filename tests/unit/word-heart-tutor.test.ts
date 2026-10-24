// The tutor is told the heart of the word (mw-bsf54t.14, src/data/wordHeart.ts): a word sheet's question and a Quick test question carry it as `focus.heart`, Review's Ask the tutor carries it
// as a screen fact once the answer is in, a word with no note carries none, and the input schema allows what is sent.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import type { WordItem } from '../../src/review/kinds';
import { reviewFacts } from '../../src/review/reviewFacts';
import { buildTalkRequest, type QuizFocus, type WordFocus } from '../../src/services/talk';
import { wordHeart } from '../../src/data/wordHeart';
import { validate, type Schema } from '../support/schema-validate';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const scope = { title: 'Romans 8', chapter, verse: chapter.verses[0] };
const input = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema & { required: string[] };
const word = (lemma: string, kind: WordFocus['kind'] = 'word'): WordFocus => ({ form: lemma, lemma, parse: 'present active indicative', kind });
const quiz = (lemma: string): QuizFocus => ({ kind: 'quiz', lemma, question: `What does ${lemma} mean?`, choices: ['a', 'b'], picked: 'a', correct: 'b', right: false, answers: [] });

describe('the word sheet and the Quick test tell the tutor the heart of the word', () => {
  it('carries the note in focus.heart for a word that has one', () => {
    const request = buildTalkRequest(scope, 'Tell me about θέλω.', [], [], {}, word('θέλω'));
    expect(request.focus).toMatchObject({ lemma: 'θέλω', heart: wordHeart('θέλω') });
    expect(validate(request, input)).toEqual([]);
  });

  it('carries it on a sound or grammar question too, and on a Quick test question', () => {
    for (const kind of ['grammar', 'sound'] as const) {
      expect(buildTalkRequest(scope, 'Help.', [], [], {}, word('θέλω', kind)).focus).toMatchObject({ heart: wordHeart('θέλω') });
    }
    const request = buildTalkRequest(scope, 'Why?', [], [], {}, quiz('θέλω'));
    expect(request.focus).toMatchObject({ kind: 'quiz', heart: wordHeart('θέλω') });
    expect(validate(request, input)).toEqual([]);
  });

  it('carries none for a word with no note, a grammar term, or a Hebrew word', () => {
    expect(buildTalkRequest(scope, 'Tell me.', [], [], {}, word('πράσσω')).focus).not.toHaveProperty('heart');
    expect(buildTalkRequest(scope, 'Tell me.', [], [], {}, { term: 'aorist', kind: 'grammar-term' }).focus).not.toHaveProperty('heart');
    expect(buildTalkRequest(scope, 'Tell me.', [], [], {}, { ...word('θέλω', 'sound'), language: 'he' }).focus).not.toHaveProperty('heart');
  });

  it('every note fits what the schema allows', () => {
    const heart = (input.properties as Record<string, { anyOf: { properties: Record<string, { maxLength?: number }> }[] }>).focus.anyOf[0].properties.heart;
    for (const lemma of ['θέλω', 'αὐτός', 'λόγος', 'δικαιοσύνη']) expect((wordHeart(lemma) ?? '').length).toBeLessThanOrEqual(heart.maxLength ?? 0);
  });
});

describe("Review's Ask the tutor", () => {
  const item = (lemma: string): WordItem => ({
    kind: 'word',
    id: lemma,
    mode: 'choice',
    question: { lemma, prompt: lemma, gloss: 'to will', options: ['to will', 'to see'] },
  });
  const round = (lemma: string, picked: string | null) => ({ status: 'running' as const, items: [item(lemma)], index: 0, picked, right: 0, missed: [] });

  it('is told the note once the answer is in, with the right answer', () => {
    const facts = reviewFacts(round('θέλω', 'to see'), undefined);
    expect(facts.find((f) => f.label === 'Heart of the word')?.value).toBe(wordHeart('θέλω'));
    expect(facts.some((f) => f.label === 'Right answer')).toBe(true);
  });

  it('is not told it before the answer, which it would give away', () => {
    expect(reviewFacts(round('θέλω', null), undefined).some((f) => f.label === 'Heart of the word')).toBe(false);
  });

  it('is told none for a word with no note', () => {
    expect(reviewFacts(round('πράσσω', 'to see'), undefined).some((f) => f.label === 'Heart of the word')).toBe(false);
  });
});
