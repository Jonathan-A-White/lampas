// The Bible talk answer's `go` (mw-5r3p30.172): src/talk/go.ts reads it, the schema and the instructions agree with the app's book list.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BOOKS } from '../../src/data/books';
import { isTalkAnswer } from '../../src/services/talk';
import { readGo } from '../../src/talk/go';
import { validate, type Schema } from '../support/schema-validate';

const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
const instructions = readFileSync('grinds/bible-talk.instructions.md', 'utf8');

describe('readGo', () => {
  it('reads no go as none', () => {
    expect(readGo(undefined)).toBeUndefined();
  });

  it('takes a book of the list and a chapter in its range', () => {
    expect(readGo({ book: 'Colossians', chapter: 1 })).toEqual({ ok: true, place: { book: 'col', chapter: 1, title: 'Colossians 1' } });
    expect(readGo({ book: '1 Corinthians', chapter: 16 })).toMatchObject({ ok: true, place: { book: '1co', chapter: 16 } });
    expect(readGo({ book: 'revelation', chapter: 22 })).toMatchObject({ ok: true, place: { book: 'rev', chapter: 22 } });
    expect(readGo({ book: ' John ', chapter: '3' })).toMatchObject({ ok: true, place: { book: 'jhn', chapter: 3 } });
  });

  it.each(BOOKS.map((b) => [b.name, b.chapters] as const))('%s has chapters 1 to %i and no more', (name, chapters) => {
    expect(readGo({ book: name, chapter: chapters })).toMatchObject({ ok: true });
    expect(readGo({ book: name, chapter: chapters + 1 })).toEqual({ ok: false, title: `${name} ${chapters + 1}` });
    expect(readGo({ book: name, chapter: 0 })).toMatchObject({ ok: false });
  });

  it('refuses a book the app does not have, a fractional or odd chapter, and any other shape, naming what it was asked for', () => {
    expect(readGo({ book: 'Psalms', chapter: 23 })).toEqual({ ok: false, title: 'Psalms 23' });
    expect(readGo({ book: 'Colossians', chapter: 1.5 })).toEqual({ ok: false, title: 'Colossians 1.5' });
    expect(readGo({ book: 'Colossians', chapter: 'one' })).toEqual({ ok: false, title: 'Colossians one' });
    expect(readGo('Colossians 1')).toEqual({ ok: false, title: 'Colossians 1' });
    expect(readGo({ chapter: 1 })).toEqual({ ok: false, title: 'that chapter' });
    expect(readGo(null)).toEqual({ ok: false, title: 'that chapter' });
    expect(readGo(7)).toEqual({ ok: false, title: 'that chapter' });
    expect(readGo({ book: 'x'.repeat(200), chapter: 1 })).toMatchObject({ ok: false, title: expect.stringMatching(/^x{39}…$/) });
  });
});

describe('isTalkAnswer with go', () => {
  it('keeps an answer whose go is any shape: the app reads it, so a go it cannot take never costs him the answer', () => {
    for (const go of [{ book: 'Colossians', chapter: 1 }, { book: 'Psalms', chapter: 23 }, 'Colossians 1', 3, null]) {
      expect(isTalkAnswer({ answer: 'Taking you there.', words: [], go })).toBe(true);
    }
  });
});

describe('the bible-talk grind and go', () => {
  const go = (schema.properties as Record<string, Schema>).go;

  it('has an optional go of a book from the app’s own list and a chapter in range', () => {
    expect(schema.required).not.toContain('go');
    expect(go.required).toEqual(['book', 'chapter']);
    expect(go.additionalProperties).toBe(false);
    expect((go.properties as Record<string, Schema>).book.enum).toEqual(BOOKS.map((b) => b.name));
    const chapter = (go.properties as Record<string, Schema>).chapter;
    expect(chapter.minimum).toBe(1);
    expect(chapter.maximum).toBe(Math.max(...BOOKS.map((b) => b.chapters)));
  });

  it('takes a go for Colossians 1 and refuses a book outside the list, a chapter outside 1 to 28 and an extra key', () => {
    const answer = (value: unknown) => validate({ answer: 'Taking you to Colossians 1.', words: [], go: value }, schema);
    expect(answer({ book: 'Colossians', chapter: 1 })).toEqual([]);
    expect(answer({ book: 'Psalms', chapter: 23 })).not.toEqual([]);
    expect(answer({ book: 'Colossians', chapter: 0 })).not.toEqual([]);
    expect(answer({ book: 'Colossians', chapter: 29 })).not.toEqual([]);
    expect(answer({ book: 'Colossians', chapter: 1, verse: 3 })).not.toEqual([]);
  });

  it('tells the tutor when to use go, what to say, and what not to do', () => {
    expect(instructions).toContain('## Taking him to a chapter');
    expect(instructions).toContain('`go`');
    for (const verb of ['switch', 'open', 'go', 'taken to a chapter']) expect(instructions).toContain(verb);
    expect(instructions).toContain('says where you are taking him');
    expect(instructions).toContain('Never say you are taking him anywhere without putting it in `go`');
    expect(instructions).toContain('Psalm 23');
  });
});
