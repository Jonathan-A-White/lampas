// The merge of the bundled sermons of a place with the sermon index service's (mw-qtu3zvz.5, src/sermons/merge.ts, docs/sermons.md 'When online'): pure.
import { describe, expect, it } from 'vitest';
import { linkRowOf, linkRowOfHit, mergeServiceRows, rowOfService, subsplashAlt } from '../../src/sermons/merge';
import type { ServiceHit, ServiceSermon } from '../../src/services/sermons';
import { groupAnswers } from '../../src/sermons/sermonsFor';
import { row } from '../support/sermon-sources';
import rom58 from '../fixtures/sermons/api-rom-5-8.json';

const place = { book: 'rom', chapter: 5, from: 8 };
const sermon = (over: Partial<ServiceSermon> & Pick<ServiceSermon, 'source' | 'id'>): ServiceSermon => ({
  title: 'A sermon',
  preacher: 'A. Preacher',
  date: '1855-03-18',
  url: 'https://sermons.test/a',
  alt_url: null,
  kind: 'link',
  ref: 'Rom.5.8',
  role: 'text',
  width: 1,
  ...over,
});

const bundled = groupAnswers(
  [
    [row('a', 'peace', 'Peace with God', ['rom', 5, 1, 11], 'P', '1861'), row('a', 'love', 'Love Commended', ['rom', 5, 8, 8], 'P', '1880-03-14'), row('a', 'reign', 'Reigning in Life', ['rom', 5, 12, 21])],
    [row('b', 'shown', 'God’s Love Shown', ['rom', 5, 6, 8])],
  ],
  place,
);
const titles = (rows: { title: string }[]) => rows.map((r) => r.title);

describe('rowOfService', () => {
  it('reads the OSIS reference into Lampas’s book and numbering', () => {
    expect(rowOfService(sermon({ source: 'a', id: '1', ref: 'Rom.5.12-Rom.6.4' }), 'rom')).toMatchObject({ source: 'a', id: '1', ref: { book: 'rom', chapter: 5, from: 12, to: 4, toChapter: 6 }, role: 'text', opensIn: 'web', open: { url: 'https://sermons.test/a' } });
    expect(rowOfService(sermon({ source: 'a', id: '1', ref: 'Rom.5' }), 'rom')?.ref).toEqual({ book: 'rom', chapter: 5, from: 1, to: 21 });
  });

  it('leaves out null preacher and date, and says ref.ly opens in Logos', () => {
    const made = rowOfService(sermon({ source: 'a', id: '1', preacher: null, date: null, url: 'https://ref.ly/logosres/LLS:X?art=1' }), 'rom')!;
    expect('preacher' in made).toBe(false);
    expect('date' in made).toBe(false);
    expect(made.opensIn).toBe('logos');
  });

  it('is nothing for a reference that does not parse, is in another book, or an address that is not https', () => {
    expect(rowOfService(sermon({ source: 'a', id: '1', ref: 'Rom.5.99' }), 'rom')).toBeUndefined();
    expect(rowOfService(sermon({ source: 'a', id: '1', ref: 'Matt.5.8' }), 'rom')).toBeUndefined();
    expect(rowOfService(sermon({ source: 'a', id: '1', url: 'javascript:alert(1)' }), 'rom')).toBeUndefined();
  });

  it('reads the service’s own example row (docs/api.md, fixture api-rom-5-8.json)', () => {
    const [first] = rom58['GET /v1/sermons?ref=rom.5.8'].rows as ServiceSermon[];
    expect(rowOfService(first, 'rom')).toMatchObject({ source: 'spurgeon-20', id: '104', title: "Love's Commendation", preacher: 'C. H. Spurgeon', ref: { book: 'rom', chapter: 5, from: 8, to: 8 } });
  });
});

