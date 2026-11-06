// 'On the same theme' (mw-qtu3zvz.4, docs/sermons.md): the sermon-index service's theme tier as the sheet applies it. themeTier is the pure rule: the cap, the dedupe, the order and the cut at 12, over topics and
// sermons held in the test; sameThemeFor reads the sources that are on (tests/support/test-themes.ts, test-sermons.ts) and leaves out what the passage's own groups hold.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { sameThemeFor, sermonsFor } from '../../src/sermons';
import { THEME_ROW_LIMIT, themeTier, type TopicLinks } from '../../src/sermons/sermonsFor';
import type { SermonRef, SermonRow } from '../../src/sermons/types';
import { forgetTestSermons, registerTestSermons } from '../support/test-sermons';
import { forgetTestThemes, registerTestThemes } from '../support/test-themes';

const row = (source: string, id: string, ref: SermonRef): SermonRow => ({ id, source, title: `Sermon ${id}`, ref, role: 'text', open: { url: `https://x.test/${source}/${id}` }, opensIn: 'web' });
const at = (chapter: number, from: number, to = from, book = 'rom'): SermonRef => ({ book, chapter, from, to });
const topic = (source: string, id: string, verses: number, ...links: SermonRef[]): TopicLinks => ({ source, id, label: id.toUpperCase(), verses, links });
const ids = (found: ReturnType<typeof themeTier>): string[] => found.groups.flatMap((g) => g.rows.map((r) => `${g.topic.id}:${r.source}:${r.id}`));

