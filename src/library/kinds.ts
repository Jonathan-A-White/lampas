// src/library/kinds.ts — what the Library screen says of each of the nine kinds (docs/design/library-at-scale.md 3.3 and 3.4): their names, the help line of a kind's page, what Pin means for
// them, and the count line a row reads ('19 on · 2 pinned'). Pure: the screens read the shelf and hand the rows here.
import { MAX_PINS, type LibraryRow, type ShelfState } from '../data/repositories';
import { entriesOf, entryOf, KINDS, type CatalogueEntry, type Kind } from '../resources/catalogue';
import type { LogosBibles } from '../resources/logosBible';
import { resourcesForLevel } from '../resources/resourcesForLevel';
import type { InterestLevels } from '../settings/definitions/interest';
import { bibleLine } from './bibleParts';

/** How a kind's rows are set: Off | On | Pin; Off | On (Devotionals have no Pin, the Daily page chooses among them); 'parts' (Bibles: each is set for the New Testament, the Old Testament, the Apocrypha, or all three). */
export type Steps = 'pin' | 'on' | 'parts';

export interface KindInfo {
  kind: Kind;
  /** the row and the page's title: 'Lexicons' */
  plural: string;
  /** one book of it, for a search result: 'Lexicon' */
  singular: string;
  help: string;
  steps: Steps;
}

const INFO: Record<Kind, Omit<KindInfo, 'kind'>> = {
  lexicon: {
    plural: 'Lexicons',
    singular: 'Lexicon',
    help: 'Opens the word you tap at its entry. Pinned ones are on the word sheet; the rest are behind All lexicons.',
    steps: 'pin',
  },
  grammar: {
    plural: 'Grammars',
    singular: 'Grammar',
    help: 'Opens the lesson that teaches a form. Pinned ones are among the lines the idea sheet shows; the rest are behind More books.',
    steps: 'pin',
  },
  'greek-text': {
    plural: 'Greek texts',
    singular: 'Greek text',
    help: 'Opens the verse you are reading in another Greek text, beside the Byzantine one Lampas reads. A pinned one is the first door of the verse.',
    steps: 'pin',
  },
  'hebrew-text': {
    plural: 'Hebrew texts',
    singular: 'Hebrew text',
    help: 'Opens the Old Testament verse you are reading in a Hebrew text of your own. A pinned one is the first door of the verse.',
    steps: 'pin',
  },
  interlinear: {
    plural: 'Interlinears',
    singular: 'Interlinear',
    help: 'Opens the verse in an interlinear, the Greek behind your own translation. A pinned one is the first door of the verse.',
    steps: 'pin',
  },
  commentary: {
    plural: 'Commentaries',
    singular: 'Commentary',
    help: 'Opens the verse you are reading in the volume that covers it. A pinned one is the first door of the verse.',
    steps: 'pin',
  },
  bible: {
    plural: 'Bibles',
    singular: 'Bible',
    help: 'Opens a chapter or a verse in the Bible you set for its part. Each Bible shows the parts it is set for; choose one and say which part: the New Testament, the Old Testament, the Apocrypha, the Septuagint, or all three of the first. Settings > Study resources sets the same four.',
    steps: 'parts',
  },
  devotional: {
    plural: 'Devotionals',
    singular: 'Devotional',
    help: 'Opens the day in your own copy. The ones that are on are in the draw of Today; Settings > Daily chooses among them.',
    steps: 'on',
  },
  sermons: {
    plural: 'Sermons',
    singular: 'Sermon archive',
    help: 'Opens the verse you are reading in your own sermon archive, where Logos has it indexed. Pinned ones are among the books at the verse; the Sermons sheet lists the ones that are on under In Logos.',
    steps: 'pin',
  },
};

export const KIND_INFO: readonly KindInfo[] = KINDS.map((kind) => ({ kind, ...INFO[kind] }));

export const infoOf = (kind: Kind): KindInfo => KIND_INFO.find((i) => i.kind === kind)!;

/** What a book is called under its name: the full title when the name is a short one, and its author. */
export const detailOf = (entry: CatalogueEntry): string => [entry.title === entry.short ? '' : entry.title, entry.author ?? ''].filter(Boolean).join(' · ');

/** What a book's control shows. */
export const STATE_LABEL = { off: 'Off', on: 'On', pinned: 'Pinned' } as const;

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];

const LANGUAGE_WORDS: Partial<Record<CatalogueEntry['lang'], string>> = { grc: 'Greek', he: 'Hebrew' };

