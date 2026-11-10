// A sermon linked from its notes shows under 'On the same theme' (mw-qtu3zvz.59.2, docs/sermons.md 'On the same theme' and 'When online'). The sermon index service's theme tier marks a sermon its source linked to a topic directly
// (`direct: true`); Lampas takes those rows only, for the topics the phone's Themes line holds and the sources that are On, and sorts them first. The service is stubbed with the Example of the sermon-index repository's
// docs/api.md 'Direct links' (tests/fixtures/sermons/api-direct-theme.json); the bundled sermons and the themes are the tests' own.
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { rememberSermonSources } from '../../src/data/repositories';
import { directThemeRows, sameThemeFor, sermonsFor } from '../../src/sermons';
import { setKnownSermonSources } from '../../src/sermons/known';
import { SameThemeGroups } from '../../src/sermons/SermonsSheet';
import type { SameTheme, ThemeRow } from '../../src/sermons/types';
import { setSermonsUrl, type ServiceThemeSermon } from '../../src/services/sermons';
import { setThemeSources } from '../../src/themes';
import type { Link, ThemeSource, Topic } from '../../src/themes/types';
import direct from '../fixtures/sermons/api-direct-theme.json';
import { row as sermonRow, sourceOf } from '../support/sermon-sources';
import { forgetTestSermons, registerTestSermons } from '../support/test-sermons';

const BASE = 'https://sermons.test';
const ANSWER = direct['GET /v1/sermons?ref=eph.2.8&tier=theme-only'];
const FIXTURE_ROWS = ANSWER.theme.rows as unknown as ServiceThemeSermon[];

/** The phone's own theme source: Grace (8 verses) links Ephesians 2:8 and Romans 5:15-21, as the fixture's demo topic does, and a wide topic that links the verse too. */
const topic = (id: string, label: string, verses: number): Topic => ({ id, label, parts: [], verses, books: ['eph', 'rom'] });
const link = (id: string, book: string, chapter: number, from: number, to: number): Link => ({ topic: id, ref: { book, chapter, from, to } });
const themes: ThemeSource = {
  id: 'themes-demo',
  name: 'Demo themes',
  homepage: 'https://themes.test',
  credit: 'Demo themes of the tests',
  describe: 'Demo',
  default: 'on',
  book: async (book) =>
    book === 'eph'
      ? { topics: [topic('grace', 'Grace', 8), topic('faith', 'Faith', 400)], links: [link('grace', 'eph', 2, 8, 8), link('faith', 'eph', 2, 8, 9)] }
      : { topics: [topic('grace', 'Grace', 8)], links: [link('grace', 'rom', 5, 15, 21)] },
};

const place = { book: 'eph', chapter: 2, from: 8 };
let asked: URL[];
/** The service answers with `rows` (the fixture's by default), as an old service would: it ignores `direct`. */
const serve = (rows: readonly unknown[] = FIXTURE_ROWS) =>
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    asked.push(new URL(String(input)));
    return Promise.resolve(new Response(JSON.stringify({ ...ANSWER, theme: { total: rows.length, rows } }), { status: 200 }));
  });

beforeEach(async () => {
  asked = [];
  await db.open();
  await db.settings.clear();
  await db.meta.clear();
  setSermonsUrl(BASE);
  setThemeSources([themes]);
  // the bundled source has a Romans 5 sermon on Grace's link, which the phone reaches through its text
  registerTestSermons();
  const { setSermonSources } = await import('../../src/sermons');
  setSermonSources([sourceOf('testsermons', 'Test Sermons', { rom: [sermonRow('testsermons', 'grace', 'Grace Abounds', ['rom', 5, 17, 17], 'Test Preacher')] })]);
  await rememberSermonSources([{ id: 'spurgeon-20', name: 'C. H. Spurgeon', credit: 'C. H. Spurgeon; CCEL', homepage: 'https://ccel.org/ccel/spurgeon', onByDefault: true }]);
  setKnownSermonSources([]);
  serve();
});
afterEach(() => {
  setSermonsUrl(undefined);
  setThemeSources(undefined);
  forgetTestSermons();
  setKnownSermonSources([]);
  vi.unstubAllGlobals();
});

const names = (same: SameTheme<ThemeRow>): string[] => same.groups.flatMap((g) => [`On ${g.topic.label}`, ...g.rows.map((r) => `${r.title}${r.notes ? ' (notes)' : ''}`)]);

