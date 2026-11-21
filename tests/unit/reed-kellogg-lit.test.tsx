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

// A word outside the clause (mw-5r3p30.1227): ReedKellogg draws its short line and a button on the word, above the base line, and the word under it.
describe('ReedKellogg draws an address above the base line', () => {
  const tree: Diagram = {
    clauses: [{ clause: { subject: slotOf(1), verb: slotOf(2), independent: [{ kind: 'address', slot: { words: [{ i: 3 }], modifiers: [{ kind: 'word', word: { i: 0 }, modifiers: [] }] } }] } }],
  };
  const top = (el: Element): number => Number.parseFloat((el as HTMLElement).style.top);

  it('has a line of its own, a button for Τεκνία above the base line, and μου under it', () => {
    render(<ReedKellogg diagram={tree} words={wordsOf('μου', 'I', 'write', 'Τεκνία')} mode="english" reference="1 John 2:1" onWord={() => undefined} measure={measure} />);
    const lines = document.querySelectorAll('[data-kind="independent"]');
    expect(lines).toHaveLength(1);
    const base = document.querySelector('[data-kind="base"]')!;
    const y = (el: Element, k: 'y1' | 'y2') => Number.parseFloat(el.getAttribute(k) ?? '');
    expect(y(lines[0], 'y1')).toBeLessThan(y(base, 'y1'));
    const address = document.querySelector('button[data-word="3"]')!;
    const mou = document.querySelector('button[data-word="0"]')!;
    const verb = document.querySelector('button[data-word="2"]')!;
    expect(top(address)).toBeLessThan(top(mou));
    expect(top(mou)).toBeLessThan(top(verb));
  });
});

