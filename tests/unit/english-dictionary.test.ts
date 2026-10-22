// The English dictionary link (mw-5r3p30.707): a tapped English word is looked up in his English dictionary in Logos, Webster's 1828 for now.
import { describe, expect, it } from 'vitest';
import { ENGLISH_DICTIONARY, englishDictionaryLink, englishHeadwords } from '../../src/resources/logos';

describe('the English dictionary in Logos', () => {
  it('is Webster 1828, AMDICTENLANG', () => {
    expect(ENGLISH_DICTIONARY.resource).toBe('AMDICTENLANG');
    expect(ENGLISH_DICTIONARY.name).toBe("Webster's 1828");
  });

  it('links Advice, to its headword, with the ref.ly fallback', () => {
    expect(englishDictionaryLink('Advice,')).toEqual({
      url: 'logosres:AMDICTENLANG;hw=advice',
      fallback: 'https://ref.ly/logosres/AMDICTENLANG?hw=advice',
    });
  });

  it('has no link for text with no letters', () => {
    expect(englishDictionaryLink('—')).toBeUndefined();
    expect(englishDictionaryLink('  ')).toBeUndefined();
  });

  it('keeps an apostrophe inside a word and drops marks around it', () => {
    expect(englishDictionaryLink('“Don’t!”')?.url).toBe(`logosres:AMDICTENLANG;hw=${encodeURIComponent('don’t')}`);
  });
});

describe('the words of a tapped chunk', () => {
  it('are each word lowercased and stripped of marks, in order, once each', () => {
    expect(englishHeadwords('we love')).toEqual(['we', 'love']);
    expect(englishHeadwords('dear lady —')).toEqual(['dear', 'lady']);
    expect(englishHeadwords('one another. One')).toEqual(['one', 'another']);
    expect(englishHeadwords('Love,')).toEqual(['love']);
    expect(englishHeadwords('—')).toEqual([]);
  });
});
