// src/data/repositories/settings.ts — what he has chosen. A repository owns its transactions.
import { approachOf, DEFAULT_APPROACH } from '../../approaches';
import { db } from '../db';
import { afterRound, DEFAULT_NEW_WORDS_A_DAY, normaliseNewWordsADay, type NewWordsADay, type PaceRounds } from '../pace';
import type { PickerGrammar, WeaveGrammar } from '../grammar/formLevel';
import { MOVE_WINDOW, type GrammarMove } from '../grammar/move';
import { DEFAULT_LAYOUT, isLayout, type ReadingLayout } from '../../layout/layouts';
import { DEFAULT_TEXT_PERCENT, normaliseTextPercent } from '../../appearance/textSizes';
import type { Theme } from '../../appearance/themes';
import { DEFAULT_LOGOS_BIBLE, LOGOS_PARTS, isResourceId, type LogosBibles, type LogosPart } from '../../resources/logosBible';
import { playToOf, type PlayTo } from '../../speech/readSpan';
import { LANGUAGES, normaliseRate, type SettableLanguage, type SpeechRates } from '../../speech/languages';
import { DEFAULT_DEPTH, isDepth, type Depth, type TutorScript } from '../../script/scripts';
import { DEFAULT_PRONUNCIATION, isPronunciation, type GreekPronunciation } from '../../speech/pronunciation';
import { chapterButtonsSetting, immersiveSetting, themeSetting, tipsSetting, variantLessonsOfferSetting, variantsSetting, weaveSetting } from '../../settings/definitions';
import type { ChapterButtons } from '../../settings/definitions/chapterButtons';
import type { Immersive } from '../../settings/definitions/immersive';
import type { Tips } from '../../settings/definitions/tips';
import type { Variants } from '../../settings/definitions/variants';
import type { Weave } from '../../settings/definitions/weave';
import { getSetting, setSetting } from '../../settings/store';

/** The Reader's view: English, or 'greek', which is the chapter's SOURCE view: the Greek of a New Testament chapter and the Hebrew of an Old Testament one (mw-5vvlay.1; src/reader/sourceText.ts). */
export type ReaderView = 'english' | 'greek';

const READER_VIEW_KEY = 'readerView';

/** The saved English | source choice (Greek or Hebrew, by the chapter); English when he has not chosen yet or the saved value is not one of the two. */
export async function getReaderView(): Promise<ReaderView> {
  const row = await db.settings.get(READER_VIEW_KEY);
  return row?.value === 'greek' ? 'greek' : 'english';
}

export async function setReaderView(view: ReaderView): Promise<void> {
  await db.settings.put({ key: READER_VIEW_KEY, value: view });
}

const READER_PLAIN_KEY = 'readerPlain';

/** The Weave he had on when he chose plain English in the Reader's switch (English | Weave | Greek, mw-5r3p30.651), or null when he has not: plain
 * English stands only under that Weave, so turning the Weave to another value brings the woven text back. */
export async function getPlainEnglishUnder(): Promise<Weave | null> {
  const row = await db.settings.get(READER_PLAIN_KEY);
  return row?.value === 'solid' || row?.value === 'solid+learning' ? row.value : null;
}

export async function setPlainEnglishUnder(weave: Weave | null): Promise<void> {
  await db.settings.put({ key: READER_PLAIN_KEY, value: weave ?? '' });
}

const VARIANTS_LAST_ON_KEY = 'variantsLastOn';

/** The value Variants had when the Reader's chip last turned it Off (mw-9ji6ek0.5), or null when it has not: a tap on the chip turns it back On to that value. */
export async function getVariantsLastOn(): Promise<Variants | null> {
  const row = await db.settings.get(VARIANTS_LAST_ON_KEY);
  return row?.value === 'english' || row?.value === 'all' ? row.value : null;
}

/** The Reader's chip: Off when Variants is on (keeping the value it had), else On to the value it had last ('english' the first time). */
export async function toggleVariants(): Promise<void> {
  const now = await getSetting(variantsSetting);
  if (now === 'off') {
    await setSetting(variantsSetting, (await getVariantsLastOn()) ?? 'english');
    return;
  }
  await db.settings.put({ key: VARIANTS_LAST_ON_KEY, value: now });
  await setSetting(variantsSetting, 'off');
}

