// mw-gdcyf98.1, .18: the Bible talk on an 'hbo' chapter sends the chapter's Hebrew, pointed and with the cantillation off, under `hebrew` with `hebrew_words` (lemma, transliteration, gloss,
// parsing) and no `greek` and no greek_words: no Greek syllable or respelling is ever made of a Hebrew word. A Greek chapter's request is as it was.
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { hebrewPointedForm } from '../../src/speech/hebrewPronunciation';
import { greekWordsOf } from '../../src/services/greekWords';
import { buildTalkRequest, fitHistory } from '../../src/services/talk';
import { HEBREW_WORDS_BYTES } from '../../src/services/hebrewWords';
import { MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { jsonBytes } from 'voice-kit/talks';
import { fetchPassages, passageOf } from '../../src/services/talkFetch';
import { clipNewestHeldPassage, clipPassageText, dropFarthestVerse, trimGreekWords } from '../../src/services/talkFit';

const jonah = JSON.parse(readFileSync('public/data/jon/1.json', 'utf8')) as Chapter;
const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse = (c: Chapter, n: number) => c.verses.find((v) => v.n === n)!;
const CANTILLATION = /[֑-֯]/;
// the Hebrew dial at Curious: from there the talk on an Old Testament chapter sends its Hebrew; at 0 (Just English) it sends the English alone
const CURIOUS = { hebrewInterest: '1' };

describe('the Bible talk on an Old Testament chapter', () => {
  it('has Hebrew with cantillation marks in the fixture, so the test below means something', () => {
    expect(jonah.verses.some((v) => v.g.some((w) => CANTILLATION.test(w.t)))).toBe(true);
  });

  it('sends the held verse as `hebrew`, pointed, cantillation off, with its words and no greek, no greek_words', () => {
    const r = buildTalkRequest({ title: 'Jonah 1', chapter: jonah, verse: verse(jonah, 10) }, 'What does the Hebrew say for fear?', [], [], CURIOUS);
    expect(r.hebrew).toBe(verse(jonah, 10).g.map((w) => hebrewPointedForm(w.t)).join(' '));
    expect(r.hebrew).toContain('הָאֲנָשִׁים');
    expect(r.hebrew).not.toMatch(CANTILLATION);
    expect('greek' in r).toBe(false);
    expect('greek_words' in r).toBe(false);
    expect(r.verses).toBe('1:10');
    const fear = r.hebrew_words?.find((w) => w.lemma === 'יָרֵא');
    expect(fear).toMatchObject({ lemma: 'יָרֵא', gloss: 'to fear' });
    expect(fear?.translit).toBeTruthy();
    expect(fear?.parse).toContain('Verb - Qal');
  });

  it('sends the chapter\'s first verses the same way when the talk is about the whole chapter', () => {
    const r = buildTalkRequest({ title: 'Jonah 1', chapter: jonah, verse: null }, 'What is this chapter about?', [], [], CURIOUS);
    expect(r.hebrew).toBeTruthy();
    expect(r.hebrew).not.toMatch(CANTILLATION);
    expect(r.hebrew_words?.length).toBeGreaterThan(0);
    expect('greek' in r).toBe(false);
    expect('greek_words' in r).toBe(false);
  });

  it('sends the English alone, and no Hebrew, at Hebrew 0 (Just English), and tells the tutor the dial', () => {
    const r = buildTalkRequest({ title: 'Jonah 1', chapter: jonah, verse: null }, 'What does it say?', [], [], { hebrewInterest: '0' });
    expect('hebrew' in r || 'hebrew_words' in r || 'greek' in r || 'greek_words' in r).toBe(false);
    expect(r.english).toContain('word of the LORD came to Jonah');
    expect(r.verses).toBe('1:1-3');
    expect(r.hebrew_interest).toEqual({ level: 0, name: 'Just English', next: { level: 1, name: 'Curious' } });
    // the English is the only text it holds, so it is what the fit clips from its end
    const clipped = clipPassageText({ ...r, english: r.english!.repeat(8) })!;
    expect(clipped.english!.length).toBeLessThan(r.english!.length * 8);
    expect('hebrew' in clipped || 'greek' in clipped).toBe(false);
  });

  it('keeps the hebrew_words within its budget and the request under the cap', () => {
    const r = buildTalkRequest({ title: 'Jonah 1', chapter: jonah, verse: null }, 'What is this chapter about?', jonah.verses.slice(0, 3).map(() => ({ q: 'q', a: 'a'.repeat(300) })), [], CURIOUS);
    expect(jsonBytes(r.hebrew_words)).toBeLessThanOrEqual(HEBREW_WORDS_BYTES);
    expect(jsonBytes(fitHistory(r))).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('gives up the verse farthest from the talk with its Hebrew words, and keeps the key `hebrew`', () => {
    const named = buildTalkRequest({ title: 'Jonah 1', chapter: jonah, verse: null }, 'Compare verses 1-6.', [], [], CURIOUS);
    expect(named.verses).toBe('1:1-7');
    const next = dropFarthestVerse(named)!;
    expect(next.verses).toBe('1:1-6');
    expect(next.hebrew!.length).toBeLessThan(named.hebrew!.length);
    expect(named.hebrew!.startsWith(next.hebrew!)).toBe(true);
    expect(next.hebrew_words!.length).toBeLessThanOrEqual(named.hebrew_words!.length);
    expect(next.hebrew_words!.every((w) => next.hebrew!.split(' ').includes(w.form))).toBe(true);
    expect('greek' in next).toBe(false);
    // the last cut of the words goes from their end, whatever the language
    expect(trimGreekWords(named)!.hebrew_words).toEqual(named.hebrew_words!.slice(0, -1));
  });

  it('makes no greek_words of a chapter that is not Greek', () => {
    expect(greekWordsOf(jonah, jonah.verses, '', 'modern', 4400)).toEqual([]);
    expect(greekWordsOf(rom8, [verse(rom8, 28)], '', 'modern', 4400).length).toBeGreaterThan(0);
  });

  it('strips a fetched Old Testament passage the same way, under `hebrew`', async () => {
    const held = passageOf('jon', 1, [verse(jonah, 10)], 'hbo');
    expect(held.reference).toBe('Jonah 1:10');
    expect(held.hebrew).toBe(verse(jonah, 10).g.map((w) => hebrewPointedForm(w.t)).join(' '));
    expect(held.hebrew).not.toMatch(CANTILLATION);
    expect('greek' in held).toBe(false);
    // a fetch of a chapter reads the chapter's language (an Old Testament reference is still left out by wantedOf, so it is not asked for yet)
    expect(passageOf('rom', 8, [verse(rom8, 28)]).greek).toBe(verse(rom8, 28).g.map((w) => w.t).join(' '));
    expect(await fetchPassages(['Romans 8:28'], () => Promise.resolve(rom8))).toEqual([passageOf('rom', 8, [verse(rom8, 28)])]);
  });

  it('carries a held Old Testament passage to the request and fits it by clipping `hebrew`', () => {
    const held = { ...passageOf('jon', 1, jonah.verses.slice(0, 6), 'hbo'), english: 'Short English.' };
    const r = buildTalkRequest({ title: 'Jonah 1', chapter: jonah, verse: verse(jonah, 10) }, 'And what came before?', [{ q: 'q', a: 'a', fetched: [held] }], [], CURIOUS);
    expect(r.held_passages).toEqual([held]);
    const clipped = clipNewestHeldPassage(r)!;
    const [kept] = clipped.held_passages!;
    expect(kept.hebrew!.length).toBeLessThan(held.hebrew!.length);
    expect(kept.hebrew!.length).toBeGreaterThanOrEqual(600);
    expect(kept.english).toBe(held.english);
    expect('greek' in kept).toBe(false);
  });
});

describe('the Bible talk on a Greek chapter', () => {
  it('is as it was: the request of Romans 8:28 is byte for byte the same', () => {
    const r = buildTalkRequest({ title: 'Romans 8', chapter: rom8, verse: verse(rom8, 28) }, 'Why does it say all things?', [], []);
    expect(r.greek).toBe(verse(rom8, 28).g.map((w) => w.t).join(' '));
    expect(r.greek_words?.length).toBeGreaterThan(0);
    // the one field added since (mw-gdcyf98.3) is hebrew_interest, beside greek_interest; with it taken out the request is the bytes it was
    const { hebrew_interest: hebrew, ...before } = r;
    expect(hebrew).toEqual({ level: 0, name: 'Just English', next: { level: 1, name: 'Curious' } });
    const sha = createHash('sha256').update(JSON.stringify(before)).digest('hex');
    expect(sha).toBe('afe0c5b037583144be4268b7a5d092a53848965db7275eb6facd3b60de564af0');
  });
});
