import { describe, expect, it } from 'vitest';
import { languageOfWord, wordAtPoint, wordSpan } from '../../src/ui/wordAt';

describe('languageOfWord', () => {
  it('reads the language from the letters', () => {
    expect(languageOfWord('ἀγαθόν')).toBe('greek');
    expect(languageOfWord('Οὐδὲν')).toBe('greek');
    expect(languageOfWord('צֶדֶק')).toBe('hebrew');
    expect(languageOfWord('righteousness')).toBe('english');
    expect(languageOfWord("don't")).toBe('english');
  });
  it('has no language for digits, marks or other scripts', () => {
    expect(languageOfWord('28')).toBeNull();
    expect(languageOfWord('—')).toBeNull();
    expect(languageOfWord('привет')).toBeNull();
    expect(languageOfWord('')).toBeNull();
  });
});

describe('wordSpan', () => {
  const text = 'the word ἀγαθόν and צֶדֶק.';
  const at = (word: string) => text.indexOf(word);
  it('widens an offset to the whole word, points and accents included', () => {
    for (const word of ['word', 'ἀγαθόν', 'צֶדֶק']) {
      const start = at(word);
      expect(wordSpan(text, start + 1)).toEqual([start, start + word.length]);
    }
  });
  it('takes the word the caret is at the end of, and none on a space', () => {
    expect(wordSpan(text, at('word') + 4)).toEqual([at('word'), at('word') + 4]);
    expect(wordSpan('a  b', 2)).toBeNull();
  });
});

describe('wordAtPoint', () => {
  it('finds nothing when the caret is outside the element it was asked within', () => {
    const inside = document.createElement('p');
    const outside = document.createElement('p');
    outside.textContent = 'hello';
    Object.defineProperty(document, 'caretPositionFromPoint', { configurable: true, value: () => ({ offsetNode: outside.firstChild, offset: 1 }) });
    expect(wordAtPoint(1, 1, inside)).toBeNull();
    Reflect.deleteProperty(document, 'caretPositionFromPoint');
  });
  it('uses caretRangeFromPoint where that is the only API', () => {
    const p = document.createElement('p');
    p.textContent = 'say ἀγαθόν now';
    document.body.append(p);
    const range = document.createRange();
    range.setStart(p.firstChild as Text, 6);
    range.collapse(true);
    Object.defineProperty(document, 'caretRangeFromPoint', { configurable: true, value: () => range });
    expect(wordAtPoint(1, 1, p)?.word).toBe('ἀγαθόν');
    Reflect.deleteProperty(document, 'caretRangeFromPoint');
    p.remove();
  });
});
