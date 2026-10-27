// tests/unit/reed-kellogg-lit.test.tsx — ReedKellogg lights one word (the lesson's right answer) or a set of them (a grammar card's taught words,
// mw-5r3p30.791): each lit word's button carries data-lit, and no other does.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ReedKellogg } from '../../src/diagram/ReedKellogg';
import type { Diagram } from '../../src/diagram/types';
import { slotOf, wordsOf } from '../support/diagram-fixtures';

/** 'The farmer sows the word' (Mark 4:14), as the lesson draws it. */
const words = wordsOf('The', 'farmer', 'sows', 'the', 'word');
const diagram: Diagram = {
  clauses: [
    {
      clause: {
        subject: { words: [{ i: 1 }], modifiers: [{ kind: 'word', word: { i: 0 }, modifiers: [] }] },
        verb: slotOf(2),
        complement: { kind: 'direct-object', slot: { words: [{ i: 4 }], modifiers: [{ kind: 'word', word: { i: 3 }, modifiers: [] }] } },
      },
    },
  ],
};
const measure = (text: string) => text.length * 10;

const litWords = (): string[] => [...document.querySelectorAll('[data-diagram] button[data-lit]')].map((b) => b.getAttribute('data-word') ?? '');

const draw = (lit?: number | number[]) => render(<ReedKellogg diagram={diagram} words={words} mode="english" reference="Mark 4:14" onWord={() => undefined} measure={measure} lit={lit} />);

afterEach(cleanup);

describe('ReedKellogg lights words', () => {
  it('lights one word given its index, as the lesson does', () => {
    draw(4);
    expect(litWords()).toEqual(['4']);
  });

  it('lights two words at once given a set of indexes', () => {
    draw([1, 4]);
    expect(litWords().sort()).toEqual(['1', '4']);
  });

  it('lights nothing with no lit, or an empty set', () => {
    draw();
    expect(litWords()).toEqual([]);
    cleanup();
    draw([]);
    expect(litWords()).toEqual([]);
  });
});
