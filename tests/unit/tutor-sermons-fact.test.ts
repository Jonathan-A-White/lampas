// The sermons fact of the Bible talk lists a sermon of every source he has On for the chapter he holds (mw-fnvjof.17.286): 'play Pastor Paul's sermon' on Isaiah 1 failed because the first
// source's rows (Spurgeon's, six on that chapter) and the next sources' filled the request's eight rows before Life Bible Ministry's one was reached, so the tutor had no row to play.
import { afterEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { MAX_TUTOR_SERMONS, listedSermons, sermonsForTutor, talkSermonsFor, type ListedSermon } from '../../src/sermons/forTutor';
import { setSermonSources } from '../../src/sermons';
import { bibleTalkSteps, trimSermons } from '../../src/services/talkFit';
import type { TalkRequest } from '../../src/services/talk';
import { row, sourceOf } from '../support/sermon-sources';
import { forgetTestSermons } from '../support/test-sermons';

const chapterOf = (source: string, count: number, preacher: string): ListedSermon[] =>
  Array.from({ length: count }, (_, i) => row(source, `${source}-${i}`, `${source} sermon ${i}`, ['isa', 1, i + 1, i + 1], preacher));

/** Isaiah 1 as Pastor Paul's ask met it: a first source with more rows than the request lists, then a second, then Life Bible Ministry's one teaching, a video. */
const isaiah1 = (): ListedSermon[] => [
  ...chapterOf('spurgeon', 10, 'Charles H. Spurgeon'),
  ...chapterOf('henry', 3, 'Matthew Henry'),
  { ...row('lifebible-ttb', 'isaiah.1', 'Isaiah 1-4:1: God confronts the Kingdom of Judah', ['isa', 1, 1, 1, 4], 'Pastor Paul LeBoutillier'), open: { url: 'https://www.youtube.com/watch?v=ynUYAm1-W6k' } },
];

describe('the sermons fact lists every source he has On', () => {
  afterEach(() => forgetTestSermons());

  it("lists Pastor Paul's teaching of Isaiah 1 though the sources before it hold more rows than the request lists", () => {
    const told = sermonsForTutor(isaiah1(), []);
    expect(told.rows.length).toBeLessThanOrEqual(MAX_TUTOR_SERMONS);
    expect(told.rows).toContainEqual({
      id: 'isaiah.1',
      source: 'lifebible-ttb',
      title: 'Isaiah 1-4:1: God confronts the Kingdom of Judah',
      preacher: 'Pastor Paul LeBoutillier',
      ref: 'Isaiah 1:1-4:1',
      plays: true,
    });
  });

  it('gives a row of each source before a second of any, and keeps the order the rows came in', () => {
    const rows = isaiah1();
    const listed = listedSermons(rows);
    expect(new Set(listed.map((r) => r.source))).toEqual(new Set(['spurgeon', 'henry', 'lifebible-ttb']));
    const at = listed.map((r) => rows.findIndex((r2) => r2.id === r.id));
    expect(at).toEqual([...at].sort((x, y) => x - y));
  });

  it('keeps a row on the passage ahead of a row that came in by a theme, and a source with a theme row only comes after', () => {
    const own = [...chapterOf('spurgeon', 10, 'Charles H. Spurgeon'), ...chapterOf('henry', 2, 'Matthew Henry')];
    const byTheme: ListedSermon = { ...row('torrey-ref', 'faith', 'Faith', ['heb', 11, 1, 1], 'Another'), theme: 'Faith' };
    const listed = listedSermons([...own, byTheme]);
    expect(listed).toHaveLength(MAX_TUTOR_SERMONS);
    expect(listed.some((r) => r.id === 'faith')).toBe(false);
  });

  it('tells the tutor of the chapter he holds: the real talk list carries the row of the source after the crowded one', async () => {
    setSermonSources([sourceOf('spurgeon', 'Spurgeon', { isa: chapterOf('spurgeon', 10, 'Charles H. Spurgeon') }), sourceOf('lifebible-ttb', 'Life Bible', { isa: [isaiah1().at(-1)!] })]);
    const held = await talkSermonsFor({ book: 'isa', chapter: 1 });
    expect(held?.told.rows.map((r) => `${r.source}:${r.id}`)).toContain('lifebible-ttb:isaiah.1');
    expect(held?.rows.map((r) => `${r.source}:${r.id}`)).toContain('lifebible-ttb:isaiah.1');
  });
});

describe('the fit gives rows up before it gives the sermons up', () => {
  const request = (rows: number): TalkRequest => ({ sermons: { rows: Array.from({ length: rows }, (_, i) => ({ id: `${i}`, source: 's', title: `T${i}`, ref: 'Isaiah 1:1' })), themes: [] } }) as unknown as TalkRequest;

  it('trims the last row while more than the first eight are told, then leaves them for dropSermons', () => {
    expect(MAX_TUTOR_SERMONS).toBeGreaterThan(8);
    expect(trimSermons(request(MAX_TUTOR_SERMONS))?.sermons?.rows).toHaveLength(MAX_TUTOR_SERMONS - 1);
    expect(trimSermons(request(8))).toBeNull();
    expect(trimSermons({} as TalkRequest)).toBeNull();
  });

  it('comes before dropSermons in the order of the fit', () => {
    const names = bibleTalkSteps(0).map((s) => s.name);
    expect(names.indexOf('trimSermons')).toBeGreaterThan(-1);
    expect(names.indexOf('trimSermons')).toBeLessThan(names.indexOf('dropSermons'));
  });
});
