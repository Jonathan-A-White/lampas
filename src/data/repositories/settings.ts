// src/data/repositories/settings.ts — what he has chosen. A repository owns its transactions.
import { db } from '../db';
import { DEFAULT_LAYOUT, isLayout, type ReadingLayout } from '../../layout/layouts';
import { DEFAULT_PRONUNCIATION, isPronunciation, type GreekPronunciation } from '../../speech/pronunciation';

export type ReaderView = 'english' | 'greek';

const READER_VIEW_KEY = 'readerView';

/** The saved English | Greek choice; English when he has not chosen yet or the saved value is not one of the two. */
export async function getReaderView(): Promise<ReaderView> {
  const row = await db.settings.get(READER_VIEW_KEY);
  return row?.value === 'greek' ? 'greek' : 'english';
}

export async function setReaderView(view: ReaderView): Promise<void> {
  await db.settings.put({ key: READER_VIEW_KEY, value: view });
}

export type Weave = 'off' | 'solid';

const WEAVE_KEY = 'weave';

/** The saved Weave choice; off when he has not chosen yet or the saved value is not one of the two. */
export async function getWeave(): Promise<Weave> {
  const row = await db.settings.get(WEAVE_KEY);
  return row?.value === 'solid' ? 'solid' : 'off';
}

export async function setWeave(weave: Weave): Promise<void> {
  await db.settings.put({ key: WEAVE_KEY, value: weave });
}

/** Which of the phone's voices reads each language: its voiceURI, or null for the phone's default. */
export type VoiceLanguage = 'english' | 'greek';

const VOICE_KEYS: Record<VoiceLanguage, string> = { english: 'voice.english', greek: 'voice.greek' };

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

export async function setGreekPronunciation(pronunciation: GreekPronunciation): Promise<void> {
  await db.settings.put({ key: PRONUNCIATION_KEY, value: pronunciation });
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
