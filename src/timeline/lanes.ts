// src/timeline/lanes.ts — the timeline strip's lanes, as pure maths (mw-fnvjof.17.317.2, docs/timeline-design.md 'Layout' and 'Crowding'; ported from prototypes/timeline/timeline.js):
// how many lanes of events and of lives a strip has, and which mark stands in which. A mark has a lane only where it and its name touch nothing; what finds none goes to the ruler's
// ribbon, so nothing is ever stacked and nothing is ever lost.
import { LAYOUT } from './design';

export interface Deal {
  events: number;
  people: number;
}

/** How many lanes of events and of people a strip `height` px tall has, from how many each needs in view: people take what they need, never over PEOPLE_SHARE of the lanes, and events keep one. */
export function dealLanes(height: number, need: Deal): Deal {
  const lanes = Math.max(1, Math.floor((height - LAYOUT.FLAG - LAYOUT.SPINE) / LAYOUT.LANE));
  const people = Math.max(0, Math.min(need.people, Math.floor(lanes * LAYOUT.PEOPLE_SHARE + 1e-9), lanes - 1));
  return { events: lanes - people, people };
}

/** A mark to be packed: its reach with its name (`x0` to `x1`, px), and who chooses first (the lowest `rank`, then the leftmost). */
export interface LaneMark {
  id: string;
  x0: number;
  x1: number;
  rank: number;
}

/**
 * Marks into lanes. A mark takes the first lane where it and its name touch nothing; failing that it goes to the ribbon. Nothing stands in a lane unnamed, and none is lost.
 */
export function packLanes(marks: readonly LaneMark[], lanes: number): { placed: { id: string; lane: number }[]; ribbon: string[] } {
  const rows: [number, number][][] = Array.from({ length: lanes }, () => []);
  const placed: { id: string; lane: number }[] = [];
  const ribbon: string[] = [];
  // where in a lane (kept in order of x0) a reach would go, or -1 where it touches a neighbour
  const free = (row: [number, number][], x0: number, x1: number): number => {
    let low = 0;
    let high = row.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (row[mid][0] <= x0) low = mid + 1;
      else high = mid;
    }
    return (low === row.length || row[low][0] >= x1) && (low === 0 || row[low - 1][1] <= x0) ? low : -1;
  };
  const order = [...marks].sort((a, b) => a.rank - b.rank || a.x0 - b.x0 || (a.id < b.id ? -1 : 1));
  for (const mark of order) {
    let lane = 0;
    let at = -1;
    while (lane < lanes && (at = free(rows[lane], mark.x0, mark.x1)) === -1) lane++;
    if (at === -1) {
      ribbon.push(mark.id);
      continue;
    }
    rows[lane].splice(at, 0, [mark.x0, mark.x1]);
    placed.push({ id: mark.id, lane });
  }
  return { placed, ribbon };
}
