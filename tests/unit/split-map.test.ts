// The map the Reader's dock holds (mw-5r3p30.1129.2): the text the setting `splitMap` keeps, src/maps/splitMap.ts, and the setting's own check of it.
import { describe, expect, it } from 'vitest';
import { decodeSplitMap, dockedCard, encodeSplitMap } from '../../src/maps/splitMap';
import { splitMapSetting } from '../../src/settings/definitions/split';
import type { MapCard } from '../../src/maps/types';

const card = { id: 'BattleAtValleyOfSiddim', source: 'biblemapper', title: 'The Battle at the Valley of Siddim', kind: 'event', period: 'c. 2110 BC', article: 'https://biblemapper.com/x', places: [] } satisfies MapCard;

describe('splitMap', () => {
  it('keeps the chapter the map was opened from and its card, and reads them back', () => {
    const kept = encodeSplitMap(card, { book: 'gen', chapter: 14, from: 15, to: 15 });
    expect(kept).toBe('gen|14|biblemapper|BattleAtValleyOfSiddim');
    expect(decodeSplitMap(kept)).toEqual({ book: 'gen', chapter: 14, source: 'biblemapper', id: 'BattleAtValleyOfSiddim' });
  });

  it('keeps a bar inside the card id', () => {
    expect(decodeSplitMap('gen|14|atlas|a|b')).toEqual({ book: 'gen', chapter: 14, source: 'atlas', id: 'a|b' });
  });

  it.each(['', 'gen', 'gen|14|biblemapper', 'gen|x|biblemapper|id', 'gen|0|biblemapper|id', '|14|biblemapper|id', 'gen|14||id', 'gen|14|biblemapper|'])('reads %j as no map', (text) => {
    expect(decodeSplitMap(text)).toBeNull();
  });

  it('is a setting that is empty to start, takes only a map or nothing, and reads a damaged value as nothing', () => {
    expect(splitMapSetting.default).toBe('');
    expect(splitMapSetting.parse('gen|14|biblemapper|BattleAtValleyOfSiddim')).toBe('gen|14|biblemapper|BattleAtValleyOfSiddim');
    expect(splitMapSetting.parse('half')).toBe('');
    expect(splitMapSetting.parse(3)).toBe('');
  });
});

describe('dockedCard: the map the dock shows when the chapter moves', () => {
  const make = (id: string, kind: MapCard['kind'], source = 'biblemapper', extra: Partial<MapCard> = {}): MapCard => ({ ...card, id, kind, source, ...extra });
  const world = make('World', 'event');
  const canaan = make('Canaan', 'event');
  const table = make('Table', 'region');
  const film = make('Film', 'video');
  const link = make('Link', 'link', 'logosatlas', { open: { url: 'https://example.org/' } });

  it('keeps his map when the chapter has it', () => {
    expect(dockedCard([world, canaan, table], { source: 'biblemapper', id: 'Canaan' })).toBe(canaan);
    expect(dockedCard([world, canaan, table], { source: 'biblemapper', id: 'Table' })).toBe(table);
  });

  it('else takes the chapter’s first in the Maps sheet’s order: Events before Regions whatever the source listed first', () => {
    expect(dockedCard([table, world, canaan], { source: 'biblemapper', id: 'Gone' })).toBe(world);
    expect(dockedCard([table], { source: 'biblemapper', id: 'Gone' })).toBe(table);
  });

  it('passes over a video and a link-only row, which cannot be docked, even when it was his map', () => {
    expect(dockedCard([film, link, canaan], { source: 'biblemapper', id: 'Gone' })).toBe(canaan);
    expect(dockedCard([film, link], { source: 'biblemapper', id: 'Film' })).toBeNull();
  });

  it('is none for a chapter with no map', () => {
    expect(dockedCard([], { source: 'biblemapper', id: 'Gone' })).toBeNull();
  });

  it('matches the source as well as the id', () => {
    const other = make('World', 'event', 'atlas');
    expect(dockedCard([other, world], { source: 'biblemapper', id: 'World' })).toBe(world);
  });
});
