// What a wrong answer links to (mw-indx1x6.6, src/review/studyThis.ts): one link for each thing that teaches the question's idea, by the kind of question, and what the tutor is told when nothing does.
import { describe, expect, it } from 'vitest';
import type { GrammarKind, GrammarQuestion } from '../../src/data/grammar/questions';
import { itemFacet, itemsOf } from '../../src/data/grammar/ladder';
import { ideaOfAny } from '../../src/data/grammar/ladders';
import type { Question } from '../../src/data/quiz';
import { pictureUrl } from '../../src/data/pictures';
import { wordHeart } from '../../src/data/wordHeart';
import { KNEW_IT, NOT_PARSED, NOT_YET, type ReviewItem } from '../../src/review/kinds';
import { missFirstTurn, missScreen, studyOfItem, studyOfQuestion, studyOfWord, type StudyLink } from '../../src/review/studyThis';

const PHONE = 'First declension, feminine in η (φωνή) dative singular of noun endings';

const cell: GrammarQuestion = { kind: 'cell', ideaId: 'declension-1', prompt: PHONE, options: ['-αι', '-ον', '-οις', '-ῃ'], right: '-ῃ', table: 'noun-endings' };

const kindsOf = (links: readonly StudyLink[]): string[] => links.map((l) => l.kind);
const labelsOf = (links: readonly StudyLink[]): string[] => links.map((l) => l.label);

describe('studyOfQuestion', () => {
  it('links a missed cell to its table in Learn at the cell asked, then to the lesson of its idea', () => {
    const { links, miss } = studyOfQuestion(cell, '-αι');
    expect(links[0]).toEqual({ kind: 'paradigm', label: 'Table: Noun endings', address: { table: 'noun-endings', mode: 'learn', cell: 'First declension, feminine in η (φωνή) Dative Singular' } });
    expect(links[1]).toEqual({ kind: 'lesson', label: `Lesson: ${ideaOfAny('declension-1').title}`, ideaId: 'declension-1' });
    expect(miss).toEqual({ asked: PHONE, answer: '-αι', right: '-ῃ', idea: ideaOfAny('declension-1').title });
  });

  it('links a missed ending to its table on the asked word (as See the table does), the lesson and the word', () => {
    const ending: GrammarQuestion = {
      kind: 'ending', ideaId: 'number-plural', prompt: 'Fill in the ending: accusative plural of ἁμαρτία', options: ['ας', 'αι', 'ων', 'αις'], right: 'ας',
      form: 'ἁμαρτί_', code: 'N-APF', table: 'noun-endings', word: 'ἁμαρτίας', lemma: 'ἁμαρτία',
    };
    const { links, miss } = studyOfQuestion(ending, 'αι');
    expect(kindsOf(links)).toEqual(['paradigm', 'lesson', 'word']);
    const table = links[0];
    expect(table.kind === 'paradigm' && table.address).toMatchObject({ table: 'noun-endings', mode: 'learn', word: 'ἁμαρτίας', parse: 'N-APF', lemma: 'ἁμαρτία', own: true });
    expect(table.kind === 'paradigm' && table.address.cell).toMatch(/accusative plural/i);
    expect(links[2]).toMatchObject({ kind: 'word', label: 'Word: ἁμαρτία', lemma: 'ἁμαρτία' });
    expect(miss.asked).toBe('Fill in the ending: accusative plural of ἁμαρτία ἁμαρτί_');
  });

  it('links a question of an idea that has tables to them, with no cell, and one that has none to the lesson alone', () => {
    const concept = (ideaId: string): GrammarQuestion => ({ kind: 'concept', ideaId, prompt: 'What is it?', options: ['a', 'b'], right: 'a' });
    expect(labelsOf(studyOfQuestion(concept('article'), 'b').links)).toEqual(['Table: The article', `Lesson: ${ideaOfAny('article').title}`]);
    const table = studyOfQuestion(concept('article'), 'b').links[0];
    expect(table.kind === 'paradigm' && table.address).toEqual({ table: 'article', mode: 'learn' });
    expect(labelsOf(studyOfQuestion(concept('alphabet'), 'b').links)).toEqual([`Lesson: ${ideaOfAny('alphabet').title}`]);
  });

  it('links a letter of the alphabet to the letter’s own lesson', () => {
    const alpha = itemsOf('alphabet')[0];
    const letter: GrammarQuestion = { kind: 'letter', ideaId: 'alphabet', prompt: 'What is this letter called?', options: ['Alpha', 'Beta'], right: 'Alpha', form: 'α', facet: itemFacet(alpha) };
    expect(studyOfQuestion(letter, 'Beta').links).toEqual([{ kind: 'lesson', label: `Lesson: ${alpha.title}`, ideaId: alpha.id }]);
    expect(studyOfQuestion(letter, 'Beta').miss.idea).toBe(itemFacet(alpha).label);
    // a facet that is no item of the idea (a pair of look-alikes) falls back to the idea's own lesson
    expect(studyOfQuestion({ ...letter, facet: { id: 'pair-nu-upsilon', label: 'ν / υ' } }, 'Beta').links).toEqual([{ kind: 'lesson', label: `Lesson: ${ideaOfAny('alphabet').title}`, ideaId: 'alphabet' }]);
  });

  it('gives every kind of grammar question a lesson: no kind of an idea of the ladder is left to the tutor', () => {
    const kinds: GrammarKind[] = ['ending', 'tap-form', 'letter', 'sound', 'say', 'stress', 'breathing', 'syllables', 'preposition', 'compound', 'concept', 'cell', 'meaning', 'parse', 'roles', 'use', 'tap-use'];
    for (const kind of kinds) {
      const links = studyOfQuestion({ kind, ideaId: 'noun', prompt: 'p', options: ['a', 'b'], right: 'a' }, 'b').links;
      expect(kindsOf(links), kind).toContain('lesson');
    }
  });

  it('a full parsing missed names the step missed as the answer, and links the parsed word', () => {
    const parse: GrammarQuestion = { kind: 'parse', ideaId: 'verb', prompt: 'Parse this word', options: [], right: 'verb, present active indicative, 1st person singular', form: 'λέγω', lemma: 'λέγω', code: 'V-PAI-1S' };
    const { links, miss } = studyOfQuestion(parse, NOT_PARSED);
    expect(kindsOf(links)).toContain('word');
    expect(miss.answer).toBe(NOT_PARSED);
  });

  it('a question whose idea the ladder no longer has links nothing: the tutor is left', () => {
    const gone: GrammarQuestion = { kind: 'concept', ideaId: 'no-such-idea', prompt: 'What is it?', options: ['a', 'b'], right: 'a' };
    expect(studyOfQuestion(gone, 'b')).toEqual({ links: [], miss: { asked: 'What is it?', answer: 'b', right: 'a', idea: 'no-such-idea' } });
  });
});

