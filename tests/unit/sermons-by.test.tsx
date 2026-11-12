// A sermon with no preacher shows its source's `by` where the preacher would be (mw-qtu3zvz.89, docs/sermons.md 'When online'): a church's sermons, 'Brookfield First Assembly of God'. A known preacher always
// wins; a source with no `by` is drawn as before; the kept list takes an old shape (no `by`) and drops a `by` that is no string; the tutor's list never puts the `by` in a preacher field.
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { getKnownSermonSources, rememberSermonSources, type KnownSermonSource } from '../../src/data/repositories';
import { forgetServiceSources, setSermonSources } from '../../src/sermons';
import { talkSermonsFor } from '../../src/sermons/forTutor';
import { setKnownSermonSources } from '../../src/sermons/known';
import { closeSermons } from '../../src/sermons/openSermons';
import { SermonsSheet } from '../../src/sermons/SermonsSheet';
import { serviceSource } from '../../src/sermons/sources/service';
import { setSermonsUrl } from '../../src/services/sermons';
import { row, sourceOf } from '../support/sermon-sources';
import { forgetTestSermons } from '../support/test-sermons';

const BY = 'Brookfield First Assembly of God';
const BASE = 'https://sermons.test';

const KNOWN: KnownSermonSource = { id: 'brookfield', name: 'Brookfield First’s sermons', credit: 'Brookfield First Assembly of God', homepage: 'https://brookfieldfirst.example', onByDefault: true, by: BY };

/** The service answers the sources list with `sources` and no sermons. */
function serve(sources: unknown[]) {
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    const body = String(input).startsWith(`${BASE}/v1/sources`) ? { rows: sources } : { ref: 'Rom.5', total: 0, rows: [] };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  });
}

beforeEach(async () => {
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear()]);
  setKnownSermonSources([]);
  forgetServiceSources();
});
afterEach(() => {
  cleanup();
  closeSermons();
  forgetTestSermons();
  setSermonsUrl(undefined);
  forgetServiceSources();
  setKnownSermonSources([]);
  vi.unstubAllGlobals();
});

describe('the Sermons sheet', () => {
  const sheetWith = (by: string | undefined) => {
    setSermonSources([
      { ...sourceOf('brookfield', 'Brookfield First’s sermons', { rom: [row('brookfield', 'nopreacher', 'Love Shown', ['rom', 5, 8, 8], undefined, '2024-07-21'), row('brookfield', 'named', 'Peace Found', ['rom', 5, 1, 11], 'Pastor Named', '2024-07-14')] }), ...(by === undefined ? {} : { by }) },
    ]);
    render(<SermonsSheet place={{ book: 'rom', chapter: 5 }} onClose={() => undefined} />);
  };
  const metaOf = async (title: string) => {
    const sheet = await screen.findByRole('dialog', { name: 'Sermons for Romans 5' });
    const link = (await within(sheet).findByText(title)).closest('a')!;
    return link.querySelector('[data-sermon-meta]')!.textContent;
  };

  it('shows the source’s by where the sermon has no preacher', async () => {
    sheetWith(BY);
    expect(await metaOf('Love Shown')).toMatch(new RegExp(`^${BY} · 21 Jul 2024 · `));
  });

  it('shows the preacher, not the by, where the sermon has one', async () => {
    sheetWith(BY);
    const meta = await metaOf('Peace Found');
    expect(meta).toMatch(/^Pastor Named · 14 Jul 2024 · /);
    expect(meta).not.toContain(BY);
  });

  it('shows no name where the source has no by and the sermon no preacher (as today)', async () => {
    sheetWith(undefined);
    expect(await metaOf('Love Shown')).toMatch(/^21 Jul 2024 · /);
  });

  it('takes the by of a source only the service has, once its list is kept', async () => {
    setKnownSermonSources([KNOWN]);
    expect(serviceSource(KNOWN).by).toBe(BY);
    expect(serviceSource({ ...KNOWN, by: undefined }).by).toBeUndefined();
  });
});

describe('the kept list of the service’s sources', () => {
  it('keeps the by', async () => {
    await rememberSermonSources([KNOWN]);
    expect(await getKnownSermonSources()).toEqual([KNOWN]);
  });

  it('still accepts a list kept yesterday, with no by', async () => {
    const old: KnownSermonSource = { id: KNOWN.id, name: KNOWN.name, credit: KNOWN.credit, homepage: KNOWN.homepage, onByDefault: KNOWN.onByDefault };
    await db.meta.put({ key: 'sermonSources', value: JSON.stringify([old]) });
    expect(await getKnownSermonSources()).toEqual([old]);
  });

  it('drops a by that is not a string, and keeps the source and the rest of the list', async () => {
    const other: KnownSermonSource = { ...KNOWN, id: 'other' };
    await db.meta.put({ key: 'sermonSources', value: JSON.stringify([{ ...KNOWN, by: 42 }, { ...other, by: '' }, other]) });
    const list = await getKnownSermonSources();
    expect(list.map((k) => k.id)).toEqual(['brookfield', 'other', 'other']);
    expect(list[0]).not.toHaveProperty('by');
    expect(list[1]).not.toHaveProperty('by');
    expect(list[2].by).toBe(BY);
  });

  it('is told the by by the service’s list of sources', async () => {
    setSermonsUrl(BASE);
    serve([{ id: 'brookfield', name: 'Brookfield', kind: 'sermons', licence: 'x', credit: 'c', homepage: 'https://b.example', on_by_default: true, rows: 3, by: BY }]);
    const { latestFor } = await import('../../src/sermons');
    await latestFor({ book: 'rom', chapter: 5 }, { here: [], chapter: [] }).catch(() => undefined);
    expect((await getKnownSermonSources())[0]?.by).toBe(BY);
  });
});

describe('the tutor’s sermon list', () => {
  it('does not put the by in the preacher field', async () => {
    setSermonSources([
      { ...sourceOf('brookfield', 'Brookfield First’s sermons', { rom: [row('brookfield', 'nopreacher', 'Love Shown', ['rom', 5, 8, 8], undefined, '2024-07-21')] }), by: BY },
    ]);
    const told = await talkSermonsFor({ book: 'rom', chapter: 5 });
    expect(told?.rows).toHaveLength(1);
    expect(told?.told.rows[0]).not.toHaveProperty('preacher');
    expect(JSON.stringify(told?.told)).not.toContain(BY);
  });
});
