// The study resource registry (src/resources/): each resource has a unique id and builds well-formed https or app-scheme
// URLs for a fixture word; the choices are kept in the settings store.
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getStudyResources, setResourceOption, setResourceOn } from '../../src/data/repositories';
import { RESOURCES, resourceOf, type StudyWord } from '../../src/resources';

const WORD: StudyWord = { form: 'συνεργεῖ', lemma: 'συνεργέω', strongs: 'G4903' };

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
      const links = r.linksFor(WORD, r.option?.default);
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

  it('puts the named resource and the encoded lemma into the Logos and Accordance links, and falls back to BDAG when the name is empty', () => {
    const lemma = encodeURIComponent('συνεργέω');
    expect(resourceOf('logos')?.linksFor(WORD, 'lsj')[0].url).toBe(`https://ref.ly/logosres/lsj?hw=${lemma}`);
    expect(resourceOf('logos')?.linksFor(WORD, '  ')[0].url).toBe(`https://ref.ly/logosres/bdag?hw=${lemma}`);
    expect(resourceOf('accordance')?.linksFor(WORD, 'LSJ')[0].url).toBe(`accord://search/LSJ?${lemma}`);
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
    await setResourceOption('logos', 'lsj');
    expect(await getStudyResources()).toEqual({ on: ['logos', 'strongs'], options: { logos: 'lsj' } });
    await setResourceOn('strongs', false);
    expect((await getStudyResources()).on).toEqual(['logos']);
  });
});
