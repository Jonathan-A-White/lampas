// tests/unit/diagram-request.test.ts — buildDiagramRequest (src/diagram/request.ts, mw-souyao.2): the request the sentence-diagram grind is sent for a verse or a passage, and the words the
// renderer indexes. Proven on Colossians 3:1 in both modes (public/data/col/3.json) and on a two-verse passage.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { buildDiagramRequest } from '../../src/diagram/request';
import { validate, type Schema } from '../support/schema-validate';
import { loadFixture } from '../support/diagram-fixtures';
import '../support/grinds-in-graph';

const col3 = JSON.parse(readFileSync('public/data/col/3.json', 'utf8')) as Chapter;
const verse = (n: number) => col3.verses.find((v) => v.n === n)!;
const inputSchema = JSON.parse(readFileSync('grinds/sentence-diagram.input.schema.json', 'utf8')) as Schema;

describe('buildDiagramRequest, Colossians 3:1 in English', () => {
  const { request, words } = buildDiagramRequest(col3, [verse(1)], 'english');

  it('names the verse and the mode', () => {
    expect(request.ref).toBe('Colossians 3:1');
    expect(request.lang).toBe('english');
  });

  it('splits the chunks into words with the marks stripped, 23 of them', () => {
    expect(words).toHaveLength(23);
    expect(words.map((w) => w.text).join(' ')).toBe('Therefore since you have been raised with Christ strive for the things above where Christ is seated at the right hand of God');
    expect(request.words).toHaveLength(23);
  });

  it('gives each word the chunk it came from: the first Christ is chunk 3, the second chunk 8', () => {
    expect(words[7]).toEqual({ text: 'Christ', chunk: 3 });
    expect(words[14]).toEqual({ text: 'Christ', chunk: 8 });
    expect(request.words[7]).toEqual({ i: 7, text: 'Christ', chunk: 3 });
  });

  it('is the fixture\'s words', () => {
    expect(words).toEqual(loadFixture('english').words);
  });

  it('sends the verse\'s Greek words with their lemma and parse as context, each with the English chunk it is part of', () => {
    expect(request.greek).toHaveLength(17);
    expect(request.greek?.[4]).toEqual({ text: 'χριστῷ', lemma: 'Χριστός', parse: 'N-DSM', chunk: 3 });
    expect(request.greek?.[3]).toEqual({ text: 'τῷ', lemma: 'ὁ', parse: 'T-DSM' });
  });

  it('fits the grind\'s input schema', () => {
    expect(validate(request, inputSchema)).toEqual([]);
  });
});

describe('buildDiagramRequest, Colossians 3:1 in Greek', () => {
  const { request, words } = buildDiagramRequest(col3, [verse(1)], 'greek');

  it('has the verse\'s 17 Greek words, each with its own word index', () => {
    expect(words).toHaveLength(17);
    expect(words[4]).toEqual({ text: 'χριστῷ', word: 4 });
    expect(words).toEqual(loadFixture('greek').words);
  });

  it('sends the lemma and the parse of Χριστῷ, and no Greek context list of its own', () => {
    expect(request.lang).toBe('greek');
    expect(request.words[4]).toEqual({ i: 4, text: 'χριστῷ', lemma: 'Χριστός', parse: 'N-DSM' });
    expect(request.greek).toBeUndefined();
  });

  it('fits the grind\'s input schema', () => {
    expect(validate(request, inputSchema)).toEqual([]);
  });
});

describe('buildDiagramRequest, a passage', () => {
  const verses = [verse(1), verse(2)];
  const english = buildDiagramRequest(col3, verses, 'english');
  const greek = buildDiagramRequest(col3, verses, 'greek');

  it('names the passage by its first and last verse', () => {
    expect(english.request.ref).toBe('Colossians 3:1-2');
  });

  it('holds every verse\'s words in order, counted on through the passage', () => {
    const one = buildDiagramRequest(col3, [verse(1)], 'english').words.length;
    const two = buildDiagramRequest(col3, [verse(2)], 'english').words.length;
    expect(english.words).toHaveLength(one + two);
    expect(english.request.words.map((w) => w.i)).toEqual(english.words.map((_, i) => i));
    expect(greek.words).toHaveLength(17 + verse(2).g.length);
  });

  it('keeps each word\'s own verse-relative chunk or word index, and says which verse a word is of', () => {
    expect(english.words[0]).toEqual({ text: 'Therefore', chunk: 0, verse: 1 });
    const first = english.words.findIndex((w) => w.verse === 2);
    expect(first).toBe(23);
    expect(english.words[first]).toMatchObject({ chunk: 0, verse: 2 });
    expect(greek.words[17]).toMatchObject({ word: 0, verse: 2 });
  });

  it('fits the grind\'s input schema', () => {
    expect(validate(english.request, inputSchema)).toEqual([]);
    expect(validate(greek.request, inputSchema)).toEqual([]);
  });
});

describe('the words of a verse with marks', () => {
  it('strips the marks at a word\'s ends, keeps an elision or an apostrophe inside, and drops a mark on its own', () => {
    const chapter: Chapter = {
      ...col3,
      verses: [
        {
          n: 5,
          g: [
            { t: 'ἀφ\'', tr: '', s: 'G575', l: 'ἀπό', p: 'PREP' },
            { t: 'Σαμαρείτιδος;', tr: '', s: 'G4540', l: 'Σαμαρῖτις', p: 'N-GSF' },
          ],
          e: [{ t: '“Lord’s —', g: [0] }, { t: 'Samaria?”', g: [1] }],
        },
      ],
    };
    expect(buildDiagramRequest(chapter, chapter.verses, 'greek').words.map((w) => w.text)).toEqual(["ἀφ'", 'Σαμαρείτιδος']);
    expect(buildDiagramRequest(chapter, chapter.verses, 'english').words.map((w) => w.text)).toEqual(['Lord’s', 'Samaria']);
  });
});
