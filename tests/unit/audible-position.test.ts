// The audible-position grist's answer is checked before it is proposed (src/plan/audiblePosition.ts, mw-umv8sp.4): a book by its OSIS code, in either testament,
// and a chapter the book has; anything else proposes nothing.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { instructionsOf } from '../../scripts/grind-parts';
import { BOOKS } from '../../src/data/books';
import { OT_BOOKS } from '../../src/data/otBooks';
import { osisOf } from '../../src/nav/links';
import { buildAudiblePositionRequest, checkedReading, CONFIDENCE_WORDS, isAudiblePositionAnswer, type AudiblePositionAnswer } from '../../src/plan/audiblePosition';
import { validate, type Schema } from '../support/schema-validate';

const answer = (book: string | null, chapter: number | null, position: string | null = null, confidence: AudiblePositionAnswer['confidence'] = 'high'): AudiblePositionAnswer => ({
  book,
  chapter,
  position,
  confidence,
});

const schema = (name: string): Schema => JSON.parse(readFileSync(`grinds/audible-position.${name}.schema.json`, 'utf8')) as Schema;

describe('the audible-position answer', () => {
  it('places a book of either testament by its OSIS code, any case', () => {
    expect(checkedReading(answer('Lev', 3, '2:41'))).toEqual({ chapter: { code: 'lev', chapter: 3 }, position: '2:41', confidence: 'high' });
    expect(checkedReading(answer('rom', 8, null, 'medium'))).toEqual({ chapter: { code: 'rom', chapter: 8 }, position: null, confidence: 'medium' });
    expect(checkedReading(answer('Ps', 150))?.chapter).toEqual({ code: 'psa', chapter: 150 });
    expect(checkedReading(answer('Jude', 1))?.chapter).toEqual({ code: 'jud', chapter: 1 });
  });

  it('knows every one of the 66 books by the OSIS code the instructions give', () => {
    const instructions = instructionsOf('audible-position');
    for (const book of [...OT_BOOKS, ...BOOKS]) {
      const osis = osisOf(book.code);
      expect(instructions, `${book.name} \`${osis}\``).toContain(`${book.name} \`${osis}\``);
      expect(checkedReading(answer(osis, book.chapters))?.chapter, osis).toEqual({ code: book.code, chapter: book.chapters });
    }
  });

  it('proposes nothing for no book, a book that is not one, a chapter the book has not, or a chapter that is not a whole number', () => {
    expect(checkedReading(answer(null, null, null, 'low'))).toBeNull();
    expect(checkedReading(answer('Lev', null))).toBeNull();
    expect(checkedReading(answer('Hez', 3))).toBeNull();
    expect(checkedReading(answer('Jude', 3))).toBeNull();
    expect(checkedReading(answer('Ps', 151))).toBeNull();
    expect(checkedReading(answer('Gen', 0))).toBeNull();
    expect(checkedReading(answer('Gen', 2.5))).toBeNull();
  });

  it('drops a blank position', () => {
    expect(checkedReading(answer('Gen', 1, '  '))?.position).toBeNull();
  });

  it('takes only the shape of the answer schema', () => {
    expect(isAudiblePositionAnswer(answer('Lev', 3, '2:41'))).toBe(true);
    expect(isAudiblePositionAnswer(answer(null, null, null, 'low'))).toBe(true);
    expect(isAudiblePositionAnswer({ book: 'Lev', chapter: '3', position: null, confidence: 'high' })).toBe(false);
    expect(isAudiblePositionAnswer({ book: 'Lev', chapter: 3, position: null, confidence: 'certain' })).toBe(false);
    expect(isAudiblePositionAnswer({ book: 'Lev', chapter: 3, confidence: 'high' })).toBe(false);
    expect(isAudiblePositionAnswer(null)).toBe(false);
    for (const valid of [answer('Lev', 3, '2:41'), answer(null, null, null, 'low')]) expect(validate(valid, schema('answer'))).toEqual([]);
  });

  it('sends the app language and the chapter she set off from, by name, as the input schema allows', () => {
    const request = buildAudiblePositionRequest({ code: 'lev', chapter: 1 });
    expect(request).toEqual({ language: 'en', set_off_from: 'Leviticus 1' });
    expect(validate(request, schema('input'))).toEqual([]);
  });

  it('says how sure it is in words, for every confidence the schema allows', () => {
    const allowed = (schema('answer').properties!.confidence as Schema).enum as string[];
    expect(Object.keys(CONFIDENCE_WORDS).sort()).toEqual([...allowed].sort());
  });
});
