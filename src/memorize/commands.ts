// src/memorize/commands.ts — how a verse enters and leaves memorizing (mw-fu7dqf.5, his Q3 C): the named commands the buttons call and the tutor calls too (mw-fu7dqf.12: src/tutor/registry.ts
// registers these same functions, memorize, unmemorize, moveVerse and startSession, so a tap and a tutor `do` run the one function). Plain async functions over the memorize repository and
// his verse lists; each answers {said} in the words the screen shows and the tutor reads back, {skipped} for the references it could not memorize, and {undo} when it changed something the
// tutor's talk can put back. A command that cannot do what it was asked throws, and the registry says why. An Old Testament verse is memorized like a New Testament one, in the languages its own dial allows: English, Hebrew, the Weave (mw-gdcyf98.15, docs/layout/memorize.md).
import { getInterestLevels } from '../data/repositories/greekInterest';
import { memorize, memorizedRowOf, restoreVerseRows, unmemorize, verseRowsOf } from '../data/repositories/memorize';
import { getVerseList, sendVerseListRef, setVerseListRefs } from '../data/repositories/verseLists';
import { listedOf } from '../lists/canonical';
import { openMemorizeSession } from '../nav/route';
import { leaveTalk } from '../talk/leave';
import { languagesFor, langName, type MemorizeLang } from './languages';
import { sourceOf } from './source';

/** What a command did, in words, the references it left alone (printed as 'Ps 62:1-2') and, when it changed something, the way back. */
export interface CommandResult {
  said: string;
  skipped?: string[];
  undo?: () => Promise<void>;
}

/** What the screens and the tutor call a reference: 'Romans 8:28'. */
export const nameOf = (canonical: string): string => listedOf(canonical)?.printed || canonical.replace(/\./, ' ').replace(/\./, ':');

/** 'Ps 62:1-2' for 'Ps.62.1-2', 'Ps 23' for 'Ps.23': the reference as the skipped line prints it. */
export const printedRef = (canonical: string): string => canonical.replace(/\./, ' ').replace(/\./, ':');

const inWords = (langs: readonly MemorizeLang[]): string => langs.map(langName).join(' and ');

/** The references of a list that name a chapter of the Bible, in either testament (a string that names none is left out). */
export function memorizable(refs: readonly string[]): string[] {
  return refs.filter((ref) => listedOf(ref));
}

/** The languages of `ref` that the dial of its own language allows (the Hebrew dial for an Old Testament verse, the Greek for a New Testament one). */
export async function offeredFor(ref: string): Promise<MemorizeLang[]> {
  return languagesFor(await getInterestLevels(), sourceOf(ref));
}

/** The languages asked for that the verse's own dial allows; English when none of them is. */
async function allowed(ref: string, langs: readonly MemorizeLang[]): Promise<MemorizeLang[]> {
  const offered = await offeredFor(ref);
  const kept = langs.filter((lang) => offered.includes(lang));
  return kept.length > 0 ? kept : ['en'];
}

/** Puts a verse (or a range, 'Rom.8.28-30') on the schedule in these languages (English when none are named): only the ones its dial allows, English when none.
 *  The undo takes off the languages this added, and leaves the ones he already had. */
export async function memorizeVerse({ ref, langs = ['en'] }: { ref: string; langs?: readonly MemorizeLang[] }): Promise<CommandResult> {
  if (memorizable([ref]).length === 0) return { said: `${ref} is not a reference Lampas can memorize` };
  const wanted = await allowed(ref, langs);
  const added = await memorize(ref, wanted);
  if (added.length === 0) return { said: `Already memorizing ${nameOf(ref)} in ${inWords(wanted)}` };
  return { said: `Memorizing ${nameOf(ref)} in ${inWords(added)}`, undo: async () => void (await Promise.all(added.map((lang) => unmemorize(ref, lang)))) };
}

/** Takes a verse off the schedule: one language, or every language. What he recalled stays; the undo puts the schedule rows back as they were. */
export async function unmemorizeVerse({ ref, lang }: { ref: string; lang?: MemorizeLang }): Promise<CommandResult> {
  const rows = await verseRowsOf(ref, lang);
  if (rows.length === 0) return { said: `${nameOf(ref)} was not memorized${lang === undefined ? '' : ` in ${langName(lang)}`}` };
  await unmemorize(ref, lang);
  return { said: `Stopped memorizing ${nameOf(ref)}${lang === undefined ? '' : ` in ${langName(lang)}`}`, undo: () => restoreVerseRows(rows) };
}

/** Moves a reference from one of his verse lists to another (`from` and `to` are list ids, as the memorizing fact gives them). The verse stays memorized: only the lists change. The undo puts both lists back as they were. */
export async function moveVerse({ ref, from, to }: { ref: string; from: number; to: number }): Promise<CommandResult> {
  if (from === to) throw new Error('A verse moves between two different lists');
  const [source, target] = await Promise.all([getVerseList(from), getVerseList(to)]);
  if (!source || !target) throw new Error(`There is no list ${source ? to : from}`);
  if (!source.refs.includes(ref)) throw new Error(`${source.name} does not hold ${nameOf(ref)}`);
  const sent = await sendVerseListRef(from, ref, { id: to }, true);
  if (!sent) throw new Error('A list went away before the verse could move');
  if (sent.status === 'already') return { said: `${target.name} holds ${nameOf(ref)} already` };
  return {
    said: `Moved ${nameOf(ref)} from ${source.name} to ${target.name}`,
    undo: async () => {
      await setVerseListRefs(from, source.refs);
      await setVerseListRefs(to, target.refs);
    },
  };
}

/** Opens a session of a verse he memorizes, in that language, as a step of Back marked as a tutor go (an open Talk sheet closes; the Talk sheet comes back with Back). Throws for a verse that is not on his schedule in that language. */
export async function startSession({ ref, lang }: { ref: string; lang: MemorizeLang }): Promise<CommandResult> {
  if (memorizable([ref]).length === 0) throw new Error(`${ref} is not a reference Lampas can memorize`);
  if (!(await memorizedRowOf(ref, lang))) throw new Error(`${nameOf(ref)} is not memorized in ${langName(lang)}: memorize it first`);
  leaveTalk();
  openMemorizeSession(ref, lang, { tutor: true });
  return { said: `Opened ${nameOf(ref)} in ${langName(lang)}` };
}

/** Memorizes, in English, the references the list holds now (one added later is not memorized by itself). */
export async function memorizeList({ listId }: { listId: number }): Promise<CommandResult> {
  const list = await getVerseList(listId);
  if (!list) return { said: 'This list is not here any more' };
  const refs = memorizable(list.refs);
  await Promise.all(refs.map((ref) => memorize(ref, ['en'])));
  return { said: refs.length === 0 ? 'Nothing here to memorize' : `Memorizing ${refs.length} ${refs.length === 1 ? 'reference' : 'references'} in English` };
}

/** Takes every reference the list holds off the schedule, in every language. */
export async function unmemorizeList({ listId }: { listId: number }): Promise<CommandResult> {
  const list = await getVerseList(listId);
  if (!list) return { said: 'This list is not here any more' };
  const refs = memorizable(list.refs);
  await Promise.all(refs.map((ref) => unmemorize(ref)));
  return { said: refs.length === 0 ? 'Nothing here was memorized' : `Stopped memorizing ${refs.length} ${refs.length === 1 ? 'reference' : 'references'}` };
}
