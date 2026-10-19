// src/data/daily/psalmsProverbs.ts — the Psalms-and-Proverbs month: on day N of the month read Psalms N, N+30, N+60, N+90 and N+120 (those up to 150) and then
// Proverbs N. Day 31 has no Psalm 151, so it reads Psalms 31, 61, 91, 121 and Proverbs 31. The chapters are PlanChapters with the book codes of data/otBooks.ts,
// so chapterLink (resources/logosBible.ts) opens each in Logos. The day is the day of the month on the date's local clock (the phone's), never the UTC one.
import { otBookOf } from '../otBooks';
import type { PlanChapter } from '../plans/plan';

const PSALMS = 'psa';
const PROVERBS = 'pro';
const PSALMS_A_DAY = 5;
const DAYS_BETWEEN = 30;

/** The chapters to read on `date`: Psalms day, day + 30, ... up to the Psalms' last chapter, then Proverbs day. */
export function dailyReadings(date: Date): PlanChapter[] {
  const day = date.getDate();
  const psalms = otBookOf(PSALMS)?.chapters ?? 150;
  const proverbs = otBookOf(PROVERBS)?.chapters ?? 31;
  const readings: PlanChapter[] = [];
  for (let i = 0; i < PSALMS_A_DAY; i++) {
    const chapter = day + i * DAYS_BETWEEN;
    if (chapter <= psalms) readings.push({ code: PSALMS, chapter });
  }
  if (day <= proverbs) readings.push({ code: PROVERBS, chapter: day });
  return readings;
}
