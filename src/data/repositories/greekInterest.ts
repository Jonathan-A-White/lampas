// src/data/repositories/greekInterest.ts — moving the dials, Greek (src/settings/definitions/greekInterest.ts, mw-3ased2.2) and Hebrew (hebrewInterest.ts, mw-gdcyf98.2), choosing
// the languages he reads (setLanguages: the two dials' own state, 'Which languages?') and placing a phone on them.
//
// The settings the steps change are shared by the two languages, so they follow the HIGHER dial: a managed setting is turned off only when both dials stand below its step after
// the move, and what a step brings in is written when either dial passes it (the Hebrew dial at 0 is the Greek dial alone, as it was).
//
// Moving the dial UP sets what the steps it passes bring in to their starting values (the Weave Solid at 2, 3 new words a day at 3, the Greek view, Greek word
// order and 5 new words at 4); a value he had kept from before wins over a starting value. Moving it DOWN turns off what the lower step hides (the Greek view,
// the Weave, new words a day, Handwriting drills, Read lessons to me, Quiz goal and Goal), after keeping his own value of each under 'greekKept.<key>', so
// a hidden setting never acts unseen and going back up restores what he had. A setting he never set has no row to keep: it is written off, and comes back as the
// step's starting value (or its default). The settings with no Off of their own (the Greek voice, speed and pronunciation, the grammar approach, the picker's
// and the move's grammar, Hebrew's depth) stay as they are: they act only where Greek is read or taught, which the lower steps hide.
//
// Where a phone starts: placeInterest, once, at the app's start: placeGreekInterest, then the Hebrew dial equal to it (or to its test seam). A phone with nothing of a reader
// kept starts both at 0 and nothing else is written (it is still a new reader for the welcome); a reader from before is placed by what he has (placementOf). The welcome's
// English defaults are step 0 of both dials: one function.
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
import { HEBREW_TOP, hebrewInterestSetting, hebrewLevelOf, type HebrewLevel } from '../../settings/definitions/hebrewInterest';
import { languagesOf, type InterestLang, type InterestLevel, type InterestLevels, type Languages } from '../../settings/definitions/interest';
import { getSetting, setSetting } from '../../settings/store';
import { BOOK_INDEX } from '../bookIndex';
import { parseGoal } from '../goal';
import { normaliseNewWordsADay } from '../pace';
import { getNewWordsADay, getReaderView, getWeave, setGoal, setNewWordsADay, setQuizGoal, setReaderView, setWeave } from './settings';

const DIAL_KEY = greekInterestSetting.key;
const HEBREW_DIAL_KEY = hebrewInterestSetting.key;
const KEPT_PREFIX = 'greekKept.';
const HEBREW_KEPT_PREFIX = 'hebrewKept.';
/** The level a dial stood at when it went to 0, kept so that choosing its language again puts it back (under 'greekKept.level' and 'hebrewKept.level'). */
const KEPT_LEVEL = 'level';
const keptLevelKey = (lang: InterestLang): string => (lang === 'grc' ? KEPT_PREFIX : HEBREW_KEPT_PREFIX) + KEPT_LEVEL;

/** localStorage key of a start level for a phone placed for the first time: the test seam (docs/testing.md) that lets a spec begin where the Greek is. */
export const GREEK_START_KEY = 'lampas.greekInterestStart';
/** The same for the Hebrew dial; absent, a phone's Hebrew dial starts where its Greek one does. */
export const HEBREW_START_KEY = 'lampas.hebrewInterestStart';

/** The saved step; 5, All in, until the phone has been placed (nothing is hidden before then). */
export const getGreekInterest = async (): Promise<GreekLevel> => greekLevelOf(await getSetting(greekInterestSetting));

/** The saved Hebrew step; 0, no Hebrew, until the phone has been placed. */
export const getHebrewInterest = async (): Promise<HebrewLevel> => hebrewLevelOf(await getSetting(hebrewInterestSetting));

/** Both saved steps, as the Reader picks one by the language of the chapter it draws (levelOf in src/settings/definitions/interest.ts). */
export async function getInterestLevels(): Promise<InterestLevels> {
  const [grc, he] = await Promise.all([getGreekInterest(), getHebrewInterest()]);
  return { grc, he };
}

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
export const isDialKey = (key: string): boolean => key === DIAL_KEY || key === HEBREW_DIAL_KEY || key.startsWith(KEPT_PREFIX) || key.startsWith(HEBREW_KEPT_PREFIX);

/** True when the phone holds anything of a reader: a profile, any setting of his (not the dial's own) or any talk. */
export async function holdsAReader(): Promise<boolean> {
  const [settings, talks] = await Promise.all([db.settings.filter((row) => !isDialKey(row.key)).count(), db.talks.count()]);
  return settings > 0 || talks > 0;
}