/** The line a refused pin gives: 'Three pinned already: unpin one first'; for a kind that holds books of two languages (the lexicons) the pins are counted in the book's language,
 *  and the line names it: 'Three Hebrew lexicons pinned already: unpin one first'. */
export function pinRefusal(entry: CatalogueEntry): string {
  const count = NUMBER_WORDS[MAX_PINS] ?? MAX_PINS;
  const language = LANGUAGE_WORDS[entry.lang];
  const mixed = new Set(entriesOf(entry.kind).map((e) => e.lang)).size > 1;
  return mixed && language ? `${count} ${language} ${infoOf(entry.kind).plural.toLowerCase()} pinned already: unpin one first` : `${count} pinned already: unpin one first`;
}

/** The rows of the shelf that are books of the catalogue, by Resource ID. */
export function shelfStates(rows: readonly LibraryRow[] | undefined): Map<string, ShelfState> {
  return new Map((rows ?? []).filter((r) => entryOf(r.id) !== undefined).map((r) => [r.id, r.state]));
}

/** How many books of `kind` are on (Pinned ones count) and how many are pinned. */
export function countsOf(kind: Kind, states: ReadonlyMap<string, ShelfState>): { on: number; pinned: number } {
  const own = [...states].filter(([id, state]) => state !== 'off' && entryOf(id)?.kind === kind);
  return { on: own.length, pinned: own.filter(([, state]) => state === 'pinned').length };
}

/** How many books are on across the shelf: the Bibles are left out, because Settings sets them (three parts, never none) and a phone with nothing on its shelf must not count two. */
export const booksOn = (states: ReadonlyMap<string, ShelfState>): number => KINDS.filter((k) => k !== 'bible').reduce((sum, kind) => sum + countsOf(kind, states).on, 0);

/** The count a row of the home reads: '19 on · 2 pinned', 'none on', 'LSB for all three'. */
export function countLine(kind: Kind, states: ReadonlyMap<string, ShelfState>, bibles?: LogosBibles): string {
  const { on, pinned } = countsOf(kind, states);
  if (kind === 'bible') return bibles ? bibleLine(bibles) : 'set in Settings';
  if (on === 0) return 'none on';
  return pinned > 0 ? `${on} on · ${pinned} pinned` : `${on} on`;
}

/** The count a kind's page shows in its header: '19 on', 'none on', '3 in use' (the distinct Bibles set for some part). The Bibles are counted from the three Settings keys (`bibles`), the same
 *  fact the line under the search names, so a typed Resource ID the catalogue lacks counts too (mw-fnvjof.17.6); without them the catalogue rows of `states` are counted. */
export function headerCount(kind: Kind, states: ReadonlyMap<string, ShelfState>, bibles?: LogosBibles): string {
  const { on } = countsOf(kind, states);
  if (kind === 'bible') return `${bibles ? new Set(Object.values(bibles)).size : on} in use`;
  return on === 0 ? 'none on' : `${on} on`;
}

/** The line a kind's page gives when it lists a book the dials hide (mw-fnvjof.17.9): the chooser behind "In another book…", the word sheet and the tutor take a Greek book out at Greek 0 and a Hebrew
 *  one at Hebrew 0 (resourcesForLevel), while the page lists every book of the kind and keeps its switches. A kind of one language says 'These Hebrew texts'; a kind of two ('The Hebrew lexicons') names
 *  only the language that is off. Undefined when nothing is hidden. */
export function hiddenLine(kind: Kind, levels: InterestLevels): string | undefined {
  const entries = entriesOf(kind);
  const shown = new Set(resourcesForLevel(entries, levels.grc, undefined, levels));
  const langs = (['he', 'grc'] as const).filter((lang) => entries.some((e) => e.lang === lang && !shown.has(e)));
  if (langs.length === 0) return undefined;
  const names = langs.map((lang) => LANGUAGE_WORDS[lang]!);
  const mixed = new Set(entries.map((e) => e.lang)).size > 1;
  const noun = infoOf(kind).plural.toLowerCase();
  const subject = mixed ? `The ${names.join(' and ')} ${noun}` : `These ${noun}`;
  const language = names.join(' and ');
  return `${subject} are not offered while ${language} ${names.length > 1 ? 'are' : 'is'} off in Which languages? (Settings). Your switches stay as they are; turn ${language} on there to use them.`;
}
