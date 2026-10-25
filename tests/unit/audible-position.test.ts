// The audible-position grist's answer is checked before it is proposed (src/plan/audiblePosition.ts, mw-umv8sp.4): a book by its OSIS code, in either testament,
// and a chapter the book has; anything else proposes nothing.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { instructionsOf } from '../../scripts/grind-parts';
import { BOOKS } from '../../src/data/books';
import { osisOf } from '../../src/nav/links';
import { buildAudiblePositionRequest, checkedReading, CONFIDENCE_WORDS, isAudiblePositionAnswer, type AudiblePositionAnswer } from '../../src/plan/audiblePosition';
import { validate, type Schema } from '../support/schema-validate';

const answer = (
  book: string | null,
  chapter: number | null,
  position: string | null = null,
  confidence: AudiblePositionAnswer['confidence'] = 'high',
  left: string | null = null,
): AudiblePositionAnswer => ({
  book,
  chapter,
  position,
  left,
  confidence,
});

const schema = (name: string): Schema => JSON.parse(readFileSync(`grinds/audible-position.${name}.schema.json`, 'utf8')) as Schema;

describe('the audible-position answer', () => {
  it('places a book of either testament by its OSIS code, any case', () => {
    expect(checkedReading(answer('Lev', 3, '2:41'))).toEqual({ chapter: { code: 'lev', chapter: 3 }, position: '2:41', confidence: 'high', heard: 'stopped-in' });
    expect(checkedReading(answer('rom', 8, null, 'medium'))).toEqual({ chapter: { code: 'rom', chapter: 8 }, position: null, confidence: 'medium', heard: 'stopped-in' });
    expect(checkedReading(answer('Ps', 150))?.chapter).toEqual({ code: 'psa', chapter: 150 });
    expect(checkedReading(answer('Jude', 1))?.chapter).toEqual({ code: 'jud', chapter: 1 });
  });

  it('knows every one of the 66 books by the OSIS code the instructions give', () => {
    const instructions = instructionsOf('audible-position');
    for (const book of BOOKS) {
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

  it('reads a picture with time left in its chapter as stopped in it, and one at the chapter\'s end as finished (mw-umv8sp.7)', () => {
    // his screenshot: Matthew 4 at 01:40 with -02:14 left
    expect(checkedReading(answer('Matt', 4, '01:40', 'high', '-02:14'))).toEqual({
      chapter: { code: 'mat', chapter: 4 },
      position: '01:40',
      confidence: 'high',
      heard: 'stopped-in',
    });
    for (const left of ['-0:00', '-00:00', '0:00', '-0:03', '-0:05']) expect(checkedReading(answer('Matt', 4, '3:50', 'high', left))?.heard, left).toBe('finished');
    for (const left of ['-0:06', '-0:30', '-2:14', '-1:02:05', '-12:00']) expect(checkedReading(answer('Matt', 4, '1:40', 'high', left))?.heard, left).toBe('stopped-in');
  });

  it('reads a picture that shows no time left (or one it cannot parse) as stopped in the chapter, so the chapter stays next', () => {
    expect(checkedReading(answer('Matt', 4, '1:40', 'high', null))?.heard).toBe('stopped-in');
    expect(checkedReading(answer('Matt', 4, null, 'high', null))?.heard).toBe('stopped-in');
    expect(checkedReading(answer('Matt', 4, '1:40', 'high', 'soon'))?.heard).toBe('stopped-in');
    // an older mill that sends no `left` at all
    const old: Partial<AudiblePositionAnswer> = answer('Matt', 4, '1:40');
    delete old.left;
    expect(isAudiblePositionAnswer(old)).toBe(true);
    expect(checkedReading(old as AudiblePositionAnswer)?.heard).toBe('stopped-in');
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
    expect(isAudiblePositionAnswer({ book: 'Lev', chapter: 3, position: null, left: 214, confidence: 'high' })).toBe(false);
    expect(isAudiblePositionAnswer(null)).toBe(false);
    for (const valid of [answer('Lev', 3, '2:41', 'high', '-2:14'), answer(null, null, null, 'low')]) expect(validate(valid, schema('answer'))).toEqual([]);
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
