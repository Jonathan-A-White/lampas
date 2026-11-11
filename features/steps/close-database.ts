// features/steps/close-database.ts — a step file's teardown closes the database through this, not db.close(): the App writes on its own after a tap (the usage
// count) and at its first open (the schedule and levels seeding, the stale Bible marks, a drill kept, the reviews-due count), and db.close() with one of those in
// flight is a DatabaseClosedError. It waits for the usage log's queue first; the writes src/ starts without a queue meet the closed database and drop quietly
// (src/data/closedDatabase.ts). tests/unit/step-close-database.test.ts fails on an afterAll that calls db.close() itself (mw-lcv9z3g.19).
import { db } from '../../src/data/db';
import { usageWritesSettled } from '../../src/tips/usageLog';

export async function closeDatabase(): Promise<void> {
  await usageWritesSettled();
  db.close();
}
