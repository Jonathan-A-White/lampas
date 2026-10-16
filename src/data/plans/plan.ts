// src/data/plans/plan.ts — what a reading plan is: an id, a name and the chapters to read, in order. A plan is one file in this folder plus a line in
// index.ts PLANS.

/** A chapter of the Bible: the book's code (data/books.ts or data/otBooks.ts) and the chapter's number from 1. */
export interface PlanChapter {
  code: string;
  chapter: number;
}

export interface Plan {
  id: string;
  name: string;
  /** every chapter of the plan, in reading order; a fresh list each call */
  chapters(): PlanChapter[];
}
