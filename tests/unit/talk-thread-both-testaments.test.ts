// mw-5r3p30.819: the Bible talk keeps the thread of the conversation on an Old Testament chapter as it does on a New Testament one. The history (the last turns), the verses
// the talk holds (those his newest question names, else those the last answer's verse links name) and the fit all come from one path, buildTalkRequest and fitHistory, with no
// branch on the Testament: the same walk is run over Romans 8, Genesis 3 (Hebrew) and Genesis 3 labelled as a third language, and each must keep the thread.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { markSupplied, type Chapter } from '../../src/data/chapter';
import { MAX_HISTORY_TURNS, MAX_REQUEST_BYTES, buildTalkRequest, fitHistory, type TalkRequest } from '../../src/services/talk';
import { versesLinked, versesNamed } from '../../src/services/talkVerses';

const load = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Chapter;
const rom8 = load('public/data/rom/8.json');
const gen3 = load('public/data/gen/3.json');
const size = (r: TalkRequest) => new TextEncoder().encode(JSON.stringify(r)).length;

interface Case {
  name: string;
  chapter: Chapter;
  title: string;
  /** the verse the first answer links, and the reference as the tutor writes it */
  linked: number;
  reference: string;
  /** his first question, and the follow-up that depends on it */
  first: string;
  followUp: string;
}

const CASES: Case[] = [
  { name: 'Romans 8 (Greek)', chapter: rom8, title: 'Romans 8', linked: 28, reference: 'Romans 8:28', first: 'Which promises does Paul make here?', followUp: 'and the second one?' },
  { name: 'Genesis 3 (Hebrew)', chapter: gen3, title: 'Genesis 3', linked: 12, reference: 'Genesis 3:12', first: 'Which questions does God ask here?', followUp: 'and the second one?' },
  // a fake third language: the same chapter under another label, so any code that tests for the two known ones fails here
  { name: 'Genesis 3 relabelled as a third language', chapter: { ...gen3, lang: 'arc' as unknown as Chapter['lang'] }, title: 'Genesis 3', linked: 12, reference: 'Genesis 3:12', first: 'Which questions does God ask here?', followUp: 'and the second one?' },
];

const verseNumbers = (verses: string | undefined): number[] => {
  const m = /^\d+:(\d+)(?:-(\d+))?$/.exec(verses ?? '');
  if (!m) return [];
  const from = Number(m[1]);
  const to = m[2] === undefined ? from : Number(m[2]);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
};

describe.each(CASES)('a multi-turn talk on $name', ({ chapter, title, linked, reference, first, followUp }) => {
  const scope = { title, chapter, verse: null };
  const turns = [
    { q: first, a: `The first is in ${reference}.`, links: [{ kind: 'verse' as const, reference }] },
    { q: 'Say that in plain words.', a: 'Plainly: it is a question that calls him out.' },
    { q: 'What does the next verse add?', a: 'It adds the answer he gives.' },
    { q: 'And why does it matter?', a: 'Because it shows the thread of the whole passage.' },
  ];

  it('sends every earlier turn, oldest first, inside the cap', () => {
    const r = fitHistory(buildTalkRequest(scope, followUp, turns, []));
    expect(r.history).toEqual(turns.map(({ q, a }) => ({ q, a })));
    expect(size(r)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('sends the last ten turns when the talk is longer', () => {
    const long = Array.from({ length: MAX_HISTORY_TURNS + 3 }, (_, i) => ({ q: `question ${i}`, a: `answer ${i}` }));
    const r = fitHistory(buildTalkRequest(scope, followUp, long, []));
    expect(r.history).toEqual(long.slice(-MAX_HISTORY_TURNS));
  });

  it('holds the verse the last answer linked when his follow-up names no verse', () => {
    const r = buildTalkRequest(scope, followUp, turns.slice(0, 1), []);
    expect(verseNumbers(r.verses)).toContain(linked);
    expect(r.english).toBe([linked - 1, linked, linked + 1].map((n) => chapter.verses.find((v) => v.n === n)!.e.map(markSupplied).join(' ')).join(' '));
  });

  it('holds the verse his own question names, over the chapter\'s first verses', () => {
    const r = buildTalkRequest(scope, `What does ${reference} say?`, [], []);
    expect(verseNumbers(r.verses)).toContain(linked);
  });

  it('keeps the history and the held verse together when the request is fitted', () => {
    const r = fitHistory(buildTalkRequest(scope, followUp, turns.slice(0, 1), []));
    expect(r.history).toHaveLength(1);
    expect(verseNumbers(r.verses)).toContain(linked);
  });
});

describe('the verse readers take a reference of either Testament', () => {
  it('versesNamed finds a verse of the talk\'s own chapter in an Old Testament chapter', () => {
    expect([...new Set(versesNamed(gen3, 'Look at Genesis 3:12 and then verse 13'))]).toEqual([12, 13]);
    expect([...new Set(versesNamed(rom8, 'Look at Romans 8:28'))]).toEqual([28]);
  });

  it('versesLinked finds the verse an answer\'s link names in an Old Testament chapter', () => {
    expect(versesLinked(gen3, [{ kind: 'verse', reference: 'Genesis 3:9' }])).toEqual([9]);
    expect(versesLinked(rom8, [{ kind: 'verse', reference: 'Romans 8:28' }])).toEqual([28]);
  });

  it('a verse of another chapter or book is not the talk\'s own', () => {
    expect(versesNamed(gen3, 'Genesis 4:1 and Romans 5:12')).toEqual([]);
    expect(versesLinked(gen3, [{ kind: 'verse', reference: 'Genesis 4:1' }])).toEqual([]);
  });
});
