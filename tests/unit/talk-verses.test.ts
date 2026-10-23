// The verses the Bible talk holds (mw-5r3p30.733): his Talk about Revelation 2 sent verses 1-3 whatever he asked, and the 8000-byte clip could cut verse 1 itself, so the tutor said
// "I'm going from my own knowledge here, since the text I hold stops at verse 1". The window follows the talk, the clip drops whole verses, and the request says which it holds.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { type Chapter, markSupplied } from '../../src/data/chapter';
import { MAX_REQUEST_BYTES, buildTalkRequest, fitHistory, type TalkRequest } from '../../src/services/talk';
import { TEXT_CLIP_MARK } from '../../src/services/requestBudget';

const rev2 = JSON.parse(readFileSync('public/data/rev/2.json', 'utf8')) as Chapter;
const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const size = (r: TalkRequest) => new TextEncoder().encode(JSON.stringify(r)).length;
const greekOf = (chapter: Chapter, ns: number[]) => ns.map((n) => chapter.verses.find((v) => v.n === n)!.g.map((w) => w.t).join(' ')).join(' ');
const englishOf = (chapter: Chapter, ns: number[]) => ns.map((n) => chapter.verses.find((v) => v.n === n)!.e.map(markSupplied).join(' ')).join(' ');
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const scope = { title: 'Revelation 2', chapter: rev2, verse: null };
const ask = (question: string, turns: { q: string; a: string; links?: { kind: 'verse'; reference: string }[] }[] = []) => buildTalkRequest(scope, question, turns, []);

describe('the verses a Bible talk holds', () => {
  it('with nothing named and no verse selected, the chapter\'s first three verses, and the request says so', () => {
    const r = ask('What is this chapter about?');
    expect(r.greek).toBe(greekOf(rev2, [1, 2, 3]));
    expect(r.english).toBe(englishOf(rev2, [1, 2, 3]));
    expect(r.verses).toBe('2:1-3');
  });

  it('the selected verse, when nothing else is named', () => {
    const r = buildTalkRequest({ title: 'Romans 8', chapter: rom8, verse: rom8.verses.find((v) => v.n === 28)! }, 'Why?', [], []);
    expect(r.greek).toBe(greekOf(rom8, [28]));
    expect(r.verses).toBe('8:28');
  });

  it('a verse named by its reference in his newest question (the Rev 2:9 of his screenshot)', () => {
    const r = ask('What does Revelation 2:9 mean by poverty?');
    expect(r.verses).toBe('2:8-10');
    expect(r.greek).toBe(greekOf(rev2, [8, 9, 10]));
    expect(r.english).toBe(englishOf(rev2, [8, 9, 10]));
  });

  it('a verse named as "verse 9", "v. 9" or "2:9"', () => {
    for (const question of ['What is verse 9 saying?', 'and v. 9?', 'Explain 2:9 please']) {
      expect(ask(question).verses, question).toBe('2:8-10');
    }
  });

  it('verses named as a range ("verses 12-14") are all held', () => {
    const r = ask('How do verses 12-14 fit together?');
    expect(r.greek).toBe(greekOf(rev2, range(11, 15)));
    expect(r.verses).toBe('2:11-15');
  });

  it('a verse the last answer linked (Rev 2:9), when the question names none', () => {
    const r = ask('and why is that?', [{ q: 'Tell me about Smyrna', a: 'See Revelation 2:9.', links: [{ kind: 'verse', reference: 'Revelation 2:9' }] }]);
    expect(r.verses).toBe('2:8-10');
    expect(r.greek).toBe(greekOf(rev2, [8, 9, 10]));
  });

  it('the question wins over a link of the last answer, which comes after it', () => {
    const r = ask('what about verse 5?', [{ q: 'x', a: 'y', links: [{ kind: 'verse', reference: 'Revelation 2:9' }] }]);
    expect(r.verses).toBe('2:4-10');
  });

  it('only the last answer\'s links count, and a link into another chapter is ignored', () => {
    const turns = [
      { q: 'one', a: 'two', links: [{ kind: 'verse' as const, reference: 'Revelation 2:9' }] },
      { q: 'three', a: 'four', links: [{ kind: 'verse' as const, reference: 'Romans 8:28' }] },
    ];
    expect(ask('and then?', turns).verses).toBe('2:1-3');
  });

  it('a verse the chapter does not have names nothing', () => {
    expect(ask('what about verse 99?').verses).toBe('2:1-3');
  });

  it('a verse he names that the selected verse already is adds nothing', () => {
    const r = buildTalkRequest({ title: 'Revelation 2', chapter: rev2, verse: rev2.verses.find((v) => v.n === 9)! }, 'What does verse 9 mean, Revelation 2:9?', [], []);
    expect(r.greek).toBe(greekOf(rev2, [9]));
    expect(r.verses).toBe('2:9');
  });

  it('when a verse is selected, a verse he names is held beside it', () => {
    const r = buildTalkRequest({ title: 'Revelation 2', chapter: rev2, verse: rev2.verses.find((v) => v.n === 9)! }, 'How does verse 10 follow?', [], []);
    expect(r.reference).toBe('Revelation 2:9');
    expect(r.greek).toBe(greekOf(rev2, [9, 10, 11]));
    expect(r.verses).toBe('2:9-11');
  });
});

