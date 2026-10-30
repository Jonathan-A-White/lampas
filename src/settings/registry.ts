// src/settings/registry.ts — every Settings item the app has, as a list: its key, its label, a one-line hint, longer help, the section
// it sits in, the setting it depends on, the values it allows, and how to read and write it. src/settings/rows.ts adds the rows that
// are not talkable (the study-resource switches, the links) and is the one list the Settings screen draws, searches and hides from. Writing saves the choice (src/data/repositories) and tells the bus, which is all the Settings screen does
// when he taps (it calls `write` here), so a change he asks for in the Bible talk takes the same path. The bible-talk grind is
// told this list (src/settings/grindText.ts builds its schema and instructions from it): a new setting is talkable by adding it
// here, and tests/unit/settings-registry.test.tsx fails if a control of the Settings screen has no entry. A setting declared once
// (src/settings/definitions/: theme, weave, tips, immersive, askBy so far) gets its entry from its definition (`fromDefinition`), in its place in the list.
import { createRegistry, entryOf, MAX_CHANGES, type ChangeResult, type RowMeta as KitRowMeta, type SettingEntry as KitSettingEntry } from 'pwa-kit/settings';
import type { AppliedChange } from './applied';
import { TEXT_SIZES } from '../appearance/textSizes';
import type { Theme } from '../appearance/themes';
import {
  getGoal,
  getGrammarApproach,
  getGrammarMove,
  getPickerGrammar,
  getGreekPronunciation,
  getLayout,
  getReadSpan,
  getReadTutor,
  getScriptDepth,
  getLogosBible,
  getQuizGoal,
  QUIZ_GOAL_MAX,
  setQuizGoal,
  getNewWordsADay,
  setVariantLessonsOffer,
  getSectionHeadings,
  getSpeechRate,
  getSpeechRates,
  getStudyResources,
  getTextSize,
  getVoice,
  getWeaveGrammar,
  setGoal,
  setGrammarApproach,
  setGrammarMove,
  setPickerGrammar,
  setGreekPronunciation,
  setLayout,
  setReadSpan,
  setReadTutor,
  setScriptDepth,
  setLogosBibleFor,
  setNewWordsADay,
  setSectionHeadings,
  setSpeechRate,
  setResourceOn,
  setTextSize,
  setVoice,
  setWeaveGrammar,
  setGreekInterest,
  setHebrewInterest,
  setLanguages,
  getGreekInterest,
  getHebrewInterest,
  type GrammarMove,
  type PickerGrammar,
  type ReadingLayout,
  type ReadTutor,
  type SectionHeadings,
  type WeaveGrammar,
} from '../data/repositories';
import { APPROACHES, DEFAULT_APPROACH, approachOf } from '../approaches';
import { BOOK_INDEX } from '../data/bookIndex';
import { goalTitle, parseGoal } from '../data/goal';
import { getDay, localDate, pickAnotherDevotional, setDevotionalPick } from '../data/daily/dailyStore';
import { RANDOM, devotionalForDay, devotionalOf, tickedDevotionals } from '../data/daily/devotionals';
import { normaliseNewWordsADay } from '../data/pace';
import { publish, type AppEvent } from '../events/bus';
import { LAYOUTS } from '../layout/layouts';
import { DEFAULT_RATE, LANGUAGES, RATE_MAX, RATE_MIN, RATE_STEP, type SettableLanguage } from '../speech/languages';
import { RESOURCES } from '../resources';
import { resourcesForLevel } from '../resources/resourcesForLevel';
import { SOURCES } from '../maps/sources';
import { mapSourceSetting } from './definitions/maps';
import { COMMON_BIBLES, DEFAULT_LOGOS_BIBLE, isResourceId } from '../resources/logosBible';
import { PLAY_TOS, type PlayTo } from '../speech/readSpan';
import { chooseAccent } from '../speech/accents';
import { PRONUNCIATIONS } from '../speech/pronunciation';
import { DEFAULT_DEPTH, DEPTHS, SCRIPTS, type Depth } from '../script/scripts';
import type { Allowed, Dependency, SectionId, SettingDef, SettingValue } from './define';
import { extentChoices, paradigmExtentSetting } from './definitions/grammarExtent';
import { ANOTHER, askBySetting, audioBibleSetting, chapterButtonsSetting, copyLinkSetting, copyNumbersSetting, copyReferenceSetting, copyTextSetting, dailyDevotionalSetting, dailyMemorizeSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting, devotionalDrawSetting, devotionalSetting, englishAccentSetting, fontSetting, greekKeyboardSetting, handwritingSetting, hebrewKeyboardSetting, hebrewPronunciationSetting, immersiveHintSetting, immersiveSetting, ipaCourseSetting, pronunciationSeparateSetting, pronunciationSetting, readLessonsSetting, readingModeSetting, readingPlanSetting, rp2026EnglishSetting, sendSetting, talkSetting, themeSetting, tipsSetting, todaysDevotionalSetting, variantLessonsOfferSetting, variantsSetting, variantWitnessesSetting, weaveOrderSetting, weaveSetting } from './definitions';
import type { Immersive } from './definitions/immersive';
import type { Tips } from './definitions/tips';
import type { Weave } from './definitions/weave';
import { greekFrom, greekInterestSetting, greekLevelOf } from './definitions/greekInterest';
import { hebrewFrom, hebrewInterestSetting, hebrewLevelOf } from './definitions/hebrewInterest';
import { familyOf, separateFrom } from './definitions/pronunciation';
import { LANGUAGES_CHOICES, depthFrom, languagesOf, type Languages } from './definitions/interest';
import { getSetting, setSetting, settingsStore } from './store';

