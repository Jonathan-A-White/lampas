// src/data/grammar/drillSeed.ts — where a walk of Drill it gets its seed (src/DrillItScreen.tsx): a new one each time it opens. A seam: a feature step fixes it, so it knows the questions.
export const drillSeed = { next: (): number => (Math.random() * 0x100000000) >>> 0 };
