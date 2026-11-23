// src/settings/entries/daily.ts — the registry entry of Today's devotional (SETTINGS slot 700, src/settings/entry.ts): not a saved setting, so it is made by hand.
import { getDay, localDate, pickAnotherDevotional, rephilUnheard, setDevotionalPick } from '../../data/daily/dailyStore';
import { RANDOM, devotionalForDay, devotionalOf, tickedDevotionals, type DrawSources } from '../../data/daily/devotionals';
import { publish } from '../../events/bus';
import { ANOTHER, devotionalDrawSetting, devotionalSetting, todaysDevotionalSetting } from '../definitions/daily';
import { readDrawSources } from '../devotionalSources';
import { slotted, type SettingEntry } from '../entry';
import { getSetting } from '../store';

/** What Today shows now: Which devotional and the draw as they stand, and the id of the devotional of the phone's date (the day's pick while Random). */
async function devotionalToday(): Promise<{ random: boolean; ticked: string[]; date: string; id: string; rephil: boolean; sources: DrawSources }> {
  const now = new Date();
  const date = localDate(now);
  const [choice, draw, day, rephil, sources] = await Promise.all([getSetting(devotionalSetting), getSetting(devotionalDrawSetting), getDay(date), rephilUnheard(), readDrawSources()]);
  const ticked = tickedDevotionals(draw);
  return { random: choice === RANDOM, ticked, date, id: devotionalForDay(choice, ticked, now, day.devotional, rephil, sources).id, rephil, sources };
}

/**
 * Today's devotional (mw-5r3p30.680): the tutor's way to re-draw the day's devotional while Which devotional is Random. Its write ends in the same function the
 * Another button on Today taps (dailyStore.ts pickAnotherDevotional), so Which devotional is never rewritten; with a named devotional it writes nothing (a named
 * one is a change of Which devotional, which the grind is told to ask for instead).
 */
const todaysDevotionalEntry: SettingEntry = {
  ...todaysDevotionalSetting,
  read: async () => (await devotionalToday()).id,
  write: async (value) => {
    const today = await devotionalToday();
    if (!today.random) return;
    if (value === ANOTHER) await pickAnotherDevotional(today.date, today.id, today.ticked, undefined, today.rephil, today.sources);
    else if (devotionalOf(String(value))) await setDevotionalPick(today.date, String(value));
    else return;
    publish({ kind: 'setting-changed', key: todaysDevotionalSetting.key, value });
  },
  show: (value) => `${todaysDevotionalSetting.label}: ${value === ANOTHER ? 'another one' : (devotionalOf(String(value))?.title ?? String(value))}`,
};

export const todaysDevotionalSlot = slotted(700, todaysDevotionalEntry);
