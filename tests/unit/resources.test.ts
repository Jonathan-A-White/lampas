// The study resource registry (src/resources/): each resource has a unique id and builds well-formed https or app-scheme
// URLs for a fixture word; the choices are kept in the settings store.
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getStudyResources, setResourceOption, setResourceOn } from '../../src/data/repositories';
import { RESOURCES, optionOf, resourceOf, type StudyWord } from '../../src/resources';

const WORD: StudyWord = { form: 'συνεργεῖ', lemma: 'συνεργέω', strongs: 'G4903' };
/** βίβλος, tapped at Acts 19:19 */
const BIBLOS: StudyWord = { form: 'βίβλους', lemma: 'βίβλος', strongs: 'G976', ref: { book: 'act', chapter: 19, verse: 19 } };
const BIBLOS_URL = encodeURIComponent('βίβλος');
/** Logos names a Greek lemma lbs/el/<lemma>, its slashes escaped (Logos' own Copy-location form; docs/resources.md) */
const BIBLOS_LEMMA = encodeURIComponent('lbs/el/βίβλος');
const JESUS_LEMMA = 'lbs%2Fel%2F%E1%BC%B8%CE%B7%CF%83%CE%BF%E1%BF%A6%CF%82';
/** Ἰησοῦς, tapped as Ἰησοῦ at Romans 8:1 */
const JESUS: StudyWord = { form: 'Ἰησοῦ', lemma: 'Ἰησοῦς', strongs: 'G2424', ref: { book: 'rom', chapter: 8, verse: 1 } };

