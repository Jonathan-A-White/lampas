// The Themes line offers a theme only when a sermon of a source he has On is on it (mw-qtu3zvz.81, docs/sermons.md 'The Themes line'): sermonsOnTheme lists a topic's sermons from the bundled index, and online
// asks the service with `source=` his On list. A sermon of a source that is Off is never listed; no ranking, the index's order. The sources and themes are the tests' own.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { setSermonSources, sermonsOnTheme } from '../../src/sermons';
import { setKnownSermonSources } from '../../src/sermons/known';
import { setSermonsUrl } from '../../src/services/sermons';
import { setThemeSources } from '../../src/themes';
import type { Theme } from '../../src/themes/types';
import { row, sourceOf } from '../support/sermon-sources';
import { forgetTestSermons } from '../support/test-sermons';
import { testThemes } from '../support/test-themes';

const BASE = 'https://sermons.test';
/** The Love-Hatred topic as the Themes line holds it for Romans 5:8: it links Romans 5:6-8 and Jonah 1:4-10. */
const LOVE: Pick<Theme, 'source' | 'topic' | 'books'> = { source: 'testthemes', topic: 'love-hatred', books: ['rom', 'jon'] };
const GOD: Pick<Theme, 'source' | 'topic' | 'books'> = { source: 'testthemes', topic: 'god' };

const on = sourceOf('on-source', 'On source', { rom: [row('on-source', 'a', 'Love Shown', ['rom', 5, 8, 8])], jon: [row('on-source', 'b', 'The Storm', ['jon', 1, 4, 10])] });
const off = sourceOf('off-source', 'Off source', { rom: [row('off-source', 'c', 'An Off Sermon', ['rom', 5, 6, 6])] }, 'off');

let asked: URL[];
const serve = (rows: unknown[]) =>
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    asked.push(new URL(String(input)));
    return Promise.resolve(new Response(JSON.stringify({ theme: { total: rows.length, rows } }), { status: 200 }));
  });
const sermon = (id: string, source: string, url = `https://sermons.test/${source}/${id}`) => ({ id, source, title: `Service ${id}`, url, ref: 'Rom.5.8', role: 'text', width: 0, preacher: null, date: null, alt_url: null, theme: { source: 'testthemes', topic: 'love-hatred', label: 'Love-Hatred', part: 4, part_label: 'Of God' } });
const ids = (rows: { source: string; id: string }[]): string[] => rows.map((r) => `${r.source}:${r.id}`);

beforeEach(async () => {
  asked = [];
  await db.open();
  await db.settings.clear();
  await db.meta.clear();
  setThemeSources([testThemes]);
  setSermonSources([on, off]);
  setKnownSermonSources([]);
  setSermonsUrl(undefined);
});
afterEach(() => {
  setSermonsUrl(undefined);
  setThemeSources(undefined);
  forgetTestSermons();
  setKnownSermonSources([]);
  vi.unstubAllGlobals();
});

describe('the sermons a theme lists', () => {
  it('are those of the sources that are On, in the index\'s order (book by book, verse order), a sermon once', async () => {
    expect(ids(await sermonsOnTheme(LOVE, false))).toEqual(['on-source:a', 'on-source:b']);
  });

  it('leave out a source that is Off, and the theme has none when only an Off source has its sermons; turned On, it has them', async () => {
    setSermonSources([off]);
    expect(await sermonsOnTheme(LOVE, false)).toEqual([]);
    await db.settings.put({ key: 'sermons.off-source', value: 'on' });
    expect(ids(await sermonsOnTheme(LOVE, false))).toEqual(['off-source:c']);
  });

  it('are none for a topic the join does not use (over the cap)', async () => {
    expect(await sermonsOnTheme(GOD, false)).toEqual([]);
  });

  it('online ask the service with the sources that are On, and add its sermons after the bundled ones', async () => {
    setSermonsUrl(BASE);
    serve([sermon('a', 'on-source'), sermon('z', 'on-source'), sermon('c', 'off-source')]);
    const rows = await sermonsOnTheme(LOVE, true);
    // a sermon of a source that is Off is dropped even if the service gave it
    expect(ids(rows)).toEqual(['on-source:a', 'on-source:b', 'on-source:z']);
    expect(asked).toHaveLength(1);
    expect(asked[0].searchParams.get('source')).toBe('on-source');
    expect(asked[0].searchParams.get('tier')).toBe('theme-only');
    expect(asked[0].searchParams.get('theme')).toBe('testthemes:love-hatred');
  });

  it('online with the service failing keep the bundled ones, and a row with no https address is left out', async () => {
    setSermonsUrl(BASE);
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('no', { status: 500 })));
    expect(ids(await sermonsOnTheme(LOVE, true))).toEqual(['on-source:a', 'on-source:b']);
    serve([sermon('q', 'on-source', 'javascript:alert(1)')]);
    expect(ids(await sermonsOnTheme(LOVE, true))).toEqual(['on-source:a', 'on-source:b']);
  });

  it('online with no source On ask nothing', async () => {
    setSermonSources([off]);
    setSermonsUrl(BASE);
    serve([sermon('c', 'off-source')]);
    expect(await sermonsOnTheme(LOVE, true)).toEqual([]);
    expect(asked).toHaveLength(0);
  });
});