const LESSONS_OFFER_ANSWERED_KEY = 'variantLessonsOfferAnswered';

/** Whether he has answered the card that offers the lessons on variant readings (mw-9ji6ek0.19), by Read the lessons or Not now: it is not drawn again until Offer the lessons is turned On. */
export async function getVariantLessonsOfferAnswered(): Promise<boolean> {
  return (await db.settings.get(LESSONS_OFFER_ANSWERED_KEY))?.value === 'yes';
}

/** Saves Offer the lessons; turning it On brings the card back, so an answer given before is forgotten. */
export async function setVariantLessonsOffer(value: 'on' | 'off'): Promise<void> {
  if (value === 'on') await db.settings.delete(LESSONS_OFFER_ANSWERED_KEY);
  await setSetting(variantLessonsOfferSetting, value);
}

/** His answer to the card: Read the lessons (`read`) or Not now, which also turns Offer the lessons Off. Either puts the card away. */
export async function answerVariantLessonsOffer(read: boolean): Promise<void> {
  await db.settings.put({ key: LESSONS_OFFER_ANSWERED_KEY, value: 'yes' });
  if (!read) await setSetting(variantLessonsOfferSetting, 'off');
}

/** The three choices of the Reader's switch: plain English, the woven English, the Greek. */
export type ReaderLanguage = 'english' | 'weave' | 'greek';

/** Takes a choice of the Reader's switch: the view, and whether plain English stands under the Weave he has on (with the Weave Off there is no Weave choice). */
export async function chooseReaderLanguage(choice: ReaderLanguage, weave: Weave): Promise<void> {
  if (choice === 'greek') {
    await setReaderView('greek');
    return;
  }
  await setPlainEnglishUnder(choice === 'english' && weave !== 'off' ? weave : null);
  await setReaderView('english');
}

export type { GrammarMove, Immersive, PickerGrammar, Tips, Weave, WeaveGrammar };

// Theme, Weave and Tips are declared once (src/settings/definitions/): these are their old names over the store, until their callers move.
/** The saved Weave choice; off when he has not chosen yet or the saved value is not one of the three. */
export const getWeave = (): Promise<Weave> => getSetting(weaveSetting);
/** Saves the Weave and tells the bus (setting-changed). */
export const setWeave = (weave: Weave): Promise<void> => setSetting(weaveSetting, weave);

const WEAVE_GRAMMAR_KEY = 'weaveGrammar';

/** The saved Weave grammar dial; 'any' (grammar ignored) when he has not chosen yet or the saved value is not one of the three. */
export async function getWeaveGrammar(): Promise<WeaveGrammar> {
  const row = await db.settings.get(WEAVE_GRAMMAR_KEY);
  return row?.value === 'solid' || row?.value === 'solid+frontier' ? row.value : 'any';
}

export async function setWeaveGrammar(grammar: WeaveGrammar): Promise<void> {
  await db.settings.put({ key: WEAVE_GRAMMAR_KEY, value: grammar });
}

/** Which of the phone's voices reads each language: its voiceURI, or null for the phone's default. */
export type VoiceLanguage = SettableLanguage;

const VOICE_KEYS: Record<VoiceLanguage, string> = { english: 'voice.english', greek: 'voice.greek', hebrew: 'voice.hebrew' };
const RATE_KEYS: Record<VoiceLanguage, string> = { english: 'rate.english', greek: 'rate.greek', hebrew: 'rate.hebrew' };

export async function getVoice(language: VoiceLanguage): Promise<string | null> {
  const row = await db.settings.get(VOICE_KEYS[language]);
  return typeof row?.value === 'string' && row.value !== '' ? row.value : null;
}

export async function setVoice(language: VoiceLanguage, voice: string | null): Promise<void> {
  await db.settings.put({ key: VOICE_KEYS[language], value: voice ?? '' });
}

