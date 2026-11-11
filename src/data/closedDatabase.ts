// src/data/closedDatabase.ts — a background write the app starts on its own (a count, a seeding, a kept drill) can meet a closed database: a test's
// teardown closes it, or the browser closes it for a newer version. The write then has nowhere to go and is dropped quietly; any other failure is
// logged (mw-lcv9z3g.15, .19).

/** Whether the failure is Dexie's DatabaseClosedError. */
export const isClosedDatabase = (error: unknown): boolean => error instanceof Error && error.name === 'DatabaseClosedError';

/** A catch handler for a background write: a closed database is dropped quietly, any other failure is logged under `message`. */
export const logUnlessClosed =
  (message: string) =>
  (error: unknown): void => {
    if (isClosedDatabase(error)) return;
    console.error(message, error);
  };
