// tests/unit/latest-live-query.test.tsx — useLatestLiveQuery drops an older answer that is delivered after a newer one (mw-5r3p30.492).
// The Reader's Due chip asked 'how many are due' before the schedule was seeded and again after it; Dexie delivered the second answer (9) first and
// the first (0) after it, so the chip never drew. The mock stands in for Dexie's delivery: the test asks the query twice, then hands the answers over
// in the wrong order.
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Answer = { run: number; value: number };
const delivery = vi.hoisted(() => ({ query: undefined as undefined | (() => Promise<Answer>), answer: undefined as Answer | undefined }));
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (query: () => Promise<Answer>) => {
    delivery.query = query;
    return delivery.answer;
  },
}));

import { useLatestLiveQuery } from '../../src/data/useLatestLiveQuery';

describe('useLatestLiveQuery', () => {
  beforeEach(() => {
    delivery.query = undefined;
    delivery.answer = undefined;
  });

  it('shows the newest answer, though an older one is delivered after it', async () => {
    let due = 0;
    const view = renderHook(() => useLatestLiveQuery(async () => due));
    expect(view.result.current).toBeUndefined();
    const first = await delivery.query!(); // asked before the schedule was seeded
    due = 9;
    const second = await delivery.query!(); // asked after
    delivery.answer = second;
    view.rerender();
    expect(view.result.current).toBe(9);
    delivery.answer = first; // the older one arrives late
    view.rerender();
    expect(view.result.current).toBe(9);
  });

  it('follows the answers when they come in order', async () => {
    let due = 0;
    const view = renderHook(() => useLatestLiveQuery(async () => due));
    delivery.answer = await delivery.query!();
    view.rerender();
    expect(view.result.current).toBe(0);
    due = 9;
    delivery.answer = await delivery.query!();
    view.rerender();
    expect(view.result.current).toBe(9);
  });
});