describe('studyOfWord', () => {
  const word = (lemma: string): Question => ({ lemma, prompt: lemma, gloss: 'word', options: ['word', 'law', 'sin', 'grace'] });

  it('links a missed word to its card, and to how to remember it when it has a picture or a heart note', () => {
    const withNote = ['λόγος', 'ἀγάπη', 'θεός', 'πίστις', 'χάρις'].find((l) => wordHeart(l) || pictureUrl(l));
    expect(withNote).toBeDefined();
    const { links, miss } = studyOfWord(word(withNote!), 'law');
    expect(links).toEqual([
      { kind: 'word', label: `Word: ${withNote}`, lemma: withNote, gloss: 'word' },
      { kind: 'mnemonic', label: 'How to remember it', lemma: withNote, gloss: 'word' },
    ]);
    expect(miss).toEqual({ asked: `What does ${withNote} mean?`, answer: 'law', right: 'word', idea: `The word ${withNote}` });
  });

  it('links a word with nothing to remember it by to its card alone', () => {
    expect(kindsOf(studyOfWord(word('ξξξ'), 'law').links)).toEqual(['word']);
  });

  it('a Hebrew word is marked Hebrew, for its own lexicon', () => {
    expect(studyOfWord({ ...word('בָּרָא'), lang: 'hbo' }, 'law').links[0]).toMatchObject({ kind: 'word', hebrew: true });
  });
});

describe('studyOfItem', () => {
  it('a sound of the ladder links to its lesson; an English word he misread has nothing, so the tutor is told it', () => {
    const sound: ReviewItem = { kind: 'sound', id: 'en:blessed', question: null, word: 'blessed', mode: 'flashcard' };
    expect(studyOfItem(sound, NOT_YET)).toEqual({ links: [], miss: { asked: 'Say this word aloud: blessed', answer: NOT_YET, right: 'blessed', idea: 'Saying the word blessed' } });
  });

  it('a step of his drill plan links to the lesson of its idea', () => {
    const plan: ReviewItem = { kind: 'drill-plan', id: 'noun|prove', ideaId: 'noun', planAt: 1, item: { id: 'prove', kind: 'prove', done: false } as never, questions: [], passage: [] };
    const { links, miss } = studyOfItem(plan, NOT_YET);
    expect(kindsOf(links)).toContain('lesson');
    expect(miss.asked).toBe(`Prove it: a full Drill it of ${ideaOfAny('noun').title}`);
  });

  it('a flashcard graded Not yet is a miss whose answer is the grade', () => {
    const item: ReviewItem = { kind: 'paradigm', id: 'noun-endings', question: cell, mode: 'flashcard' };
    expect(studyOfItem(item, NOT_YET).miss.answer).toBe(NOT_YET);
    expect(KNEW_IT).not.toBe(NOT_YET);
  });
});

describe('what the tutor is told of a miss', () => {
  const miss = { asked: PHONE, answer: '-αι', right: '-ῃ', idea: 'The first declension' };

  it('the first turn names the question, his answer, the right answer and the idea', () => {
    const turn = missFirstTurn(miss);
    for (const part of [PHONE, '-αι', '-ῃ', 'The first declension']) expect(turn).toContain(part);
  });

  it('the screen reports them as facts under the screen he was on', () => {
    expect(missScreen('Review', miss)).toEqual({
      name: 'Review',
      facts: [
        { label: 'Question he missed', value: PHONE },
        { label: 'He chose', value: '-αι' },
        { label: 'Right answer', value: '-ῃ' },
        { label: 'Idea', value: 'The first declension' },
      ],
    });
  });
});
