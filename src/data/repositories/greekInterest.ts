// src/data/repositories/greekInterest.ts — moving the Greek dial (src/settings/definitions/greekInterest.ts, mw-3ased2.2) and placing a phone on it.
//
// Moving the dial UP sets what the steps it passes bring in to their starting values (the Weave Solid at 2, 3 new words a day at 3, the Greek view, Greek word
// order and 5 new words at 4); a value he had kept from before wins over a starting value. Moving it DOWN turns off what the lower step hides (the Greek view,
// the Weave, new words a day, Handwriting drills, Read lessons to me, Quiz goal and Goal), after keeping his own value of each under 'greekKept.<key>', so
// a hidden setting never acts unseen and going back up restores what he had. A setting he never set has no row to keep: it is written off, and comes back as the
// step's starting value (or its default). The settings with no Off of their own (the Greek voice, speed and pronunciation, the grammar approach, the picker's
// and the move's grammar, Hebrew's depth) stay as they are: they act only where Greek is read or taught, which the lower steps hide.
//
// Where a phone starts: placeGreekInterest, once, at the app's start. A phone with nothing of a reader kept starts at 0 and nothing else is written (it is still a new
// reader for the welcome); a reader from before is placed by what he has (placementOf). The welcome's English defaults are step 0 of the dial: one function.
import { db } from '../db';
import { publish } from '../../events/bus';
import { handwritingSetting, readLessonsSetting, weaveOrderSetting, weaveSetting } from '../../settings/definitions';
import {
  GREEK_TOP,
  greekInterestSetting,
  greekLevelOf,
  placementOf,
  type GreekLevel,
} from '../../settings/definitions/greekInterest';
import { getSetting, setSetting } from '../../settings/store';
import { BOOK_INDEX } from '../bookIndex';
import { parseGoal } from '../goal';
import { normaliseNewWordsADay } from '../pace';
import { getNewWordsADay, getReaderView, getWeave, setGoal, setNewWordsADay, setQuizGoal, setReaderView, setWeave } from './settings';

const DIAL_KEY = greekInterestSetting.key;
const KEPT_PREFIX = 'greekKept.';

/** localStorage key of a start level for a phone placed for the first time: the test seam (docs/testing.md) that lets a spec begin where the Greek is. */
export const GREEK_START_KEY = 'lampas.greekInterestStart';

/** The saved step; 5, All in, until the phone has been placed (nothing is hidden before then). */
export const getGreekInterest = async (): Promise<GreekLevel> => greekLevelOf(await getSetting(greekInterestSetting));

/** A setting the dial turns off below the step `from`: how it is written back from the text it was kept as, and what off is. */
interface Managed {
  key: string;
  from: GreekLevel;
  off: string;
  /** off is written even where nothing was set (the old English defaults wrote these three); the rest are written only where a value is kept */
  always?: boolean;
  write(value: string): Promise<void>;
}

const MANAGED: readonly Managed[] = [
  {
    key: 'readerView',
    from: 1,
    off: 'english',
    always: true,
    write: async (v) => {
      const view = v === 'greek' ? 'greek' : 'english';
      await setReaderView(view);
      // the Reader, when he comes back to it by Back, takes this view over the one in its older address (src/reader/useReaderSettings.ts)
      publish({ kind: 'setting-changed', key: 'readerView', value: view });
    },
  },
  { key: 'weave', from: 2, off: 'off', always: true, write: (v) => setWeave(weaveSetting.parse(v)) },
  { key: 'newWordsADay', from: 3, off: '0', always: true, write: (v) => setNewWordsADay(normaliseNewWordsADay(v)) },
  { key: 'handwritingDrills', from: 3, off: 'off', write: (v) => setSetting(handwritingSetting, handwritingSetting.parse(v)) },
  { key: 'readLessons', from: 3, off: 'off', write: (v) => setSetting(readLessonsSetting, readLessonsSetting.parse(v)) },
  { key: 'quizGoal', from: 3, off: '', write: (v) => setQuizGoal(v) },
  {
    key: 'goal',
    from: 4,
    off: '',
    write: async (v) => {
      await setGoal(v);
      publish({ kind: 'goal-changed', goal: v.trim() === '' ? null : (parseGoal(v, BOOK_INDEX) ?? null) });
    },
  },
];