const PRONUNCIATION_KEY = 'greekPronunciation';

/** The saved Greek pronunciation; the default when he has not chosen or the saved value is not one in the list. */
export async function getGreekPronunciation(): Promise<GreekPronunciation> {
  const row = await db.settings.get(PRONUNCIATION_KEY);
  return isPronunciation(row?.value) ? row.value : DEFAULT_PRONUNCIATION;
}

const SWITCH_KEY = 'pronunciationSwitch';

/**
 * Chooses the Greek pronunciation. The sound ideas are learned per pronunciation (src/data/grammar/soundScope.ts, mw-5r3p30.231): a change to another one
 * leaves a note for the Goal screen, kept until it is shown (takePronunciationSwitch), of the scheme he left and the one he chose.
 */
export async function setGreekPronunciation(pronunciation: GreekPronunciation): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const before = await getGreekPronunciation();
    await db.settings.put({ key: PRONUNCIATION_KEY, value: pronunciation });
    if (before !== pronunciation) await db.settings.put({ key: SWITCH_KEY, value: JSON.stringify({ from: before, to: pronunciation }) });
  });
}

/** A switch of pronunciation the Goal screen has not told him about: the scheme he left and the one he chose. */
export interface PronunciationSwitch {
  from: GreekPronunciation;
  to: GreekPronunciation;
}

/** The switch of pronunciation not yet told, and forgets it: the Goal screen says it once. */
export async function takePronunciationSwitch(): Promise<PronunciationSwitch | undefined> {
  return db.transaction('rw', db.settings, async () => {
    const row = await db.settings.get(SWITCH_KEY);
    if (!row) return undefined;
    await db.settings.delete(SWITCH_KEY);
    try {
      const kept = JSON.parse(String(row.value)) as Partial<PronunciationSwitch>;
      return isPronunciation(kept.from) && isPronunciation(kept.to) ? { from: kept.from, to: kept.to } : undefined;
    } catch {
      return undefined;
    }
  });
}

export type { ReadingLayout };

const LAYOUT_KEY = 'layout';

/** The saved reading layout; Verse by verse when he has not chosen or the saved value is not in the layout list. */
export async function getLayout(): Promise<ReadingLayout> {
  const row = await db.settings.get(LAYOUT_KEY);
  return isLayout(row?.value) ? row.value : DEFAULT_LAYOUT;
}

export async function setLayout(layout: ReadingLayout): Promise<void> {
  await db.settings.put({ key: LAYOUT_KEY, value: layout });
}

export type SectionHeadings = 'on' | 'off';

const HEADINGS_KEY = 'sectionHeadings';

/** The saved Section headings choice; on when he has not chosen yet or the saved value is not one of the two. */
export async function getSectionHeadings(): Promise<SectionHeadings> {
  const row = await db.settings.get(HEADINGS_KEY);
  return row?.value === 'off' ? 'off' : 'on';
}

export async function setSectionHeadings(headings: SectionHeadings): Promise<void> {
  await db.settings.put({ key: HEADINGS_KEY, value: headings });
}

const READ_SPAN_KEY = 'readSpan';

/** The saved Play to (the key is still readSpan); the end of the book when he has not chosen yet or the saved value is an old span (verse, passage, chapter). */
export async function getReadSpan(): Promise<PlayTo> {
  const row = await db.settings.get(READ_SPAN_KEY);
  return playToOf(row?.value);
}

export async function setReadSpan(span: PlayTo): Promise<void> {
  await db.settings.put({ key: READ_SPAN_KEY, value: span });
}

/** The saved Immersive reader choice; off when he has not chosen yet or the saved value is not one of the two. */
export const getImmersive = (): Promise<Immersive> => getSetting(immersiveSetting);
/** Saves the Immersive reader choice and tells the bus (setting-changed). */
export const setImmersive = (immersive: Immersive): Promise<void> => setSetting(immersiveSetting, immersive);

