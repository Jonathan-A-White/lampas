// The Logos Atlas's map list (src/maps/data/logosatlas.json, mw-zbjgn3r.7): the Mayor's reading of the signed-in atlas, copied as it is. Nothing is added by hand, so a guessed id fails here.
import { describe, expect, it } from 'vitest';
import data from '../../src/maps/data/logosatlas.json';
import { BASE_MAP } from '../../src/maps/logosRef';

describe('logosatlas.json', () => {
  it('holds the 261 maps the atlas lists, each with an id, a title, a period, an order and passages', () => {
    expect(data.count).toBe(261);
    expect(data.maps).toHaveLength(261);
    for (const map of data.maps) {
      expect(typeof map.title).toBe('string');
      expect(data.periods).toContain(map.period);
      expect(Number.isInteger(map.order)).toBe(true);
      expect(Array.isArray(map.passages)).toBe(true);
    }
  });

  it('has ids of the form NAME-EN, each once', () => {
    const ids = data.maps.map((m) => m.id);
    for (const id of ids) expect(id).toMatch(/^[A-Z0-9]+-EN$/);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('holds the maps the story knows by name, and the base (a constant of logosRef.ts: the file is the atlas\'s list as read, nothing added)', () => {
    const ids = data.maps.map((m) => m.id);
    expect(BASE_MAP).toBe('BIBLICALWORLDPREPATRIARCHALPERIOD-EN');
    for (const id of [BASE_MAP, 'CREATIONANDTHEFALL-EN', 'JONAHSTRAVELS-EN', 'BIBLICALWORLDDIVIDEDKINGDOM-EN']) expect(ids).toContain(id);
  });

  it('keeps the source note and 13 periods', () => {
    expect(data.source).toContain('app.logos.com/tools/atlas');
    expect(data.periods).toHaveLength(13);
  });
});
