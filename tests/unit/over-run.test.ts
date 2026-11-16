// tests/unit/over-run.test.ts — the guard of mw-indx1x6.29 and mw-indx1x6.57: the lesson opened from a drill's 'Study this' row had the idea sheet's own Drill it button, which started a
// second drill over the first, and the sheets over a drill kept links to pages of their own, which lost the run. A screen that runs a drill draws itself inside `OverRun`
// (src/overRun.ts), and whatever is drawn over it offers a control that leaves or starts a run only through the one guard, `useOffRun`. Every file of src/ that draws the 'Study this'
// row or the Study list as a drill (screen={DRILL_SCREEN}) must therefore provide it, or a lesson opened from its row starts a drill over the drill. The guard has one definition, and
// the flag is read nowhere else: a sheet that read the context for itself would be a second guard.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', '..', 'src');

const filesIn = (dir: string, ext = /\.tsx$/): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesIn(path, ext) : ext.test(path) ? [path] : [];
  });

/** A 'Study this' row or a Study list drawn as a drill's. */
const DRILL_ROW = /<Study(This|List)\b[^>]*\bscreen=\{DRILL_SCREEN\}/;

const read = (name: string): string => readFileSync(join(SRC, name), 'utf8');

describe('a screen that runs a drill tells what opens over it (src/overRun.ts, mw-indx1x6.29, mw-indx1x6.57)', () => {
  const drills = filesIn(SRC).filter((path) => DRILL_ROW.test(readFileSync(path, 'utf8')));

  it('finds the drills: the search is not empty', () => {
    expect(drills.map((path) => relative(SRC, path)).sort()).toEqual(expect.arrayContaining(['DrillItScreen.tsx', 'DrillScreen.tsx', 'PlanDrillScreen.tsx']));
  });

  it.each(drills.map((path) => [relative(SRC, path), path]))('%s draws itself inside OverRun', (_, path) => {
    expect(readFileSync(path, 'utf8')).toContain('<OverRun.Provider value={true}>');
  });

  it('what a Study row opens where a table opens as a layer is drawn inside OverRun too (an end card)', () => {
    const places = read('review/useStudyPlaces.tsx');
    expect(places).toContain('const overRun = useContext(OverRun) || !onParadigm;');
    expect(places).toContain('<OverRun.Provider value={overRun}>');
  });
});

describe('one guard for what is drawn over a run (mw-indx1x6.57)', () => {
  const sources = filesIn(SRC, /\.tsx?$/).map((path) => ({ name: relative(SRC, path), text: readFileSync(path, 'utf8') }));

  it('useOffRun is defined once, in src/overRun.ts', () => {
    expect(sources.filter((file) => /\bfunction useOffRun\b|\buseOffRun\s*=/.test(file.text)).map((file) => file.name)).toEqual(['overRun.ts']);
  });

  it('the context is read only by the guard and by the one place that passes it on', () => {
    expect(sources.filter((file) => /useContext\(OverRun\)/.test(file.text)).map((file) => file.name).sort()).toEqual(['overRun.ts', 'review/useStudyPlaces.tsx']);
  });

  it('the old flags are gone: no overRun prop on a sheet and no src/overDrill.ts', () => {
    expect(sources.filter((file) => /\boverRun=\{|\buseOverDrill\b|\bOverDrill\b/.test(file.text)).map((file) => file.name)).toEqual([]);
  });

  it.each([
    ['IdeaSheet.tsx', "the lesson's links to a table and a Hard sounds lesson, and its level slider, Mark known, Drill it and Try it on a verse"],
    ['WordSheet.tsx', "the word sheet's table, About this reading and the Library's Lexicons page"],
    ['Definition.tsx', 'a reference of a definition, which opens the reader'],
    ['TutorLinks.tsx', "the tutor's chips to the Reader, Settings, a table and the Maps screen"],
    ['library/InLogosChooser.tsx', "In another book's row to the Library"],
  ])('%s reads it for %s', (name) => {
    expect(read(name)).toContain('const offRun = useOffRun();');
  });
});
