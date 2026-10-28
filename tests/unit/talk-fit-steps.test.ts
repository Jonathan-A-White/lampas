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
      'dropMaps',
      'dropVariants',
      'dropOlderHeldPassage',
      'dropRusty',
      'dropToday',
      'dropSolidWords',
      'dropFarthestVerse',
      'clipPassageText',
      'foldToLastThreeTurns',
      'dropFoldTail',
      'trimGreekWords',
      'dropOldestRequest',
      'dropLastNote',
      'dropDrillAnswer',
      'clipNewestHeldPassage',
      'foldOldestTurn',
      'dropFoldTail',
      'dropNewestHeldPassage',
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

  // mw-5r3p30.825: the newest fetched passage and the last three turns are what the fit gives up last, ahead of every lesser field
  describe('the newest fetched passage and the last three turns outlast the lesser fields', () => {
    const passage = (reference: string, fill: number) => ({ reference, greek: 'λόγος '.repeat(fill).trim(), english: 'word '.repeat(fill).trim() });
    const newest = passage('Revelation 6:2-8', 250);
    const older = passage('Hebrews 7:1-3', 250);
    const heavy = (): TalkRequest => ({
      // a short verse: the talk's own text has nothing to give before the turns do
      ...buildTalkRequest({ title: 'Revelation 2:25', chapter: rev2, verse: rev2.verses.find((v) => v.n === 25)! }, 'Go on', turns(6, 200), []),
      // the guide and the word list go first, whatever else is held
      pronunciation_guide: undefined,
      greek_words: [],
      held_passages: [newest, older],
      rusty: Array.from({ length: 8 }, (_, i) => ({ kind: 'word' as const, id: `w${i}`, title: `λέγω${i}`, why: 'slipped twice this week and not seen for a long while' })),
      today: Array.from({ length: 6 }, (_, i) => ({ kind: 'review' as const, title: `Review: ${i + 17} due`, done: false })),
      solid_words: Array.from({ length: 50 }, (_, i) => `λόγος${i}`),
    });
    /** What is left when only the lesser fields, the older passage and the three oldest turns are gone. */
    const lean = (r: TalkRequest): TalkRequest => {
      const rest = { ...r, held_passages: [newest], history: r.history.slice(-3), solid_words: [] as string[] };
      delete rest.rusty;
      delete rest.today;
      return rest;
    };

    it('a request over the cap loses the older passage, rusty, Today, the solid words and the three oldest turns, and keeps the rest whole', () => {
      const request = heavy();
      const budget = size(lean(request));
      expect(size(request)).toBeGreaterThan(budget + 1500);
      const fitted = fitRequest(request, bibleTalkSteps(0), { maxBytes: budget });
      expect(size(fitted)).toBeLessThanOrEqual(budget);
      expect(fitted.held_passages).toEqual([newest]);
      expect(fitted.history).toEqual(request.history.slice(-3));
      expect(fitted.rusty).toBeUndefined();
      expect(fitted.today).toBeUndefined();
      expect(fitted.solid_words).toEqual([]);
      expect(fitted.solid_count).toBe(request.solid_count);
    });

    it('a little less room clips the newest passage (its reference stays, its text ends in the clip mark) before the third turn goes', () => {
      const request = heavy();
      const budget = size(lean(request)) - 400;
      const fitted = fitRequest(request, bibleTalkSteps(0), { maxBytes: budget });
      expect(size(fitted)).toBeLessThanOrEqual(budget);
      expect(fitted.history).toEqual(request.history.slice(-3));
      expect(fitted.held_passages).toHaveLength(1);
      expect(fitted.held_passages?.[0].reference).toBe('Revelation 6:2-8');
      expect(fitted.held_passages?.[0].greek!.length).toBeLessThan(newest.greek.length);
      expect(fitted.held_passages?.[0].greek!.endsWith(' …')).toBe(true);
    });
  });
});
