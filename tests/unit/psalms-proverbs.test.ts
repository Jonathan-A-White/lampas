import { describe, expect, it } from 'vitest';
import { dailyReadings } from '../../src/data/daily/psalmsProverbs';
import { DEFAULT_LOGOS_BIBLE, chapterLink } from '../../src/resources/logosBible';
import { otBookOf } from '../../src/data/otBooks';

const onDay = (day: number) => dailyReadings(new Date(2026, 9, day));
const names = (day: number) => onDay(day).map((c) => `${c.code} ${c.chapter}`);

describe('the Psalms-and-Proverbs month', () => {
  it('day 1 gives Psalms 1, 31, 61, 91, 121 then Proverbs 1', () => {
    expect(names(1)).toEqual(['psa 1', 'psa 31', 'psa 61', 'psa 91', 'psa 121', 'pro 1']);
  });

  it('day 30 gives Psalms 30, 60, 90, 120, 150 then Proverbs 30', () => {
    expect(names(30)).toEqual(['psa 30', 'psa 60', 'psa 90', 'psa 120', 'psa 150', 'pro 30']);
  });

  it('day 31 gives Psalms 31, 61, 91, 121 then Proverbs 31, with no Psalm 151', () => {
    expect(names(31)).toEqual(['psa 31', 'psa 61', 'psa 91', 'psa 121', 'pro 31']);
  });

  it('reads the day of the month on the local date, not the UTC one', () => {
    expect(dailyReadings(new Date(2026, 0, 1, 0, 30))[0]).toEqual({ code: 'psa', chapter: 1 });
    expect(dailyReadings(new Date(2026, 0, 31, 23, 30))[0]).toEqual({ code: 'psa', chapter: 31 });
  });

  it('gives only chapters that exist, on every day of a month', () => {
    for (let day = 1; day <= 31; day++) {
      for (const { code, chapter } of onDay(day)) {
        expect(chapter).toBeGreaterThanOrEqual(1);
        expect(chapter).toBeLessThanOrEqual(otBookOf(code)!.chapters);
      }
    }
  });

  it("opens day 19's first Psalm in Logos as a reference ending in Bible.Ps19", () => {
    const first = onDay(19)[0];
    const link = chapterLink(first.code, first.chapter, DEFAULT_LOGOS_BIBLE);
    expect(link).toBeDefined();
    expect(link!.url.endsWith('Bible.Ps19')).toBe(true);
  });
});
