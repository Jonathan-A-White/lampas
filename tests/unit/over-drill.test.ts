// tests/unit/over-drill.test.ts — the guard of mw-indx1x6.29: the lesson opened from a drill's 'Study this' row had the idea sheet's own Drill it button, which started a second drill over
// the first. A screen that runs a drill draws itself inside `OverDrill` (src/overDrill.ts), and the idea sheet over it draws no Drill it and no Try it on a verse. Every file of src/ that
// draws the 'Study this' row or the Study list as a drill (screen={DRILL_SCREEN}) must therefore provide it, or a lesson opened from its row starts a drill over the drill.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', '..', 'src');

const filesIn = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesIn(path) : path.endsWith('.tsx') ? [path] : [];
  });

/** A 'Study this' row or a Study list drawn as a drill's. */
const DRILL_ROW = /<Study(This|List)\b[^>]*\bscreen=\{DRILL_SCREEN\}/;

describe("a screen that runs a drill tells what opens over it (src/overDrill.ts, mw-indx1x6.29)", () => {
  const drills = filesIn(SRC).filter((path) => DRILL_ROW.test(readFileSync(path, 'utf8')));

  it('finds the drills: the search is not empty', () => {
    expect(drills.map((path) => relative(SRC, path)).sort()).toEqual(expect.arrayContaining(['DrillItScreen.tsx', 'DrillScreen.tsx', 'PlanDrillScreen.tsx']));
  });

  it.each(drills.map((path) => [relative(SRC, path), path]))('%s draws itself inside OverDrill', (_, path) => {
    expect(readFileSync(path, 'utf8')).toContain('<OverDrill.Provider value={true}>');
  });

  it('the idea sheet reads it for its Drill it and Try it on a verse buttons', () => {
    const sheet = readFileSync(join(SRC, 'IdeaSheet.tsx'), 'utf8');
    expect(sheet).toContain('const overDrill = useOverDrill();');
    expect(sheet).toContain('{!drillable || overDrill ? null : (');
    expect(sheet).toContain('{passage && !overDrill && hasFormOf(');
  });
});