export type { Allowed, Dependency, SectionId, SettingValue };

/** The longest text a talked change of a text setting may hold (the grind's schema says the same). */
export const TEXT_MAX = 80;

/** The voice value that means the phone's own pick; a voice he chose in Settings is its voiceURI, which a talk cannot name. */
export const PHONE_VOICE = 'default';

/** What the Settings screen needs of a row besides its control. */
export type RowMeta = KitRowMeta<SectionId>;

/** An entry of the registry (the kit's, over Lampas's sections): `key` is what the grind and `settings_changes` call it, 'greekRate'; `hint` is one line (at most 90 characters) under the control. */
export type SettingEntry = KitSettingEntry<SectionId>;

function choice(
  key: string,
  label: string,
  hint: string,
  values: readonly { value: string; label: string }[],
  read: () => Promise<SettingValue>,
  write: (value: string) => Promise<void>,
  meta: RowMeta,
): SettingEntry {
  return {
    ...meta,
    key,
    label,
    hint,
    allowed: { kind: 'choice', values },
    read,
    write: (value) => write(String(value)),
    show: (value) => `${label}: ${values.find((v) => v.value === value)?.label ?? String(value)}`,
  };
}

// The per-setting kinds the declared settings published before setting-changed, still published after it while feature steps read them
// (docs/module-map.md R2a); nothing in the app listens to them any more.
const OLD_KINDS: Readonly<Record<string, (value: SettingValue) => AppEvent>> = {
  theme: (value) => ({ kind: 'theme-changed', theme: value as Theme }),
  weave: (value) => ({ kind: 'weave-changed', weave: value as Weave }),
  tips: (value) => ({ kind: 'tips-changed', tips: value as Tips }),
  immersiveReader: (value) => ({ kind: 'immersive-changed', immersive: value as Immersive }),
};

/** The entry of a setting declared once (src/settings/definitions/): read and saved through src/settings/store.ts, which the kit's entryOf is given; a write also tells the old per-setting kind. */
function fromDefinition<T extends SettingValue>(def: SettingDef<T>): SettingEntry {
  return {
    ...entryOf<SectionId>(def, settingsStore),
    write: async (value) => {
      const parsed = def.parse(value);
      await setSetting(def, parsed);
      const old = OLD_KINDS[def.key];
      if (old) publish(old(parsed));
    },
  };
}

// One depth setting per script the tutor writes (src/script/scripts.ts): Hebrew's is 'hebrewDepth', Settings > Hebrew in the tutor.
const depthEntries = SCRIPTS.map((script) =>
  choice(
    script.settingKey,
    script.settingLabel,
    `How the tutor writes a ${script.label} word: its sound, the letters, or both.`,
    DEPTHS.map((d) => ({ value: d.id, label: d.label })),
    () => getScriptDepth(script),
    async (value) => {
      await setScriptDepth(script, value as Depth);
      publish({ kind: 'script-depth-changed', script: script.id, depth: value as Depth });
    },
    {
      section: 'hebrew',
      dependsOn: hebrewFrom(1),
      help: `How deep into ${script.label} the tutor goes when it writes a ${script.label} word:\n\n${DEPTHS.map((d) => `- **${d.label}** (${d.id}) writes it like ${script.examples[d.id]}`).join('\n')}\n\n${DEPTHS.find((d) => d.id === DEFAULT_DEPTH)?.label} by default.`,
    },
  ),
);