/** What the managed settings stand for after a dial of `lang` moves from `from` to `to` while the other dial stands at `other`: the higher of the two dials, before and after. */
async function moveDial(lang: InterestLang, to: InterestLevel): Promise<void> {
  const [greek, hebrew] = await Promise.all([getGreekInterest(), getHebrewInterest()]);
  const from = lang === 'grc' ? greek : hebrew;
  const other = lang === 'grc' ? hebrew : greek;
  const before = Math.max(from, other);
  const after = Math.max(to, other);
  for (const m of MANAGED) {
    if (m.from <= after) continue;
    const row = await db.settings.get(m.key);
    if (row && before >= m.from) await db.settings.put({ key: KEPT_PREFIX + m.key, value: String(row.value) });
    if (m.always ? row?.value !== m.off : row !== undefined && row.value !== m.off) await m.write(m.off);
  }
  for (let step = before + 1; step <= after; step += 1) {
    for (const [key, value] of Object.entries(BRINGS[step as GreekLevel] ?? {})) await bring(key, value);
  }
  // his own value of a setting that comes back wins over the step's starting value
  for (const m of MANAGED) {
    if (m.from <= before || m.from > after) continue;
    const kept = await db.settings.get(KEPT_PREFIX + m.key);
    if (!kept) continue;
    await m.write(String(kept.value));
    await db.settings.delete(KEPT_PREFIX + m.key);
  }
  // the level a dial leaves for 0 is kept for the way back (setLanguages); a dial above 0 keeps none
  if (to === 0 && from > 0) await db.settings.put({ key: keptLevelKey(lang), value: String(from) });
  else if (to > 0) await db.settings.delete(keptLevelKey(lang));
  await setSetting(lang === 'grc' ? greekInterestSetting : hebrewInterestSetting, String(to));
}

/** Moves the Greek dial to `to`: what the steps it passes bring in, what the lower steps hide turned off (his values kept), then the level itself. */
export const setGreekInterest = (to: GreekLevel): Promise<void> => moveDial('grc', to);

/** Moves the Hebrew dial to `to`, the same way. */
export const setHebrewInterest = (to: HebrewLevel): Promise<void> => moveDial('hbo', to);

/** Which languages he reads, as the two dials stand. */
export async function getLanguages(): Promise<Languages> {
  const [greek, hebrew] = await Promise.all([getGreekInterest(), getHebrewInterest()]);
  return languagesOf(greek, hebrew);
}

/** The level a dial was left at when its language was dropped, at least 1 (the level choosing the language again puts it back to), or 1. */
async function levelToRestore(lang: InterestLang): Promise<InterestLevel> {
  const kept = await db.settings.get(keptLevelKey(lang));
  const level = kept ? Number(kept.value) : 1;
  return interestOrOne(level);
}
const interestOrOne = (n: number): InterestLevel => (Number.isInteger(n) && n >= 1 && n <= GREEK_TOP ? (n as InterestLevel) : 1);

/** Chooses the languages he reads by moving the dials: a language chosen has its dial raised from 0 to the level it was left at (else 1), a language dropped has its dial
 * put at 0 (its level kept for the way back). The dials that go up move first, the higher first (so what the lower one passes is already there, and his kept values win over the
 * starting values of the steps), and the ones that go down after, so a setting the other dial still shows is never turned off on the way. */
export async function setLanguages(to: Languages): Promise<void> {
  const [greek, hebrew] = await Promise.all([getGreekInterest(), getHebrewInterest()]);
  const wantGreek = to === 'greek' || to === 'both';
  const wantHebrew = to === 'hebrew' || to === 'both';
  const raises: { level: InterestLevel; move(): Promise<void> }[] = [];
  if (wantGreek && greek === 0) {
    const level = await levelToRestore('grc');
    raises.push({ level, move: () => setGreekInterest(level) });
  }
  if (wantHebrew && hebrew === 0) {
    const level = await levelToRestore('hbo');
    raises.push({ level, move: () => setHebrewInterest(level) });
  }
  for (const raise of raises.sort((a, b) => b.level - a.level)) await raise.move();
  if (!wantGreek && greek > 0) await setGreekInterest(0);
  if (!wantHebrew && hebrew > 0) await setHebrewInterest(0);
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

/** Raises the Hebrew dial to `to` when it stands lower; never lowers it. */
export async function raiseHebrewInterest(to: HebrewLevel): Promise<void> {
  if ((await getHebrewInterest()) < to) await setHebrewInterest(to);
}

/** Places the phone on both dials, once, at the app's start (src/main.tsx): the Greek dial as placeGreekInterest has it, then the Hebrew dial where it was saved, else where its
 * test seam (HEBREW_START_KEY) says, else equal to the Greek one: everything Hebrew hung off the Greek step before, so nothing he could see vanishes (PROVISIONAL). A phone with
 * nothing of a reader starts both at 0. Returns the two levels. */
export async function placeInterest(): Promise<{ greek: GreekLevel; hebrew: HebrewLevel }> {
  const greek = await placeGreekInterest();
  const saved = await db.settings.get(HEBREW_DIAL_KEY);
  if (saved) return { greek, hebrew: hebrewLevelOf(saved.value) };
  const seam = window.localStorage.getItem(HEBREW_START_KEY);
  const hebrew: HebrewLevel = seam !== null && seam !== '' && Number.isInteger(Number(seam)) && Number(seam) >= 0 && Number(seam) <= HEBREW_TOP ? hebrewLevelOf(seam) : greek;
  await setSetting(hebrewInterestSetting, String(hebrew));
  return { greek, hebrew };
}
