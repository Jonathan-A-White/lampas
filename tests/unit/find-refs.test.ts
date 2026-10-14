// src/share/findRefs.ts (mw-s1dc0n.2): what the find-refs grist answers is checked before it is shown. A reference whose book Lampas does not know, or whose
// chapter is past the book's end, is dropped; the rest are listed as the shared words' references are (src/nav/refsInText.ts listReferences).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { referenceUrl } from '../../src/nav/links';
import { bookNameOf, listReferences } from '../../src/nav/refsInText';
import { buildFindRefsRequest, checkedReferences, FIND_REFS_KIND, isFindRefsAnswer } from '../../src/share/findRefs';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;

describe('checkedReferences', () => {
  it('keeps Gen.1.28 and drops a book Lampas does not know', () => {
    const listed = listReferences(checkedReferences([{ printed: 'Gen. 1:28', ref: 'Gen.1.28' }, { printed: 'Hezekiah 3:1', ref: 'Hez.3.1' }]), 'page');
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ printed: 'Gen. 1:28', ref: 'Gen.1.28', book: 'gen', testament: 'ot', chapter: 1, verse: 28, count: 1 });
    expect(bookNameOf(listed[0]!)).toBe('Genesis');
    expect(referenceUrl(listed[0]!.book, listed[0]!.chapter, listed[0]!.verse)).toBe('https://lampas.allmymind.org/#/?ref=Gen.1.28');
  });

  it('drops a chapter past the end of the book, a verse of 0 and a reference with no chapter', () => {
    expect(checkedReferences([{ printed: 'Rom 99:1', ref: 'Rom.99.1' }, { printed: 'Rom 8:0', ref: 'Rom.8.0' }, { printed: 'Romans', ref: 'Rom' }])).toEqual([]);
  });

  it('writes the ref as links.ts does, whatever form the grist used, and keeps the page\'s words', () => {
    const [a, b, c] = checkedReferences([
      { printed: '1 John 1:9', ref: '1 John 1:9' },
      { printed: 'Psalm 23', ref: 'Ps.23' },
      { printed: ' Rom 8:28-30 ', ref: 'Romans.8.28' },
    ]);
    expect([a?.ref, b?.ref, c?.ref]).toEqual(['1John.1.9', 'Ps.23', 'Rom.8.28']);
    expect(b).toMatchObject({ chapter: 23, testament: 'ot' });
    expect(b?.verse).toBeUndefined();
    expect(c).toMatchObject({ printed: 'Rom 8:28-30', verse: 28, lastVerse: 30 });
  });

  it('lists a reference named twice once, with its count', () => {
    const listed = listReferences(checkedReferences([{ printed: 'Rom 8:28', ref: 'Rom.8.28' }, { printed: 'Rom. 8:28', ref: 'Rom.8.28' }]), 'page');
    expect(listed.map((l) => [l.ref, l.count])).toEqual([['Rom.8.28', 2]]);
  });
});

describe('the find-refs grind and the app agree', () => {
  const input = readJson('grinds/find-refs.input.schema.json') as Schema;
  const answer = readJson('grinds/find-refs.answer.schema.json') as Schema;
  const grind = readJson('grinds/find-refs.json');

  it('is the grind the app asks for: one picture, sonnet at low effort', () => {
    expect(grind).toMatchObject({ kind: FIND_REFS_KIND, model: 'sonnet', effort: 'low', attachments: { min: 1, max: 1, maxBytes: 1048576 } });
  });

  it('takes the request the app builds', () => {
    expect(validate(buildFindRefsRequest(), input)).toEqual([]);
  });

  it('isFindRefsAnswer accepts what the answer schema allows and refuses what it does not', () => {
    const good = { references: [{ printed: 'Gen. 1:28', ref: 'Gen.1.28' }] };
    expect(validate(good, answer)).toEqual([]);
    expect(isFindRefsAnswer(good)).toBe(true);
    expect(isFindRefsAnswer({ references: [] })).toBe(true);
    expect(isFindRefsAnswer({ references: [{ printed: 'Gen. 1:28' }] })).toBe(false);
    expect(isFindRefsAnswer({ references: 'Gen.1.28' })).toBe(false);
    expect(isFindRefsAnswer(null)).toBe(false);
    expect(validate({ references: [{ printed: 'Gen. 1:28' }] }, answer)).not.toEqual([]);
  });
});
