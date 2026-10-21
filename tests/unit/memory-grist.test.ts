// The tutor reads the reader's memory (mw-yrmkdf.2): every tutor grist carries `memory` (the index and the notes the app chose by name), and the bible-talk
// answer may append to a note (memory_update), change or remove one only when it is directed, and name notes it wished it had (wished_notes).
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import type { Chapter, Verse } from '../../src/data/chapter';
import { learnerMemory, memoryFieldOf } from '../../src/data/learnerMemory';
import { getIndex, getNote, getWishedNotes, putNote, selectNotes, setIndex, WISHED_NAMES_KEPT } from '../../src/data/repositories/memory';
import { buildReadingRequest } from '../../src/services/reading';
import { buildTalkRequest, fitHistory, isTalkAnswer, MAX_REQUEST_BYTES, type TalkScope } from '../../src/services/talk';
import { buildRequest } from '../../src/services/tutor';
import { applyMemoryFromAnswer } from '../../src/talk/memoryUpdate';
import { buildTipRequest } from '../../src/tips/tip';
import { validate, type Schema } from '../support/schema-validate';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  vi.restoreAllMocks();
});

const NOW = Date.UTC(2026, 9, 13, 12, 0, 0);
const verse = { n: 28, g: [{ t: 'οἴδαμεν' }], e: [{ t: 'We know' }] } as unknown as Verse;
const chapter = { book: 'rom', chapter: 8, verses: [verse, verse], lex: {}, parse: {} } as unknown as Chapter;
const scope: TalkScope = { title: 'Romans 8', chapter, verse: null };

async function keepMemory(): Promise<void> {
  await setIndex('Prefers stories first.', 'me', 1);
  for (const name of ['book:Romans', 'book:John', 'word:λόγος', 'word:ἀγάπη', 'topic:goal']) await putNote(name, `About ${name}.`, 'me', 2);
}

