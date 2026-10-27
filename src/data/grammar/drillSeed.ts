// src/data/grammar/drillSeed.ts — where a walk of Drill it gets its seed (src/DrillItScreen.tsx): a new one each time it opens. A seam: a feature step fixes it, so it knows the questions.
// It takes the language of the idea walked (mw-gdcyf98.11), 'grc' when left out, so a step can fix the Hebrew walk's seed apart from the Greek one's; the default draws one at random for either.
import type { LadderLang } from './ladders';

export const drillSeed = {
  next: (lang: LadderLang = 'grc'): number => {
    void lang;
    return (Math.random() * 0x100000000) >>> 0;
  },
};
