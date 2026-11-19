// tests/unit/hidden-verse-blank.test.tsx — a blank keeps the punctuation after its hidden word (mw-5r3p30.1202): "when you are tempted, He will" with 'tempted,' hidden is "are ____, He",
// not "are ____ He". The mark is drawn after the blank; a closing quote after a comma, a full stop, and Hebrew's sof pasuq or Greek's high stop stay too.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HiddenVerse } from '../../src/memorize/HiddenVerse';
import type { Token } from '../../src/memorize/target';

afterEach(cleanup);

const en = (text: string): Token => ({ text, lang: 'en', chunk: 0 });
const el = (text: string): Token => ({ text, lang: 'el', chunk: 0 });
const he = (text: string): Token => ({ text, lang: 'he', chunk: 0 });

/** The verse as a line, each blank as ____ (the blank is a line with no text: its width is its word's). */
function lineOf(tokens: Token[], hidden: number[], firstLetters = false): string {
  const { getByTestId } = render(<HiddenVerse tokens={tokens} hidden={new Set(hidden)} firstLetters={firstLetters} missed={new Set()} />);
  const verse = getByTestId('memorize-verse').cloneNode(true) as HTMLElement;
  verse.querySelectorAll('[aria-hidden="true"]').forEach((b) => b.replaceWith('____'));
  return (verse.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('a blank keeps what follows its word', () => {
  it('a comma stays after the blank', () => {
    expect(lineOf([en('are'), en('tempted,'), en('He')], [1])).toBe('are ____, He');
  });

  it('a full stop stays after the blank', () => {
    expect(lineOf([en('it'), en('endure.')], [1])).toBe('it ____.');
  });

  it('a closing quote after a comma stays, both marks, in order', () => {
    expect(lineOf([en('said'), en('“tempted,”'), en('He')], [1])).toBe('said “____,” He');
  });

  it('keeps the first letter of the word, the mark after the blank', () => {
    expect(lineOf([en('are'), en('tempted,'), en('He')], [1], true)).toBe('are t____, He');
  });

  it('a Greek word keeps its high stop and its comma', () => {
    expect(lineOf([el('πειρασμὸν,'), el('ἀλλὰ·')], [0, 1])).toBe('____, ____·');
  });

  it("a Hebrew word keeps its sof pasuq, and its points stay in the blank's word", () => {
    expect(lineOf([he('הָאָֽרֶץ׃')], [0])).toBe('____׃');
  });

  it('a word hidden with no mark is still all blank, and a shown word is untouched', () => {
    expect(lineOf([en('are'), en('tempted,'), en('He')], [0])).toBe('____ tempted, He');
  });

  it('a blank is no wider for its comma', () => {
    const { getByTestId } = render(<HiddenVerse tokens={[en('tempted,')]} hidden={new Set([0])} firstLetters={false} missed={new Set()} />);
    const blank = getByTestId('memorize-verse').querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(parseFloat(blank.style.width)).toBeCloseTo('tempted'.length * 0.7, 5);
  });
});