describe('the registry', () => {
  it('lists Strong\'s, Logos and Accordance with distinct ids and a name and a description each', () => {
    expect(RESOURCES.map((r) => r.id)).toEqual(['strongs', 'logos', 'accordance']);
    expect(new Set(RESOURCES.map((r) => r.id)).size).toBe(RESOURCES.length);
    for (const r of RESOURCES) {
      expect(r.name).not.toBe('');
      expect(r.describe).not.toBe('');
      expect(resourceOf(r.id)).toBe(r);
    }
  });

  it('builds well-formed https or app-scheme links with a label each for a fixture word', () => {
    for (const r of RESOURCES) {
      const links = r.linksFor(WORD, optionOf(r, undefined));
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.label).not.toBe('');
        const url = new URL(link.url);
        expect(['https:', 'accord:', 'logos4:', 'logosres:']).toContain(url.protocol);
        expect(link.url).not.toMatch(/\s|[^\x21-\x7e]/);
      }
    }
  });

  it('builds the Strong\'s link to the STEPBible entry with the number padded to four digits', () => {
    expect(resourceOf('strongs')?.linksFor(WORD)).toEqual([{ label: 'G4903', url: 'https://www.stepbible.org/?q=strong=G4903' }]);
    expect(resourceOf('strongs')?.linksFor({ ...WORD, strongs: 'G25' })[0].url).toBe('https://www.stepbible.org/?q=strong=G0025');
  });

  it('links the Strong\'s numbers STEPBible writes with a letter (G2424 is Jesus: STEP finds only G2424G) and leaves the others bare', () => {
    const url = (strongs: string) => resourceOf('strongs')?.linksFor({ ...WORD, strongs })[0].url;
    expect(url('G1722')).toBe('https://www.stepbible.org/?q=strong=G1722');
    expect(url('G3361')).toBe('https://www.stepbible.org/?q=strong=G3361');
    expect(url('G2424')).toBe('https://www.stepbible.org/?q=strong=G2424G');
    expect(resourceOf('strongs')?.linksFor({ ...WORD, strongs: 'G2424' })[0].label).toBe('G2424');
    expect(url('G129')).toBe('https://www.stepbible.org/?q=strong=G0129G');
    expect(url('G68')).toBe('https://www.stepbible.org/?q=strong=G0068G');
  });

  it('links a number STEPBible lists no verses for (G1228, the devil) to its lexicon entry instead', () => {
    expect(resourceOf('strongs')?.linksFor({ ...WORD, strongs: 'G1228' })[0]).toEqual({ label: 'G1228', url: 'https://www.blueletterbible.org/lexicon/g1228/kjv/tr/0-1/' });
    // TBESG's own numbers past Strong's list (G6029, G6856, G6897) have no entry there: no link rather than the page for G1
    expect(resourceOf('strongs')?.linksFor({ ...WORD, strongs: 'G6856' })).toEqual([]);
  });

  it('builds Logos links by its own scheme first: one Open link per ticked lexicon and the Bible Word Study at the verse', () => {
    const links = resourceOf('logos')?.linksFor(BIBLOS, 'bdag,louwnida') ?? [];
    expect(links.map((l) => l.label)).toEqual(['Open in Logos: BDAG', 'Open in Logos: Louw-Nida', 'Bible Word Study in Logos']);
    expect(links[0].url).toBe(`logosres:bdag;hw=${BIBLOS_URL}`);
    expect(links[1].url).toBe(`logosres:louwnida;hw=${BIBLOS_URL}`);
    expect(links[2].url).toBe(`logos4:Guide;t=Bible%20Word%20Study;lemma=${BIBLOS_LEMMA};ref=Bible.Ac19.19`);
  });

  it('gives every Logos link its https address as the fallback, used only when the scheme cannot open', () => {
    const links = resourceOf('logos')?.linksFor(BIBLOS, 'bdag') ?? [];
    expect(links[0].fallback).toBe(`https://ref.ly/logosres/bdag?hw=${BIBLOS_URL}`);
    expect(links[1].fallback).toBe(`https://ref.ly/logos4/Guide;t=Bible%20Word%20Study;lemma=${BIBLOS_LEMMA};ref=Bible.Ac19.19`);
    for (const link of links) expect(new URL(link.fallback ?? '').protocol).toBe('https:');
  });

  it('names the lemma the way Logos does, lbs/el/<lemma> with its slashes escaped, for Ἰησοῦς alone and at Romans 8:1', () => {
    const alone = resourceOf('logos')?.linksFor({ ...JESUS, ref: undefined }, '') ?? [];
    expect(alone[0].url).toBe(`logos4:Guide;t=Bible%20Word%20Study;lemma=${JESUS_LEMMA}`);
    expect(alone[0].fallback).toBe(`https://ref.ly/logos4/Guide;t=Bible%20Word%20Study;lemma=${JESUS_LEMMA}`);
    const atVerse = resourceOf('logos')?.linksFor(JESUS, '') ?? [];
    expect(atVerse[0].url).toBe(`logos4:Guide;t=Bible%20Word%20Study;lemma=${JESUS_LEMMA};ref=Bible.Ro8.1`);
    expect(atVerse[0].fallback).toBe(`https://ref.ly/logos4/Guide;t=Bible%20Word%20Study;lemma=${JESUS_LEMMA};ref=Bible.Ro8.1`);
  });

  it('leaves the verse out of the Bible Word Study link when the word has none, and builds no lexicon link for none ticked', () => {
    const links = resourceOf('logos')?.linksFor(WORD, '') ?? [];
    expect(links.map((l) => l.label)).toEqual(['Bible Word Study in Logos']);
    expect(links[0].url).not.toContain('ref=');
  });

  it('lists his lexicons as data, in the order Logos shows them, each with a Logos resource id', () => {
    const items = resourceOf('logos')?.choices?.items ?? [];
    expect(items.length).toBe(21);
    expect(items.slice(0, 2).map((i) => i.name)).toEqual(['BDAG', 'Louw-Nida']);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(resourceOf('logos')?.choices?.default).toEqual(['bdag']);
  });

  it('reads the ticks kept for Logos, and BDAG alone when none were kept', () => {
    const logos = resourceOf('logos');
    if (!logos) throw new Error('no Logos');
    expect(optionOf(logos, undefined)).toBe('bdag');
    expect(optionOf(logos, JSON.stringify(['louwnida', 'bdag']))).toBe('bdag,louwnida');
    expect(optionOf(logos, '[]')).toBe('');
    expect(optionOf(logos, 'not json')).toBe('bdag');
  });

  it('puts the named module and the encoded word into the Accordance link by its accord: scheme, BDAG when the name is empty', () => {
    const lemma = encodeURIComponent('συνεργέω');
    expect(resourceOf('accordance')?.linksFor(WORD, 'LSJ')[0].url).toBe(`accord://search/LSJ?${lemma}`);
    expect(resourceOf('accordance')?.linksFor(WORD, '  ')[0].url).toBe(`accord://search/BDAG?${lemma}`);
    expect(resourceOf('accordance')?.linksFor(BIBLOS, 'BDAG')[0].url).toBe(`accord://search/BDAG?${BIBLOS_URL}`);
  });
});

describe('the kept choices', () => {
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
  });

  it('starts with every resource off and the default option', async () => {
    expect(await getStudyResources()).toEqual({ on: [], options: {} });
  });

  it('keeps a switch and a named option, and turns a switch off again', async () => {
    await setResourceOn('strongs', true);
    await setResourceOn('logos', true);
    await setResourceOption('logos', '["louwnida"]');
    expect(await getStudyResources()).toEqual({ on: ['logos', 'strongs'], options: { logos: '["louwnida"]' } });
    await setResourceOn('strongs', false);
    expect((await getStudyResources()).on).toEqual(['logos']);
  });
});
