// src/memorize/commands.ts — how a verse enters and leaves memorizing (mw-fu7dqf.5, his Q3 C): the named commands the buttons call and the tutor will call too (the tutor-drives epic
// registers these same functions). Plain async functions over the memorize repository and his verse lists; each answers {said} in the words the screen shows and the tutor reads back,
// and {skipped} for the references it could not memorize. The Old Testament has no text in Lampas, so an Old Testament reference is skipped, never memorized (docs/layout/memorize.md).
import { getGreekInterest } from '../data/repositories/greekInterest';
import { memorize, unmemorize } from '../data/repositories/memorize';
import { getVerseList } from '../data/repositories/verseLists';
import { listedOf } from '../lists/canonical';
import { languagesFor, langName, type MemorizeLang } from './languages';

/** What a command did, in words, and the references it left alone (printed as 'Ps 62:1-2'). */
export interface CommandResult {
  said: string;
  skipped?: string[];
}

/** The sentence that names the references Lampas cannot memorize. */
export const NO_OT_TEXT = 'No Old Testament text in Lampas yet';

/** 'Ps 62:1-2' for 'Ps.62.1-2', 'Ps 23' for 'Ps.23': the reference as the skipped line prints it. */
export const printedRef = (canonical: string): string => canonical.replace(/\./, ' ').replace(/\./, ':');

/** The line under a list's switch for the references it cannot memorize, or null when there are none. */
export const skippedLine = (skipped: readonly string[]): string | null => (skipped.length === 0 ? null : `${NO_OT_TEXT}: ${skipped.join(', ')}`);

const inWords = (langs: readonly MemorizeLang[]): string => langs.map(langName).join(' and ');

/** The references of a list that can be memorized (the New Testament ones) and the ones that cannot (printed). A string that names no chapter is left out of both. */
export function splitRefs(refs: readonly string[]): { nt: string[]; ot: string[] } {
  const nt: string[] = [];
  const ot: string[] = [];
  for (const ref of refs) {
    const listed = listedOf(ref);
    if (listed?.testament === 'nt') nt.push(ref);
    else if (listed) ot.push(printedRef(ref));
  }
  return { nt, ot };
}

/** The languages asked for that his Greek dial allows; English when none of them is. */
async function allowed(langs: readonly MemorizeLang[]): Promise<MemorizeLang[]> {
  const offered = languagesFor(await getGreekInterest());
  const kept = langs.filter((lang) => offered.includes(lang));
  return kept.length > 0 ? kept : ['en'];
}

/** Puts a verse (or a range, 'Rom.8.28-30') on the schedule in these languages: only the ones his Greek dial allows, English when none. An Old Testament reference is skipped. */
export async function memorizeVerse({ ref, langs }: { ref: string; langs: readonly MemorizeLang[] }): Promise<CommandResult> {
  const { nt, ot } = splitRefs([ref]);
  if (ot.length > 0) return { said: `${NO_OT_TEXT}: ${ot.join(', ')}`, skipped: ot };
  if (nt.length === 0) return { said: `${ref} is not a reference Lampas can memorize` };
  const wanted = await allowed(langs);
  const added = await memorize(ref, wanted);
  return { said: added.length === 0 ? `Already memorizing in ${inWords(wanted)}` : `Memorizing in ${inWords(added)}` };
}

/** Takes a verse off the schedule: one language, or every language. What he recalled stays. */
export async function unmemorizeVerse({ ref, lang }: { ref: string; lang?: MemorizeLang }): Promise<CommandResult> {
  await unmemorize(ref, lang);
  return { said: lang === undefined ? 'Stopped memorizing' : `Stopped memorizing in ${langName(lang)}` };
}

/** Memorizes, in English, the New Testament references the list holds now (one added later is not memorized by itself); the Old Testament ones are skipped and named. */
export async function memorizeList({ listId }: { listId: number }): Promise<CommandResult> {
  const list = await getVerseList(listId);
  if (!list) return { said: 'This list is not here any more' };
  const { nt, ot } = splitRefs(list.refs);
  await Promise.all(nt.map((ref) => memorize(ref, ['en'])));
  const line = skippedLine(ot);
  const done = nt.length === 0 ? 'Nothing here to memorize' : `Memorizing ${nt.length} ${nt.length === 1 ? 'reference' : 'references'} in English`;
  return { said: line ? `${done}. ${line}` : done, ...(ot.length > 0 ? { skipped: ot } : {}) };
}

/** Takes every New Testament reference the list holds off the schedule, in every language. */
export async function unmemorizeList({ listId }: { listId: number }): Promise<CommandResult> {
  const list = await getVerseList(listId);
  if (!list) return { said: 'This list is not here any more' };
  const { nt } = splitRefs(list.refs);
  await Promise.all(nt.map((ref) => unmemorize(ref)));
  return { said: nt.length === 0 ? 'Nothing here was memorized' : `Stopped memorizing ${nt.length} ${nt.length === 1 ? 'reference' : 'references'}` };
}