/** The saved Chapter buttons choice; show when he has not chosen yet or the saved value is not one of the two. */
export const getChapterButtons = (): Promise<ChapterButtons> => getSetting(chapterButtonsSetting);
/** Saves the Chapter buttons choice and tells the bus (setting-changed). */
export const setChapterButtons = (buttons: ChapterButtons): Promise<void> => setSetting(chapterButtonsSetting, buttons);

/** The saved Tips choice; on when he has not chosen yet or the saved value is not one of the two. */
export const getTips = (): Promise<Tips> => getSetting(tipsSetting);
/** Saves the Tips choice and tells the bus (setting-changed). */
export const setTips = (tips: Tips): Promise<void> => setSetting(tipsSetting, tips);

export type ReadTutor = 'on' | 'off';

const READ_TUTOR_KEY = 'readTutor';

/** The saved Read the tutor's responses aloud choice; on when he has not chosen yet or the saved value is not one of the two. */
export async function getReadTutor(): Promise<ReadTutor> {
  const row = await db.settings.get(READ_TUTOR_KEY);
  return row?.value === 'off' ? 'off' : 'on';
}

export async function setReadTutor(readTutor: ReadTutor): Promise<void> {
  await db.settings.put({ key: READ_TUTOR_KEY, value: readTutor });
}

/** Developer mode: 'hidden' until he finds it (7 taps on the version number on About), then 'on' or 'off' with its switch in Settings. */
export type DeveloperMode = 'hidden' | 'off' | 'on';

const DEVELOPER_KEY = 'developerMode';

export async function getDeveloper(): Promise<DeveloperMode> {
  const row = await db.settings.get(DEVELOPER_KEY);
  return row?.value === 'on' ? 'on' : row?.value === 'off' ? 'off' : 'hidden';
}

export async function setDeveloper(mode: 'on' | 'off'): Promise<void> {
  await db.settings.put({ key: DEVELOPER_KEY, value: mode });
}

/** How deep into a language the tutor goes (Settings > Hebrew in the tutor), kept under the language's setting name ('hebrewDepth'); Hebrew and transliteration when he has not chosen or the saved value is not a depth. */
export async function getScriptDepth(script: Pick<TutorScript, 'settingKey'>): Promise<Depth> {
  const row = await db.settings.get(script.settingKey);
  return isDepth(row?.value) ? row.value : DEFAULT_DEPTH;
}

export async function setScriptDepth(script: Pick<TutorScript, 'settingKey'>, depth: Depth): Promise<void> {
  await db.settings.put({ key: script.settingKey, value: depth });
}

/** The saved Theme; Phone (the phone's own colour scheme) when he has not chosen or the saved value is not one in the list. */
export const getTheme = (): Promise<Theme> => getSetting(themeSetting);
/** Saves the Theme and tells the bus (setting-changed). */
export const setTheme = (theme: Theme): Promise<void> => setSetting(themeSetting, theme);

const TEXT_SIZE_KEY = 'textSize';

/** The saved Text size as a percent of the phone's own (85 to 160); 100 when he has not chosen. */
export async function getTextSize(): Promise<number> {
  const row = await db.settings.get(TEXT_SIZE_KEY);
  return row ? normaliseTextPercent(Number(row.value)) : DEFAULT_TEXT_PERCENT;
}

export async function setTextSize(percent: number): Promise<void> {
  await db.settings.put({ key: TEXT_SIZE_KEY, value: String(normaliseTextPercent(percent)) });
}

/** How fast each language is spoken (1 is normal, 0.5 to 1.5), each saved on its own (as text, like every setting); 1 where he has not chosen. */
export async function getSpeechRate(language: VoiceLanguage): Promise<number> {
  const row = await db.settings.get(RATE_KEYS[language]);
  return normaliseRate(row?.value);
}

export async function getSpeechRates(): Promise<SpeechRates> {
  const entries = await Promise.all(LANGUAGES.map(async (l) => [l.id, await getSpeechRate(l.id)] as const));
  return Object.fromEntries(entries) as SpeechRates;
}

export async function setSpeechRate(language: VoiceLanguage, rate: number): Promise<void> {
  await db.settings.put({ key: RATE_KEYS[language], value: String(normaliseRate(rate)) });
}

