// tests/unit/grammar-examples-own-lemma.test.tsx — mw-5r3p30.1232: 'imperfect' opened from ἦν in 1 John 1 said no word of the chapter had it, though every
// imperfect there is a form of εἰμί (ἦν at 1:1 and 1:2): the lemma of the tapped word was left out of the examples, so nothing was left.
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { grammarExamples, hasGrammarTerm } from '../../src/data/grammarExamples';
import { GrammarSheet } from '../../src/GrammarSheet';

const john = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const at = (c: Chapter, n: number, t: string): GreekWord => {
  const w = c.verses.find((v) => v.n === n)?.g.find((x) => x.t === t);
  if (!w) throw new Error(`no ${t} in verse ${n}`);
  return w;
};
const open = (chapter: Chapter, term: string, word: GreekWord) =>
  render(<GrammarSheet chapter={chapter} term={term} word={word} known={false} onClose={() => undefined} onTerm={() => undefined} onWord={() => undefined} />);

describe('grammarExamples when the tapped word’s own lemma is the only one with the term', () => {
  it('gives ἦν at 1:2 for imperfect tapped on ἦν at 1:1, never the tapped word itself', () => {
    const tapped = at(john, 1, 'ἦν');
    const found = grammarExamples(john, 'imperfect', tapped);
    expect(found.map((e) => [e.verse, e.word.t])).toEqual([[2, 'ἦν']]);
    expect(found.every((e) => e.word !== tapped)).toBe(true);
  });

  it('still leaves out the tapped lemma when another lemma has the term', () => {
    const tapped = at(john, 1, 'ἦν');
    const found = grammarExamples(john, 'indicative', tapped);
    expect(found.length).toBeGreaterThan(0);
    expect(found.some((e) => e.word.l === tapped.l)).toBe(false);
  });

  it('says whether the tapped word has the term', () => {
    expect(hasGrammarTerm(john, 'imperfect', at(john, 1, 'ἦν'))).toBe(true);
    expect(hasGrammarTerm(john, 'optative', at(john, 1, 'ἦν'))).toBe(false);
  });
});

describe('GrammarSheet never says no word has the term while the tapped word has it', () => {
  it('lists the other places of the lemma', () => {
    open(john, 'imperfect', at(john, 1, 'ἦν'));
    expect(screen.queryByText(/No word of/)).toBeNull();
    const rows = screen.getAllByTestId('grammar-example');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('1:2');
  });

  it('says only the word has it when there is no other place', () => {
    const only: Chapter = { ...john, verses: john.verses.map((v) => ({ ...v, g: v.g.filter((w) => w.t !== 'ἦν' || v.n === 1) })) };
    open(only, 'imperfect', at(only, 1, 'ἦν'));
    expect(screen.queryByText(/No word of/)).toBeNull();
    expect(screen.getByText('Only ἦν in 1 John 1 has this.')).toBeTruthy();
  });

  it('keeps the old line when neither the tapped word nor any other has the term', () => {
    open(john, 'optative', at(john, 1, 'ἦν'));
    expect(screen.getByText(/No word of 1 John 1 has this in its parsing\./)).toBeTruthy();
  });
});
