// Works he holds in Logos (mw-5r3p30.675): the list, the link that opens one (at the passage for a commentary), the ticks kept in the settings store,
// what the tutor is told of the ticked ones and the answer's `work` link.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getWorks, setWorks } from '../../src/data/repositories';
import { WORKS, workLink, workOf } from '../../src/resources/works';
import { worksForTutor } from '../../src/resources/tutorLinks';
import { buildTalkRequest, isTalkAnswer } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';

const commentaries = WORKS.find((w) => w.id === 'calvin-commentaries');
const institutes = WORKS.find((w) => w.id === 'calvin-institutes-lcc');
const answerSchema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
const inputSchema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;

describe('the list of works', () => {
  it('holds Calvin\'s Commentaries and his Institutes, each with a title, an author, a kind and a source', () => {
    expect(commentaries).toMatchObject({ title: "Calvin's Commentaries", author: 'John Calvin', kind: 'commentary' });
    expect(institutes).toMatchObject({ title: expect.stringContaining('Institutes of the Christian Religion'), author: 'John Calvin', kind: 'book' });
    for (const w of WORKS) {
      expect(workOf(w.id)).toBe(w);
      expect(w.source).not.toBe('');
      expect(w.volumes.length).toBeGreaterThan(0);
      for (const v of w.volumes) expect(v.resource).toMatch(/^LLS:[A-Za-z0-9._-]+$/);
    }
    expect(new Set(WORKS.map((w) => w.id)).size).toBe(WORKS.length);
  });

  it('gives every commentary volume its books, and no book twice', () => {
    for (const w of WORKS.filter((x) => x.kind === 'commentary')) {
      const books = w.volumes.flatMap((v) => v.books ?? []);
      expect(w.volumes.every((v) => (v.books ?? []).length > 0)).toBe(true);
      expect(new Set(books).size).toBe(books.length);
    }
  });
});

describe('workLink', () => {
  it('opens a commentary at the verse, in the volume that holds the book', () => {
    expect(workLink(commentaries!, { book: 'jhn', chapter: 3, verse: 16 })).toEqual({
      url: 'logosres:LLS:CALCOM64JN;ref=Bible.Jn3.16',
      fallback: 'https://ref.ly/logosres/LLS%3ACALCOM64JN?ref=Bible.Jn3.16',
    });
  });

  it('opens a commentary at the chapter when the reference has no verse, and finds a book in a shared volume', () => {
    expect(workLink(commentaries!, { book: 'rom', chapter: 8 })?.url).toBe('logosres:LLS:CALCOM66RO;ref=Bible.Ro8');
    expect(workLink(commentaries!, { book: 'col', chapter: 1, verse: 15 })?.url).toBe('logosres:LLS:CALCOM71PHP;ref=Bible.Col1.15');
    expect(workLink(commentaries!, { book: 'luk', chapter: 2, verse: 1 })?.url).toBe('logosres:LLS:CALCOM61HRMEV;ref=Bible.Lk2.1');
  });

  it('gives a commentary no link for a book it does not cover, or when no passage is named', () => {
    expect(workLink(commentaries!, { book: 'rev', chapter: 1, verse: 1 })).toBeUndefined();
    expect(workLink(commentaries!, { book: '2jn', chapter: 1 })).toBeUndefined();
    expect(workLink(commentaries!)).toBeUndefined();
  });

  it('opens a book at its start, whatever passage is named', () => {
    const start = { url: 'logosres:LLS:ICRWJKC', fallback: 'https://ref.ly/logosres/LLS%3AICRWJKC' };
    expect(workLink(institutes!)).toEqual(start);
    expect(workLink(institutes!, { book: 'jhn', chapter: 3, verse: 16 })).toEqual(start);
  });
});

describe('the works he ticked', () => {
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
  });

  it('are none to start with, are kept in the list\'s order and survive a reload of the store', async () => {
    expect(await getWorks()).toEqual([]);
    await setWorks(['calvin-institutes-lcc', 'calvin-commentaries']);
    expect(await getWorks()).toEqual(['calvin-commentaries', 'calvin-institutes-lcc']);
    await setWorks([]);
    expect(await getWorks()).toEqual([]);
  });

  it('pass over an id no work has any more, and an unreadable value', async () => {
    await db.settings.put({ key: 'works', value: JSON.stringify(['gone', 'calvin-commentaries']) });
    expect(await getWorks()).toEqual(['calvin-commentaries']);
    await db.settings.put({ key: 'works', value: 'not json' });
    expect(await getWorks()).toEqual([]);
  });
});