/** English accent: saved like any declared setting, and handed to the accent module at once, so the next hint drawn is said in it. */
const englishAccentEntry: SettingEntry = (() => {
  const entry = fromDefinition(englishAccentSetting);
  return {
    ...entry,
    write: async (value) => {
      await entry.write(value);
      chooseAccent(englishAccentSetting.parse(value));
    },
  };
})();

/** What Today shows now: Which devotional and the draw as they stand, and the id of the devotional of the phone's date (the day's pick while Random). */
async function devotionalToday(): Promise<{ random: boolean; ticked: string[]; date: string; id: string }> {
  const now = new Date();
  const date = localDate(now);
  const [choice, draw, day] = await Promise.all([getSetting(devotionalSetting), getSetting(devotionalDrawSetting), getDay(date)]);
  const ticked = tickedDevotionals(draw);
  return { random: choice === RANDOM, ticked, date, id: devotionalForDay(choice, ticked, now, day.devotional).id };
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
    if (value === ANOTHER) await pickAnotherDevotional(today.date, today.id, today.ticked);
    else if (devotionalOf(String(value))) await setDevotionalPick(today.date, String(value));
    else return;
    publish({ kind: 'setting-changed', key: todaysDevotionalSetting.key, value });
  },
  show: (value) => `${todaysDevotionalSetting.label}: ${value === ANOTHER ? 'another one' : (devotionalOf(String(value))?.title ?? String(value))}`,
};

const textSizeId = (percent: number): SettingValue => TEXT_SIZES.find((t) => t.percent === percent)?.id ?? percent;

/** The dependency of a language's voice and speed rows: English always, Greek and Hebrew from Curious on their own dial. */
const languageFrom = (language: SettableLanguage): Dependency | undefined => (language === 'greek' ? greekFrom(1) : language === 'hebrew' ? hebrewFrom(1) : undefined);

/** The voice he chose for each language (null: the phone's own pick), as voices-changed carries them. */
const getVoices = async (): Promise<Record<SettableLanguage, string | null>> =>
  Object.fromEntries(await Promise.all(LANGUAGES.map(async (l) => [l.id, await getVoice(l.id)] as const))) as Record<SettableLanguage, string | null>;

const voiceEntries = LANGUAGES.map((l): SettingEntry => {
  const entry = choice(
    `${l.id}Voice`,
    `${l.label} voice`,
    `Which voice reads ${l.label} aloud.`,
    [{ value: PHONE_VOICE, label: 'Phone default' }],
    async () => (await getVoice(l.id)) ?? PHONE_VOICE,
    async (value) => {
      const voice = value === PHONE_VOICE || value === '' ? null : value;
      await setVoice(l.id, voice);
      publish({ kind: 'voices-changed', voices: await getVoices() });
    },
    {
      section: 'voices',
      dependsOn: languageFrom(l.id),
      help: "Phone default lets the phone choose. Only the phone's own pick can be asked for; the other voices are the phone's.",
    },
  );
  // A voice he chose reads as itself when it is put back by an Undo.
  return { ...entry, show: (value) => `${l.label} voice: ${value === PHONE_VOICE ? 'Phone default' : String(value)}` };
});

const rateEntries = LANGUAGES.map(
  (l): SettingEntry => ({
    section: 'speed',
    dependsOn: languageFrom(l.id),
    key: `${l.id}Rate`,
    label: `${l.label} speed`,
    hint: `How fast ${l.label} is read aloud; ${DEFAULT_RATE} is normal, smaller is slower.`,
    allowed: { kind: 'number', min: RATE_MIN, max: RATE_MAX, step: RATE_STEP },
    read: () => getSpeechRate(l.id),
    write: async (value) => {
      await setSpeechRate(l.id, Number(value));
      publish({ kind: 'rates-changed', rates: await getSpeechRates() });
    },
    show: (value) => `${l.label} speed ${Number(value)}x`,
  }),
);

// The goal is checked against the committed index (src/data/bookIndex.ts), so a book, chapter or verse the text lacks is refused at once.
const INDEX = BOOK_INDEX;

