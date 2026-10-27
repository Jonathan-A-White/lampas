// mw-gdcyf98.1: the Bible talk on an 'hbo' chapter sends the chapter's Hebrew, pointed and with the cantillation off, under `greek` (until story j1 names it `hebrew`) and no
// greek_words: no Greek syllable or respelling is ever made of a Hebrew word. A Greek chapter's request is as it was.
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { hebrewPointedForm } from '../../src/speech/hebrewPronunciation';
import { greekWordsOf } from '../../src/services/greekWords';
import { buildTalkRequest } from '../../src/services/talk';
import { fetchPassages, passageOf } from '../../src/services/talkFetch';

const jonah = JSON.parse(readFileSync('public/data/jon/1.json', 'utf8')) as Chapter;
const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse = (c: Chapter, n: number) => c.verses.find((v) => v.n === n)!;
const CANTILLATION = /[֑-֯]/;

describe('the Bible talk on an Old Testament chapter', () => {
  it('has Hebrew with cantillation marks in the fixture, so the test below means something', () => {
    expect(jonah.verses.some((v) => v.g.some((w) => CANTILLATION.test(w.t)))).toBe(true);
  });

  it('sends the held verse pointed, cantillation off, and no greek_words', () => {
    const r = buildTalkRequest({ title: 'Jonah 1', chapter: jonah, verse: verse(jonah, 10) }, 'What does the Hebrew say for fear?', [], []);
    expect(r.greek).toBe(verse(jonah, 10).g.map((w) => hebrewPointedForm(w.t)).join(' '));
    expect(r.greek).toContain('הָאֲנָשִׁים');
    expect(r.greek).not.toMatch(CANTILLATION);
    expect('greek_words' in r).toBe(false);
  });

  it('sends the chapter\'s first verses the same way when the talk is about the whole chapter', () => {
    const r = buildTalkRequest({ title: 'Jonah 1', chapter: jonah, verse: null }, 'What is this chapter about?', [], []);
    expect(r.greek).not.toBe('');
    expect(r.greek).not.toMatch(CANTILLATION);
    expect('greek_words' in r).toBe(false);
  });

  it('makes no greek_words of a chapter that is not Greek', () => {
    expect(greekWordsOf(jonah, jonah.verses, '', 'modern', 4400)).toEqual([]);
    expect(greekWordsOf(rom8, [verse(rom8, 28)], '', 'modern', 4400).length).toBeGreaterThan(0);
  });

  it('strips a fetched Old Testament passage the same way', async () => {
    const held = passageOf('jon', 1, [verse(jonah, 10)], 'hbo');
    expect(held.reference).toBe('Jonah 1:10');
    expect(held.greek).toBe(verse(jonah, 10).g.map((w) => hebrewPointedForm(w.t)).join(' '));
    expect(held.greek).not.toMatch(CANTILLATION);
    // a fetch of a chapter reads the chapter's language (an Old Testament reference is still left out by wantedOf, so it is not asked for yet)
    expect(passageOf('rom', 8, [verse(rom8, 28)]).greek).toBe(verse(rom8, 28).g.map((w) => w.t).join(' '));
    expect(await fetchPassages(['Romans 8:28'], () => Promise.resolve(rom8))).toEqual([passageOf('rom', 8, [verse(rom8, 28)])]);
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
