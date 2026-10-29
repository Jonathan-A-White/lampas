// mw-gdcyf98.14: the reading check of a Hebrew verse. The Hebrew view of an Old Testament verse is read in Hebrew and scored in the Hebrew scheme's language ('he'); the request
// carries no Greek word; a woven Old Testament verse is read as shown, the Hebrew words in Hebrew and the English in English; a flagged Hebrew word is spoken in Hebrew; the
// words he missed are the reading drill.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter, Verse } from '../../src/data/chapter';
import { drillOffer } from '../../src/data/readingDrill';
import { hebrewUnit, missUnits } from '../../src/data/grammar/readingMisses';
import { weaveVerse, wovenInOrder, type WovenVerse } from '../../src/data/weave';
import { buildReadingRequest, readingLang, readingText, readingViewOf, sayOf, wordsOfText, wovenReading } from '../../src/services/reading';
import { DEFAULT_PRONUNCIATION } from '../../src/speech/pronunciation';
import { validate, type Schema } from '../support/schema-validate';
import '../support/grinds-in-graph';

const jonah = JSON.parse(readFileSync('public/data/jon/1.json', 'utf8')) as Chapter;
const jonah1 = jonah.verses.find((v) => v.n === 1) as Verse;
const input = JSON.parse(readFileSync('grinds/verse-read.input.schema.json', 'utf8')) as Schema;

describe('the reading of a Hebrew verse', () => {
  it('is the Hebrew view of an Old Testament chapter, and the Greek view of a New Testament one', () => {
    expect(readingViewOf('greek', 'hbo')).toBe('hebrew');
    expect(readingViewOf('greek', 'grc')).toBe('greek');
    expect(readingViewOf('english', 'hbo')).toBe('english');
  });

  it('is scored in he, the chosen Hebrew scheme’s scoringLang', () => {
    expect(readingLang('hebrew', undefined)).toBe('he');
    expect(readingLang('greek', undefined)).toBe('el');
    expect(readingLang('english', undefined)).toBe('en');
  });

  it('reads Jonah 1:1’s Hebrew words in order, pointed, without the cantillation marks', () => {
    const text = readingText(jonah1, 'hebrew');
    expect(wordsOfText(text)).toHaveLength(jonah1.g.length);
    expect(wordsOfText(text)[0]).toBe('וַיְהִי');
    expect(text).not.toMatch(/[֑-ֽ֯׃]/u);
  });

  it('sends lang he, the Hebrew words and NO greek_words on Jonah 1:1', () => {
    const request = buildReadingRequest('Jonah 1:1', jonah1, 'hebrew', 'he', undefined, undefined, undefined, DEFAULT_PRONUNCIATION, undefined, jonah);
    expect(request.lang).toBe('he');
    expect(request.target_text).toBe(readingText(jonah1, 'hebrew'));
    expect(request.greek_words).toBeUndefined();
    expect(request.segments).toBeUndefined();
    // the Hebrew scheme he chose speaks where the Greek one does (no new field)
    expect(request.pronunciation).toBe('israeli');
    expect(request.pronunciation_guide).toMatch(/Hebrew/);
    expect(validate(request, input)).toEqual([]);
  });

  it('sends none even when no chapter is at hand', () => {
    expect(buildReadingRequest('Jonah 1:1', jonah1, 'hebrew', 'he').greek_words).toBeUndefined();
  });
});

describe('a woven Old Testament verse', () => {
  // the first two Hebrew words shown in Hebrew, the rest of the verse in English
  const woven: WovenVerse = wovenInOrder(jonah1, weaveVerse(jonah1, { solid: new Set(jonah1.g.slice(0, 2).map((w) => w.l)) }), 'english');
  const weave = wovenReading([jonah1], [woven], 'he');

  it('is read in pieces: the Hebrew words in he and the English in en', () => {
    expect(weave).not.toBeNull();
    const langs = new Set(weave?.segments.map((s) => s.lang));
    expect(langs).toEqual(new Set(['he', 'en']));
    for (const piece of weave?.segments ?? []) {
      if (piece.lang === 'he') expect(piece.text).toMatch(/^[ְ-ת־\s]+$/u);
      else expect(piece.text).not.toMatch(/\p{Script=Hebrew}/u);
    }
  });

  it('is sent as segments en and he, lang en, with no greek_words', () => {
    const request = buildReadingRequest('Jonah 1:1', jonah1, 'english', 'en', undefined, undefined, undefined, DEFAULT_PRONUNCIATION, undefined, jonah, weave);
    expect(request.lang).toBe('en');
    expect(new Set(request.segments?.map((s) => s.lang))).toEqual(new Set(['en', 'he']));
    expect(request.target_text).toBe(weave?.segments.map((s) => s.text).join(' '));
    expect(request.greek_words).toBeUndefined();
    expect(request.pronunciation).toBe('israeli');
    expect(validate(request, input)).toEqual([]);
  });
});

describe('a flagged Hebrew word', () => {
  it('speaks the word as written, or the answer’s Hebrew `say`, and never a respelling in Latin letters', () => {
    expect(sayOf({ word: 'יוֹנָה' }, 'hebrew')).toBe('יוֹנָה');
    expect(sayOf({ word: 'יוֹנָה', say: 'יוֹנָה׳' }, 'hebrew')).toBe('יוֹנָה׳');
    expect(sayOf({ word: 'יוֹנָה', say: 'yo-NAH' }, 'hebrew')).toBe('יוֹנָה');
  });
});

describe('the drill of a Hebrew reading', () => {
  it('tallies the word he missed, pointed and without a maqaf or cantillation', () => {
    expect(hebrewUnit('דְּבַר־')).toBe('דְּבַר');
    expect(hebrewUnit('וַֽיְהִי֙')).toBe('וַיְהִי');
    expect(missUnits('he', [{ word: 'דְּבַר־', index: 1, chunks: ['דְּ', 'בַר'], tip: 'x' }])).toEqual(['דְּבַר']);
  });

  it('offers the missed words once two readings of five missed them, the most missed first', () => {
    const tally = [
      { lang: 'he', unit: 'יוֹנָה', count: 3 },
      { lang: 'he', unit: 'דְּבַר', count: 2 },
      { lang: 'he', unit: 'אֶל', count: 1 },
      { lang: 'el', unit: 'diphthong-ou', count: 4 },
    ];
    expect(drillOffer('he', tally)).toEqual({ kind: 'words', lang: 'he', words: ['יוֹנָה', 'דְּבַר', 'אֶל'] });
    expect(drillOffer('he', [{ lang: 'he', unit: 'אֶל', count: 1 }])).toBeNull();
  });
});
