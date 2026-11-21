// Every place that offers a Logos resource asks the one owned-check (mw-qtu3zvz.126, src/data/owned.ts isOffered / addressOffered): the kinds of "In another book…", the Library screen's list and count, the sermon
// search hits and a theme's sermons, and the Study resources rows (lexicons, grammar books, works, devotionals). A Logos book his import lacks is offered in none of them; one it holds is offered in all.
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { DEVOTIONALS } from '../../src/data/daily/devotionals';
import { lexiconPins } from '../../src/data/repositories/library';
import { devotionalDraw, grammarBookTicks, lexiconTicks, setDevotionalDraw, setGrammarBooks, setResourceOption, setState, setWorks, workTicks } from '../../src/data/repositories';
import { inLogosRows } from '../../src/library/inLogos';
import { LibraryScreen } from '../../src/library/LibraryScreen';
import { CATALOGUE, entriesOf, type CatalogueEntry, type Kind } from '../../src/resources/catalogue';
import { GRAMMAR_BOOKS } from '../../src/resources/grammarBooks';
import { LEXICONS } from '../../src/resources/logos';
import { WORKS } from '../../src/resources/works';
import { setSermonsUrl } from '../../src/services/sermons';
import { setSermonSources } from '../../src/sermons';
import { useServiceSearch, useThemeSermons } from '../../src/sermons/useSermons';
import { sourceOf } from '../support/sermon-sources';
import { keepImport } from '../support/logos-import';

const EVERY = CATALOGUE.map((e) => e.resource);
const ROMANS = { book: 'rom', chapter: 8, verse: 1 };
const JONAH = { book: 'jon', chapter: 1, verse: 10 };

beforeEach(async () => {
  await db.open();
  await Promise.all([db.exportRows.clear(), db.settings.clear(), db.library.clear(), db.meta.clear()]);
  window.location.hash = '#/library';
});
afterEach(() => {
  setSermonsUrl(undefined);
  setSermonSources(undefined);
  vi.unstubAllGlobals();
});

/** Every book of the catalogue On, as the shelf holds them. */
const allOn = (): Map<string, 'on'> => new Map(CATALOGUE.map((e) => [e.resource, 'on' as const]));
const firstOf = (rows: ReturnType<typeof inLogosRows>, kind: Kind): CatalogueEntry => rows.find((r) => r.entry.kind === kind)!.entry;

describe('In another book… (inLogosRows)', () => {
  it.each([
    ['commentary', ROMANS],
    ['greek-text', ROMANS],
    ['interlinear', ROMANS],
    ['bible', JONAH],
    ['hebrew-text', JONAH],
  ] as const)('offers a %s only for a resource his import holds', (kind, place) => {
    const everything = new Set(EVERY);
    const shown = inLogosRows(CATALOGUE, allOn(), place, everything);
    const entry = firstOf(shown, kind);
    const without = new Set(EVERY.filter((id) => id !== entry.resource));
    expect(inLogosRows(CATALOGUE, allOn(), place, without).some((r) => r.entry.resource === entry.resource)).toBe(false);
    expect(inLogosRows(CATALOGUE, allOn(), place, everything).some((r) => r.entry.resource === entry.resource)).toBe(true);
    // with no import at all, none of the kind is offered
    expect(inLogosRows(CATALOGUE, allOn(), place, new Set()).filter((r) => r.entry.kind === kind)).toEqual([]);
  });
});

describe('the Library screen', () => {
  it('lists and counts only the books his import holds', async () => {
    const lexicon = entriesOf('lexicon')[0];
    const other = entriesOf('lexicon')[1];
    await keepImport([lexicon.resource]);
    render(<LibraryScreen />);
    expect(await screen.findByText(/books Lampas can open/)).toBeTruthy();
    const card = await screen.findByTestId('library-card');
    await waitFor(() => expect(card.textContent).toMatch(/of the 1 books Lampas can open/));
    // the search lists the one he owns and not the other
    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search your books' }), lexicon.short);
    expect(await screen.findByTestId('library-results')).toBeTruthy();
    expect(screen.getAllByTestId('result-title').map((t) => t.textContent)).toContain(lexicon.short);
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search your books' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search your books' }), other.short);
    expect(screen.queryAllByTestId('result-title').map((t) => t.textContent)).not.toContain(other.short);
  });
});

describe('the Library home Bibles row (mw-qtu3zvz.184)', () => {
  const ESV = 'LLS:1.0.710';
  const biblesRow = async (): Promise<string> => {
    render(<LibraryScreen />);
    const row = (await screen.findAllByTestId('kind-row')).find((r) => r.getAttribute('data-label') === 'Bibles')!;
    await waitFor(() => expect(row.querySelector('[data-testid="kind-count"]')!.textContent).not.toBe(''));
    return row.querySelector('[data-testid="kind-count"]')!.textContent ?? '';
  };

  it('names no Bible with no import and the default Logos Bibles', async () => {
    await keepImport([]);
    const line = await biblesRow();
    expect(line).toBe('none on');
    expect(line).not.toMatch(/LSB|NRSV|Swete/);
  });

  it('names the Bible his import holds and not the ones it lacks', async () => {
    const { setLogosBibleFor } = await import('../../src/data/repositories');
    await setLogosBibleFor('nt', ESV);
    await keepImport([ESV]);
    const line = await biblesRow();
    expect(line).toMatch(/ESV/);
    expect(line).not.toMatch(/LSB|NRSV|Swete/);
  });

  it('keeps a Resource ID he typed, which no catalogue row names, in the line (mw-fnvjof.17.6)', async () => {
    const { setLogosBibleFor } = await import('../../src/data/repositories');
    await setLogosBibleFor('ot', 'LLS:MYTYPEDBIBLE');
    await keepImport([]);
    expect(await biblesRow()).toBe('OT LLS:MYTYPEDBIBLE');
  });
});

