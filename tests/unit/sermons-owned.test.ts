// A Logos resource is offered only if his Library import says he owns it, or Logos gives it free (mw-qtu3zvz.94, src/library/owned.ts): the Sermons door, the Settings > Sermons rows and the In Logos archives.
// The import is the kept list (db.exportRows); no import means only a free resource passes.
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { ownedResources } from '../../src/data/repositories';
import { inLogosRows } from '../../src/library/inLogos';
import { addressOffered, FREE_LOGOS, isOffered, logosResourceOf } from '../../src/library/owned';
import { entriesOf } from '../../src/resources/catalogue';
import { enabledSources, sermonsFor } from '../../src/sermons';
import { enabledSources as enabledOf, ownsKey, sourceOffered } from '../../src/sermons/enabled';
import { bundledSources, forgetSermonFiles, LOGOS_RESOURCES } from '../../src/sermons/sources/bundled';
import { logosArchives } from '../../src/sermons/sources/logos';
import { sermonSourceSetting } from '../../src/settings/definitions/sermons';
import { readValues, visibleRows } from '../../src/settings/rows';
import type { SermonIndex, SermonBookFile } from '../../src/data/sermonIndex';

const index = JSON.parse(readFileSync('public/sermons/index.json', 'utf8')) as SermonIndex;
const GREG = 'LLS:GRGLRSRMNRCH';
const GREEAR = 'LLS:JDGRRSRMNRCHV';

/** The kept import list with these Resource IDs. */
const importOf = (...resources: string[]) =>
  db.exportRows.bulkPut(resources.map((resource) => ({ resource, type: 'text.monograph.sermons', title: resource, series: '', languages: 'en', refs: '', matched: true })));

beforeEach(async () => {
  await db.open();
  await Promise.all([db.exportRows.clear(), db.settings.clear(), db.library.clear(), db.meta.clear()]);
  forgetSermonFiles();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => new Response(readFileSync(`public${String(input).replace(/\?v=[0-9a-f]{12}$/, '')}`, 'utf8'), { status: 200 })));
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => db.close());

