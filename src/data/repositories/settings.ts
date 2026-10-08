// src/data/repositories/settings.ts — what he has chosen. A repository owns its transactions.
import { db } from '../db';

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
