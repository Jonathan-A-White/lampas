// The Timeline door beside a chapter's maps (mw-fnvjof.17.287, docs/maps.md 'The Timeline door'): Bible Mapper's TimeGlider, opened at the earliest date any map of the chapter has,
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
  it('opens the TimeGlider at the earliest map date of Genesis 14 (the Battle at the Valley of Siddim, 2110 BC)', () => {
    expect(bibleMapper.timelineUrl?.({ book: 'gen', chapter: 14 })).toBe('https://biblemapper.com/timeline/?date=-2110');
  });

  it('gives an AD date as it is (Romans 8: the third journey of Paul, AD 53)', () => {
    expect(bibleMapper.timelineUrl?.({ book: 'rom', chapter: 8 })).toBe('https://biblemapper.com/timeline/?date=53');
  });

  it('is null for a chapter whose maps have no dates (Genesis 4), and for a chapter with no maps', () => {
    expect(bibleMapper.timelineUrl?.({ book: 'gen', chapter: 4 })).toBeNull();
    expect(bibleMapper.timelineUrl?.({ book: 'oba', chapter: 2 })).toBeNull();
  });
});

describe('the Timeline door on a map', () => {
  it('is a link to the TimeGlider in a new tab, with its credit, under All maps for Genesis 14', async () => {
    const [card] = await mapsFor({ book: 'gen', chapter: 14 });
    render(createElement(MapBody, { card, mapRef: { book: 'gen', chapter: 14 } }));
    const all = screen.getByRole('link', { name: 'All maps for Genesis 14 at Bible Mapper' });
    const door = screen.getByRole('link', { name: 'Timeline at Bible Mapper' });
    expect(door).toHaveAttribute('href', 'https://biblemapper.com/timeline/?date=-2110');
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
