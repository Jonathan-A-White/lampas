// src/resources/catalogue.ts — the Logos catalogue (mw-rfjjzd.2, docs/design/library-at-scale.md 3.1): what Lampas knows how to open in his Logos library, and where. One generated
// JSON file per kind in ./catalogue/, written by `npm run logos:catalogue` (scripts/logos-catalogue.ts) from the rules in data/logos/catalogue-rules.json and a Logos export, and committed.
// The lists the app read before (LEXICONS in logos.ts, GRAMMAR_BOOKS, WORKS, COMMON_BIBLES, DEVOTIONALS) are views over it and keep their shapes. docs/resources.md has the section.
import commentary from './catalogue/commentary.json';
import bible from './catalogue/bible.json';
import devotional from './catalogue/devotional.json';
import grammar from './catalogue/grammar.json';
import greekText from './catalogue/greek-text.json';
import interlinear from './catalogue/interlinear.json';
import lexicon from './catalogue/lexicon.json';
import type { BookSection, ResourceLang } from './types';

export const KINDS = ['lexicon', 'grammar', 'greek-text', 'interlinear', 'commentary', 'bible', 'devotional'] as const;
export type Kind = (typeof KINDS)[number];

/** Where Lampas opens an entry: a word (the lexicon's headword), a parsing (a grammar's section for a ladder idea), a verse, a chapter (a Bible's Old Testament chapter), a day (a devotional), the
 *  start of the book, or a place in the book's own index (the Institutes: book.chapter.section). */
export type Opens = 'word' | 'parsing' | 'verse' | 'chapter' | 'day' | 'start' | 'place';

/** The key a lexicon is filed under: the Greek lemma (`hw=<lemma>`; `commonLemma` is the same for a book with no proper names), a Strong's number (`ref=GreekStrongs.<n>` or `HebrewStrongs.<n>`, as Greek and Hebrew share numbers),
 *  or an English topic (`hw=<Topic>`). docs/resources.md says where each lexicon's key comes from and what is UNVERIFIED. */
export type LexiconKey = 'lemma' | 'commonLemma' | 'strongs' | 'topic';

/** How an entry joined the catalogue: its Resource ID is named in the rules, or a type rule or a series rule took it from an export. Only what is named by id is in the old lists (LEXICONS ... DEVOTIONALS). */
export type Via = 'id' | 'type' | 'series';

export interface CatalogueEntry {
  /** the Logos Resource ID, the natural key: 'LLS:46.30.18'. Never guessed (mw-5r3p30.64). */
  resource: string;
  kind: Kind;
  title: string;
  short: string;
  author?: string;
  series?: string;
  lang: ResourceLang;
  opens: Opens;
  /** one line: what it adds beyond Logos alone. An entry with none is not in the catalogue. */
  value: string;
  /** a commentary volume or an interlinear: our book codes (src/data/books.ts), read from the export's ReferenceSupersets; absent means the whole New Testament */
  covers?: string[];
  /** a grammar only: its parts and the ladder ideas each teaches (today's GrammarBook.sections) */
  sections?: BookSection[];
  /** the state an import gives it; Off is never a default */
  starts?: 'on' | 'pinned';
  /** the date the Governor tapped it on his phone; absent means UNVERIFIED on a device */
  verified?: string;
  via: Via;
  /** the id the settings store keeps (a lexicon, a grammar book); never changes */
  id?: string;
  /** a lexicon's key form */
  key?: LexiconKey;
  /** a volume of a work (WORK_GROUPS): the id of the work */
  work?: string;
  /** a grammar: where its section titles and references were read (one line, also in docs/resources.md) */
  source?: string;
  /** a devotional: Logos flags it as opening by day of the year ('no' may only mean unflagged) */
  dayOfYear?: boolean;
}

/** A book's own reference type, which Logos opens a book at (`ref=CICR.3.24`): its library listing's ReferenceSupersets column names it ('cicr.1-4.20.32'). The Bible's own
 *  references do not reach into a book that is not versified, so the place is this type's, from the shape below. */
export interface WorkIndex {
  /** the data type in the link: 'CICR' */
  type: string;
  /** how many chapters each book of the work has, in order: the Institutes' four books have 18, 17, 25 and 20 */
  chapters: readonly number[];
  /** what the tutor is told of how a place is written (the request's `places`) */
  hint: string;
}

/** What the tutor may link to as one work (works.ts): a commentary of several volumes, or a book. Its volumes are the entries of the commentary kind that name it in `work`. */
export interface WorkGroup {
  /** kept in the settings store, so it never changes: 'calvin-commentaries' */
  id: string;
  lang: ResourceLang;
  title: string;
  author: string;
  /** a commentary opens at a passage of the Bible; a book opens at its start */
  kind: 'commentary' | 'book';
  /** where the Resource IDs (and the books each volume covers) were read: one line, also in docs/resources.md */
  source: string;
  /** a book only: the reference type that lets a link open inside it */
  index?: WorkIndex;
}

/** One generated file: `version` is the same in all seven (a hash of every entry), `works` is only in the commentary file. */
export interface KindFile {
  kind: Kind;
  version: string;
  works?: WorkGroup[];
  entries: CatalogueEntry[];
}

const FILES: Record<Kind, KindFile> = {
  lexicon: lexicon as unknown as KindFile,
  grammar: grammar as unknown as KindFile,
  'greek-text': greekText as unknown as KindFile,
  interlinear: interlinear as unknown as KindFile,
  commentary: commentary as unknown as KindFile,
  bible: bible as unknown as KindFile,
  devotional: devotional as unknown as KindFile,
};

/** The catalogue's version stamp: the same in every kind file, and a new one whenever any entry changes. A library kept on the phone is re-matched when it differs. */
export const CATALOGUE_VERSION: string = FILES.lexicon.version;

/** Every entry, kind by kind in KINDS' order. */
export const CATALOGUE: readonly CatalogueEntry[] = KINDS.flatMap((k) => FILES[k].entries);

/** The entries of one kind, in the order the rules name them and then the rows the export added. */
export const entriesOf = (kind: Kind): readonly CatalogueEntry[] => FILES[kind].entries;

/** The works of the tutor's list, in the order Settings lists them. */
export const WORK_GROUPS: readonly WorkGroup[] = FILES.commentary.works ?? [];

/** The entry with this Resource ID, if the catalogue has it. */
export const entryOf = (resource: string): CatalogueEntry | undefined => CATALOGUE.find((e) => e.resource === resource);