describe('themeTier: which sermons are on the same theme', () => {
  it('takes a sermon whose preaching text overlaps a link of the topic, and no other', () => {
    const topics = [topic('t', 'a', 10, at(1, 5, 7), at(2, 3, 3, 'jon'))];
    const rows = [row('s', '1', at(1, 7)), row('s', '2', at(1, 8)), row('s', '3', at(1, 1, 5)), row('s', '4', at(3, 1, 4, 'jon')), row('s', '5', at(2, 3, 3, 'jon'))];
    // 1 (verse 7) and 3 (1 to 5) touch the link 5 to 7; 2 (verse 8) is past it; 4 is another chapter; 5 is the link in Jonah; a book is never matched to another's chapter
    expect(ids(themeTier(topics, rows, new Set())).sort()).toEqual(['a:s:1', 'a:s:3', 'a:s:5']);
  });

  it('reads a text or a link that runs over chapters', () => {
    const topics = [topic('t', 'a', 10, { book: 'rom', chapter: 5, from: 12, to: 4, toChapter: 6 })];
    expect(ids(themeTier(topics, [row('s', '1', at(6, 2)), row('s', '2', at(6, 5)), row('s', '3', { book: 'rom', chapter: 4, from: 20, to: 2, toChapter: 5 })], new Set())).sort()).toEqual(['a:s:1']);
  });

  it('uses a topic of at most 300 verses: 300 is in, 301 is out', () => {
    const rows = [row('s', '1', at(1, 1))];
    expect(ids(themeTier([topic('t', 'wide', 301, at(1, 1))], rows, new Set()))).toEqual([]);
    expect(ids(themeTier([topic('t', 'edge', 300, at(1, 1))], rows, new Set()))).toEqual(['edge:s:1']);
    // a wide topic does not take a sermon a narrow one has, and does not hide it
    expect(ids(themeTier([topic('t', 'wide', 4051, at(1, 1)), topic('t', 'edge', 300, at(1, 1))], rows, new Set()))).toEqual(['edge:s:1']);
  });

  it('lists a sermon once, with its narrowest topic, then the theme source, then the topic', () => {
    const rows = [row('s', '1', at(1, 1))];
    const link = at(1, 1);
    expect(ids(themeTier([topic('t', 'big', 50, link), topic('t', 'small', 8, link), topic('t', 'mid', 20, link)], rows, new Set()))).toEqual(['small:s:1']);
    expect(ids(themeTier([topic('b', 'x', 8, link), topic('a', 'z', 8, link)], rows, new Set()))).toEqual(['z:s:1']);
    expect(ids(themeTier([topic('a', 'y', 8, link), topic('a', 'x', 8, link)], rows, new Set()))).toEqual(['x:s:1']);
    // the same sermon read under two books (a text over a book's end) is still one row
    const twice = [row('s', '9', at(1, 1)), row('s', '9', at(1, 1, 1, 'jon'))];
    expect(ids(themeTier([topic('t', 'm', 8, link, at(1, 1, 1, 'jon'))], twice, new Set()))).toEqual(['m:s:9']);
  });

  it('leaves out a sermon the passage groups already hold, and a cited reference', () => {
    const rows = [row('s', '1', at(1, 1)), row('s', '2', at(1, 1)), { ...row('s', '3', at(1, 1)), role: 'cited' as const }];
    expect(ids(themeTier([topic('t', 'a', 5, at(1, 1))], rows, new Set(['s:1']))).sort()).toEqual(['a:s:2']);
  });

  it('orders by the topic\'s size, then the sermon\'s source, then its id as a number', () => {
    const topics = [topic('t', 'wide', 90, at(1, 1)), topic('t', 'narrow', 6, at(1, 2))];
    const rows = [row('b', '2', at(1, 1)), row('a', '10', at(1, 1)), row('a', '9', at(1, 1)), row('b', '1', at(1, 2)), row('a', '3', at(1, 2))];
    expect(ids(themeTier(topics, rows, new Set()))).toEqual(['narrow:a:3', 'narrow:b:1', 'wide:a:9', 'wide:a:10', 'wide:b:2']);
  });

  it('groups the rows by topic and heads each group with the topic', () => {
    const found = themeTier([topic('t', 'wide', 90, at(1, 1)), topic('t', 'narrow', 6, at(1, 2))], [row('a', '1', at(1, 1)), row('a', '2', at(1, 2)), row('a', '3', at(1, 2))], new Set());
    expect(found.groups.map((g) => [g.topic, g.rows.map((r) => r.id)])).toEqual([
      [{ source: 't', id: 'narrow', label: 'NARROW', verses: 6 }, ['2', '3']],
      [{ source: 't', id: 'wide', label: 'WIDE', verses: 90 }, ['1']],
    ]);
  });

  it('keeps at most 12 rows in all and says how many more there were', () => {
    expect(THEME_ROW_LIMIT).toBe(12);
    const rows = Array.from({ length: 17 }, (_, i) => row('s', String(i + 1), at(1, 1)));
    const found = themeTier([topic('t', 'a', 5, at(1, 1))], rows, new Set());
    expect(found.groups.flatMap((g) => g.rows).map((r) => r.id)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
    expect(found.more).toBe(5);
    expect(themeTier([topic('t', 'a', 5, at(1, 1))], rows.slice(0, 12), new Set()).more).toBe(0);
    // the cut falls across topics: the narrower topic's rows come first and the 12 are counted over all the groups
    const two = themeTier([topic('t', 'a', 5, at(1, 1)), topic('t', 'b', 9, at(1, 2))], [...rows.slice(0, 8).map((r) => ({ ...r, ref: at(1, 2) })), ...rows.slice(8).map((r) => ({ ...r, ref: at(1, 1) }))], new Set());
    expect(two.groups.map((g) => [g.topic.id, g.rows.length])).toEqual([['a', 9], ['b', 3]]);
    expect(two.more).toBe(5);
  });

  it('is empty with no topic and with no sermon', () => {
    expect(themeTier([], [row('s', '1', at(1, 1))], new Set())).toEqual({ groups: [], more: 0 });
    expect(themeTier([topic('t', 'a', 5, at(1, 1))], [], new Set())).toEqual({ groups: [], more: 0 });
  });
});

describe('sameThemeFor: the sources that are on', () => {
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
  });
  afterEach(() => {
    forgetTestSermons();
    forgetTestThemes();
    vi.restoreAllMocks();
  });
  const place = { book: 'rom', chapter: 5, from: 8 };
  const names = (found: Awaited<ReturnType<typeof sameThemeFor>>): string[] => found.groups.flatMap((g) => [`On ${g.topic.label}`, ...g.rows.map((r) => r.title)]);

  it('finds the sermons of the topic\'s other books, narrowest topic first, and none the passage already lists', async () => {
    registerTestSermons();
    registerTestThemes();
    const here = await sermonsFor(place);
    expect(here.here.map((r) => r.id)).toEqual(['love', 'peace']);
    expect(names(await sameThemeFor(place, here))).toEqual(['On Love-Hatred', 'The Storm at Sea', 'On Atonement', 'Running from God']);
  });

  it('gives a sermon to the narrowest topic of all the sources that are on', async () => {
    registerTestSermons();
    registerTestThemes({ second: true });
    expect(names(await sameThemeFor(place, await sermonsFor(place)))).toEqual(['On Commendation', 'Running from God', 'On Love-Hatred', 'The Storm at Sea']);
  });

  it('uses the topics of a source only while its switch is On', async () => {
    registerTestSermons();
    registerTestThemes({ second: true });
    await db.settings.put({ key: 'themes.testthemes2', value: 'off' });
    expect(names(await sameThemeFor(place, await sermonsFor(place)))).toEqual(['On Love-Hatred', 'The Storm at Sea', 'On Atonement', 'Running from God']);
    await db.settings.put({ key: 'themes.testthemes', value: 'off' });
    expect(await sameThemeFor(place, await sermonsFor(place))).toEqual({ groups: [], more: 0 });
    registerTestThemes({ off: true });
    expect(await sameThemeFor(place, await sermonsFor(place))).toEqual({ groups: [], more: 0 });
  });

  it('has none for a whole chapter, a verse no topic touches, and sources that have no sermons', async () => {
    registerTestSermons();
    registerTestThemes();
    expect(await sameThemeFor({ book: 'rom', chapter: 5 }, { here: [], chapter: [] })).toEqual({ groups: [], more: 0 });
    expect(await sameThemeFor({ book: 'rom', chapter: 5, from: 40 }, { here: [], chapter: [] })).toEqual({ groups: [], more: 0 });
    registerTestSermons({ none: true });
    expect(await sameThemeFor(place, { here: [], chapter: [] })).toEqual({ groups: [], more: 0 });
  });

  it('logs a sermon source that fails and goes on with the rest', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    registerTestSermons();
    registerTestThemes();
    const { setSermonSources } = await import('../../src/sermons');
    const { testSource } = await import('../support/test-sermons');
    setSermonSources([{ ...testSource, id: 'broken', sermonsInBook: async () => Promise.reject(new Error('404')) }, testSource]);
    expect(names(await sameThemeFor(place, await sermonsFor(place))).length).toBe(4);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('broken'));
  });
});