/** The goal text names, as `parseGoal` reads it; '' is no goal. */
const goalOf = (value: string) => (value.trim() === '' ? null : (parseGoal(value, INDEX) ?? null));

const goalEntry: SettingEntry = {
  section: 'goal',
  dependsOn: depthFrom(4),
  key: 'goal',
  label: 'Goal',
  hint: 'The passage you are working toward: a book, a chapter or a verse.',
  allowed: { kind: 'text', valid: (value) => value.trim() === '' || goalOf(value) !== null, example: '1 John 1:1' },
  read: getGoal,
  write: async (value) => {
    const goal = goalOf(String(value));
    await setGoal(goal ? goalTitle(goal, INDEX) : '');
    publish({ kind: 'goal-changed', goal });
  },
  show: (value) => {
    const goal = goalOf(String(value));
    return `Goal: ${goal ? goalTitle(goal, INDEX) : 'none'}`;
  },
};

const quizGoalEntry: SettingEntry = {
  section: 'studyWay',
  dependsOn: depthFrom(3),
  key: 'quizGoal',
  label: 'Quiz goal',
  hint: 'Why you want Quiz me; the tutor quizzes to match. Empty: it asks.',
  help: 'What you want from a quiz, in your own words, such as understanding the passage, learning Greek or Hebrew, learning English or just reading the Bible. A kept goal is sent with every quiz and the tutor quizzes to match; with none kept, Quiz me opens by asking you.',
  allowed: { kind: 'text', valid: (value) => value.trim().length <= QUIZ_GOAL_MAX, example: 'understanding the passage', note: `a short phrase in his words, at most ${QUIZ_GOAL_MAX} characters; "" for none` },
  read: getQuizGoal,
  write: async (value) => {
    await setQuizGoal(String(value));
  },
  show: (value) => `Quiz goal: ${String(value).trim() === '' ? 'none' : String(value).trim()}`,
};

// Bible in Logos (mw-5r3p30.841) is kept for each part of the canon: this setting is the New Testament's, the one `logosBible` always was. The Old Testament's and the Apocrypha's follow it until
// each is picked and are rows of their own in rows.ts (PART_ROWS), not settings the tutor reads: its Settings request has no room for two more.
const logosBibleEntry: SettingEntry = {
  section: 'resources',
  dependsOn: { key: 'resource.logos', shown: (value) => value === 'on' },
  key: 'logosBible',
  label: 'Bible in Logos',
  hint: 'The Bible that New Testament verses open in, in Logos.',
  help: `The Bible in your Logos library that New Testament verses open in, named by its Resource ID, such as ${DEFAULT_LOGOS_BIBLE} (the Legacy Standard Bible). It shows only while Logos is On. The Old Testament and the Apocrypha have a Bible of their own below it; Library > Bibles sets all three at once.`,
  allowed: { kind: 'text', valid: isResourceId, example: DEFAULT_LOGOS_BIBLE },
  read: getLogosBible,
  write: async (value) => {
    await setLogosBibleFor('nt', String(value));
  },
  show: (value) => `Bible in Logos: ${COMMON_BIBLES.find((b) => b.id === value)?.name ?? String(value)}`,
};

const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

// One on/off switch per study resource (src/resources): the Settings screen's own switch, kept in the store as 'resource.<id>'. Turning
// one on by talk skips the check the screen makes for an app on this phone; the word sheet says so when a link finds no app.
const resourceEntries = RESOURCES.map((r) =>
  choice(
    `resource.${r.id}`,
    r.name,
    r.describe,
    ON_OFF,
    async () => ((await getStudyResources()).on.includes(r.id) ? 'on' : 'off'),
    (value) => setResourceOn(r.id, value === 'on'),
    // a resource the dial hides at Just English (a Greek one: Strong's, the word sheet's number and its link) is drawn from Curious up; the dial's selector decides (mw-5r3p30.710)
    { section: 'resources', dependsOn: resourcesForLevel([r], 0).length === 0 ? { key: 'greekInterest', shown: (value) => resourcesForLevel([r], greekLevelOf(value)).length > 0 } : undefined },
  ),
);

// One On/Off switch per map source (src/maps/index.ts SOURCES): 'maps.<id>', Settings > Study resources > Maps (src/settings/definitions/maps.ts). A source that needs Logos is drawn only while Logos is On.
const mapEntries = SOURCES.map((source) => fromDefinition(mapSourceSetting(source)));

