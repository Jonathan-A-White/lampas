// tests/unit/bare-english.test.ts — bareEnglish (src/data/chapter.ts): a chunk's English with the verse's punctuation off its ends
// and every mark inside it kept (mw-5r3p30.265). The cases are chunks of the committed data.
import { describe, expect, it } from 'vitest';
import { bareEnglish, ownEnglish } from '../../src/data/chapter';

describe('bareEnglish', () => {
  it.each([
    ['at all times.', 'at all times'],
    ['than man’s wisdom,', 'than man’s wisdom'],
    ['in my boasting,', 'in my boasting'],
    ['is the Lord’s,', 'is the Lord’s'],
    ['“super-apostles,”', 'super-apostles'],
    ['well-known;', 'well-known'],
    ['are You going?’', 'are You going'],
    ['from here.’’', 'from here'],
    ['‘Yes’', 'Yes'],
    ['“The', 'The'],
    ['thereof.”', 'thereof'],
    ['(although it was', 'although it was'],
    ['food.)', 'food'],
    ['above reproach —', 'above reproach'],
    ['law—', 'law'],
    ['... for this reason', 'for this reason'],
    ['Rejoice!', 'Rejoice'],
    ['and to the Gentiles:', 'and to the Gentiles'],
  ])('takes %j to %j', (chunk, words) => expect(bareEnglish(chunk)).toBe(words));

  it.each([
    ['Jesus’', 'Jesus’'],
    ['the apostles’', 'the apostles’'],
    ["Jesus'", "Jesus'"],
    ['Jesus’,', 'Jesus’'],
  ])('keeps the apostrophe of a possessive: %j is %j', (chunk, words) => expect(bareEnglish(chunk)).toBe(words));

  it('keeps an apostrophe and a hyphen inside the words', () => {
    expect(bareEnglish('don’t be self-seeking.')).toBe('don’t be self-seeking');
  });

  it('gives a chunk that is nothing but marks back as it stands', () => {
    expect(bareEnglish('(-')).toBe('(-');
    expect(bareEnglish(' - ')).toBe('-');
  });
});

describe('ownEnglish, the idea sheet example row', () => {
  it('drops the quotes at the ends with the rest of the punctuation', () => {
    expect(ownEnglish({ t: '“Abba,', g: [0] })).toBe('Abba');
    expect(ownEnglish({ t: 'thereof.”', g: [0] })).toBe('thereof');
  });
});
