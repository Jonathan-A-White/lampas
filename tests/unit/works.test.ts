// Works he holds in Logos (mw-5r3p30.675): the list, the link that opens one (at the passage for a commentary), the ticks kept in the settings store,
// what the tutor is told of the ticked ones and the answer's `work` link.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getWorks, setWorks } from '../../src/data/repositories';
import { WORKS, workLink, workOf } from '../../src/resources/works';
import { workChip, worksForTutor } from '../../src/resources/tutorLinks';
import { WORK_LINK_IDS } from '../../src/resources/workIds';
import { buildTalkRequest, isTalkAnswer } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';

const commentaries = WORKS.find((w) => w.id === 'calvin-commentaries');
const institutes = WORKS.find((w) => w.id === 'calvin-institutes-lcc');
const beveridge = WORKS.find((w) => w.id === 'calvin-institutes-beveridge');
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

  // mw-5r3p30.708: the Institutes carry their own reference type (CICR, book.chapter.section: his library listing's ReferenceSupersets 'cicr.1-4.20.32'), so a place in it is
  // `ref=CICR.<book>.<chapter>[.<section>]`, not a Bible reference and not the title page.
  it('opens a book that has an index at the chapter or section it is given, the scheme and the ref.ly fallback both', () => {
    expect(workLink(institutes!, undefined, '3.24')).toEqual({
      url: 'logosres:LLS:ICRWJKC;ref=CICR.3.24',
      fallback: 'https://ref.ly/logosres/LLS%3AICRWJKC?ref=CICR.3.24',
    });
    expect(workLink(institutes!, undefined, '3.21.5')).toEqual({
      url: 'logosres:LLS:ICRWJKC;ref=CICR.3.21.5',
      fallback: 'https://ref.ly/logosres/LLS%3AICRWJKC?ref=CICR.3.21.5',
    });
    expect(workLink(beveridge!, undefined, ' 1.17 ')?.url).toBe('logosres:LLS:ICRBEV;ref=CICR.1.17');
  });

  it('opens at the start when the place is not one the book has, and a commentary ignores a book place', () => {
    const start = { url: 'logosres:LLS:ICRWJKC', fallback: 'https://ref.ly/logosres/LLS%3AICRWJKC' };
    for (const bad of ['', '5.1', '0.1', '3.26', '4.21', '1.19', '3', '3.24.0', '3.24.5.1', 'Romans 8:28', 'III.xxiv', '3,24']) expect(workLink(institutes!, undefined, bad)).toEqual(start);
    expect(workLink(commentaries!, { book: 'rom', chapter: 8 }, '3.24')?.url).toBe('logosres:LLS:CALCOM66RO;ref=Bible.Ro8');
    expect(workLink(commentaries!, undefined, '3.24')).toBeUndefined();
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
  /** His shelf as rows: every volume of the works named, On. */
  const shelfOf = (...ids: string[]) => ids.flatMap((id) => (workOf(id)?.volumes ?? []).map((v, i) => ({ id: v.resource, kind: 'commentary', state: 'on' as const, since: i })));
  const rom8 = { book: 'rom', chapter: 8 };

  it('lists a work of several volumes as one line {id, t, k}, a book that takes a place with p, and no author or covers', () => {
    expect(worksForTutor([], rom8, '')).toEqual([]);
    const told = worksForTutor(shelfOf('calvin-commentaries', 'calvin-institutes-lcc'), rom8, 'What does Calvin say?');
    expect(told).toEqual([
      { id: 'calvin-commentaries', t: "Calvin's Commentaries", k: 'c' },
      { id: 'calvin-institutes-lcc', t: 'ICR', k: 'b', p: 1 },
    ]);
  });

  it('names a commentary only when its volume covers the book he is on, and counts the rest in the more line', () => {
    const rev = worksForTutor(shelfOf('calvin-commentaries'), { book: 'rev', chapter: 1 }, '');
    expect(rev).toEqual([{ more: { commentary: 1 } }]);
    expect(worksForTutor(shelfOf('calvin-commentaries'), undefined, '')).toEqual([{ more: { commentary: 1 } }]);
  });

  const chapter = { verses: [] } as never;
  const scope = { title: 'John 3', chapter, verse: null };
  const send = (works?: ReturnType<typeof worksForTutor>) =>
    buildTalkRequest(scope, 'Where does Calvin say this?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, undefined, works);

  it('is carried by the request when any is on his shelf, and left out when none is', () => {
    expect(send(worksForTutor(shelfOf('calvin-commentaries'), { book: 'jhn', chapter: 3 }, '')).works).toEqual([{ id: 'calvin-commentaries', t: "Calvin's Commentaries", k: 'c' }]);
    expect(send(worksForTutor([], rom8, ''))).not.toHaveProperty('works');
    expect(send()).not.toHaveProperty('works');
  });

  it('has the field in the input schema, validates a request that carries it, and is optional', () => {
    expect(inputSchema.required as string[]).not.toContain('works');
    const request = { ...send(worksForTutor(shelfOf('calvin-commentaries', 'calvin-institutes-lcc'), { book: 'jhn', chapter: 3 }, '')), greek: 'Οὕτως γὰρ ἠγάπησεν', english: 'For God so loved' };
    expect(validate(request, inputSchema)).toEqual([]);
    expect(validate({ ...request, works: [{ id: 'x', t: 'T', k: 'pamphlet' }] }, inputSchema)).not.toEqual([]);
    expect(validate({ ...request, works: [{ id: 'x', t: 'T', k: 'c' }, { more: { commentary: 2 } }] }, inputSchema)).toEqual([]);
    expect(validate({ ...request, works: [{ more: { commentary: 2 }, id: 'x' }] }, inputSchema)).not.toEqual([]);
  });
});

describe('the chip of a work link', () => {
  const ticked = ['calvin-commentaries', 'calvin-institutes-lcc'];

  it('opens a book at its place and says which in its name, and at the start with no place', () => {
    const at = workChip('calvin-institutes-lcc', undefined, ticked, '3.24');
    expect(at?.chip.url).toBe('logosres:LLS:ICRWJKC;ref=CICR.3.24');
    expect(at?.name).toContain('Book 3, chapter 24');
    expect(workChip('calvin-institutes-lcc', undefined, ticked, '3.21.5')?.name).toContain('Book 3, chapter 21, section 5');
    expect(workChip('calvin-institutes-lcc', undefined, ticked)?.chip.url).toBe('logosres:LLS:ICRWJKC');
    expect(workChip('calvin-institutes-lcc', undefined, ticked, '9.9')?.chip.url).toBe('logosres:LLS:ICRWJKC');
    expect(workChip('calvin-institutes-lcc', undefined, ticked, '9.9')?.name).not.toContain('Book');
  });

  it('keeps the commentary at its verse', () => {
    expect(workChip('calvin-commentaries', 'Romans 8:28', ticked)?.chip.url).toBe('logosres:LLS:CALCOM66RO;ref=Bible.Ro8.28');
  });
});

describe('the answer\'s work link', () => {
  const answer = (links: unknown) => ({ answer: 'Calvin writes on this.', question: 'What does it say?', words: [], links });

  it('is accepted by the app with or without a reference, and refused when malformed', () => {
    expect(isTalkAnswer(answer([{ kind: 'work', work: 'calvin-commentaries', reference: 'John 3:16' }]))).toBe(true);
    expect(isTalkAnswer(answer([{ kind: 'work', work: 'calvin-institutes-lcc' }]))).toBe(true);
    expect(isTalkAnswer(answer([{ kind: 'work', work: 'calvin-institutes-lcc', place: '3.24' }]))).toBe(true);
    expect(isTalkAnswer(answer([{ kind: 'work', work: 'calvin-institutes-lcc', place: '' }]))).toBe(false);
    expect(isTalkAnswer(answer([{ kind: 'work' }]))).toBe(false);
    expect(isTalkAnswer(answer([{ kind: 'work', work: 'a', reference: 'John 3:16', extra: 1 }]))).toBe(false);
  });

  it('is allowed by the answer schema, for the ids of the catalogue only', () => {
    expect(validate(answer([{ kind: 'work', work: 'calvin-commentaries', reference: 'John 3:16' }]), answerSchema)).toEqual([]);
    expect(validate(answer([{ kind: 'work', work: 'calvin-institutes-lcc' }]), answerSchema)).toEqual([]);
    expect(validate(answer([{ kind: 'work', work: 'calvin-institutes-lcc', place: '3.24' }]), answerSchema)).toEqual([]);
    expect(validate(answer([{ kind: 'work', work: 'calvin-institutes-lcc', place: '' }]), answerSchema)).not.toEqual([]);
    expect(validate(answer([{ kind: 'work', work: 'invented' }]), answerSchema)).not.toEqual([]);
    const enumIds = ((answerSchema.properties?.links as { items: { anyOf: { properties: { kind: { const?: string }; work?: { enum: string[] } } }[] } }).items.anyOf.find((a) => a.properties.kind.const === 'work')?.properties.work?.enum ?? []);
    expect([...enumIds].sort()).toEqual([...WORK_LINK_IDS].sort());
    for (const w of WORKS) expect(enumIds).toContain(w.id);
  });
});

describe('the bible-talk instructions on works', () => {
  const text = instructionsOf('bible-talk');
  it('name `works`, say to link a work only when it is in the request, and to give a commentary its reference', () => {
    expect(text).toContain('`works`');
    expect(text).toMatch(/never\s+name\s+a\s+work\s+as\s+his\s+that\s+`works`\s+does\s+not\s+list/i);
    expect(text).toMatch(/commentary[^.]*`reference`/i);
  });

  it('say, in one rule, to link a work only when it directly treats what he asked, and to give a book its `place`', () => {
    expect(text).toMatch(/only when (it|the work) directly (treats|answers)/i);
    expect(text).toMatch(/book[^.]*`place`/i);
  });
});
