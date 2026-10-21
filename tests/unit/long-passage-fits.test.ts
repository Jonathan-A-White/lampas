// A whole chapter opened from the Reader's place line (mw-5r3p30.699) is a passage no request holds: Quiz me and Ask the tutor on it are sent its start, clipped where
// they must be, and never over the cap (the grist was refused at 23 KB before).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { passageVerse, rangeOf } from '../../src/data/passage';
import { MAX_REQUEST_BYTES, buildTalkRequest, fitHistory } from '../../src/services/talk';
import { buildRequest, fitAsk } from '../../src/services/tutor';
import { clipText, clipTexts, TEXT_CLIP_MARK } from '../../src/services/requestBudget';

const mark12 = JSON.parse(readFileSync('public/data/mrk/12.json', 'utf8')) as Chapter;
const whole = passageVerse(rangeOf(mark12.verses, 1, 44, 'Mark 12')!);
const size = (r: object) => new TextEncoder().encode(JSON.stringify(r)).length;

describe('clipText', () => {
  it('leaves a short text alone and cuts a long one at a space, ending in the mark', () => {
    expect(clipText('In the beginning')).toBe('In the beginning');
    const long = 'word '.repeat(100).trim();
    const clipped = clipText(long);
    expect(clipped.endsWith(TEXT_CLIP_MARK)).toBe(true);
    expect(clipped.length).toBeLessThan(long.length);
    expect(long.startsWith(clipped.slice(0, -TEXT_CLIP_MARK.length))).toBe(true);
    expect(clipText(clipped).endsWith(TEXT_CLIP_MARK)).toBe(true);
  });

  it('clipTexts cuts nothing when it fits, and stops when nothing is left to cut', () => {
    const texts = { greek: 'α '.repeat(300), english: 'a '.repeat(300) };
    expect(clipTexts(texts, () => false)).toEqual(texts);
    const never = clipTexts(texts, () => true);
    expect(never.greek.length).toBeLessThanOrEqual(200 + TEXT_CLIP_MARK.length);
    expect(never.english.length).toBeLessThanOrEqual(200 + TEXT_CLIP_MARK.length);
  });
});

describe('a whole chapter as the passage', () => {
  it('the Bible talk quiz request fits the cap and keeps the start of the text', () => {
    const request = buildTalkRequest({ title: 'Mark 12', chapter: mark12, verse: whole, quiz: true }, 'Quiz me on Mark 12:1-44.', [], []);
    expect(size(request)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitHistory(request);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.reference).toBe('Mark 12:1-44');
    expect(fitted.question).toBe('Quiz me on Mark 12:1-44.');
    expect(fitted.greek).toBeDefined();
    expect(request.greek!.startsWith(fitted.greek!.replace(TEXT_CLIP_MARK, ''))).toBe(true);
    expect(fitted.english!.endsWith(TEXT_CLIP_MARK)).toBe(true);
  });

  it('a passage that fits is not cut', () => {
    const short = passageVerse(rangeOf(mark12.verses, 1, 3, 'Mark 12')!);
    const request = buildTalkRequest({ title: 'Mark 12', chapter: mark12, verse: short }, 'Why?', [], []);
    const fitted = fitHistory(request);
    expect(fitted.greek).toBe(request.greek);
    expect(fitted.english).toBe(request.english);
  });

  it('Ask the tutor fits the cap too', () => {
    const request = buildRequest('Mark 12:1-44', whole, 'Who are the tenants?', []);
    expect(size(request)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitAsk(request);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.question).toBe('Who are the tenants?');
    expect(fitted.greek.length).toBeLessThan(request.greek.length);
  });
});
