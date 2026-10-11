// src/data/repositories/requests.ts — the requests Lampas sent to the factory (src/services/feedback.ts), each kept with its grist id (txid)
// so a status that comes back can be matched to it. A row is written when the mill has the grist, with status 'sent'.
import { db, type RequestRow } from '../db';

export type { RequestRow };

/** What a sender knows of a request when it goes out; the row adds status 'sent'. */
export type SentRequest = Omit<RequestRow, 'status'>;

/** Keeps `request` as sent. The same txid is one row. */
export async function keepRequest(request: SentRequest): Promise<void> {
  await db.requests.put({ ...request, status: 'sent' });
}

/** Every request kept, the newest first. */
export async function listRequests(): Promise<RequestRow[]> {
  return db.requests.orderBy('sentAt').reverse().toArray();
}
