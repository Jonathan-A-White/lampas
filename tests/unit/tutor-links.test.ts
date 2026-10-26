// The tutor's links (mw-5r3p30.75): the answer schema and the app's guard agree on `links`, the grind's instructions say when to add one, and the
// chips a link becomes follow the study resources he switched on (src/resources/tutorLinks.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_LINKS, isTalkAnswer } from '../../src/services/talk';
import { verseLink } from '../../src/resources/logosBible';
import { mapChip, placeOf, verseChips, wordChips } from '../../src/resources/tutorLinks';
import { TEST_CARDS } from '../support/test-maps';
import type { StudyResources } from '../../src/data/repositories';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';

const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
const instructions = instructionsOf('bible-talk');
const base = { answer: 'Love, mostly.', question: 'What does it say?', words: [] };
const word = { kind: 'word', lemma: 'ἀγάπη' };
const verse = { kind: 'verse', reference: 'Romans 8:31' };
const on = (...ids: string[]): StudyResources => ({ on: ids, options: {} });

describe('links in the answer schema and the guard', () => {
  it('are optional, at most three, and a word (a lemma) or a verse (a reference)', () => {
    expect((schema.required as string[]).sort()).toEqual(['answer', 'question', 'words']);
    const links = schema.properties?.links;
    expect(links?.maxItems).toBe(MAX_LINKS);
    expect(MAX_LINKS).toBe(3);
    for (const value of [base, { ...base, links: [word] }, { ...base, links: [word, verse, word] }]) {
      expect(validate(value, schema), JSON.stringify(value)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
    // mw-5r3p30.691: leaving links out is the only way to send none; the phone's guard still takes [] from an older mill
    expect(validate({ ...base, links: [] }, schema)).not.toEqual([]);
    expect(isTalkAnswer({ ...base, links: [] })).toBe(true);
  });

  const bad: [string, unknown][] = [
    ['a link of no kind', { ...base, links: [{ lemma: 'ἀγάπη' }] }],
    ['a link of another kind', { ...base, links: [{ kind: 'url', lemma: 'https://example.com' }] }],
    ['a word link with no lemma', { ...base, links: [{ kind: 'word' }] }],
    ['a word link with an empty lemma', { ...base, links: [{ kind: 'word', lemma: '' }] }],
    ['a verse link with a lemma', { ...base, links: [{ kind: 'verse', lemma: 'ἀγάπη' }] }],
    ['an extra key on a link', { ...base, links: [{ ...word, url: 'https://example.com' }] }],
    ['links that are not a list', { ...base, links: word }],
  ];
  it.each(bad)('refuse %s in both', (_, value) => {
    expect(validate(value, schema)).not.toEqual([]);
    expect(isTalkAnswer(value)).toBe(false);
  });

  it('refuses four links in the schema (the mill), while the app, which keeps three, still takes the answer', () => {
    const four = { ...base, links: [word, word, word, word] };
    expect(validate(four, schema)).not.toEqual([]);
    expect(isTalkAnswer(four)).toBe(true);
  });
});

describe('the grind instructions on links', () => {
  it('say what a link is, when to add one, the limit of three, and that the app shows only the resources he has on', () => {
    expect(instructions).toContain('`links`');
    expect(instructions).toContain('## Links to his study resources');
    expect(instructions).toMatch(/at most (three|3) links/i);
    expect(instructions).toContain('`kind` `word`');
    expect(instructions).toContain('`kind` `verse`');
    expect(instructions).toMatch(/quiz/i);
    expect(instructions).toMatch(/does not show a link to a resource he has not switched on|shows only the links of the resources he has switched on/i);
  });
});

describe('wordChips', () => {
  it('gives the first link of each resource he switched on, named for the lemma', () => {
    const chips = wordChips('ἀγάπη', 'G26', on('strongs', 'logos'));
    expect(chips.map((c) => c.label)).toEqual(['G26 for ἀγάπη', 'Open in Logos: BDAG for ἀγάπη']);
    expect(chips[1].url).toBe('logosres:LLS:46.30.18;hw=%E1%BC%80%CE%B3%CE%AC%CF%80%CE%B7');
    expect(chips[1].tile).toBe('BDAG');
  });

  it('gives nothing for a resource that is off, and nothing at all when none is on', () => {
    expect(wordChips('ἀγάπη', 'G26', on('logos')).map((c) => c.label)).toEqual(['Open in Logos: BDAG for ἀγάπη']);
    expect(wordChips('ἀγάπη', 'G26', on())).toEqual([]);
  });

  it('follows the lexicon he ticked first', () => {
    const chosen: StudyResources = { on: ['logos'], options: { logos: JSON.stringify(['louwnida', 'bdag']) } };
    expect(wordChips('ἀγάπη', 'G26', chosen)[0].label).toBe('Open in Logos: BDAG for ἀγάπη');
    expect(wordChips('ἀγάπη', 'G26', { on: ['logos'], options: { logos: JSON.stringify(['louwnida']) } })[0].label).toBe('Open in Logos: Louw-Nida for ἀγάπη');
  });

  it('gives no Strong\'s chip for a word the lexicon does not have', () => {
    expect(wordChips('ζζζ', undefined, on('strongs', 'logos')).map((c) => c.label)).toEqual(['Open in Logos: BDAG for ζζζ']);
  });
});

describe('verseLink and verseChips', () => {
  it('writes a New Testament verse in Logos as the chapter link does for the Old', () => {
    expect(verseLink('rom', 8, 31, 'LLS:LGCYSTNDRDBBLSB')).toEqual({
      url: 'logosres:lgcystndrdbblsb;ref=Bible.Ro8.31',
      fallback: 'https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Ro8.31',
    });
    expect(verseLink('1jn', 1, 9, 'LLS:LGCYSTNDRDBBLSB')?.url).toBe('logosres:lgcystndrdbblsb;ref=Bible.1Jn1.9');
    expect(verseLink('isa', 53, 5, 'LLS:LGCYSTNDRDBBLSB')).toEqual({
      url: 'logosres:lgcystndrdbblsb;ref=Bible.Isa53.5',
      fallback: 'https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Isa53.5',
    });
    expect(verseLink('xyz', 1, 1, 'LLS:LGCYSTNDRDBBLSB')).toBeUndefined();
  });

  it('gives Logos\' chip only when Logos is on, in the Bible he chose', () => {
    expect(verseChips({ book: 'rom', chapter: 8, verse: 31 }, 'Romans 8:31', on('strongs'), 'LLS:LGCYSTNDRDBBLSB')).toEqual([]);
    const [chip] = verseChips({ book: 'rom', chapter: 8, verse: 31 }, 'Romans 8:31', on('logos'), 'LLS:1.0.710');
    expect(chip).toMatchObject({ label: 'Open Romans 8:31 in Logos', tile: 'Logos', url: 'logosres:1.0.710;ref=Bible.Ro8.31' });
  });
});

describe('an Old Testament verse link', () => {
  it('schema: takes an Old Testament reference and says any book of the Bible', () => {
    const value = { ...base, links: [{ kind: 'verse', reference: 'Isaiah 53:5' }, { kind: 'verse', reference: 'Genesis 15:6' }] };
    expect(validate(value, schema)).toEqual([]);
    expect(isTalkAnswer(value)).toBe(true);
    const description = JSON.stringify(schema.properties?.links);
    expect(description).toMatch(/Old Testament/);
    expect(description).not.toMatch(/verse of the New Testament/);
    expect(instructions).toMatch(/any book of the Bible/i);
  });

  it('is placed by the one canon list: Isaiah 53:5 is a place with no Reader, Romans 8:31 keeps its Reader', () => {
    expect(placeOf('Isaiah 53:5')).toEqual({ book: 'isa', chapter: 53, verse: 5, name: 'Isaiah 53:5', reader: false });
    expect(placeOf('Romans 8:31')).toMatchObject({ book: 'rom', chapter: 8, verse: 31, name: 'Romans 8:31', reader: true });
    expect(placeOf('Psalm 23')).toMatchObject({ book: 'psa', chapter: 23, name: 'Psalms 23', reader: false });
  });

  it('drops a place the canon lacks: a chapter past the end, a verse 0, an unknown book', () => {
    for (const text of ['Isaiah 67:1', 'Isaiah 53:0', 'Tobit 3:1', 'Obadiah 2:1', 'Romans 17:1']) expect(placeOf(text), text).toBeNull();
  });

  it('gives Logos\' chip in his Bible, no Reader chip, and nothing when Logos is off', () => {
    const place = placeOf('Isaiah 53:5');
    if (!place) throw new Error('no place');
    const [chip, ...rest] = verseChips(place, place.name, on('strongs', 'logos'), 'LLS:LGCYSTNDRDBBLSB');
    expect(rest).toEqual([]);
    expect(chip).toMatchObject({
      label: 'Open Isaiah 53:5 in Logos',
      tile: 'Logos',
      url: 'logosres:lgcystndrdbblsb;ref=Bible.Isa53.5',
      fallback: 'https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Isa53.5',
    });
    expect(verseChips(place, place.name, on('strongs'), 'LLS:LGCYSTNDRDBBLSB')).toEqual([]);
  });

  it('opens in whatever Bible he chose in Settings, never a fixed one', () => {
    const place = placeOf('Genesis 15:6');
    if (!place) throw new Error('no place');
    expect(verseChips(place, place.name, on('logos'), 'LLS:1.0.710')[0].url).toBe('logosres:1.0.710;ref=Bible.Ge15.6');
    expect(verseChips(place, place.name, on('logos'), 'LLS:KJV1900')[0].url).toBe('logosres:kjv1900;ref=Bible.Ge15.6');
  });
});

describe('a map link (mw-zbjgn3r.4)', () => {
  const map = { kind: 'map', map: 'SodomAndGomorrah' };

  it('is optional like the others: the schema and the guard take {kind: map, map: <id>} within the three', () => {
    const value = { ...base, links: [map, verse, word] };
    expect(validate(value, schema), JSON.stringify(value)).toEqual([]);
    expect(isTalkAnswer(value)).toBe(true);
    expect(validate({ ...base, links: [map, map, map, map] }, schema)).not.toEqual([]);
  });

  it.each([
    ['no map id', { kind: 'map' }],
    ['an empty id', { kind: 'map', map: '' }],
    ['a lemma beside the id', { kind: 'map', map: 'Ararat', lemma: 'ἀγάπη' }],
    ['a reference instead of an id', { kind: 'map', reference: 'Genesis 10:19' }],
  ])('refuses %s in both', (_, link) => {
    expect(validate({ ...base, links: [link] }, schema)).not.toEqual([]);
    expect(isTalkAnswer({ ...base, links: [link] })).toBe(false);
  });

  it('the schema says the id is a line of the request\'s maps and never one not listed', () => {
    expect(JSON.stringify(schema.properties?.links)).toMatch(/line of the request's `maps`, exactly as given; never one not listed/);
  });

  it('is a chip \'Map: <title>\' for an id among the maps of the chapter', () => {
    expect(mapChip('SodomAndGomorrah', TEST_CARDS['gen.10'])).toMatchObject({ label: 'Map: Sodom and Gomorrah Are Destroyed', card: { id: 'SodomAndGomorrah' } });
  });

  it('is no chip for an id the chapter lacks, for a video, or for no maps at all', () => {
    expect(mapChip('NoSuchMap', TEST_CARDS['gen.10'])).toBeNull();
    expect(mapChip('Genesis_10', TEST_CARDS['gen.10'])).toBeNull();
    expect(mapChip('SodomAndGomorrah', [])).toBeNull();
  });
});
