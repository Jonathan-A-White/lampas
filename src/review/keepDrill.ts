// src/review/keepDrill.ts — keeps a finished Drill it run for the idea sheet and the drill plan card (recordDrill), in the background: a failure is logged, never thrown,
// and a closed database drops it quietly (src/data/closedDatabase.ts).
import type { DrillResult } from '../data/grammar/drillIt';
import { logUnlessClosed } from '../data/closedDatabase';
import { recordDrill, type DrillMode } from '../data/repositories';

export async function keepDrill(result: DrillResult, mode: DrillMode): Promise<void> {
  await recordDrill(result, mode).then(() => undefined, logUnlessClosed('could not keep the drill'));
}
