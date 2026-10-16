// Memory (mw-yrmkdf.1): the notes Lampas keeps per reader on the phone: one capped index and named notes (book:, word:, topic:), in the settings
// store, with a selection for a reference and a word, and an export that imports back byte for byte.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import {
  MEMORY_INDEX_MAX,
  MEMORY_NOTE_MAX,
  appendToIndex,
  appendToNote,
  exportMemory,
  getIndex,
  getNote,
  greekNoLine,
  importMemory,
  listNotes,
  putNote,
  removeNote,
  selectNotes,
  setIndex,
} from '../../src/data/repositories/memory';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

describe('the index', () => {
  it('is empty until something is written', async () => {
    const index = await getIndex();
    expect(index.body).toBe('');
    expect(index.text).toBe('');
    expect(index.by).toBeUndefined();
  });

  it('keeps what is written with when and by whom', async () => {
    expect(await setIndex('He likes a story first.', 'me', 1000)).toBe('saved');
    const index = await getIndex();
    expect(index.body).toBe('He likes a story first.');
    expect(index.when).toBe(1000);
    expect(index.by).toBe('me');
  });

  it('is capped: a text that would pass MEMORY_INDEX_MAX is refused and nothing changes', async () => {
    await setIndex('short', 'me', 1);
    expect(await setIndex('x'.repeat(MEMORY_INDEX_MAX + 1), 'me', 2)).toBe('too-long');
    expect((await getIndex()).body).toBe('short');
    expect((await getIndex()).when).toBe(1);
  });

  it('never reads back longer than MEMORY_INDEX_MAX, however many notes and however long the text', async () => {
    for (let i = 0; i < 30; i++) await putNote(`topic:subject-${i}`, 'A line about it that goes on and on and on and on and on and on.', 'me', 5);
    expect((await getIndex()).text.length).toBeLessThanOrEqual(MEMORY_INDEX_MAX);
    expect((await getIndex()).body).toBe('');
    await setIndex('y'.repeat(1000), 'me', 6);
    expect((await getIndex()).text.length).toBeLessThanOrEqual(MEMORY_INDEX_MAX);
  });

  it('has a notes section the app keeps: one line per named note, its name and a one-line summary, rebuilt from the notes', async () => {
    await setIndex('Prefers stories.', 'me', 1);
    await putNote('book:Romans', 'Reads it slowly.\nSecond line is not in the summary.', 'me', 2);
    await putNote('word:λόγος', 'Keeps confusing it with λέγω.', 'tutor', 3);
    let index = await getIndex();
    expect(index.text).toContain('Prefers stories.');
    expect(index.notes.split('\n')).toEqual(['Notes:', '- book:Romans — Reads it slowly.', '- word:λόγος — Keeps confusing it with λέγω.']);
    expect(index.text).toBe(`Prefers stories.\n\n${index.notes}`);
    expect(index.text).not.toContain('Second line');
    await removeNote('book:Romans');
    index = await getIndex();
    expect(index.notes).not.toContain('book:Romans');
    expect(index.notes).toContain('word:λόγος');
    // the section is not part of what he edits: setting the whole text back does not copy it into the body
    await setIndex(index.text, 'me', 4);
    expect((await getIndex()).body).toBe('Prefers stories.');
  });

  it('has no notes section while there are no notes', async () => {
    await setIndex('Only this.', 'me', 1);
    expect((await getIndex()).notes).toBe('');
    expect((await getIndex()).text).toBe('Only this.');
  });

  it('takes an appended line, the tutor\'s only write, on a line of its own, with who and when', async () => {
    await setIndex('First.', 'me', 1);
    expect(await appendToIndex('Second.', 'tutor', 2)).toBe('saved');
    const index = await getIndex();
    expect(index.body).toBe('First.\nSecond.');
    expect(index.by).toBe('tutor');
    expect(index.when).toBe(2);
    expect(await appendToIndex('   ', 'tutor', 3)).toBe('empty');
    expect(await appendToIndex('z'.repeat(MEMORY_INDEX_MAX), 'tutor', 4)).toBe('too-long');
    expect((await getIndex()).body).toBe('First.\nSecond.');
  });
});

