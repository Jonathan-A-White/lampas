// tests/unit/hands-free-passage.test.ts — the words after 'read', 'open' or 'go to' become a place (src/handsFree/passage.ts, mw-rl10piw.7): the kit's normaliseSpoken,
// 'chapter' dropped, 'verse' made the separator, then readPlace (src/nav/parseReference.ts, the one reader of a place). The recogniser's habits are met: 'red' and
// 'reed' are 'read', 'psalms 23' is Psalm 23, and 'john 3 16' or 'john 316' are John 3:16 when the chapter has that verse.
import { describe, expect, it } from 'vitest';
import { BOOKS } from '../../src/data/books';
import { audiblePlaceOf, placeOfWords } from '../../src/handsFree/passage';
import { SPOKEN_COMMANDS } from '../../src/handsFree/commands';
import { route } from 'voice-kit/handsfree';

/** What the words of a whole command come to: the place after its opening word, as a name and numbers ('John 3:16'), or 'no place'. */
function placeOf(command: string): string {
  const heard = route(command, SPOKEN_COMMANDS);
  if (heard?.name !== 'read') return 'no command';
  const place = placeOfWords(heard.rest);
  if (place.kind !== 'place') return place.kind === 'bad' ? `bad: ${place.message}` : 'no place';
  const name = BOOKS.find((b) => b.code === place.book)?.name ?? place.book;
  return `${name} ${place.chapter}${place.verse === undefined ? '' : `:${place.verse}`}`;
}

describe('the place in the words after read, open and go to', () => {
  it.each([
    ['read John 3', 'John 3'],
    ['red john three', 'John 3'],
    ['reed John 3', 'John 3'],
    ['open John chapter 3', 'John 3'],
    ['go to John 3 16', 'John 3:16'],
    ['read John 3:16', 'John 3:16'],
    ['read john 316', 'John 3:16'],
    ['read first John 2', '1 John 2'],
    ['read 1st John 2', '1 John 2'],
    ['read Romans 8 verse 28', 'Romans 8:28'],
    ['read Romans chapter 8 verse 28', 'Romans 8:28'],
    ['read Psalm 23', 'Psalms 23'],
    ['read psalms 23', 'Psalms 23'],
    ['read Genesis one', 'Genesis 1'],
    ['read Please John three', 'John 3'],
  ])('%s is %s', (words, place) => {
    expect(placeOf(words)).toBe(place);
  });

  it('is no place for words that are not one', () => {
    expect(placeOf('read the weather')).toBe('no place');
    expect(placeOf('read John')).toBe('no place');
    expect(placeOf('read')).toBe('no place');
  });

  it('says how many chapters a book has when it has not the one asked for', () => {
    expect(placeOf('read John 40')).toBe('bad: John has 21 chapters');
  });

  it('does not take a verse the chapter lacks for a chapter and a verse', () => {
    expect(placeOf('read john 3 99')).toBe('no place');
  });
});

/** What a whole command comes to as an Audible command: 'Audible, John 3', 'not Audible, John 3' (story .7's), or 'Audible, no place'. */
function audibleOf(command: string): string {
  const audible = audiblePlaceOf(command);
  if (audible) {
    if (audible.kind !== 'place') return 'Audible, no place';
    return `Audible, ${BOOKS.find((b) => b.code === audible.book)?.name} ${audible.chapter}${audible.verse === undefined ? '' : `:${audible.verse}`}`;
  }
  return `not Audible, ${placeOf(command)}`;
}

describe("'in Audible' at the end of a passage command (mw-rl10piw.11)", () => {
  it.each([
    ['read John 3 in Audible', 'Audible, John 3'],
    ['listen to John 3 on Audible', 'Audible, John 3'],
    ['play Psalm 23 in Audible', 'Audible, Psalms 23'],
    ['read john three inaudible', 'Audible, John 3'],
    ['read john 3 in audible', 'Audible, John 3'],
    ['open John 3 on audible', 'Audible, John 3'],
    ['go to John 3 on Audible', 'Audible, John 3'],
    ['red John 3 in Audible', 'Audible, John 3'],
    ['read John 3:16 in Audible', 'Audible, John 3'],
    ['read John 3 verse 16 in Audible', 'Audible, John 3'],
    ['read John 3', 'not Audible, John 3'],
    ['read the weather in Audible', 'Audible, no place'],
    ['read John 40 in Audible', 'Audible, no place'],
  ])('%s is %s', (words, result) => {
    expect(audibleOf(words)).toBe(result);
  });

  it('is not an Audible command without a place or a passage word before it', () => {
    expect(audiblePlaceOf('play')).toBeUndefined();
    expect(audiblePlaceOf('play in Audible')).toBeUndefined();
    expect(audiblePlaceOf('ask what is in Audible')).toBeUndefined();
    expect(audiblePlaceOf('John 3 in Audible')).toBeUndefined();
  });

  it("'play John 3' and 'listen to John 3' with no 'in Audible' are not Audible commands", () => {
    expect(audiblePlaceOf('play John 3')).toBeUndefined();
    expect(audiblePlaceOf('listen to John 3')).toBeUndefined();
  });
});
