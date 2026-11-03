// The English cognates (mw-5r3p30.988, his feedback of 2026-11-02): a table written in advance, keyed by the lexicon's lemma, of the commonest New Testament words that have a real
// English cousin (περί, perimeter). Each key is a lemma of the lexicon, each entry has its English word, the Greek piece they share and a short plain line; the card draws nothing
// for a word with none, and nothing at all when the app's language is not English (the hook is an English word).
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { COGNATES, cognateOf } from '../../src/data/cognates';
import type { FrequencyEntry } from '../../src/data/frequency';
import type { LemmaLexicon } from '../../src/data/lexicon';
import { WordCognate } from '../../src/WordCognate';

afterEach(() => {
  cleanup();
  document.documentElement.lang = 'en';
});

const DATA = 'public/data';
const lexicon = JSON.parse(readFileSync(`${DATA}/lexicon.json`, 'utf8')) as LemmaLexicon;
const frequency = JSON.parse(readFileSync(`${DATA}/frequency.json`, 'utf8')) as FrequencyEntry[];
const rank = new Map(frequency.map((e, i) => [e.strongs, i + 1]));
const entries = Object.entries(COGNATES);

describe('the English cognates', () => {
  it('has περί, with perimeter', () => {
    expect(COGNATES['περί']?.english).toBe('perimeter');
    expect(COGNATES['περί']?.piece).toBe('περι-');
    expect(COGNATES['περί']?.line).toBe('the distance around');
  });

  it('covers a good share of the 300 commonest words', () => {
    const commonest = new Set(frequency.slice(0, 300).map((e) => e.strongs));
    const have = Object.keys(COGNATES).filter((l) => commonest.has(lexicon[l]?.s ?? ''));
    expect(have.length).toBeGreaterThanOrEqual(100);
  });

  it.each(entries.map(([lemma]) => lemma))('%s is a lemma of the lexicon, written as the lexicon writes it, among the commonest 350 words', (lemma) => {
    expect(lemma).toBe(lemma.normalize('NFC'));
    expect(Object.hasOwn(lexicon, lemma)).toBe(true);
    expect(rank.get(lexicon[lemma].s) ?? Infinity).toBeLessThanOrEqual(350);
  });

  it.each(entries)('%s has its English word, the Greek piece it shares and a short plain line', (_lemma, c) => {
    expect(c.english).toMatch(/^[A-Za-z]+$/);
    expect(c.piece).toBe(c.piece.normalize('NFC'));
    expect(c.piece).toMatch(/^-?[\p{Script=Greek}̀-ͯ]+-?$/u);
    expect(c.line.trim()).toBe(c.line);
    expect(c.line.length).toBeGreaterThanOrEqual(8);
    expect(c.line.length).toBeLessThanOrEqual(90);
    expect(c.line).not.toMatch(/[*_#`]|\s{2}/);
    expect(c.line.toLowerCase()).not.toBe(c.english.toLowerCase());
  });

  it('uses no English word for two Greek words', () => {
    const words = entries.map(([, c]) => c.english.toLowerCase());
    expect(words.filter((w, i) => words.indexOf(w) !== i)).toEqual([]);
  });

  it('finds an entry by the headword as the word store keeps it, or a BMA lemma line', () => {
    expect(cognateOf('περί')?.english).toBe('perimeter');
    expect(cognateOf('ἄνθρωπος, -ου, ὁ')?.english).toBe('anthropology');
    expect(cognateOf('ἐκ, ἐξ + gen')?.english).toBe('ecstasy');
  });

  it('has none for a word with no real cognate, an empty headword or a Hebrew word', () => {
    expect(cognateOf('ἀλλά')).toBeUndefined();
    expect(cognateOf('')).toBeUndefined();
    expect(cognateOf('בְּרֵאשִׁית')).toBeUndefined();
  });

  it('shows none when the app’s language is not English', () => {
    expect(cognateOf('περί', 'en-GB')?.english).toBe('perimeter');
    expect(cognateOf('περί', 'es')).toBeUndefined();
    expect(cognateOf('περί', 'de-DE')).toBeUndefined();
  });
});

describe('the cognate card', () => {
  it('draws the English word, the Greek piece and the line for περί', () => {
    render(<WordCognate lemma="περί" />);
    const card = screen.getByTestId('word-cognate');
    expect(card).toHaveAccessibleName('An English cousin');
    expect(card).toHaveTextContent('perimeter');
    expect(card).toHaveTextContent('περι-');
    expect(card).toHaveTextContent('the distance around');
  });

  it('draws nothing for a word with none', () => {
    const { container } = render(<WordCognate lemma="ἀλλά" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('draws nothing when the app’s language is not English', () => {
    document.documentElement.lang = 'es';
    const { container } = render(<WordCognate lemma="περί" />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('word-cognate')).toBeNull();
  });

  it('draws it for English of any region, and for a page that names no language', () => {
    document.documentElement.lang = 'en-GB';
    const { unmount } = render(<WordCognate lemma="περί" />);
    expect(screen.getByTestId('word-cognate')).toBeInTheDocument();
    unmount();
    document.documentElement.lang = '';
    render(<WordCognate lemma="περί" />);
    expect(screen.getByTestId('word-cognate')).toBeInTheDocument();
  });
});
