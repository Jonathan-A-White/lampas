// src/data/learnerToday.ts — the request's `today` (mw-5r3p30.731, docs/ask-tutor.md 'Today'): the items behind the Reader's chip 'Today · 2 of 9', each with its title and whether he
// ticked it, in the order Today draws them. At most TODAY_MAX (Today holds ten at most). Missing when Today holds nothing (every Daily piece Off). The Bible talk's input schema
// holds it; its instructions say how to use it. `done` is missing from every item while Tick boxes is Off: nothing is ticked then, and 'not done' would be a guess.
import { devotionalForDay, tickedDevotionals } from './daily/devotionals';
import { getDay, localDate } from './daily/dailyStore';
import { countDue } from './repositories';
import { chapterName } from '../plan/chapterName';
import { readPlan } from '../plan/usePlan';
import { dailyDevotionalSetting, dailyMemorizeSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting, devotionalDrawSetting, devotionalSetting } from '../settings/definitions';
import { getSetting } from '../settings/store';
import { memorizeLine, memorizeToday } from '../today/memorizeLine';
import { todayPieces } from '../today/pieces';
import { passageName } from '../today/tutorFacts';

/** The most items the field carries: more than Today can hold (review, plan, six passages, devotional). */
export const TODAY_MAX = 12;

export type TodayKind = 'review' | 'memorize' | 'plan' | 'psalm' | 'proverb' | 'devotional';

export interface TodayItem {
  kind: TodayKind;
  /** what Today calls it: 'Review: 17 due', 'Memorize: 2 verses due', 'Reading plan: 3 John 1', 'Psalm 5', the devotional's title */
  title: string;
  /** whether he ticked it today; missing while Tick boxes is Off */
  done?: boolean;
}

/** An item with the piece it is: 'review', 'plan', 'devotional' or a passage ('psa.5'), the id Today keeps a tick under (src/data/daily/dailyStore.ts). */
export interface TodayEntry {
  id: string;
  item: TodayItem;
}

/** The field for what Today holds on `now`, or undefined when it holds nothing. */
export async function todayNow(now: Date = new Date()): Promise<TodayItem[] | undefined> {
  return (await todayEntries(now))?.map((entry) => entry.item);
}

/** The items of todayNow with the piece id of each, for the tutor's tick-today command to find an item by. */
export async function todayEntries(now: Date = new Date()): Promise<TodayEntry[] | undefined> {
  const [review, memorize, plan, psalms, devotional, ticks, choice, draw] = await Promise.all([
    getSetting(dailyReviewSetting),
    getSetting(dailyMemorizeSetting),
    getSetting(dailyPlanSetting),
    getSetting(dailyPsalmsSetting),
    getSetting(dailyDevotionalSetting),
    getSetting(dailyTicksSetting),
    getSetting(devotionalSetting),
    getSetting(devotionalDrawSetting),
  ]);
  const pieces = todayPieces({ review, plan, psalms, devotional, memorize }, now);
  if (pieces.length === 0) return undefined;
  const day = await getDay(localDate(now));
  const items: TodayEntry[] = [];
  for (const id of pieces.slice(0, TODAY_MAX)) {
    const passage = /^(psa|pro)\.(\d+)$/.exec(id);
    let kind: TodayKind;
    let title: string;
    if (id === 'review') {
      const due = await countDue(now.getTime());
      kind = 'review';
      title = due === 0 ? 'Review: nothing due' : `Review: ${due} due`;
    } else if (id === 'memorize') {
      kind = 'memorize';
      title = memorizeLine(await memorizeToday(now.getTime()));
    } else if (id === 'plan') {
      const next = (await readPlan()).started?.next;
      kind = 'plan';
      title = next ? `Reading plan: ${chapterName(next)}` : 'Reading plan';
    } else if (id === 'devotional') {
      kind = 'devotional';
      title = devotionalForDay(choice, tickedDevotionals(draw), now, day.devotional).title;
    } else if (passage) {
      kind = passage[1] === 'psa' ? 'psalm' : 'proverb';
      title = passageName(passage[1], Number(passage[2]));
    } else continue;
    items.push({ id, item: { kind, title, ...(ticks === 'on' ? { done: day.ticked.includes(id) } : {}) } });
  }
  return items;
}
