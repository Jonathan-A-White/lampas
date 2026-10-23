// The tutor asks for the text he needs without stopping the talk (mw-5r3p30.734): an answer may name passages in `fetch`; the app reads them from its own chapter data
// (the Greek, and the English the Reader shows) after the answer is shown, keeps them on the turn, and the next request carries them, newest first under a byte budget,
// as `held_passages`. These are the pure parts: what a fetch reads, the caps, the budget, the quiet line, and the request's field.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { type Chapter, markSupplied } from '../../src/data/chapter';
import { buildTalkRequest, fitHistory, isTalkAnswer, MAX_REQUEST_BYTES, type TalkRequest } from '../../src/services/talk';
import { FETCH_MAX_VERSES, fetchedLine, fetchPassages, HELD_PASSAGES_BYTES, heldPassagesOf, MAX_FETCH, wantedOf, type HeldPassage } from '../../src/services/talkFetch';
import { stubChapterFetch } from '../support/chapter-fetch';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Chapter;
const rev2 = read('public/data/rev/2.json');
const rom8 = read('public/data/rom/8.json');
const heb7 = read('public/data/heb/7.json');
const verseOf = (chapter: Chapter, n: number) => chapter.verses.find((v) => v.n === n)!;
const greekOf = (chapter: Chapter, ns: number[]) => ns.map((n) => verseOf(chapter, n).g.map((w) => w.t).join(' ')).join(' ');
const englishOf = (chapter: Chapter, ns: number[]) => ns.map((n) => verseOf(chapter, n).e.map(markSupplied).join(' ')).join(' ');
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
const size = (r: TalkRequest) => bytes(r);
const passage = (reference: string, fill = 10): HeldPassage => ({ reference, greek: 'λόγος '.repeat(fill).trim(), english: 'word '.repeat(fill).trim() });

beforeEach(() => {
  stubChapterFetch();
});

describe('what an answer\'s fetch reads', () => {
  it('reads the Greek and the English (the Reader\'s, supplied words marked) of the verses named, from the app\'s own chapter data', async () => {
    const [held] = await fetchPassages(['Revelation 2:8-11']);
    expect(held).toEqual({ reference: 'Revelation 2:8-11', greek: greekOf(rev2, [8, 9, 10, 11]), english: englishOf(rev2, [8, 9, 10, 11]) });
  });

  it('reads each passage in the order the answer named it, one verse as one verse, and writes each reference out in full', async () => {
    const held = await fetchPassages(['Heb 7:1-3', 'Rom 8:28']);
    expect(held.map((p) => p.reference)).toEqual(['Hebrews 7:1-3', 'Romans 8:28']);
    expect(held[0].greek).toBe(greekOf(heb7, [1, 2, 3]));
    expect(held[1].english).toBe(englishOf(rom8, [28]));
  });

  it('reads a passage named twice once', async () => {
    const held = await fetchPassages(['Revelation 2:8-11', 'Rev 2:8-11']);
    expect(held).toHaveLength(1);
  });

  it('leaves out what it cannot read: an Old Testament verse (Lampas holds the New), a book it does not know, a chapter or verse the book does not have, a range across chapters', async () => {
    expect(await fetchPassages(['Isaiah 53:5', 'Hezekiah 1:1', 'Revelation 40:1'])).toEqual([]);
    const held = await fetchPassages(['Jude 1:30', 'Revelation 2:29-3:6', 'Romans 8:28']);
    expect(held.map((p) => p.reference)).toEqual(['Romans 8:28']);
  });

  it(`caps a fetch at ${FETCH_MAX_VERSES} verses in all, cutting the passage that goes over and dropping those after it, and at ${MAX_FETCH} references`, () => {
    expect(wantedOf(['Revelation 2:1-20', 'Revelation 3:1-20', 'Romans 8:28'])).toEqual([
      { book: 'rev', chapter: 2, from: 1, to: 20 },
      { book: 'rev', chapter: 3, from: 1, to: 10 },
    ]);
    expect(wantedOf(['Romans 8:1', 'Romans 8:2', 'Romans 8:3', 'Romans 8:4', 'Romans 8:5'])).toHaveLength(MAX_FETCH);
    // a chapter named whole is its verses from the first, as far as the cap allows
    expect(wantedOf(['Revelation 2'])).toEqual([{ book: 'rev', chapter: 2, from: 1, to: FETCH_MAX_VERSES }]);
  });

  it(`keeps one passage under ${HELD_PASSAGES_BYTES} bytes by its first whole verses, and its reference says which it kept`, async () => {
    const [held] = await fetchPassages(['Revelation 2:1-20']);
    expect(bytes(held)).toBeLessThanOrEqual(HELD_PASSAGES_BYTES);
    const last = Number(/^Revelation 2:1-(\d+)$/.exec(held.reference)?.[1]);
    expect(last).toBeGreaterThan(1);
    expect(last).toBeLessThan(20);
    expect(held.greek).toBe(greekOf(rev2, Array.from({ length: last }, (_, i) => i + 1)));
    // one more verse would have gone over
    expect(bytes({ reference: `Revelation 2:1-${last + 1}`, greek: greekOf(rev2, Array.from({ length: last + 1 }, (_, i) => i + 1)), english: englishOf(rev2, Array.from({ length: last + 1 }, (_, i) => i + 1)) })).toBeGreaterThan(HELD_PASSAGES_BYTES);
  });

  it('a chapter it cannot load reads nothing and throws nothing', async () => {
    expect(await fetchPassages(['Revelation 2:8-11'], () => Promise.reject(new Error('offline')))).toEqual([]);
  });
});

