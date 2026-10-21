// src/data/grammar/extent.ts — how much of the grammar a screen takes in, by the level of each idea (mw-irpgqi.2, docs/paradigm-components.md): Any (every
// idea, whatever its level), Solid and frontier (the ideas he has or is learning: today's rule for a paradigm's cells and the picker's Frontier grammar) or
// Solid only. The ONE rule 'is this idea's level within the extent' lives here: the Weave's grammar dial (formLevel.ts formPasses), the frontier picker
// (pickerDial) and the paradigm tables (src/data/paradigms/index.ts isAvailable, standingOf) all read it. Pure.
import type { Level } from './needs';

export type GrammarExtent = 'any' | 'solid+frontier' | 'solid';

/** The three extents, the most to the least. */
export const EXTENTS: readonly GrammarExtent[] = ['any', 'solid+frontier', 'solid'];

/** Today's rule for a table: a form is his once every idea it needs is solid or at the frontier. */
export const DEFAULT_EXTENT: GrammarExtent = 'solid+frontier';

/** What each extent is called wherever it is drawn (the Governor's words, 2026-10-21: 'solid, frontier and any'). */
export const EXTENT_LABELS: Readonly<Record<GrammarExtent, string>> = { any: 'Any', 'solid+frontier': 'Solid and frontier', solid: 'Solid only' };

export const isExtent = (value: unknown): value is GrammarExtent => EXTENTS.includes(value as GrammarExtent);

/** Whether an idea at `level` (undefined: it has no level row, so it is not yet) is within `extent`. */
export function withinExtent(level: Level | undefined, extent: GrammarExtent): boolean {
  if (extent === 'any') return true;
  return level === 'solid' || (extent === 'solid+frontier' && level === 'frontier');
}