describe('the clip', () => {
  // ten long kept answers and a settings record as heavy as a phone's full one push a talk over the cap, past what the word list gives back
  const turns = Array.from({ length: 10 }, (_, i) => ({ q: `Question ${i}`, a: 'x'.repeat(300) }));
  const settings = Object.fromEntries(Array.from({ length: 140 }, (_, i) => [`setting${i}`, 'a value of some length']));
  const heavy = (question: string, linked?: string) =>
    buildTalkRequest(scope, question, linked ? turns.map((t, i) => (i === 9 ? { ...t, links: [{ kind: 'verse' as const, reference: linked }] } : t)) : turns, [], settings);

  it('drops whole verses, never part of one, and says which it holds', () => {
    const request = heavy('Tell me about Revelation 2:9');
    expect(size(request)).toBeGreaterThan(MAX_REQUEST_BYTES);
    const fitted = fitHistory(request);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    const [first, last] = fitted.verses!.replace('2:', '').split('-').map(Number);
    expect(fitted.greek).toBe(greekOf(rev2, range(first, last ?? first)));
    expect(fitted.english).toBe(englishOf(rev2, range(first, last ?? first)));
    expect(fitted.greek!.endsWith(TEXT_CLIP_MARK)).toBe(false);
    expect(fitted.english!.endsWith(TEXT_CLIP_MARK)).toBe(false);
    // it did drop: the window of 2:8-10 is not all there
    expect(fitted.verses).not.toBe('2:8-10');
  });

  it('keeps the verse the talk is about, and drops the verses farthest from it first', () => {
    const fitted = fitHistory(heavy('Tell me about Revelation 2:9'));
    const [first, last] = fitted.verses!.replace('2:', '').split('-').map(Number);
    expect(first).toBeLessThanOrEqual(9);
    expect(last ?? first).toBeGreaterThanOrEqual(9);
  });

  it('a talk about the chapter keeps verse 1 and drops the later verses', () => {
    const fitted = fitHistory(heavy('What is this chapter about?'));
    expect(fitted.verses).toMatch(/^2:1(-\d+)?$/);
    expect(fitted.greek!.startsWith(greekOf(rev2, [1]))).toBe(true);
  });

  it('the words listed are those of the verses held', () => {
    const fitted = fitHistory(heavy('Tell me about Revelation 2:9'));
    const held = new Set(fitted.greek!.split(' '));
    for (const w of fitted.greek_words ?? []) expect(held.has(w.form)).toBe(true);
  });

  it('a request that already fits keeps every verse of its window', () => {
    const fitted = fitHistory(ask('What does Revelation 2:9 mean?'));
    expect(fitted.verses).toBe('2:8-10');
    expect(fitted.greek).toBe(greekOf(rev2, [8, 9, 10]));
  });
});