/** What each step brings in, to its starting values, on the way up (the epic mw-3ased2: the level table). */
const BRINGS: Readonly<Partial<Record<GreekLevel, Readonly<Record<string, string>>>>> = {
  2: { weave: 'solid' },
  3: { newWordsADay: '3' },
  4: { readerView: 'greek', weaveOrder: 'greek', newWordsADay: '5' },
};

/** Writes a starting value by its key: a managed setting, or the Weave's order (which the dial brings but never turns off). */
async function bring(key: string, value: string): Promise<void> {
  if (key === 'weaveOrder') return setSetting(weaveOrderSetting, weaveOrderSetting.parse(value));
  await MANAGED.find((m) => m.key === key)?.write(value);
}

/** Whether a key of the settings store is the dial's own (the level or a kept value), not something of the reader's. */
export const isDialKey = (key: string): boolean => key === DIAL_KEY || key.startsWith(KEPT_PREFIX);

/** True when the phone holds anything of a reader: a profile, any setting of his (not the dial's own) or any talk. */
export async function holdsAReader(): Promise<boolean> {
  const [settings, talks] = await Promise.all([db.settings.filter((row) => !isDialKey(row.key)).count(), db.talks.count()]);
  return settings > 0 || talks > 0;
}

/** Moves the dial to `to`: what the steps it passes bring in, what the lower steps hide turned off (his values kept), then the level itself. */
export async function setGreekInterest(to: GreekLevel): Promise<void> {
  const from = await getGreekInterest();
  for (const m of MANAGED) {
    if (m.from <= to) continue;
    const row = await db.settings.get(m.key);
    if (row && from >= m.from) await db.settings.put({ key: KEPT_PREFIX + m.key, value: String(row.value) });
    if (m.always ? row?.value !== m.off : row !== undefined && row.value !== m.off) await m.write(m.off);
  }
  for (let step = from + 1; step <= to; step += 1) {
    for (const [key, value] of Object.entries(BRINGS[step as GreekLevel] ?? {})) await bring(key, value);
  }
  // his own value of a setting that comes back wins over the step's starting value
  for (const m of MANAGED) {
    if (m.from <= from || m.from > to) continue;
    const kept = await db.settings.get(KEPT_PREFIX + m.key);
    if (!kept) continue;
    await m.write(String(kept.value));
    await db.settings.delete(KEPT_PREFIX + m.key);
  }
  await setSetting(greekInterestSetting, String(to));
}

/** Places the phone on the dial, once: the saved level if there is one, else the start level a test left in localStorage, else 0 for a phone with nothing of a reader
 * kept (nothing else is written: it is still a new reader for the welcome), else the level his own settings place him at (placementOf). Returns the level. */
export async function placeGreekInterest(): Promise<GreekLevel> {
  const saved = await db.settings.get(DIAL_KEY);
  if (saved) return greekLevelOf(saved.value);
  const seam = window.localStorage.getItem(GREEK_START_KEY);
  let level: GreekLevel;
  if (seam !== null && seam !== '' && Number.isInteger(Number(seam)) && Number(seam) >= 0 && Number(seam) <= GREEK_TOP) level = greekLevelOf(seam);
  else if (!(await holdsAReader())) level = 0;
  else {
    const [view, newWords, weave] = await Promise.all([getReaderView(), getNewWordsADay(), getWeave()]);
    level = placementOf({ view, newWords, weave });
  }
  await setSetting(greekInterestSetting, String(level));
  return level;
}

/** Raises the dial to `to` when it stands lower (a tap on an offer of the Greek is his yes to it); never lowers it. */
export async function raiseGreekInterest(to: GreekLevel): Promise<void> {
  if ((await getGreekInterest()) < to) await setGreekInterest(to);
}
