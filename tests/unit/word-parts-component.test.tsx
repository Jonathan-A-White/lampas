// The one component that draws a word's parts (src/WordParts.tsx, mw-5r3p30.987): the lesson, Drill it, the word flashcard and the word quiz all draw them through it, a word with
// no entry draws nothing, and a drill question names the words whose parts it shows.
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WordParts } from '../../src/WordParts';
import { wordsOfQuestion } from '../../src/data/wordPartsOfQuestion';
import type { GrammarQuestion } from '../../src/data/grammar/questions';

afterEach(cleanup);

const question = (over: Partial<GrammarQuestion>): GrammarQuestion => ({ kind: 'tap-form', ideaId: 'negative', prompt: 'Tap the word', options: ['a', 'b'], right: 'a', ...over });

describe('WordParts', () => {
  it('draws a word with parts as the lesson does', () => {
    const { container } = render(<WordParts word="οὐδεμία" testId="x" />);
    expect(container.textContent).toBe('Built from: οὐδέ “and not” + μία “one”');
    expect(container.querySelector('[data-testid="x"]')?.getAttribute('data-word')).toBe('οὐδεμία');
  });

  it('draws the word and its parts in the equals form', () => {
    const { container } = render(<WordParts word="ἀπαγγέλλομεν" look="equals" />);
    expect(container.textContent).toBe('ἀπαγγέλλομεν = ἀπό “from” + ἀγγέλλω “announce”');
  });

  it('draws nothing, not an empty line, for a word with no entry', () => {
    const { container } = render(
      <>
        <WordParts word="λόγος" />
        <WordParts word="λόγος" look="equals" />
        <WordParts word="" />
      </>,
    );
    expect(container.innerHTML).toBe('');
  });
});

describe('wordsOfQuestion', () => {
  it('is the word tapped for, the ending asked about, the word parsed, and the marked words', () => {
    expect(wordsOfQuestion(question({ right: 'οὐδεμία' }))).toEqual(['οὐδεμία']);
    expect(wordsOfQuestion(question({ kind: 'ending', form: 'ἀπαγγέλλ_', word: 'ἀπαγγέλλομεν', lemma: 'ἀπαγγέλλω', right: 'ομεν' }))).toEqual(['ἀπαγγέλλομεν']);
    expect(wordsOfQuestion(question({ kind: 'parse', form: 'οὐκ', lemma: 'οὐκ', right: 'x' }))).toEqual(['οὐκ']);
    expect(wordsOfQuestion(question({ kind: 'meaning', marked: ['οὐκ', 'ἔστιν', 'οὐδεμία'], right: 'x' }))).toEqual(['οὐκ', 'οὐδεμία']);
  });

  it('is none for a question that names no word with parts, and none for the compound question, whose prompt already shows them', () => {
    expect(wordsOfQuestion(question({ right: 'λόγος' }))).toEqual([]);
    expect(wordsOfQuestion(question({ kind: 'letter', right: 'οὐκ' }))).toEqual([]);
    expect(wordsOfQuestion(question({ kind: 'compound', form: 'ἐκβάλλω', right: 'throw out' }))).toEqual([]);
  });

  it('is none for a Hebrew question', () => {
    expect(wordsOfQuestion(question({ lang: 'hbo', right: 'οὐκ' }))).toEqual([]);
  });
});

describe('one component', () => {
  const draws = ['IdeaSheet', 'Flashcard', 'WordQuestion', 'GrammarCard'];
  it.each(draws)('%s.tsx draws parts through WordParts and never lays them out itself', (name) => {
    const source = readFileSync(`src/${name}.tsx`, 'utf8');
    expect(source).toMatch(/from '\.\/WordParts'/);
    expect(source).toMatch(/<(WordParts|QuestionParts)\b/);
    expect(source).not.toMatch(/partsLine|Built from/);
  });
});
