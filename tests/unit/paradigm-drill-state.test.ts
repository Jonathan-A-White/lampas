// The Drill's state (mw-irpgqi.2, src/data/paradigms/drill.ts): per table while the page lives, so coming Back from the Reader finds the drill as
// he left it. A run asks the blank cells; a tap opens one; Had it or Missed grades it; the score is had of asked; Drill the missed again asks the
// missed ones and keeps the rest shown; Start again asks every cell afresh.
import { beforeEach, describe, expect, it } from 'vitest';
import { drillMissed, drillOf, forgetDrill, forgetDrills, gradeCell, markMissWritten, revealCell, scoreOf, startRun } from '../../src/data/paradigms/drill';

const FOUR = ['Nominative Singular Masculine', 'Nominative Singular Feminine', 'Genitive Singular Masculine', 'Genitive Singular Feminine'];

describe('a drill run', () => {
  beforeEach(forgetDrills);

  it('is nothing until it starts, and a start asks the cells given, none graded, none open, no miss written', () => {
    expect(drillOf('article')).toBeUndefined();
    const run = startRun('article', FOUR);
    expect(run).toEqual({ asking: FOUR, graded: new Map(), open: null, kept: new Set(), missWritten: false });
    expect(drillOf('article')).toBe(run);
    expect(scoreOf(run)).toEqual({ had: 0, of: 4, missed: [], done: false });
  });

  it('opens one cell at a time: a tap on a second blank closes the first, ungraded', () => {
    startRun('article', FOUR);
    expect(revealCell('article', FOUR[0]).open).toBe(FOUR[0]);
    expect(revealCell('article', FOUR[1]).open).toBe(FOUR[1]);
    expect(drillOf('article')?.graded.size).toBe(0);
  });

  it('ignores a reveal of a cell the run does not ask, or one graded already', () => {
    startRun('article', FOUR.slice(0, 2));
    expect(revealCell('article', FOUR[3]).open).toBeNull();
    revealCell('article', FOUR[0]);
    gradeCell('article', FOUR[0], true);
    expect(revealCell('article', FOUR[0]).open).toBeNull();
  });

  it('grades the open cell and closes it; the score is the had of the asked, done after the last', () => {
    startRun('article', FOUR);
    revealCell('article', FOUR[0]);
    let run = gradeCell('article', FOUR[0], true);
    expect(run.open).toBeNull();
    expect(scoreOf(run)).toEqual({ had: 1, of: 4, missed: [], done: false });
    for (const [i, place] of FOUR.slice(1).entries()) {
      revealCell('article', place);
      run = gradeCell('article', place, i !== 1);
    }
    expect(scoreOf(run)).toEqual({ had: 3, of: 4, missed: [FOUR[2]], done: true });
  });

  it('Drill the missed again asks the missed cells only and keeps the had ones shown; its score is of the missed', () => {
    startRun('article', FOUR);
    for (const [i, place] of FOUR.entries()) {
      revealCell('article', place);
      gradeCell('article', place, i % 2 === 0);
    }
    const again = drillMissed('article');
    expect(again.asking).toEqual([FOUR[1], FOUR[3]]);
    expect([...again.kept]).toEqual([FOUR[0], FOUR[2]]);
    expect(again.graded.size).toBe(0);
    expect(again.missWritten).toBe(false);
    revealCell('article', FOUR[1]);
    gradeCell('article', FOUR[1], true);
    revealCell('article', FOUR[3]);
    expect(scoreOf(gradeCell('article', FOUR[3], true))).toEqual({ had: 2, of: 2, missed: [], done: true });
    // a third run keeps what the first two had
    const third = drillMissed('article');
    expect(third.asking).toEqual([]);
    expect([...third.kept]).toEqual(FOUR);
  });

  it('remembers that the run\'s first miss was written, and a new run starts over', () => {
    startRun('article', FOUR);
    expect(markMissWritten('article').missWritten).toBe(true);
    expect(startRun('article', FOUR).missWritten).toBe(false);
  });

  it('is kept per table, and forgotten per table or all at once', () => {
    startRun('article', FOUR);
    startRun('eimi', ['Present 1st person singular Greek']);
    forgetDrill('article');
    expect(drillOf('article')).toBeUndefined();
    expect(drillOf('eimi')?.asking).toEqual(['Present 1st person singular Greek']);
    forgetDrills();
    expect(drillOf('eimi')).toBeUndefined();
  });
});
