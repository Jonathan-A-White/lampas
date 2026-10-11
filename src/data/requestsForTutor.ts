// src/data/requestsForTutor.ts — what the tutor is told of the requests he sent to the factory (mw-vy3ghg.6, docs/ask-tutor.md 'Your requests'):
// up to 10 lines, the newest first, each {summary, status, version?, setting?, reason?} with only the field its status carries. Both the
// verse-ask and the bible-talk request carry them as `requests` (their input schemas), so the tutor can say what became of his idea and, for
// one that became a setting, offer to switch it on. Names the tutor needs and nothing else: no txid, no bead, no link.
import type { RequestRow } from './db';
import { listRequests } from './repositories/requests';

/** How many lines the tutor is told of, newest first. */
export const MAX_TUTOR_REQUESTS = 10;

/** The limits of a line (the input schemas' `requests` items): a request's grist record is capped at 10 KiB, so each text is cut short. */
export const REQUEST_SUMMARY_MAX = 120;
export const REQUEST_VERSION_MAX = 40;
export const REQUEST_SETTING_MAX = 80;
export const REQUEST_REASON_MAX = 120;

/** Where a request stands, as the tutor is told: the same words the mill's request-status records use, and 'sent' before any record came. */
export const TUTOR_REQUEST_STATUSES = ['sent', 'filed', 'building', 'landed', 'declined', 'adopted-as-setting'] as const;
export type TutorRequestStatus = (typeof TUTOR_REQUEST_STATUSES)[number];

export interface TutorRequest {
  summary: string;
  status: TutorRequestStatus;
  /** landed: the app version it shipped in */
  version?: string;
  /** adopted-as-setting: the setting's name, where Settings has it */
  setting?: string;
  /** declined: the reason, one plain sentence */
  reason?: string;
}

const clip = (text: string, max: number): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + '…';
};

const isStatus = (status: string): status is TutorRequestStatus => (TUTOR_REQUEST_STATUSES as readonly string[]).includes(status);

function lineOf(row: RequestRow): TutorRequest | undefined {
  // a tutor-ask is named by the tutor's summary, a grammar approach by the words he sent
  const summary = clip(row.summary ?? row.text ?? '', REQUEST_SUMMARY_MAX);
  if (!summary || !isStatus(row.status)) return undefined;
  const line: TutorRequest = { summary, status: row.status };
  if (row.status === 'landed' && row.version) line.version = clip(row.version, REQUEST_VERSION_MAX);
  if (row.status === 'adopted-as-setting' && row.setting) line.setting = clip(row.setting, REQUEST_SETTING_MAX);
  if (row.status === 'declined' && row.reason) line.reason = clip(row.reason, REQUEST_REASON_MAX);
  return line;
}

/** The lines for `rows`, which are the requests newest first (listRequests): at most the first MAX_TUTOR_REQUESTS that make a line. */
export function requestsOf(rows: readonly RequestRow[]): TutorRequest[] {
  const lines: TutorRequest[] = [];
  for (const row of rows) {
    const line = lineOf(row);
    if (line) lines.push(line);
    if (lines.length === MAX_TUTOR_REQUESTS) break;
  }
  return lines;
}

/** What the tutor is told of his requests now; an empty list when he has sent none. */
export async function requestsForTutor(): Promise<TutorRequest[]> {
  return requestsOf(await listRequests());
}
