// tests/unit/read-span.test.ts — the 'Play to' setting (mw-5r3p30.705): the header's Play always goes on, to the end of the book or the end of the Bible;
// a stored span from before (verse, passage, chapter) reads as the end of the book.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getReadSpan, setReadSpan } from '../../src/data/repositories';
import { DEFAULT_PLAY_TO, isPlayTo, PLAY_TOS, playToOf } from '../../src/speech/readSpan';
import { settingOf } from '../../src/settings/registry';

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('Play to', () => {
  it('has exactly End of the book and End of the Bible, the book first and the default', () => {
    expect(PLAY_TOS.map((s) => [s.id, s.label])).toEqual([
      ['book', 'End of the book'],
      ['bible', 'End of the Bible'],
    ]);
    expect(DEFAULT_PLAY_TO).toBe('book');
    expect(isPlayTo('bible')).toBe(true);
    expect(isPlayTo('chapter')).toBe(false);
  });

  it.each(['verse', 'passage', 'chapter', 'nonsense', undefined, 3])('a stored %s reads as End of the book', (old) => {
    expect(playToOf(old)).toBe('book');
  });

  it('the setting in the registry is Play to with the two choices and the hint', async () => {
    const row = settingOf('readSpan');
    expect(row?.label).toBe('Play to');
    expect(row?.allowed).toEqual({
      kind: 'choice',
      values: [
        { value: 'book', label: 'End of the book' },
        { value: 'bible', label: 'End of the Bible' },
      ],
    });
    expect(row?.hint).toBe('Play goes on from here. To hear less, tap a verse, a section heading or the place line.');
  });

  it('is End of the book when nothing is saved, and an old saved value reads as End of the book', async () => {
    expect(await getReadSpan()).toBe('book');
    for (const old of ['verse', 'passage', 'chapter']) {
      await db.settings.put({ key: 'readSpan', value: old });
      expect(await getReadSpan()).toBe('book');
    }
    await setReadSpan('bible');
    expect(await getReadSpan()).toBe('bible');
  });
});
