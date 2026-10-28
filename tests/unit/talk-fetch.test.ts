// The tutor asks for the text he needs without stopping the talk (mw-5r3p30.734): an answer may name passages in `fetch`; the app reads them from its own chapter data
// (the Greek, and the English the Reader shows) after the answer is shown, keeps them on the turn, and the next request carries them, newest first under a byte budget,
// as `held_passages`. These are the pure parts: what a fetch reads, the caps, the budget, the quiet line, and the request's field.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { type Chapter, markSupplied } from '../../src/data/chapter';
import { buildTalkRequest, fitHistory, isTalkAnswer, MAX_REQUEST_BYTES, type TalkRequest } from '../../src/services/talk';
import { FETCH_MAX_VERSES, fetchedLine, fetchOutcome, fetchPassages, unreadLine, HELD_PASSAGES_BYTES, heldPassagesOf, MAX_FETCH, wantedOf, type HeldPassage } from '../../src/services/talkFetch';
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

describe('a fetch that reads nothing is not silent (mw-5r3p30.825)', () => {
  it('names the references it could not read: an Old Testament verse, a chapter the book lacks, a chapter that does not load', async () => {
    const { read, unread } = await fetchOutcome(['Revelation 2:8-11', 'Isaiah 53:5', 'Revelation 40:1']);
    expect(read.map((p) => p.reference)).toEqual(['Revelation 2:8-11']);
    expect(unread).toEqual(['Isaiah 53:5', 'Revelation 40:1']);
    expect(await fetchOutcome(['Revelation 6:2-17'], () => Promise.reject(new Error('offline')))).toEqual({ read: [], unread: ['Revelation 6:2-17'] });
  });

  it('counts a passage cut short as read, and one left out by the verse cap as unread', async () => {
    const { read, unread } = await fetchOutcome(['Revelation 2:1-20']);
    expect(read).toHaveLength(1);
    expect(unread).toEqual([]);
    expect((await fetchOutcome(['Revelation 2:1-20', 'Revelation 3:1-20', 'Romans 8:28'])).unread).toEqual(['Romans 8:28']);
  });

  it('says so in one line under the answer', () => {
    expect(unreadLine(['Revelation 6:2-17'])).toBe('Could not read Revelation 6:2-17');
    expect(unreadLine(['Isaiah 53:5', 'Revelation 40:1'])).toBe('Could not read Isaiah 53:5, Revelation 40:1');
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

// mw-5r3p30.825: in his Revelation 6 talk the tutor fetched 6:2-17 and no later request held it. The cause was the fit: his real request, before any cut, was well over the cap
// (the fields that were never cut weighed about 8,700 of the 9,400 bytes), the held passage was the first thing the fit cut, and the history fell to one turn behind it.
describe('a talk at the weight of a real one (mw-5r3p30.825)', () => {
  const rev6 = read('public/data/rev/6.json');
  const scope = { title: 'Revelation 6', chapter: rev6, verse: null };
  const sentence = (i: number) => `Point ${i} of the answer, in plain words, about the seals and the riders that come with them. `.repeat(4).trim();
  /** The talk's six turns, as his had been, the first two asking for 6:2-17; the request for the seventh message. */
  async function request(): Promise<TalkRequest> {
    const fetched = await fetchPassages(['Revelation 6:2-17']);
    const turns = Array.from({ length: 6 }, (_, i) => ({ q: `Question ${i + 1} about the horses and what they stand for`, a: sentence(i), ...(i < 2 ? { fetched } : {}) }));
    const settings = Object.fromEntries(Array.from({ length: 62 }, (_, i) => [`setting${i}`, 'a value of some length']));
    const base = buildTalkRequest(scope, 'Does that horse touch a part of the earth?', turns, Array.from({ length: 60 }, (_, i) => `λόγος${i}`), settings, undefined, 'Reader: 42, slow pace, learns by hearing and reading.', undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, {
      index: 'Revelation 1 quizzed; map of Revelation 1 built; prefers the horses explained by their colours. '.repeat(4),
      notes: Array.from({ length: 6 }, (_, i) => ({ name: `topic:note-${i}`, text: `A note about what he holds of the seals, number ${i}. `.repeat(4).trim() })),
    }, undefined, undefined, Array.from({ length: 8 }, (_, i) => ({ kind: 'word' as const, id: `w${i}`, title: `λέγω${i}`, why: 'slipped twice this week and not seen for a long while' })), [], { text: 'Reader: 42, slow pace. This talk: Revelation 6, spoken questions, the symbolism and a mental map of the horses. '.repeat(8), covered: 0 }, Array.from({ length: 6 }, (_, i) => ({ kind: 'review' as const, title: `Review: ${i + 17} due, and the reading plan for today`, done: false })));
    return base;
  }

  it('the request is over the cap with the passage in it, as his was', async () => {
    const built = await request();
    expect(built.held_passages?.[0].reference).toMatch(/^Revelation 6:2-\d+$/);
    expect(size(built)).toBeGreaterThan(MAX_REQUEST_BYTES);
    expect(size({ ...built, held_passages: undefined, history: [] })).toBeGreaterThan(MAX_REQUEST_BYTES - 1500);
  });

  it('keeps the newest fetched passage, with its English, and the last three turns of the history after the fit', async () => {
    const fitted = fitHistory(await request());
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.held_passages?.[0].reference).toMatch(/^Revelation 6:2-\d+$/);
    expect(fitted.held_passages?.[0].english).toContain('a white horse');
    expect(fitted.history.length).toBeGreaterThanOrEqual(3);
  });
});

// The sweep of mw-5r3p30.825: only the Bible talk's grind has a `fetch`; every shape of that talk (a chapter, a verse, a passage quiz, a talk from a screen such as a lesson, a talk of its own)
// builds its request through buildTalkRequest, and the next request of each carries the passage the tutor fetched.
describe('every kind of Bible talk carries what the tutor fetched into its next request', () => {
  const rev6 = read('public/data/rev/6.json');
  const held = passage('Revelation 6:2-8', 40);
  const turns = [{ q: 'What are the four horses?', a: 'White, red, black and pale.', fetched: [held] }];
  const NO_CHAPTER_SCOPE = { title: 'Goal', chapter: { ...rom8, verses: [] }, verse: null, screen: { name: 'Goal', facts: [] } };
  const scopes = [
    { kind: 'chapter talk', scope: { title: 'Revelation 6', chapter: rev6, verse: null } },
    { kind: 'verse talk', scope: { title: 'Revelation 6', chapter: rev6, verse: verseOf(rev6, 1) } },
    { kind: 'passage quiz', scope: { title: 'Revelation 6', chapter: rev6, verse: verseOf(rev6, 1), quiz: true } },
    { kind: 'lesson (a talk from a screen)', scope: NO_CHAPTER_SCOPE },
    { kind: 'talk of its own', scope: { ...NO_CHAPTER_SCOPE, free: 'talk.1' } },
  ];
  for (const { kind, scope } of scopes) {
    it(`${kind}: the request after the fetch holds the passage with its English, and so does the fitted one`, () => {
      const request = buildTalkRequest(scope as Parameters<typeof buildTalkRequest>[0], 'And the fifth seal?', turns, []);
      expect(request.held_passages).toEqual([held]);
      expect(fitHistory(request).held_passages).toEqual([held]);
    });
  }

  it('About holds none: its request is the credits', () => {
    const request = buildTalkRequest({ ...NO_CHAPTER_SCOPE, screen: { name: 'About', facts: [], credits: [] } } as Parameters<typeof buildTalkRequest>[0], 'Who made the font?', turns, []);
    expect(request).not.toHaveProperty('held_passages');
  });
});
