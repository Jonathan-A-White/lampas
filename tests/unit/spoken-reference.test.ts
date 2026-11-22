// tests/unit/spoken-reference.test.ts — a reference or number range is said as words, never with its hyphen (mw-fnvjof.17.199: the phone's voice read 'Acts 2:29-36' as 'Acts 2:29 minus 36').
import { describe, expect, it } from 'vitest';
import { spokenReference } from '../../src/speech/spokenReference';

describe('a reference as speech', () => {
  it.each([
    ['Acts 2:29-36', 'Acts 2, verses 29 through 36'],
    ['2 Samuel 7:8-11', '2 Samuel 7, verses 8 through 11'],
    ['Exodus 20:1-17', 'Exodus 20, verses 1 through 17'],
    ['Genesis 1:1-2:3', 'Genesis, chapter 1 verse 1 through chapter 2 verse 3'],
    ['2 Peter 1:11', '2 Peter 1, verse 11'],
    ['John 10:27', 'John 10, verse 27'],
  ])('%s is said %s', (written, said) => {
    expect(spokenReference(written)).toBe(said);
  });

  it('treats an en dash and an em dash as the hyphen', () => {
    expect(spokenReference('Acts 2:29–36')).toBe('Acts 2, verses 29 through 36');
    expect(spokenReference('Acts 2:29 – 36')).toBe('Acts 2, verses 29 through 36');
    expect(spokenReference('Genesis 1:1—2:3')).toBe('Genesis, chapter 1 verse 1 through chapter 2 verse 3');
  });

  it('finds the reference inside a sentence and leaves the rest as it is', () => {
    expect(spokenReference('Next: Acts 2:29-36, then John 3:16.')).toBe('Next: Acts 2, verses 29 through 36, then John 3, verse 16.');
  });

  it('says a number range in text as through', () => {
    expect(spokenReference('see pages 3-5')).toBe('see pages 3 through 5');
    expect(spokenReference('Psalms 1–3')).toBe('Psalms 1 through 3');
  });

  it('leaves a date, a time, a hyphenated word and a said reference alone', () => {
    expect(spokenReference('on 2026-11-18')).toBe('on 2026-11-18');
    expect(spokenReference('at 10:30')).toBe('at 10:30');
    expect(spokenReference('a 3-year-old, COVID-19, well-known')).toBe('a 3-year-old, COVID-19, well-known');
    expect(spokenReference('Acts 2, verses 29 through 36')).toBe('Acts 2, verses 29 through 36');
  });

  it('is the same when run twice', () => {
    const once = spokenReference('Acts 2:29-36 and Genesis 1:1-2:3');
    expect(spokenReference(once)).toBe(once);
  });
});
