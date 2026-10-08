// The request the bible-talk grind is sent: the scope's text, the last 10 turns, and a fit to the grist's size cap.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { MAX_HISTORY_TURNS, MAX_REQUEST_BYTES, MAX_TALK_CHARS, buildTalkRequest, fitHistory, type TalkRequest } from '../../src/services/talk';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const turn = (i: number, a = `Answer ${i}`) => ({ q: `Question ${i}`, a });
const size = (r: TalkRequest) => new TextEncoder().encode(JSON.stringify(r)).length;

describe('buildTalkRequest', () => {
  it('about a verse: its reference, its Greek and English', () => {
    const verse = chapter.verses.find((v) => v.n === 9);
    if (!verse) throw new Error('no verse 9');
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse }, '  Why?  ', [], ['θεός']);
    expect(r.reference).toBe('Romans 8:9');
    expect(r.greek).toBe(verse.g.map((w) => w.t).join(' '));
    expect(r.english).toBe(verse.e.map((c) => c.t.trim()).join(' '));
    expect(r.question).toBe('Why?');
    expect(r.solid_words).toEqual(['θεός']);
    expect(r.history).toEqual([]);
  });

  it('about the chapter: the reference is the chapter and the text is its first three verses', () => {
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'Why?', [], []);
    expect(r.reference).toBe('Romans 8');
    expect(r.greek).toBe(chapter.verses.slice(0, 3).map((v) => v.g.map((w) => w.t).join(' ')).join(' '));
    expect(r.english).toBe(chapter.verses.slice(0, 3).map((v) => v.e.map((c) => c.t.trim()).join(' ')).join(' '));
  });

  it('sends only the last 10 turns, oldest first', () => {
    const turns = Array.from({ length: 13 }, (_, i) => turn(i + 1));
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'Why?', turns, []);
    expect(MAX_HISTORY_TURNS).toBe(10);
    expect(r.history.map((t) => t.q)).toEqual(Array.from({ length: 10 }, (_, i) => `Question ${i + 4}`));
  });

  it('carries the settings as they stand, so a talk can say "slower" from where they are', () => {
    const r = buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'Why?', [], [], { greekRate: 1, theme: 'phone' });
    expect(r.settings).toEqual({ greekRate: 1, theme: 'phone' });
    expect(buildTalkRequest({ title: 'Romans 8', chapter, verse: null }, 'Why?', [], []).settings).toEqual({});
  });

  it('keeps a question to 600 characters', () => {
    expect(MAX_TALK_CHARS).toBe(600);
  });
});

describe('fitHistory', () => {
  const base = (history: TalkRequest['history']): TalkRequest => ({ reference: 'Romans 8', greek: 'α'.repeat(300), english: 'x'.repeat(300), question: 'Why?', history, solid_words: [], settings: { greekRate: 1 } });

  it('leaves a request that fits as it is', () => {
    const r = base(Array.from({ length: 10 }, (_, i) => turn(i)));
    expect(fitHistory(r)).toEqual(r);
  });

  it('clips the oldest long answers first and then drops the oldest turns, until the request fits', () => {
    const long = 'y'.repeat(1500);
    const r = base(Array.from({ length: 10 }, (_, i) => turn(i, long)));
    expect(size(r)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitHistory(r);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    // the newest turn is whole, the oldest was clipped or dropped
    expect(fitted.history[fitted.history.length - 1]).toEqual(turn(9, long));
    expect(fitted.history[0].a.length).toBeLessThan(long.length);
    // what is kept is still in order and ends with the newest
    expect(fitted.history.map((t) => t.q)).toEqual(r.history.slice(r.history.length - fitted.history.length).map((t) => t.q));
  });

  it('drops the whole history when even one clipped turn cannot fit', () => {
    const r = { ...base([turn(1, 'z'.repeat(1500))]), greek: 'α'.repeat(3600), english: 'x'.repeat(3600) };
    expect(fitHistory(r).history).toEqual([]);
  });
});
