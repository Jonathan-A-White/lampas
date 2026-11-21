// tests/unit/latest-live-query.test.tsx — useLatestLiveQuery drops an older answer that is delivered after a newer one (mw-5r3p30.492).
// The Reader's Due chip asked 'how many are due' before the schedule was seeded and again after it; Dexie delivered the second answer (9) first and
// the first (0) after it, so the chip never drew. The mock stands in for Dexie's delivery: the test asks the query twice, then hands the answers over
// in the wrong order.
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Answer = { run: number; value: number };
const delivery = vi.hoisted(() => ({ query: undefined as undefined | (() => Promise<Answer>), answer: undefined as Answer | undefined, deps: undefined as undefined | readonly unknown[] }));
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (query: () => Promise<Answer>, deps?: readonly unknown[]) => {
    delivery.query = query;
    delivery.deps = deps;
    return delivery.answer;
  },
}));

import { useLatestLiveQuery } from '../../src/data/useLatestLiveQuery';

describe('useLatestLiveQuery', () => {
  beforeEach(() => {
    delivery.query = undefined;
    delivery.answer = undefined;
    delivery.deps = undefined;
  });

  // mw-indx1x6.58: a read that holds a day's figure is asked again when the page is shown again or the local day turns, not only when the database changes
  it('asks the query again when the page becomes visible, when it is focused, and when the local day turns', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      vi.setSystemTime(new Date(2026, 10, 20, 23, 0, 0));
      const view = renderHook(() => useLatestLiveQuery(async () => 1));
      const asked = (): string => JSON.stringify(delivery.deps);
      const first = asked();
      act(() => void document.dispatchEvent(new Event('visibilitychange')));
      const second = asked();
      expect(second).not.toBe(first);
      act(() => void window.dispatchEvent(new Event('focus')));
      const third = asked();
      expect(third).not.toBe(second);
      act(() => void vi.advanceTimersByTime(61 * 60 * 1000)); // past his local midnight, with nothing shown or focused
      expect(asked()).not.toBe(third);
      view.unmount();
    } finally {
      vi.useRealTimers();
    }
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
