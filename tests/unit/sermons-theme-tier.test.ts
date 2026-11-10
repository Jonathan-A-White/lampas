// 'On the same theme' (mw-qtu3zvz.4, docs/sermons.md): the sermon-index service's theme tier as the sheet applies it. themeTier is the pure rule: the cap, the dedupe, the order and the cut at 12, over topics and
// sermons held in the test; sameThemeFor reads the sources that are on (tests/support/test-themes.ts, test-sermons.ts) and leaves out what the passage's own groups hold.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { sameThemeFor, sermonsFor } from '../../src/sermons';
import { THEME_ROW_LIMIT, themeTier, type TopicLinks } from '../../src/sermons/sermonsFor';
import type { DirectRow, SameTheme, SermonRef, SermonRow, ThemeRow } from '../../src/sermons/types';
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

// Directly linked sermons (mw-qtu3zvz.59.2, PROVISIONAL, the Governor to confirm): a sermon the service marks as linked from its notes to a topic comes in with `direct` rows. A topic holding one sorts before every topic
// holding none, its direct rows come first within it, they count toward the 12, and a heading is never drawn twice.
describe('themeTier: directly linked sermons', () => {
  const note = (source: string, id: string, ref?: SermonRef): ThemeRow => ({ id, source, title: `Sermon ${id}`, ...(ref ? { ref } : {}), open: { url: `https://x.test/${source}/${id}` }, opensIn: 'web', notes: true });
  const of = (t: TopicLinks, ...rows: ThemeRow[]): DirectRow[] => rows.map((r) => ({ row: r, topic: { source: t.source, id: t.id, label: t.label, verses: t.verses } }));
  const shown = (found: SameTheme<ThemeRow>): string[] => found.groups.flatMap((g) => g.rows.map((r) => `${g.topic.id}:${r.source}:${r.id}${r.notes ? '*' : ''}`));

  it('puts a topic holding a direct row before every topic without one, narrow or not', () => {
    const narrow = topic('t', 'narrow', 6, at(1, 2));
    const wide = topic('t', 'wide', 200, at(1, 1));
    const rows = [row('a', '1', at(1, 2)), row('a', '2', at(1, 1))];
    expect(shown(themeTier([narrow, wide], rows, new Set(), THEME_ROW_LIMIT, of(wide, note('d', '9'))))).toEqual(['wide:d:9*', 'wide:a:2', 'narrow:a:1']);
    // without it, today's order: the narrow topic first
    expect(shown(themeTier([narrow, wide], rows, new Set()))).toEqual(['narrow:a:1', 'wide:a:2']);
  });

  it('lists the direct rows of a topic first, then the rows reached through the text, and draws the heading once', () => {
    const a = topic('t', 'a', 8, at(1, 1));
    const found = themeTier([a], [row('a', '1', at(1, 1)), row('a', '2', at(1, 1))], new Set(), THEME_ROW_LIMIT, of(a, note('z', '20'), note('b', '3'), note('b', '10')));
    expect(shown(found)).toEqual(['a:b:3*', 'a:b:10*', 'a:z:20*', 'a:a:1', 'a:a:2']);
    expect(found.groups).toHaveLength(1);
  });

  it('orders two topics that hold direct rows by the narrower first, and the ones with none after both', () => {
    const wide = topic('t', 'wide', 90, at(1, 1));
    const mid = topic('t', 'mid', 40, at(1, 1));
    const none = topic('t', 'none', 3, at(1, 1));
    const found = themeTier([wide, mid, none], [row('a', '1', at(1, 1))], new Set(), THEME_ROW_LIMIT, [...of(wide, note('d', '1')), ...of(mid, note('d', '2'))]);
    expect(found.groups.map((g) => g.topic.id)).toEqual(['mid', 'wide', 'none']);
  });

  it('lists a sermon once: as a direct row when the text reaches it too, and never one the passage groups hold', () => {
    const a = topic('t', 'a', 8, at(1, 1));
    const found = themeTier([a], [row('s', '1', at(1, 1)), row('s', '2', at(1, 1))], new Set(['s:3']), THEME_ROW_LIMIT, of(a, note('s', '1'), note('s', '3'), note('s', '1')));
    expect(shown(found)).toEqual(['a:s:1*', 'a:s:2']);
  });

  it('keeps a sermon linked to two topics with the narrower', () => {
    const wide = topic('t', 'wide', 90, at(1, 1));
    const narrow = topic('t', 'narrow', 6, at(1, 1));
    expect(shown(themeTier([wide, narrow], [], new Set(), THEME_ROW_LIMIT, [...of(wide, note('s', '1')), ...of(narrow, note('s', '1'))]))).toEqual(['narrow:s:1*']);
  });

  it('takes a direct row of a topic over 300 verses: the cap is the service\'s, not the phone\'s', () => {
    const big = topic('t', 'big', 4051, at(1, 1));
    expect(shown(themeTier([big], [row('s', '1', at(1, 1))], new Set(), THEME_ROW_LIMIT, of(big, note('d', '1'))))).toEqual(['big:d:1*']);
  });

  it('counts direct rows toward the 12 and says how many more there were', () => {
    const a = topic('t', 'a', 8, at(1, 1));
    const direct = of(a, ...Array.from({ length: 5 }, (_, i) => note('d', String(i + 1))));
    const rows = Array.from({ length: 10 }, (_, i) => row('s', String(i + 1), at(1, 1)));
    const found = themeTier([a], rows, new Set(), THEME_ROW_LIMIT, direct);
    expect(found.groups.flatMap((g) => g.rows)).toHaveLength(12);
    expect(shown(found).slice(0, 5)).toEqual(['a:d:1*', 'a:d:2*', 'a:d:3*', 'a:d:4*', 'a:d:5*']);
    expect(found.more).toBe(3);
    // the cut falls inside the direct rows when there are more than 12 of them
    const many = themeTier([a], rows, new Set(), THEME_ROW_LIMIT, of(a, ...Array.from({ length: 14 }, (_, i) => note('d', String(i + 1)))));
    expect(many.groups.flatMap((g) => g.rows).every((r) => r.notes)).toBe(true);
    expect(many.more).toBe(12);
  });

  it('is today\'s answer, deep-equal, with no direct row', () => {
    const topics = [topic('t', 'wide', 90, at(1, 1)), topic('t', 'narrow', 6, at(1, 2))];
    const rows = [row('b', '2', at(1, 1)), row('a', '10', at(1, 1)), row('a', '9', at(1, 1)), row('b', '1', at(1, 2)), row('a', '3', at(1, 2))];
    expect(themeTier(topics, rows, new Set(), THEME_ROW_LIMIT, [])).toEqual(themeTier(topics, rows, new Set()));
  });
});