describe('what the tutor is told', () => {
  it('lists only the ticked works, with id, title, author and kind, and the books a commentary covers', () => {
    expect(worksForTutor([])).toEqual([]);
    const told = worksForTutor(['calvin-commentaries', 'calvin-institutes-lcc']);
    expect(told.map((w) => w.id)).toEqual(['calvin-commentaries', 'calvin-institutes-lcc']);
    expect(told[0]).toMatchObject({ title: "Calvin's Commentaries", author: 'John Calvin', kind: 'commentary' });
    expect(told[0]?.covers).toContain('John');
    expect(told[0]?.covers).not.toContain('Revelation');
    expect(told[1]).toMatchObject({ kind: 'book' });
    expect(told[1]).not.toHaveProperty('covers');
    expect(worksForTutor(['nope'])).toEqual([]);
  });

  const chapter = { verses: [] } as never;
  const scope = { title: 'John 3', chapter, verse: null };
  const send = (works?: ReturnType<typeof worksForTutor>) =>
    buildTalkRequest(scope, 'Where does Calvin say this?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, undefined, works);

  it('is carried by the request when any is ticked, and left out when none is', () => {
    expect(send(worksForTutor(['calvin-commentaries'])).works?.map((w) => w.id)).toEqual(['calvin-commentaries']);
    expect(send(worksForTutor([]))).not.toHaveProperty('works');
    expect(send()).not.toHaveProperty('works');
  });

  it('has the field in the input schema, validates a request that carries it, and is optional', () => {
    expect(inputSchema.required as string[]).not.toContain('works');
    const request = { ...send(worksForTutor(['calvin-commentaries', 'calvin-institutes-lcc'])), greek: 'Οὕτως γὰρ ἠγάπησεν', english: 'For God so loved' };
    expect(validate(request, inputSchema)).toEqual([]);
    expect(validate({ ...request, works: [{ id: 'x', title: 'T', author: 'A', kind: 'pamphlet' }] }, inputSchema)).not.toEqual([]);
  });
});

describe('the answer\'s work link', () => {
  const answer = (links: unknown) => ({ answer: 'Calvin writes on this.', words: [], links });

  it('is accepted by the app with or without a reference, and refused when malformed', () => {
    expect(isTalkAnswer(answer([{ kind: 'work', work: 'calvin-commentaries', reference: 'John 3:16' }]))).toBe(true);
    expect(isTalkAnswer(answer([{ kind: 'work', work: 'calvin-institutes-lcc' }]))).toBe(true);
    expect(isTalkAnswer(answer([{ kind: 'work' }]))).toBe(false);
    expect(isTalkAnswer(answer([{ kind: 'work', work: 'a', reference: 'John 3:16', extra: 1 }]))).toBe(false);
  });

  it('is allowed by the answer schema, for the ids of WORKS only', () => {
    expect(validate(answer([{ kind: 'work', work: 'calvin-commentaries', reference: 'John 3:16' }]), answerSchema)).toEqual([]);
    expect(validate(answer([{ kind: 'work', work: 'calvin-institutes-lcc' }]), answerSchema)).toEqual([]);
    expect(validate(answer([{ kind: 'work', work: 'invented' }]), answerSchema)).not.toEqual([]);
    const enumIds = ((answerSchema.properties?.links as { items: { anyOf: { properties: { kind: { const?: string }; work?: { enum: string[] } } }[] } }).items.anyOf.find((a) => a.properties.kind.const === 'work')?.properties.work?.enum ?? []);
    expect([...enumIds].sort()).toEqual(WORKS.map((w) => w.id).sort());
  });
});

describe('the bible-talk instructions on works', () => {
  const text = instructionsOf('bible-talk');
  it('name `works`, say to link a work only when it is in the request, and to give a commentary its reference', () => {
    expect(text).toContain('`works`');
    expect(text).toMatch(/only\s+(a\s+work\s+)?(that\s+is\s+)?in\s+`works`|only\s+when\s+it\s+is\s+in\s+`works`/i);
    expect(text).toMatch(/commentary[^.]*`reference`/i);
  });
});