const GOAL_KEY = 'goal';

/** The saved goal as text, 'Read 1 John 1:1'; '' when he has none (the settings store keeps text, no table of its own). */
export async function getGoal(): Promise<string> {
  const row = await db.settings.get(GOAL_KEY);
  return typeof row?.value === 'string' ? row.value : '';
}

export async function setGoal(text: string): Promise<void> {
  await db.settings.put({ key: GOAL_KEY, value: text });
}

const QUIZ_GOAL_KEY = 'quizGoal';

/** The longest a kept quiz goal is, in characters (the grind's schemas say the same). */
export const QUIZ_GOAL_MAX = 80;

/** Why he wants the quiz, in his words ('understanding the passage'); '' when he has kept none (the settings store keeps text, no table of its own). */
export async function getQuizGoal(): Promise<string> {
  const row = await db.settings.get(QUIZ_GOAL_KEY);
  return typeof row?.value === 'string' ? row.value.trim().slice(0, QUIZ_GOAL_MAX) : '';
}

export async function setQuizGoal(text: string): Promise<void> {
  await db.settings.put({ key: QUIZ_GOAL_KEY, value: text.trim().slice(0, QUIZ_GOAL_MAX) });
}

const LOGOS_BIBLE_KEYS = Object.fromEntries(LOGOS_PARTS.map((p) => [p.part, p.key])) as Record<LogosPart, string>;

/** The Resource IDs saved for the three parts (undefined for a part with none or a malformed one), read in one go. */
async function savedBibles(): Promise<Record<LogosPart, string | undefined>> {
  const rows = await db.settings.bulkGet(LOGOS_PARTS.map((p) => p.key));
  const saved = (i: number): string | undefined => (typeof rows[i]?.value === 'string' && isResourceId(rows[i]?.value) ? rows[i]?.value.trim() : undefined);
  return { nt: saved(0), ot: saved(1), apocrypha: saved(2) };
}

/** The Resource ID of his Bible in Logos for each part of the canon. The New Testament's is the default (the Legacy Standard Bible) while none was chosen or the saved one is malformed; the
 *  Old Testament and the Apocrypha follow the New Testament's until each is picked. */
export async function getLogosBibles(): Promise<LogosBibles> {
  const saved = await savedBibles();
  const nt = saved.nt ?? DEFAULT_LOGOS_BIBLE;
  return { nt, ot: saved.ot ?? nt, apocrypha: saved.apocrypha ?? nt };
}

/** His Bible in Logos for one part (the New Testament's when none is named). */
export async function getLogosBible(part: LogosPart = 'nt'): Promise<string> {
  return (await getLogosBibles())[part];
}

/** One Bible in Logos for every part: what choosing a Bible in the Library does (KindPage.tsx, TypedBible.tsx). */
export async function setLogosBible(resourceId: string): Promise<void> {
  const id = resourceId.trim();
  await db.settings.bulkPut(Object.values(LOGOS_BIBLE_KEYS).map((key) => ({ key, value: id })));
}

/** The Bible in Logos of one part. The other two are kept as they are now, so a part that was following another does not move with it. */
export async function setLogosBibleFor(part: LogosPart, resourceId: string): Promise<void> {
  const bibles = { ...(await getLogosBibles()), [part]: resourceId.trim() };
  await db.settings.bulkPut((Object.keys(LOGOS_BIBLE_KEYS) as LogosPart[]).map((p) => ({ key: LOGOS_BIBLE_KEYS[p], value: bibles[p] })));
}

const APPROACH_KEY = 'grammarApproach';

/** The id of the chosen grammar approach (src/approaches/); the default while none was chosen or the saved one is no longer listed. */
export async function getGrammarApproach(): Promise<string> {
  const row = await db.settings.get(APPROACH_KEY);
  return typeof row?.value === 'string' && approachOf(row.value) ? row.value : DEFAULT_APPROACH;
}

export async function setGrammarApproach(id: string): Promise<void> {
  await db.settings.put({ key: APPROACH_KEY, value: id });
}