/** How much Greek (the dial at the top of the Settings home): writing it moves the dial, which brings in and turns off what the steps change (src/data/repositories/greekInterest.ts). */
const greekInterestEntry: SettingEntry = {
  ...fromDefinition(greekInterestSetting),
  write: (value) => setGreekInterest(greekLevelOf(value)),
};

/** How much Hebrew (under the Greek dial): the same, for the Hebrew dial. */
const hebrewInterestEntry: SettingEntry = {
  ...fromDefinition(hebrewInterestSetting),
  write: (value) => setHebrewInterest(hebrewLevelOf(value)),
};

/**
 * Which languages he reads (first row of the Settings home, mw-gdcyf98.2): the two dials' own state, not a setting of its own, so it has no store. Reading it answers
 * languagesOf the dials; writing it moves them (setLanguages): English only puts both at 0, Greek or Hebrew keeps that one and puts the other at 0, Both raises each dial
 * that stands at 0 to the level it was left at (else 1). The dials' rows are drawn only while their language is chosen.
 */
const languagesEntry: SettingEntry = {
  key: 'languages',
  section: 'dial',
  label: 'Which languages?',
  // PROVISIONAL (the Mayor's words, the Governor to confirm)
  hint: 'The Bible in English, or with its Greek, its Hebrew, or both',
  allowed: { kind: 'choice', values: LANGUAGES_CHOICES },
  read: async () => languagesOf(await getGreekInterest(), await getHebrewInterest()),
  write: (value) => setLanguages(String(value) as Languages),
  show: (value) => `Which languages?: ${LANGUAGES_CHOICES.find((c) => c.value === value)?.label ?? String(value)}`,
};

/** Chooses the Greek pronunciation and tells the bus. */
async function writeGreekPronunciation(value: string): Promise<void> {
  await setGreekPronunciation(value);
  publish({ kind: 'pronunciation-changed', pronunciation: value });
}

const hebrewPronunciationEntry = fromDefinition(hebrewPronunciationSetting);

/** Puts both languages on the family's schemes: what writing the family does, and what turning 'Set each language on its own' off does. */
async function applyFamily(id: unknown): Promise<void> {
  const family = familyOf(id);
  await writeGreekPronunciation(family.greek);
  await hebrewPronunciationEntry.write(family.hebrew);
}

/** Pronunciation (the family, mw-gdcyf98.6): saved, then it writes both languages' own pronunciation. */
const pronunciationEntry: SettingEntry = (() => {
  const entry = fromDefinition(pronunciationSetting);
  return {
    ...entry,
    write: async (value) => {
      await entry.write(value);
      await applyFamily(value);
    },
  };
})();

/** Set each language on its own: turning it off puts both languages back on the family (the two rows go, and what they held with them). */
const pronunciationSeparateEntry: SettingEntry = (() => {
  const entry = fromDefinition(pronunciationSeparateSetting);
  return {
    ...entry,
    write: async (value) => {
      await entry.write(value);
      if (pronunciationSeparateSetting.parse(value) === 'off') await applyFamily(await getSetting(pronunciationSetting));
    },
  };
})();