describe('mergeServiceRows', () => {
  const options = { place, sources: ['a', 'b'] };

  it('with no service rows is the bundled groups, and nothing new', () => {
    const merged = mergeServiceRows(bundled, [], options);
    expect(merged.added).toBe(0);
    expect(merged.found).toEqual(bundled);
  });

  it('replaces a row of the same source and id by the service’s (its newer title and address win)', () => {
    const merged = mergeServiceRows(bundled, [sermon({ source: 'a', id: 'love', title: 'Love Commended, Revised', url: 'https://sermons.test/new' })], options);
    expect(merged.added).toBe(0);
    const love = merged.found.here.find((r) => r.id === 'love')!;
    expect(love).toMatchObject({ title: 'Love Commended, Revised', open: { url: 'https://sermons.test/new' } });
    expect(merged.found.here.filter((r) => r.id === 'love')).toHaveLength(1);
    expect(titles(merged.found.here)).toEqual(['Love Commended, Revised', 'Peace with God', 'God’s Love Shown']);
  });

  it('adds a row the bundle lacks under its group: on the verse when its text overlaps it, in the chapter when not', () => {
    const merged = mergeServiceRows(
      bundled,
      [sermon({ source: 'a', id: 'new-here', title: 'New On The Verse', ref: 'Rom.5.7-Rom.5.9' }), sermon({ source: 'a', id: 'new-there', title: 'New In The Chapter', ref: 'Rom.5.20' })],
      options,
    );
    expect(merged.added).toBe(2);
    expect(titles(merged.found.here)).toEqual(['Love Commended', 'New On The Verse', 'Peace with God', 'God’s Love Shown']);
    expect(titles(merged.found.chapter)).toEqual(['Reigning in Life', 'New In The Chapter']);
  });

  it('keeps each source’s rows together in the order of the sources, a source with no bundled row after them', () => {
    const merged = mergeServiceRows(bundled, [sermon({ source: 'c', id: '1', title: 'From C', ref: 'Rom.5.19' }), sermon({ source: 'c', id: '2', title: 'From C Too', ref: 'Rom.5.20' })], { place, sources: ['a', 'b', 'c'] });
    expect(merged.added).toBe(2);
    expect(titles(merged.found.chapter)).toEqual(['Reigning in Life', 'From C', 'From C Too']);
  });

  it('leaves out the rows of a source that is not on, rows that only cite the passage, other chapters, and a row twice', () => {
    const merged = mergeServiceRows(
      bundled,
      [
        sermon({ source: 'off', id: '1', title: 'Off Source' }),
        sermon({ source: 'a', id: 'cited', title: 'Cites It', role: 'cited' }),
        sermon({ source: 'a', id: 'elsewhere', title: 'Chapter Six', ref: 'Rom.6.1' }),
        sermon({ source: 'a', id: 'twice', title: 'Twice', ref: 'Rom.5.9' }),
        sermon({ source: 'a', id: 'twice', title: 'Twice Again', ref: 'Rom.5.9' }),
      ],
      options,
    );
    expect(merged.added).toBe(1);
    expect([...merged.found.here, ...merged.found.chapter].map((r) => r.title)).toContain('Twice');
    expect([...merged.found.here, ...merged.found.chapter].map((r) => r.title)).not.toContain('Twice Again');
    for (const gone of ['Off Source', 'Cites It', 'Chapter Six']) expect([...merged.found.here, ...merged.found.chapter].map((r) => r.title)).not.toContain(gone);
  });

  it('does not change the bundled groups it was given', () => {
    const before = JSON.stringify(bundled);
    mergeServiceRows(bundled, [sermon({ source: 'a', id: 'love', title: 'Changed' })], options);
    expect(JSON.stringify(bundled)).toBe(before);
  });

  it('a whole chapter has every row in the chapter group', () => {
    const chapter = { book: 'rom', chapter: 5 };
    const merged = mergeServiceRows(groupAnswers([[row('a', 'peace', 'Peace with God', ['rom', 5, 1, 11])]], chapter), [sermon({ source: 'a', id: 'n', title: 'New', ref: 'Rom.5.20' })], { place: chapter, sources: ['a'] });
    expect(merged.found.here).toEqual([]);
    expect(titles(merged.found.chapter)).toEqual(['Peace with God', 'New']);
  });
});

describe('linkRowOfHit', () => {
  const hit = (over: Partial<ServiceHit>): ServiceHit => ({ kind: 'sermon', source: 'a', id: '1', title: 'T', ref: null, url: 'https://sermons.test/t', rank: 0.5, ...over });
  it('is a row for a sermon with an https address, and none for a theme or another address', () => {
    expect(linkRowOfHit(hit({}))).toMatchObject({ id: '1', source: 'a', title: 'T', open: { url: 'https://sermons.test/t' }, opensIn: 'web' });
    expect(linkRowOfHit(hit({ kind: 'theme', url: null }))).toBeUndefined();
    expect(linkRowOfHit(hit({ url: 'http://insecure.test' }))).toBeUndefined();
  });
});

describe('the alternate address (mw-qtu3zvz.49.2)', () => {
  it('rowOfService and linkRowOf carry a service row’s alt_url, and a row with none has none', () => {
    const alt = 'https://brookfieldfirst.subspla.sh/q59d572';
    expect(rowOfService(sermon({ source: 'a', id: '1', alt_url: alt }), 'rom')?.alt).toBe(alt);
    expect(linkRowOf(sermon({ source: 'a', id: '1', alt_url: alt }))?.alt).toBe(alt);
    expect('alt' in rowOfService(sermon({ source: 'a', id: '1', alt_url: null }), 'rom')!).toBe(false);
    expect('alt' in linkRowOf(sermon({ source: 'a', id: '1', alt_url: null }))!).toBe(false);
    expect('alt' in linkRowOf({ source: 'a', id: '1', title: 't', url: 'https://sermons.test/a' })!).toBe(false);
  });

  it('subsplashAlt is the alt address only on subsplash.com or subspla.sh (https), else undefined', () => {
    expect(subsplashAlt('https://brookfieldfirst.subspla.sh/q59d572')).toBe('https://brookfieldfirst.subspla.sh/q59d572');
    expect(subsplashAlt('https://subsplash.com/u/-abc/media/d/xyz')).toBe('https://subsplash.com/u/-abc/media/d/xyz');
    expect(subsplashAlt('https://www.subsplash.com/x')).toBe('https://www.subsplash.com/x');
    expect(subsplashAlt('https://www.spurgeongems.org/sermon/chs1.pdf')).toBeUndefined();
    expect(subsplashAlt('https://evilsubsplash.com/x')).toBeUndefined();
    expect(subsplashAlt('https://subsplash.com.evil.test/x')).toBeUndefined();
    expect(subsplashAlt('http://subsplash.com/x')).toBeUndefined();
    expect(subsplashAlt(undefined)).toBeUndefined();
  });
});
