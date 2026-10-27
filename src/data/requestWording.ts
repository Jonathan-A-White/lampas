// src/data/requestWording.ts — the status line of a request on Your requests (mw-5r3p30.796, docs/ask-tutor.md 'Your requests'): what became of the ask and when,
// in Lampas's own words. The kit's statusLine is the bare word and stays the tutor's (requestsForTutor.ts); this is the phone's. The date is the day the status was
// set (the sent day for Sent), formatted as the sent date is; a record with no date reads without one.
import { type RequestRecord } from 'pwa-kit/requests';

/** A filed request that has waited longer than this many days reads 'Still in the queue' under its status. */
export const QUEUE_DAYS = 7;

/** A day as the screen writes it: 26 Oct 2026. */
export const sentOn = (ms: number): string => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** The line that says where `record` stands and since when; throws on a status nobody worded, so a status added to the kit cannot reach the screen unworded. */
export function statusWording(record: RequestRecord, formatDate: (ms: number) => string = sentOn): string {
  const on = record.statusAt === undefined ? undefined : formatDate(record.statusAt);
  switch (record.status) {
    case 'sent':
      return `Sent to the factory · ${formatDate(record.sentAt)}`;
    case 'filed':
      return on ? `Filed as a story · ${on}, waiting its turn` : 'Filed as a story, waiting its turn';
    case 'building':
      return on ? `Being built · since ${on}` : 'Being built';
    case 'landed':
      return [record.version ? `Adopted in ${record.version}` : 'Adopted', on].filter(Boolean).join(' · ');
    case 'declined':
      return `Declined${on ? ` · ${on}` : ''}${record.reason ? `: ${record.reason}` : ''}`;
    case 'adopted-as-setting':
      return `${record.setting ? `Now a setting: ${record.setting}` : 'Now a setting'}${on ? ` · ${on}` : ''}`;
    default:
      throw new Error(`No wording for the request status ${String(record.status)}`);
  }
}

/** True for a filed request that has waited more than QUEUE_DAYS since it was filed (since it was sent when no filing date came). */
export function stillInQueue(record: RequestRecord, now: number): boolean {
  return record.status === 'filed' && now - (record.statusAt ?? record.sentAt) > QUEUE_DAYS * 86_400_000;
}