describe('the request carries the memory', () => {
  it('from Romans 8 with λόγος tapped: the index and exactly the notes selectNotes returns', async () => {
    await keepMemory();
    const picked = await selectNotes('Romans 8', 'λόγος', undefined);
    const memory = await learnerMemory('Romans 8', 'λόγος', undefined);
    expect(memory?.index).toBe(picked.index);
    expect(memory?.index).toContain('Prefers stories first.');
    expect(memory?.notes).toEqual(picked.notes.map((n) => ({ name: n.name, text: n.text })));
    expect(memory?.notes.map((n) => n.name)).toEqual(['book:Romans', 'word:λόγος']);

    const focus = { form: 'λόγος', lemma: 'λόγος', parse: 'noun', kind: 'word' as const };
    const request = buildTalkRequest(scope, 'What is this?', [], [], {}, focus, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, 'modern', false, memory);
    expect(request.memory).toEqual(memory);
  });

  it('reads a passage reference as its book', async () => {
    await keepMemory();
    expect((await learnerMemory('Romans 8:1-11', undefined, undefined))?.notes.map((n) => n.name)).toEqual(['book:Romans']);
  });

  it('is missing when nothing is kept', async () => {
    expect(await learnerMemory('Romans 8', 'λόγος', undefined)).toBeUndefined();
    expect(memoryFieldOf({ index: '', notes: [] })).toBeUndefined();
    const request = buildTalkRequest(scope, 'What is this?', [], []);
    expect('memory' in request).toBe(false);
  });

  it('rides the other three grinds too', async () => {
    await keepMemory();
    const memory = await learnerMemory('Romans 8:28', undefined, undefined);
    expect(buildRequest('Romans 8:28', verse, 'Q?', [], undefined, undefined, undefined, [], undefined, false, 'modern', memory).memory).toEqual(memory);
    expect(buildReadingRequest('Romans 8:28', verse, 'english', 'en', undefined, undefined, undefined, 'modern', memory).memory).toEqual(memory);
    const summary = { settings_changed: [], settings_never: [] } as never;
    expect(buildTipRequest(summary, [], undefined, undefined, undefined, memory).memory).toEqual(memory);
  });

  it('is cut by the record fit: the notes go from the last, the index stays', () => {
    const big = 'ά'.repeat(1900);
    const memory = { index: 'The index.', notes: [{ name: 'book:Romans', text: big }, { name: 'word:λόγος', text: big }, { name: 'topic:goal', text: big }] };
    const request = buildTalkRequest(scope, 'What is this?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, 'modern', false, memory);
    const fitted = fitHistory(request);
    expect(new TextEncoder().encode(JSON.stringify(fitted)).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.memory?.index).toBe('The index.');
    expect(fitted.memory?.notes.length).toBeLessThan(3);
    expect(fitted.memory?.notes[0].name).toBe('book:Romans');
  });
});

describe('a memory_update from a talk', () => {
  beforeEach(keepMemory);

  it('appends to the named note, by the tutor', async () => {
    const result = await applyMemoryFromAnswer({ memory_update: [{ name: 'word:λόγος', append: 'Confuses it with λέγω.' }] }, NOW);
    expect(result.refused).toEqual([]);
    const note = await getNote('word:λόγος');
    expect(note?.text).toBe('About word:λόγος.\nConfuses it with λέγω.');
    expect(note?.by).toBe('tutor');
    expect(note?.when).toBe(NOW);
  });

  it('makes a note that is not there, and appends to the index', async () => {
    await applyMemoryFromAnswer({ memory_update: [{ name: 'topic:aorist', append: 'A picture helps.' }, { name: 'index', append: 'Tires after ten minutes.' }] }, NOW);
    expect((await getNote('topic:aorist'))?.by).toBe('tutor');
    const index = await getIndex();
    expect(index.body).toBe('Prefers stories first.\nTires after ten minutes.');
    expect(index.by).toBe('tutor');
  });

  it('refuses a replace or a remove that is not directed, logs it and leaves the note as it was', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const before = await getNote('book:Romans');
    const result = await applyMemoryFromAnswer({ memory_update: [{ name: 'book:Romans', replace: 'Something else.' }, { name: 'word:λόγος', remove: true }, { name: 'index', replace: 'New index.' }] }, NOW);
    expect(result.refused).toHaveLength(3);
    expect(await getNote('book:Romans')).toEqual(before);
    expect((await getNote('word:λόγος'))?.text).toBe('About word:λόγος.');
    expect((await getIndex()).body).toBe('Prefers stories first.');
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('replaces or removes a note when it is directed', async () => {
    await applyMemoryFromAnswer({ memory_update: [{ name: 'book:Romans', replace: 'Reads it slowly.', directed: true }, { name: 'word:λόγος', remove: true, directed: true }] }, NOW);
    expect((await getNote('book:Romans'))?.text).toBe('Reads it slowly.');
    expect((await getNote('book:Romans'))?.by).toBe('tutor');
    expect(await getNote('word:λόγος')).toBeUndefined();
  });

  it('refuses a name that is not in the naming scheme', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = await applyMemoryFromAnswer({ memory_update: [{ name: 'favourite colour', append: 'Blue.' }] }, NOW);
    expect(result.refused).toHaveLength(1);
  });
});

describe('wished_notes', () => {
  it('are counted and the names kept', async () => {
    await applyMemoryFromAnswer({ wished_notes: ['topic:aorist', 'word:ἀγάπη'] }, NOW);
    expect(await getWishedNotes()).toEqual({ count: 2, names: ['topic:aorist', 'word:ἀγάπη'] });
    await applyMemoryFromAnswer({ wished_notes: ['topic:aorist'] }, NOW);
    expect(await getWishedNotes()).toEqual({ count: 3, names: ['word:ἀγάπη', 'topic:aorist'] });
  });

  it('keeps the last twenty names and the whole count; a name outside the scheme is not counted', async () => {
    for (let i = 0; i < 25; i++) await applyMemoryFromAnswer({ wished_notes: [`topic:t${i}`] }, NOW);
    await applyMemoryFromAnswer({ wished_notes: ['not a note'] }, NOW);
    const wished = await getWishedNotes();
    expect(wished.count).toBe(25);
    expect(wished.names).toHaveLength(WISHED_NAMES_KEPT);
    expect(wished.names[WISHED_NAMES_KEPT - 1]).toBe('topic:t24');
  });

  it('are nothing when none are kept', async () => {
    expect(await getWishedNotes()).toEqual({ count: 0, names: [] });
  });
});

describe('the answer guard and the schemas', () => {
  const base = { answer: 'Yes.', question: 'What does it say?', words: [] };
  it('takes a memory_update and wished_notes of the right shape', () => {
    expect(isTalkAnswer({ ...base, memory_update: [{ name: 'word:λόγος', append: 'x' }], wished_notes: ['topic:aorist'] })).toBe(true);
    expect(isTalkAnswer({ ...base, memory_update: [{ name: 'book:Romans', replace: 'x', directed: true }, { name: 'index', remove: true, directed: true }] })).toBe(true);
  });
  it('refuses a malformed one', () => {
    expect(isTalkAnswer({ ...base, memory_update: [{ name: 'word:λόγος' }] })).toBe(false);
    expect(isTalkAnswer({ ...base, memory_update: [{ name: 'word:λόγος', append: 'x', replace: 'y' }] })).toBe(false);
    expect(isTalkAnswer({ ...base, memory_update: [{ name: 'word:λόγος', append: 'x', extra: 1 }] })).toBe(false);
    expect(isTalkAnswer({ ...base, memory_update: [{ name: 'word:λόγος', remove: false }] })).toBe(false);
    expect(isTalkAnswer({ ...base, memory_update: [{ name: 'word:λόγος', append: 'x', directed: true }] })).toBe(false);
    expect(isTalkAnswer({ ...base, wished_notes: [''] })).toBe(false);
    expect(isTalkAnswer({ ...base, wished_notes: 'topic:aorist' })).toBe(false);
  });

  const schema = (file: string): Schema => JSON.parse(readFileSync(`grinds/${file}`, 'utf8')) as Schema;
  it('the answer schema holds the same shapes', () => {
    const answer = schema('bible-talk.answer.schema.json');
    const ok = (extra: Record<string, unknown>) => validate({ ...base, ...extra }, answer);
    expect(ok({ memory_update: [{ name: 'word:λόγος', append: 'x' }], wished_notes: ['topic:aorist'] })).toEqual([]);
    expect(ok({ memory_update: [{ name: 'book:Romans', replace: 'x', directed: true }, { name: 'index', remove: true, directed: true }] })).toEqual([]);
    expect(ok({ memory_update: [{ name: 'word:λόγος' }] })).not.toEqual([]);
    expect(ok({ memory_update: [{ name: 'word:λόγος', remove: false }] })).not.toEqual([]);
    expect(ok({ wished_notes: [''] })).not.toEqual([]);
  });

  it.each(['bible-talk', 'verse-ask', 'verse-read', 'tips'])('%s: the input schema takes memory, and not a note without a name', (kind) => {
    const input = schema(`${kind}.input.schema.json`);
    expect(Object.keys(input.properties ?? {})).toContain('memory');
    const memory = (input.properties as Record<string, Schema>).memory;
    expect(validate({ index: 'x', notes: [{ name: 'book:Romans', text: 'y' }] }, memory)).toEqual([]);
    expect(validate({ index: 'x', notes: [{ text: 'y' }] }, memory)).not.toEqual([]);
    expect(validate({ notes: [] }, memory)).not.toEqual([]);
  });
});