describe('a sermon linked from its notes, on the same theme', () => {
  it('lists a sermon whose preaching text is in another book on the theme of a verse its topic links, first in its topic', async () => {
    const found = await sermonsFor(place);
    expect(names(await sameThemeFor(place, found))).toEqual(['On Grace', 'Grace Abounds']);
    const rows = await directThemeRows(place);
    const same = await sameThemeFor(place, found, rows);
    expect(names(same)).toEqual(['On Grace', 'The Peculiar Sleep of the Beloved (notes)', 'Grace Abounds']);
    const sleep = same.groups[0].rows[0];
    expect(sleep).toMatchObject({ source: 'spurgeon-20', id: '12', ref: { book: 'psa', chapter: 127, from: 2, to: 2 }, notes: true, opensIn: 'web' });
    // the topic's size is the phone's own
    expect(same.groups[0].topic).toEqual({ source: 'themes-demo', id: 'grace', label: 'Grace', verses: 8 });
  });

  it('takes the rows marked direct only: a row reached through its text is dropped', async () => {
    const rows = await directThemeRows(place);
    expect(rows.map((r) => r.row.id)).toEqual(['12']);
  });

  it('adds no row of a sermon the passage groups already list, nor of a source that is Off, and lists a sermon once', async () => {
    const mark = (id: string, source: string, extra: Record<string, unknown> = {}) => ({ ...FIXTURE_ROWS[0], id, source, direct: true, ...extra });
    serve([mark('12', 'spurgeon-20'), mark('12', 'spurgeon-20'), mark('13', 'other-off'), mark('14', 'spurgeon-20')]);
    const rows = await directThemeRows(place);
    expect(rows.map((r) => `${r.row.source}:${r.row.id}`)).toEqual(['spurgeon-20:12', 'spurgeon-20:14']);
    // 14 is one the passage groups list
    const same = await sameThemeFor(place, { here: [{ ...sermonRow('spurgeon-20', '14', 'Listed', ['eph', 2, 8, 8]) }], chapter: [] }, rows);
    expect(same.groups.flatMap((g) => g.rows.map((r) => r.id))).toEqual(['12', 'grace']);
    // a source that is Off in Settings is not asked for, and its row is not taken
    await db.settings.put({ key: 'sermons.spurgeon-20', value: 'off' });
    expect((await directThemeRows(place)).map((r) => r.row.id)).toEqual([]);
  });

  it('adds no row over a topic the phone\'s Themes line does not hold, and keeps one whose topic is wide', async () => {
    const mark = (id: string, topicId: string) => ({ ...FIXTURE_ROWS[0], id, direct: true, theme: { ...FIXTURE_ROWS[0].theme, topic: topicId } });
    serve([mark('1', 'mercy'), mark('2', 'faith'), mark('3', 'grace')]);
    const rows = await directThemeRows(place);
    // 'mercy' is no topic the verse has; 'faith' is held though it is 400 verses wide (the service applies no cap to a direct link)
    expect(rows.map((r) => `${r.topic.id}:${r.row.id}`)).toEqual(['faith:2', 'grace:3']);
    expect(rows.map((r) => r.topic.verses)).toEqual([400, 8]);
    const same = await sameThemeFor(place, { here: [], chapter: [] }, rows);
    expect(same.groups.map((g) => g.topic.id)).toEqual(['grace', 'faith']);
  });

  it('gives a row with no preaching text no ref, and one the phone cannot read the same', async () => {
    const mark = (id: string, ref: string | null) => ({ ...FIXTURE_ROWS[0], id, direct: true, ref, role: ref === null ? null : 'text', width: ref === null ? null : 1 });
    serve([mark('1', null), mark('2', 'Tob.1.1'), mark('3', 'Rom.5.12-Rom.6.4')]);
    const rows = await directThemeRows(place);
    expect(rows.map((r) => r.row.ref)).toEqual([undefined, undefined, { book: 'rom', chapter: 5, from: 12, to: 4, toChapter: 6 }]);
  });

  it('refuses an address that is not https', async () => {
    serve([{ ...FIXTURE_ROWS[0], direct: true, url: 'javascript:alert(1)' }]);
    expect(await directThemeRows(place)).toEqual([]);
  });
});

describe('nothing changes without direct links', () => {
  it('is today\'s answer, deep-equal, with an answer holding no direct row, no address, a failing call, and no direct rows given', async () => {
    const found = await sermonsFor(place);
    const today = await sameThemeFor(place, found);
    serve(FIXTURE_ROWS.slice(1));
    expect(await sameThemeFor(place, found, await directThemeRows(place))).toEqual(today);
    setSermonsUrl('');
    expect(await directThemeRows(place)).toEqual([]);
    setSermonsUrl(BASE);
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    await expect(directThemeRows(place)).rejects.toThrow();
    expect(await sameThemeFor(place, found, [])).toEqual(today);
  });
});

describe('the line a row says why it is there', () => {
  const same: SameTheme<ThemeRow> = {
    more: 0,
    groups: [
      {
        topic: { source: 'themes-demo', id: 'grace', label: 'Grace', verses: 8 },
        rows: [
          { id: '1', source: 'spurgeon-20', title: 'With a text', preacher: 'C. H. Spurgeon', open: { url: 'https://x.test/1' }, opensIn: 'web', notes: true, ref: { book: '2pe', chapter: 3, from: 10, to: 18 } },
          { id: '2', source: 'spurgeon-20', title: 'With none', open: { url: 'https://x.test/2' }, opensIn: 'web', notes: true },
          { id: '3', source: 'testsermons', title: 'By its text', open: { url: 'https://x.test/3' }, opensIn: 'web', ref: { book: 'rom', chapter: 5, from: 1, to: 1 }, role: 'text' },
        ],
      },
    ],
  };

  it('reads "From the sermon notes · preached on <text>", or "From the sermon notes" alone, and a row reached through its text has none', () => {
    render(<SameThemeGroups same={same} online />);
    const rows = [...document.querySelectorAll('a[data-sermon-row]')];
    const why = (el: Element) => el.querySelector('[data-sermon-why]')?.textContent;
    expect(why(rows[0])).toBe('From the sermon notes · preached on 2 Peter 3:10-18');
    expect(why(rows[1])).toBe('From the sermon notes');
    expect(why(rows[2])).toBeUndefined();
    // the usual line is as ever, and the new one is under it
    expect(within(rows[0] as HTMLElement).getByText('C. H. Spurgeon · Opens on the web')).toBeInTheDocument();
    expect(screen.getAllByText(/From the sermon notes/)).toHaveLength(2);
  });
});
