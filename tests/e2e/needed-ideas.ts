// The grammar ideas a goal needs, worked out by the app's own code (src/data/grammar/needs.ts passageNeeds over the committed chapter files, and
// placement.ts startPlacement for the walk), never copied by hand: the ladder grows (4adec7e added 13 pattern ideas, 37 became 46) and a written
// list or count in a spec then goes red only in the nightly Playwright run, which the gate skips (mw-5r3p30.392, mw-5r3p30.403).
// tests/unit/e2e-needed-ideas.test.ts fails on a spec that writes an idea count or list by hand.
import { readFileSync } from 'node:fs';
import { approachOf, orderOf } from '../../src/approaches';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import type { Chapter } from '../../src/data/chapter';
import { parseGoal } from '../../src/data/goal';
import { passageNeeds, progressToward, type Counts, type Level, type PassageNeeds } from '../../src/data/grammar/needs';
import { startPlacement, summarize, type PlacementSummary } from '../../src/data/grammar/placement';

const loadChapter = async (book: string, n: number): Promise<Chapter> => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;

const needsByGoal = new Map<string, Promise<PassageNeeds>>();

function needsOf(goalText: string): Promise<PassageNeeds> {
  let needs = needsByGoal.get(goalText);
  if (!needs) {
    const goal = parseGoal(goalText, BOOK_INDEX);
    if (!goal) throw new Error(`not a goal: ${goalText}`);
    needs = passageNeeds(goal, loadChapter, BOOK_INDEX);
    needsByGoal.set(goalText, needs);
  }
  return needs;
}

/** The ids of the grammar ideas the goal needs ('1 John 1:1'), as the Goal screen and the placement count them. */
export const neededIdeas = async (goalText: string): Promise<string[]> => (await needsOf(goalText)).ideas.map((i) => i.id);

/** The ideas the placement walks for the goal (BMA Tutor's order): the needed ideas plus the letters, sounds and marks. */
export const placementIdeas = async (goalText: string): Promise<string[]> =>
  startPlacement(await needsOf(goalText), new Map(), orderOf(approachOf('bma-tutor')!), 0).ideas;

/** The placement's end card for the goal when he starts with these levels: it counts the needed ideas and the walk's others he has a level for. */
export const placementSummary = async (goalText: string, levels: Record<string, Level>): Promise<PlacementSummary> =>
  summarize(startPlacement(await needsOf(goalText), new Map(Object.entries(levels)), orderOf(approachOf('bma-tutor')!), 0));

/** The Goal screen's ideas bar for the goal with these levels (an idea not named is not yet): solid, frontier, not yet and the total. */
export const goalIdeaCounts = async (goalText: string, levels: Record<string, Level>): Promise<Counts> =>
  progressToward(await needsOf(goalText), new Map(), new Map(Object.entries(levels))).grammar;
