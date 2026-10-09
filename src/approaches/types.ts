// src/approaches/types.ts — what a grammar approach is. One approach is one file in this folder exporting a GrammarApproach, and one
// line in index.ts (docs/grammar.md, 'Approaches'). An approach is a METHOD: the order the ideas of the grammar ladder are taught in,
// grouped into lessons, and a few lines on how it teaches. It holds no course text, picture or exercise of anyone else's.

/** Where an approach comes from, when it follows someone else's sequence. */
export interface ApproachCredit {
  /** 'Biblical Mastery Academy' */
  name: string;
  /** the source's home page; the credit line links the name to it */
  url: string;
  /** the one line Settings and About show; it contains `name` */
  line: string;
}

export interface ApproachLesson {
  /** in our own words */
  title: string;
  /** ids of the ladder's ideas (src/data/grammar/ladder.ts) this lesson teaches; an idea named again is a revisit and is taught where it is first named */
  ideas: string[];
}

export interface ApproachLevel {
  title: string;
  lessons: ApproachLesson[];
}

export interface ApproachStage {
  title: string;
  levels: ApproachLevel[];
}

export interface GrammarApproach {
  /** kept in the settings store, so it never changes: 'bma-tutor' */
  id: string;
  /** the choice's name in Settings: 'BMA Tutor' */
  name: string;
  credit: ApproachCredit | null;
  /** our own words, under 120: what comes first, why, how a lesson teaches and drills */
  method: string;
  stages: ApproachStage[];
}