const PICKER_GRAMMAR_KEY = 'pickerGrammar';

/** The grammar level new words are offered at (mw-hqd5bz.11); Frontier grammar when he has not chosen or the saved value is not one of the two. */
export async function getPickerGrammar(): Promise<PickerGrammar> {
  const row = await db.settings.get(PICKER_GRAMMAR_KEY);
  return row?.value === 'solid' ? 'solid' : 'frontier';
}

export async function setPickerGrammar(level: PickerGrammar): Promise<void> {
  await db.settings.put({ key: PICKER_GRAMMAR_KEY, value: level });
}

const GRAMMAR_MOVE_KEY = 'grammarMove';

/** Whether the app moves New words at by how his grammar reviews go; Ask when he has not chosen or the saved value is not one of the three. */
export async function getGrammarMove(): Promise<GrammarMove> {
  const row = await db.settings.get(GRAMMAR_MOVE_KEY);
  return row?.value === 'auto' || row?.value === 'off' ? row.value : 'ask';
}

export async function setGrammarMove(move: GrammarMove): Promise<void> {
  await db.settings.put({ key: GRAMMAR_MOVE_KEY, value: move });
}

const GRAMMAR_ANSWERS_KEY = 'grammarAnswers';

/** His last grammar answers in Review, oldest first, at most MOVE_WINDOW (kept in the settings store as a string of 1 and 0, no table). */
export async function getGrammarAnswers(): Promise<boolean[]> {
  const row = await db.settings.get(GRAMMAR_ANSWERS_KEY);
  return typeof row?.value === 'string' ? [...row.value].filter((c) => c === '1' || c === '0').map((c) => c === '1').slice(-MOVE_WINDOW) : [];
}

/** Adds one answer to the ring of the last MOVE_WINDOW. */
export async function pushGrammarAnswer(right: boolean): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const kept = (await getGrammarAnswers()).concat(right).slice(-MOVE_WINDOW);
    await db.settings.put({ key: GRAMMAR_ANSWERS_KEY, value: kept.map((r) => (r ? '1' : '0')).join('') });
  });
}

/** Forgets the ring: the answers given at one level do not judge the next. */
export async function clearGrammarAnswers(): Promise<void> {
  await db.settings.delete(GRAMMAR_ANSWERS_KEY);
}

const NEW_WORDS_A_DAY_KEY = 'newWordsADay';

/** How many new words a day he asked for (src/data/pace.ts): 0 is Off; 3 when he has not chosen or the saved value is not one of the four. */
export async function getNewWordsADay(): Promise<NewWordsADay> {
  const row = await db.settings.get(NEW_WORDS_A_DAY_KEY);
  return row ? normaliseNewWordsADay(row.value) : DEFAULT_NEW_WORDS_A_DAY;
}

export async function setNewWordsADay(n: NewWordsADay): Promise<void> {
  await db.settings.put({ key: NEW_WORDS_A_DAY_KEY, value: String(n) });
}

const PACE_ROUNDS_KEY = 'paceRounds';

/** The last finished review round and the start of the clean run (kept in the settings store as JSON, no table); null before the first round. */
export async function getPaceRounds(): Promise<PaceRounds | null> {
  const row = await db.settings.get(PACE_ROUNDS_KEY);
  if (typeof row?.value !== 'string') return null;
  try {
    const kept = JSON.parse(row.value) as Partial<PaceRounds>;
    return typeof kept.lastScore === 'number' && typeof kept.lastWhen === 'number' && typeof kept.cleanSince === 'number'
      ? { lastScore: kept.lastScore, lastWhen: kept.lastWhen, cleanSince: kept.cleanSince }
      : null;
  } catch {
    return null;
  }
}

/** Keeps a finished round of `total` items, `right` of them right (a round of none is not kept). */
export async function recordRound(right: number, total: number, now = Date.now()): Promise<void> {
  if (total <= 0) return;
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({ key: PACE_ROUNDS_KEY, value: JSON.stringify(afterRound(await getPaceRounds(), right / total, now)) });
  });
}