describe('the named notes', () => {
  it('puts, gets, lists and removes a note, with when and by whom', async () => {
    expect(await putNote('topic:aorist', 'Tell it with a picture.', 'me', 10)).toBe('saved');
    expect(await getNote('topic:aorist')).toEqual({ name: 'topic:aorist', text: 'Tell it with a picture.', when: 10, by: 'me' });
    expect(await putNote('topic:aorist', 'Tell it with a story.', 'tutor', 20)).toBe('saved');
    expect(await getNote('topic:aorist')).toEqual({ name: 'topic:aorist', text: 'Tell it with a story.', when: 20, by: 'tutor' });
    expect(await listNotes()).toHaveLength(1);
    await removeNote('topic:aorist');
    expect(await getNote('topic:aorist')).toBeUndefined();
    expect(await listNotes()).toEqual([]);
  });

  it('lists the notes by name', async () => {
    await putNote('word:λόγος', 'b', 'me', 1);
    await putNote('book:Romans', 'a', 'me', 1);
    await putNote('topic:aorist', 'c', 'me', 1);
    expect((await listNotes()).map((n) => n.name)).toEqual(['book:Romans', 'topic:aorist', 'word:λόγος']);
  });

  it('accepts only book:<Book>, word:<lemma> and topic:<slug>', async () => {
    expect(await putNote('book:Romans', 'x', 'me', 1)).toBe('saved');
    expect(await putNote('book:1 John', 'x', 'me', 1)).toBe('saved');
    expect(await putNote('book:Isaiah', 'x', 'me', 1)).toBe('saved');
    expect(await putNote('book:Narnia', 'x', 'me', 1)).toBe('bad-name');
    expect(await putNote('word:', 'x', 'me', 1)).toBe('bad-name');
    expect(await putNote('word:two words', 'x', 'me', 1)).toBe('bad-name');
    expect(await putNote('topic:Not A Slug', 'x', 'me', 1)).toBe('bad-name');
    expect(await putNote('romans', 'x', 'me', 1)).toBe('bad-name');
    expect(await putNote('colour:red', 'x', 'me', 1)).toBe('bad-name');
  });

  it('keeps a word under its NFC lemma however it was typed', async () => {
    const nfd = 'λόγος'.normalize('NFD');
    expect(await putNote(`word:${nfd}`, 'x', 'me', 1)).toBe('saved');
    expect((await listNotes())[0].name).toBe('word:λόγος'.normalize('NFC'));
    expect(await getNote(`word:${nfd}`)).toBeDefined();
  });

  it('caps a note at MEMORY_NOTE_MAX and refuses an empty one', async () => {
    expect(await putNote('topic:long', 'x'.repeat(MEMORY_NOTE_MAX), 'me', 1)).toBe('saved');
    expect(await putNote('topic:long', 'x'.repeat(MEMORY_NOTE_MAX + 1), 'me', 2)).toBe('too-long');
    expect((await getNote('topic:long'))?.when).toBe(1);
    expect(await putNote('topic:blank', '   ', 'me', 3)).toBe('empty');
    expect(await getNote('topic:blank')).toBeUndefined();
  });

  it('appends a line to a note, keeping when and by whom, and makes the note when it is not there', async () => {
    await putNote('word:λόγος', 'First.', 'me', 1);
    expect(await appendToNote('word:λόγος', 'Second.', 'tutor', 2)).toBe('saved');
    expect(await getNote('word:λόγος')).toEqual({ name: 'word:λόγος', text: 'First.\nSecond.', when: 2, by: 'tutor' });
    expect(await appendToNote('topic:new', 'Begun by the tutor.', 'tutor', 3)).toBe('saved');
    expect((await getNote('topic:new'))?.text).toBe('Begun by the tutor.');
    expect(await appendToNote('word:λόγος', 'q'.repeat(MEMORY_NOTE_MAX), 'tutor', 4)).toBe('too-long');
    expect((await getNote('word:λόγος'))?.text).toBe('First.\nSecond.');
    expect(await appendToNote('word:λόγος', ' ', 'tutor', 5)).toBe('empty');
    expect(await appendToNote('nonsense', 'x', 'tutor', 6)).toBe('bad-name');
  });

  it('keeps at most a fixed number of notes', async () => {
    let last = 'saved';
    for (let i = 0; i < 60; i++) last = await putNote(`topic:t-${i}`, 'x', 'me', 1);
    expect(last).toBe('full');
    expect((await listNotes()).length).toBeLessThan(60);
    // changing a note already kept still works when full
    expect(await putNote('topic:t-0', 'changed', 'me', 2)).toBe('saved');
  });
});