describe('the rule', () => {
  it('offers a resource his import holds and one on the free list, and no other', () => {
    expect(isOffered(GREG, new Set([GREG]))).toBe(true);
    expect(isOffered(GREG, new Set([GREEAR]))).toBe(false);
    expect(isOffered(GREG, new Set())).toBe(false);
    for (const free of FREE_LOGOS) expect(isOffered(free.resource, new Set())).toBe(true);
  });

  it('keeps each free resource with the address of the page that says it is free', () => {
    for (const free of FREE_LOGOS) {
      expect(free.resource).toMatch(/^[A-Z]+:/);
      expect(free.source).toMatch(/^https:\/\//);
    }
  });

  it('reads the resource an address opens, and lets any other address through', () => {
    expect(logosResourceOf('https://ref.ly/logosres/LLS:GRGLRSRMNRCH?art=YEAR.2002.74')).toBe(GREG);
    expect(logosResourceOf('logosres:LLS:36.0.11;ref=Bible.Ro5.8')).toBe('LLS:36.0.11');
    expect(logosResourceOf('https://ccel.org/ccel/spurgeon/sermons1')).toBeUndefined();
    expect(addressOffered('https://ccel.org/x', new Set())).toBe(true);
    expect(addressOffered('https://ref.ly/logosres/LLS:GRGLRSRMNRCH?art=1', new Set())).toBe(false);
    expect(addressOffered('https://ref.ly/logosres/LLS:GRGLRSRMNRCH?art=1', new Set([GREG]))).toBe(true);
  });

  it('is empty with no import: ownedResources reads the kept list', async () => {
    expect([...(await ownedResources())]).toEqual([]);
    await importOf(GREG);
    expect([...(await ownedResources())]).toEqual([GREG]);
  });
});

describe('the bundled Logos sources', () => {
  it('name the Logos resources their rows open in (the table equals the book files)', () => {
    for (const source of index.sources.filter((s) => s.id.endsWith('-logos'))) {
      const seen = new Set<string>();
      for (const book of source.books) {
        const file = JSON.parse(readFileSync(`public/sermons/${source.id}/${book}.json`, 'utf8')) as SermonBookFile;
        for (const row of file.rows) seen.add(logosResourceOf(row.url)!);
      }
      expect([...seen].every((id) => LOGOS_RESOURCES[source.id].includes(id)), source.id).toBe(true);
    }
    expect(bundledSources().filter((s) => s.resources).map((s) => s.id)).toEqual(Object.keys(LOGOS_RESOURCES));
    expect(bundledSources().find((s) => s.id === 'spurgeon-ccel')!.resources).toBeUndefined();
  });

  it('are not offered while his import lacks them, but the free sources are', () => {
    const all = bundledSources();
    const on = (key: string) => (key.startsWith('sermons.') ? 'on' : undefined);
    expect(enabledOf(all, on, new Set()).map((s) => s.id)).toEqual(['spurgeon-ccel', 'henry-sermons']);
    expect(enabledOf(all, on, new Set([GREG])).map((s) => s.id)).toEqual(['spurgeon-ccel', 'henry-sermons', 'greg-laurie-logos']);
    expect(sourceOffered(all.find((s) => s.id === 'greg-laurie-logos')!, new Set([GREG]))).toBe(true);
  });

  it('list only the rows of the resources he owns when a source has several', async () => {
    const notes = bundledSources().find((s) => s.id === 'spurgeon-sermon-notes-logos')!;
    const [only] = enabledOf([notes], () => 'on', new Set(['LLS:MYSRMNOTES01']));
    const rows = await only.sermonsFor({ book: 'gen', chapter: 19 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => logosResourceOf(r.open.url) === 'LLS:MYSRMNOTES01')).toBe(true);
    const all = await notes.sermonsFor({ book: 'mat', chapter: 4 });
    const [onlyOne] = enabledOf([notes], () => 'on', new Set(['LLS:MYSRMNOTES01']));
    expect(all.length).toBeGreaterThan(0);
    expect(await onlyOne.sermonsFor({ book: 'mat', chapter: 4 })).toEqual([]);
  });
});

describe('the Sermons door', () => {
  const putOn = () => db.settings.bulkPut(['greg-laurie-logos', 'jd-greear-logos'].map((id) => ({ key: `sermons.${id}`, value: 'on' })));

  it('draws on no Logos source his import lacks, whatever its switch says', async () => {
    await putOn();
    expect((await enabledSources()).map((s) => s.id)).not.toContain('greg-laurie-logos');
    const found = await sermonsFor({ book: 'gen', chapter: 1 });
    expect([...found.here, ...found.chapter].filter((r) => r.opensIn === 'logos')).toEqual([]);
  });

  it('draws on the Logos source his import holds, and not the one it lacks', async () => {
    await putOn();
    await importOf(GREG);
    expect((await enabledSources()).map((s) => s.id)).toEqual(expect.arrayContaining(['greg-laurie-logos']));
    expect((await enabledSources()).map((s) => s.id)).not.toContain('jd-greear-logos');
    const found = await sermonsFor({ book: 'gen', chapter: 1 });
    const logos = [...found.here, ...found.chapter].filter((r) => r.opensIn === 'logos');
    expect(logos.length).toBeGreaterThan(0);
    expect(logos.every((r) => r.source === 'greg-laurie-logos')).toBe(true);
  });
});

describe('Settings > Study resources > Sermons', () => {
  const rowKeys = async () => visibleRows(await readValues(), '').filter((r) => r.section === 'sermons').map((r) => r.key);

  it('offers a Logos source only when his import holds it', async () => {
    expect(await rowKeys()).not.toContain('sermons.greg-laurie-logos');
    expect(await rowKeys()).toContain('sermons.spurgeon-ccel');
    await importOf(GREG);
    expect(await rowKeys()).toContain('sermons.greg-laurie-logos');
    expect(await rowKeys()).not.toContain('sermons.jd-greear-logos');
  });

  it('draws a Logos source as depending on the import, and a source with no Logos resource as depending on nothing', () => {
    const greg = bundledSources().find((s) => s.id === 'greg-laurie-logos')!;
    expect(sermonSourceSetting(greg).dependsOn?.key).toBe(ownsKey(greg));
    expect(sermonSourceSetting(bundledSources().find((s) => s.id === 'spurgeon-ccel')!).dependsOn).toBeUndefined();
  });
});

describe('In Logos archives', () => {
  const states = new Map([[GREG, 'on' as const], [GREEAR, 'pinned' as const]]);
  const place = { book: 'rom', chapter: 5, from: 8 };

  it('list an archive on his shelf only when his import holds it', () => {
    expect(logosArchives(place, states, undefined, new Set()).map((a) => a.id)).toEqual([]);
    expect(logosArchives(place, states, undefined, new Set([GREG])).map((a) => a.id)).toEqual([GREG]);
  });

  it('are filtered in the chooser too, for the sermon kind', () => {
    const entries = entriesOf('sermons');
    const rows = (owned: Set<string>) => inLogosRows(entries, states, { book: 'rom', chapter: 5, verse: 8 }, undefined, owned).map((r) => r.entry.resource);
    expect(rows(new Set())).toEqual([]);
    expect(rows(new Set([GREEAR]))).toEqual([GREEAR]);
  });
});
