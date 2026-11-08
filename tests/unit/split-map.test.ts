// The map the Reader's dock holds (mw-5r3p30.1129.2): the text the setting `splitMap` keeps, src/maps/splitMap.ts, and the setting's own check of it.
import { describe, expect, it } from 'vitest';
import { decodeSplitMap, encodeSplitMap } from '../../src/maps/splitMap';
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
