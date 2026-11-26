// mw-fnvjof.17.314: his 'Talk about Isaiah 1' sent the tutor the chapter's first three verses (CHAPTER_VERSES), which the request's byte ceiling cut to two once the settings and a
// history were in it, so the tutor said 'I hold only verses 1 and 2'. A chapter is never in a request whole (Isaiah 1 pointed Hebrew and English weighs about 12 KB, the ceiling
// is MAX_REQUEST_BYTES), so the rest of it is a fetch away: and a fetch read the New Testament only (wantedOf), which shut that way for an Old Testament chapter.
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { type Chapter, markSupplied } from '../../src/data/chapter';
import { MAX_REQUEST_BYTES, buildTalkRequest, fitHistory, type TalkRequest } from '../../src/services/talk';
import { fetchOutcome, fetchPassages, heldPassagesOf, wantedOf } from '../../src/services/talkFetch';
import { stubChapterFetch } from '../support/chapter-fetch';

const isa1 = JSON.parse(readFileSync('public/data/isa/1.json', 'utf8')) as Chapter;
const size = (r: TalkRequest) => new TextEncoder().encode(JSON.stringify(r)).length;
const settings = { hebrewInterest: 3, ...Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`setting${i}`, 'a value of some length'])) } as never;
const turns = Array.from({ length: 6 }, (_, i) => ({ q: `Question ${i}`, a: 'x'.repeat(400) }));
const scope = { title: 'Isaiah 1', chapter: isa1, verse: null };

beforeEach(() => {
  stubChapterFetch();
});

describe('a talk about an Old Testament chapter (Isaiah 1)', () => {
  it('holds the chapter\'s opening verses under the ceiling and says which, so the tutor knows the rest is not held', () => {
    const request = fitHistory(buildTalkRequest(scope, 'What is this chapter about?', turns, [], settings));
    expect(size(request)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(request.verses).toMatch(/^1:1(-\d+)?$/);
  });

  it('a question about 1:9 holds verse 9 (and its neighbours): no "I hold only" there', () => {
    const request = fitHistory(buildTalkRequest(scope, 'What quotes Isaiah 1:9?', turns, [], settings));
    expect(size(request)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    const [first, last] = request.verses!.replace('1:', '').split('-').map(Number);
    expect(first).toBeLessThanOrEqual(9);
    expect(last ?? first).toBeGreaterThanOrEqual(9);
    expect(request.english).toContain(isa1.verses.find((v) => v.n === 9)!.e.map(markSupplied).join(' '));
  });

  it('the rest of the chapter is a fetch away: Isaiah 1:9 is read from the app\'s own data, in Hebrew and English', async () => {
    expect(wantedOf(['Isaiah 1:9'])).toEqual([{ book: 'isa', chapter: 1, from: 9, to: 9 }]);
    const [held] = await fetchPassages(['Isaiah 1:9']);
    const verse = isa1.verses.find((v) => v.n === 9)!;
    expect(held.reference).toBe('Isaiah 1:9');
    expect(held.english).toBe(verse.e.map(markSupplied).join(' '));
    expect(held.hebrew).toBeTruthy();
    expect(held).not.toHaveProperty('greek');
  });

  it('a verse read so is held by the next request, under its byte budget', async () => {
    const fetched = await fetchPassages(['Isaiah 1:9-10']);
    const request = fitHistory(buildTalkRequest(scope, 'Go on', [{ q: 'Who quotes it?', a: 'Paul.', fetched }], [], settings));
    expect(request.held_passages?.map((p) => p.reference)).toEqual(['Isaiah 1:9-10']);
    expect(heldPassagesOf([{ fetched }])).toHaveLength(1);
    expect(size(request)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('a book of the Old Testament that is not there, or a chapter it lacks, is still unread', async () => {
    const { read, unread } = await fetchOutcome(['Isaiah 1:9', 'Isaiah 99:1', 'Hezekiah 1:1']);
    expect(read.map((p) => p.reference)).toEqual(['Isaiah 1:9']);
    expect(unread).toEqual(['Isaiah 99:1', 'Hezekiah 1:1']);
  });
});