/** Every talkable Settings item. (The screen draws them in src/settings/rows.ts's order, section by section.) */
export const SETTINGS: readonly SettingEntry[] = [
  languagesEntry,
  greekInterestEntry,
  hebrewInterestEntry,
  fromDefinition(themeSetting),
  fromDefinition(fontSetting),
  choice(
    'textSize',
    'Text size',
    "How big the text is, in steps of the phone's own size.",
    TEXT_SIZES.map((t) => ({ value: t.id, label: t.label })),
    async () => textSizeId(await getTextSize()),
    async (value) => {
      const percent = TEXT_SIZES.find((t) => t.id === value)?.percent ?? Number(value);
      await setTextSize(percent);
      publish({ kind: 'text-size-changed', percent: await getTextSize() });
    },
    { section: 'appearance' },
  ),
  choice(
    'layout',
    'Layout',
    'Verses one per line, or run together in paragraphs.',
    LAYOUTS.map((l) => ({ value: l.id, label: l.label })),
    getLayout,
    async (value) => {
      await setLayout(value as ReadingLayout);
      publish({ kind: 'layout-changed', layout: value as ReadingLayout });
    },
    {
      section: 'layout',
      help: 'How the verses are set on the page:\n\n- **Verse by verse**: one verse per line.\n- **Paragraph**: runs the verses of a paragraph together, with small verse numbers.',
    },
  ),
  choice(
    'sectionHeadings',
    'Section headings',
    "The Bible's headings above their verses, shown or not.",
    ON_OFF,
    getSectionHeadings,
    async (value) => {
      await setSectionHeadings(value as SectionHeadings);
      publish({ kind: 'headings-changed', headings: value as SectionHeadings });
    },
    { section: 'headings' },
  ),
  fromDefinition(readingModeSetting),
  fromDefinition(chapterButtonsSetting),
  fromDefinition(copyTextSetting),
  fromDefinition(copyReferenceSetting),
  fromDefinition(copyNumbersSetting),
  fromDefinition(copyLinkSetting),
  fromDefinition(immersiveSetting),
  fromDefinition(immersiveHintSetting),
  choice(
    'readSpan',
    'Play to',
    'Play goes on from here. To hear less, tap a verse, a section heading or the place line.',
    PLAY_TOS.map((s) => ({ value: s.id, label: s.label })),
    getReadSpan,
    async (value) => {
      await setReadSpan(value as PlayTo);
      publish({ kind: 'read-span-changed', span: value as PlayTo });
    },
    {
      section: 'readAloud',
      help: `Where the header's Play stops; it always goes on from the verse he is at:\n\n${PLAY_TOS.map((s) => `- **${s.label}** stops ${s.stops}`).join('\n')}\n\nA shorter reading comes from what he taps: the play button or Listen on a verse reads that verse only, a section heading's view reads that section, the place line's chapter view reads that chapter.`,
    },
  ),
  fromDefinition(readLessonsSetting),
  choice(
    'readTutor',
    "Read the tutor's responses aloud",
    'The tutor\'s answers and reading verdicts are spoken as they arrive.',
    [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    getReadTutor,
    async (value) => {
      await setReadTutor(value as ReadTutor);
      publish({ kind: 'read-tutor-changed', readTutor: value as ReadTutor });
    },
    {
      section: 'readTutor',
      help: "Whether the tutor's responses are spoken the moment they arrive, with no tap: the reading check's verdict (its heading, its note and each word to fix with its tip, never the verse itself) and the answers to what he asks. On by default; Off speaks nothing by itself (the speaker on an answer still reads it).",
    },
  ),
  fromDefinition(askBySetting),
  fromDefinition(talkSetting),
  fromDefinition(sendSetting),
  ...depthEntries,
  fromDefinition(tipsSetting),
  fromDefinition(weaveSetting),
  choice(
    'weaveGrammar',
    'Grammar',
    'Keep only forms whose grammar you have.',
    extentChoices('weaveGrammar'),
    getWeaveGrammar,
    async (value) => {
      await setWeaveGrammar(value as WeaveGrammar);
      publish({ kind: 'weave-grammar-changed', grammar: value as WeaveGrammar });
    },
    {
      section: 'weave',
      dependsOn: { key: 'weave', shown: (value) => value !== 'off' },
      help: 'Of the woven Greek or Hebrew, keep only forms whose grammar you have at this level: Any, Solid, or Solid and frontier. It shows only while the Weave is not Off.',
    },
  ),
  fromDefinition(weaveOrderSetting),
  fromDefinition(variantsSetting),
  fromDefinition(variantWitnessesSetting),
  fromDefinition(rp2026EnglishSetting),
  { ...fromDefinition(variantLessonsOfferSetting), write: async (value) => setVariantLessonsOffer(variantLessonsOfferSetting.parse(value)) },
  choice(
    'newWordsADay',
    'New words a day',
    'How many new words are offered a day.',
    [
      { value: '0', label: 'Off' },
      { value: '3', label: '3' },
      { value: '5', label: '5' },
      { value: '10', label: '10' },
    ],
    async () => String(await getNewWordsADay()),
    async (value) => {
      await setNewWordsADay(normaliseNewWordsADay(value));
    },
    {
      section: 'newWords',
      dependsOn: depthFrom(3),
      help: 'From the chapter you are reading, most common first. Off offers none; none while many reviews are due or the last round went badly; a clean week adds a notch.',
    },
  ),
  choice(
    'pickerGrammar',
    'New words at',
    'Offer new words by the grammar of their form.',
    extentChoices('pickerGrammar'),
    getPickerGrammar,
    async (value) => {
      await setPickerGrammar(value as PickerGrammar);
    },
    {
      section: 'newWords',
      dependsOn: { key: 'newWordsADay', shown: (value) => value !== '0' },
      help: 'Offer only new words whose form uses grammar you have at this level. It shows only while New words a day is not Off.',
    },
  ),
  choice(
    'grammarMove',
    'Move it',
    'Whether the app moves that level for you.',
    [
      { value: 'ask', label: 'Ask' },
      { value: 'auto', label: 'Auto' },
      { value: 'off', label: 'Off' },
    ],
    getGrammarMove,
    async (value) => {
      await setGrammarMove(value as GrammarMove);
    },
    {
      section: 'newWords',
      dependsOn: { key: 'newWordsADay', shown: (value) => value !== '0' },
      help: 'Whether New words at moves by how your grammar reviews go:\n\n- **Ask**: offers.\n- **Auto**: moves and says so.\n- **Off**: never.\n\nIt shows only while New words a day is not Off.',
    },
  ),
  fromDefinition(paradigmExtentSetting),
  goalEntry,
  choice(
    'grammarApproach',
    'Grammar approach',
    'The order grammar is taught and tested in.',
    APPROACHES.map((a) => ({ value: a.id, label: a.name })),
    getGrammarApproach,
    async (value) => {
      const approach = approachOf(value)?.id ?? DEFAULT_APPROACH;
      await setGrammarApproach(approach);
      publish({ kind: 'approach-changed', approach });
    },
    { section: 'approach', dependsOn: greekFrom(3) },
  ),
  fromDefinition(handwritingSetting),
  ...voiceEntries,
  ...rateEntries,
  pronunciationEntry,
  pronunciationSeparateEntry,
  choice('greekPronunciation', 'Greek pronunciation', 'How Greek is pronounced when it is read aloud.', PRONUNCIATIONS.map((p) => ({ value: p.id, label: p.label })), getGreekPronunciation, writeGreekPronunciation, {
    section: 'pronunciation',
    dependsOn: separateFrom('grc'),
  }),
  hebrewPronunciationEntry,
  englishAccentEntry,
  fromDefinition(ipaCourseSetting),
  ...resourceEntries,
  logosBibleEntry,
  ...mapEntries,
  fromDefinition(audioBibleSetting),
  fromDefinition(readingPlanSetting),
  fromDefinition(dailyReviewSetting),
  fromDefinition(dailyMemorizeSetting),
  fromDefinition(dailyPlanSetting),
  fromDefinition(dailyPsalmsSetting),
  fromDefinition(dailyDevotionalSetting),
  fromDefinition(devotionalSetting),
  fromDefinition(devotionalDrawSetting),
  todaysDevotionalEntry,
  fromDefinition(dailyTicksSetting),
  fromDefinition(greekKeyboardSetting),
  fromDefinition(hebrewKeyboardSetting),
  quizGoalEntry,
];

/** The registry over SETTINGS (the kit's createRegistry): it looks a setting up, saves a change and checks a talked one against what each setting allows. */
const registry = createRegistry<SectionId>(SETTINGS, { textMax: TEXT_MAX });

export const settingOf = registry.settingOf;

/** Saves a choice and tells the bus: what the Settings screen does when he taps a control. Throws for a key that is no setting. */
export const writeSetting = registry.write;

export type { AppliedChange, ChangeResult };
export { MAX_CHANGES };

/** Checks each change the grind asked for against the registry and applies the valid ones in order, one after the other (so a later change of the same setting is
 * from the earlier one). Anything else is ignored and said so in `refused`; `skipUnchanged` writes nothing, and says nothing, for a setting already set that way. */
export const applyChanges = registry.applyChanges;

/** A setting change the tutor offers instead of making (mw-5r3p30.186): `{key, value}` checked as applyChanges would check it, with the sentence the button and the
 * spoken read-back use ('Change Theme: Dark'); undefined for anything the registry would refuse. */
export const offeredChange = registry.offeredChange;

/** Puts back what `change` replaced, the same way it was written. */
export const undoChange = registry.undoChange;

/** What each setting holds now, as the grind may name it (a voice he chose is 'other'): sent with every talk, so 'slower' is from where it stands. */
export const currentSettings = registry.currentSettings;
