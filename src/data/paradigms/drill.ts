// src/data/paradigms/drill.ts — the Drill's state, per table, kept while the page lives (mw-irpgqi.2; it was revealed.ts, the Study mode's revealed cells):
// going to the Reader with Ask the tutor and coming Back finds the table as he left it. Not kept across a close: a drill starts over. A run asks the
// blank cells of the table (the screen says which, from his levels and How much of a table); a tap opens one cell at a time; Had it or Missed grades it;
// after the last, the score is the had of the asked; Drill the missed again asks the missed ones and keeps the rest shown. Pure: nothing here reads the
// store or the screen.

export interface Drill {
  /** the cells this run asks (their names, data/paradigms cellName), in the table's order */
  asking: readonly string[];
  /** what he said of each cell asked so far: true for Had it, false for Missed */
  graded: ReadonlyMap<string, boolean>;
  /** the cell he has tapped and not yet graded */
  open: string | null;
  /** cells shown and not asked: the ones he had in an earlier run of this drill */
  kept: ReadonlySet<string>;
  /** whether this run's first miss has been written to the schedule (one write a run, as a Review round's row takes one outcome) */
  missWritten: boolean;
}

export interface Score {
  had: number;
  /** how many the run asks */
  of: number;
  /** the cells he missed, in the table's order */
  missed: string[];
  /** every cell asked has been graded (and there was one to ask) */
  done: boolean;
}

const drills = new Map<string, Drill>();

/** The drill of a table, or undefined while none has started (every cell blank, nothing graded). */
export const drillOf = (table: string): Drill | undefined => drills.get(table);

const put = (table: string, drill: Drill): Drill => {
  drills.set(table, drill);
  return drill;
};

/** Starts a run that asks `asking`, nothing graded; `kept` are the cells shown but not asked. */
export function startRun(table: string, asking: readonly string[], kept: ReadonlySet<string> = new Set()): Drill {
  return put(table, { asking: [...asking], graded: new Map(), open: null, kept: new Set(kept), missWritten: false });
}

/** A tap on a blank cell of the run: it is the open one (a cell open before goes back to blank, ungraded). A cell not asked, or graded already, changes nothing. */
export function revealCell(table: string, place: string): Drill {
  const drill = drillOf(table);
  if (!drill) throw new Error(`no drill of ${table} has started`);
  if (!drill.asking.includes(place) || drill.graded.has(place)) return drill;
  return put(table, { ...drill, open: place });
}

/** Had it (`right`) or Missed on the open cell: graded, and no cell is open. */
export function gradeCell(table: string, place: string, right: boolean): Drill {
  const drill = drillOf(table);
  if (!drill) throw new Error(`no drill of ${table} has started`);
  const graded = new Map(drill.graded);
  graded.set(place, right);
  return put(table, { ...drill, graded, open: drill.open === place ? null : drill.open });
}

/** The run's first miss has been written. */
export function markMissWritten(table: string): Drill {
  const drill = drillOf(table);
  if (!drill) throw new Error(`no drill of ${table} has started`);
  return put(table, { ...drill, missWritten: true });
}

export function scoreOf(drill: Drill): Score {
  const missed = drill.asking.filter((place) => drill.graded.get(place) === false);
  const had = drill.asking.filter((place) => drill.graded.get(place) === true).length;
  return { had, of: drill.asking.length, missed, done: drill.asking.length > 0 && drill.graded.size >= drill.asking.length };
}

/** Drill the missed again: a run of the missed cells; the had ones (this run's and earlier runs') stay shown. */
export function drillMissed(table: string): Drill {
  const drill = drillOf(table);
  if (!drill) throw new Error(`no drill of ${table} has started`);
  const { missed } = scoreOf(drill);
  const kept = new Set([...drill.kept, ...drill.asking.filter((place) => !missed.includes(place))]);
  return startRun(table, missed, kept);
}

export function forgetDrill(table: string): void {
  drills.delete(table);
}

/** For tests: the page starts over. */
export function forgetDrills(): void {
  drills.clear();
}
