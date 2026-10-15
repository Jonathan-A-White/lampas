// tests/support/published.ts — a step that checks the events a screen published waits for them (mw-5r3p30.389).
// A screen writes, publishes, awaits something else and publishes again (teachIdea: level, grammar-level-changed, announceAlphabet,
// idea-taught), so the write a step waited for can be seen before the event it checks. Ask for the list through a function, because a
// scenario starts its list over (`taught = []`). The wait is the one every jsdom findBy*/waitFor uses (tests/support/timeouts.ts).
import { waitFor } from '@testing-library/react';
import { expect } from 'vitest';
import { latest, type EventKind, type EventOf } from '../../src/events/bus';

/** Wait until the list the getter returns equals `expected`; fail with what it held. `timeout` is for the test of this helper only. */
export async function expectPublished<T>(list: () => readonly T[], expected: readonly T[], timeout?: number): Promise<void> {
  await waitFor(() => expect(list()).toEqual(expected), timeout === undefined ? undefined : { timeout });
}

/** Wait until the check passes on the newest event of a kind (`latest`), which the bus keeps. */
export async function expectLatest<K extends EventKind>(kind: K, check: (event: EventOf<K> | undefined) => void): Promise<void> {
  await waitFor(() => check(latest(kind)));
}
