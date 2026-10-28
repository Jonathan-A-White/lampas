// src/data/requestFilter.ts — the status filter of Your requests (mw-5r3p30.795, src/RequestsScreen.tsx, docs/ask-tutor.md): the chips and the chip each status of
// pwa-kit/requests sits under.
import type { RequestStatus } from 'pwa-kit/requests';

export type StatusFilter = 'all' | 'waiting' | 'adopted' | 'declined';

/** The chips, in order: the value and what it reads. */
export const FILTERS: readonly (readonly [StatusFilter, string])[] = [
  ['all', 'All'],
  ['waiting', 'Waiting'],
  ['adopted', 'Adopted'],
  ['declined', 'Declined'],
];

/** The chip each status of the kit sits under; a Record over the kit's own type, so a status added to the kit is a type error here until it has a chip. */
export const STATUS_FILTER: Record<RequestStatus, Exclude<StatusFilter, 'all'>> = {
  sent: 'waiting',
  filed: 'waiting',
  building: 'waiting',
  landed: 'adopted',
  'adopted-as-setting': 'adopted',
  declined: 'declined',
  'built-differently': 'adopted', // answered, though not as asked
  moved: 'waiting', // folded into another story, still to be built (PROVISIONAL, mw-5r3p30.798)
};

/** The chip a status sits under; none for a status nobody mapped (it shows under All only). */
export const filterOf = (status: string): Exclude<StatusFilter, 'all'> | undefined => (STATUS_FILTER as Record<string, Exclude<StatusFilter, 'all'>>)[status];