describe('selectNotes', () => {
  beforeEach(async () => {
    await setIndex('Prefers stories.', 'me', 1);
    for (const name of ['book:Romans', 'book:John', 'word:λόγος', 'word:ἀγάπη', 'topic:aorist', 'topic:goal']) await putNote(name, `About ${name}.`, 'me', 2);
  });

  it("for 'Romans 8:28' and λόγος returns the index, book:Romans and word:λόγος and no other", async () => {
    const picked = await selectNotes('Romans 8:28', 'λόγος', undefined);
    expect(picked.index).toBe((await getIndex()).text);
    expect(picked.notes.map((n) => n.name)).toEqual(['book:Romans', 'word:λόγος']);
  });

  it('finds the book however the reference is written, and a lemma however it is composed', async () => {
    expect((await selectNotes('Rom.8.28', undefined, undefined)).notes.map((n) => n.name)).toEqual(['book:Romans']);
    expect((await selectNotes('Romans', undefined, undefined)).notes.map((n) => n.name)).toEqual(['book:Romans']);
    expect((await selectNotes(undefined, 'λόγος'.normalize('NFD'), undefined)).notes.map((n) => n.name)).toEqual(['word:λόγος']);
  });

  it('takes the topic named for the screen', async () => {
    expect((await selectNotes(undefined, undefined, 'Goal')).notes.map((n) => n.name)).toEqual(['topic:goal']);
  });

  it('returns only the index when nothing matches or nothing is asked', async () => {
    expect((await selectNotes('Jude 1:1', 'ζζζ', undefined)).notes).toEqual([]);
    expect((await selectNotes(undefined, undefined, undefined)).notes).toEqual([]);
    expect((await selectNotes('not a place', undefined, undefined)).index).toBe((await getIndex()).text);
  });
});

describe('export and import', () => {
  it('round-trips byte for byte', async () => {
    await setIndex('Prefers stories.\nTires after ten minutes.', 'me', 1700000000000);
    await putNote('book:Romans', 'Reads it slowly.', 'me', 1700000001000);
    await putNote('word:λόγος', 'Confuses it with λέγω.\nHas it now.', 'tutor', 1700000002000);
    await putNote('topic:aorist', 'A picture helps.', 'tutor', 1700000003000);
    const file = await exportMemory();
    await db.settings.clear();
    expect(await listNotes()).toEqual([]);
    const result = await importMemory(file);
    expect(result).toEqual({ status: 'imported', notes: 3, index: true });
    expect(await exportMemory()).toBe(file);
  });

  it('exports an empty memory that imports back empty', async () => {
    const file = await exportMemory();
    expect((await importMemory(file))).toEqual({ status: 'imported', notes: 0, index: false });
    expect(await exportMemory()).toBe(file);
  });

  it('replaces what is kept', async () => {
    await putNote('topic:old', 'Gone after.', 'me', 1);
    await setIndex('Old index.', 'me', 1);
    const other = JSON.stringify({ format: 'lampas-memory', version: 1, index: null, notes: [{ name: 'book:John', text: 'New.', when: 5, by: 'me' }] });
    expect(await importMemory(other)).toEqual({ status: 'imported', notes: 1, index: false });
    expect((await listNotes()).map((n) => n.name)).toEqual(['book:John']);
    expect((await getIndex()).body).toBe('');
  });

  it('refuses a file that is not a Lampas memory and changes nothing', async () => {
    await putNote('topic:keep', 'Stays.', 'me', 1);
    for (const bad of ['not json', '[]', '{"format":"other","version":1,"index":null,"notes":[]}', '{"format":"lampas-memory","version":9,"index":null,"notes":[]}', '{"format":"lampas-memory","version":1,"index":null,"notes":[{"name":"bogus","text":"x","when":1,"by":"me"}]}']) {
      expect(await importMemory(bad), bad).toEqual({ status: 'bad-file' });
    }
    expect((await listNotes()).map((n) => n.name)).toEqual(['topic:keep']);
  });
});

describe('the line for his no to the Greek offer (mw-yrmkdf.9)', () => {
  it('carries the phone\'s own date, not the UTC day: 22:30 in New York on 13 October is the 13th', () => {
    const tz = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      const evening = new Date(2026, 9, 13, 22, 30).getTime();
      expect(new Date(evening).toISOString()).toBe('2026-10-14T02:30:00.000Z');
      expect(greekNoLine(evening)).toBe('said no to the Greek offer 2026-10-13');
    } finally {
      process.env.TZ = tz;
    }
  });
});
