// The bundled lifebible-ttb source (Life Bible Ministry's Through the Bible, mw-qtu3zvz.280.3): its setting is an On | Off switch and Off takes its rows off the Sermons sheet's list.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { SOURCES, sermonsFor } from '../../src/sermons';
import { forgetSermonFiles } from '../../src/sermons/sources/bundled';
import { videoOfRow } from '../../src/sermons/player';
import { settingOf } from '../support/settings';

const ID = 'lifebible-ttb';
const place = { book: 'isa', chapter: 2 };

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  forgetSermonFiles();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input).replace(/\?v=[0-9a-f]{12}$/, '');
      try {
        return new Response(readFileSync(`public${path}`, 'utf8'), { status: 200 });
      } catch {
        return new Response('not found', { status: 404 });
      }
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const lifebible = async () => [...(await sermonsFor(place)).here, ...(await sermonsFor(place)).chapter].filter((r) => r.source === ID);

describe('the lifebible-ttb source', () => {
  it('is bundled, named for Life Bible Ministry, with a link home to its Through the Bible page', () => {
    const source = SOURCES.find((s) => s.id === ID);
    expect(source?.name).toMatch(/Life Bible Ministry/);
    expect(source?.credit).toMatch(/Pastor Paul LeBoutillier/);
    expect(source?.homepage).toBe('https://www.lifebibleministry.com/through-the-bible');
  });

  it('has the setting sermons.lifebible-ttb, On | Off', () => {
    const entry = settingOf(`sermons.${ID}`);
    expect(entry?.allowed).toEqual({
      kind: 'choice',
      values: [
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
      ],
    });
  });

  it('gives the Sermons sheet its Isaiah 1-4:1 row while On, with the page as its link back, and none once Off', async () => {
    await db.settings.put({ key: `sermons.${ID}`, value: 'on' });
    const rows = await lifebible();
    expect(rows.map((r) => r.id)).toContain('isaiah.1');
    const row = rows.find((r) => r.id === 'isaiah.1')!;
    expect(row.open.url).toBe('https://www.lifebibleministry.com/through-the-bible/isaiah/1');
    expect(row.preacher).toBe('Pastor Paul LeBoutillier');
    expect(videoOfRow(row)).toBeUndefined(); // the row opens its page; the YouTube address is the row's alt
    expect(row.alt).toBe('https://www.youtube.com/watch?v=ynUYAm1-W6k');

    await db.settings.put({ key: `sermons.${ID}`, value: 'off' });
    expect(await lifebible()).toEqual([]);
  });
});
