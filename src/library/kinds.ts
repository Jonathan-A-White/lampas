// src/library/kinds.ts — what the Library screen says of each of the seven kinds (docs/design/library-at-scale.md 3.3 and 3.4): their names, the help line of a kind's page, what Pin means for
// them, and the count line a row reads ('19 on · 2 pinned'). Pure: the screens read the shelf and hand the rows here.
import { MAX_PINS, type LibraryRow, type ShelfState } from '../data/repositories';
import { entryOf, KINDS, type CatalogueEntry, type Kind } from '../resources/catalogue';

/** How a kind's rows are set: Off | On | Pin; Off | On (Devotionals have no Pin, the Daily page chooses among them); Off | Chosen (Bibles, one at a time). */
export type Steps = 'pin' | 'on' | 'chosen';

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
    help: 'Opens an Old Testament chapter in the Bible you choose. One at a time: choosing another puts the first back.',
    steps: 'chosen',
  },
  devotional: {
    plural: 'Devotionals',
    singular: 'Devotional',
    help: 'Opens the day in your own copy. The ones that are on are in the draw of Today; Settings > Daily chooses among them.',
    steps: 'on',
  },
};

export const KIND_INFO: readonly KindInfo[] = KINDS.map((kind) => ({ kind, ...INFO[kind] }));

export const infoOf = (kind: Kind): KindInfo => KIND_INFO.find((i) => i.kind === kind)!;

/** What a book is called under its name: the full title when the name is a short one, and its author. */
export const detailOf = (entry: CatalogueEntry): string => [entry.title === entry.short ? '' : entry.title, entry.author ?? ''].filter(Boolean).join(' · ');

/** What a book's control shows. */
export const STATE_LABEL = { off: 'Off', on: 'On', pinned: 'Pinned' } as const;

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];

/** The line a refused pin gives: 'Three pinned already: unpin one first'. */
export const pinRefusal = (): string => `${NUMBER_WORDS[MAX_PINS] ?? MAX_PINS} pinned already: unpin one first`;

/** The rows of the shelf that are books of the catalogue, by Resource ID. */
export function shelfStates(rows: readonly LibraryRow[] | undefined): Map<string, ShelfState> {
  return new Map((rows ?? []).filter((r) => entryOf(r.id) !== undefined).map((r) => [r.id, r.state]));
}

/** How many books of `kind` are on (Pinned ones count) and how many are pinned. */
export function countsOf(kind: Kind, states: ReadonlyMap<string, ShelfState>): { on: number; pinned: number; chosen?: string } {
  const own = [...states].filter(([id, state]) => state !== 'off' && entryOf(id)?.kind === kind);
  const chosen = kind === 'bible' ? entryOf(own[0]?.[0] ?? '')?.short : undefined;
  return { on: own.length, pinned: own.filter(([, state]) => state === 'pinned').length, chosen };
}

/** The count a row of the home reads: '19 on · 2 pinned', 'none on', '1 chosen: LSB'. */
export function countLine(kind: Kind, states: ReadonlyMap<string, ShelfState>): string {
  const { on, pinned, chosen } = countsOf(kind, states);
  if (kind === 'bible') return chosen ? `1 chosen: ${chosen}` : 'none chosen';
  if (on === 0) return 'none on';
  return pinned > 0 ? `${on} on · ${pinned} pinned` : `${on} on`;
}

/** The count a kind's page shows in its header: '19 on', 'none on', '1 chosen'. */
export function headerCount(kind: Kind, states: ReadonlyMap<string, ShelfState>): string {
  const { on } = countsOf(kind, states);
  if (kind === 'bible') return on === 0 ? 'none chosen' : '1 chosen';
  return on === 0 ? 'none on' : `${on} on`;
}
