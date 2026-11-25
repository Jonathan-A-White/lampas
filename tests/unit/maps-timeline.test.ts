// The Timeline door beside a chapter's maps (mw-fnvjof.17.287, docs/maps.md 'The Timeline door'): Bible Mapper's TimeGlider, opened at a map's own date or at the chapter's own time,
// credited like the maps. A chapter whose maps have no dates has no door. The page takes ?date= (a year, negative for BC); every other part of the page it ignores.
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mapsFor } from '../../src/maps';
import { MapBody } from '../../src/maps/MapView';
import { bibleMapper, loadBibleMapper } from '../../src/maps/sources/biblemapper';

beforeAll(async () => {
  await loadBibleMapper();
});
afterEach(cleanup);

describe('Bible Mapper timelineUrl', () => {
  it('opens the TimeGlider at the date of Genesis 14\'s map nearest the book\'s era (the patriarchs, 2000 BC; not the Battle at the Valley of Siddim, 2110 BC, the earliest)', () => {
    expect(bibleMapper.timelineUrl?.({ book: 'gen', chapter: 14 })).toBe('https://biblemapper.com/timeline/?date=-2000');
  });

  it('gives an AD date as it is (Romans 8: the third journey of Paul, AD 53)', () => {
    expect(bibleMapper.timelineUrl?.({ book: 'rom', chapter: 8 })).toBe('https://biblemapper.com/timeline/?date=53');
  });

  it('is null for a chapter whose maps have no dates (Genesis 4), and for a chapter with no maps', () => {
    expect(bibleMapper.timelineUrl?.({ book: 'gen', chapter: 4 })).toBeNull();
    expect(bibleMapper.timelineUrl?.({ book: 'oba', chapter: 2 })).toBeNull();
  });
});

describe('the chapter\'s own time (mw-fnvjof.17.313)', () => {
  it('opens Isaiah 1 in Isaiah\'s era, not at Sodom (2100 BC), the one past event its maps mention', () => {
    const url = bibleMapper.timelineUrl?.({ book: 'isa', chapter: 1 }) ?? '';
    const year = Number(new URL(url).searchParams.get('date'));
    expect(year).toBeGreaterThanOrEqual(-800);
    expect(year).toBeLessThanOrEqual(-680);
  });

  it('keeps the chapter\'s own map date where it is of the book\'s time (Isaiah 7: 735 BC)', () => {
    expect(bibleMapper.timelineUrl?.({ book: 'isa', chapter: 7 })).toBe('https://biblemapper.com/timeline/?date=-735');
  });

  it('opens a map\'s own link at that map\'s start date (the Sodom map on Isaiah 1: 2100 BC)', () => {
    const ref = { book: 'isa', chapter: 1 };
    const card = { id: 'SodomAndGomorrah', source: 'biblemapper', title: '', kind: 'event' as const, start: -2100, end: -2090, period: '', article: '', places: [] };
    expect(bibleMapper.timelineUrl?.(ref, card)).toBe('https://biblemapper.com/timeline/?date=-2100');
  });

  it('opens an undated map\'s link at the chapter\'s own time (the Kingdoms of Israel and Judah on Isaiah 1)', () => {
    const ref = { book: 'isa', chapter: 1 };
    const card = { id: 'DividedKingdom', source: 'biblemapper', title: '', kind: 'region' as const, period: '', article: '', places: [] };
    expect(bibleMapper.timelineUrl?.(ref, card)).toBe(bibleMapper.timelineUrl?.(ref));
  });
});

describe('the Timeline door on a map', () => {
  it('on the Sodom map\'s sheet opens at 2100 BC, on an undated map\'s at the chapter\'s own time', async () => {
    const ref = { book: 'isa', chapter: 1 };
    const cards = await mapsFor(ref);
    const sodom = cards.find((c) => c.id === 'SodomAndGomorrah');
    const kingdoms = cards.find((c) => c.id === 'DividedKingdom');
    if (!sodom || !kingdoms) throw new Error('Isaiah 1 lacks its maps');
    render(createElement(MapBody, { card: sodom, mapRef: ref }));
    expect(screen.getByRole('link', { name: 'Timeline at Bible Mapper' })).toHaveAttribute('href', 'https://biblemapper.com/timeline/?date=-2100');
    cleanup();
    render(createElement(MapBody, { card: kingdoms, mapRef: ref }));
    const year = Number(new URL(screen.getByRole('link', { name: 'Timeline at Bible Mapper' }).getAttribute('href') ?? '').searchParams.get('date'));
    expect(year).toBeGreaterThanOrEqual(-800);
    expect(year).toBeLessThanOrEqual(-680);
  });

  it('is a link to the TimeGlider in a new tab, with its credit, under All maps for Genesis 14', async () => {
    const [card] = await mapsFor({ book: 'gen', chapter: 14 });
    render(createElement(MapBody, { card, mapRef: { book: 'gen', chapter: 14 } }));
    const all = screen.getByRole('link', { name: 'All maps for Genesis 14 at Bible Mapper' });
    const door = screen.getByRole('link', { name: 'Timeline at Bible Mapper' });
    expect(door).toHaveAttribute('href', 'https://biblemapper.com/timeline/?date=-2000');
    expect(door).toHaveAttribute('target', '_blank');
    expect(door.getAttribute('rel')).toContain('noopener');
    expect(all.compareDocumentPosition(door) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Timeline by David P\. Barrett,/).textContent).toBe('Timeline by David P. Barrett, biblemapper.com');
  });

  it('is not drawn on a chapter whose maps have no dates', async () => {
    const [card] = await mapsFor({ book: 'gen', chapter: 4 });
    render(createElement(MapBody, { card, mapRef: { book: 'gen', chapter: 4 } }));
    expect(screen.getByRole('link', { name: 'All maps for Genesis 4 at Bible Mapper' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Timeline at Bible Mapper' })).toBeNull();
    expect(screen.queryByText(/Timeline by/)).toBeNull();
  });
});