describe('the quiet line under the answer', () => {
  it('names what was fetched by the short book names', () => {
    expect(fetchedLine([passage('Revelation 2:8-11')])).toBe('Tutor fetched Rev 2:8-11');
    expect(fetchedLine([passage('Hebrews 7:1-3'), passage('1 John 1:9')])).toBe('Tutor fetched Heb 7:1-3, 1 John 1:9');
  });
});

describe('the passages a talk holds', () => {
  it('are the passages its turns fetched, the newest turn\'s first, each once', () => {
    const turns = [{ fetched: [passage('Hebrews 7:1-3'), passage('Romans 8:28')] }, {}, { fetched: [passage('Revelation 2:8-11'), passage('Romans 8:28')] }];
    expect(heldPassagesOf(turns).map((p) => p.reference)).toEqual(['Revelation 2:8-11', 'Romans 8:28', 'Hebrews 7:1-3']);
  });

  it(`stop at ${HELD_PASSAGES_BYTES} bytes: the older ones drop off`, () => {
    // two fit the budget, three do not
    const big = (ref: string) => passage(ref, Math.floor(HELD_PASSAGES_BYTES / 45));
    const turns = [{ fetched: [big('Hebrews 7:1-3')] }, { fetched: [big('Romans 8:28')] }, { fetched: [big('Revelation 2:8-11')] }];
    const held = heldPassagesOf(turns);
    expect(held.map((p) => p.reference)).toEqual(['Revelation 2:8-11', 'Romans 8:28']);
    expect(bytes(held)).toBeLessThanOrEqual(HELD_PASSAGES_BYTES);
  });

  it('are none for a talk that fetched nothing', () => {
    expect(heldPassagesOf([{}, {}])).toEqual([]);
  });
});

describe('the request carries them', () => {
  const scope = { title: 'Romans 8', chapter: rom8, verse: verseOf(rom8, 28) };

  it('as held_passages, newest first, and not at all when the talk holds none', () => {
    const turns = [
      { q: 'Who was Melchizedek?', a: 'A priest-king.', fetched: [passage('Hebrews 7:1-3')] },
      { q: 'And Smyrna?', a: 'A church that suffered.', fetched: [passage('Revelation 2:8-11')] },
    ];
    expect(buildTalkRequest(scope, 'Go on', turns, []).held_passages?.map((p) => p.reference)).toEqual(['Revelation 2:8-11', 'Hebrews 7:1-3']);
    expect(buildTalkRequest(scope, 'Go on', [{ q: 'Why?', a: 'Because.' }], [])).not.toHaveProperty('held_passages');
  });

  it('a request too big gives up the oldest held passage before a verse of the talk\'s own text or a turn', () => {
    const turns = [
      { q: 'Who was Melchizedek?', a: 'A priest-king.', fetched: [passage('Hebrews 7:1-3', 60)] },
      { q: 'And Smyrna?', a: 'A church that suffered.', fetched: [passage('Revelation 2:8-11', 60)] },
    ];
    // over the cap by more than the pronunciation guide and the word list, which go first, and less than one held passage
    const base = buildTalkRequest(scope, 'Go on', turns, []);
    const built = buildTalkRequest(scope, 'Go on', turns, [], { pad: 'x'.repeat(MAX_REQUEST_BYTES - size({ ...base, pronunciation_guide: undefined, greek_words: [] }) + 400) });
    expect(built.held_passages).toHaveLength(2);
    const fitted = fitHistory(built);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.held_passages?.map((p) => p.reference)).toEqual(['Revelation 2:8-11']);
    expect(fitted.greek).toBe(built.greek);
    expect(fitted.history).toHaveLength(2);
  });
});

describe('the answer\'s fetch', () => {
  const answer = { answer: 'Smyrna was a church that suffered.', words: [] };

  it(`is a list of 1 to ${MAX_FETCH} references`, () => {
    expect(isTalkAnswer({ ...answer, fetch: ['Revelation 2:8-11'] })).toBe(true);
    expect(isTalkAnswer({ ...answer, fetch: ['Romans 8:1', 'Romans 8:2', 'Romans 8:3', 'Romans 8:4', 'Romans 8:5'] })).toBe(false);
    expect(isTalkAnswer({ ...answer, fetch: [7] })).toBe(false);
    expect(isTalkAnswer({ ...answer, fetch: 'Revelation 2:8-11' })).toBe(false);
  });
});
