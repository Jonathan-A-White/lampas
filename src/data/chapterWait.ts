// src/data/chapterWait.ts — how long the Reader waits on a chapter (mw-5r3p30.846). A test shortens them, as settle.ms is (src/ui/settle.ts).
export const chapterWait = {
  /** after this long on 'Loading …' the Reader says it is still loading and offers Try again */
  stillMs: 8000,
  /** a chapter fetch that has not answered by now is given up on, and the Reader shows that it could not load */
  giveUpMs: 30000,
};