describe('the sermon search and a theme', () => {
  const OWNED = 'LLS:GRGLRSRMNRCH';
  const mine = 'https://ref.ly/logosres/LLS:GRGLRSRMNRCH?art=1';
  const web = 'https://ccel.org/ccel/spurgeon/sermons1';
  const hit = (id: string, url: string | null) => ({ kind: 'sermon', source: 's', id, title: id, ref: null, url, rank: 1 });
  const theme = (id: string, url: string) => ({ source: 's', id, title: id, preacher: null, date: null, url, alt_url: null, kind: 'sermon', ref: null, role: null, width: null, theme: { source: 't', topic: 'grace', label: 'Grace', part: null, part_label: null } });

  it('drops a hit that opens in an un-owned Logos resource, and keeps it once owned', async () => {
    setSermonsUrl('https://sermons.test');
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ rows: [hit('logos', mine), hit('web', web)] }), { status: 200 }));
    const ids = (state: ReturnType<typeof useServiceSearch>): string[] => (state.status === 'found' ? state.hits.map((h) => h.id) : []);
    const first = renderHook(() => useServiceSearch('grace', true));
    await waitFor(() => expect(first.result.current.status).toBe('found'));
    expect(ids(first.result.current)).toEqual(['web']);
    first.unmount();
    await keepImport([OWNED]);
    const second = renderHook(() => useServiceSearch('grace', true));
    await waitFor(() => expect(second.result.current.status).toBe('found'));
    expect(ids(second.result.current)).toEqual(['logos', 'web']);
  });

  it("drops a theme's sermon that opens in an un-owned Logos resource, and keeps it once owned", async () => {
    setSermonsUrl('https://sermons.test');
    // a theme lists only the sermons of a source that is On (mw-qtu3zvz.81): the rows below are of one the tests register
    setSermonSources([sourceOf('s', 'A source of the tests', {})]);
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ theme: { total: 2, rows: [theme('logos', mine), theme('web', web)] } }), { status: 200 }));
    const rows = (map: ReturnType<typeof useThemeSermons>): string[] => {
      const got = map.get('t:grace');
      return got?.status === 'found' ? got.rows.map((r) => r.id) : [];
    };
    const first = renderHook(() => useThemeSermons(['t:grace']));
    await waitFor(() => expect(first.result.current.get('t:grace')?.status).toBe('found'));
    expect(rows(first.result.current)).toEqual(['web']);
    first.unmount();
    await keepImport([OWNED]);
    const second = renderHook(() => useThemeSermons(['t:grace']));
    await waitFor(() => expect(second.result.current.get('t:grace')?.status).toBe('found'));
    expect(rows(second.result.current)).toEqual(['logos', 'web']);
  });
});

describe('Study resources', () => {
  // a kept list that names none of the books below (with no list kept, the shelf alone says what he has: tests/unit/owned-shelf-no-kept-list.test.ts)
  const keepOther = (): Promise<void> => keepImport(['LLS:SOMETHINGELSE']);

  it('offers a lexicon only for a resource his import holds', async () => {
    const lexicon = LEXICONS[0];
    await setResourceOption('logos', JSON.stringify([lexicon.id]));
    await keepOther();
    expect(await lexiconTicks()).toEqual([]);
    await keepImport([lexicon.resource]);
    expect(await lexiconTicks()).toEqual([lexicon.id]);
  });

  it('offers a pinned lexicon only for a resource his import holds', async () => {
    const lexicon = LEXICONS[0];
    await setState(lexicon.resource, 'pinned');
    await keepOther();
    expect(await lexiconPins()).toEqual([]);
    await keepImport([lexicon.resource]);
    expect(await lexiconPins()).toEqual([lexicon.id]);
  });

  it('offers a grammar book only for a resource his import holds', async () => {
    const book = GRAMMAR_BOOKS[0];
    await setGrammarBooks([book.id]);
    await keepOther();
    expect(await grammarBookTicks()).not.toContain(book.id);
    await keepImport([book.resource]);
    expect(await grammarBookTicks()).toContain(book.id);
  });

  it('offers a work only for a volume his import holds', async () => {
    const work = WORKS[0];
    const volume = work.volumes[0];
    expect(work.volumes.length).toBeGreaterThan(0);
    await setWorks([work.id]);
    await keepOther();
    expect(await workTicks()).toEqual([]);
    await keepImport([volume.resource]);
    expect(await workTicks()).toEqual([work.id]);
  });

  it('offers a devotional only for a resource his import holds', async () => {
    const devotional = DEVOTIONALS[0];
    await setDevotionalDraw(devotional.id);
    await keepOther();
    expect(await devotionalDraw()).toBe('none');
    await keepImport([devotional.id]);
    expect(await devotionalDraw()).toBe(devotional.id);
  });
});
