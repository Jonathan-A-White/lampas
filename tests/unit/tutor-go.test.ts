// The Bible talk answer's `go` (mw-5r3p30.172): src/talk/go.ts reads it, the schema and the instructions agree with the app's book list.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BOOKS } from '../../src/data/books';
import { isTalkAnswer } from '../../src/services/talk';
import { readGo, readTarget } from '../../src/talk/go';
import { bibleTalkRegistry, chapterOf } from '../../src/tutor/registry';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
const instructions = instructionsOf('bible-talk');

describe('readGo', () => {
  it('reads no go as none', () => {
    expect(readGo(undefined)).toBeUndefined();
  });

  it('takes a book of the list and a chapter in its range', () => {
    expect(readGo({ book: 'Colossians', chapter: 1 })).toEqual({ ok: true, place: { book: 'col', chapter: 1, title: 'Colossians 1' } });
    expect(readGo({ book: '1 Corinthians', chapter: 16 })).toMatchObject({ ok: true, place: { book: '1co', chapter: 16 } });
    expect(readGo({ book: 'Psalms', chapter: 23 })).toEqual({ ok: true, place: { book: 'psa', chapter: 23, title: 'Psalms 23' } });
    expect(readGo({ book: 'revelation', chapter: 22 })).toMatchObject({ ok: true, place: { book: 'rev', chapter: 22 } });
    expect(readGo({ book: ' John ', chapter: '3' })).toMatchObject({ ok: true, place: { book: 'jhn', chapter: 3 } });
  });

  it.each(BOOKS.map((b) => [b.name, b.chapters] as const))('%s has chapters 1 to %i and no more', (name, chapters) => {
    expect(readGo({ book: name, chapter: chapters })).toMatchObject({ ok: true });
    expect(readGo({ book: name, chapter: chapters + 1 })).toEqual({ ok: false, title: `${name} ${chapters + 1}` });
    expect(readGo({ book: name, chapter: 0 })).toMatchObject({ ok: false });
  });

  it('refuses a book the app does not have, a fractional or odd chapter, and any other shape, naming what it was asked for', () => {
    expect(readGo({ book: 'Enoch', chapter: 23 })).toEqual({ ok: false, title: 'Enoch 23' });
    expect(readGo({ book: 'Psalms', chapter: 151 })).toEqual({ ok: false, title: 'Psalms 151' });
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
    for (const go of [{ book: 'Colossians', chapter: 1 }, { book: 'Enoch', chapter: 23 }, 'Colossians 1', 3, null]) {
      expect(isTalkAnswer({ answer: 'Taking you there.', question: 'What does it say?', words: [], go })).toBe(true);
    }
  });
});

describe('the bible-talk grind and go', () => {
  const go = (schema.properties as Record<string, Schema>).go;

  // mw-t3xu9a.5: `go` is the kit's {name, args}; the chapter is the place `chapter` with {book, chapter} for args, which the registry checks (src/tutor/registry.ts chapterOf)
  it('has an optional go that names a place of the catalogue with its args, as the kit has it', () => {
    expect(schema.required).not.toContain('go');
    expect(go.required).toEqual(['name']);
    expect(go.additionalProperties).toBe(false);
    expect(Object.keys(go.properties as Record<string, Schema>)).toEqual(['name', 'args']);
  });

  it('takes a go for the place chapter at Colossians 1, and refuses the old book and chapter keys and an extra key', () => {
    const answer = (value: unknown) => validate({ answer: 'Taking you to Colossians 1.', question: 'What does it say?', words: [], go: value }, schema);
    expect(answer({ name: 'chapter', args: { book: 'Colossians', chapter: 1 } })).toEqual([]);
    expect(answer({ name: 'review' })).toEqual([]);
    expect(answer({ book: 'Colossians', chapter: 1 })).not.toEqual([]);
    expect(answer({ name: 'chapter', extra: 1 })).not.toEqual([]);
    expect(answer({ args: {} })).not.toEqual([]);
  });

  it('says the place chapter takes the book by name and a chapter the app has, in the app’s own list of books', () => {
    const book = (name: string) => readTarget({ name: 'chapter', args: { book: name, chapter: 1 } }, bibleTalkRegistry());
    for (const { name } of BOOKS) expect(book(name), name).toMatchObject({ ok: true });
    expect(book('Psalms')).toMatchObject({ ok: true });
    expect(book('Enoch')).toEqual({ ok: false, title: 'chapter' });
  });

  it('tells the tutor when to use go, what to say, and what not to do', () => {
    expect(instructions).toContain('## Taking him to a chapter');
    expect(instructions).toContain('`go`');
    expect(instructions).toContain('"name": "chapter"');
    for (const verb of ['switch', 'open', 'go', 'taken to a chapter']) expect(instructions).toContain(verb);
    expect(instructions).toContain('says where you are taking him');
    expect(instructions).toContain('Never say you are taking him anywhere without putting it in `go`');
  });
});

// mw-gdcyf98.25: the place chapter opens any chapter the Reader holds, Genesis to Revelation
describe('the place chapter and the whole Bible', () => {
  const at = (book: unknown, chapter: unknown) => chapterOf({ book, chapter });

  it('opens Genesis 1, Psalm 23, psalms 150 and Colossians 1, by name or by code', () => {
    expect(at('Genesis', 1)).toEqual({ book: 'gen', chapter: 1, title: 'Genesis 1' });
    expect(at('Psalm', 23)).toEqual({ book: 'psa', chapter: 23, title: 'Psalms 23' });
    expect(at('Psalms', 23)).toMatchObject({ book: 'psa' });
    expect(at('psalms', 150)).toMatchObject({ book: 'psa', chapter: 150 });
    expect(at('psa', 1)).toMatchObject({ book: 'psa' });
    expect(at('Colossians', 1)).toEqual({ book: 'col', chapter: 1, title: 'Colossians 1' });
  });

  it('opens none of Psalms 151, Genesis 51 or a made-up book', () => {
    expect(at('Psalms', 151)).toBeUndefined();
    expect(at('Genesis', 51)).toBeUndefined();
    expect(at('Enoch', 1)).toBeUndefined();
  });

  it('opens the last chapter of every book of the Bible and none past it', () => {
    for (const b of BOOKS) {
      expect(at(b.name, b.chapters), b.name).toMatchObject({ book: b.code });
      expect(at(b.name, b.chapters + 1), b.name).toBeUndefined();
    }
  });

  it('tells the tutor it opens a chapter of the Bible, and the instructions say any book may be asked for', () => {
    expect(bibleTalkRegistry().place('chapter')?.tell).toBe('Opens a chapter of the Bible in the Reader');
    expect(instructions).toContain('take me to Genesis 1');
    expect(instructions).not.toContain('holds only the New Testament');
  });
});
