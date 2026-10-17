// tests/unit/reading-plan-estimate.test.ts — where the time away most likely got her (src/plan/estimate.ts, mw-umv8sp.3), on a fake audibleStarts: book 'ab' has three
// chapters (100, 200 ms, and a last one that takes the book's mean, 150 ms) and book 'cd' two (100 ms, and its mean, 100 ms).
import { describe, expect, it } from 'vitest';
import { chapterLength, estimateReached } from '../../src/plan/estimate';
import { audibleStartOf } from '../../src/resources/audioBible';
import { planOf } from '../../src/data/plans';

const starts = { 'ab.1': 0, 'ab.2': 100, 'ab.3': 300, 'cd.1': 1000, 'cd.2': 1100 };
const chapters = [
  { code: 'ab', chapter: 1 },
  { code: 'ab', chapter: 2 },
  { code: 'ab', chapter: 3 },
  { code: 'cd', chapter: 1 },
  { code: 'cd', chapter: 2 },
];
const env = { chapters, starts };
const label = (list: { code: string; chapter: number }[]) => list.map((c) => `${c.code}.${c.chapter}`);

describe('a chapter takes the time to the next chapter of its book', () => {
  it('is the next start minus this start', () => {
    expect(chapterLength({ code: 'ab', chapter: 1 }, starts)).toBe(100);
    expect(chapterLength({ code: 'ab', chapter: 2 }, starts)).toBe(200);
  });

  it("is the book's mean for its last chapter, never the gap to the next book", () => {
    expect(chapterLength({ code: 'ab', chapter: 3 }, starts)).toBe(150);
    expect(chapterLength({ code: 'cd', chapter: 2 }, starts)).toBe(100);
  });

  it('is the mean of every book for a chapter with no start known', () => {
    expect(chapterLength({ code: 'zz', chapter: 1 }, starts)).toBe(Math.round((100 + 200 + 100) / 3));
  });
});

describe('the chapter the time away reached', () => {
  it('is the session chapter when no time has passed', () => {
    const got = estimateReached({ code: 'ab', chapter: 2 }, 0, env);
    expect(got?.reached).toEqual({ code: 'ab', chapter: 2 });
  });

  it('is still the session chapter just before it ends', () => {
    expect(estimateReached({ code: 'ab', chapter: 2 }, 199, env)?.reached).toEqual({ code: 'ab', chapter: 2 });
  });

  it("is the next chapter after one chapter's length", () => {
    expect(estimateReached({ code: 'ab', chapter: 1 }, 100, env)?.reached).toEqual({ code: 'ab', chapter: 2 });
    expect(estimateReached({ code: 'ab', chapter: 1 }, 299, env)?.reached).toEqual({ code: 'ab', chapter: 2 });
    expect(estimateReached({ code: 'ab', chapter: 1 }, 300, env)?.reached).toEqual({ code: 'ab', chapter: 3 });
  });

  it('walks over a book boundary', () => {
    expect(estimateReached({ code: 'ab', chapter: 2 }, 200 + 150, env)?.reached).toEqual({ code: 'cd', chapter: 1 });
    expect(estimateReached({ code: 'ab', chapter: 3 }, 149, env)?.reached).toEqual({ code: 'ab', chapter: 3 });
  });

  it('stops at the last chapter of the plan however long she was away', () => {
    const got = estimateReached({ code: 'cd', chapter: 1 }, 10_000_000, env);
    expect(got?.reached).toEqual({ code: 'cd', chapter: 2 });
    expect(label(got?.around ?? [])).toEqual(['ab.3', 'cd.1', 'cd.2']);
  });

  it('is nothing for a session chapter the plan does not hold', () => {
    expect(estimateReached({ code: 'zz', chapter: 9 }, 0, env)).toBeUndefined();
  });

  it('is never before the session chapter for a negative time away (a clock set back)', () => {
    expect(estimateReached({ code: 'ab', chapter: 2 }, -5_000, env)?.reached).toEqual({ code: 'ab', chapter: 2 });
  });
});

describe('the chapters around the estimate', () => {
  it('are two before and two after, in plan order', () => {
    const got = estimateReached({ code: 'ab', chapter: 2 }, 0, env);
    expect(label(got?.around ?? [])).toEqual(['ab.1', 'ab.2', 'ab.3', 'cd.1']);
  });

  it('are two before and two after the estimate, not the session chapter', () => {
    const got = estimateReached({ code: 'ab', chapter: 1 }, 300, env);
    expect(got?.reached).toEqual({ code: 'ab', chapter: 3 });
    expect(label(got?.around ?? [])).toEqual(['ab.1', 'ab.2', 'ab.3', 'cd.1', 'cd.2']);
  });

  it('stay inside the plan at its first chapter', () => {
    expect(label(estimateReached({ code: 'ab', chapter: 1 }, 0, env)?.around ?? [])).toEqual(['ab.1', 'ab.2', 'ab.3']);
  });
});

describe('with the real Word of Promise starts and the whole Bible', () => {
  it('Genesis 1 takes the time to the start of Genesis 2', () => {
    const gen1 = (audibleStartOf('gen', 2) ?? 0) - (audibleStartOf('gen', 1) ?? 0);
    const chaptersOfPlan = planOf('whole-bible')!.chapters();
    expect(estimateReached({ code: 'gen', chapter: 1 }, gen1, { chapters: chaptersOfPlan })?.reached).toEqual({ code: 'gen', chapter: 2 });
    expect(estimateReached({ code: 'gen', chapter: 1 }, gen1 - 1, { chapters: chaptersOfPlan })?.reached).toEqual({ code: 'gen', chapter: 1 });
  });

  it('Revelation 22 is the end of the plan', () => {
    expect(estimateReached({ code: 'rev', chapter: 22 }, 50_000_000, { chapters: planOf('whole-bible')!.chapters() })?.reached).toEqual({ code: 'rev', chapter: 22 });
  });
});

describe('how long she was away, in words', () => {
  it('rounds to the minute, at least a minute, and uses hours from 60', async () => {
    const { awayText } = await import('../../src/plan/awayText');
    expect(awayText(5_000)).toBe('about 1 minute');
    expect(awayText(40 * 60_000)).toBe('about 40 minutes');
    expect(awayText(60 * 60_000)).toBe('about 1 hour');
    expect(awayText(130 * 60_000)).toBe('about 2 hours and 10 minutes');
    expect(awayText(121 * 60_000)).toBe('about 2 hours and 1 minute');
  });
});
