// The Bible talk's fit as an ordered list of cuts on voice-kit's fitRequest (mw-o480n1.6): fitHistory keeps its signature and every result the other
// tests pin (talk-request, talk-summary, memory-grist, talk-verses); this file pins the list itself, in the order the cuts are taken.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fitRequest } from 'voice-kit/talks';
import { type Chapter } from '../../src/data/chapter';
import { MAX_REQUEST_BYTES, buildTalkRequest, fitHistory, type TalkRequest } from '../../src/services/talk';
import { bibleTalkSteps, talkBytes } from '../../src/services/talkFit';

const rev2 = JSON.parse(readFileSync('public/data/rev/2.json', 'utf8')) as Chapter;
const size = (r: TalkRequest) => new TextEncoder().encode(JSON.stringify(r)).length;
const scope = { title: 'Revelation 2', chapter: rev2, verse: null };
const settings = Object.fromEntries(Array.from({ length: 140 }, (_, i) => [`setting${i}`, 'a value of some length']));
const turns = (n: number, chars: number) => Array.from({ length: n }, (_, i) => ({ q: `Question ${i}`, a: 'x'.repeat(chars) }));

describe('the steps of the Bible talk\'s fit', () => {
  it('are named for what each cuts, in the order they are taken', () => {
    expect(bibleTalkSteps(0).map((s) => s.name)).toEqual([
      'clipLongAnswer',
      'dropPronunciationGuide',
      'trimGreekWordsWhileHistory',
      'trimShelfDigest',
      'dropOldestHeldPassage',
      'dropFarthestVerse',
      'clipPassageText',
      'foldOldestTurn',
      'dropFoldTail',
      'trimGreekWords',
      'dropOldestRequest',
      'dropLastNote',
      'dropDrillAnswer',
      'dropNewestTurn',
      'dropSummary',
    ]);
  });

  it('a request over the cap only by a long passage loses whole verses before any turn', () => {
    const request = buildTalkRequest(scope, 'Tell me about Revelation 2:9', turns(10, 300), [], settings);
    expect(size(request)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitRequest(request, bibleTalkSteps(0), { maxBytes: MAX_REQUEST_BYTES });
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.verses).not.toBe(request.verses);
    expect(fitted.history).toHaveLength(request.history.length);
    expect(fitted.fold ?? []).toEqual([]);
  });

  it('a request over by history alone keeps its text', () => {
    const request = buildTalkRequest({ title: 'Revelation 2', chapter: rev2, verse: rev2.verses.find((v) => v.n === 9)! }, 'Why?', turns(10, 1200), []);
    expect(size(request)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitRequest(request, bibleTalkSteps(0), { maxBytes: MAX_REQUEST_BYTES });
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.greek).toBe(request.greek);
    expect(fitted.english).toBe(request.english);
    expect(fitted.verses).toBe(request.verses);
  });

  it('fitHistory is fitRequest over the steps, weighed with the talk\'s name', () => {
    const request = buildTalkRequest(scope, 'Tell me about Revelation 2:9', turns(10, 300), [], settings);
    const viaSteps = fitRequest(request, bibleTalkSteps(2), { maxBytes: MAX_REQUEST_BYTES, extraBytes: talkBytes('rom.8@1') });
    expect(fitHistory(request, 2, 'rom.8@1')).toEqual(viaSteps);
    expect(talkBytes(undefined)).toBe(0);
    expect(talkBytes('rom.8@1')).toBe(new TextEncoder().encode(',"talk":"rom.8@1"').length);
  });
});
